// ============================================================================
// VADEMECUM - modulo Utility (lazy-load)
// Sostituisce vademecum.html + moduli/vademecum.js.
// - Id app = "vademecum"  ->  il loader carica ./vademecum.js
// - UI creata da JS (modale #modal-vademecum-main, mostrato anche dall'index)
// - Dati: Firestore app_data/vademecum_tree (stesso formato di prima)
// - Sottomoduli invariati: vd_scheda.js, vd_mappa.js, vd_planimetria.js
// ============================================================================
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const MODAL_ID = 'modal-vademecum-main';
const ADMIN_UID = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2";
const GH_OWNER = "hazev98";
const GH_REPO = "Utility";

const LIB = {
    fa: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    leafletCss: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    leafletJs: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    sortableJs: 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js'
};

// ---------------------------------------------------------------- stato
let db = null;
let auth = null;
let treeData = { root: [] };
let navigationStack = ['root'];
let isEditMode = false;
let isAdminOrCollab = false;
let sortableInstance = null;
let libsPromise = null;
let nodeToMove = null;
let nodeToMoveParent = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- librerie esterne
function caricaCss(href, match) {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href.includes(match))) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
}

function caricaScript(src, giaCaricato) {
    if (giaCaricato()) return Promise.resolve();
    return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.onload = res;
        s.onerror = () => rej(new Error('Impossibile caricare ' + src));
        document.head.appendChild(s);
    });
}

function caricaLibrerie() {
    if (!libsPromise) {
        caricaCss(LIB.leafletCss, 'leaflet');
        libsPromise = Promise.all([
            caricaScript(LIB.leafletJs, () => !!window.L),
            caricaScript(LIB.sortableJs, () => !!window.Sortable)
        ]).catch(e => { libsPromise = null; throw e; });
    }
    return libsPromise;
}

