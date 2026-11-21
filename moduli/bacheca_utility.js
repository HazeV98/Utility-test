// ==========================================================================================
// BACHECA UTILITY (front end) - file unico: interfaccia (ex ui_bacheca_utility.js) + logica.
// I dati ora arrivano dal backend (bacheca.js sul mini PC) invece che da Firestore.
// Firebase resta per: login (token inviato al server) e registrazione del token delle notifiche.
// Nell'app: import { initUIBachecaUtility, avviaMotoreBachecaUtility } from './bacheca_utility.js';
// ==========================================================================================
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";

// ---------- Configurazione ----------
const API_ORIGIN = 'https://utilitybe.homeserver.foo';
const API_BACHECA = API_ORIGIN + '/api/bacheca';
const MAX_ALLEGATI = 6;
const MAX_MB_ALLEGATO = 100;
const LATO_MAX_FOTO = 1600; // le foto vengono ridimensionate prima dell'invio (risparmia spazio e dati)

let ddsDatesArray = [];
let allegatiScelti = [];
let permessi = { admin: false }; // deciso dal server in base al ruolo nel profilo
const cacheAvvisi = new Map();

// ---------- Utilita' ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const linkSicuro = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
const fmtDataOra = (ts) => { const d = new Date(ts); return d.toLocaleDateString('it-IT') + ' alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
const fmtDataOraBreve = (ts) => { const d = new Date(ts); return d.toLocaleDateString('it-IT') + ' - ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

async function tokenUtente() {
    const u = window.bachecaContext && window.bachecaContext.auth.currentUser;
    if (!u) throw new Error('Non autenticato');
    return u.getIdToken();
}

async function api(percorso, { metodo = 'GET', corpo = null } = {}) {
    const res = await fetch(API_BACHECA + percorso, {
        method: metodo,
        headers: { 'Authorization': 'Bearer ' + await tokenUtente(), ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
        body: corpo ? JSON.stringify(corpo) : undefined
    });
    let dati = null;
    try { dati = await res.json(); } catch (_) { /* risposta senza corpo */ }
    if (!res.ok) throw new Error((dati && dati.errore) || ('Errore ' + res.status));
    return dati;
}

// Invio con percentuale di avanzamento (utile per i video)
async function inviaAvviso(formData, onProgress) {
    const token = await tokenUtente();
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API_BACHECA);
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
export function initUIBachecaUtility() {
    if (!document.getElementById('bu-stili')) {
        const st = document.createElement('style');
        st.id = 'bu-stili';
        st.textContent = `
            .bu-card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
            .bu-card-head .msg-date { flex:1; min-width:0; margin:0; }
            .bu-azioni { display:flex; gap:6px; flex-shrink:0; }
            .bu-btn-icon { width:34px; height:34px; padding:0; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid var(--border-color); background:var(--surface); color:var(--text-muted); font-size:14px; cursor:pointer; }
            .bu-btn-icon:active { transform:scale(0.94); }
            .bu-btn-icon.bu-danger { color:var(--danger); border-color:var(--danger-border); }
            .bu-allegati { margin-top:14px; display:flex; flex-direction:column; gap:10px; }
            .bu-griglia-foto { display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:8px; }
            .bu-griglia-foto img { width:100%; height:130px; object-fit:cover; border-radius:10px; display:block; background:var(--surface-hover); }
            .bu-griglia-foto a:only-child { grid-column:1 / -1; }
            .bu-griglia-foto a:only-child img { height:auto; max-height:340px; }
            .bu-video { width:100%; max-height:340px; border-radius:10px; background:#000; }
            .bu-pdf { display:flex; align-items:center; gap:10px; padding:12px 14px; border:1px solid var(--border-color); border-radius:10px; background:var(--surface-hover); color:var(--text-main); text-decoration:none; }
            .bu-pdf i { color:var(--danger); font-size:20px; }
            .bu-pdf-nome { flex:1; min-width:0; font-weight:600; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .bu-pdf-size { font-size:12px; color:var(--text-muted); flex-shrink:0; }
            .bu-scelto { display:flex; align-items:center; gap:10px; padding:8px 10px; border:1px solid var(--border-color); border-radius:10px; background:var(--surface-hover); margin-bottom:8px; }
            .bu-scelto-nome { flex:1; min-width:0; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .bu-scelto-size { font-size:12px; color:var(--text-muted); flex-shrink:0; }
        `;
        document.head.appendChild(st);
    }

    const uiHTML = `
    <div id="modal-bacheca-utility-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-bacheca-utility-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-bacheca-utility-main')"></i>

            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-bullhorn"></i> Bacheca Avvisi
            </h3>

            <div style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column;">
                <button id="btn-admin-add-bacheca" class="btn-action" style="display: none; margin-top: 0; margin-bottom: 16px;" onclick="window.apriModaleNuovoAvviso()"><i class="fa-solid fa-plus"></i> Pubblica Avviso</button>
                <div id="lista-messaggi"></div>
            </div>
        </div>
    </div>

    <div id="modal-nuovo-avviso" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-nuovo-avviso')" style="z-index: 7500;">
        <div class="modal-content">
            <i class="fa-solid fa-xmark close-modal" onclick="document.getElementById('modal-nuovo-avviso').style.display='none'"></i>
            <h3 style="margin-top: 0; margin-bottom: 24px; color: var(--text-main); display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-pen-to-square" style="color:var(--primary);"></i> Nuovo Avviso
            </h3>

            <label class="editor-label">Tipo di Annuncio:</label>
            <select id="pub-tipo" class="input-field" onchange="window.toggleCampiDDS()">
                <option value="normale">Messaggio Normale</option>
                <option value="dds">Avviso DDS</option>
            </select>

            <div id="area-dds" style="display: none; background: var(--danger-light); padding: 20px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid var(--danger-border);">
                <label class="editor-label" style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Titolo DDS:</label>
                <input type="text" id="pub-titolo-dds" class="input-field" placeholder="Es. Variante Linea 1" style="background:var(--surface); border-color:var(--danger-border);">

                <label class="editor-label" style="color: var(--danger); margin-top: 16px;"><i class="fa-regular fa-calendar-check"></i> Date di Validità:</label>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <input type="text" id="pub-date-dds-display" class="input-field" placeholder="Nessuna data selezionata" readonly style="margin-bottom: 0; cursor: pointer; background:var(--surface); border-color:var(--danger-border);" onclick="window.apriDatePickerAvviso()">
                    <button class="btn-action" style="margin-top: 0; width: auto; padding: 14px 20px; background:var(--danger); box-shadow:none;" onclick="window.apriDatePickerAvviso()"><i class="fa-regular fa-calendar"></i></button>
                </div>
            </div>

            <label class="editor-label">Destinatari (Target):</label>
            <select id="pub-target" class="input-field" onchange="window.toggleAreaTarget()">
                <option value="tutti">Visibile a Tutti</option>
                <option value="selezione">Solo Rotazioni Selezionate...</option>
            </select>

            <div id="area-target" style="display: none; margin-bottom: 20px; max-height: 250px; overflow-y: auto; background: var(--surface-hover); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div class="checkbox-grid">
                    <label><input type="checkbox" class="target-check" value="rot_fnove"> Rot F.Nove</label>
                    <label><input type="checkbox" class="target-check" value="spez_fnove"> Spez F.Nove</label>
                    <label><input type="checkbox" class="target-check" value="tc_spez_fnove"> TC Spez F.Nove</label>
                    <label><input type="checkbox" class="target-check" value="rot_proma"> Rot P.Roma</label>
                    <label><input type="checkbox" class="target-check" value="spez_proma"> Spez P.Roma</label>
                    <label><input type="checkbox" class="target-check" value="ris_proma"> Ris P.Roma</label>
                    <label><input type="checkbox" class="target-check" value="rot_szaccaria"> Rot S.Zac</label>
                    <label><input type="checkbox" class="target-check" value="spez_szaccaria"> Spez S.Zac</label>
                    <label><input type="checkbox" class="target-check" value="tc_spez_szaccaria"> TC Spez S.Zac</label>
                    <label><input type="checkbox" class="target-check" value="rot_lido"> Rot Lido</label>
                    <label><input type="checkbox" class="target-check" value="spez_lido"> Spez Lido</label>
                    <label><input type="checkbox" class="target-check" value="tc_spez_lido"> TC Spez Lido</label>
                    <label><input type="checkbox" class="target-check" value="rot_linea12"> Rot Linea 12</label>
                    <label><input type="checkbox" class="target-check" value="rot_linea13"> Rot Linea 13</label>
                    <label><input type="checkbox" class="target-check" value="rot_linea14"> Rot Linea 14</label>
                    <label><input type="checkbox" class="target-check" value="rot_linea14_mb"> Rot 14 M/B</label>
                    <label><input type="checkbox" class="target-check" value="rot_17sn"> Rot 17 SN</label>
                    <label><input type="checkbox" class="target-check" value="tc_rot_17sn"> TC Rot 17 SN</label>
                    <label><input type="checkbox" class="target-check" value="rot_17tr"> Rot 17 TR</label>
                    <label><input type="checkbox" class="target-check" value="tc_rot_17tr"> TC Rot 17 TR</label>
                    <label><input type="checkbox" class="target-check" value="disp_indet"> Disponibili</label>
                </div>
            </div>

            <label style="font-size: 15px; font-weight: 600; color: var(--primary); display: flex; align-items: center; gap: 10px; margin-top: 24px; margin-bottom: 16px; cursor:pointer;">
                <input type="checkbox" id="pub-has-sondaggio" onchange="window.toggleSondaggio()" style="width:18px; height:18px; accent-color:var(--primary);"> <i class="fa-solid fa-chart-pie"></i> Aggiungi Sondaggio
            </label>

            <div id="area-sondaggio" style="display: none; background: var(--surface-hover); padding: 20px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px dashed var(--primary);">
                <label style="font-size: 14px; color: var(--text-main); display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-weight: 500; cursor:pointer;">
                    <input type="checkbox" id="pub-multi-risposta" style="width:18px; height:18px; accent-color:var(--primary);"> Consenti risposte multiple
                </label>

                <label class="editor-label" style="color: var(--primary);">Opzioni di voto (minimo 2):</label>
                <div id="lista-opzioni-sondaggio" style="margin-top: 10px;"></div>
                <button class="btn-outline" style="width: 100%; margin-top: 8px; justify-content:center;" onclick="window.aggiungiOpzioneSondaggio()"><i class="fa-solid fa-plus"></i> Aggiungi un'opzione</button>
            </div>

            <label class="editor-label">Data di Scadenza (Auto-Elimina):</label>
            <input type="date" id="pub-scadenza" class="input-field">

            <label class="editor-label">Testo del messaggio:</label>
            <textarea id="msgTesto" class="input-field" rows="4" placeholder="Scrivi qui la comunicazione..." style="resize:vertical;"></textarea>

            <label class="editor-label">Link Esterno (Opzionale):</label>
            <input type="url" id="msgLink" class="input-field" placeholder="es. https://www.google.it o link Drive" style="text-transform:none;">

            <label class="editor-label">Allegati (foto, video, PDF):</label>
            <input type="file" id="input-allegati" multiple accept="image/*,video/*,application/pdf" style="display:none;" onchange="window.aggiungiAllegati(this)">
            <button type="button" class="btn-outline" style="width: 100%; justify-content:center; margin-bottom: 10px;" onclick="document.getElementById('input-allegati').click()"><i class="fa-solid fa-paperclip"></i> Aggiungi allegati</button>
            <div id="lista-allegati-scelti" style="margin-bottom: 20px;"></div>

            <button id="btn-pubblica" class="btn-action" onclick="window.pubblicaMessaggio()"><i class="fa-regular fa-paper-plane"></i> Pubblica Avviso</button>
        </div>
    </div>

    <div id="modal-date-picker-avviso" class="modal-overlay" style="z-index: 8000;">
        <div class="modal-content" style="max-width: 320px; text-align: center;">
            <h3 style="margin-top: 0; color: var(--primary); display:flex; justify-content:center; align-items:center; gap:8px;"><i class="fa-regular fa-calendar-days"></i> Scegli Date</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Seleziona una data alla volta e clicca il tasto '+'</p>

            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <input type="date" id="input-date-single" class="input-field" style="margin-bottom: 0;">
                <button class="btn-action" style="width: 54px; margin-top: 0; padding: 14px;" onclick="window.aggiungiDataSingola()"><i class="fa-solid fa-plus"></i></button>
            </div>

            <div id="date-tags-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; justify-content: center; min-height: 40px;"></div>

            <button class="btn-action btn-success" onclick="window.chiudiDatePickerAvviso()"><i class="fa-solid fa-check"></i> Fatto</button>
        </div>
    </div>

    <div id="modal-letture" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-letture')" style="z-index: 8000;">
        <div class="modal-content" style="max-width: 380px;">
            <i class="fa-solid fa-xmark close-modal" onclick="document.getElementById('modal-letture').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--primary); display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-eye"></i> Visualizzazioni</h3>
            <div id="lista-letture" style="margin-top: 20px; max-height: 60vh; overflow-y: auto; padding-right:5px;">
                <div class="status-message"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>
            </div>
        </div>
    </div>

    <div id="modal-voti" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-voti')" style="z-index: 8000;">
        <div class="modal-content" style="max-width: 380px;">
            <i class="fa-solid fa-xmark close-modal" onclick="document.getElementById('modal-voti').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--primary); display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-chart-bar"></i> Dettaglio Voti</h3>
            <div id="lista-voti-dettaglio" style="margin-top: 20px; max-height: 60vh; overflow-y: auto; padding-right:5px;">
                <div class="status-message"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================================================================
// AVVIO
// ==========================================================================================
export function avviaMotoreBachecaUtility(appInstance, dbInstance, authInstance, isPrivileged, fullName) {
    window.bachecaContext = {
        app: appInstance,
        db: dbInstance,
        auth: authInstance,
        isPrivilegedUser: isPrivileged,
        currentUserFullName: fullName
    };

    const user = authInstance.currentUser;
    if (!user) return;

    if (isPrivileged) {
        const btnAdd = document.getElementById('btn-admin-add-bacheca');
        if (btnAdd) btnAdd.style.display = 'block';
    }

    // --- Rimozione avviso dal menù ---
    const badgeAvvisoMenu = document.getElementById('ID_DEL_TUO_BADGE_MENU');
    if (badgeAvvisoMenu) {
        badgeAvvisoMenu.style.display = 'none';
    }
    window.dispatchEvent(new Event('bacheca-utility-letta'));

    window.caricaBacheca();

    document.getElementById('modal-bacheca-utility-main').style.display = 'flex';
}

// ==========================================================================================
// NOTIFICHE (la registrazione del token resta com'e': il token si salva in Firestore, l'invio lo fa il backend)
// ==========================================================================================
window.attivaNotificheBacheca = async () => {
    const ctx = window.bachecaContext;
    if (!ctx || !ctx.auth.currentUser) return;

    const btn = document.getElementById('btn-attiva-notifiche-bacheca');
    if (!btn) return;

    const testoOriginale = btn.innerHTML;

    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Attivazione in corso...";
    btn.disabled = true;
    btn.style.pointerEvents = 'none';

    try {
        const messaging = getMessaging(ctx.app);
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const swPath = basePath + '/firebase-messaging-sw.js';
            const swRegistration = await navigator.serviceWorker.register(swPath);

            const token = await getToken(messaging, {
                vapidKey: 'BLex63nSSs-uyUZUIRzWPOQyznfTkHC8ZtNnInGArryQnYddSfIHjAH1IwfoopM9otZ4jl2NGL5vM4xtLHkqwyI',
                serviceWorkerRegistration: swRegistration
            });

            if (token) {
                const prefDefault = { bachecaturni: false, bachecautility: true, promemoria: true, rotazioni: false };
                await setDoc(doc(ctx.db, "utenti", ctx.auth.currentUser.uid), {
                    fcm_token: token,
                    notifiche_pref: prefDefault
                }, { merge: true });

                btn.style.display = 'none';
                alert("🔔 Notifiche attivate! Riceverai un avviso per ogni nuovo Annuncio o DDS.");
            } else {
                btn.innerHTML = testoOriginale;
                btn.disabled = false;
                btn.style.pointerEvents = 'auto';
                alert("Non è stato possibile ottenere il token per le notifiche.");
            }
        } else {
            btn.style.display = 'none';
            alert("Hai negato il permesso per le notifiche.");
        }
    } catch (error) {
        console.error("Errore attivazione notifiche:", error);
        btn.innerHTML = testoOriginale;
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        alert("Errore durante l'attivazione delle notifiche. Controlla la console.");
    }
};

// ==========================================================================================
// FORM NUOVO AVVISO
// ==========================================================================================
window.toggleCampiDDS = () => {
    const isDDS = document.getElementById('pub-tipo').value === 'dds';
    document.getElementById('area-dds').style.display = isDDS ? 'block' : 'none';
};

window.toggleAreaTarget = () => {
    const isSelezione = document.getElementById('pub-target').value === 'selezione';
    document.getElementById('area-target').style.display = isSelezione ? 'block' : 'none';
};

window.toggleSondaggio = () => {
    const area = document.getElementById('area-sondaggio');
    const isChecked = document.getElementById('pub-has-sondaggio').checked;
    area.style.display = isChecked ? 'block' : 'none';
    if (isChecked && document.getElementById('lista-opzioni-sondaggio').children.length === 0) {
        window.aggiungiOpzioneSondaggio("Sì");
        window.aggiungiOpzioneSondaggio("No");
    }
};

window.aggiungiOpzioneSondaggio = (valoreDefault = "") => {
    const div = document.createElement('input');
    div.type = 'text';
    div.className = 'input-field opzione-sondaggio';
    div.placeholder = 'Testo opzione (es. Sì, No, Forse)';
    div.style.marginBottom = '10px';
    div.style.textTransform = 'none';
    div.value = valoreDefault;
    document.getElementById('lista-opzioni-sondaggio').appendChild(div);
};

window.apriDatePickerAvviso = () => {
    document.getElementById('modal-date-picker-avviso').style.display = 'flex';
    window.aggiornaUI_DatePicker();
};

window.chiudiDatePickerAvviso = () => {
    document.getElementById('modal-date-picker-avviso').style.display = 'none';
    document.getElementById('pub-date-dds-display').value = ddsDatesArray.length === 0 ? "" : ddsDatesArray.join(", ");
};

window.aggiungiDataSingola = () => {
    const val = document.getElementById('input-date-single').value;
    if (!val) return;
    if (!ddsDatesArray.includes(val)) {
        ddsDatesArray.push(val);
        ddsDatesArray.sort();
        window.aggiornaUI_DatePicker();
    }
    document.getElementById('input-date-single').value = "";
};

window.rimuoviDataSingola = (dateStr) => {
    ddsDatesArray = ddsDatesArray.filter(d => d !== dateStr);
    window.aggiornaUI_DatePicker();
};

window.aggiornaUI_DatePicker = () => {
    const container = document.getElementById('date-tags-container');
    container.innerHTML = "";
    if (ddsDatesArray.length === 0) {
        container.innerHTML = `<span style="color:var(--text-muted); font-size: 13px;">Nessuna data aggiunta.</span>`;
    } else {
        ddsDatesArray.forEach(d => {
            container.innerHTML += `<div class="date-tag">${esc(d)} <span class="date-tag-remove" onclick="window.rimuoviDataSingola('${esc(d)}')"><i class="fa-solid fa-xmark"></i></span></div>`;
        });
    }
};

// ---------- Allegati nel form ----------
window.aggiungiAllegati = async (input) => {
    const files = Array.from(input.files || []);
    input.value = '';
    for (const f of files) {
        if (allegatiScelti.length >= MAX_ALLEGATI) { alert(`Massimo ${MAX_ALLEGATI} allegati per avviso.`); break; }
        const ammesso = f.type.startsWith('image/') || f.type.startsWith('video/') || f.type === 'application/pdf';
        if (!ammesso) { alert(`"${f.name}": formato non supportato (solo foto, video e PDF).`); continue; }
        const finale = await comprimiImmagine(f);
        if (finale.size > MAX_MB_ALLEGATO * 1048576) { alert(`"${f.name}" supera ${MAX_MB_ALLEGATO} MB.`); continue; }
        allegatiScelti.push(finale);
    }
    window.aggiornaUI_Allegati();
};

window.rimuoviAllegatoScelto = (i) => {
    allegatiScelti.splice(i, 1);
    window.aggiornaUI_Allegati();
};

window.aggiornaUI_Allegati = () => {
    const el = document.getElementById('lista-allegati-scelti');
    if (!el) return;
    el.innerHTML = allegatiScelti.map((f, i) => {
        const icona = f.type.startsWith('image/') ? 'fa-image' : f.type.startsWith('video/') ? 'fa-film' : 'fa-file-pdf';
        return `<div class="bu-scelto"><i class="fa-solid ${icona}" style="color:var(--primary);"></i><span class="bu-scelto-nome">${esc(f.name)}</span><span class="bu-scelto-size">${fmtSize(f.size)}</span><button type="button" class="bu-btn-icon bu-danger" style="width:30px; height:30px;" title="Rimuovi" aria-label="Rimuovi allegato" onclick="window.rimuoviAllegatoScelto(${i})"><i class="fa-solid fa-xmark"></i></button></div>`;
    }).join('');
};

window.apriModaleNuovoAvviso = () => {
    document.getElementById('msgTesto').value = "";
    document.getElementById('msgLink').value = "";
    document.getElementById('pub-titolo-dds').value = "";
    document.getElementById('pub-date-dds-display').value = "";
    document.getElementById('pub-scadenza').value = "";
    ddsDatesArray = [];
    allegatiScelti = [];
    window.aggiornaUI_Allegati();
    document.getElementById('pub-has-sondaggio').checked = false;
    document.getElementById('pub-multi-risposta').checked = false;
    document.getElementById('lista-opzioni-sondaggio').innerHTML = "";
    window.toggleSondaggio();
    document.getElementById('modal-nuovo-avviso').style.display = 'flex';
};

window.pubblicaMessaggio = async () => {
    const ctx = window.bachecaContext;
    if (!ctx || !ctx.auth.currentUser) return;
    const tipo = document.getElementById('pub-tipo').value;
    const testo = document.getElementById('msgTesto').value.trim();
    const link = document.getElementById('msgLink').value.trim();
    const scadenza = document.getElementById('pub-scadenza').value;
    const btn = document.getElementById('btn-pubblica');

    if (!testo) return alert("Inserisci il testo.");
    if (link && !linkSicuro(link)) return alert("Il link deve iniziare con http:// o https://");

    let arraySondaggio = [];
    let isMulti = false;
    if (document.getElementById('pub-has-sondaggio').checked) {
        isMulti = document.getElementById('pub-multi-risposta').checked;
        document.querySelectorAll('.opzione-sondaggio').forEach(inp => {
            if (inp.value.trim()) arraySondaggio.push(inp.value.trim());
        });
        if (arraySondaggio.length < 2) return alert("Inserisci almeno 2 opzioni per il sondaggio.");
    }

    let targetVal = "tutti";
    if (document.getElementById('pub-target').value === 'selezione') {
        targetVal = Array.from(document.querySelectorAll('.target-check:checked')).map(cb => cb.value);
        if (targetVal.length === 0) return alert("Seleziona almeno una rotazione dal target.");
    }

    const fd = new FormData();
    fd.append('tipo', tipo);
    fd.append('testo', testo);
    fd.append('link', link);
    fd.append('scadenza', scadenza || '');
    fd.append('target', JSON.stringify(targetVal));
    fd.append('sondaggio_opzioni', JSON.stringify(arraySondaggio));
    fd.append('sondaggio_multi', isMulti ? '1' : '0');

    if (tipo === 'dds') {
        const titoloDds = document.getElementById('pub-titolo-dds').value.trim();
        if (!titoloDds) return alert("Inserisci il titolo della DDS.");
        fd.append('titolo_dds', titoloDds);
        fd.append('date_validita', ddsDatesArray.join(", "));
    }
    allegatiScelti.forEach(f => fd.append('allegati', f, f.name));

    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Pubblicazione...";
    btn.disabled = true;
    try {
        await inviaAvviso(fd, (p) => {
            btn.innerHTML = allegatiScelti.length ? `<i class='fa-solid fa-spinner fa-spin'></i> Invio allegati ${p}%` : "<i class='fa-solid fa-spinner fa-spin'></i> Pubblicazione...";
        });
        document.getElementById('modal-nuovo-avviso').style.display = 'none';
        alert("Annuncio pubblicato!");
        window.caricaBacheca();
    } catch (error) {
        alert("Errore durante la pubblicazione: " + error.message);
    } finally {
        btn.innerHTML = "<i class='fa-regular fa-paper-plane'></i> Pubblica Avviso";
        btn.disabled = false;
    }
};

// ==========================================================================================
// ELENCO AVVISI
// ==========================================================================================
function htmlAllegati(lista) {
    if (!lista || !lista.length) return '';
    const url = (a) => esc(API_ORIGIN + a.url);
    const immagini = lista.filter(a => a.mime.startsWith('image/'));
    const video = lista.filter(a => a.mime.startsWith('video/'));
    const pdf = lista.filter(a => a.mime === 'application/pdf');
    let h = '<div class="bu-allegati">';
    if (immagini.length) {
        h += `<div class="bu-griglia-foto">${immagini.map(a => `<a href="${url(a)}" target="_blank" rel="noopener"><img src="${url(a)}" alt="${esc(a.nome)}" loading="lazy"></a>`).join('')}</div>`;
    }
    video.forEach(a => { h += `<video class="bu-video" controls preload="metadata" playsinline src="${url(a)}"></video>`; });
    pdf.forEach(a => { h += `<a class="bu-pdf" href="${url(a)}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i><span class="bu-pdf-nome">${esc(a.nome)}</span><span class="bu-pdf-size">${fmtSize(a.size)}</span></a>`; });
    return h + '</div>';
}

function htmlSondaggio(m) {
    const s = m.sondaggio;
    if (!s) return '';
    const id = esc(m.id);
    const btnVoti = permessi.admin
        ? `<button class="bu-btn-icon" style="width:30px; height:30px;" title="Dettaglio voti" aria-label="Dettaglio voti" onclick="window.mostraVotiDettaglio('${id}')"><i class="fa-solid fa-users-viewfinder"></i></button>`
        : '';
    const tipoText = s.multi ? "(Risposte multiple)" : "(Risposta singola)";
    let html = `<div style="background: var(--surface-hover); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="font-size: 15px; font-weight: 700; color: var(--primary); margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap:8px;">
            <div style="display: flex; align-items: center; gap:8px;">
                <i class="fa-solid fa-chart-pie"></i> Sondaggio
                ${btnVoti}
            </div>
            <span style="font-weight: 500; font-size: 13px; color: var(--text-muted); background:var(--bg-color); padding:4px 8px; border-radius:6px; border:1px solid var(--border-color); white-space:nowrap;">${s.totale} partecipanti</span>
        </div>
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${tipoText}</div>`;

    s.opzioni.forEach((opt, i) => {
        const isMio = s.mie.includes(opt);
        const voti = s.conteggi[opt] || 0;
        const perc = s.totale > 0 ? Math.round((voti / s.totale) * 100) : 0;
        const testoVoti = s.multi ? `${voti} voti` : `${voti} (${perc}%)`;
        const btnStyle = isMio ? "background: var(--primary); color: white; border-color: var(--primary);" : "background: var(--surface); color: var(--primary); border-color: var(--primary);";
        html += `<button class="btn-outline" style="width: 100%; margin-bottom: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; ${btnStyle} box-shadow:var(--shadow-sm);" onclick="window.inviaVotoSondaggio('${id}', ${i})">
            <span style="font-weight: 600; font-size: 15px; display:flex; align-items:center; gap:8px;">${isMio ? '<i class="fa-solid fa-check"></i> ' : ''}${esc(opt)}</span>
            <span style="font-size: 14px; font-weight:500;">${testoVoti}</span>
        </button>`;
    });
    return html + `</div>`;
}

function htmlCard(m) {
    const id = esc(m.id);
    let extraHTML = "";
    let cardClass = "card";

    if (m.tipo === "dds") {
        cardClass += " card-dds";
        extraHTML += `<div class="msg-title-dds"><i class="fa-solid fa-triangle-exclamation"></i> DDS: ${esc(m.titolo_dds)}</div>`;
        if (m.date_validita) {
            extraHTML += `<div style="font-size: 14px; color: var(--danger); margin-bottom: 12px; font-weight: 600;"><i class="fa-regular fa-calendar-check"></i> Date valide: <b>${esc(m.date_validita)}</b></div>`;
        }
    }

    if (m.target !== "tutti" && permessi.admin) {
        extraHTML += `<div style="font-size: 11px; background: var(--primary-glow); color: var(--primary); display: inline-flex; align-items:center; gap:6px; padding: 4px 8px; border-radius: 6px; margin-bottom: 12px; font-weight:600;"><i class="fa-solid fa-bullseye"></i> Mirato a specifiche rotazioni</div><br>`;
    }

    const link = linkSicuro(m.link);
    if (link) {
        extraHTML += `<a href="${esc(link)}" target="_blank" rel="noopener" class="msg-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Apri Link Esterno</a>`;
    }

    // Tasti solo icona, uno accanto all'altro nella riga in alto: non coprono mai il testo
    let azioni = '';
    if (permessi.admin) azioni += `<button class="bu-btn-icon" title="Visualizzazioni" aria-label="Visualizzazioni" onclick="window.mostraLetture('${id}')"><i class="fa-solid fa-eye"></i></button>`;
    if (permessi.admin) azioni += `<button class="bu-btn-icon bu-danger" title="Elimina" aria-label="Elimina avviso" onclick="window.eliminaMessaggio('${id}')"><i class="fa-solid fa-trash-can"></i></button>`;

    return `
        <div class="${cardClass}">
            <div class="bu-card-head">
                <div class="msg-date"><i class="fa-regular fa-calendar"></i> Pubblicato il ${fmtDataOra(m.timestamp)}</div>
                ${azioni ? `<div class="bu-azioni">${azioni}</div>` : ''}
            </div>
            ${extraHTML}
            <div class="msg-text" style="white-space: pre-wrap; overflow-wrap: anywhere;">${esc(m.testo)}</div>
            ${htmlAllegati(m.allegati)}
            ${m.sondaggio ? `<div id="sondaggio-${id}" style="margin-top: 16px;">${htmlSondaggio(m)}</div>` : ''}
        </div>`;
}

async function segnaLetti(ids) {
    const ctx = window.bachecaContext;
    const nuovi = ids.filter(id => !localStorage.getItem('letto_' + id));
    if (!ctx || !nuovi.length) return;
    try {
        await api('/letti', { metodo: 'POST', corpo: { ids: nuovi, nome: ctx.currentUserFullName } });
        nuovi.forEach(id => localStorage.setItem('letto_' + id, 'true'));
    } catch (e) {
        console.log("Impossibile salvare la lettura");
    }
}

window.caricaBacheca = async () => {
    const ctx = window.bachecaContext;
    if (!ctx) return;

    const container = document.getElementById('lista-messaggi');
    const stateApp = JSON.parse(localStorage.getItem('myTurniApp')) || {};
    const pid = stateApp.profiloAttivoId || 'default';
    const profileObj = stateApp.profiliSalvati ? stateApp.profiliSalvati[pid] : stateApp;
    const rotazioneUtente = profileObj ? profileObj.depositoAttivo : null;

    container.innerHTML = `<div class="status-message"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary);"></i> Caricamento annunci...</div>`;

    try {
        const risp = await api('?rotazione=' + encodeURIComponent(rotazioneUtente || ''));
        permessi = { admin: !!risp.admin };
        const btnAdd = document.getElementById('btn-admin-add-bacheca'); // il pulsante segue il ruolo letto dal server
        if (btnAdd) btnAdd.style.display = permessi.admin ? 'block' : 'none';
        cacheAvvisi.clear();
        risp.avvisi.forEach(m => cacheAvvisi.set(m.id, m));

        if (!risp.avvisi.length) {
            container.innerHTML = `<div class="status-message"><i class="fa-regular fa-envelope-open" style="font-size:32px; color:var(--text-muted); margin-bottom:10px;"></i> Nessun avviso in bacheca.</div>`;
            return;
        }
        container.innerHTML = risp.avvisi.map(htmlCard).join('');
        segnaLetti(risp.avvisi.map(m => m.id));
    } catch (e) {
        container.innerHTML = `<div class="status-message" style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Errore caricamento: ${esc(e.message)}</div>`;
    }
};

// ==========================================================================================
// SONDAGGI, VISUALIZZAZIONI, ELIMINAZIONE
// ==========================================================================================
window.inviaVotoSondaggio = async (msgId, indice) => {
    const ctx = window.bachecaContext;
    const m = cacheAvvisi.get(msgId);
    if (!ctx || !m || !m.sondaggio) return;
    try {
        const r = await api('/' + encodeURIComponent(msgId) + '/voto', { metodo: 'POST', corpo: { scelta: m.sondaggio.opzioni[indice], nome: ctx.currentUserFullName } });
        m.sondaggio = r.sondaggio;
        const el = document.getElementById('sondaggio-' + msgId);
        if (el) el.innerHTML = htmlSondaggio(m);
    } catch (e) {
        alert("Errore durante la votazione: " + e.message);
    }
};

window.mostraLetture = async (msgId) => {
    document.getElementById('modal-letture').style.display = 'flex';
    const container = document.getElementById('lista-letture');
    container.innerHTML = `<div class="status-message"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>`;
    try {
        const r = await api('/' + encodeURIComponent(msgId) + '/letture');
        container.innerHTML = r.letture.map(l => `<div style="padding: 14px 10px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap:10px;">
                <div style="font-weight: 700; font-size: 15px; color: var(--text-main);">${esc(l.nome || 'Utente')}</div>
                <div style="font-size: 12px; color: var(--text-muted); text-align:right;">${fmtDataOraBreve(l.data_lettura)}</div></div>`).join('')
            || `<div class="status-message">Nessuno ha ancora visualizzato.</div>`;
    } catch (e) {
        container.innerHTML = `<div class="status-message" style="color:var(--danger);">Errore: ${esc(e.message)}</div>`;
    }
};

window.mostraVotiDettaglio = async (msgId) => {
    document.getElementById('modal-voti').style.display = 'flex';
    const container = document.getElementById('lista-voti-dettaglio');
    container.innerHTML = `<div class="status-message"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>`;
    try {
        const r = await api('/' + encodeURIComponent(msgId) + '/voti');
        container.innerHTML = r.voti.map(v => `
                <div style="padding: 14px 10px; border-bottom: 1px solid var(--border-color);">
                    <div style="font-weight: 700; font-size: 15px; color: var(--text-main); margin-bottom:4px;">${esc(v.nome || 'Utente Sconosciuto')}</div>
                    <div style="font-size: 14px; color: var(--primary); margin-top: 4px;">Scelta: <b style="background:var(--primary-glow); padding:2px 6px; border-radius:4px;">${esc(v.scelte.join(", ") || "Nessuna scelta")}</b></div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">${fmtDataOraBreve(v.timestamp)}</div>
                </div>`).join('')
            || `<div class="status-message">Nessuno ha ancora votato.</div>`;
    } catch (e) {
        container.innerHTML = `<div class="status-message" style="color:var(--danger);">Errore: ${esc(e.message)}</div>`;
    }
};

window.eliminaMessaggio = async (id) => {
    if (!confirm("Sei sicuro di voler eliminare questo avviso?")) return;
    try {
        await api('/' + encodeURIComponent(id), { metodo: 'DELETE' });
        window.caricaBacheca();
    } catch (e) {
        alert("Errore durante l'eliminazione: " + e.message);
    }
};

console.log("Bacheca Utility: file caricato e pronto all'uso.");
