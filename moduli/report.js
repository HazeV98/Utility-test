```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// Importa il menu
import { caricaMenu } from './menu.js'; 

// Inizializza il menu all'avvio del file
caricaMenu();

const firebaseConfig = { 
    apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4", 
    authDomain: "utility-haze.firebaseapp.com", 
    projectId: "utility-haze", 
    messagingSenderId: "686237947418", 
    appId: "1:686237947418:web:f03ba19ab8fff43110a3a3" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2";
let isAdmin = false;
let vistaCronologia = false;
let currentUid = null;
let unsubscribeReports = null;

// --- GESTIONE INTERFACCIA (ESPOSTE ALL'HTML TRAMITE WINDOW) ---

window.apriModaleNuova = () => { 
    document.getElementById('modal-nuova').style.display = 'flex'; 
};
window.chiudiModaleNuova = () => {
    document.getElementById('modal-nuova').style.display = 'none';
};

window.apriModaleRisposta = (id) => { 
    document.getElementById('admin-rep-id').value = id; 
    document.getElementById('modal-risposta').style.display = 'flex'; 
};
window.chiudiModaleRisposta = () => {
    document.getElementById('modal-risposta').style.display = 'none';
};

window.toggleVistaAdmin = () => {
    vistaCronologia = !vistaCronologia;
    const btn = document.getElementById('btn-cronologia-admin');
    btn.classList.toggle('active', vistaCronologia);
    btn.innerHTML = vistaCronologia 
        ? '<i class="fa-solid fa-list-ul"></i> Torna a Segnalazioni in Attesa' 
        : '<i class="fa-solid fa-clock-rotate-left"></i> Mostra Cronologia Risposte';
    ascoltaSegnalazioni();
};

// --- GESTIONE DATI FIREBASE ---

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUid = user.uid;
        isAdmin = (user.uid === ADMIN_UID);
        
        if (isAdmin) {
            document.getElementById('btn-cronologia-admin').style.display = 'flex';
            // Il menu admin viene gestito da menu.js, ma assicuriamoci che appaia
            const menuAdmin = document.getElementById('menu-admin');
            if (menuAdmin) menuAdmin.style.display = 'flex';
        }
        ascoltaSegnalazioni();
    } else { 
        window.location.href = "index.html"; 
    }
});

function ascoltaSegnalazioni() {
    if (!currentUid) return;
    if (unsubscribeReports) unsubscribeReports();

    const colRef = collection(db, "segnalazioni");
    let q;

    if (isAdmin) {
        const statoTarget = vistaCronologia ? "risposto" : "in_attesa";
        q = query(colRef, where("stato", "==", statoTarget), orderBy("timestamp_creazione", "desc"));
    } else {
        q = query(colRef, where("mittente_uid", "==", currentUid), orderBy("timestamp_creazione", "desc"));
    }

    unsubscribeReports = onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById('reports-list');
        if(!listContainer) return;

        listContainer.innerHTML = '';

        if (snapshot.empty) {
            listContainer.innerHTML = `<div class="empty-state">Nessuna segnalazione trovata.</div>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            creaCard(docSnap.id, data, listContainer);
            
            // Gestione notifiche/lettura
            if (isAdmin && !vistaCronologia && data.letta_da_admin === false) {
                updateDoc(doc(db, "segnalazioni", docSnap.id), { letta_da_admin: true });
            } else if (!isAdmin && data.stato === "risposto" && data.letta_da_utente === false) {
                updateDoc(doc(db, "segnalazioni", docSnap.id), { letta_da_utente: true });
            }
        });
    }, (error) => {
        console.error("Errore query:", error);
    });
}

