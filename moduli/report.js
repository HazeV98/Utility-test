// ==========================================================================================
// ASSISTENZA APP (front end) - file unico: interfaccia (ex ui_report.js) + logica.
// Sistema di chat: ogni richiesta e' una chat con un oggetto. I dati arrivano dal backend (assistenza.js sul mini PC).
//  - utente: elenco delle proprie chat, tasto "Nuova chat", messaggi con allegati (foto, video, PDF)
//  - admin:  elenco di tutte le chat con nome, cognome e matricola; dentro la chat tocca il nome per il profilo
// Firebase serve solo per il login (il token viene inviato al server). Il ruolo admin lo decide il server.
// Nell'app resta il caricamento di sempre: import(./report.js). Il vecchio ui_report.js va eliminato.
// ==========================================================================================

// ---------- Configurazione ----------
const API_ORIGIN = 'https://utilitybe.homeserver.foo';
const API_ASSISTENZA = API_ORIGIN + '/api/assistenza';
const MAX_OGGETTO = 80;
const MAX_ALLEGATI = 6;
const MAX_MB_ALLEGATO = 100;
const LATO_MAX_FOTO = 1600;          // le foto vengono ridimensionate prima dell'invio
const INTERVALLO_CHAT_MS = 4000;     // aggiornamento della chat aperta
const INTERVALLO_LISTA_MS = 15000;   // aggiornamento dell'elenco chat

let auth = null;
let isAdmin = false;                 // aggiornato dal server a ogni caricamento
let chatAperta = null;               // { id (null finche' non parte il primo messaggio), oggetto, utente }
let ultimoSeq = 0;
let allegatiScelti = [];
let inInvio = false;
let inAggiornamentoChat = false;
let timerAvviati = false;
let ultimaListaJson = '';
const cacheChat = new Map();

// ---------- Utilita' ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const linkifica = (testoEscapato) => testoEscapato.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const fmtDataOra = (ts) => { const d = new Date(ts); return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
const fmtOraLista = (ts) => {
    const d = new Date(ts), oggi = new Date();
    return d.toDateString() === oggi.toDateString()
        ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
};
const nomeCompleto = (u) => [u && u.nome, u && u.cognome].filter(Boolean).join(' ') || (u && u.email ? u.email.split('@')[0] : 'Utente');
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const visibile = (id) => { const el = document.getElementById(id); return !!el && getComputedStyle(el).display !== 'none'; };

async function tokenUtente() {
    const u = auth && auth.currentUser;
    if (!u) throw new Error('Non autenticato');
    return u.getIdToken();
}

async function api(percorso, { metodo = 'GET' } = {}) {
    const res = await fetch(API_ASSISTENZA + percorso, { method: metodo, headers: { 'Authorization': 'Bearer ' + await tokenUtente() } });
    let dati = null;
    try { dati = await res.json(); } catch (_) { /* risposta senza corpo */ }
    if (!res.ok) throw new Error((dati && dati.errore) || ('Errore ' + res.status));
    return dati;
}

// Invio con percentuale di avanzamento (utile per i video)
async function inviaMultipart(percorso, formData, onProgress) {
    const token = await tokenUtente();
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API_ASSISTENZA + percorso);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
        xhr.onload = () => {
            let d = null;
            try { d = JSON.parse(xhr.responseText); } catch (_) { /* nessun JSON */ }
            if (xhr.status >= 200 && xhr.status < 300) resolve(d);
            else reject(new Error((d && d.errore) || ('Errore ' + xhr.status)));
        };
        xhr.onerror = () => reject(new Error('Connessione al server non riuscita'));
        xhr.send(formData);
    });
}

