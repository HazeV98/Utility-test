// ==========================================
// ARCHIVIO - JS MODULE (file unico: interfaccia + logica)
// Gestore file dell'archivio sul server (data/archivio): si apre direttamente sulle cartelle, che si creano da qui.
// Tutti possono sfogliare, cercare, aprire e scaricare. Solo l'admin vede in alto i tre puntini: aprono una finestrella con
// le funzioni admin (cerca file nuovi, nuova cartella, carica documento, selezione multipla), e su ogni riga il tasto
// per modificare, spostare o eliminare.
// Selezione multipla (solo admin): si scelgono cartelle e file e, dalla barra in basso, si eliminano oppure si rifà
// l'analisi dei libri turni (per le cartelle scelte vale per tutti i libri turni che contengono).
// Come in bateolive.js l'admin si riconosce dal ruolo "admin" nel profilo (collezione utenti).
//
// Uso (come documenti.js + ui_documenti.js, ma in un file solo):
//     import { initUIArchivio, avviaMotoreArchivio } from './archivio.js';
//     initUIArchivio();                                   // una volta sola: crea le finestre (modal-archivio-main...)
//     avviaMotoreArchivio(db, auth, userData);            // ogni volta che si apre l'archivio
// ==========================================

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js"; // stessa versione di bateolive.js

const API_URL = 'https://utilitybe.homeserver.foo';
const API = `${API_URL}/api/v1/archivio`;
const RADICE = '';                      // la radice è l'archivio stesso (data/archivio)

const stato = { path: RADICE, admin: false, auth: null, timer: null, richiesta: 0, uploadAttivo: null, pollJob: null, timerRicerca: null, gestito: null, caricato: false,
    polling: false, timerStato: null, eraAttivo: false, finale: null, ultimoStato: null, attesaScansione: false, scansioneVista: false,
    selezione: false, scelti: new Map(), visibili: [], operazione: false };