// ---------------------------------------------------------------- CSS
function buildCss() {
    const R = '#' + MODAL_ID;
    return `
/* Variabili di riserva: valgono solo se l'index non le definisce (specificita' 0) */
:where(:root){
    --primary:#0066cc; --primary-hover:#0052a3; --primary-glow:rgba(0,102,204,.2);
    --surface:#fff; --surface-hover:#f8f9fa; --text-main:#1a1a1a; --text-muted:#5f6368;
    --border-color:#e0e0e0; --bg-color:#f0f2f5; --danger:#d93025; --success:#0f9d58; --warning:#ffb74d;
    --shadow-sm:0 4px 6px -1px rgba(0,0,0,.05),0 2px 4px -1px rgba(0,0,0,.03);
    --shadow-md:0 10px 20px -5px rgba(0,0,0,.12),0 4px 6px -2px rgba(0,0,0,.05);
    --shadow-lg:0 25px 50px -12px rgba(0,0,0,.15),0 10px 10px -5px rgba(0,0,0,.04);
    --radius-md:14px; --radius-lg:24px; --transition:.3s cubic-bezier(.16,1,.3,1);
}
:where(:root[data-theme="dark"]){
    --primary:#4da3ff; --primary-hover:#73b9ff; --primary-glow:rgba(77,163,255,.25);
    --bg-color:#0f1115; --surface:#1a1d24; --surface-hover:#232730; --text-main:#e8eaed; --text-muted:#9aa0a6;
    --border-color:#2f333d; --success:#34a853; --danger:#ea4335; --warning:#ffb74d;
    --shadow-sm:0 4px 6px -1px rgba(0,0,0,.3); --shadow-md:0 10px 20px -5px rgba(0,0,0,.4); --shadow-lg:0 25px 50px -12px rgba(0,0,0,.5);
}
@media (prefers-color-scheme: dark){
    :where(:root:not([data-theme="light"])){
        --primary:#4da3ff; --primary-hover:#73b9ff; --primary-glow:rgba(77,163,255,.25);
        --bg-color:#0f1115; --surface:#1a1d24; --surface-hover:#232730; --text-main:#e8eaed; --text-muted:#9aa0a6;
        --border-color:#2f333d; --success:#34a853; --danger:#ea4335; --warning:#ffb74d;
        --shadow-sm:0 4px 6px -1px rgba(0,0,0,.3); --shadow-md:0 10px 20px -5px rgba(0,0,0,.4); --shadow-lg:0 25px 50px -12px rgba(0,0,0,.5);
    }
}

${R}{
    display:none; position:fixed; top:0; left:0; right:0; bottom:0; z-index:2000;
    flex-direction:column; overflow:hidden; box-sizing:border-box;
    background:var(--bg-color); color:var(--text-main);
    font-family:'Inter',-apple-system,sans-serif;
}
${R} *{ box-sizing:border-box; }

/* Bottoni (usati anche dai sottomoduli vd_*) */
${R} .icon-btn, #plan-modal-overlay .icon-btn, #vd-media-viewer .icon-btn{
    background:var(--surface); border:1px solid var(--border-color); font-size:18px; color:var(--primary);
    cursor:pointer; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    transition:all .2s cubic-bezier(.4,0,.2,1); box-shadow:var(--shadow-sm); padding:0;
}
${R} .icon-btn:hover{ transform:translateY(-2px); box-shadow:var(--shadow-md); border-color:var(--primary); color:var(--primary-hover); }
${R} .icon-btn:active{ transform:scale(.92) translateY(2px); box-shadow:var(--shadow-sm); }
${R} .icon-btn.btn-transparent{ background:transparent; border:none; box-shadow:none; font-size:20px; width:auto; height:auto; }
${R} .icon-btn.btn-transparent:hover{ transform:none; color:var(--primary-hover); }

${R} .btn-action{
    width:100%; padding:14px; border:none; border-radius:var(--radius-md); background:var(--primary); color:#fff;
    font-family:inherit; font-size:15px; font-weight:600; cursor:pointer; transition:var(--transition); box-shadow:0 4px 12px var(--primary-glow);
}
${R} .btn-action:hover{ background:var(--primary-hover); transform:translateY(-2px); box-shadow:var(--shadow-md); }
${R} .btn-action:active{ transform:scale(.98); box-shadow:var(--shadow-sm); }

${R} .vd-input{
    width:100%; padding:12px 16px; margin-bottom:20px; border:1px solid var(--border-color); border-radius:var(--radius-md);
    background:var(--bg-color); color:var(--text-main); font-family:inherit; font-size:14px; transition:var(--transition);
}
${R} .vd-input:focus{ outline:none; border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-glow); }
${R} .vd-label{ font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:8px; display:block; }

/* Header fluttuante */
${R} .vd-header{
    position:absolute; top:calc(12px + env(safe-area-inset-top)); left:50%; transform:translateX(-50%);
    width:calc(100% - 32px); max-width:1168px; height:65px; padding:0 20px; z-index:100;
    display:flex; align-items:center; justify-content:space-between;
    background:rgba(255,255,255,.85); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
    box-shadow:var(--shadow-md); border-radius:var(--radius-lg); border:1px solid rgba(255,255,255,.6);
}
:root[data-theme="dark"] ${R} .vd-header{ background:rgba(26,29,36,.85); border-color:rgba(255,255,255,.1); }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) ${R} .vd-header{ background:rgba(26,29,36,.85); border-color:rgba(255,255,255,.1); } }
${R} .vd-header-left{ display:flex; align-items:center; gap:8px; flex-shrink:0; }
${R} .vd-header-center{ flex:1; padding:0 10px; overflow:hidden; }
${R} .vd-header-center.text-center{ text-align:center; }
${R} .vd-header-center.text-left{ text-align:left; }
${R} .vd-header-right{ display:flex; align-items:center; gap:10px; flex-shrink:0; justify-content:flex-end; }
${R} .vd-title{ font-size:19px; font-weight:800; margin:0; color:var(--primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:-.5px; }

/* Viewport e pannelli (drill-down) */
${R} .vd-viewport{
    position:relative; width:100%; height:100%; padding-top:calc(90px + env(safe-area-inset-top));
    overflow-x:hidden; overscroll-behavior:contain;
}
${R} .vd-panel{
    position:absolute; top:calc(90px + env(safe-area-inset-top)); left:0; width:100%;
    height:calc(100% - 90px - env(safe-area-inset-top)); padding:20px; overflow-y:auto;
    transition:transform .4s cubic-bezier(.2,.8,.2,1);
}
${R} .vd-panel.panel-center{ transform:translateX(0); }
${R} .vd-panel.panel-left{ transform:translateX(-100%); }
${R} .vd-panel.panel-right{ transform:translateX(100%); }

/* Lista */
${R} .vd-list-item{
    display:flex; align-items:center; justify-content:space-between; background:var(--surface); padding:18px 20px;
    border-radius:var(--radius-md); margin-bottom:12px; cursor:pointer; border:1px solid var(--border-color); transition:var(--transition);
    box-shadow:0 6px 12px rgba(0,0,0,.05),0 2px 4px rgba(0,0,0,.03),inset 0 -4px 6px rgba(0,0,0,.02);
}
:root[data-theme="dark"] ${R} .vd-list-item{
    box-shadow:0 10px 20px -2px rgba(0,0,0,.9),0 4px 8px -2px rgba(0,0,0,.7),inset 0 -6px 12px rgba(0,0,0,.7),inset 1px 1px 3px rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.15);
}
@media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]) ${R} .vd-list-item{
        box-shadow:0 10px 20px -2px rgba(0,0,0,.9),0 4px 8px -2px rgba(0,0,0,.7),inset 0 -6px 12px rgba(0,0,0,.7),inset 1px 1px 3px rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.15);
    }
}
${R} .vd-list-item:hover{ transform:translateY(-2px); box-shadow:var(--shadow-md); border-color:var(--primary); }
${R} .vd-list-item:active{ background:var(--surface-hover); transform:scale(.97) translateY(2px); box-shadow:var(--shadow-sm); }
${R} .item-title{ font-weight:600; font-size:16px; display:flex; align-items:center; gap:14px; }
${R} .edit-controls{ display:none; gap:10px; align-items:center; }
${R} .drag-handle{ color:var(--text-muted); cursor:grab; padding:10px; font-size:18px; }
${R} .drag-handle:active{ cursor:grabbing; }
${R} .vd-list-item .info-btn-view{ display:none; }
${R} .vd-list-item.has-info .info-btn-view{ display:flex; }
${R} .edit-mode .vd-list-item .info-btn-view, ${R} .edit-mode .edit-controls{ display:flex; }

/* Modali interni */
${R} .vd-modal-overlay{
    display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:200; padding:20px;
    justify-content:center; align-items:center; background:rgba(0,0,0,.6);
    backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); animation:vdFadeIn .3s ease;
}
${R} .vd-modal-content{
    background:var(--surface); padding:32px; border-radius:var(--radius-lg); width:100%; max-width:380px; text-align:left;
    box-shadow:var(--shadow-lg),0 0 0 1px rgba(255,255,255,.1) inset; border:1px solid var(--border-color); position:relative;
    color:var(--text-main); max-height:90vh; overflow-y:auto; animation:vdSlideUp .4s cubic-bezier(.16,1,.3,1) forwards;
}
${R} .vd-modal-x{ position:absolute; right:20px; top:20px; font-size:24px; color:var(--text-muted); cursor:pointer; }
@keyframes vdFadeIn{ from{opacity:0} to{opacity:1} }
@keyframes vdSlideUp{
    0%{ opacity:0; transform:translateY(35px) scale(.9); }
    65%{ opacity:1; transform:translateY(-4px) scale(1.02); }
    100%{ opacity:1; transform:translateY(0) scale(1); }
}
`;
}

