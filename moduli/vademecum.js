import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { inizializzaMappaCanali } from './vd_mappa.js';
import { inizializzaScheda } from './vd_scheda.js';
import { inizializzaPlanimetria } from './vd_planimetria.js';

const firebaseConfig = { 
    apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4", 
    authDomain: "utility-haze.firebaseapp.com", 
    projectId: "utility-haze", 
    storageBucket: "utility-haze.firebasestorage.app", 
    messagingSenderId: "686237947418", 
    appId: "1:686237947418:web:f03ba19ab8fff43110a3a3" 
};

const app = initializeApp(firebaseConfig); 
const auth = getAuth(app); 
const db = getFirestore(app);

// Inizializza albero vuoto
let treeData = { "root": [] };

let navigationStack = ["root"];
let isEditMode = false;
let globalIsAdmin = false;
let globalIsCollab = false;
let sortableInstance = null;

export function avviaMotoreVademecum() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(doc(db, "utenti", user.uid));
            if (docSnap.exists()) {
                const userData = docSnap.data();
                globalIsAdmin = (user.uid === "xm1LR5TeiKgBfuo0Htt6q3G1LdU2");
                globalIsCollab = (userData.ruolo === 'collaborator');

                if (globalIsAdmin || globalIsCollab) {
                    document.getElementById('adminPatToken').value = localStorage.getItem('gh_admin_token') || '';
                    document.getElementById('btn-edit-mode').style.display = 'flex';
                }
            }
            await loadTreeDataFromFirebase();
            renderPanel("root", "panel-center");
        } else {
            alert("Effettua il login su Utility per accedere.");
            window.location.href = "index.html";
        }
    });

    window.Vademecum = { 
        goBack, navigate, toggleEditMode, salvaToken,
        openAddModal, openEditNodeModal, salvaNodo, eliminaNodo,
        openMoveModal, eseguiSpostamento
    };
}

// ==========================================
// LOGICA DI NAVIGAZIONE E DRILL-DOWN
// ==========================================

function navigate(targetId, targetTitolo, tipo) {
    if (isEditMode) return; 

    if (tipo === "categoria") {
        navigationStack.push(targetId);
        aggiornaHeader(targetTitolo, true);
        renderPanel(targetId, "panel-right");
        effettuaScorrimento("avanti");
    } else if (tipo === "mappa") {
        apriMappaLeaflet(targetId, targetTitolo);
    } else if (tipo === "planimetria") {
        apriPlanimetria(targetId, targetTitolo);
    } else if (tipo === "scheda") {
        apriScheda(targetId, targetTitolo);
    }
}

function goBack() {
    if (navigationStack.length <= 1) return;
    if (isEditMode) toggleEditMode(); 
    
    navigationStack.pop();
    const currentId = navigationStack[navigationStack.length - 1];
    
    let targetTitolo = "Vademecum";
    let isSub = false;
    if (currentId !== "root") {
        isSub = true;
        for (const key in treeData) {
            const found = treeData[key].find(item => item.id === currentId);
            if (found) { targetTitolo = found.titolo; break; }
        }
    }
    
    aggiornaHeader(targetTitolo, isSub);
    renderPanel(currentId, "panel-left");
    effettuaScorrimento("indietro");
}

function aggiornaHeader(titolo, isSottocategoria) {
    document.getElementById('vd-main-title').innerText = titolo;
    document.getElementById('btn-back').style.display = isSottocategoria ? 'block' : 'none';
    
    const container = document.getElementById('header-title-container');
    if (isSottocategoria) {
        container.classList.replace('text-center', 'text-left');
    } else {
        container.classList.replace('text-left', 'text-center');
    }
}

function effettuaScorrimento(direzione) {
    setTimeout(() => {
        const panels = document.querySelectorAll('.vd-panel');
        if (panels.length < 2) return;
        const o = panels[panels.length - 2], n = panels[panels.length - 1];
        if (direzione === "avanti") { o.classList.replace('panel-center', 'panel-left'); n.classList.replace('panel-right', 'panel-center'); } 
        else { o.classList.replace('panel-center', 'panel-right'); n.classList.replace('panel-left', 'panel-center'); }
        setTimeout(() => { if (panels.length > 2) panels[0].remove(); }, 400);
    }, 50);
}