// ---------------------------------------------------------------- interfaccia (finestre)
export function initUIArchivio() {
    if (document.getElementById('modal-archivio-main')) return;

    const uiHTML = `
    <style>
        /* Finestre di caricamento e di gestione: autonome (non dipendono da .modal-overlay), stanno sopra la finestra dell'archivio */
        .arc-overlay { display: none; position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); align-items: center; justify-content: center; padding: calc(12px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px)); box-sizing: border-box; }
        .arc-overlay .arc-box { position: relative; width: 100%; max-width: 420px; max-height: 100%; overflow-y: auto; background: var(--surface, #ffffff); color: var(--text-main, #1e293b); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; padding: 20px; box-sizing: border-box; box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
        .arc-overlay h3 { margin: 0 0 14px; color: var(--primary, #00529b); font-weight: 800; display: flex; align-items: center; gap: 10px; padding-right: 30px; }
        .arc-overlay .arc-chiudi { position: absolute; right: 18px; top: 18px; font-size: 22px; cursor: pointer; color: var(--text-muted, #64748b); }
        .arc-overlay label.arc-lbl { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted, #64748b); margin: 12px 0 5px; text-transform: uppercase; letter-spacing: .03em; }
        .arc-overlay input[type=text], .arc-overlay input[type=date], .arc-overlay select, .arc-overlay textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 16px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); background: var(--surface, #ffffff); color: var(--text-main, #1e293b); }
        .arc-overlay textarea { min-height: 70px; resize: vertical; }
        .arc-overlay .arc-tipo { display: flex; gap: 8px; }
        .arc-overlay .arc-tipo button { flex: 1; padding: 10px 8px; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); background: transparent; color: var(--text-main, #1e293b); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .arc-overlay .arc-tipo button.attivo { background: var(--primary, #00529b); border-color: var(--primary, #00529b); color: #ffffff; }
        .arc-overlay .arc-file-btn { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px dashed var(--border-color, #cbd5e1); border-radius: 10px; cursor: pointer; font-size: 14px; color: var(--text-main, #1e293b); word-break: break-word; }
        .arc-overlay .arc-hint { font-size: 12px; color: var(--text-muted, #64748b); margin-top: 6px; line-height: 1.4; }
        .arc-overlay .arc-err { display: none; margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: var(--danger, #dc3545); background: var(--danger-light, rgba(220,53,69,0.1)); border: 1px solid var(--danger-border, rgba(220,53,69,0.35)); }
        .arc-overlay .arc-azioni { display: flex; gap: 10px; margin-top: 18px; }
        .arc-overlay .arc-azioni button { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); background: transparent; color: var(--text-main, #1e293b); font: inherit; font-weight: 700; cursor: pointer; }
        .arc-overlay .arc-azioni button.pericolo { color: var(--danger, #dc3545); border-color: var(--danger, #dc3545); flex: 0 0 auto; padding: 12px 14px; }
        .arc-overlay .arc-azioni button.primario { background: var(--primary, #00529b); border-color: var(--primary, #00529b); color: #ffffff; }
        .arc-overlay .arc-bar { height: 10px; border-radius: 6px; background: var(--border-color, #e2e8f0); overflow: hidden; margin: 14px 0 10px; }
        .arc-overlay .arc-bar > span { display: block; height: 100%; width: 0; background: var(--primary, #00529b); transition: width .3s ease; }
        .arc-overlay .arc-check { display: flex; align-items: center; gap: 10px; margin-top: 14px; font-size: 14px; cursor: pointer; }
        .arc-overlay .arc-check input { width: 18px; height: 18px; }
        .arc-overlay .arc-riga { display: flex; gap: 8px; align-items: stretch; }
        .arc-overlay .arc-riga button { flex: 0 0 auto; padding: 0 16px; border-radius: 10px; border: none; background: var(--primary, #00529b); color: #ffffff; font: inherit; font-weight: 700; cursor: pointer; }
        .arc-overlay .arc-link { display: inline-block; margin-top: 8px; font-size: 13px; font-weight: 700; color: var(--primary, #00529b); text-decoration: none; }
        .arc-overlay .arc-msg { font-size: 14px; line-height: 1.45; }

        /* Riga di un file o di una cartella: un unico blocco, nome a sinistra e icone a destra */
        @keyframes arcIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .arc-card { display: flex; align-items: center; gap: 2px; flex-shrink: 0; border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; background: var(--surface, #ffffff); padding-right: 6px; animation: arcIn .3s ease both; }
        .arc-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 11px 6px 11px 14px; text-decoration: none; color: var(--text-main, #1e293b); }
        /* Nei documenti le azioni stanno su una riga separata, in basso a destra. */
        .arc-card-file { flex-direction: column; align-items: stretch; gap: 0; padding: 4px 6px 4px 0; }
        .arc-card-file .arc-main { width: 100%; box-sizing: border-box; padding: 8px 4px 5px 14px; }
        .arc-file-actions { display: flex; align-items: center; justify-content: flex-end; gap: 2px; align-self: flex-end; }
        .arc-testo { flex: 1; min-width: 0; word-break: break-word; }
        .arc-nome { display: block; font-size: 15px; font-weight: 600; }
        .arc-sub { display: block; font-size: 12px; font-weight: 400; color: var(--text-muted, #64748b); margin-top: 2px; }
        .arc-sub.err { color: var(--danger, #dc3545); }
        .arc-sub.warn { color: #b45309; }
        .arc-ico { flex: 0 0 auto; width: 38px; height: 38px; border: none; border-radius: 50%; background: transparent; color: var(--primary, #00529b); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .arc-ico:active { background: rgba(0, 82, 155, 0.12); }
        /* Finestrella delle funzioni admin (tre puntini): overlay trasparente, il menu si posiziona sotto il tasto */
        .arc-overlay.arc-overlay-menu { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; padding: 0; }
        .arc-menu { position: absolute; min-width: 240px; max-width: calc(100vw - 24px); background: var(--surface, #ffffff); color: var(--text-main, #1e293b); border: 1px solid var(--border-color, #e2e8f0); border-radius: 14px; padding: 6px; box-shadow: 0 12px 40px rgba(0,0,0,0.3); box-sizing: border-box; animation: arcIn .15s ease both; }
        .arc-menu button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 12px; border: none; border-radius: 10px; background: transparent; color: var(--text-main, #1e293b); font: inherit; font-size: 15px; font-weight: 600; text-align: left; cursor: pointer; }
        .arc-menu button:active { background: rgba(0, 82, 155, 0.12); }
        .arc-menu button i { width: 18px; text-align: center; color: var(--primary, #00529b); }
        .arc-menu button:disabled { opacity: .45; cursor: default; }

        /* Selezione multipla */
        .arc-casella { flex: 0 0 auto; width: 22px; height: 22px; box-sizing: border-box; border-radius: 50%; border: 2px solid var(--border-color, #cbd5e1); display: flex; align-items: center; justify-content: center; font-size: 11px; color: transparent; transition: .15s; }
        .arc-casella.on { background: var(--primary, #00529b); border-color: var(--primary, #00529b); color: #ffffff; }
        .arc-card-sel { user-select: none; -webkit-user-select: none; }
        .arc-card-sel.scelta { border-color: var(--primary, #00529b); background: rgba(0, 82, 155, 0.06); }
        .arc-card-sel .arc-file-actions { display: none; }
        .arc-card-file.arc-card-sel .arc-main { padding-bottom: 8px; }
        .arc-ico:disabled { opacity: .35; cursor: default; }
        .arc-selbtn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 8px; border-radius: 10px; border: 1px solid var(--primary, #00529b); background: transparent; color: var(--primary, #00529b); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .arc-selbtn.pericolo { border-color: var(--danger, #dc3545); color: var(--danger, #dc3545); }
        .arc-selbtn:disabled { opacity: .35; cursor: default; }
        #archivio-banner .arc-banner-bar { height: 6px; border-radius: 4px; background: rgba(0, 82, 155, 0.15); overflow: hidden; margin-top: 8px; }
        #archivio-banner .arc-banner-bar > span { display: block; height: 100%; background: var(--primary, #00529b); transition: width .5s ease; }
    </style>

    <!-- MODALE ARCHIVIO TURNI -->
    <div id="modal-archivio-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-archivio-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-archivio-main')"></i>

            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-box-archive"></i> Archivio
                <!-- solo admin: lo mostra impostaPulsanteAdmin. Apre la finestrella con le funzioni admin -->
                <span id="archivio-admin-btns" style="display:none; margin-left:auto; margin-right:38px; align-items:center;">
                    <button id="archivio-btn-menu" title="Funzioni admin" aria-label="Funzioni admin" aria-haspopup="true" style="width:34px; height:34px; flex-shrink:0; border-radius:50%; border:1px solid var(--primary); background:transparent; color:var(--primary); font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                </span>
            </h3>
            <div style="position:relative; margin: 14px 0 4px; flex-shrink:0;">
                <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:13px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:14px; pointer-events:none;"></i>
                <input type="text" id="archivio-cerca" placeholder="Cerca documenti, servizi, anni…" autocomplete="off" enterkeyhint="search" aria-label="Cerca documenti" style="width:100%; box-sizing:border-box; font:inherit; font-size:16px; padding:10px 38px 10px 38px; border-radius:10px; border:1px solid var(--border-color); background:var(--surface); color:var(--text-main);">
                <i class="fa-solid fa-circle-xmark" id="archivio-cerca-x" role="button" aria-label="Cancella ricerca" style="display:none; position:absolute; right:13px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:16px; cursor:pointer;"></i>
            </div>
            <div id="archivio-banner" style="display:none; flex-shrink:0; margin: 8px 0 0; padding: 10px 12px; border-radius: 10px; font-size: 13px; line-height: 1.4; background: rgba(0, 82, 155, 0.07); border: 1px solid rgba(0, 82, 155, 0.25); color: var(--text-main);"></div>
            <div id="archivio-content-area" style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 14px;">
            </div>
            <!-- barra della selezione multipla (solo admin, compare in modalità selezione) -->
            <div id="archivio-sel-bar" style="display:none; flex-shrink:0; flex-direction:column; gap:8px; margin-top:10px; padding:8px 10px 10px; border-radius:12px; border:1px solid var(--border-color); background:var(--surface);">
                <div style="display:flex; align-items:center; gap:4px;">
                    <span id="archivio-sel-n" style="flex:1; font-size:14px; font-weight:700; color:var(--text-main);">Tocca per selezionare</span>
                    <button type="button" class="arc-ico" id="archivio-sel-tutti" title="Seleziona tutto" aria-label="Seleziona tutto"><i class="fa-solid fa-square-check"></i></button>
                    <button type="button" class="arc-ico" id="archivio-sel-fine" title="Esci dalla selezione" aria-label="Esci dalla selezione" style="color:var(--text-muted);"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" class="arc-selbtn" id="archivio-sel-analisi"><i class="fa-solid fa-gears"></i> Rifai analisi</button>
                    <button type="button" class="arc-selbtn pericolo" id="archivio-sel-elimina"><i class="fa-solid fa-trash"></i> Elimina</button>
                </div>
            </div>
        </div>
    </div>

    <!-- FINESTRA DI CARICAMENTO (solo admin) -->
    <div id="modal-archivio-upload" class="arc-overlay" role="dialog" aria-modal="true" aria-label="Carica documento">
        <div class="arc-box">
            <i class="fa-solid fa-xmark arc-chiudi" id="arc-x" role="button" aria-label="Chiudi"></i>
            <h3><i class="fa-solid fa-cloud-arrow-up"></i> Carica documento</h3>

            <div id="arc-form">
                <input type="hidden" id="arc-modal-tipo" value="generico">
                <label class="arc-lbl">Tipo di documento</label>
                <div class="arc-tipo">
                    <button type="button" data-tipo="generico" class="attivo"><i class="fa-solid fa-file-lines"></i> Generico</button>
                    <button type="button" data-tipo="turni"><i class="fa-solid fa-table-list"></i> File turni</button>
                </div>

                <label class="arc-lbl">File PDF</label>
                <label class="arc-file-btn" for="arc-file"><i class="fa-solid fa-file-pdf" style="color:var(--danger, #dc3545); font-size:20px;"></i><span id="arc-file-nome">Scegli un file…</span></label>
                <input type="file" id="arc-file" accept=".pdf,application/pdf" style="display:none;">

                <label class="arc-lbl" for="arc-nome">Nome</label>
                <input type="text" id="arc-nome" maxlength="110" autocomplete="off">

                <label class="arc-lbl" for="arc-cartella">Cartella</label>
                <select id="arc-cartella"></select>
                <a href="#" class="arc-link" id="arc-nc-link"><i class="fa-solid fa-folder-plus"></i> Nuova cartella qui dentro…</a>
                <div class="arc-riga" id="arc-nc-box" style="display:none; margin-top:8px;">
                    <input type="text" id="arc-nc-nome" maxlength="110" placeholder="Nome della nuova cartella" autocomplete="off">
                    <button type="button" id="arc-nc-crea">Crea</button>
                </div>

                <div id="arc-blocco-generico">
                    <label class="arc-lbl" for="arc-nota">Nota (facoltativa)</label>
                    <textarea id="arc-nota" maxlength="2000" placeholder="Compare accanto al documento"></textarea>
                </div>

                <div id="arc-blocco-turni" style="display:none;">
                    <div class="arc-hint" style="margin-top:12px;">Servizio e validità (anche le date degli eventi) li legge il server dal libro. L'analisi parte da sola, anche se ce ne sono altre in coda, e il PDF dei risultati resta allegato al documento.</div>
                </div>

                <div class="arc-err" id="arc-errore"></div>
                <div class="arc-azioni">
                    <button type="button" id="arc-annulla">Annulla</button>
                    <button type="button" id="arc-invia" class="primario">Carica</button>
                </div>
            </div>

            <div id="arc-progresso" style="display:none;">
                <div class="arc-bar"><span id="arc-barra"></span></div>
                <div class="arc-msg" id="arc-msg"></div>
                <div class="arc-azioni">
                    <button type="button" id="arc-fine" class="primario">Annulla</button>
                </div>
            </div>
        </div>
    </div>

    <!-- FINESTRA DI GESTIONE (solo admin): modifica file o cartella, nuova cartella -->
    <div id="modal-archivio-gestione" class="arc-overlay" role="dialog" aria-modal="true" aria-label="Gestisci">
        <div class="arc-box">
            <i class="fa-solid fa-xmark arc-chiudi" id="arg-x" role="button" aria-label="Chiudi"></i>
            <h3><i class="fa-solid fa-pen" id="arg-icona"></i> <span id="arg-titolo">Gestisci</span></h3>

            <div class="arc-hint" id="arg-hint" style="display:none; margin: 0 0 4px;"></div>

            <label class="arc-lbl" for="arg-nome">Nome</label>
            <input type="text" id="arg-nome" maxlength="110" autocomplete="off">

            <div id="arg-blocco-file" style="display:none;">
                <label class="arc-lbl" for="arg-nota">Nota</label>
                <textarea id="arg-nota" maxlength="2000" placeholder="Compare accanto al documento"></textarea>

                <div id="arg-blocco-analisi">
                    <label class="arc-check"><input type="checkbox" id="arg-analizza"><span id="arg-analizza-txt"></span></label>
                    <div id="arg-blocco-turni" style="display:none;">
                        <label class="arc-lbl" for="arg-servizio">Servizio</label>
                        <input type="text" id="arg-servizio" maxlength="80" placeholder="es. Inverno 2026" autocomplete="off">
                        <label class="arc-lbl" for="arg-valido">Valido dal</label>
                        <input type="date" id="arg-valido">
                        <label class="arc-lbl" for="arg-fino">Fino al (solo eventi)</label>
                        <input type="date" id="arg-fino">
                        <div class="arc-hint" id="arg-hint-turni"></div>
                    </div>
                </div>

                <label class="arc-lbl" for="arg-sposta">Sposta in</label>
                <select id="arg-sposta"></select>
            </div>

            <div class="arc-err" id="arg-errore"></div>
            <div class="arc-azioni">
                <button type="button" id="arg-elimina" class="pericolo" title="Elimina" aria-label="Elimina"><i class="fa-solid fa-trash"></i></button>
                <button type="button" id="arg-annulla">Annulla</button>
                <button type="button" id="arg-salva" class="primario">Salva</button>
            </div>
        </div>
    </div>

    <!-- FINESTRELLA DELLE FUNZIONI ADMIN (tre puntini) -->
    <div id="archivio-menu-overlay" class="arc-overlay arc-overlay-menu">
        <div class="arc-menu" id="archivio-menu" role="menu">
            <button type="button" role="menuitem" id="archivio-mn-seleziona"><i class="fa-solid fa-square-check"></i><span>Seleziona più elementi</span></button>
            <button type="button" role="menuitem" id="archivio-mn-scansiona"><i class="fa-solid fa-rotate"></i><span>Cerca file nuovi</span></button>
            <button type="button" role="menuitem" id="archivio-mn-cartella"><i class="fa-solid fa-folder-plus"></i><span>Nuova cartella</span></button>
            <button type="button" role="menuitem" id="archivio-mn-nuovo"><i class="fa-solid fa-cloud-arrow-up"></i><span>Carica documento</span></button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ---------------------------------------------------------------- utilità
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (id) => document.getElementById(id);

function dmy(iso) {                     // "2026-09-14" -> "14/09/2026"
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function dimensione(b) {
    if (b >= 1048576) return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
    return Math.max(1, Math.round(b / 1024)) + ' KB';
}

// Stesso nome "pulito" di documenti.js: senza estensione, trattini bassi come spazi, iniziale maiuscola
function nomeVisibile(nome) {
    const n = String(nome).replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    return n.charAt(0).toUpperCase() + n.slice(1);
}

async function tokenUtente() {
    try {
        const u = stato.auth && stato.auth.currentUser;
        return u ? await u.getIdToken() : null;
    } catch (e) { return null; }
}

async function apiElenco(path) {
    const r = await fetch(`${API}?path=${encodeURIComponent(path)}&t=${Date.now()}`);
    const dati = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(dati.error || `Errore ${r.status}`);
    return dati;
}

async function apiScrivi(metodo, percorso, body) {
    const token = await tokenUtente();
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`${API}${percorso}`, { method: metodo, headers, body: body ? JSON.stringify(body) : undefined });
    const dati = await r.json().catch(() => ({}));
    if (!r.ok) { const err = new Error(dati.error || `Errore ${r.status}`); err.status = r.status; throw err; }
    return dati;
}

const genitoreDi = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');   // '' = radice
const percorsoLeggibile = (p) => (p ? p.split('/').join(' / ') : 'Archivio');

// Scarica il file invece di aprirlo nel browser (come window.downloadForzato in documenti.js)
async function scarica(url, nomeFile) {
    try {
        const risposta = await fetch(url);
        if (!risposta.ok) throw new Error('download non riuscito');
        const blob = await risposta.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = nomeFile;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);
    } catch (e) {
        window.open(url, '_blank'); // se il download forzato non riesce lo apre in una nuova scheda
    }
}

// ---------------------------------------------------------------- avvio
export async function avviaMotoreArchivio(db, auth, userData) {
    initUIArchivio();      // se le finestre non esistono ancora le crea (non fa nulla se ci sono già)
    const area = el('archivio-content-area');
    if (!area) return;
    stato.auth = auth || null;
    stato.path = RADICE;
    stato.admin = false;
    stato.caricato = false;
    const campo = el('archivio-cerca');
    if (campo) campo.value = '';
    aggiornaCampoRicerca();
    collegaRicerca();
    collegaGestione();
    collegaUpload();
    collegaMenu();
    collegaSelezione();
    stato.selezione = false; stato.scelti.clear(); stato.visibili = []; stato.operazione = false;
    aggiornaBarraSelezione();
    impostaPulsanteAdmin();
    verificaRuoloAdmin(db, userData);   // non blocca la lista: i tre puntini compaiono appena il ruolo è noto
    avviaPolling();                     // mostra subito se ci sono analisi in corso
    await apriCartella(RADICE);
}

// I tre puntini compaiono solo con ruolo "admin" nel profilo (come in bateolive.js).
async function verificaRuoloAdmin(db, userData) {
    let ruolo = userData && userData.ruolo;
    if (ruolo === undefined && db && stato.auth && stato.auth.currentUser) {
        try {
            const snap = await getDoc(doc(db, 'utenti', stato.auth.currentUser.uid));
            ruolo = snap.exists() ? snap.data().ruolo : undefined;
        } catch (e) { /* senza profilo leggibile niente caricamento */ }
    }
    stato.admin = ruolo === 'admin';
    impostaPulsanteAdmin();
    if (stato.admin && stato.caricato) aggiorna();    // le righe già disegnate ricevono il tasto di gestione
}

function impostaPulsanteAdmin() {
    const gruppo = el('archivio-admin-btns');
    if (!gruppo) return;
    gruppo.style.display = stato.admin ? 'flex' : 'none';
    el('archivio-btn-menu').onclick = apriMenu;
    if (!stato.admin) chiudiMenu();
}

// ---------------------------------------------------------------- finestrella delle funzioni admin
function apriMenu() {
    if (!stato.admin) return;
    const ov = el('archivio-menu-overlay'), m = el('archivio-menu'), b = el('archivio-btn-menu');
    el('archivio-mn-seleziona').querySelector('span').textContent = stato.selezione ? 'Esci dalla selezione' : 'Seleziona più elementi';
    ov.style.display = 'block';
    const r = b.getBoundingClientRect();
    m.style.top = (r.bottom + 6) + 'px';
    m.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
}

function chiudiMenu() {
    const ov = el('archivio-menu-overlay');
    if (ov) ov.style.display = 'none';
}

function collegaMenu() {
    const ov = el('archivio-menu-overlay');
    if (!ov || ov.dataset.pronto) return;
    ov.dataset.pronto = '1';
    ov.addEventListener('click', (ev) => { if (ev.target === ov) chiudiMenu(); });
    const voce = (id, fn) => { el(id).onclick = () => { chiudiMenu(); fn(); }; };
    voce('archivio-mn-seleziona', () => (stato.selezione ? esciSelezione() : entraSelezione()));
    voce('archivio-mn-scansiona', avviaScansione);
    voce('archivio-mn-cartella', () => apriGestione('nuova-cartella', { path: stato.path }));
    voce('archivio-mn-nuovo', apriUpload);
}

// Ricarica quello che si sta vedendo: i risultati della ricerca, oppure la cartella aperta
function aggiorna() {
    const q = ricercaAttiva();
    if (q) eseguiRicerca(q, true); else apriCartella(stato.path, true);
}

// ---------------------------------------------------------------- elenco cartelle e file
async function apriCartella(path, silenzioso) {
    const area = el('archivio-content-area');
    if (!area) return;
    const n = ++stato.richiesta;
    clearTimeout(stato.timer);
    if (!silenzioso) {
        area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i> Caricamento archivio...</div>`;
    }
    try {
        const dati = await apiElenco(path);
        if (n !== stato.richiesta) return;      // nel frattempo è stata aperta un'altra cartella
        stato.path = dati.path;
        disegna(area, dati);
    } catch (e) {
        if (n !== stato.richiesta) return;
        if (silenzioso) return;                 // aggiornamento in sottofondo: resta quello che si vede
        area.innerHTML = `<div class="status-message" style="color:var(--danger); border-color:var(--danger-border); background:var(--danger-light);"><i class="fa-solid fa-triangle-exclamation" style="font-size:28px;"></i> ${esc(e.message || 'Archivio non raggiungibile')}<br><a href="#" id="archivio-riprova" style="color:var(--primary); font-weight:700;">Riprova</a></div>`;
        const r = el('archivio-riprova');
        if (r) r.onclick = (ev) => { ev.preventDefault(); apriCartella(path); };
    }
}