// ---------------------------------------------------------------- UI (creata al primo caricamento del modulo)
export function initUIVademecum() {
    if ($(MODAL_ID)) return;

    if (!$('vd-style')) {
        const st = document.createElement('style');
        st.id = 'vd-style';
        st.textContent = buildCss();
        document.head.appendChild(st);
    }
    caricaCss(LIB.fa, 'awesome');

    const root = document.createElement('div');
    root.id = MODAL_ID;
    root.innerHTML = `
        <header class="vd-header">
            <div class="vd-header-left">
                <button class="icon-btn btn-transparent" data-vd="chiudi" title="Torna alla Home"><i class="fa-solid fa-house"></i></button>
                <button id="vd-btn-back" class="icon-btn btn-transparent" data-vd="back" style="display:none;"><i class="fa-solid fa-chevron-left"></i></button>
            </div>
            <div class="vd-header-center text-center" id="vd-title-container">
                <h2 id="vd-main-title" class="vd-title">Vademecum</h2>
            </div>
            <div class="vd-header-right">
                <button id="vd-btn-token" class="icon-btn" data-vd="token-open" style="display:none; color:var(--warning); border-color:var(--warning);" title="Imposta Token"><i class="fa-solid fa-key"></i></button>
                <button id="vd-btn-edit" class="icon-btn" data-vd="edit-toggle" style="display:none;" title="Modifica"><i id="vd-edit-icon" class="fa-solid fa-pen"></i></button>
            </div>
        </header>

        <main class="vd-viewport" id="vd-viewport"></main>

        <div id="vd-add-fab" style="display:none; position:absolute; bottom:30px; right:30px; z-index:90;">
            <button class="icon-btn" data-vd="add" style="background:var(--primary); color:#fff; width:60px; height:60px; box-shadow:0 4px 12px rgba(0,102,204,.4); font-size:24px;"><i class="fa-solid fa-plus"></i></button>
        </div>

        <!-- Token -->
        <div id="vd-tokenModal" class="vd-modal-overlay">
            <div class="vd-modal-content">
                <i class="fa-solid fa-xmark vd-modal-x" data-vd="modal-close" data-target="vd-tokenModal"></i>
                <h3 style="margin-top:0; color:var(--danger);"><i class="fa-solid fa-key"></i> Token GitHub</h3>
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">Inserisci il Personal Access Token per abilitare il caricamento di planimetrie e foto.</p>
                <input type="password" id="vd-pat-input" class="vd-input" placeholder="ghp_...">
                <button class="btn-action" data-vd="token-save">Salva Token</button>
            </div>
        </div>

        <!-- Aggiungi / Modifica nodo -->
        <div id="vd-nodeModal" class="vd-modal-overlay">
            <div class="vd-modal-content">
                <i class="fa-solid fa-xmark vd-modal-x" data-vd="modal-close" data-target="vd-nodeModal"></i>
                <h3 id="vd-nodeModalTitle" style="margin-top:0; color:var(--primary);"><i class="fa-solid fa-plus"></i> Nuova Voce</h3>
                <input type="hidden" id="vd-nodeId">
                <input type="hidden" id="vd-nodeParent">

                <label class="vd-label">TITOLO</label>
                <input type="text" id="vd-nodeTitolo" class="vd-input" placeholder="Es. Procedure di Emergenza">

                <label class="vd-label">ICONA (FontAwesome)</label>
                <input type="text" id="vd-nodeIcona" class="vd-input" placeholder="es. fa-life-ring">

                <div id="vd-sezione-tipo">
                    <label class="vd-label">TIPO CONTENUTO</label>
                    <select id="vd-nodeTipo" class="vd-input">
                        <option value="categoria">Sottocartella (Menu)</option>
                        <option value="scheda">Scheda Testuale/Foto</option>
                        <option value="planimetria">Planimetria Interattiva</option>
                        <option value="mappa">Mappa Dinamica</option>
                    </select>
                </div>

                <div style="margin-bottom:20px; background:rgba(255,183,77,.1); padding:12px; border-radius:12px; border:1px dashed var(--warning);">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:14px; font-weight:600; color:#d88900;">
                        <input type="checkbox" id="vd-nodeInLavorazione" style="width:18px; height:18px;">
                        <i class="fa-solid fa-person-digging"></i> In lavorazione (Nascosto)
                    </label>
                </div>

                <button class="btn-action" data-vd="nodo-salva">Salva Voce</button>
                <button id="vd-btn-elimina-nodo" class="btn-action" data-vd="nodo-elimina" style="background:transparent; color:var(--danger); border:2px solid var(--danger); margin-top:10px; display:none; box-shadow:none;">Elimina Voce</button>
            </div>
        </div>

        <!-- Sposta -->
        <div id="vd-moveModal" class="vd-modal-overlay">
            <div class="vd-modal-content">
                <i class="fa-solid fa-xmark vd-modal-x" data-vd="modal-close" data-target="vd-moveModal"></i>
                <h3 style="margin-top:0; color:var(--primary);"><i class="fa-solid fa-folder-tree"></i> Sposta in...</h3>
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">Seleziona la cartella di destinazione:</p>
                <div id="vd-move-folder-list" style="max-height:50vh; overflow-y:auto; display:flex; flex-direction:column; gap:8px;"></div>
            </div>
        </div>

        <!-- Info -->
        <div id="vd-infoNodoModal" class="vd-modal-overlay">
            <div class="vd-modal-content">
                <i class="fa-solid fa-xmark vd-modal-x" data-vd="modal-close" data-target="vd-infoNodoModal"></i>
                <div id="vd-infoNodoContent"></div>
            </div>
        </div>
    `;
    document.body.appendChild(root);
    root.addEventListener('click', onRootClick);

    // API pubblica (come nella vecchia versione)
    window.Vademecum = {
        goBack, navigate, toggleEditMode, salvaToken,
        openAddModal, openEditNodeModal, salvaNodo, eliminaNodo,
        openMoveModal, eseguiSpostamento, apriInfoNodo, salvaInfoNodo, chiudi
    };
}