async function comprimiImmagine(file) {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
    try {
        const bmp = await createImageBitmap(file);
        const scala = Math.min(1, LATO_MAX_FOTO / Math.max(bmp.width, bmp.height));
        const w = Math.round(bmp.width * scala), h = Math.round(bmp.height * scala);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch (_) { return file; } // formato non leggibile dal browser: si invia l'originale
}

// ==========================================================================================
// INTERFACCIA
// ==========================================================================================
export function initUISegnalazioni() {
    // Rimuove eventuali finestre duplicate (anche quelle della vecchia versione) per evitare bug nell'apertura
    ['modal-segnalazioni-main', 'modal-nuova-chat', 'modal-chat-assistenza', 'modal-profilo-assistenza', 'modal-nuova-segnalazione', 'modal-chat-segnalazione', 'as-stili'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    const st = document.createElement('style');
    st.id = 'as-stili';
    st.textContent = `
        .as-nuova { width:100%; background:var(--info); color:#fff; border:none; padding:16px; font-size:15px; font-weight:700; border-radius:var(--radius-md); cursor:pointer; display:flex; justify-content:center; align-items:center; gap:10px; box-shadow:0 4px 12px rgba(0,136,255,0.3); margin-bottom:15px; }
        .as-vuoto { text-align:center; padding:40px 20px; color:var(--text-muted); font-size:15px; background:var(--surface-hover); border-radius:12px; border:1px dashed var(--border-color); line-height:1.5; }
        .as-chat { background:var(--surface); border:1px solid var(--border-color); border-left:5px solid var(--info); border-radius:12px; padding:14px 16px; margin-bottom:10px; cursor:pointer; box-shadow:var(--shadow-sm); }
        .as-chat-nuova { border-left-color:var(--danger); background:var(--surface-hover); }
        .as-chat-top { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
        .as-chat-titolo { font-weight:800; font-size:15px; color:var(--text-main); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .as-chat-ora { font-size:11px; color:var(--text-muted); flex-shrink:0; }
        .as-chat-utente { font-size:12.5px; color:var(--info); font-weight:600; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .as-chat-prev { display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:13px; color:var(--text-muted); margin-top:6px; }
        .as-prev-testo { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .as-badge { background:var(--danger); color:#fff; font-size:11px; font-weight:700; min-width:20px; height:20px; padding:0 6px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }

        .as-chat-box { height:85vh; max-width:500px; display:flex; flex-direction:column; padding:0; overflow:hidden; }
        .as-head { padding:12px 14px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:10px; background:var(--surface); }
        .as-head-testi { flex:1; min-width:0; }
        .as-titolo { font-weight:800; font-size:16px; color:var(--text-main); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .as-sottotitolo { display:block; max-width:100%; background:none; border:none; padding:2px 0 0 0; font-size:12.5px; font-weight:600; color:var(--info); cursor:pointer; text-align:left; font-family:inherit; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .as-head-btn { width:36px; height:36px; flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid var(--border-color); background:var(--surface); color:var(--text-muted); font-size:15px; cursor:pointer; padding:0; }
        .as-head-btn.as-danger { color:var(--danger); border-color:var(--danger-border); }
        .as-messaggi { flex:1; overflow-y:auto; padding:16px; background:rgba(0,0,0,0.02); display:flex; flex-direction:column; }
        .as-msg { display:flex; flex-direction:column; margin-bottom:12px; width:100%; }
        .as-mia { align-items:flex-end; }
        .as-altra { align-items:flex-start; }
        .as-autore { font-size:11px; font-weight:700; color:var(--text-muted); margin:0 6px 3px 6px; }
        .as-bolla { max-width:85%; padding:10px 14px; font-size:14px; line-height:1.4; overflow-wrap:anywhere; box-shadow:var(--shadow-sm); }
        .as-mia .as-bolla { background:var(--info); color:#fff; border-radius:14px 14px 0 14px; }
        .as-altra .as-bolla { background:var(--surface); color:var(--text-main); border:1px solid var(--border-color); border-radius:14px 14px 14px 0; }
        .as-testo { white-space:pre-wrap; }
        .as-bolla a { color:inherit; text-decoration:underline; }
        .as-ora { font-size:10px; color:var(--text-muted); margin-top:4px; font-weight:500; }
        .as-foto { display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:6px; margin-top:6px; }
        .as-foto img { width:100%; height:110px; object-fit:cover; border-radius:10px; display:block; }
        .as-foto a:only-child { grid-column:1 / -1; }
        .as-foto a:only-child img { height:auto; max-height:260px; }
        .as-video { width:100%; max-height:260px; border-radius:10px; background:#000; margin-top:6px; }
        .as-pdf { display:flex; align-items:center; gap:8px; padding:8px 10px; margin-top:6px; border-radius:10px; background:rgba(0,0,0,0.08); text-decoration:none !important; }
        .as-pdf i { font-size:18px; }
        .as-pdf-nome { flex:1; min-width:0; font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .as-pdf-size { font-size:11px; opacity:0.8; flex-shrink:0; }
        .as-allegati-scelti { padding:0 12px; background:var(--surface); }
        .as-scelto { display:flex; align-items:center; gap:8px; padding:6px 10px; margin-top:6px; border:1px solid var(--border-color); border-radius:10px; background:var(--surface-hover); }
        .as-scelto-nome { flex:1; min-width:0; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .as-scelto-size { font-size:11px; color:var(--text-muted); flex-shrink:0; }
        .as-barra { padding:12px; border-top:1px solid var(--border-color); background:var(--surface); display:flex; gap:8px; align-items:flex-end; }
        .as-barra textarea { flex:1; resize:none; padding:12px 15px; border-radius:20px; border:1px solid var(--border-color); background:var(--surface-hover); outline:none; font-family:inherit; font-size:14px; color:var(--text-main); line-height:1.4; max-height:120px; }
        .as-btn-tondo { background:var(--info); color:#fff; border:none; width:44px; height:44px; border-radius:50%; cursor:pointer; display:flex; justify-content:center; align-items:center; flex-shrink:0; font-size:16px; padding:0; }
        .as-btn-tondo:disabled { opacity:0.6; }
        .as-btn-chiaro { background:var(--surface-hover); color:var(--text-muted); border:1px solid var(--border-color); }
        .as-riga-profilo { display:flex; align-items:center; gap:10px; padding:12px 4px; border-bottom:1px solid var(--border-color); font-size:14px; }
        .as-riga-profilo i.as-ico { width:20px; color:var(--info); text-align:center; }
        .as-riga-profilo b { display:block; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; }
    `;
    document.head.appendChild(st);

    const uiHTML = `
    <!-- ELENCO CHAT -->
    <div id="modal-segnalazioni-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-segnalazioni-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-segnalazioni-main')"></i>
            <h3 style="margin-top: 0; color: var(--info); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-headset"></i> Assistenza</h3>
            <div style="flex: 1; overflow-y: auto; padding-right: 5px;">
                <button id="as-btn-nuova" class="as-nuova" onclick="window.apriNuovaChatAssistenza()"><i class="fa-solid fa-plus"></i> Nuova chat</button>
                <div id="as-lista"></div>
            </div>
        </div>
    </div>

    <!-- NUOVA CHAT: OGGETTO DELLA RICHIESTA -->
    <div id="modal-nuova-chat" class="modal-overlay" style="z-index: 7500;" onclick="window.chiudiSuSfondo(event, 'modal-nuova-chat')">
        <div class="modal-content">
            <h3 style="margin-top:0; border-bottom:1px solid var(--border-color); padding-bottom:15px; text-align:center;"><i class="fa-solid fa-comments" style="color:var(--info);"></i> Nuova richiesta</h3>
            <div class="float-wrapper">
                <input type="text" id="as-oggetto" class="input-field" placeholder=" " maxlength="${MAX_OGGETTO}" onkeydown="if(event.key==='Enter'){event.preventDefault();window.iniziaChatAssistenza();}">
                <label>Oggetto della richiesta</label>
            </div>
            <button class="btn-action" style="background-color: var(--info);" onclick="window.iniziaChatAssistenza()"><i class="fa-solid fa-comments"></i> Apri chat</button>
            <button class="btn-modal" style="background-color: transparent; color: var(--text-muted); border: 1px solid var(--border-color);" onclick="document.getElementById('modal-nuova-chat').style.display='none'">Annulla</button>
        </div>
    </div>

    <!-- CHAT -->
    <div id="modal-chat-assistenza" class="modal-overlay" style="z-index: 7600;" onclick="if(event.target === this) window.chiudiChatAssistenza()">
        <div class="modal-content as-chat-box">
            <div class="as-head">
                <button class="as-head-btn" aria-label="Indietro" onclick="window.chiudiChatAssistenza()"><i class="fa-solid fa-arrow-left"></i></button>
                <div class="as-head-testi">
                    <div id="as-chat-titolo" class="as-titolo"></div>
                    <button id="as-chat-utente" class="as-sottotitolo" style="display:none;" onclick="window.apriProfiloAssistenza()"></button>
                </div>
                <button id="as-btn-elimina" class="as-head-btn as-danger" style="display:none;" aria-label="Elimina chat" title="Elimina chat" onclick="window.eliminaChatAssistenza()"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div id="as-messaggi" class="as-messaggi"></div>
            <div id="as-allegati-scelti" class="as-allegati-scelti"></div>
            <div class="as-barra">
                <input type="file" id="as-input-file" multiple accept="image/*,video/*,application/pdf" style="display:none;" onchange="window.aggiungiAllegatiAssistenza(this)">
                <button class="as-btn-tondo as-btn-chiaro" aria-label="Allega foto, video o PDF" title="Allega foto, video o PDF" onclick="document.getElementById('as-input-file').click()"><i class="fa-solid fa-paperclip"></i></button>
                <textarea id="as-input" rows="1" placeholder="Scrivi un messaggio..." oninput="window.autoAltezzaAssistenza(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();window.inviaMessaggioAssistenza();}"></textarea>
                <button id="as-btn-invia" class="as-btn-tondo" aria-label="Invia" title="Invia" onclick="window.inviaMessaggioAssistenza()"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    </div>

    <!-- PROFILO UTENTE (SOLO ADMIN) -->
    <div id="modal-profilo-assistenza" class="modal-overlay" style="z-index: 7700;" onclick="window.chiudiSuSfondo(event, 'modal-profilo-assistenza')">
        <div class="modal-content" style="max-width: 380px;">
            <i class="fa-solid fa-xmark close-modal" onclick="document.getElementById('modal-profilo-assistenza').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--info); display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-circle-user"></i> Profilo utente</h3>
            <div id="as-profilo-corpo" style="margin-top: 10px; max-height: 60vh; overflow-y: auto;"></div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================================================================
// AVVIO
// ==========================================================================================
export function avviaMotoreSegnalazioni(database, authentication, uidOrUserData, userIsAdmin) {
    if (!document.getElementById('modal-segnalazioni-main')) initUISegnalazioni();
    auth = authentication;
    isAdmin = !!userIsAdmin;   // provvisorio: il valore giusto lo conferma il server al primo caricamento
    avviaTimer();
    ultimaListaJson = '';
    caricaLista(false);
}

function avviaTimer() {
    if (timerAvviati) return;
    timerAvviati = true;
    setInterval(() => { if (!document.hidden && chatAperta && chatAperta.id && visibile('modal-chat-assistenza')) aggiornaChat(false, false); }, INTERVALLO_CHAT_MS);
    setInterval(() => { if (!document.hidden && visibile('modal-segnalazioni-main')) caricaLista(true); }, INTERVALLO_LISTA_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) window.aggiornaAssistenza(); });
}

// Chiamata anche da index.js quando arriva una notifica con l'app aperta
window.aggiornaAssistenza = () => {
    if (!auth) return;
    if (visibile('modal-segnalazioni-main')) caricaLista(true);
    if (chatAperta && chatAperta.id && visibile('modal-chat-assistenza')) aggiornaChat(false, false);
};

window.apriModaleSegnalazioni = () => {
    const modal = document.getElementById('modal-segnalazioni-main');
    if (modal) modal.style.display = 'flex';
    caricaLista(false);
};

// ==========================================================================================
// ELENCO CHAT
// ==========================================================================================
function htmlRigaChat(c) {
    const nuova = c.non_letti > 0;
    const sotto = isAdmin && c.utente
        ? `<div class="as-chat-utente"><i class="fa-solid fa-user"></i> ${esc(nomeCompleto(c.utente))}${c.utente.matricola ? ' · matr. ' + esc(c.utente.matricola) : ''}</div>`
        : '';
    return `
        <div class="as-chat ${nuova ? 'as-chat-nuova' : ''}" onclick="window.apriChatAssistenza('${esc(c.id)}')">
            <div class="as-chat-top"><span class="as-chat-titolo">${esc(c.oggetto)}</span><span class="as-chat-ora">${fmtOraLista(c.ultimo_messaggio)}</span></div>
            ${sotto}
            <div class="as-chat-prev"><span class="as-prev-testo">${esc(c.anteprima)}</span>${nuova ? `<span class="as-badge">${c.non_letti}</span>` : ''}</div>
        </div>`;
}

async function caricaLista(silenzioso) {
    const cont = document.getElementById('as-lista');
    if (!cont || !auth) return;
    if (!silenzioso) cont.innerHTML = `<div class="as-vuoto"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</div>`;
    try {
        const r = await api('/chat');
        isAdmin = !!r.admin;
        const btnNuova = document.getElementById('as-btn-nuova');
        if (btnNuova) btnNuova.style.display = isAdmin ? 'none' : 'flex';

        cacheChat.clear();
        r.chat.forEach((c) => cacheChat.set(c.id, c));
        const json = JSON.stringify(r.chat) + isAdmin;
        if (silenzioso && json === ultimaListaJson) return;   // nulla di nuovo: niente ridisegno
        ultimaListaJson = json;

        cont.innerHTML = r.chat.length
            ? r.chat.map(htmlRigaChat).join('')
            : `<div class="as-vuoto">${isAdmin ? 'Nessuna richiesta dagli utenti.' : "Non hai ancora aperto nessuna chat.<br>Premi «Nuova chat» per scrivere all'assistenza."}</div>`;
        if (window.controllaSegnalazioni) window.controllaSegnalazioni();
    } catch (e) {
        if (!silenzioso) cont.innerHTML = `<div class="as-vuoto" style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Errore caricamento: ${esc(e.message)}</div>`;
    }
}

// ==========================================================================================
// NUOVA CHAT
// ==========================================================================================
window.apriNuovaChatAssistenza = () => {
    document.getElementById('as-oggetto').value = '';
    document.getElementById('modal-nuova-chat').style.display = 'flex';
    setTimeout(() => document.getElementById('as-oggetto').focus(), 100);
};

// La chat si apre subito con l'oggetto come titolo; sul server nasce con il primo messaggio
window.iniziaChatAssistenza = () => {
    const oggetto = document.getElementById('as-oggetto').value.replace(/\s+/g, ' ').trim();
    if (!oggetto) return alert("Scrivi l'oggetto della richiesta.");
    document.getElementById('modal-nuova-chat').style.display = 'none';
    apriChat({ id: null, oggetto, utente: null });
    document.getElementById('as-messaggi').innerHTML = `<div class="as-vuoto">Scrivi il primo messaggio: la richiesta verrà inviata all'assistenza.</div>`;
};

// ==========================================================================================
// CHAT
// ==========================================================================================
function apriChat(chat) {
    chatAperta = chat;
    ultimoSeq = 0;
    allegatiScelti = [];
    window.aggiornaUI_AllegatiAssistenza();
    const input = document.getElementById('as-input');
    input.value = '';
    window.autoAltezzaAssistenza(input);
    document.getElementById('as-messaggi').innerHTML = `<div class="as-vuoto"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</div>`;
    aggiornaIntestazioneChat();
    document.getElementById('modal-chat-assistenza').style.display = 'flex';
}

window.apriChatAssistenza = async (id) => {
    const c = cacheChat.get(id);
    apriChat({ id, oggetto: c ? c.oggetto : '', utente: c ? c.utente || null : null });
    await aggiornaChat(true, true);
};

window.chiudiChatAssistenza = () => {
    chatAperta = null;
    allegatiScelti = [];
    document.getElementById('modal-chat-assistenza').style.display = 'none';
    ultimaListaJson = '';
    caricaLista(true);
};

function aggiornaIntestazioneChat() {
    if (!chatAperta) return;
    document.getElementById('as-chat-titolo').textContent = chatAperta.oggetto;
    const sotto = document.getElementById('as-chat-utente');
    const elimina = document.getElementById('as-btn-elimina');
    const mostraAdmin = isAdmin && chatAperta.id && chatAperta.utente;
    if (mostraAdmin) {
        const u = chatAperta.utente;
        sotto.style.display = 'block';
        sotto.innerHTML = `<i class="fa-solid fa-circle-user"></i> ${esc(nomeCompleto(u))}${u.matricola ? ' · Matr. ' + esc(u.matricola) : ''} <i class="fa-solid fa-chevron-right" style="font-size:10px;"></i>`;
    } else {
        sotto.style.display = 'none';
    }
    elimina.style.display = isAdmin && chatAperta.id ? 'inline-flex' : 'none';
}

function htmlAllegati(lista) {
    if (!lista || !lista.length) return '';
    const url = (a) => esc(API_ORIGIN + a.url);
    const immagini = lista.filter((a) => a.mime.startsWith('image/'));
    const video = lista.filter((a) => a.mime.startsWith('video/'));
    const pdf = lista.filter((a) => a.mime === 'application/pdf');
    let h = '';
    if (immagini.length) h += `<div class="as-foto">${immagini.map((a) => `<a href="${url(a)}" target="_blank" rel="noopener"><img src="${url(a)}" alt="${esc(a.nome)}" loading="lazy"></a>`).join('')}</div>`;
    video.forEach((a) => { h += `<video class="as-video" controls preload="metadata" playsinline src="${url(a)}"></video>`; });
    pdf.forEach((a) => { h += `<a class="as-pdf" href="${url(a)}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i><span class="as-pdf-nome">${esc(a.nome)}</span><span class="as-pdf-size">${fmtSize(a.size)}</span></a>`; });
    return h;
}

function htmlMessaggio(m) {
    const mio = (isAdmin && m.autore === 'admin') || (!isAdmin && m.autore === 'utente');
    const autore = mio ? '' : `<div class="as-autore">${m.autore === 'admin' ? 'Assistenza' : esc(nomeCompleto(chatAperta && chatAperta.utente))}</div>`;
    return `
        <div class="as-msg ${mio ? 'as-mia' : 'as-altra'}">
            ${autore}
            <div class="as-bolla">${m.testo ? `<div class="as-testo">${linkifica(esc(m.testo))}</div>` : ''}${htmlAllegati(m.allegati)}</div>
            <div class="as-ora">${fmtDataOra(m.timestamp)}</div>
        </div>`;
}

// Scarica i messaggi nuovi (quelli dopo l'ultimo gia' mostrato). Aprire la chat la segna come letta sul server.
async function aggiornaChat(forzaScroll, attendi) {
    if (!chatAperta || !chatAperta.id) return;
    if (inAggiornamentoChat) { if (!attendi) return; while (inAggiornamentoChat) await attesa(100); }
    if (!chatAperta || !chatAperta.id) return;
    const idRichiesto = chatAperta.id;
    inAggiornamentoChat = true;
    try {
        const r = await api(`/chat/${encodeURIComponent(idRichiesto)}/messaggi?dopo=${ultimoSeq}`);
        if (!chatAperta || chatAperta.id !== idRichiesto) return;   // nel frattempo la chat e' stata chiusa
        isAdmin = !!r.admin;
        chatAperta.oggetto = r.chat.oggetto;
        chatAperta.utente = r.chat.utente || null;
        aggiornaIntestazioneChat();

        const cont = document.getElementById('as-messaggi');
        if (ultimoSeq === 0) cont.innerHTML = '';
        if (r.messaggi.length) {
            const vicinoAlFondo = cont.scrollHeight - cont.scrollTop - cont.clientHeight < 120;
            cont.insertAdjacentHTML('beforeend', r.messaggi.map(htmlMessaggio).join(''));
            ultimoSeq = Math.max(ultimoSeq, ...r.messaggi.map((m) => m.seq));
            if (forzaScroll || vicinoAlFondo) setTimeout(() => { cont.scrollTop = cont.scrollHeight; }, 50);
            if (window.controllaSegnalazioni) window.controllaSegnalazioni();
        }
    } catch (e) {
        console.warn('Aggiornamento chat non riuscito:', e.message);
        const cont = document.getElementById('as-messaggi');
        if (cont && ultimoSeq === 0) cont.innerHTML = `<div class="as-vuoto" style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(e.message)}</div>`;
    } finally {
        inAggiornamentoChat = false;
    }
}

// ---------- Invio ----------
window.autoAltezzaAssistenza = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
};

window.inviaMessaggioAssistenza = async () => {
    if (inInvio || !chatAperta) return;
    const input = document.getElementById('as-input');
    const btn = document.getElementById('as-btn-invia');
    const testo = input.value.trim();
    if (!testo && allegatiScelti.length === 0) return;

    inInvio = true;
    btn.disabled = true;
    const iconaOriginale = btn.innerHTML;
    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";

    const fd = new FormData();
    fd.append('testo', testo);
    allegatiScelti.forEach((f) => fd.append('allegati', f, f.name));
    const conAllegati = allegatiScelti.length > 0;
    const progresso = (p) => { if (conAllegati) btn.innerHTML = `<span style="font-size:11px; font-weight:700;">${p}%</span>`; };

    try {
        if (!chatAperta.id) {
            fd.append('oggetto', chatAperta.oggetto);
            const r = await inviaMultipart('/chat', fd, progresso);
            chatAperta.id = r.chat.id;
            ultimoSeq = 0;
        } else {
            await inviaMultipart(`/chat/${encodeURIComponent(chatAperta.id)}/messaggi`, fd, progresso);
        }
        input.value = '';
        window.autoAltezzaAssistenza(input);
        allegatiScelti = [];
        window.aggiornaUI_AllegatiAssistenza();
        await aggiornaChat(true, true);
        ultimaListaJson = '';
        caricaLista(true);
    } catch (e) {
        alert('Invio non riuscito: ' + e.message);
    } finally {
        inInvio = false;
        btn.disabled = false;
        btn.innerHTML = iconaOriginale;
        input.focus();
    }
};

// ---------- Allegati ----------
window.aggiungiAllegatiAssistenza = async (input) => {
    const files = Array.from(input.files || []);
    input.value = '';
    for (const f of files) {
        if (allegatiScelti.length >= MAX_ALLEGATI) { alert(`Massimo ${MAX_ALLEGATI} allegati per messaggio.`); break; }
        const ammesso = f.type.startsWith('image/') || f.type.startsWith('video/') || f.type === 'application/pdf';
        if (!ammesso) { alert(`"${f.name}": formato non supportato (solo foto, video e PDF).`); continue; }
        const finale = await comprimiImmagine(f);
        if (finale.size > MAX_MB_ALLEGATO * 1048576) { alert(`"${f.name}" supera ${MAX_MB_ALLEGATO} MB.`); continue; }
        allegatiScelti.push(finale);
    }
    window.aggiornaUI_AllegatiAssistenza();
};

window.rimuoviAllegatoAssistenza = (i) => {
    allegatiScelti.splice(i, 1);
    window.aggiornaUI_AllegatiAssistenza();
};

window.aggiornaUI_AllegatiAssistenza = () => {
    const el = document.getElementById('as-allegati-scelti');
    if (!el) return;
    el.innerHTML = allegatiScelti.map((f, i) => {
        const icona = f.type.startsWith('image/') ? 'fa-image' : f.type.startsWith('video/') ? 'fa-film' : 'fa-file-pdf';
        return `<div class="as-scelto"><i class="fa-solid ${icona}" style="color:var(--info);"></i><span class="as-scelto-nome">${esc(f.name)}</span><span class="as-scelto-size">${fmtSize(f.size)}</span><button type="button" class="as-head-btn as-danger" style="width:28px; height:28px;" aria-label="Rimuovi allegato" onclick="window.rimuoviAllegatoAssistenza(${i})"><i class="fa-solid fa-xmark"></i></button></div>`;
    }).join('');
};

// ==========================================================================================
// ADMIN: PROFILO UTENTE ED ELIMINAZIONE
// ==========================================================================================
function htmlProfilo(p) {
    const riga = (icona, etichetta, valore) => `<div class="as-riga-profilo"><i class="fa-solid ${icona} as-ico"></i><div><b>${etichetta}</b>${valore}</div></div>`;
    const nome = [p.nome, p.cognome].filter(Boolean).join(' ') || (p.email ? p.email.split('@')[0] : 'Utente');
    let h = `<div style="font-size:18px; font-weight:800; color:var(--text-main); margin-bottom:6px;">${esc(nome)}</div>`;
    if (p.matricola) h += riga('fa-hashtag', 'Matricola', esc(p.matricola));
    if (p.email) h += riga('fa-envelope', 'Email', `<a href="mailto:${esc(p.email)}" style="color:var(--info);">${esc(p.email)}</a>`);
    if (p.telefono) {
        let num = p.telefono.replace(/\D/g, '');
        if (num && !num.startsWith('39')) num = '39' + num;
        const wa = num ? `<a href="https://wa.me/${num}" target="_blank" rel="noopener" style="color:#25D366; margin-left:12px; font-size:22px; vertical-align:middle;"><i class="fa-brands fa-whatsapp"></i></a>` : '';
        h += riga('fa-phone', 'Telefono', `<a href="tel:${esc(p.telefono)}" style="color:var(--info);">${esc(p.telefono)}</a>${wa}`);
    }
    if (p.ruolo) h += riga('fa-user-tag', 'Ruolo', esc(p.ruolo));
    if (p.rotazione) h += riga('fa-rotate', 'Rotazione', esc(p.rotazione));
    return h;
}

window.apriProfiloAssistenza = async () => {
    if (!chatAperta || !chatAperta.id || !isAdmin) return;
    const corpo = document.getElementById('as-profilo-corpo');
    corpo.innerHTML = `<div class="as-vuoto"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</div>`;
    document.getElementById('modal-profilo-assistenza').style.display = 'flex';
    try {
        const r = await api(`/chat/${encodeURIComponent(chatAperta.id)}/profilo`);
        corpo.innerHTML = htmlProfilo(r.profilo);
    } catch (e) {
        corpo.innerHTML = `<div class="as-vuoto" style="color:var(--danger);">Errore: ${esc(e.message)}</div>`;
    }
};

window.eliminaChatAssistenza = async () => {
    if (!chatAperta || !chatAperta.id || !isAdmin) return;
    if (!confirm("Vuoi eliminare questa chat con tutti i messaggi e gli allegati?")) return;
    try {
        await api(`/chat/${encodeURIComponent(chatAperta.id)}`, { metodo: 'DELETE' });
        window.chiudiChatAssistenza();
    } catch (e) {
        alert("Errore durante l'eliminazione: " + e.message);
    }
};

console.log("Assistenza: file caricato e pronto all'uso.");