function disegna(area, dati) {
    stato.caricato = true;
    area.innerHTML = '';

    const bc = briciole(dati);
    if (bc) area.appendChild(bc);

    const file = [...dati.file].sort((a, b) => {
        // Prima i libri turni, ordinati per inizio validità dal più recente al più vecchio.
        // I documenti generici restano in fondo, in ordine alfabetico.
        const aTurni = a.categoria === 'turni';
        const bTurni = b.categoria === 'turni';
        if (aTurni !== bTurni) return aTurni ? -1 : 1;
        if (aTurni && bTurni) {
            const dataA = a.valido_dal || '';
            const dataB = b.valido_dal || '';
            if (dataA !== dataB) return dataA < dataB ? 1 : -1;
        }
        return a.nome.localeCompare(b.nome, 'it', { numeric: true });
    });

    stato.visibili = [...dati.cartelle.filter((c) => !c.protetta).map((c) => datiSelezione(c, true)), ...file.map((f) => datiSelezione(f, false))];
    aggiornaBarraSelezione();

    if (!dati.cartelle.length && !file.length) {
        const vuoto = document.createElement('div');
        vuoto.className = 'status-message';
        const msg = dati.path === '' ? (stato.admin ? 'L\'archivio è vuoto. Crea la prima cartella dal menu (tre puntini) in alto, oppure copia i file nella cartella dell\'archivio sul server: li trova da solo.' : 'L\'archivio è vuoto.') : 'Nessun documento in questa cartella.';
        vuoto.innerHTML = `<i class="fa-regular fa-folder-open" style="font-size:32px; color:var(--text-muted);"></i> ${msg}`;
        area.appendChild(vuoto);
        return;
    }

    let i = 0;
    dati.cartelle.forEach((c) => area.appendChild(rigaCartella(c, i++)));
    file.forEach((f) => area.appendChild(rigaFile(f, i++)));
    if (file.some(analisiAttiva)) avviaPolling();   // finché c'è un'analisi in corso o in coda la lista si aggiorna da sola
}

