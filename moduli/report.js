import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, where, orderBy, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let db;
let auth;
let currentUid;
let isAdmin = false;
let vistaCronologia = false;
let unsubscribeReports = null;
let segnalazioniLocali = {}; 
let chatApertaId = null;     

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

window.apriModaleNuovaSegnalazione = () => { 
    document.getElementById('modal-nuova-segnalazione').style.display = 'flex'; 
};
window.chiudiModaleNuovaSegnalazione = () => {
    document.getElementById('modal-nuova-segnalazione').style.display = 'none';
};

window.apriChatSegnalazione = (id) => {
    try {
        chatApertaId = id;
        const modal = document.getElementById('modal-chat-segnalazione');
        if (modal) {
            modal.style.display = 'flex';
            renderizzaChatInterna(id);
        } else {
            console.error("Modale chat non trovata nel DOM!");
        }
    } catch(e) {
        console.error("Errore apertura chat:", e);
    }
};

window.chiudiChatModal = () => {
    chatApertaId = null;
    const modal = document.getElementById('modal-chat-segnalazione');
    if (modal) modal.style.display = 'none';
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
        ? '<i class="fa-solid fa-list-ul"></i> Torna a Chat Attive' 
        : '<i class="fa-solid fa-clock-rotate-left"></i> Mostra Cronologia Risolte';
    ascoltaSegnalazioni();
};

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
        segnalazioniLocali = {}; 

        if (snapshot.empty) {
            listContainer.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-size:15px; background:var(--surface-hover); border-radius:12px; border:1px dashed var(--border-color); margin-top:10px;">Nessuna conversazione trovata.</div>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            segnalazioniLocali[docSnap.id] = data; 
            creaCardSegnalazione(docSnap.id, data, listContainer);
            
            // Auto-lettura quando la schermata è aperta
            if (isAdmin && !vistaCronologia && data.letta_da_admin === false) {
                updateDoc(doc(db, "segnalazioni", docSnap.id), { letta_da_admin: true });
            } else if (!isAdmin && data.letta_da_utente === false) {
                updateDoc(doc(db, "segnalazioni", docSnap.id), { letta_da_utente: true });
            }
        });

        if (chatApertaId && segnalazioniLocali[chatApertaId]) {
            renderizzaChatInterna(chatApertaId);
        }
    }, (error) => {
        console.error("Errore query segnalazioni:", error);
    });
}

