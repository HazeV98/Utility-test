import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variabili globali interne al modulo
let db;
let auth;
let currentUid;
let isAdmin = false;
let vistaCronologia = false;
let unsubscribeReports = null;

// Funzione principale esposta a index.js per avviare il modulo
export function avviaMotoreSegnalazioni(database, authentication, uid, userIsAdmin) {
    db = database;
    auth = authentication;
    currentUid = uid;
    isAdmin = userIsAdmin;

    if (isAdmin) {
        document.getElementById('btn-cronologia-admin').style.display = 'flex';
    } else {
        document.getElementById('btn-cronologia-admin').style.display = 'none';
    }
    
    ascoltaSegnalazioni();
}

// --- GESTIONE INTERFACCIA MODALI SECONDARIE ---

window.apriModaleNuovaSegnalazione = () => { 
    document.getElementById('modal-nuova-segnalazione').style.display = 'flex'; 
};
window.chiudiModaleNuovaSegnalazione = () => {
    document.getElementById('modal-nuova-segnalazione').style.display = 'none';
};

window.apriModaleRispostaSegnalazione = (id) => { 
    document.getElementById('admin-rep-id').value = id; 
    document.getElementById('modal-risposta-segnalazione').style.display = 'flex'; 
};
window.chiudiModaleRispostaSegnalazione = () => {
    document.getElementById('modal-risposta-segnalazione').style.display = 'none';
};

window.toggleVistaAdminSegnalazioni = () => {
    vistaCronologia = !vistaCronologia;
    const btn = document.getElementById('btn-cronologia-admin');
    
    if(vistaCronologia) {
        btn.style.backgroundColor = "var(--info-light)";
        btn.style.borderColor = "var(--info)";
        btn.style.color = "var(--info)";
    } else {
        btn.style.backgroundColor = "var(--surface)";
        btn.style.borderColor = "var(--border-color)";
        btn.style.color = "var(--text-main)";
    }

    btn.innerHTML = vistaCronologia 
        ? '<i class="fa-solid fa-list-ul"></i> Torna a Segnalazioni in Attesa' 
        : '<i class="fa-solid fa-clock-rotate-left"></i> Mostra Cronologia Risposte';
    ascoltaSegnalazioni();
};

// --- GESTIONE DATI FIREBASE ---

function ascoltaSegnalazioni() {
    if (!currentUid || !db) return;
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
            listContainer.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-size:15px; background:var(--surface-hover); border-radius:12px; border:1px dashed var(--border-color); margin-top:10px;">Nessuna segnalazione trovata.</div>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            creaCardSegnalazione(docSnap.id, data, listContainer);
            
            // Gestione notifiche/lettura
            if (isAdmin && !vistaCronologia && data.letta_da_admin === false) {
                updateDoc(doc(db, "segnalazioni", docSnap.id), { letta_da_admin: true });
            } else if (!isAdmin && data.stato === "risposto" && data.letta_da_utente === false) {
                updateDoc(doc(db, "segnalazioni", docSnap.id), { letta_da_utente: true });
            }
        });
    }, (error) => {
        console.error("Errore query segnalazioni:", error);
    });
}