// Click delegati: nessun onclick inline, quindi niente problemi con apici nei titoli
function onRootClick(e) {
    const t = e.target;
    if (t.classList && t.classList.contains('vd-modal-overlay')) { chiudiModal(t.id); return; }

    const el = t.closest('[data-vd]');
    if (!el || !e.currentTarget.contains(el)) return;
    const id = el.dataset.id;

    switch (el.dataset.vd) {
        case 'chiudi': chiudi(); break;
        case 'back': goBack(); break;
        case 'edit-toggle': toggleEditMode(); break;
        case 'token-open': apriModal('vd-tokenModal'); break;
        case 'token-save': salvaToken(); break;
        case 'add': openAddModal(); break;
        case 'nodo-salva': salvaNodo(); break;
        case 'nodo-elimina': eliminaNodo(); break;
        case 'modal-close': chiudiModal(el.dataset.target); break;
        case 'move-to': eseguiSpostamento(id); break;
        case 'info-salva': salvaInfoNodo(id); break;
        case 'open': {
            const n = trovaNodo(id);
            if (n) navigate(id, n.nodo.titolo, n.nodo.tipo);
            break;
        }
        case 'move': {
            const n = trovaNodo(id);
            if (n) openMoveModal(id, n.nodo.tipo);
            break;
        }
        case 'edit': openEditNodeModal(id); break;
        case 'info': apriInfoNodo(id); break;
    }
}

const apriModal = (id) => { const m = $(id); if (m) m.style.display = 'flex'; };
const chiudiModal = (id) => { const m = $(id); if (m) m.style.display = 'none'; };

// ---------------------------------------------------------------- avvio (chiamato dall'index)
export async function avviaMotoreVademecum(dbIn, authIn, userData, isAdmin) {
    db = dbIn; auth = authIn;
    if (!auth || !auth.currentUser) { alert("Effettua il login su Utility per accedere."); return; }

    if (!$(MODAL_ID)) initUIVademecum();

    isAdminOrCollab = !!isAdmin
        || auth.currentUser.uid === ADMIN_UID
        || (userData && userData.ruolo === 'collaborator');

    resetStato();
    $('vd-pat-input').value = isAdminOrCollab ? (localStorage.getItem('gh_admin_token') || '') : '';
    $('vd-btn-edit').style.display = isAdminOrCollab ? 'flex' : 'none';

    const viewport = $('vd-viewport');
    viewport.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:60px;"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</div>`;
    $(MODAL_ID).style.display = 'flex';

    try {
        await caricaLibrerie();
    } catch (e) {
        console.error(e);
        viewport.innerHTML = `<div style="text-align:center; color:var(--danger); margin-top:60px;">Impossibile caricare le librerie (mappe/ordinamento). Controlla la connessione e riprova.</div>`;
        return;
    }

    await loadTreeData();
    viewport.innerHTML = '';
    renderPanel('root', 'panel-center');
}