function creaCardSegnalazione(id, data, container) {
    const isRisolto = data.stato === 'risposto';
    const cardBorderColor = isRisolto ? 'var(--success)' : 'var(--info)';
    
    const card = document.createElement('div');
    card.style.cssText = `background: var(--surface); padding: 20px; border-radius: 14px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; border-left: 6px solid ${cardBorderColor}; position: relative; margin-bottom: 15px; animation: slideInUp 0.3s ease both;`;
    
    let statusBadge = isRisolto 
        ? '<div style="position:absolute; top:16px; right:16px; font-size:11px; font-weight:700; padding:4px 8px; border-radius:6px; text-transform:uppercase; background:rgba(15,157,88,0.15); color:var(--success);">Risolto</div>' 
        : `<button style="position:absolute; top:16px; right:16px; font-size:11px; font-weight:700; padding:4px 8px; border-radius:6px; text-transform:uppercase; background:var(--success); color:white; border:none; cursor:pointer; display:flex; align-items:center; gap:5px; transition:0.2s; box-shadow:0 2px 5px rgba(0,0,0,0.2);" onclick="window.segnaRisolto('${id}')"><i class="fa-solid fa-check"></i> Segna Risolto</button>`;
    
    let dot = "";
    if (isAdmin && !vistaCronologia && !data.letta_da_admin) dot = '<span style="width:10px; height:10px; background:var(--danger); border-radius:50%; display:inline-block; margin-left:5px; box-shadow:0 0 5px var(--danger);"></span>';
    if (!isAdmin && !data.letta_da_utente) dot = '<span style="width:10px; height:10px; background:var(--danger); border-radius:50%; display:inline-block; margin-left:5px; box-shadow:0 0 5px var(--danger);"></span>';

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

    let chat = [...(data.storico_chat || [])];
    if (chat.length === 0) {
        chat.push({ autore: 'user', testo: data.messaggio, timestamp: data.timestamp_creazione, link: data.link_allegato });
        if (data.risposta_admin) {
            chat.push({ autore: 'admin', testo: data.risposta_admin, timestamp: data.timestamp_risposta || data.timestamp_creazione, link: data.link_risposta });
        }
    }

    const ultimoMsg = chat[chat.length - 1] || { autore: 'user', testo: data.messaggio };
    const isAdminMsg = ultimoMsg.autore === 'admin';

    let chatPreviewHtml = `
        <div style="font-size:14px; color:var(--text-main); background:var(--surface-hover); padding:14px; border-radius:10px; line-height:1.5; white-space:pre-wrap; border-left: 3px solid ${isAdminMsg ? 'var(--success)' : 'var(--info)'};">
            <div style="font-size:11px; font-weight:bold; margin-bottom:6px; color:${isAdminMsg ? 'var(--success)' : 'var(--info)'}; display:flex; align-items:center; gap:5px;"><i class="fa-solid ${isAdminMsg ? 'fa-reply' : 'fa-user'}"></i> ${isAdminMsg ? 'Ultima risposta (Admin)' : 'Ultimo messaggio'}</div>
            ${ultimoMsg.testo}
            ${ultimoMsg.link ? `<br><a href="${ultimoMsg.link}" target="_blank" style="font-size:13px; color:var(--info); text-decoration:none; display:inline-flex; align-items:center; gap:5px; margin-top:5px; font-weight:500;"><i class="fa-solid fa-link"></i> Link Allegato</a>` : ''}
        </div>
    `;

    let deleteBtn = `<button style="background:var(--surface); color:var(--danger); border:1px solid var(--danger); padding:10px; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; flex:1; display:flex; justify-content:center; align-items:center; gap:6px;" onclick="window.eliminaSegnalazione('${id}')"><i class="fa-solid fa-trash"></i> Elimina</button>`;
    
    let actionsHtml = isRisolto ? `
        <div style="display:flex; gap:10px; margin-top:5px;">
            <button style="background:var(--surface-hover); color:var(--info); border:1px solid var(--info); padding:10px; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; flex:2; display:flex; justify-content:center; align-items:center; gap:6px;" onclick="window.apriChatSegnalazione('${id}')"><i class="fa-solid fa-comments"></i> Cronologia Messaggi</button>
            ${deleteBtn}
        </div>
    ` : `
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:5px;">
            <div style="display:flex; gap:10px;">
                <button style="background:var(--surface-hover); color:var(--info); border:1px solid var(--info); padding:10px; border-radius:10px; font-weight:600; font-size:13px; cursor:pointer; flex:2; display:flex; justify-content:center; align-items:center; gap:6px;" onclick="window.apriChatSegnalazione('${id}')"><i class="fa-solid fa-comments"></i> Vedi messaggi</button>
                ${deleteBtn}
            </div>
            <div style="display:flex; gap:8px;">
                <textarea id="quick-reply-${id}" rows="1" placeholder="Scrivi una risposta..." style="flex:1; padding:12px; border-radius:10px; border:1px solid var(--border-color); background:var(--surface); color:var(--text-main); font-family:inherit; resize:none;"></textarea>
                <button style="background:var(--info); color:white; border:none; padding:10px 15px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; width:45px;" onclick="window.inviaRispostaChat('${id}', 'quick-reply-${id}')"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    card.innerHTML = `
        ${statusBadge}
        <div style="font-weight:800; font-size:16px; color:var(--info); display:flex; align-items:center; gap:6px; margin-top: 10px;"><i class="fa-solid fa-circle-user"></i> ${headerName} ${dot}</div>
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:${isAdmin ? '12px' : '0'};">${new Date(data.timestamp_creazione).toLocaleString()}</div>
        ${infoUtente}
        ${chatPreviewHtml}
        ${actionsHtml}
    `;
    container.appendChild(card);
}

function renderizzaChatInterna(id) {
    const data = segnalazioniLocali[id];
    if (!data) return;
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML = '';
    
    let chat = [...(data.storico_chat || [])];
    if (chat.length === 0) {
        chat.push({ autore: 'user', testo: data.messaggio, timestamp: data.timestamp_creazione, link: data.link_allegato });
        if (data.risposta_admin) {
            chat.push({ autore: 'admin', testo: data.risposta_admin, timestamp: data.timestamp_risposta || data.timestamp_creazione, link: data.link_risposta });
        }
    }

    chat.forEach(msg => {
        const isMe = (isAdmin && msg.autore === 'admin') || (!isAdmin && msg.autore === 'user');
        const align = isMe ? 'flex-end' : 'flex-start';
        const bg = isMe ? 'var(--info)' : 'var(--surface)';
        const color = isMe ? '#fff' : 'var(--text-main)';
        const border = isMe ? '14px 14px 0px 14px' : '14px 14px 14px 0px';
        const borderStyle = isMe ? 'none' : '1px solid var(--border-color)';
        
        container.innerHTML += `
            <div style="display:flex; flex-direction:column; align-items:${align}; margin-bottom:12px; width: 100%;">
                <div style="background:${bg}; color:${color}; padding:10px 14px; max-width:85%; border-radius:${border}; border:${borderStyle}; font-size:14px; white-space:pre-wrap; box-shadow:var(--shadow-sm); line-height: 1.4;">
                    ${msg.testo}
                    ${msg.link ? `<br><a href="${msg.link}" target="_blank" style="font-size:12px; color:${isMe ? '#fff' : 'var(--info)'}; text-decoration:underline; display:inline-flex; align-items:center; gap:5px; margin-top:5px;"><i class="fa-solid fa-link"></i> Link</a>` : ''}
                </div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">${new Date(msg.timestamp).toLocaleString()}</div>
            </div>
        `;
    });
    
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);

    const btnSend = document.getElementById('btn-invia-chat-modal');
    const inputField = document.getElementById('input-chat-modal');
    if(!btnSend || !inputField) return;
    
    const newBtnSend = btnSend.cloneNode(true);
    btnSend.parentNode.replaceChild(newBtnSend, btnSend);
    
    const isRisolto = data.stato === 'risposto';
    if(isRisolto) {
        inputField.disabled = true;
        inputField.placeholder = "Segnalazione risolta.";
        newBtnSend.disabled = true;
        newBtnSend.style.opacity = '0.5';
    } else {
        inputField.disabled = false;
        inputField.placeholder = "Scrivi un messaggio...";
        newBtnSend.disabled = false;
        newBtnSend.style.opacity = '1';
        newBtnSend.onclick = () => window.inviaRispostaChat(id, 'input-chat-modal');
        
        inputField.onkeypress = (e) => {
            if(e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.inviaRispostaChat(id, 'input-chat-modal');
            }
        };
    }
}

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
            storico_chat: [{ 
                autore: 'user', 
                testo: msg, 
                timestamp: Date.now(), 
                link: link || null 
            }],
            timestamp_creazione: Date.now(),
            stato: "in_attesa",
            letta_da_admin: false,
            letta_da_utente: true
        });
        window.chiudiModaleNuovaSegnalazione();
        document.getElementById('rep-messaggio').value = ""; 
        document.getElementById('rep-link').value = "";
    } catch(e) { 
        console.error("Errore invio:", e); 
    }
    btn.disabled = false;
};

window.inviaRispostaChat = async (id, inputId) => {
    const input = document.getElementById(inputId);
    if(!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    input.disabled = true;
    try {
        const updateData = {
            storico_chat: arrayUnion({ 
                autore: isAdmin ? 'admin' : 'user', 
                testo: msg, 
                timestamp: Date.now() 
            }),
            letta_da_admin: isAdmin,
            letta_da_utente: !isAdmin
        };

        // Se è l'utente a scrivere in una vecchia chat risolta, la riapre e avvisa l'admin
        if (!isAdmin) {
            updateData.stato = "in_attesa"; 
        }

        await updateDoc(doc(db, "segnalazioni", id), updateData);
        input.value = "";
    } catch(e) { 
        console.error("Errore invio chat:", e); 
    }
    input.disabled = false;
    input.focus();
};

window.segnaRisolto = async (id) => {
    if (confirm("Vuoi contrassegnare questo ticket come risolto?")) {
        try {
            await updateDoc(doc(db, "segnalazioni", id), {
                stato: "risposto",
                letta_da_utente: false // Notifica all'utente la chiusura
            });
            if(chatApertaId === id) window.chiudiChatModal();
        } catch(e) {
            console.error("Errore chiusura:", e);
        }
    }
};

window.eliminaSegnalazione = async (id) => {
    if (confirm("Vuoi eliminare questa segnalazione e la sua chat?")) {
        try {
            await deleteDoc(doc(db, "segnalazioni", id));
            if(chatApertaId === id) window.chiudiChatModal();
        } catch (e) {
            console.error("Errore eliminazione:", e);
        }
    }
};
