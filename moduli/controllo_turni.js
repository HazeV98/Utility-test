// ==========================================
// CONTROLLO TURNI - JS MODULE
// Carica il PDF del libro turni, il backend lo converte, controlla ogni turno
// e restituisce dati + PDF dei risultati.
//
// Backend: analisi_turni.js (server.js)  ->  /api/v1/analisi/...
// Per attivarlo in assets/apps.json (adatta i campi di aspetto a quelli che già usi):
//   { "id": "controllo_turni", "isModule": true, "moduleName": "controllo_turni", "splitModule": false, ... }
// ==========================================

const API_URL = 'https://utilitybe.homeserver.foo';
const BASE = `${API_URL}/api/v1/analisi`;
const MAX_MB = 50;           // come ANALISI_PDF_MAX_MB sul server
const POLL_MS = 700;
const MAX_ERRORI_RETE = 6;

const ACTV_COLORS = {
    '1': { bg: '#ffffff', text: '#000000', border: '#000000' },
    '2': { bg: '#e3001b', text: '#ffffff', border: '#e3001b' },
    '3': { bg: '#ff8c00', text: '#000000', border: '#ff8c00' },
    '4.1': { bg: '#bd429b', text: '#ffffff', border: '#bd429b' },
    '4.2': { bg: '#bd429b', text: '#ffffff', border: '#bd429b' },
    '5.1': { bg: '#60b9a6', text: '#000000', border: '#60b9a6' },
    '5.2': { bg: '#60b9a6', text: '#000000', border: '#60b9a6' },
    '6': { bg: '#0070bc', text: '#ffffff', border: '#0070bc' },
    '7': { bg: '#008b54', text: '#ffffff', border: '#008b54' },
    '8': { bg: '#6d4c41', text: '#ffffff', border: '#6d4c41' },
    '9': { bg: '#797b3a', text: '#ffffff', border: '#797b3a' },
    '10': { bg: '#00c1d5', text: '#000000', border: '#00c1d5' },
    '11': { bg: '#f49ab4', text: '#000000', border: '#f49ab4' },
    '12': { bg: '#fced22', text: '#000000', border: '#fced22' },
    '13': { bg: '#583f99', text: '#ffffff', border: '#583f99' },
    '14': { bg: '#f36e21', text: '#000000', border: '#f36e21' },
    '15': { bg: '#fced22', text: '#e3001b', border: '#e3001b' },
    '17': { bg: '#8a8c8e', text: '#ffffff', border: '#8a8c8e' },
    '18': { bg: '#fced22', text: '#000000', border: '#e3001b' },
    '20': { bg: '#cbb3d5', text: '#000000', border: '#cbb3d5' },
    '22': { bg: '#c4d82d', text: '#006600', border: '#006600' },
    'N':  { bg: '#1c355e', text: '#ffffff', border: '#1c355e' }
};
const coloriLinea = (l) => ACTV_COLORS[l] || { bg: '#6b7280', text: '#ffffff', border: '#6b7280' };

const REGOLE_UI = {
    max_tra_due_soste: { titolo: 'Tempo tra due soste', icona: 'fa-hourglass-half', tipo: 'max' },
    max_timone: { titolo: 'Tempo al timone', icona: 'fa-ship', tipo: 'max' },
    sosta_minima_12pct: { titolo: 'Sosta minima', icona: 'fa-mug-hot', tipo: 'min' },
};

// Passi mostrati durante l'elaborazione. "fasi" = fasi del backend che appartengono al passo.
const PASSI = [
    { id: 'invio', titolo: 'Invio del file', fasi: [] },
    { id: 'conversione', titolo: 'Lettura del libro turni', fasi: ['ricezione', 'conversione'] },
    { id: 'analisi', titolo: 'Controllo dei turni e statistiche', fasi: ['analisi'] },
    { id: 'pdf', titolo: 'Creazione del PDF dei risultati', fasi: ['pdf', 'fine'] },
];

// ---------- stato ----------
let schermata = 'idle';      // idle | elaborazione | errore | risultati
let xhr = null;
let jobId = null;
let pollTimer = null;
let erroriRete = 0;
let nomeFile = '';
let progresso = { percentuale: 0, messaggio: '', passo: 0 };
let messaggioErrore = '';
let risultatoCorrente = null;

// ---------- utilità ----------
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel) => document.querySelector(`#modal-controllo_turni-main ${sel}`);