function creaCard(id, data, container) {
    const card = document.createElement('div');
    card.className = `report-card ${data.stato === 'risposto' ? 'risposto' : ''}`;
    
    let statusBadge = data.stato === 'risposto' 
        ? '<div class="status-badge status-risolto">Risolto</div>' 
        : '<div class="status-badge status-attesa">In Attesa</div>';
    
    let dot = "";
    if (isAdmin && !vistaCronologia && !data.letta_da_admin) dot = '<span class="unread-dot"></span>';
    if (!isAdmin && data.stato === 'risposto' && !data.letta_da_utente) dot = '<span class="unread-dot"></span>';

    let infoUtente = "";
    let headerName = isAdmin ? (data.mittente_nome || 'Utente Sconosciuto') : 'Tua Segnalazione';

    if (isAdmin) {
        let waIcon = "";
        let phoneInfo = "";
        
        if (data.mittente_telefono && data.mittente_telefono.trim() !== "") {
            let num = data.mittente_telefono.replace(/\D/g, '');
            if (num.length > 0) {
                if (!num.startsWith('39')) num = '39' + num;
                waIcon = `<a href="https://wa.me/${num}" target="_blank" style="color:#25D366; margin-left:12px; font-size:26px; vertical-align:middle; text-decoration:none; transition:transform 0.2s; display:inline-block;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="Contatta su WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>`;
            }
            phoneInfo = `<br><span style="color:var(--text-main); line-height: 26px;"><i class="fa-solid fa-phone" style="font-size:12px; width:16px;"></i> <b>Telefono:</b> ${data.mittente_telefono}</span> ${waIcon}`;
        }

        infoUtente = `
        <div style="font-size:13px; background:var(--surface-hover); padding:12px; border-radius:10px; margin-bottom:12px; border:1px dashed var(--border-color); color: var(--text-muted); line-height: 1.6;">
            <span style="color:var(--text-main);"><i class="fa-solid fa-hashtag" style="font-size:12px; width:16px;"></i> <b>Matricola:</b> ${data.mittente_matricola || 'N/D'}</span><br>
            <span style="color:var(--text-main);"><i class="fa-solid fa-envelope" style="font-size:12px; width:16px;"></i> <b>Email:</b> ${data.mittente_email || 'N/D'}</span>
            ${phoneInfo}
        </div>`;
    }

    let rispostaHtml = data.risposta_admin ? `
        <div class="admin-reply-box">
            <div class="admin-reply-title"><i class="fa-solid fa-reply"></i> Risposta Admin</div>
            <div class="admin-reply-text">${data.risposta_admin}</div>
            ${data.link_risposta ? `<a href="${data.link_risposta}" target="_blank" class="report-link"><i class="fa-solid fa-link"></i> Link Allegato</a>` : ''}
        </div>` : '';

    card.innerHTML = `
        ${statusBadge}
        <div class="report-sender"><i class="fa-solid fa-circle-user"></i> ${headerName} ${dot}</div>
        <div class="report-date" style="margin-bottom: ${isAdmin ? '12px' : '0'};">${new Date(data.timestamp_creazione).toLocaleString()}</div>
        ${infoUtente}
        <div class="report-body">${data.messaggio}</div>
        ${data.link_allegato ? `<a href="${data.link_allegato}" target="_blank" class="report-link"><i class="fa-solid fa-link"></i> Link Utente</a>` : ''}
        ${rispostaHtml}
        <div class="btn-group">
            ${isAdmin && data.stato === 'in_attesa' ? `<button class="btn-reply" onclick="window.apriModaleRisposta('${id}')">Rispondi</button>` : ''}
            <button class="btn-delete" onclick="window.eliminaSegnalazione('${id}')"><i class="fa-solid fa-trash"></i> Elimina</button>
        </div>
    `;
    container.appendChild(card);
}

// --- AZIONI DATABASE ESPOSTE TRAMITE WINDOW ---

window.inviaSegnalazione = async () => {
    const btn = document.getElementById('btn-salva-rep');
    const msg = document.getElementById('rep-messaggio').value.trim();
    const link = document.getElementById('rep-link').value.trim();
    if (!msg) return;

    btn.disabled = true;
    try {
        const uDoc = await getDoc(doc(db, "utenti", currentUid));
        const ud = uDoc.data() || {};
        await addDoc(collection(db, "segnalazioni"), {
            mittente_uid: currentUid,
            mittente_nome: ud.nome ? `${ud.nome} ${ud.cognome}` : auth.currentUser.email,
            mittente_matricola: ud.matricola || "N/D",
            mittente_email: auth.currentUser.email,
            mittente_telefono: ud.telefono || null,
            messaggio: msg,
            link_allegato: link || null,
            timestamp_creazione: Date.now(),
            stato: "in_attesa",
            letta_da_admin: false,
            letta_da_utente: true
        });
        window.chiudiModaleNuova();
    } catch(e) { 
        console.error("Errore invio:", e); 
    }
    btn.disabled = false;
};

window.inviaRispostaAdmin = async () => {
    const id = document.getElementById('admin-rep-id').value;
    const msg = document.getElementById('admin-rep-messaggio').value.trim();
    const link = document.getElementById('admin-rep-link').value.trim();
    if (!msg) return;

    try {
        await updateDoc(doc(db, "segnalazioni", id), {
            stato: "risposto",
            risposta_admin: msg,
            link_risposta: link || null,
            letta_da_utente: false,
            timestamp_risposta: Date.now()
        });
        window.chiudiModaleRisposta();
    } catch(e) { 
        console.error("Errore risposta:", e); 
    }
};

window.eliminaSegnalazione = async (id) => {
    if (confirm("Vuoi eliminare questa segnalazione?")) {
        try {
            await deleteDoc(doc(db, "segnalazioni", id));
        } catch (e) {
            console.error("Errore eliminazione:", e);
        }
    }
};

```
