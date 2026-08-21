import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa il sottomodulo della mappa
import { inizializzaMappaCanali } from './vd_mappa.js';

// Configurazione Firebase (Condivisa con Utility)
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

// Struttura Dati di partenza (verrà sovrascritta da Firestore)
let treeData = {
    "root": [
        { id: "cat_sicurezza", tipo: "categoria", titolo: "Sicurezza a Bordo", icona: "fa-life-ring" },
        { id: "mappa_canali", tipo: "mappa", titolo: "Mappa Canali e Limiti", icona: "fa-map-location-dot" }
    ],
    "cat_sicurezza": [
        { id: "plan_motonave", tipo: "planimetria", titolo: "Planimetria Motonave", mezzoId: "motonave_01", icona: "fa-ship" },
        { id: "istr_estintore", tipo: "scheda", titolo: "Uso Estintori", icona: "fa-fire-extinguisher" }
    ]
};

let navigationStack = ["root"]; // Traccia il percorso corrente
let isEditMode = false;
let globalIsAdmin = false;
let globalIsCollab = false;
let sortableInstance = null;

export function avviaMotoreVademecum() {
    
    // 1. Gestione Autenticazione e Ruoli
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(doc(db, "utenti", user.uid));
            if (docSnap.exists()) {
                const userData = docSnap.data();
                globalIsAdmin = (user.uid === "xm1LR5TeiKgBfuo0Htt6q3G1LdU2"); // ID Admin
                globalIsCollab = (userData.ruolo === 'collaborator');

                // Popola Profilo
                document.getElementById('profileNome').value = userData.nome || '';
                document.getElementById('profileCognome').value = userData.cognome || '';

                // Mostra controlli speciali per lo staff
                if (globalIsAdmin || globalIsCollab) {
                    document.getElementById('sezione-token-admin').style.display = 'block';
                    document.getElementById('profilePatToken').value = localStorage.getItem('gh_admin_token') || '';
                    document.getElementById('btn-edit-mode').style.display = 'block';
                }
            }
            // Avvia il caricamento dati da DB
            await loadTreeDataFromFirebase();
            
            // Render iniziale del menu principale
            renderPanel("root", "panel-center");
        } else {
            alert("Effettua il login su Utility per accedere.");
            // Qui potresti reindirizzare a index.html se non loggato
        }
    });

    // Registra le funzioni globali per l'HTML
    window.Vademecum = {
        goBack,
        navigate,
        toggleEditMode,
        salvaProfilo,
        openAddModal: () => alert("La modale di aggiunta sarà implementata a breve.") // Placeholder
    };
}

// ==========================================
// LOGICA DI NAVIGAZIONE E DRILL-DOWN
// ==========================================

function navigate(targetId, targetTitolo, tipo) {
    if (isEditMode) return; // Disabilita navigazione in modalità modifica

    if (tipo === "categoria") {
        navigationStack.push(targetId);
        document.getElementById('vd-main-title').innerText = targetTitolo;
        document.getElementById('btn-back').style.display = 'block';
        
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
    if (navigationStack.length <= 1) return; // Già alla root
    if (isEditMode) toggleEditMode(); // Forza l'uscita dalla modalità modifica se attiva
    
    // Rimuoviamo il pannello corrente dalla cronologia
    navigationStack.pop();
    const currentId = navigationStack[navigationStack.length - 1];
    
    // Ripristina Titolo dinamicamente
    let targetTitolo = "Vademecum";
    if (currentId !== "root") {
        // Cerca il titolo del genitore scorrendo l'albero (ottimizzabile in seguito)
        for (const key in treeData) {
            const found = treeData[key].find(item => item.id === currentId);
            if (found) { targetTitolo = found.titolo; break; }
        }
    }
    
    document.getElementById('vd-main-title').innerText = targetTitolo;
    document.getElementById('btn-back').style.display = currentId === "root" ? 'none' : 'block';

    renderPanel(currentId, "panel-left");
    effettuaScorrimento("indietro");
}

function effettuaScorrimento(direzione) {
    setTimeout(() => {
        const panels = document.querySelectorAll('.vd-panel');
        if (panels.length < 2) return;

        const vecchioPannello = panels[panels.length - 2];
        const nuovoPannello = panels[panels.length - 1];

        if (direzione === "avanti") {
            vecchioPannello.classList.replace('panel-center', 'panel-left');
            nuovoPannello.classList.replace('panel-right', 'panel-center');
        } else {
            vecchioPannello.classList.replace('panel-center', 'panel-right');
            nuovoPannello.classList.replace('panel-left', 'panel-center');
        }
        
        // Pulisci il DOM rimuovendo i vecchi pannelli invisibili
        setTimeout(() => {
            if (panels.length > 2) panels[0].remove();
        }, 400);
    }, 50);
}

// ==========================================
// RENDER DEI PANNELLI LISTA
// ==========================================

function renderPanel(nodeId, positionClass) {
    const viewport = document.getElementById('viewport');
    const panel = document.createElement('div');
    panel.className = `vd-panel ${positionClass}`;
    panel.id = `panel-${nodeId}`;

    const items = treeData[nodeId] || [];
    
    if (items.length === 0) {
        panel.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:40px;">Nessuna voce presente.</div>`;
    } else {
        items.forEach(item => {
            const isNav = item.tipo === 'categoria' ? '' : 'display:none;';
            const iconColor = item.tipo === 'categoria' ? 'color:var(--primary);' : 'color:var(--text-muted);';
            
            const itemHTML = `
                <div class="vd-list-item" onclick="window.Vademecum.navigate('${item.id}', '${item.titolo}', '${item.tipo}')">
                    <div class="item-title">
                        <i class="fa-solid ${item.icona || 'fa-folder'}" style="${iconColor}"></i>
                        ${item.titolo}
                    </div>
                    <div class="edit-controls">
                        <button class="icon-btn" style="color:var(--text-muted);" onclick="event.stopPropagation(); alert('Modifica voce')"><i class="fa-solid fa-pen"></i></button>
                        <i class="fa-solid fa-grip-lines drag-handle"></i>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color:var(--border-color); ${isNav}"></i>
                </div>
            `;
            panel.insertAdjacentHTML('beforeend', itemHTML);
        });
    }

    viewport.appendChild(panel);

    if (isEditMode) initSortable(panel);
}

// ==========================================
// GESTIONE MODIFICA E DRAG & DROP
// ==========================================

function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const viewport = document.getElementById('viewport');
    const btn = document.getElementById('btn-edit-mode');
    const fab = document.getElementById('add-fab');

    if (isEditMode) {
        viewport.classList.add('edit-mode');
        btn.innerText = "Fatto";
        btn.style.background = "var(--success)";
        btn.style.color = "white";
        btn.style.borderColor = "var(--success)";
        fab.style.display = "block";
        
        const activePanel = document.querySelector('.vd-panel.panel-center');
        if (activePanel) initSortable(activePanel);
    } else {
        viewport.classList.remove('edit-mode');
        btn.innerText = "Modifica";
        btn.style.background = "rgba(217,48,37,0.1)";
        btn.style.color = "var(--danger)";
        btn.style.borderColor = "var(--danger)";
        fab.style.display = "none";
        
        if (sortableInstance) sortableInstance.destroy();
        salvaAlberoSuFirebase();
    }
}