function briciole(dati) {
    const parti = dati.briciole;
    if (parti.length < 2) return null;   // nella radice non serve
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:13px; color:var(--text-muted);';
    parti.forEach((b, k) => {
        const ultima = k === parti.length - 1;
        const nome = b.path === '' ? 'Archivio' : b.nome;
        if (k) nav.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-chevron-right" style="font-size:10px;"></i>');
        if (ultima) {
            nav.insertAdjacentHTML('beforeend', `<span style="font-weight:700; color:var(--text-main);">${esc(nome)}</span>`);
        } else {
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = nome;
            a.style.cssText = 'color:var(--primary); font-weight:600; text-decoration:none;';
            a.onclick = (ev) => { ev.preventDefault(); apriCartella(b.path); };
            nav.appendChild(a);
        }
    });
    return nav;
}

const analisiAttiva = (f) => !!(f.analisi && (f.analisi.stato === 'in_coda' || f.analisi.stato === 'in_corso'));
const BTN_APRI = `<button class="arc-ico" data-azione="apri" title="Apri cartella" aria-label="Apri cartella"><i class="fa-solid fa-chevron-right"></i></button>`;
const CASELLA = (on) => `<span class="arc-casella${on ? ' on' : ''}"><i class="fa-solid fa-check"></i></span>`;
const BTN_GESTISCI = `<button class="arc-ico" data-azione="gestisci" title="Gestisci" aria-label="Gestisci"><i class="fa-solid fa-ellipsis-vertical"></i></button>`;
const sub = (html, classe = '') => `<span class="arc-sub ${classe}">${html}</span>`;

function rigaCartella(c, i, inRicerca) {
    const n = c.cartelle + c.file;
    const inSel = stato.admin && stato.selezione && !c.protetta;     // le cartelle protette non si selezionano
    const dati = inSel ? datiSelezione(c, true) : null;
    const row = document.createElement('div');
    row.className = 'arc-card';
    row.style.animationDelay = `${Math.min(i, 10) * 0.04}s`;
    row.innerHTML = `
        <a class="arc-main" href="#">
            ${inSel ? CASELLA(stato.scelti.has(c.path)) : ''}
            <i class="fa-solid fa-folder" style="color: #f59e0b; font-size: 20px; flex-shrink: 0;"></i>
            <span class="arc-testo">
                <span class="arc-nome">${esc(c.nome)}</span>
                ${sub(`${n === 0 ? 'Vuota' : n === 1 ? '1 elemento' : n + ' elementi'}${inRicerca ? ' · in ' + esc(percorsoLeggibile(c.genitore)) : ''}`)}
            </span>
            ${inSel ? '' : '<i class="fa-solid fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i>'}
        </a>
        ${inSel ? BTN_APRI : (stato.admin && !c.protetta ? BTN_GESTISCI : '')}`;
    if (inSel) {
        row.classList.add('arc-card-sel');
        row.dataset.path = c.path;
        if (stato.scelti.has(c.path)) row.classList.add('scelta');
    }
    row.querySelector('a').addEventListener('click', (ev) => {
        ev.preventDefault();
        if (inSel) return commutaSelezione(row, dati);       // in selezione il tocco sceglie, per entrare c'è la freccia
        azzeraRicerca(); apriCartella(c.path);
    });
    const ap = row.querySelector('[data-azione="apri"]');
    if (ap) ap.addEventListener('click', () => { azzeraRicerca(); apriCartella(c.path); });
    const g = row.querySelector('[data-azione="gestisci"]');
    if (g) g.addEventListener('click', () => apriGestione('cartella', c));
    return row;
}

function rigaFile(f, i, inRicerca) {
    let icona = 'fa-solid fa-file-lines', colore = 'var(--primary)';
    if (f.estensione === '.pdf') { icona = 'fa-solid fa-file-pdf'; colore = 'var(--danger)'; }
    else if (f.estensione === '.doc' || f.estensione === '.docx') { icona = 'fa-solid fa-file-word'; colore = '#2b579a'; }
    else if (f.estensione === '.xls' || f.estensione === '.xlsx') { icona = 'fa-solid fa-file-excel'; colore = 'var(--success)'; }

    const a = f.analisi;
    let sotto = '';
    let info = '';

    if (f.categoria === 'turni') {
        // servizio e validità arrivano dall'analisi del libro (le date degli eventi sono già nel nome del servizio)
        if (f.servizio) sotto += sub(esc(f.servizio));
        // se il nome è dedotto dalle date (es. "Evento 2–12 settembre 2026") ripeterle sarebbe inutile
        if (f.periodo_testo && !f.servizio_dedotto) sotto += sub(esc(f.periodo_testo));
        else if (!f.periodo_testo && f.valido_dal) sotto += sub(`dal ${esc(dmy(f.valido_dal))}`);
        if (a && a.stato === 'in_coda') sotto += sub(`<i class="fa-regular fa-clock"></i> In coda per l'analisi${a.posizione ? ' (n. ' + a.posizione + ')' : ''}`);
        else if (a && a.stato === 'in_corso') sotto += sub(`<i class="fa-solid fa-circle-notch fa-spin"></i> Analisi in corso…`);
        else if (a && a.stato === 'errore') sotto += sub(`<i class="fa-solid fa-triangle-exclamation"></i> Analisi non riuscita: ${esc(a.errore || 'errore')}`, 'err');
        else if (a && a.stato === 'interrotta') sotto += sub(`<i class="fa-solid fa-triangle-exclamation"></i> Analisi interrotta: riparte alla prossima scansione`, 'warn');
        else if (a && a.stato === 'completato' && a.pdf_errore) sotto += sub(`<i class="fa-solid fa-triangle-exclamation"></i> PDF dell'analisi non disponibile`, 'warn');
        if (stato.admin && f.avvisi_periodo && f.avvisi_periodo.length) sotto += sub(`<i class="fa-solid fa-triangle-exclamation"></i> Controlla la validità: ${esc(f.avvisi_periodo.join('; '))}`, 'warn');
        if (a && a.stato === 'completato' && a.pdf_url) {
            info = `<button class="arc-ico" data-azione="info" title="Risultato dell'analisi" aria-label="Risultato dell'analisi"><i class="fa-solid fa-circle-info"></i></button>`;
        }
    } else {
        if (f.nota) sotto += `<span class="arc-sub" style="white-space:pre-wrap; color:var(--text-main); opacity:.85;">${esc(f.nota)}</span>`;
        sotto += sub(esc([dimensione(f.dimensione), dmy(f.caricato || f.modificato)].filter(Boolean).join(' · ')));
    }
    if (inRicerca) sotto += sub(`<i class="fa-regular fa-folder"></i> ${esc(percorsoLeggibile(f.genitore))}`);

    const inSel = stato.admin && stato.selezione;
    const dati = inSel ? datiSelezione(f, false) : null;
    const row = document.createElement('div');
    row.className = 'arc-card arc-card-file';
    row.style.animationDelay = `${Math.min(i, 10) * 0.04}s`;
    
    // -- CACHE BUSTER --
    const cacheBuster = '&t=' + (a && a.completata ? new Date(a.completata).getTime() : new Date(f.modificato).getTime());
    const linkFile = API_URL + f.url + cacheBuster;
    const linkAnalisi = a && a.pdf_url ? API_URL + a.pdf_url + cacheBuster : '';

    row.innerHTML = `
        <a class="arc-main" href="${esc(linkFile)}" target="_blank" rel="noopener">
            ${inSel ? CASELLA(stato.scelti.has(f.path)) : ''}
            <i class="${icona}" style="color: ${colore}; font-size: 20px; flex-shrink: 0;"></i>
            <span class="arc-testo">
                <span class="arc-nome">${esc(nomeVisibile(f.nome))}</span>
                ${sotto}
            </span>
        </a>
        <div class="arc-file-actions">
            <button class="arc-ico" data-azione="scarica" title="Scarica documento" aria-label="Scarica documento"><i class="fa-solid fa-download"></i></button>
            ${info}
            ${stato.admin ? BTN_GESTISCI : ''}
        </div>`;

    if (inSel) {
        row.classList.add('arc-card-sel');
        row.dataset.path = f.path;
        if (stato.scelti.has(f.path)) row.classList.add('scelta');
        row.querySelector('a.arc-main').addEventListener('click', (ev) => { ev.preventDefault(); commutaSelezione(row, dati); });
    }
    row.querySelector('[data-azione="scarica"]').addEventListener('click', () => scarica(linkFile, f.nome));
    const bi = row.querySelector('[data-azione="info"]');
    if (bi) bi.addEventListener('click', () => window.open(linkAnalisi, '_blank', 'noopener'));
    const bg = row.querySelector('[data-azione="gestisci"]');
    if (bg) bg.addEventListener('click', () => apriGestione('file', f));
    return row;
}