function renderPanel(nodeId, positionClass) {
    const viewport = document.getElementById('viewport');
    if (positionClass === "panel-center") {
        const existing = document.getElementById(`panel-${nodeId}`);
        if(existing) existing.remove();
    }
    
    const panel = document.createElement('div');
    panel.className = `vd-panel ${positionClass}`;
    panel.id = `panel-${nodeId}`;

    const items = treeData[nodeId] || [];
    
    if (items.length === 0) {
        panel.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:40px;">Nessuna voce presente. <br> Premi la matita in alto per aggiungerne una.</div>`;
    } else {
        items.forEach(item => {
            const isNav = item.tipo === 'categoria' ? '' : 'display:none;';
            const iconColor = item.tipo === 'categoria' ? 'color:var(--primary);' : 'color:var(--text-muted);';
            const safeTitle = item.titolo.replace(/'/g, "\\'");
            
            const itemHTML = `
                <div class="vd-list-item" data-id="${item.id}" onclick="window.Vademecum.navigate('${item.id}', '${safeTitle}', '${item.tipo}')">
                    <div class="item-title"><i class="fa-solid ${item.icona || 'fa-folder'}" style="${iconColor}"></i> ${item.titolo}</div>
                    <div class="edit-controls">
                        <button class="icon-btn" style="color:#17a2b8; width:32px; height:32px;" onclick="event.stopPropagation(); window.Vademecum.openMoveModal('${item.id}', '${item.tipo}')">
                            <i class="fa-solid fa-arrow-right-to-bracket" style="font-size:14px;"></i>
                        </button>
                        <button class="icon-btn" style="color:var(--text-muted); width:32px; height:32px;" onclick="event.stopPropagation(); window.Vademecum.openEditNodeModal('${item.id}', '${safeTitle}', '${item.icona}', '${item.tipo}')">
                            <i class="fa-solid fa-pen" style="font-size:14px;"></i>
                        </button>
                        <i class="fa-solid fa-grip-lines drag-handle"></i>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color:var(--border-color); ${isNav}"></i>
                </div>`;
            panel.insertAdjacentHTML('beforeend', itemHTML);
        });
    }
    viewport.appendChild(panel);
    if (isEditMode) initSortable(panel);
}

// ==========================================
// EDITOR ALBERO (AGGIUNTA / MODIFICA / ORDINE)
// ==========================================

function openAddModal() {
    document.getElementById('nodeModalTitle').innerHTML = '<i class="fa-solid fa-plus"></i> Nuova Voce';
    document.getElementById('nodeId').value = "";
    document.getElementById('nodeTitolo').value = "";
    document.getElementById('nodeIcona').value = "fa-folder";
    
    document.getElementById('sezione-tipo-nodo').style.display = "block";
    document.getElementById('nodeTipo').value = "categoria";
    document.getElementById('btn-elimina-nodo').style.display = "none";
    
    const currentId = navigationStack[navigationStack.length - 1];
    document.getElementById('nodeParent').value = currentId;
    
    window.apriModal('nodeModal');
}

function openEditNodeModal(id, titolo, icona, tipo) {
    document.getElementById('nodeModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Modifica Voce';
    document.getElementById('nodeId').value = id;
    document.getElementById('nodeTitolo').value = titolo;
    document.getElementById('nodeIcona').value = icona || '';
    
    document.getElementById('sezione-tipo-nodo').style.display = "none";
    document.getElementById('btn-elimina-nodo').style.display = "block";
    
    const currentId = navigationStack[navigationStack.length - 1];
    document.getElementById('nodeParent').value = currentId;
    
    window.apriModal('nodeModal');
}

function salvaNodo() {
    const id = document.getElementById('nodeId').value;
    const parent = document.getElementById('nodeParent').value;
    const titolo = document.getElementById('nodeTitolo').value.trim();
    let icona = document.getElementById('nodeIcona').value.trim() || 'fa-folder';
    const tipo = document.getElementById('nodeTipo').value;
    
    if (!icona.includes('fa-')) icona = 'fa-solid fa-' + icona;

    if (!titolo) return alert("Inserisci un titolo valido.");
    if (!treeData[parent]) treeData[parent] = [];
    
    if (id) {
        const item = treeData[parent].find(i => i.id === id);
        if(item) {
            item.titolo = titolo;
            item.icona = icona;
        }
    } else {
        const newId = tipo + "_" + Date.now();
        treeData[parent].push({
            id: newId,
            titolo: titolo,
            icona: icona,
            tipo: tipo
        });
        if (tipo === 'categoria') treeData[newId] = []; 
    }
    
    window.chiudiModal('nodeModal');
    salvaAlberoSuFirebase();
    renderPanel(parent, "panel-center"); 
}

function eliminaNodo() {
    if(!confirm("Attenzione: Sei sicuro di voler eliminare questa voce? Se è una scheda, anche il testo e tutti i file multimediali collegati verranno eliminati dal server definitivamente.")) return;
    
    const id = document.getElementById('nodeId').value;
    const parent = document.getElementById('nodeParent').value;
    const nodo = treeData[parent].find(i => i.id === id);
    
    // Se è una scheda, lancia la pulizia in background (non blocca l'interfaccia)
    if (nodo && nodo.tipo === 'scheda') {
        puliziaFileGitHub(nodo.id);
    }
    
    // Elimina immediatamente dall'interfaccia e salva l'albero
    treeData[parent] = treeData[parent].filter(i => i.id !== id);
    if (treeData[id]) delete treeData[id]; 
    
    window.chiudiModal('nodeModal');
    salvaAlberoSuFirebase();
    renderPanel(parent, "panel-center");
}

async function puliziaFileGitHub(schedaId) {
    const token = localStorage.getItem('gh_admin_token');
    if (!token) return;
    
    const GH_OWNER = "hazev98"; 
    const GH_REPO = "Utility";
    const pathScheda = `assets/schede/${schedaId}.json`;
    
    try {
        // 1. Legge il file JSON prima di cancellarlo, per scoprire quali foto conteneva
        const resScheda = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${pathScheda}?t=${Date.now()}`, { headers: { 'Authorization': `token ${token}` }});
        
        if (resScheda.ok) {
            const fileData = await resScheda.json();
            const jsonStr = decodeURIComponent(escape(atob(fileData.content)));
            const datiScheda = JSON.parse(jsonStr);
            
            // 2. Cicla ed elimina tutti i media collegati
            if (datiScheda.media && datiScheda.media.length > 0) {
                for (const mediaPath of datiScheda.media) {
                    const resMedia = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${mediaPath}`, { headers: { 'Authorization': `token ${token}` }});
                    if (resMedia.ok) {
                        const mediaSha = (await resMedia.json()).sha;
                        await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${mediaPath}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: `Pulizia media scheda eliminata`, sha: mediaSha })
                        });
                    }
                }
            }
            
            // 3. Infine, elimina il file JSON della scheda stessa
            await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${pathScheda}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Eliminata scheda ${schedaId}`, sha: fileData.sha })
            });
        }
    } catch(e) { console.error("Errore pulizia in background:", e); }
}


function toggleEditMode() {
    isEditMode = !isEditMode;
    const viewport = document.getElementById('viewport');
    const icona = document.getElementById('edit-icon');
    const btnToken = document.getElementById('btn-token-admin');
    const fab = document.getElementById('add-fab');

    if (isEditMode) {
        viewport.classList.add('edit-mode');
        icona.className = "fa-solid fa-check"; icona.style.color = "var(--success)";
        btnToken.style.display = "flex";
        fab.style.display = "block";
        const activePanel = document.querySelector('.vd-panel.panel-center');
        if (activePanel) initSortable(activePanel);
        
        window.dispatchEvent(new CustomEvent('vademecum-edit-toggled', { detail: { isEdit: true } }));
    } else {
        viewport.classList.remove('edit-mode');
        icona.className = "fa-solid fa-pen"; icona.style.color = "var(--primary)";
        btnToken.style.display = "none";
        fab.style.display = "none";
        
        // FIX: Distruzione sicura dell'istanza per permettere riutilizzi multipli
        if (sortableInstance) {
            try { sortableInstance.destroy(); } catch(e) {}
            sortableInstance = null;
        }
        
        salvaAlberoSuFirebase();
        
        window.dispatchEvent(new CustomEvent('vademecum-edit-toggled', { detail: { isEdit: false } }));
    }
}

function initSortable(element) {
    // FIX: Previene il crash se l'istanza è già stata annullata o è in uno stato appeso
    if (sortableInstance) {
        try { sortableInstance.destroy(); } catch(e) {}
        sortableInstance = null;
    }
    
    sortableInstance = new Sortable(element, { 
        handle: '.drag-handle', 
        animation: 150,
        onEnd: () => {
            const currentId = navigationStack[navigationStack.length - 1];
            const nuovoOrdine = [];
            
            element.querySelectorAll('.vd-list-item').forEach(el => {
                const itemId = el.getAttribute('data-id');
                const found = treeData[currentId].find(i => i.id === itemId);
                if (found) nuovoOrdine.push(found);
            });
            
            treeData[currentId] = nuovoOrdine;
        }
    });
}


function salvaToken() {
    const pat = document.getElementById('adminPatToken').value.trim();
    if (pat) localStorage.setItem('gh_admin_token', pat);
    window.chiudiModal('tokenModal');
}

// ==========================================
// LOGICA SPOSTAMENTO (FILE E CARTELLE)
// ==========================================

let nodeToMove = null;
let nodeToMoveParent = null;

function openMoveModal(id, tipo) {
    nodeToMove = id;
    nodeToMoveParent = navigationStack[navigationStack.length - 1];

    let forbiddenIds = [id];
    if (tipo === 'categoria') {
        forbiddenIds = forbiddenIds.concat(getTuttiFigliCategoria(id));
    }

    const container = document.getElementById('move-folder-list');
    container.innerHTML = '';

    if (nodeToMoveParent !== 'root') {
         container.innerHTML += createMoveBtn('root', 'Principale (Vademecum)', 0);
    }

    buildFolderTree('root', 0, forbiddenIds, container);

    window.apriModal('moveModal');
}

function getTuttiFigliCategoria(catId) {
    let figli = [];
    if (treeData[catId]) {
        treeData[catId].forEach(item => {
            if (item.tipo === 'categoria') {
                figli.push(item.id);
                figli = figli.concat(getTuttiFigliCategoria(item.id));
            }
        });
    }
    return figli;
}

function buildFolderTree(parentId, level, forbiddenIds, container) {
    if (!treeData[parentId]) return;
    
    treeData[parentId].forEach(item => {
        if (item.tipo === 'categoria') {
            if (!forbiddenIds.includes(item.id)) {
                if (item.id !== nodeToMoveParent) {
                    container.innerHTML += createMoveBtn(item.id, item.titolo, level + 1);
                }
                buildFolderTree(item.id, level + 1, forbiddenIds, container);
            }
        }
    });
}

function createMoveBtn(id, titolo, level) {
    const padding = level * 15;
    return `<button style="text-align:left; padding: 14px 14px 14px ${14 + padding}px; background:var(--surface-hover); border:1px solid var(--border-color); border-radius:10px; color:var(--text-main); font-weight:600; cursor:pointer;" onclick="window.Vademecum.eseguiSpostamento('${id}')"><i class="fa-solid fa-folder" style="color:var(--primary); margin-right:10px;"></i> ${titolo}</button>`;
}

function eseguiSpostamento(targetParentId) {
    const idx = treeData[nodeToMoveParent].findIndex(i => i.id === nodeToMove);
    if(idx > -1) {
        const obj = treeData[nodeToMoveParent].splice(idx, 1)[0];
        
        if (!treeData[targetParentId]) treeData[targetParentId] = [];
        treeData[targetParentId].push(obj);
        
        salvaAlberoSuFirebase();
        window.chiudiModal('moveModal');
        
        renderPanel(nodeToMoveParent, "panel-center");
    }
}

// ==========================================
// INIZIALIZZAZIONE COMPONENTI FINALI
// ==========================================

function apriMappaLeaflet(id, titolo) {
    const existing = document.getElementById(`panel-mappa_${id}`);
    if (existing) existing.remove(); // FIX BUG DOM

    navigationStack.push("mappa_" + id);
    aggiornaHeader(titolo, true);
    const panel = document.createElement('div');
    panel.className = `vd-panel panel-right`; panel.id = `panel-mappa_${id}`;
    panel.innerHTML = `<div id="container-mappa-canali" style="width: 100%; height: 100%;"></div>`;
    document.getElementById('viewport').appendChild(panel);
    effettuaScorrimento("avanti");
    inizializzaMappaCanali("container-mappa-canali");
}

function apriScheda(id, titolo) {
    const existing = document.getElementById(`panel-scheda_${id}`);
    if (existing) existing.remove(); // FIX BUG DOM

    navigationStack.push("scheda_" + id);
    aggiornaHeader(titolo, true);
    const panel = document.createElement('div');
    panel.className = `vd-panel panel-right`; panel.id = `panel-scheda_${id}`;
    panel.innerHTML = `<div id="container-scheda-${id}" style="width: 100%; height: 100%; overflow-y:auto; padding-bottom: 40px;"></div>`;
    document.getElementById('viewport').appendChild(panel);
    effettuaScorrimento("avanti");
    inizializzaScheda(`container-scheda-${id}`, id, db, (globalIsAdmin || globalIsCollab));
}

function apriPlanimetria(id, titolo) {
    const existing = document.getElementById(`panel-plan_${id}`);
    if (existing) existing.remove(); // FIX BUG DOM

    navigationStack.push("plan_" + id);
    aggiornaHeader(titolo, true);
    const panel = document.createElement('div');
    panel.className = `vd-panel panel-right`; panel.id = `panel-plan_${id}`;
    panel.innerHTML = `<div id="container-plan-${id}" style="width: 100%; height: 100%;"></div>`;
    document.getElementById('viewport').appendChild(panel);
    effettuaScorrimento("avanti");
    inizializzaPlanimetria(`container-plan-${id}`, id, db, (globalIsAdmin || globalIsCollab));
}

// ==========================================
// SALVATAGGIO CLOUD 
// ==========================================

async function loadTreeDataFromFirebase() {
    try { 
        const snap = await getDoc(doc(db, "app_data", "vademecum_tree")); 
        if (snap.exists() && Object.keys(snap.data()).length > 0) {
            treeData = snap.data(); 
        } else {
            treeData = { "root": [] }; 
        }
    } catch(e) { console.error(e); }
}

async function salvaAlberoSuFirebase() {
    try { await setDoc(doc(db, "app_data", "vademecum_tree"), treeData); } 
    catch(e) { console.error("Errore Sync:", e); }
}