function initSortable(element) {
    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(element, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: () => { 
            console.log("Riordinamento rilevato."); 
            // La logica di aggiornamento dell'array treeData in base al nuovo DOM andrà qui
        }
    });
}

// ==========================================
// I TEMPLATE FINALI (MAPPA, PLANIMETRIE, SCHEDE)
// ==========================================

function apriMappaLeaflet(id, titolo) {
    const mapNodeId = "mappa_" + id;
    navigationStack.push(mapNodeId);
    
    document.getElementById('vd-main-title').innerText = titolo;
    document.getElementById('btn-back').style.display = 'block';
    
    const viewport = document.getElementById('viewport');
    const panel = document.createElement('div');
    panel.className = `vd-panel panel-right`;
    panel.id = `panel-${mapNodeId}`;
    
    // Inietta il contenitore specifico per Leaflet
    panel.innerHTML = `<div id="container-mappa-canali" style="width: 100%; height: 100%;"></div>`;
    viewport.appendChild(panel);

    effettuaScorrimento("avanti");

    // Chiama il sottomodulo per avviare la mappa
    inizializzaMappaCanali("container-mappa-canali");
}

function apriPlanimetria(id, titolo) {
    const planNodeId = "plan_" + id;
    navigationStack.push(planNodeId);
    document.getElementById('vd-main-title').innerText = titolo;
    document.getElementById('btn-back').style.display = 'block';
    
    const viewport = document.getElementById('viewport');
    const panel = document.createElement('div');
    panel.className = `vd-panel panel-right`;
    panel.id = `panel-${planNodeId}`;
    
    panel.innerHTML = `<div style="text-align:center; padding: 20px;">Planimetria in costruzione...</div>`;
    viewport.appendChild(panel);

    effettuaScorrimento("avanti");
}

function apriScheda(id, titolo) {
    const schedaNodeId = "scheda_" + id;
    navigationStack.push(schedaNodeId);
    document.getElementById('vd-main-title').innerText = titolo;
    document.getElementById('btn-back').style.display = 'block';
    
    const viewport = document.getElementById('viewport');
    const panel = document.createElement('div');
    panel.className = `vd-panel panel-right`;
    panel.id = `panel-${schedaNodeId}`;
    
    panel.innerHTML = `<div style="text-align:center; padding: 20px;">Scheda operativa in costruzione...</div>`;
    viewport.appendChild(panel);

    effettuaScorrimento("avanti");
}

// ==========================================
// FUNZIONI DATI E PROFILO
// ==========================================

async function loadTreeDataFromFirebase() {
    try { 
        const snap = await getDoc(doc(db, "app_data", "vademecum_tree")); 
        if (snap.exists()) {
            treeData = snap.data(); 
        } else {
            // Se non esiste, crea la struttura iniziale sul DB
            await setDoc(doc(db, "app_data", "vademecum_tree"), treeData);
        }
    } catch(e) {
        console.error("Errore recupero albero:", e);
    }
}

async function salvaAlberoSuFirebase() {
    try {
        await setDoc(doc(db, "app_data", "vademecum_tree"), treeData);
        console.log("Albero salvato con successo.");
    } catch(e) {
        console.error("Errore salvataggio albero:", e);
    }
}

async function salvaProfilo() {
    const nome = document.getElementById('profileNome').value;
    const cognome = document.getElementById('profileCognome').value;
    
    if (globalIsAdmin || globalIsCollab) {
        const pat = document.getElementById('profilePatToken').value.trim();
        if (pat) localStorage.setItem('gh_admin_token', pat);
    }

    if (auth.currentUser) {
        try {
            await setDoc(doc(db, "utenti", auth.currentUser.uid), { nome, cognome }, { merge: true });
            alert("Profilo aggiornato!");
        } catch(e) {
            console.error("Errore aggiornamento profilo:", e);
        }
    }
    
    window.chiudiModal('profileModal');
}