// ---------------------------------------------------------------- ricerca
const ricercaAttiva = () => {
    const c = el('archivio-cerca');
    const q = c ? c.value.trim() : '';
    return q.length >= 2 ? q : '';
};

function aggiornaCampoRicerca() {
    const c = el('archivio-cerca'), x = el('archivio-cerca-x');
    if (x) x.style.display = c && c.value ? 'block' : 'none';
}

function azzeraRicerca() {
    const c = el('archivio-cerca');
    if (c) c.value = '';
    clearTimeout(stato.timerRicerca);
    aggiornaCampoRicerca();
}

function collegaRicerca() {
    const c = el('archivio-cerca');
    if (!c || c.dataset.pronto) return;
    c.dataset.pronto = '1';
    c.addEventListener('input', () => {
        aggiornaCampoRicerca();
        clearTimeout(stato.timerRicerca);
        stato.timerRicerca = setTimeout(() => {
            const q = ricercaAttiva();
            if (q) eseguiRicerca(q); else apriCartella(stato.path);   // campo svuotato: si torna alla cartella
        }, 300);
    });
    c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') c.blur(); });   // chiude la tastiera sul telefono
    el('archivio-cerca-x').onclick = () => { azzeraRicerca(); apriCartella(stato.path); c.focus(); };
}

async function eseguiRicerca(q, silenzioso) {
    const area = el('archivio-content-area');
    if (!area) return;
    const n = ++stato.richiesta;
    clearTimeout(stato.timer);
    if (!silenzioso) {
        area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i> Ricerca in corso...</div>`;
    }
    try {
        const r = await fetch(`${API}/cerca?q=${encodeURIComponent(q)}&path=${RADICE}&t=${Date.now()}`);
        const dati = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(dati.error || `Errore ${r.status}`);
        if (n !== stato.richiesta || ricercaAttiva() !== q) return;    // nel frattempo è cambiata la ricerca
        disegnaRisultati(area, q, dati);
    } catch (e) {
        if (n !== stato.richiesta || silenzioso) return;
        area.innerHTML = `<div class="status-message" style="color:var(--danger); border-color:var(--danger-border); background:var(--danger-light);"><i class="fa-solid fa-triangle-exclamation" style="font-size:28px;"></i> ${esc(e.message || 'Ricerca non riuscita')}</div>`;
    }
}

function disegnaRisultati(area, q, dati) {
    stato.caricato = true;
    area.innerHTML = '';
    stato.visibili = dati.risultati.filter((r) => !(r.tipo === 'cartella' && r.protetta)).map((r) => datiSelezione(r, r.tipo === 'cartella'));
    aggiornaBarraSelezione();
    if (!dati.risultati.length) {
        area.innerHTML = `<div class="status-message"><i class="fa-solid fa-magnifying-glass" style="font-size:28px; color:var(--text-muted);"></i> Nessun risultato per «${esc(q)}».</div>`;
        return;
    }
    const intest = document.createElement('div');
    intest.style.cssText = 'font-size:13px; color:var(--text-muted);';
    intest.textContent = dati.risultati.length === 1 ? '1 risultato' : `${dati.risultati.length} risultati${dati.troncato ? ' (ce ne sono altri: affina la ricerca)' : ''}`;
    area.appendChild(intest);
    let parziale = false;
    dati.risultati.forEach((r, i) => {
        if (r.corrispondenza === 'parziale' && !parziale) {      // da qui in poi contengono solo alcune delle parole cercate
            parziale = true;
            const sep = document.createElement('div');
            sep.style.cssText = 'font-size:12px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:var(--text-muted); margin-top:6px;';
            sep.textContent = dati.completi ? 'Contengono solo alcune parole' : 'Nessuno le contiene tutte: ecco chi ne contiene alcune';
            area.appendChild(sep);
        }
        area.appendChild(r.tipo === 'cartella' ? rigaCartella(r, i, true) : rigaFile(r, i, true));
    });
    if (dati.risultati.some(analisiAttiva)) avviaPolling();
}

// ---------------------------------------------------------------- coda delle analisi e scansione
// Il server analizza un libro alla volta (anche quelli messi a mano nelle cartelle): finché c'è lavoro si controlla
// GET /stato ogni pochi secondi, si mostra il banner e si ricarica l'elenco.
function disegnaBanner(d) {
    const b = el('archivio-banner');
    if (!b) return;
    if (d) stato.ultimoStato = d;
    const st = stato.ultimoStato;
    let html = '';
    if (st && st.scansione && st.scansione.in_corso) {
        html = `<i class="fa-solid fa-circle-notch fa-spin"></i> Scansione dell'archivio in corso…`;
    } else if (st && st.coda && st.coda.attiva) {
        const c = st.coda, cur = c.in_corso;
        const n = Math.min(c.fatti + 1, c.totale);
        const avanz = c.totale ? Math.min(100, Math.round(((c.fatti + ((cur && cur.percentuale) || 0) / 100) / c.totale) * 100)) : 0;
        html = `<i class="fa-solid fa-gears"></i> Analisi dei libri turni: <b>${n} di ${c.totale}</b>`
            + (cur ? `<br><span class="arc-sub">${esc(cur.nome)}${cur.messaggio ? ' · ' + esc(cur.messaggio) : ''}</span>` : '')
            + `<div class="arc-banner-bar"><span style="width:${avanz}%"></span></div>`;
    } else if (stato.finale && stato.finale.fino > Date.now()) {
        html = stato.finale.html;
    }
    b.style.display = html ? '' : 'none';
    b.innerHTML = html;
}

function mostraFinale(html) {
    stato.finale = { html, fino: Date.now() + 9000 };
    disegnaBanner();
    avviaPolling();
}

function avviaPolling() {
    if (stato.polling) return;
    stato.polling = true;
    cicloStato();
}

async function cicloStato() {
    const area = el('archivio-content-area');
    if (!area || !area.isConnected || area.offsetParent === null) { stato.polling = false; return; }   // finestra chiusa
    let attivo = false;
    try {
        const r = await fetch(`${API}/stato?t=${Date.now()}`, { cache: 'no-store' });
        const d = await r.json();
        attivo = !!(d.coda.attiva || d.scansione.in_corso);
        if (d.scansione.in_corso) stato.scansioneVista = true;
        else if (stato.attesaScansione && stato.scansioneVista) {       // la scansione chiesta con il pulsante è finita
            stato.attesaScansione = false; stato.scansioneVista = false;
            const e = d.scansione.esito || {};
            let testo = e.nuovi || e.ripresi || e.riprovati
                ? `<i class="fa-solid fa-circle-check" style="color:var(--success, #28a745);"></i> Scansione completata: <b>${e.nuovi || 0}</b> file nuovi (${e.libri || 0} libri turni, ${e.generici || 0} documenti)${e.ripresi ? `, ${e.ripresi} analisi riprese` : ''}${e.riprovati ? `, ${e.riprovati} analisi rifatte` : ''}.`
                : `<i class="fa-solid fa-circle-check" style="color:var(--success, #28a745);"></i> Scansione completata: nessun file nuovo.`;
            if (e.in_attesa_di_copia) testo += `<br><span class="arc-sub">${e.in_attesa_di_copia} file sono ancora in copia: riprova tra poco.</span>`;
            if (d.scansione.errore) testo = `<i class="fa-solid fa-triangle-exclamation"></i> Scansione non riuscita: ${esc(d.scansione.errore)}`;
            stato.finale = { html: testo, fino: Date.now() + 9000 };
        }
        disegnaBanner(d);
        if (attivo || stato.eraAttivo) aggiorna();           // le righe cambiano man mano e una volta alla fine
        stato.eraAttivo = attivo;
    } catch (e) { /* server non raggiungibile: riprova al prossimo giro */ }
    const finaleVisibile = stato.finale && stato.finale.fino > Date.now();
    if (attivo || finaleVisibile) stato.timerStato = setTimeout(cicloStato, attivo ? 2500 : 1500);
    else stato.polling = false;
}