// "6,49" -> "6h 49m"; "-0,15" -> "−15 min"
function fmtDurata(s) {
    if (s == null) return '–';
    const m = /^(-)?(\d+),(\d{2})$/.exec(String(s));
    if (!m) return esc(s);
    const neg = m[1] ? '−' : '';
    const h = Number(m[2]);
    const mi = Number(m[3]);
    if (h === 0) return `${neg}${mi} min`;
    return `${neg}${h}h ${String(mi).padStart(2, '0')}m`;
}
// minuti -> "2h 50m" / "45 min"
function fmtMin(min) {
    const m = Math.round(Number(min) || 0);
    const h = Math.floor(m / 60);
    return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`;
}
const fmtPerc = (x) => (x == null ? '–' : `${Number(x).toFixed(1).replace('.', ',')}%`);
function fmtData(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
const fmtMB = (b) => `${(b / 1048576).toFixed(1).replace('.', ',')} MB`;

function badgeLinea(l, piccolo) {
    const c = coloriLinea(l);
    return `<span class="ct-linea${piccolo ? ' ct-linea-sm' : ''}" style="background:${c.bg};color:${c.text};border-color:${c.border}">${esc(l)}</span>`;
}

// ==========================================
// INIEZIONE UI
// ==========================================
export function initUIControlloTurni() {
    if (document.getElementById('modal-controllo_turni-main')) return;

    const uiHTML = `
    <style>
        #modal-controllo_turni-main { position: fixed; inset: 0; z-index: 9999; display: none; flex-direction: column; background: var(--surface-hover, #f1f3f7); color: inherit; font-family: inherit; }
        #modal-controllo_turni-main * { box-sizing: border-box; }
        .ct-header { flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: calc(10px + env(safe-area-inset-top)) 14px 10px; background: var(--surface, #fff); border-bottom: 1px solid var(--border-color, rgba(128,128,128,.25)); }
        .ct-back { width: 40px; height: 40px; border-radius: 50%; border: none; background: var(--surface-hover, #f1f3f7); color: var(--primary, #00529b); font-size: 17px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .ct-title { font-size: 18px; font-weight: 800; line-height: 1.1; }
        .ct-subtitle { font-size: 12px; color: var(--text-muted, #6b7280); margin-top: 2px; }
        .ct-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 14px 14px calc(28px + env(safe-area-inset-bottom)); scroll-behavior: smooth; }
        .ct-card { background: var(--surface, #fff); border: 1px solid var(--border-color, rgba(128,128,128,.25)); border-radius: 18px; padding: 16px; margin-bottom: 14px; box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,.06)); }
        .ct-h2 { font-size: 13px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted, #6b7280); margin: 22px 4px 10px; display: flex; align-items: center; gap: 8px; scroll-margin-top: 58px; }
        .ct-muted { color: var(--text-muted, #6b7280); }
        .ct-small { font-size: 12.5px; line-height: 1.45; }

        .ct-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 15px 18px; border-radius: 14px; border: none; font-size: 16px; font-weight: 700; cursor: pointer; text-decoration: none; font-family: inherit; }
        .ct-btn-primary { background: var(--primary, #00529b); color: #fff; }
        .ct-btn-ok { background: var(--success, #2e9d57); color: #fff; }
        .ct-btn-ghost { background: transparent; color: var(--primary, #00529b); border: 1.5px solid var(--primary, #00529b); padding: 12px 18px; font-size: 15px; }
        .ct-btn-danger { background: transparent; color: var(--danger, #e3001b); border: 1.5px solid var(--danger, #e3001b); padding: 12px 18px; font-size: 15px; }
        .ct-btn + .ct-btn { margin-top: 10px; }
        .ct-btn[aria-disabled="true"] { opacity: .5; pointer-events: none; }

        /* schermata iniziale */
        .ct-hero-icon { width: 76px; height: 76px; border-radius: 22px; margin: 6px auto 14px; display: flex; align-items: center; justify-content: center; font-size: 34px; color: #fff; background: linear-gradient(135deg, var(--primary, #00529b), #3a8fd9); box-shadow: 0 8px 20px rgba(0,82,155,.28); }
        .ct-center { text-align: center; }
        .ct-lead { font-size: 19px; font-weight: 800; margin-bottom: 6px; }
        .ct-checks { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 10px; }
        .ct-checks li { display: flex; gap: 12px; align-items: flex-start; font-size: 14px; line-height: 1.35; }
        .ct-checks i { width: 30px; height: 30px; border-radius: 10px; background: rgba(0,82,155,.12); color: var(--primary, #00529b); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px; }

        /* avanzamento */
        .ct-file { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; margin-bottom: 16px; word-break: break-all; }
        .ct-file i { color: var(--danger, #e3001b); font-size: 22px; }
        .ct-pct { font-size: 46px; font-weight: 900; line-height: 1; letter-spacing: -.02em; }
        .ct-pct small { font-size: 22px; font-weight: 800; }
        .ct-bar { height: 12px; border-radius: 999px; background: var(--surface-hover, #e6e9ef); overflow: hidden; margin: 12px 0 10px; }
        .ct-bar > div { height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, var(--primary, #00529b), #3a8fd9); transition: width .45s ease; position: relative; overflow: hidden; }
        .ct-bar > div::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent); transform: translateX(-100%); animation: ct-shine 1.4s infinite; }
        @keyframes ct-shine { to { transform: translateX(100%); } }
        .ct-msg { font-size: 14.5px; font-weight: 600; min-height: 20px; }
        .ct-steps { list-style: none; margin: 18px 0 18px; padding: 0; display: grid; gap: 12px; }
        .ct-steps li { display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--text-muted, #6b7280); }
        .ct-steps li.attivo { color: inherit; font-weight: 700; }
        .ct-steps li.fatto { color: inherit; }
        .ct-dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--border-color, rgba(128,128,128,.4)); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
        .ct-steps li.attivo .ct-dot { border-color: var(--primary, #00529b); color: var(--primary, #00529b); }
        .ct-steps li.fatto .ct-dot { background: var(--success, #2e9d57); border-color: var(--success, #2e9d57); color: #fff; }

        /* errore */
        .ct-err { border-color: var(--danger, #e3001b); }
        .ct-err-title { display: flex; align-items: center; gap: 10px; font-weight: 800; color: var(--danger, #e3001b); font-size: 16px; margin-bottom: 8px; }
        .ct-warn { background: rgba(245,158,11,.14); border-color: rgba(245,158,11,.5); }

        /* risultati */
        .ct-done { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
        .ct-done-ico { width: 46px; height: 46px; border-radius: 14px; background: rgba(46,157,87,.16); color: var(--success, #2e9d57); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .ct-done b { font-size: 17px; }
        .ct-chips { position: sticky; top: -14px; z-index: 5; margin: 0 -14px 4px; padding: 10px 14px; display: flex; gap: 8px; overflow-x: auto; background: var(--surface-hover, #f1f3f7); scrollbar-width: none; }
        .ct-chips::-webkit-scrollbar { display: none; }
        .ct-chip { flex-shrink: 0; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--border-color, rgba(128,128,128,.3)); background: var(--surface, #fff); font-size: 13px; font-weight: 700; cursor: pointer; color: inherit; font-family: inherit; }
        .ct-chip .ct-n { margin-left: 6px; font-size: 11px; padding: 1px 7px; border-radius: 999px; background: rgba(227,0,27,.14); color: var(--danger, #e3001b); }

        .ct-summary { display: flex; gap: 16px; align-items: center; }
        .ct-ring { --p: 0; width: 112px; height: 112px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: conic-gradient(var(--success, #2e9d57) calc(var(--p) * 1%), var(--danger, #e3001b) 0); }
        .ct-ring > div { width: 84px; height: 84px; border-radius: 50%; background: var(--surface, #fff); display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .ct-ring b { font-size: 22px; line-height: 1; }
        .ct-ring span { font-size: 10.5px; color: var(--text-muted, #6b7280); margin-top: 3px; }
        .ct-counts { flex: 1; display: grid; gap: 10px; }
        .ct-count { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
        .ct-count b { font-size: 26px; line-height: 1; }
        .ct-count span { font-size: 13px; color: var(--text-muted, #6b7280); }
        .ct-ok { color: var(--success, #2e9d57); }
        .ct-ko { color: var(--danger, #e3001b); }

        .ct-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
        .ct-tile { background: var(--surface-hover, #f1f3f7); border-radius: 14px; padding: 12px 13px; }
        .ct-tile .v { font-size: 20px; font-weight: 800; line-height: 1.15; }
        .ct-tile .l { font-size: 11.5px; color: var(--text-muted, #6b7280); margin-top: 3px; }
        .ct-tile .s { font-size: 11.5px; margin-top: 2px; color: var(--text-muted, #6b7280); }

        /* non a norma */
        .ct-bad { border-left: 5px solid var(--danger, #e3001b); }
        .ct-bad-head { display: flex; align-items: center; gap: 10px; }
        .ct-bad-head .t { font-weight: 800; font-size: 15px; }
        .ct-bad-head .s { font-size: 12px; color: var(--text-muted, #6b7280); }
        .ct-viol { margin-top: 12px; display: grid; gap: 8px; }
        .ct-v { display: flex; align-items: center; gap: 10px; background: rgba(227,0,27,.08); border-radius: 12px; padding: 9px 11px; font-size: 13.5px; }
        .ct-v i { color: var(--danger, #e3001b); width: 18px; text-align: center; }
        .ct-v .n { flex: 1; font-weight: 600; }
        .ct-v .x { text-align: right; line-height: 1.25; }
        .ct-v .x b { color: var(--danger, #e3001b); }
        .ct-v .x small { display: block; font-size: 11px; color: var(--text-muted, #6b7280); }
        .ct-allok { display: flex; gap: 12px; align-items: center; color: var(--success, #2e9d57); font-weight: 700; }
        .ct-allok i { font-size: 26px; }

        /* linee e fasce */
        .ct-linea { min-width: 40px; height: 32px; padding: 0 10px; border-radius: 16px; border: 2px solid; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0; }
        .ct-linea-sm { min-width: 32px; height: 26px; font-size: 12px; border-radius: 13px; }
        .ct-acc { background: var(--surface, #fff); border: 1px solid var(--border-color, rgba(128,128,128,.25)); border-radius: 18px; margin-bottom: 10px; overflow: hidden; box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,.06)); }
        .ct-acc > summary { list-style: none; display: flex; align-items: center; gap: 12px; padding: 14px 15px; cursor: pointer; }
        .ct-acc > summary::-webkit-details-marker { display: none; }
        .ct-acc-main { flex: 1; min-width: 0; }
        .ct-acc-main .t { font-weight: 700; font-size: 14.5px; }
        .ct-mini { display: flex; height: 7px; border-radius: 99px; overflow: hidden; margin-top: 7px; background: var(--surface-hover, #e6e9ef); }
        .ct-mini > i { display: block; height: 100%; }
        .ct-pill { font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
        .ct-pill.ok { background: rgba(46,157,87,.15); color: var(--success, #2e9d57); }
        .ct-pill.ko { background: rgba(227,0,27,.13); color: var(--danger, #e3001b); }
        .ct-chev { color: var(--text-muted, #6b7280); transition: transform .2s; font-size: 13px; }
        .ct-acc[open] .ct-chev { transform: rotate(180deg); }
        .ct-acc-body { padding: 0 15px 15px; }
        .ct-fasce { display: grid; gap: 10px; margin-top: 14px; }
        .ct-fascia { background: var(--surface-hover, #f1f3f7); border-radius: 14px; padding: 11px 12px; }
        .ct-fascia-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13.5px; font-weight: 800; margin-bottom: 9px; }
        .ct-fascia-h .r { display: flex; gap: 6px; align-items: center; font-size: 12px; font-weight: 700; }
        .ct-fascia-g { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .ct-fascia-g div { min-width: 0; }
        .ct-fascia-g b { display: block; font-size: 13px; line-height: 1.2; }
        .ct-fascia-g span { display: block; font-size: 10.5px; color: var(--text-muted, #6b7280); margin-top: 2px; }
        .ct-note { font-size: 12px; color: var(--text-muted, #6b7280); margin: 6px 4px 0; line-height: 1.45; }
        .ct-details summary { cursor: pointer; font-weight: 700; font-size: 14px; list-style: none; display: flex; justify-content: space-between; align-items: center; }
        .ct-details summary::-webkit-details-marker { display: none; }
        .ct-details ul { margin: 10px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.5; }
        @media (min-width: 640px) { .ct-scroll { padding-left: calc(50% - 320px); padding-right: calc(50% - 320px); } .ct-chips { margin: 0 -14px 4px; } }
    </style>

    <div id="modal-controllo_turni-main">
        <div class="ct-header">
            <button class="ct-back" data-ct="chiudi" aria-label="Torna al menu"><i class="fa-solid fa-arrow-left"></i></button>
            <div>
                <div class="ct-title">Controllo turni</div>
                <div class="ct-subtitle">Verifica del libro turni</div>
            </div>
        </div>
        <div class="ct-scroll" id="ct-scroll"></div>
        <input type="file" id="ct-file" accept="application/pdf,.pdf" hidden>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', uiHTML);

    const root = document.getElementById('modal-controllo_turni-main');
    root.addEventListener('click', (e) => {
        const el = e.target.closest('[data-ct]');
        if (!el) return;
        const az = el.dataset.ct;
        if (az === 'chiudi') chiudiControlloTurni();
        else if (az === 'scegli') document.getElementById('ct-file').click();
        else if (az === 'annulla') annulla();
        else if (az === 'nuovo') nuovoControllo();
        else if (az === 'vai') {
            const dest = document.getElementById(el.dataset.dest);
            if (dest) dest.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
    document.getElementById('ct-file').addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        e.target.value = ''; // permette di riselezionare lo stesso file
        if (f) avviaControllo(f);
    });

    window.chiudiControlloTurni = chiudiControlloTurni;
    render();
}

export async function avviaMotoreControlloTurni(db, auth, userData, isAdmin) {
    initUIControlloTurni();
    document.getElementById('modal-controllo_turni-main').style.display = 'flex';
}

function chiudiControlloTurni() {
    // L'elaborazione (e i risultati) restano in memoria: riaprendo il modulo si riprende da dove eri.
    document.getElementById('modal-controllo_turni-main').style.display = 'none';
}

// ==========================================
// FLUSSO: invio -> elaborazione -> risultati
// ==========================================
function resetStato() {
    if (xhr) { try { xhr.abort(); } catch (e) { /* già chiuso */ } xhr = null; }
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    erroriRete = 0;
}

function cancellaJobSulServer() {
    if (!jobId) return;
    const id = jobId;
    jobId = null;
    fetch(`${BASE}/job/${id}`, { method: 'DELETE' }).catch(() => {});
}

function annulla() {
    resetStato();
    cancellaJobSulServer();
    schermata = 'idle';
    render();
}

function nuovoControllo() {
    resetStato();
    cancellaJobSulServer();
    risultatoCorrente = null;
    schermata = 'idle';
    render();
    document.getElementById('ct-scroll').scrollTop = 0;
}

function mostraErrore(msg) {
    resetStato();
    jobId = null;
    messaggioErrore = msg;
    schermata = 'errore';
    render();
}

function avviaControllo(file) {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) return mostraErrore('Il file scelto non è un PDF. Scegli il PDF del libro turni.');
    if (file.size > MAX_MB * 1048576) return mostraErrore(`Il file pesa ${fmtMB(file.size)}: il limite è ${MAX_MB} MB.`);

    resetStato();
    cancellaJobSulServer();
    risultatoCorrente = null;
    nomeFile = file.name;
    progresso = { percentuale: 0, messaggio: `Invio del file (${fmtMB(file.size)})…`, passo: 0 };
    schermata = 'elaborazione';
    render();
    document.getElementById('ct-scroll').scrollTop = 0;

    xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/pdf`);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const f = e.loaded / e.total;
        aggiornaProgresso({ percentuale: Math.round(f * 10), messaggio: `Invio del file: ${fmtMB(e.loaded)} di ${fmtMB(e.total)}`, passo: 0 });
    };
    xhr.onerror = () => mostraErrore('Connessione al server non riuscita. Controlla la rete e riprova.');
    xhr.ontimeout = xhr.onerror;
    xhr.onload = () => {
        let corpo = {};
        try { corpo = JSON.parse(xhr.responseText); } catch (e) { /* risposta non JSON */ }
        xhr = null;
        if (!corpo.job) return mostraErrore(corpo.error || 'Il server non ha accettato il file.');
        jobId = corpo.job;
        aggiornaProgresso({ percentuale: 10, messaggio: 'File ricevuto dal server', passo: 1 });
        interroga();
    };
    xhr.send(file);
}

function interroga() {
    const id = jobId;
    if (!id) return;
    fetch(`${BASE}/job/${id}`, { cache: 'no-store' })
        .then(async (r) => {
            const corpo = await r.json().catch(() => ({}));
            if (id !== jobId) return; // annullato nel frattempo
            if (!r.ok) throw Object.assign(new Error(corpo.error || `errore ${r.status}`), { definitivo: r.status === 404 });
            erroriRete = 0;
            if (corpo.stato === 'errore') return mostraErrore(corpo.errore || 'Elaborazione non riuscita.');
            if (corpo.stato === 'completato') return mostraRisultati(corpo);
            const passo = Math.max(1, PASSI.findIndex((p) => p.fasi.includes(corpo.fase)));
            aggiornaProgresso({ percentuale: corpo.percentuale, messaggio: corpo.messaggio, passo });
            pollTimer = setTimeout(interroga, POLL_MS);
        })
        .catch((e) => {
            if (id !== jobId) return;
            erroriRete += 1;
            if (e.definitivo || erroriRete >= MAX_ERRORI_RETE) return mostraErrore(e.definitivo ? e.message : 'Connessione persa durante l\'elaborazione. Riprova.');
            pollTimer = setTimeout(interroga, POLL_MS * 2);
        });
}

function mostraRisultati(corpo) {
    resetStato();
    risultatoCorrente = corpo;
    schermata = 'risultati';
    render();
    document.getElementById('ct-scroll').scrollTop = 0;
}

// Aggiorna barra e testi senza ridisegnare tutta la schermata (così l'animazione resta fluida).
function aggiornaProgresso(p) {
    progresso = { ...progresso, ...p, percentuale: Math.max(progresso.percentuale, p.percentuale || 0) };
    if (schermata !== 'elaborazione') return;
    const barra = $('#ct-barra');
    if (!barra) return render();
    barra.style.width = `${progresso.percentuale}%`;
    $('#ct-pct').innerHTML = `${progresso.percentuale}<small>%</small>`;
    $('#ct-msg').textContent = progresso.messaggio;
    document.querySelectorAll('#modal-controllo_turni-main .ct-steps li').forEach((li, i) => {
        li.className = i < progresso.passo ? 'fatto' : i === progresso.passo ? 'attivo' : '';
        li.querySelector('.ct-dot').innerHTML = i < progresso.passo ? '<i class="fa-solid fa-check"></i>' : i === progresso.passo ? '<i class="fa-solid fa-spinner fa-spin"></i>' : '';
    });
}

// ==========================================
// RENDER
// ==========================================
function render() {
    const box = document.getElementById('ct-scroll');
    if (!box) return;
    if (schermata === 'idle') box.innerHTML = htmlIniziale();
    else if (schermata === 'elaborazione') box.innerHTML = htmlElaborazione();
    else if (schermata === 'errore') box.innerHTML = htmlErrore();
    else box.innerHTML = htmlRisultati(risultatoCorrente);
}

function htmlIniziale() {
    return `
    <div class="ct-card ct-center">
        <div class="ct-hero-icon"><i class="fa-solid fa-file-circle-check"></i></div>
        <div class="ct-lead">Carica il PDF dei turni</div>
        <div class="ct-muted ct-small" style="margin-bottom:18px">Il server legge il libro turni, controlla ogni turno e prepara risultati e PDF da scaricare.</div>
        <button class="ct-btn ct-btn-primary" data-ct="scegli"><i class="fa-solid fa-upload"></i> Scegli il PDF</button>
        <ul class="ct-checks" style="text-align:left">
            <li><i class="fa-solid fa-hourglass-half"></i><span><b>Tempo tra due soste</b><br><span class="ct-muted ct-small">non oltre il limite previsto</span></span></li>
            <li><i class="fa-solid fa-ship"></i><span><b>Tempo al timone</b><br><span class="ct-muted ct-small">entro il massimo del turno</span></span></li>
            <li><i class="fa-solid fa-mug-hot"></i><span><b>Sosta minima</b><br><span class="ct-muted ct-small">percentuale rispetto al tempo di lavoro</span></span></li>
        </ul>
    </div>
    <div class="ct-note">Verranno mostrati i dati generali, per linea e per fascia di inizio turno.</div>`;
}

function htmlElaborazione() {
    const passi = PASSI.map((p, i) => {
        const cls = i < progresso.passo ? 'fatto' : i === progresso.passo ? 'attivo' : '';
        const ico = i < progresso.passo ? '<i class="fa-solid fa-check"></i>' : i === progresso.passo ? '<i class="fa-solid fa-spinner fa-spin"></i>' : '';
        return `<li class="${cls}"><span class="ct-dot">${ico}</span>${esc(p.titolo)}</li>`;
    }).join('');
    return `
    <div class="ct-card">
        <div class="ct-file"><i class="fa-solid fa-file-pdf"></i><span>${esc(nomeFile)}</span></div>
        <div class="ct-pct" id="ct-pct">${progresso.percentuale}<small>%</small></div>
        <div class="ct-bar"><div id="ct-barra" style="width:${progresso.percentuale}%"></div></div>
        <div class="ct-msg" id="ct-msg">${esc(progresso.messaggio)}</div>
        <ul class="ct-steps">${passi}</ul>
        <button class="ct-btn ct-btn-danger" data-ct="annulla"><i class="fa-solid fa-xmark"></i> Annulla</button>
    </div>
    <div class="ct-note">Puoi chiudere questa schermata: l'elaborazione continua e la ritrovi riaprendo il modulo.</div>`;
}

function htmlErrore() {
    return `
    <div class="ct-card ct-err">
        <div class="ct-err-title"><i class="fa-solid fa-triangle-exclamation"></i> Qualcosa non ha funzionato</div>
        <div class="ct-small" style="margin-bottom:16px">${esc(messaggioErrore)}</div>
        <button class="ct-btn ct-btn-primary" data-ct="scegli"><i class="fa-solid fa-rotate-right"></i> Scegli un altro PDF</button>
    </div>`;
}

// ---------- risultati ----------
function tileHTML(valore, etichetta, sotto) {
    return `<div class="ct-tile"><div class="v">${valore}</div><div class="l">${etichetta}</div>${sotto ? `<div class="s">${sotto}</div>` : ''}</div>`;
}

function statGrid(x) {
    return `<div class="ct-grid">
        ${tileHTML(fmtDurata(x.durata_media), 'Durata media turno')}
        ${tileHTML(fmtDurata(x.timone_medio), 'Ore di timone medie')}
        ${tileHTML(fmtDurata(x.compensativi), 'Somma compensativi', `media per turno: ${fmtDurata(x.compensativi_medio)}`)}
        ${tileHTML(fmtPerc(x.sosta_media_perc), 'Sosta media nel turno', 'su timone + lavorato')}
    </div>`;
}

function esitoPill(x) {
    return x.non_a_norma ? `<span class="ct-pill ko">${x.non_a_norma} non a norma</span>` : '<span class="ct-pill ok">tutti a norma</span>';
}

function miniBarra(x) {
    const n = x.turni || 1;
    return `<div class="ct-mini"><i style="width:${(x.a_norma / n) * 100}%;background:var(--success,#2e9d57)"></i><i style="width:${(x.non_a_norma / n) * 100}%;background:var(--danger,#e3001b)"></i></div>`;
}

function fasciaHTML(f) {
    return `<div class="ct-fascia">
        <div class="ct-fascia-h"><span><i class="fa-regular fa-clock" style="opacity:.6;margin-right:6px"></i>${esc(f.fascia)}</span>
            <span class="r"><span class="ct-ok">${f.a_norma} ✓</span><span class="${f.non_a_norma ? 'ct-ko' : 'ct-muted'}">${f.non_a_norma} ✗</span><span class="ct-muted">· ${f.turni} turni</span></span></div>
        <div class="ct-fascia-g">
            <div><b>${fmtDurata(f.durata_media)}</b><span>durata media</span></div>
            <div><b>${fmtDurata(f.timone_medio)}</b><span>timone medio</span></div>
            <div><b>${fmtDurata(f.compensativi)}</b><span>compensativi<br>(media ${fmtDurata(f.compensativi_medio)})</span></div>
            <div><b>${fmtPerc(f.sosta_media_perc)}</b><span>sosta media</span></div>
        </div>
    </div>`;
}

function violazioneHTML(v) {
    const ui = REGOLE_UI[v.regola] || { titolo: v.regola, icona: 'fa-circle-exclamation', tipo: 'max' };
    return `<div class="ct-v"><i class="fa-solid ${ui.icona}"></i><span class="n">${esc(ui.titolo)}</span>
        <span class="x"><b>${fmtMin(v.valore_min)}</b><small>${ui.tipo === 'max' ? 'massimo' : 'minimo'} ${fmtMin(v.limite_min)}</small></span></div>`;
}

function htmlRisultati(c) {
    if (!c || !c.risultato) return '';
    const r = c.risultato;
    const g = r.generale;
    const perc = g.turni ? (g.a_norma / g.turni) * 100 : 0;
    const nonNorma = g.lista_non_a_norma || [];
    const dataLibro = fmtData(r.valido_dal);

    // intestazione + download
    const download = c.pdf_url
        ? `<a class="ct-btn ct-btn-ok" href="${esc(API_URL + c.pdf_url)}" download="${esc(c.pdf_nome || 'analisi_turni.pdf')}" rel="noopener"><i class="fa-solid fa-file-arrow-down"></i> Scarica PDF risultati</a>`
        : `<div class="ct-card ct-warn ct-small" style="margin:0"><b><i class="fa-solid fa-triangle-exclamation"></i> PDF non disponibile</b><br>${esc(c.pdf_errore || 'Il server non ha creato il PDF.')} I risultati qui sotto sono comunque completi.</div>`;
    let h = `
    <div class="ct-card">
        <div class="ct-done"><div class="ct-done-ico"><i class="fa-solid fa-circle-check"></i></div>
            <div><b>Controllo completato</b><div class="ct-muted ct-small">${dataLibro ? `Libro valido dal ${dataLibro} · ` : ''}${esc(nomeFile)}</div></div></div>
        ${download}
        <button class="ct-btn ct-btn-ghost" data-ct="nuovo" style="margin-top:10px"><i class="fa-solid fa-rotate-right"></i> Controlla un altro PDF</button>
    </div>

    <div class="ct-chips">
        <button class="ct-chip" data-ct="vai" data-dest="ct-sez-generale">Generale</button>
        <button class="ct-chip" data-ct="vai" data-dest="ct-sez-nonnorma">Non a norma${nonNorma.length ? `<span class="ct-n">${nonNorma.length}</span>` : ''}</button>
        <button class="ct-chip" data-ct="vai" data-dest="ct-sez-linee">Per linea</button>
        <button class="ct-chip" data-ct="vai" data-dest="ct-sez-fasce">Per fascia</button>
    </div>`;

    // generale
    h += `<div class="ct-h2" id="ct-sez-generale"><i class="fa-solid fa-chart-pie"></i> Generale</div>
    <div class="ct-card">
        <div class="ct-summary">
            <div class="ct-ring" style="--p:${perc.toFixed(2)}"><div><b>${Math.round(perc)}%</b><span>a norma</span></div></div>
            <div class="ct-counts">
                <div class="ct-count"><span>Turni analizzati</span><b>${g.turni}</b></div>
                <div class="ct-count"><span>A norma</span><b class="ct-ok">${g.a_norma}</b></div>
                <div class="ct-count"><span>Non a norma</span><b class="${g.non_a_norma ? 'ct-ko' : ''}">${g.non_a_norma}</b></div>
            </div>
        </div>
        ${statGrid(g)}
    </div>`;

    // non a norma
    h += `<div class="ct-h2" id="ct-sez-nonnorma"><i class="fa-solid fa-triangle-exclamation"></i> Turni non a norma</div>`;
    if (!nonNorma.length) {
        h += `<div class="ct-card ct-allok"><i class="fa-solid fa-circle-check"></i><span>Tutti i turni analizzati sono a norma.</span></div>`;
    } else {
        h += nonNorma.map((t) => `
        <div class="ct-card ct-bad">
            <div class="ct-bad-head">${badgeLinea(t.linea)}
                <div><div class="t">Turno ${esc(t.turno)} <span class="ct-muted" style="font-weight:600">· inizio ${esc(t.inizio || '–')}</span></div>
                <div class="s">${esc(t.tipologia || '')} · validità ${esc(t.validita || '–')}</div></div></div>
            <div class="ct-viol">${(t.violazioni || []).map(violazioneHTML).join('')}</div>
        </div>`).join('');
    }

    // per linea
    h += `<div class="ct-h2" id="ct-sez-linee"><i class="fa-solid fa-route"></i> Per linea</div>`;
    h += (r.per_linea || []).map((l) => `
    <details class="ct-acc">
        <summary>${badgeLinea(l.linea)}
            <div class="ct-acc-main"><div class="t">${l.turni} turni · ${l.a_norma} a norma</div>${miniBarra(l)}</div>
            ${l.sempre_a_norma ? '<span class="ct-pill ok">sempre a norma</span>' : esitoPill(l)}
            <i class="fa-solid fa-chevron-down ct-chev"></i></summary>
        <div class="ct-acc-body">
            ${statGrid(l)}
            <div class="ct-fasce">${(l.per_fascia_inizio || []).map(fasciaHTML).join('')}</div>
        </div>
    </details>`).join('');
    h += `<div class="ct-note">Tocca una linea per vedere i dati divisi per fascia di inizio turno.</div>`;

    // per fascia
    h += `<div class="ct-h2" id="ct-sez-fasce"><i class="fa-regular fa-clock"></i> Per fascia di inizio turno</div>`;
    h += `<div class="ct-fasce" style="margin-top:0">${(r.per_fascia_inizio || []).map(fasciaHTML).join('')}</div>`;

    // note
    const reg = r.regole || {};
    const esclusi = Object.entries(r.esclusi_dall_analisi || {}).map(([k, n]) => `${esc(k)} (${n})`).join(', ');
    const avvisi = Object.entries(r.avvisi || {});
    const anomalie = r.anomalie_conversione || [];
    h += `<div class="ct-h2"><i class="fa-solid fa-circle-info"></i> Regole e note</div>
    <div class="ct-card ct-small">
        <ul style="margin:0;padding-left:18px;line-height:1.6">
            <li>Tempo tra due soste: massimo ${fmtMin(reg.maxTraSoste)} (${fmtMin(reg.maxTraSosteGrandi)} per le grandi unità), soste valide da ${reg.sostaMinima} min</li>
            <li>Tempo al timone: massimo ${fmtMin(reg.maxTimone)} nel turno</li>
            <li>Sosta: almeno il ${Math.round((reg.minSostaPerc || 0) * 100)}% di timone + lavorato</li>
            <li>Linee sempre a norma: ${esc((reg.linee_sempre_a_norma || []).join(', ') || '–')}</li>
            ${esclusi ? `<li>Escluse dall'analisi: ${esclusi}</li>` : ''}
        </ul>
    </div>`;
    if (avvisi.length) {
        h += `<div class="ct-card ct-warn ct-small"><b><i class="fa-solid fa-triangle-exclamation"></i> Attenzione</b><ul style="margin:8px 0 0;padding-left:18px">${avvisi.map(([a, n]) => `<li>${esc(a)} — ${n} turni</li>`).join('')}</ul></div>`;
    }
    if (anomalie.length) {
        h += `<div class="ct-card ct-small"><details class="ct-details"><summary>Segnalazioni della lettura del PDF (${anomalie.length}) <i class="fa-solid fa-chevron-down ct-chev"></i></summary>
        <ul>${anomalie.slice(0, 60).map((a) => `<li>${esc(a)}</li>`).join('')}</ul></details></div>`;
    }
    return h;
}