function resetStato() {
    navigationStack = ['root'];
    isEditMode = false;
    if (sortableInstance) { try { sortableInstance.destroy(); } catch (e) { } sortableInstance = null; }

    const viewport = $('vd-viewport');
    viewport.classList.remove('edit-mode');
    viewport.querySelectorAll('.vd-panel').forEach(p => p.remove());

    const icona = $('vd-edit-icon');
    icona.className = 'fa-solid fa-pen'; icona.style.color = '';
    $('vd-btn-token').style.display = 'none';
    $('vd-add-fab').style.display = 'none';
    ['vd-tokenModal', 'vd-nodeModal', 'vd-moveModal', 'vd-infoNodoModal'].forEach(chiudiModal);
    aggiornaHeader('Vademecum', false);
}

function chiudi() {
    if (isEditMode) toggleEditMode(); // salva l'albero
    const m = $(MODAL_ID);
    if (m) m.style.display = 'none';
    // libera mappe/planimetrie aperte
    const viewport = $('vd-viewport');
    if (viewport) viewport.querySelectorAll('.vd-panel').forEach(p => p.remove());
}

// ---------------------------------------------------------------- navigazione
function trovaNodo(id) {
    for (const key in treeData) {
        const nodo = (treeData[key] || []).find(i => i.id === id);
        if (nodo) return { nodo, parentKey: key };
    }
    return null;
}

function navigate(targetId, targetTitolo, tipo) {
    if (isEditMode) return;

    // Durante la lettura di un documento il tasto Modifica sparisce
    const btnEdit = $('vd-btn-edit');
    if (tipo !== 'categoria' && btnEdit) btnEdit.style.display = 'none';

    if (tipo === 'categoria') {
        navigationStack.push(targetId);
        aggiornaHeader(targetTitolo, true);
        renderPanel(targetId, 'panel-right');
        effettuaScorrimento('avanti');
    } else if (tipo === 'mappa') {
        apriMappaLeaflet(targetId, targetTitolo);
    } else if (tipo === 'planimetria') {
        apriPlanimetria(targetId, targetTitolo);
    } else if (tipo === 'scheda') {
        apriScheda(targetId, targetTitolo);
    }
}

function goBack() {
    if (navigationStack.length <= 1) return;
    if (isEditMode) toggleEditMode();

    navigationStack.pop();
    const currentId = navigationStack[navigationStack.length - 1];

    let targetTitolo = 'Vademecum';
    let isSub = false;
    if (currentId !== 'root') {
        isSub = true;
        const n = trovaNodo(currentId);
        if (n) targetTitolo = n.nodo.titolo;
    }
    aggiornaHeader(targetTitolo, isSub);

    if (isAdminOrCollab) $('vd-btn-edit').style.display = 'flex';

    renderPanel(currentId, 'panel-left');
    effettuaScorrimento('indietro');
}

function aggiornaHeader(titolo, isSottocategoria) {
    $('vd-main-title').innerText = titolo;
    $('vd-btn-back').style.display = isSottocategoria ? 'flex' : 'none';
    $('vd-title-container').className = 'vd-header-center ' + (isSottocategoria ? 'text-left' : 'text-center');
}

function effettuaScorrimento(direzione) {
    setTimeout(() => {
        const panels = $('vd-viewport').querySelectorAll('.vd-panel');
        if (panels.length < 2) return;

        const o = panels[panels.length - 2]; // vecchio
        const n = panels[panels.length - 1]; // nuovo

        if (direzione === 'avanti') {
            o.classList.replace('panel-center', 'panel-left');
            n.classList.replace('panel-right', 'panel-center');
        } else {
            o.classList.replace('panel-center', 'panel-right');
            n.classList.replace('panel-left', 'panel-center');
        }

        // Distrugge i pannelli vecchi (sblocca le mappe Leaflet)
        setTimeout(() => {
            if (o) o.remove();
            $('vd-viewport').querySelectorAll('.vd-panel').forEach(p => { if (p !== n) p.remove(); });
        }, 400);
    }, 50);
}