async function avviaScansione() {
    if (!stato.admin) return;
    const b = el('archivio-mn-scansiona');
    b.disabled = true;
    try {
        const d = await apiScrivi('POST', '/scansiona');
        stato.attesaScansione = true;
        stato.scansioneVista = true;       // la risposta dice già che è partita
        disegnaBanner(d);
    } catch (e) {
        mostraFinale(`<i class="fa-solid fa-triangle-exclamation"></i> ${esc(e.message)}`);
    } finally {
        b.disabled = false;
    }
    avviaPolling();
}

// ---------------------------------------------------------------- caricamento (solo admin)
// Tutte le cartelle dell'archivio, in ordine ad albero, per la scelta della destinazione
async function elencoCartelle() {
    const esplora = async (path, livello) => {
        const r = await apiElenco(path);
        const sotto = await Promise.all(r.cartelle.map((c) => (livello < 5 ? esplora(c.path, livello + 1).catch(() => []) : [])));
        return r.cartelle.flatMap((c, k) => [{ path: c.path, nome: c.nome, livello }, ...sotto[k]]);
    };
    const figli = await esplora(RADICE, 1);
    return [{ path: RADICE, nome: 'Archivio (cartella principale)', livello: 0 }, ...figli];
}

async function riempiSelectCartelle(sel, selezionata) {
    sel.innerHTML = `<option value="">Carico le cartelle…</option>`;
    const cartelle = await elencoCartelle();
    // la radice nel menu vale "/" (il valore vuoto resta per "Carico le cartelle…")
    sel.innerHTML = cartelle.map((c) => `<option value="${esc(c.path || '/')}">${'  '.repeat(c.livello)}${c.livello ? '↳ ' : ''}${esc(c.nome)}</option>`).join('');
    const voluta = selezionata || '/';
    sel.value = cartelle.some((c) => (c.path || '/') === voluta) ? voluta : '/';
}

function mostraErroreUpload(msg) {
    const e = el('arc-errore');
    if (!e) return;
    e.textContent = msg || '';
    e.style.display = msg ? 'block' : 'none';
}

function impostaTipo(tipo) {
    document.querySelectorAll('#modal-archivio-upload .arc-tipo button').forEach((b) => b.classList.toggle('attivo', b.dataset.tipo === tipo));
    el('arc-blocco-generico').style.display = tipo === 'generico' ? '' : 'none';
    el('arc-blocco-turni').style.display = tipo === 'turni' ? '' : 'none';
    el('arc-modal-tipo').value = tipo;
}

function chiudiUpload() {
    if (stato.uploadAttivo) { try { stato.uploadAttivo.abort(); } catch (e) { /* già finito */ } stato.uploadAttivo = null; }
    stato.pollJob = null;
    el('modal-archivio-upload').style.display = 'none';
}

async function apriUpload() {
    if (!stato.admin) return;
    const modal = el('modal-archivio-upload');
    if (!modal) return;

    // stato iniziale della finestra
    el('arc-file').value = '';
    el('arc-file-nome').textContent = 'Scegli un file…';
    el('arc-nome').value = '';
    el('arc-nota').value = '';
    mostraErroreUpload('');
    el('arc-form').style.display = '';
    el('arc-progresso').style.display = 'none';
    el('arc-invia').disabled = false;
    impostaTipo('generico');
    modal.style.display = 'flex';

    // cartelle: si parte da quella aperta
    const sel = el('arc-cartella');
    el('arc-nc-box').style.display = 'none';
    el('arc-nc-nome').value = '';
    try {
        await riempiSelectCartelle(sel, stato.path);
    } catch (e) {
        sel.innerHTML = `<option value="/">Archivio (cartella principale)</option>`;
        mostraErroreUpload('Elenco cartelle non disponibile: ' + e.message);
    }
}

function collegaUpload() {
    const modal = el('modal-archivio-upload');
    if (!modal || modal.dataset.pronto) return;
    modal.dataset.pronto = '1';

    modal.addEventListener('click', (ev) => { if (ev.target === modal && el('arc-progresso').style.display === 'none') chiudiUpload(); });
    el('arc-x').onclick = () => chiudiUpload();
    el('arc-annulla').onclick = () => chiudiUpload();
    document.querySelectorAll('#modal-archivio-upload .arc-tipo button').forEach((b) => { b.onclick = () => impostaTipo(b.dataset.tipo); });

    el('arc-file').onchange = () => {
        const f = el('arc-file').files[0];
        el('arc-file-nome').textContent = f ? f.name : 'Scegli un file…';
        if (f && !el('arc-nome').value.trim()) el('arc-nome').value = f.name.replace(/\.[^.]+$/, '');
    };
    el('arc-invia').onclick = inviaUpload;

    // nuova cartella direttamente dalla finestra di caricamento: viene creata dentro quella scelta e poi selezionata
    el('arc-nc-link').onclick = (ev) => { ev.preventDefault(); const b = el('arc-nc-box'); b.style.display = b.style.display === 'none' ? 'flex' : 'none'; if (b.style.display === 'flex') el('arc-nc-nome').focus(); };
    el('arc-nc-crea').onclick = async () => {
        const nome = el('arc-nc-nome').value.trim();
        if (!nome) return mostraErroreUpload('Scrivi il nome della nuova cartella.');
        el('arc-nc-crea').disabled = true;
        try {
            const r = await apiScrivi('POST', '/cartelle', { path: el('arc-cartella').value || RADICE, nome });
            await riempiSelectCartelle(el('arc-cartella'), r.voce.path);
            el('arc-nc-box').style.display = 'none';
            el('arc-nc-nome').value = '';
            mostraErroreUpload('');
            aggiorna();
        } catch (e) {
            mostraErroreUpload(e.message);
        } finally {
            el('arc-nc-crea').disabled = false;
        }
    };
}

function mostraProgresso(percentuale, messaggio, { errore = false, fine = false, etichettaBottone } = {}) {
    el('arc-form').style.display = 'none';
    el('arc-progresso').style.display = '';
    el('arc-barra').style.width = Math.max(0, Math.min(100, percentuale)) + '%';
    el('arc-barra').style.background = errore ? 'var(--danger, #dc3545)' : (fine ? 'var(--success, #28a745)' : 'var(--primary, #00529b)');
    el('arc-msg').innerHTML = messaggio;
    el('arc-fine').textContent = etichettaBottone || 'Annulla';
}

async function inviaUpload() {
    if (!stato.admin) return;
    const file = el('arc-file').files[0];
    const tipo = el('arc-modal-tipo').value;
    const nome = el('arc-nome').value.trim();
    if (!file) return mostraErroreUpload('Scegli il file da caricare.');
    if (!nome) return mostraErroreUpload('Scrivi il nome del documento.');
    if (tipo === 'turni' && !/\.pdf$/i.test(file.name)) return mostraErroreUpload('Il libro turni deve essere un PDF.');
    mostraErroreUpload('');

    const ext = (/\.[^.]+$/.exec(file.name) || ['.pdf'])[0];
    const q = new URLSearchParams({ cartella: el('arc-cartella').value || RADICE, nome: nome + ext, tipo });
    if (tipo === 'generico' && el('arc-nota').value.trim()) q.set('nota', el('arc-nota').value.trim());
    const token = await tokenUtente();

    mostraProgresso(0, 'Caricamento in corso…');
    el('arc-fine').onclick = () => chiudiUpload();     // durante l'invio interrompe il caricamento

    const xhr = new XMLHttpRequest();
    stato.uploadAttivo = xhr;
    xhr.open('POST', `${API}/upload?${q.toString()}`);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const p = Math.round((ev.loaded / ev.total) * 100);
        mostraProgresso(p, `Caricamento in corso… ${p}%`);
    };
    xhr.onerror = () => { stato.uploadAttivo = null; erroreUpload('Server non raggiungibile. Riprova.'); };
    xhr.onabort = () => { stato.uploadAttivo = null; };
    xhr.onload = () => {
        stato.uploadAttivo = null;
        let r = {};
        try { r = JSON.parse(xhr.responseText); } catch (e) { /* risposta non JSON */ }
        if (xhr.status >= 400) return erroreUpload(r.error || `Errore ${xhr.status}`);
        azzeraRicerca();
        apriCartella(r.voce && r.voce.path ? genitoreDi(r.voce.path) : stato.path, true);   // il file compare subito nell'elenco
        const ok = '<i class="fa-solid fa-circle-check" style="color:var(--success, #28a745);"></i> ';
        mostraProgresso(100, tipo === 'turni'
            ? `${ok}Libro caricato. L\'analisi parte da sola (se ce ne sono altre va in coda): servizio e validità vengono letti dal libro e li vedi nell\'elenco.`
            : `${ok}Documento caricato.`, { fine: true, etichettaBottone: 'Chiudi' });
        el('arc-fine').onclick = () => chiudiUpload();
        if (tipo === 'turni') avviaPolling();
    };
    xhr.send(file);
}