function creaCardSegnalazione(id, data, container) {
    const isRisposto = data.stato === 'risposto';
    const cardBorderColor = isRisposto ? 'var(--success)' : 'var(--info)';
    
    const card = document.createElement('div');
    card.style.cssText = `background: var(--surface); padding: 20px; border-radius: 14px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; border-left: 6px solid ${cardBorderColor}; position: relative; margin-bottom: 15px; animation: slideInUp 0.3s ease both;`;
    
    let statusBadge = isRisposto 
        ? '<div style="position:absolute; top:16px; right:16px; font-size:11px; font-weight:700; padding:4px 8px; border-radius:6px; text-transform:uppercase; background:rgba(15,157,88,0.15); color:var(--success);">Risolto</div>' 
        : '<div style="position:absolute; top:16px; right:16px; font-size:11px; font-weight:700; padding:4px 8px; border-radius:6px; text-transform:uppercase; background:var(--warning-light); color:var(--warning);">In Attesa</div>';
    
    let dot = "";
    if (isAdmin && !vistaCronologia && !data.letta_da_admin) dot = '<span style="width:10px; height:10px; background:var(--danger); border-radius:50%; display:inline-block; margin-left:5px; box-shadow:0 0 5px var(--danger);"></span>';
    if (!isAdmin && isRisposto && !data.letta_da_utente) dot = '<span style="width:10px; height:10px; background:var(--danger); border-radius:50%; display:inline-block; margin-left:5px; box-shadow:0 0 5px var(--danger);"></span>';

    let infoUtente = "";
    let headerName = isAdmin ? (data.mittente_nome || 'Utente Sconosciuto') : 'Tua Segnalazione';

    if (isAdmin) {
        let waIcon = "";
        let phoneInfo = "";
        
        if (data.mittente_telefono && data.mittente_telefono.trim() !== "") {
            let num = data.mittente_telefono.replace(/\D/g, '');
            if (num.length > 0) {
                if (!num.startsWith('39')) num = '39' + num;
                waIcon = `<a href="https://wa.me/${num}" target="_blank" style="color:#25D366; margin-left:12px; font-size:26px; vertical-align:middle; text-decoration:none;"><i class="fa-brands fa-whatsapp"></i></a>`;
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
        <div style="margin-top:8px; border-left:3px solid var(--success); padding-left:12px;">
            <div style="font-size:12px; font-weight:700; color:var(--success); margin-bottom:4px; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-reply"></i> Risposta Admin</div>
            <div style="font-size:14px; color:var(--text-main); font-style:italic; white-space:pre-wrap;">${data.risposta_admin}</div>
            ${data.link_risposta ? `<a href="${data.link_risposta}" target="_blank" style="font-size:13px; color:var(--info); text-decoration:none; display:inline-flex; align-items:center; gap:5px; margin-top:5px; font-weight:500;"><i class="fa-solid fa-link"></i> Link Allegato</a>` : ''}
        </div>` : '';

    let linkUtenteHtml = data.link_allegato ? `<a href="${data.link_allegato}" target="_blank" style="font-size:13px; color:var(--info); text-decoration:none; display:inline-flex; align-items:center; gap:5px; margin-top:5px; font-weight:500;"><i class="fa-solid fa-link"></i> Link Utente</a>` : '';

    let btnRispondi = (isAdmin && data.stato === 'in_attesa') ? `<button style="background:var(--success); color:white; border:none; padding:10px; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; flex:1; display:flex; justify-content:center; align-items:center; gap:6px;" onclick="window.apriModaleRispostaSegnalazione('${id}')">Rispondi</button>` : '';

    card.innerHTML = `
        ${statusBadge}
        <div style="font-weight:800; font-size:16px; color:var(--info); display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-circle-user"></i> ${headerName} ${dot}</div>
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:${isAdmin ? '12px' : '0'};">${new Date(data.timestamp_creazione).toLocaleString()}</div>
        ${infoUtente}
        <div style="font-size:14px; color:var(--text-main); background:var(--surface-hover); padding:14px; border-radius:10px; line-height:1.5; white-space:pre-wrap;">${data.messaggio}</div>
        ${linkUtenteHtml}
        ${rispostaHtml}
        <div style="display:flex; gap:10px; margin-top:5px;">
            ${btnRispondi}
            <button style="background:var(--surface); color:var(--danger); border:1px solid var(--danger); padding:10px; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; flex:1; display:flex; justify-content:center; align-items:center; gap:6px;" onclick="window.eliminaSegnalazione('${id}')"><i class="fa-solid fa-trash"></i> Elimina</button>
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
        window.chiudiModaleNuovaSegnalazione();
        document.getElementById('rep-messaggio').value = ""; // Pulisce
        document.getElementById('rep-link').value = "";
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
        window.chiudiModaleRispostaSegnalazione();
        document.getElementById('admin-rep-messaggio').value = "";
        document.getElementById('admin-rep-link').value = "";
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