function renderPanel(nodeId, positionClass) {
    const viewport = $('vd-viewport');
    if (positionClass === 'panel-center') {
        const existing = $(`vd-panel-${nodeId}`);
        if (existing) existing.remove();
    }

    const panel = document.createElement('div');
    panel.className = `vd-panel ${positionClass}`;
    panel.id = `vd-panel-${nodeId}`;

    const items = treeData[nodeId] || [];
    let renderedCount = 0;

    if (items.length === 0) {
        panel.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:40px;">Nessuna voce presente. <br> Premi la matita in alto per aggiungerne una.</div>`;
    } else {
        items.forEach(item => {
            // Le voci "in lavorazione" le vedono solo admin e collaboratori
            if (item.inLavorazione && !isAdminOrCollab) return;
            renderedCount++;

            const isCat = item.tipo === 'categoria';
            const iconColor = isCat ? 'color:var(--primary);' : 'color:var(--text-muted);';
            const wipBadge = item.inLavorazione
                ? `<span style="background:var(--warning); color:#000; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:8px; font-weight:bold;"><i class="fa-solid fa-person-digging"></i> WIP</span>` : '';
            const hasInfo = (item.infoTesto && item.infoTesto.trim() !== '') ? 'has-info' : '';
            const sid = esc(item.id);

            panel.insertAdjacentHTML('beforeend', `
                <div class="vd-list-item ${hasInfo}" data-vd="open" data-id="${sid}">
                    <div class="item-title"><i class="fa-solid ${esc(item.icona || 'fa-folder')}" style="${iconColor}"></i> ${esc(item.titolo)} ${wipBadge}</div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div class="edit-controls">
                            <button class="icon-btn" data-vd="move" data-id="${sid}" style="color:#17a2b8; width:32px; height:32px;"><i class="fa-solid fa-arrow-right-to-bracket" style="font-size:14px;"></i></button>
                            <button class="icon-btn" data-vd="edit" data-id="${sid}" style="color:var(--text-muted); width:32px; height:32px;"><i class="fa-solid fa-pen" style="font-size:14px;"></i></button>
                            <i class="fa-solid fa-grip-lines drag-handle"></i>
                        </div>
                        <button class="icon-btn btn-transparent info-btn-view" data-vd="info" data-id="${sid}" style="color:var(--primary); font-size:18px; padding:0; margin:0;" title="Info Voce"><i class="fa-solid fa-circle-info"></i></button>
                        <i class="fa-solid fa-chevron-right" style="color:var(--border-color); ${isCat ? '' : 'display:none;'}"></i>
                    </div>
                </div>`);
        });

        if (renderedCount === 0 && !isAdminOrCollab) {
            panel.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:40px;">Contenuti in lavorazione.</div>`;
        }
    }
    viewport.appendChild(panel);
    if (isEditMode) initSortable(panel);
}

// ---------------------------------------------------------------- editor albero
function openAddModal() {
    $('vd-nodeModalTitle').innerHTML = '<i class="fa-solid fa-plus"></i> Nuova Voce';
    $('vd-nodeId').value = '';
    $('vd-nodeTitolo').value = '';
    $('vd-nodeIcona').value = 'fa-folder';
    $('vd-nodeInLavorazione').checked = false;
    $('vd-sezione-tipo').style.display = 'block';
    $('vd-nodeTipo').value = 'categoria';
    $('vd-btn-elimina-nodo').style.display = 'none';
    $('vd-nodeParent').value = navigationStack[navigationStack.length - 1];
    apriModal('vd-nodeModal');
}