function erroreUpload(msg) {
    el('arc-progresso').style.display = 'none';
    el('arc-form').style.display = '';
    mostraErroreUpload(msg);
}

// ---------------------------------------------------------------- selezione multipla (solo admin)
// In modalità selezione il tocco su una riga la sceglie (le cartelle si aprono con la freccia a destra).
// La scelta resta anche cambiando cartella. Dalla barra in basso: elimina, oppure rifai l'analisi dei libri turni.
const datiSelezione = (x, eCartella) => (eCartella
    ? { path: x.path, nome: x.nome, tipo: 'cartella' }
    : { path: x.path, nome: x.nome, tipo: 'file', turni: x.categoria === 'turni' && x.estensione === '.pdf' });

function commutaSelezione(row, voce) {
    const on = !stato.scelti.has(voce.path);
    if (on) stato.scelti.set(voce.path, voce); else stato.scelti.delete(voce.path);
    row.classList.toggle('scelta', on);
    const c = row.querySelector('.arc-casella');
    if (c) c.classList.toggle('on', on);
    aggiornaBarraSelezione();
}

function sincronizzaRighe() {
    document.querySelectorAll('#archivio-content-area .arc-card[data-path]').forEach((row) => {
        const on = stato.scelti.has(row.dataset.path);
        row.classList.toggle('scelta', on);
        const c = row.querySelector('.arc-casella');
        if (c) c.classList.toggle('on', on);
    });
}

function aggiornaBarraSelezione() {
    const bar = el('archivio-sel-bar');
    if (!bar) return;
    bar.style.display = stato.selezione && stato.admin ? 'flex' : 'none';
    const n = stato.scelti.size;
    el('archivio-sel-n').textContent = n === 0 ? 'Tocca per selezionare' : n === 1 ? '1 selezionato' : `${n} selezionati`;
    el('archivio-sel-analisi').disabled = n === 0 || stato.operazione;
    el('archivio-sel-elimina').disabled = n === 0 || stato.operazione;
    el('archivio-sel-tutti').disabled = stato.operazione;
    const tutti = stato.visibili.length > 0 && stato.visibili.every((v) => stato.scelti.has(v.path));
    el('archivio-sel-tutti').title = tutti ? 'Deseleziona tutto' : 'Seleziona tutto';
    el('archivio-sel-tutti').firstElementChild.className = 'fa-solid ' + (tutti ? 'fa-square-minus' : 'fa-square-check');
}

function entraSelezione() {
    if (!stato.admin) return;
    stato.selezione = true;
    stato.scelti.clear();
    aggiornaBarraSelezione();
    aggiorna();                         // ridisegna le righe con le caselle
}

function esciSelezione() {
    stato.selezione = false;
    stato.scelti.clear();
    aggiornaBarraSelezione();
    if (stato.caricato) aggiorna();
}

function selezionaTutti() {
    const tutti = stato.visibili.length > 0 && stato.visibili.every((v) => stato.scelti.has(v.path));
    stato.visibili.forEach((v) => { if (tutti) stato.scelti.delete(v.path); else stato.scelti.set(v.path, v); });
    sincronizzaRighe();
    aggiornaBarraSelezione();
}

function collegaSelezione() {
    const bar = el('archivio-sel-bar');
    if (!bar || bar.dataset.pronto) return;
    bar.dataset.pronto = '1';
    el('archivio-sel-tutti').onclick = selezionaTutti;
    el('archivio-sel-fine').onclick = () => { if (!stato.operazione) esciSelezione(); };
    el('archivio-sel-elimina').onclick = eliminaSelezionati;
    el('archivio-sel-analisi').onclick = rifaiAnalisiSelezionati;
}

// Se è scelta una cartella e anche qualcosa al suo interno, basta la cartella
function radiciSelezione() {
    const voci = [...stato.scelti.values()];
    const cartelle = voci.filter((v) => v.tipo === 'cartella').map((v) => v.path);
    return voci.filter((v) => !cartelle.some((c) => v.path.startsWith(c + '/')));
}

function togliDallaSelezione(path) {
    [...stato.scelti.keys()].forEach((k) => { if (k === path || k.startsWith(path + '/')) stato.scelti.delete(k); });
}

// Messaggio nel banner mentre l'operazione va avanti (poi lo sostituisce il riepilogo finale)
function progressoOperazione(html) {
    stato.finale = { html: `<i class="fa-solid fa-circle-notch fa-spin"></i> ${html}`, fino: Date.now() + 120000 };
    disegnaBanner();
    avviaPolling();
}

const elencoErrori = (errori) => (errori.length ? `<br><span class="arc-sub err">${errori.slice(0, 3).map(esc).join('<br>')}${errori.length > 3 ? `<br>…e altri ${errori.length - 3}` : ''}</span>` : '');
const OK_ICO = '<i class="fa-solid fa-circle-check" style="color:var(--success, #28a745);"></i> ';
const KO_ICO = '<i class="fa-solid fa-triangle-exclamation"></i> ';

async function eliminaSelezionati() {
    if (!stato.admin || stato.operazione) return;
    const voci = radiciSelezione();
    if (!voci.length) return;
    const nCart = voci.filter((v) => v.tipo === 'cartella').length, nFile = voci.length - nCart;
    const parti = [];
    if (nFile) parti.push(nFile === 1 ? '1 file' : `${nFile} file`);
    if (nCart) parti.push(nCart === 1 ? '1 cartella' : `${nCart} cartelle`);
    let msg = voci.length === 1 ? `Eliminare «${voci[0].nome}»?` : `Eliminare ${parti.join(' e ')}?`;
    if (nCart) msg += `\nLe cartelle vengono eliminate con tutto il loro contenuto.`;
    if (nFile) msg += `\nSe un file ha un'analisi allegata, viene eliminata anche quella.`;
    if (!confirm(msg)) return;

    stato.operazione = true;
    aggiornaBarraSelezione();
    let ok = 0;
    const errori = [];
    for (const [i, v] of voci.entries()) {
        progressoOperazione(`Eliminazione: <b>${i + 1} di ${voci.length}</b>`);
        try {
            await apiScrivi('DELETE', `/voce?path=${encodeURIComponent(v.path)}${v.tipo === 'cartella' ? '&ricorsivo=1' : ''}`);
            togliDallaSelezione(v.path);
            ok++;
        } catch (e) {
            errori.push(`${v.nome}: ${e.message}`);
        }
    }
    stato.operazione = false;
    mostraFinale((ok ? `${OK_ICO}${ok === 1 ? 'Eliminato 1 elemento' : `Eliminati ${ok} elementi`}.` : `${KO_ICO}Nessun elemento eliminato.`) + elencoErrori(errori));
    if (errori.length) { aggiornaBarraSelezione(); aggiorna(); } else esciSelezione();   // se qualcosa è fallito restano scelti gli elementi rimasti
}

// Tra gli elementi scelti trova i libri turni (PDF): quelli scelti direttamente e quelli dentro le cartelle scelte
async function raccogliLibriTurni(voci) {
    const trovati = new Map();
    let saltati = 0;
    const visita = async (path, livello) => {
        const d = await apiElenco(path);
        d.file.forEach((f) => { if (f.categoria === 'turni' && f.estensione === '.pdf') trovati.set(f.path, f.nome); });
        if (livello < 8) for (const c of d.cartelle) await visita(c.path, livello + 1);
    };
    for (const v of voci) {
        if (v.tipo === 'cartella') await visita(v.path, 0);
        else if (v.turni) trovati.set(v.path, v.nome);
        else saltati++;
    }
    return { libri: [...trovati].map(([path, nome]) => ({ path, nome })), saltati };
}

