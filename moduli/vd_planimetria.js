import { getDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const GH_OWNER = "TUO_USERNAME"; // Sostituisci
const GH_REPO = "TUO_REPO";      // Sostituisci

let dbPlan;
let idPlanAttivo;
let planData = { imgUrl: null, pins: [] };
let isStaff = false;
let isEditMode = false;
let pinInDrag = null;

export function inizializzaPlanimetria(containerId, planId, database, isUserStaff) {
    dbPlan = database;
    idPlanAttivo = planId;
    isStaff = isUserStaff;
    
    // Controlla lo stato di modifica ereditato dalla barra superiore
    isEditMode = document.getElementById('viewport').classList.contains('edit-mode');
    
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div id="plan-wrapper" style="position: relative; width: 100%; border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); background: var(--surface);">
            <div id="plan-empty-state" style="padding: 40px 20px; text-align: center; display: none;">
                <i class="fa-regular fa-image" style="font-size: 40px; color: var(--text-muted); margin-bottom: 15px;"></i>
                <p style="color: var(--text-muted);">Nessuna planimetria caricata.</p>
                <button id="btn-upload-plan" class="btn-action" style="margin-top: 15px; display: none;" onclick="document.getElementById('plan-file-input').click()"><i class="fa-solid fa-upload"></i> Carica Immagine Base</button>
                <input type="file" id="plan-file-input" accept="image/*" style="display:none;" onchange="window.Plan.caricaImmagineBase(event)">
            </div>
            
            <img id="plan-bg-img" src="" style="width: 100%; display: none; user-select: none; pointer-events: none;" />
            <div id="plan-pins-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" onclick="window.Plan.aggiungiPin(event)"></div>
        </div>

        <div id="plan-edit-tools" style="display: none; margin-top: 15px; text-align: center; font-size: 13px; color: var(--warning); font-weight: 600;">
            <i class="fa-solid fa-circle-info"></i> Clicca sulla mappa per aggiungere un Pin. Trascina per spostarlo.
        </div>
    `;

    window.Plan = { caricaImmagineBase, aggiungiPin, gestisciDragStart, gestisciDragMove, gestisciDragEnd, cliccaPin };

    // Ascolta i cambi di stato Edit provenienti dal file principale
    window.addEventListener('vademecum-edit-toggled', ascoltaCambioEdit);

    caricaDatiPlanimetria();
}

async function caricaDatiPlanimetria() {
    try {
        const snap = await getDoc(doc(dbPlan, "vademecum_planimetrie", idPlanAttivo));
        if (snap.exists()) {
            planData = snap.data();
            if (!planData.pins) planData.pins = [];
            disegnaPlanimetria();
        } else {
            mostraVuoto();
        }
    } catch(e) { console.error("Errore planimetria:", e); }
    aggiornaUI();
}

function mostraVuoto() {
    document.getElementById('plan-bg-img').style.display = 'none';
    document.getElementById('plan-empty-state').style.display = 'block';
}

function disegnaPlanimetria() {
    if (!planData.imgUrl) { mostraVuoto(); return; }
    
    document.getElementById('plan-empty-state').style.display = 'none';
    const imgElement = document.getElementById('plan-bg-img');
    const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${planData.imgUrl}`;
    
    imgElement.src = rawUrl;
    imgElement.style.display = 'block';
    
    disegnaPins();
}

function disegnaPins() {
    const container = document.getElementById('plan-pins-container');
    container.innerHTML = ''; // Pulisce
    
    planData.pins.forEach((pin, index) => {
        const pinDiv = document.createElement('div');
        // Usa pointer-events per far passare il click al container quando in Drag, altrimenti blocca l'evento
        pinDiv.style = `
            position: absolute; top: ${pin.y}%; left: ${pin.x}%; 
            transform: translate(-50%, -50%);
            width: 34px; height: 34px; border-radius: 50%;
            background: ${pin.colore || 'var(--danger)'}; color: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); border: 2px solid white;
            cursor: ${isEditMode ? 'grab' : 'pointer'};
            transition: ${isEditMode ? 'none' : 'transform 0.2s'};
        `;
        pinDiv.innerHTML = `<i class="fa-solid ${pin.icona || 'fa-fire-extinguisher'}"></i>`;
        
        if (isEditMode) {
            // Logica Drag (Mobile & Mouse)
            pinDiv.addEventListener('mousedown', (e) => window.Plan.gestisciDragStart(e, index));
            pinDiv.addEventListener('touchstart', (e) => window.Plan.gestisciDragStart(e, index), {passive: false});
        } else {
            // Logica Navigazione o Info
            pinDiv.onclick = (e) => window.Plan.cliccaPin(e, index);
        }
        
        container.appendChild(pinDiv);
    });
}

function aggiornaUI() {
    if (isStaff && isEditMode) {
        document.getElementById('plan-edit-tools').style.display = 'block';
        if (!planData.imgUrl) document.getElementById('btn-upload-plan').style.display = 'inline-block';
    } else {
        document.getElementById('plan-edit-tools').style.display = 'none';
        document.getElementById('btn-upload-plan').style.display = 'none';
    }
    disegnaPins(); // Ridisegna per aggiornare eventi e cursori
}

function ascoltaCambioEdit(e) {
    isEditMode = e.detail.isEdit;
    
    // Se siamo appena usciti dalla modalità modifica, salva i pin su DB
    if (!isEditMode && planData.imgUrl) {
        setDoc(doc(dbPlan, "vademecum_planimetrie", idPlanAttivo), planData, { merge: true });
    }
    
    aggiornaUI();
}

// --- LOGICA GESTIONE PIN E DRAG ---

function aggiungiPin(e) {
    if (!isEditMode || !planData.imgUrl) return;
    
    // Calcola coordinate % rispetto al contenitore
    const rect = document.getElementById('plan-pins-container').getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    
    const targetScheda = prompt("Inserisci ID Scheda da collegare (lascia vuoto per creare un pin senza link):");
    
    planData.pins.push({
        x: xPercent.toFixed(2),
        y: yPercent.toFixed(2),
        schedaId: targetScheda || null,
        icona: "fa-circle-exclamation",
        colore: "#0f9d58"
    });
    
    disegnaPins();
}

// Variabili temporanee Drag
let dragObj = null;

function gestisciDragStart(e, index) {
    e.preventDefault(); e.stopPropagation();
    dragObj = { index: index, target: e.currentTarget };
    
    document.addEventListener('mousemove', window.Plan.gestisciDragMove);
    document.addEventListener('mouseup', window.Plan.gestisciDragEnd);
    document.addEventListener('touchmove', window.Plan.gestisciDragMove, {passive: false});
    document.addEventListener('touchend', window.Plan.gestisciDragEnd);
}

function gestisciDragMove(e) {
    if (!dragObj) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const container = document.getElementById('plan-pins-container');
    const rect = container.getBoundingClientRect();
    
    let xP = ((clientX - rect.left) / rect.width) * 100;
    let yP = ((clientY - rect.top) / rect.height) * 100;
    
    // Limita nei bordi
    xP = Math.max(0, Math.min(100, xP));
    yP = Math.max(0, Math.min(100, yP));
    
    dragObj.target.style.left = `${xP}%`;
    dragObj.target.style.top = `${yP}%`;
    
    // Aggiorna dati in ram
    planData.pins[dragObj.index].x = xP.toFixed(2);
    planData.pins[dragObj.index].y = yP.toFixed(2);
}

function gestisciDragEnd(e) {
    document.removeEventListener('mousemove', window.Plan.gestisciDragMove);
    document.removeEventListener('mouseup', window.Plan.gestisciDragEnd);
    document.removeEventListener('touchmove', window.Plan.gestisciDragMove);
    document.removeEventListener('touchend', window.Plan.gestisciDragEnd);
    dragObj = null;
}

function cliccaPin(e, index) {
    e.stopPropagation();
    const pin = planData.pins[index];
    
    if (pin.schedaId) {
        // Se c'è un collegamento, sfrutta la navigazione principale
        window.Vademecum.navigate(pin.schedaId, "Scheda Operativa", "scheda");
    } else {
        alert("Questo pin è solo un indicatore visivo e non ha una scheda associata.");
    }
}

// --- LOGICA UPLOAD IMMAGINE (Stessa tecnica delle schede) ---

async function caricaImmagineBase(event) {
    const file = event.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('gh_admin_token');
    if (!token) { alert("Inserisci il Token GitHub cliccando la Chiave in alto a destra!"); return; }

    const btnUpload = document.getElementById('btn-upload-plan');
    btnUpload.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Upload...`;
    
    try {
        const ext = file.name.split('.').pop().toLowerCase();
        const githubPath = `assets/planimetrie/${idPlanAttivo}_bg_${Date.now()}.${ext}`;
        
        // Converti in B64
        const reader = new FileReader();
        const base64Content = await new Promise((res, rej) => {
            reader.readAsDataURL(file);
            reader.onload = () => res(reader.result.split(',')[1]);
            reader.onerror = e => rej(e);
        });

        // Carica su GitHub
        const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${githubPath}`, {
            method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Base Planimetria ${idPlanAttivo}`, content: base64Content })
        });
        
        if (!res.ok) throw new Error("Upload fallito");

        // Salva DB e ridisegna
        planData.imgUrl = githubPath;
        await setDoc(doc(dbPlan, "vademecum_planimetrie", idPlanAttivo), planData, { merge: true });
        disegnaPlanimetria();
        
    } catch(e) {
        alert("Errore upload immagine base.");
    } finally {
        btnUpload.innerHTML = `<i class="fa-solid fa-upload"></i> Carica Immagine Base`;
    }
}
 