function openEditNodeModal(id) {
    const n = trovaNodo(id);
    if (!n) return;
    $('vd-nodeModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Modifica Voce';
    $('vd-nodeId').value = id;
    $('vd-nodeTitolo').value = n.nodo.titolo || '';
    $('vd-nodeIcona').value = n.nodo.icona || '';
    $('vd-nodeInLavorazione').checked = !!n.nodo.inLavorazione;
    $('vd-sezione-tipo').style.display = 'none';
    $('vd-btn-elimina-nodo').style.display = 'block';
    $('vd-nodeParent').value = navigationStack[navigationStack.length - 1];
    apriModal('vd-nodeModal');
}

function salvaNodo() {
    const id = $('vd-nodeId').value;
    const parent = $('vd-nodeParent').value;
    const titolo = $('vd-nodeTitolo').value.trim();
    let icona = $('vd-nodeIcona').value.trim() || 'fa-folder';
    const tipo = $('vd-nodeTipo').value;
    const inLavorazione = $('vd-nodeInLavorazione').checked;

    if (!icona.includes('fa-')) icona = 'fa-solid fa-' + icona;
    if (!titolo) return alert('Inserisci un titolo valido.');
    if (!treeData[parent]) treeData[parent] = [];

    if (id) {
        const item = treeData[parent].find(i => i.id === id);
        if (item) { item.titolo = titolo; item.icona = icona; item.inLavorazione = inLavorazione; }
    } else {
        const newId = tipo + '_' + Date.now();
        treeData[parent].push({ id: newId, titolo, icona, tipo, inLavorazione });
        if (tipo === 'categoria') treeData[newId] = [];
    }

    chiudiModal('vd-nodeModal');
    salvaAlberoSuFirebase();
    renderPanel(parent, 'panel-center');
}

function eliminaNodo() {
    if (!confirm('Attenzione: Sei sicuro di voler eliminare questa voce? Se è una scheda, anche il testo e tutti i file multimediali collegati verranno eliminati dal server definitivamente.')) return;

    const id = $('vd-nodeId').value;
    const parent = $('vd-nodeParent').value;
    const nodo = (treeData[parent] || []).find(i => i.id === id);

    if (nodo && nodo.tipo === 'scheda') puliziaFileGitHub(nodo.id); // in background

    treeData[parent] = (treeData[parent] || []).filter(i => i.id !== id);
    if (treeData[id]) delete treeData[id];

    chiudiModal('vd-nodeModal');
    salvaAlberoSuFirebase();
    renderPanel(parent, 'panel-center');
}

async function puliziaFileGitHub(schedaId) {
    const token = localStorage.getItem('gh_admin_token');
    if (!token) return;

    const pathScheda = `assets/schede/${schedaId}.json`;
    const api = (p) => `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${p}`;
    const H = { 'Authorization': `token ${token}` };

    try {
        const resScheda = await fetch(`${api(pathScheda)}?t=${Date.now()}`, { headers: H });
        if (!resScheda.ok) return;

        const fileData = await resScheda.json();
        const datiScheda = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));

        for (const mediaPath of (datiScheda.media || [])) {
            const resMedia = await fetch(api(mediaPath), { headers: H });
            if (resMedia.ok) {
                const mediaSha = (await resMedia.json()).sha;
                await fetch(api(mediaPath), {
                    method: 'DELETE',
                    headers: { ...H, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Pulizia media scheda eliminata', sha: mediaSha })
                });
            }
        }

        await fetch(api(pathScheda), {
            method: 'DELETE',
            headers: { ...H, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Eliminata scheda ${schedaId}`, sha: fileData.sha })
        });
    } catch (e) { console.error('Errore pulizia in background:', e); }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const viewport = $('vd-viewport');
    const icona = $('vd-edit-icon');

    if (isEditMode) {
        viewport.classList.add('edit-mode');
        icona.className = 'fa-solid fa-check'; icona.style.color = 'var(--success)';
        $('vd-btn-token').style.display = 'flex';
        $('vd-add-fab').style.display = 'block';
        const activePanel = viewport.querySelector('.vd-panel.panel-center');
        if (activePanel) initSortable(activePanel);
    } else {
        viewport.classList.remove('edit-mode');
        icona.className = 'fa-solid fa-pen'; icona.style.color = 'var(--primary)';
        $('vd-btn-token').style.display = 'none';
        $('vd-add-fab').style.display = 'none';
        if (sortableInstance) { try { sortableInstance.destroy(); } catch (e) { } sortableInstance = null; }
        salvaAlberoSuFirebase();
    }
    window.dispatchEvent(new CustomEvent('vademecum-edit-toggled', { detail: { isEdit: isEditMode } }));
}

function initSortable(element) {
    if (sortableInstance) { try { sortableInstance.destroy(); } catch (e) { } sortableInstance = null; }
    if (!window.Sortable) return;

    sortableInstance = new window.Sortable(element, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: () => {
            const currentId = navigationStack[navigationStack.length - 1];
            const nuovoOrdine = [];
            element.querySelectorAll('.vd-list-item').forEach(el => {
                const found = (treeData[currentId] || []).find(i => i.id === el.getAttribute('data-id'));
                if (found) nuovoOrdine.push(found);
            });
            // le voci nascoste (non renderizzate) restano in coda, nulla va perso
            (treeData[currentId] || []).forEach(i => { if (!nuovoOrdine.includes(i)) nuovoOrdine.push(i); });
            treeData[currentId] = nuovoOrdine;
        }
    });
}

function salvaToken() {
    const pat = $('vd-pat-input').value.trim();
    if (pat) localStorage.setItem('gh_admin_token', pat);
    chiudiModal('vd-tokenModal');
}

// ---------------------------------------------------------------- info voce
function apriInfoNodo(id) {
    const n = trovaNodo(id);
    if (!n) return;
    const nodo = n.nodo;

    let html = `<h3 style="margin:0 0 15px; color:var(--primary);"><i class="fa-solid fa-circle-info"></i> Info: ${esc(nodo.titolo)}</h3>`;

    if (isEditMode) {
        html += `
            <textarea id="vd-node-info-text" style="width:100%; min-height:150px; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-main); box-sizing:border-box; margin-bottom:15px; font-family:inherit;">${esc(nodo.infoTesto || '')}</textarea>
            <button data-vd="info-salva" data-id="${esc(id)}" style="width:100%; background:var(--success); color:#fff; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-floppy-disk"></i> Salva Informazioni</button>`;
    } else {
        html += `<div style="width:100%; min-height:100px; padding:10px; border-radius:8px; background:var(--surface); border:1px solid var(--border-color); box-sizing:border-box; white-space:pre-wrap; color:var(--text-main); line-height:1.5;">${esc(nodo.infoTesto || 'Nessuna informazione disponibile.')}</div>`;
    }

    $('vd-infoNodoContent').innerHTML = html;
    apriModal('vd-infoNodoModal');
}

function salvaInfoNodo(id) {
    const n = trovaNodo(id);
    if (!n) return;

    n.nodo.infoTesto = $('vd-node-info-text').value;
    salvaAlberoSuFirebase();
    chiudiModal('vd-infoNodoModal');

    const currentId = navigationStack[navigationStack.length - 1];
    if (n.parentKey === currentId) renderPanel(currentId, 'panel-center');
}

// ---------------------------------------------------------------- spostamento
function openMoveModal(id, tipo) {
    nodeToMove = id;
    nodeToMoveParent = navigationStack[navigationStack.length - 1];

    let forbiddenIds = [id];
    if (tipo === 'categoria') forbiddenIds = forbiddenIds.concat(getTuttiFigliCategoria(id));

    const container = $('vd-move-folder-list');
    container.innerHTML = '';
    if (nodeToMoveParent !== 'root') container.innerHTML += createMoveBtn('root', 'Principale (Vademecum)', 0);
    buildFolderTree('root', 0, forbiddenIds, container);

    apriModal('vd-moveModal');
}

function getTuttiFigliCategoria(catId) {
    let figli = [];
    (treeData[catId] || []).forEach(item => {
        if (item.tipo === 'categoria') {
            figli.push(item.id);
            figli = figli.concat(getTuttiFigliCategoria(item.id));
        }
    });
    return figli;
}

function buildFolderTree(parentId, level, forbiddenIds, container) {
    (treeData[parentId] || []).forEach(item => {
        if (item.tipo === 'categoria' && !forbiddenIds.includes(item.id)) {
            if (item.id !== nodeToMoveParent) container.innerHTML += createMoveBtn(item.id, item.titolo, level + 1);
            buildFolderTree(item.id, level + 1, forbiddenIds, container);
        }
    });
}

function createMoveBtn(id, titolo, level) {
    return `<button data-vd="move-to" data-id="${esc(id)}" style="text-align:left; padding:14px 14px 14px ${14 + level * 15}px; background:var(--surface-hover); border:1px solid var(--border-color); border-radius:10px; color:var(--text-main); font-weight:600; cursor:pointer;"><i class="fa-solid fa-folder" style="color:var(--primary); margin-right:10px;"></i> ${esc(titolo)}</button>`;
}

function eseguiSpostamento(targetParentId) {
    const idx = (treeData[nodeToMoveParent] || []).findIndex(i => i.id === nodeToMove);
    if (idx < 0) return;

    const obj = treeData[nodeToMoveParent].splice(idx, 1)[0];
    if (!treeData[targetParentId]) treeData[targetParentId] = [];
    treeData[targetParentId].push(obj);

    salvaAlberoSuFirebase();
    chiudiModal('vd-moveModal');
    renderPanel(nodeToMoveParent, 'panel-center');
}

// ---------------------------------------------------------------- apertura documenti (sottomoduli vd_*, caricati solo al bisogno)
function creaPannelloDocumento(chiave, titolo, innerHtml) {
    const old = $(`vd-panel-${chiave}`);
    if (old) old.remove();

    navigationStack.push(chiave);
    aggiornaHeader(titolo, true);

    const panel = document.createElement('div');
    panel.className = 'vd-panel panel-right';
    panel.id = `vd-panel-${chiave}`;
    panel.innerHTML = innerHtml;
    $('vd-viewport').appendChild(panel);
    effettuaScorrimento('avanti');
}

function erroreSottomodulo(containerId, e) {
    console.error('Errore sottomodulo Vademecum:', e);
    const c = $(containerId);
    if (c) c.innerHTML = `<div style="text-align:center; color:var(--danger); margin-top:40px;">Impossibile caricare questo contenuto.</div>`;
}

async function apriMappaLeaflet(id, titolo) {
    const cid = 'container-mappa-canali';
    creaPannelloDocumento('mappa_' + id, titolo, `<div id="${cid}" style="width:100%; height:100%;"></div>`);
    try {
        const { inizializzaMappaCanali } = await import('./vd_mappa.js');
        inizializzaMappaCanali(cid); // come prima: i permessi li ricava dal token
    } catch (e) { erroreSottomodulo(cid, e); }
}

async function apriScheda(id, titolo) {
    const cid = `container-scheda-${id}`;
    creaPannelloDocumento('scheda_' + id, titolo, `<div id="${cid}" style="padding-bottom:80px;"></div>`);
    try {
        const { inizializzaScheda } = await import('./vd_scheda.js');
        inizializzaScheda(cid, id, db, isAdminOrCollab);
    } catch (e) { erroreSottomodulo(cid, e); }
}

async function apriPlanimetria(id, titolo) {
    const cid = `container-plan-${id}`;
    creaPannelloDocumento('plan_' + id, titolo, `<div id="${cid}" style="width:100%; height:100%;"></div>`);
    try {
        const { inizializzaPlanimetria } = await import('./vd_planimetria.js');
        inizializzaPlanimetria(cid, id, db, isAdminOrCollab);
    } catch (e) { erroreSottomodulo(cid, e); }
}

// ---------------------------------------------------------------- cloud
async function loadTreeData() {
    try {
        const snap = await getDoc(doc(db, 'app_data', 'vademecum_tree'));
        treeData = (snap.exists() && Object.keys(snap.data()).length > 0) ? snap.data() : { root: [] };
    } catch (e) { console.error('Errore caricamento Vademecum:', e); }
}

async function salvaAlberoSuFirebase() {
    try { await setDoc(doc(db, 'app_data', 'vademecum_tree'), treeData); }
    catch (e) { console.error('Errore Sync:', e); }
}