async function rifaiAnalisiSelezionati() {
    if (!stato.admin || stato.operazione) return;
    const voci = radiciSelezione();
    if (!voci.length) return;
    stato.operazione = true;
    aggiornaBarraSelezione();
    progressoOperazione('Cerco i libri turni…');

    let libri, saltati;
    try {
        ({ libri, saltati } = await raccogliLibriTurni(voci));
    } catch (e) {
        stato.operazione = false;
        aggiornaBarraSelezione();
        return mostraFinale(`${KO_ICO}Impossibile leggere le cartelle: ${esc(e.message)}`);
    }
    if (!libri.length) {
        stato.operazione = false;
        aggiornaBarraSelezione();
        return mostraFinale(`${KO_ICO}Tra gli elementi scelti non ci sono libri turni da analizzare.`);
    }
    if (!confirm(`Rifare l'analisi di ${libri.length === 1 ? '«' + libri[0].nome + '»' : libri.length + ' libri turni'}?\nVanno in coda e il server li analizza uno alla volta.`)) {
        stato.operazione = false;
        stato.finale = null;
        disegnaBanner();
        return aggiornaBarraSelezione();
    }

    let avviati = 0, giaInCoda = 0;
    const errori = [];
    for (const [i, l] of libri.entries()) {
        progressoOperazione(`Avvio analisi: <b>${i + 1} di ${libri.length}</b>`);
        try {
            await apiScrivi('POST', `/analizza?path=${encodeURIComponent(l.path)}`);
            avviati++;
        } catch (e) {
            if (e.status === 409) giaInCoda++;         // già in coda o in corso
            else errori.push(`${l.nome}: ${e.message}`);
        }
    }
    stato.operazione = false;
    let html = avviati ? `${OK_ICO}Analisi in coda per ${avviati === 1 ? '1 libro' : avviati + ' libri'}.` : `${KO_ICO}Nessuna analisi avviata.`;
    const note = [];
    if (giaInCoda) note.push(giaInCoda === 1 ? '1 era già in coda o in corso' : `${giaInCoda} erano già in coda o in corso`);
    if (saltati) note.push(saltati === 1 ? '1 elemento scelto non è un libro turni' : `${saltati} elementi scelti non sono libri turni`);
    if (note.length) html += `<br><span class="arc-sub">${note.join(' · ')}.</span>`;
    mostraFinale(html + elencoErrori(errori));
    if (errori.length) { aggiornaBarraSelezione(); aggiorna(); } else esciSelezione();
    avviaPolling();
}

// ---------------------------------------------------------------- gestione (solo admin)
function mostraErroreGestione(msg) {
    const e = el('arg-errore');
    e.textContent = msg || '';
    e.style.display = msg ? 'block' : 'none';
}

function chiudiGestione() {
    el('modal-archivio-gestione').style.display = 'none';
    stato.gestito = null;
}

function aggiornaBloccoTurniGestione() {
    const g = stato.gestito;
    if (!g || g.modo !== 'file') return;
    el('arg-blocco-turni').style.display = g.voce.categoria === 'turni' ? '' : 'none';
}

function collegaGestione() {
    const m = el('modal-archivio-gestione');
    if (!m || m.dataset.pronto) return;
    m.dataset.pronto = '1';
    m.addEventListener('click', (ev) => { if (ev.target === m) chiudiGestione(); });
    el('arg-x').onclick = chiudiGestione;
    el('arg-annulla').onclick = chiudiGestione;
    el('arg-analizza').onchange = aggiornaBloccoTurniGestione;
    el('arg-salva').onclick = salvaGestione;
    el('arg-elimina').onclick = eliminaGestito;
}

// modo: 'file' | 'cartella' | 'nuova-cartella' (in quest'ultimo caso voce.path è la cartella dove crearla)
async function apriGestione(modo, voce) {
    if (!stato.admin) return;
    collegaGestione();
    stato.gestito = { modo, voce };
    mostraErroreGestione('');
    const nuova = modo === 'nuova-cartella', eFile = modo === 'file';
    el('arg-icona').className = 'fa-solid ' + (nuova ? 'fa-folder-plus' : eFile ? 'fa-pen' : 'fa-folder');
    el('arg-titolo').textContent = nuova ? 'Nuova cartella' : eFile ? 'Modifica documento' : 'Modifica cartella';
    el('arg-hint').style.display = nuova ? '' : 'none';
    if (nuova) el('arg-hint').textContent = `Verrà creata in «${percorsoLeggibile(voce.path)}».`;
    el('arg-nome').value = nuova ? '' : (eFile ? voce.nome.replace(/\.[^.]+$/, '') : voce.nome);
    el('arg-elimina').style.display = nuova ? 'none' : '';
    el('arg-salva').textContent = nuova ? 'Crea' : 'Salva';
    el('arg-blocco-file').style.display = eFile ? '' : 'none';
    el('modal-archivio-gestione').style.display = 'flex';

    if (eFile) {
        el('arg-nota').value = voce.nota || '';
        el('arg-servizio').value = voce.servizio || '';
        el('arg-valido').value = voce.valido_dal || '';
        el('arg-fino').value = voce.valido_al || '';
        const turni = voce.categoria === 'turni';
        const manuale = voce.servizio_manuale || voce.validita_manuale;
        el('arg-hint-turni').textContent = (manuale ? 'Valori corretti a mano. ' : 'Valori letti dal libro. ')
            + 'Svuotando un campo si torna a quello letto dal libro.'
            + (voce.avvisi_periodo && voce.avvisi_periodo.length ? ` Attenzione: ${voce.avvisi_periodo.join('; ')}.` : '');
        el('arg-blocco-analisi').style.display = voce.estensione === '.pdf' ? '' : 'none';
        el('arg-analizza').checked = false;
        el('arg-analizza-txt').textContent = turni ? 'Rilancia l\'analisi dopo il salvataggio' : 'Analizza come libro turni (servizio e validità li legge dal libro)';
        aggiornaBloccoTurniGestione();
        const sel = el('arg-sposta');
        try { await riempiSelectCartelle(sel, genitoreDi(voce.path)); }
        catch (e) { sel.innerHTML = `<option value="${esc(genitoreDi(voce.path) || '/')}">${esc(percorsoLeggibile(genitoreDi(voce.path)))}</option>`; }
    }
    if (nuova) el('arg-nome').focus();
}

async function salvaGestione() {
    const g = stato.gestito;
    if (!g || !stato.admin) return;
    const nome = el('arg-nome').value.trim();
    if (!nome) return mostraErroreGestione('Scrivi il nome.');
    const btn = el('arg-salva');
    btn.disabled = true;
    mostraErroreGestione('');
    try {
        if (g.modo === 'nuova-cartella') {
            await apiScrivi('POST', '/cartelle', { path: g.voce.path, nome });
        } else if (g.modo === 'cartella') {
            if (nome !== g.voce.nome) await apiScrivi('POST', '/modifica', { path: g.voce.path, nome });
        } else {
            await salvaFile(g.voce, nome);
        }
        chiudiGestione();
        aggiorna();
    } catch (e) {
        mostraErroreGestione(e.message);
        aggiorna();     // un passaggio precedente potrebbe essere già andato a buon fine
    } finally {
        btn.disabled = false;
    }
}

// Salva i campi del file passo per passo: dati e nome, poi spostamento, poi eventuale nuova analisi
async function salvaFile(voce, nome) {
    const turni = voce.categoria === 'turni';
    const analizza = el('arg-analizza').checked && voce.estensione === '.pdf';

    const corpo = { path: voce.path };
    if (nome + voce.estensione !== voce.nome) corpo.nome = nome + voce.estensione;
    if (el('arg-nota').value.trim() !== (voce.nota || '')) corpo.nota = el('arg-nota').value.trim();
    if (turni) {
        // campo vuoto = torna a quello letto dal libro
        const servizio = el('arg-servizio').value.trim(), dal = el('arg-valido').value, al = el('arg-fino').value;
        if (servizio !== (voce.servizio || '')) corpo.servizio = servizio;
        if (dal !== (voce.valido_dal || '') || al !== (voce.valido_al || '')) { corpo.valido_dal = dal; corpo.valido_al = al; }
    }

    let corrente = voce.path;
    if (Object.keys(corpo).length > 1) corrente = (await apiScrivi('POST', '/modifica', corpo)).voce.path;

    const dest = el('arg-sposta').value;
    if (dest && dest !== (genitoreDi(corrente) || '/')) corrente = (await apiScrivi('POST', '/sposta', { path: corrente, destinazione: dest })).voce.path;

    if (analizza) {
        await apiScrivi('POST', `/analizza?path=${encodeURIComponent(corrente)}`);
        avviaPolling();
    }
}

async function eliminaGestito() {
    const g = stato.gestito;
    if (!g || !stato.admin || g.modo === 'nuova-cartella') return;
    const v = g.voce;
    let ricorsivo = false;
    if (g.modo === 'file') {
        if (!confirm(`Eliminare «${v.nome}»?` + (v.analisi ? '\nVerrà eliminata anche l\'analisi allegata.' : ''))) return;
    } else {
        const n = (v.cartelle || 0) + (v.file || 0);
        if (n > 0) {
            if (!confirm(`La cartella «${v.nome}» contiene ${n} ${n === 1 ? 'elemento' : 'elementi'}.\nEliminare la cartella e tutto il suo contenuto?`)) return;
            ricorsivo = true;
        } else if (!confirm(`Eliminare la cartella «${v.nome}»?`)) return;
    }
    const btn = el('arg-elimina');
    btn.disabled = true;
    try {
        await apiScrivi('DELETE', `/voce?path=${encodeURIComponent(v.path)}${ricorsivo ? '&ricorsivo=1' : ''}`);
        chiudiGestione();
        aggiorna();
    } catch (e) {
        mostraErroreGestione(e.message);
    } finally {
        btn.disabled = false;
    }
}
