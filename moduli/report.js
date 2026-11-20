import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, where, orderBy, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let db;
let auth;
let currentUid;
let isAdmin = false;
let vistaCronologia = false;
let unsubscribeReports = null;
let segnalazioniLocali = {}; 
let chatApertaId = null;     

export function initUISegnalazioni() {
    // Rimuove eventuali modali duplicate per evitare bug nell'apertura
    ['modal-segnalazioni-main', 'modal-nuova-segnalazione', 'modal-chat-segnalazione'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    const uiHTML = `
    <!-- MODALI SEGNALAZIONI MAIN -->
    <div id="modal-segnalazioni-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-segnalazioni-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-segnalazioni-main')"></i>
            <h3 style="margin-top: 0; color: var(--info); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-headset"></i> Segnalazioni</h3>
            <div style="flex: 1; overflow-y: auto; padding-right: 5px;">
                <button style="background-color: var(--info); color: white; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; box-shadow: 0 4px 12px rgba(0, 136, 255, 0.3); width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px; transition: all 0.2s; margin-bottom: 15px;" onclick="window.apriModaleNuovaSegnalazione()"><i class="fa-solid fa-paper-plane"></i> Nuova Domanda</button>
                <button id="btn-cronologia-admin" style="display: none; background-color: var(--surface); color: var(--text-main); border: 2px solid var(--border-color); padding: 14px; font-size: 14px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; width: 100%; justify-content: center; align-items: center; gap: 10px; transition: all 0.2s; margin-bottom: 15px;" onclick="window.toggleVistaAdminSegnalazioni()"><i class="fa-solid fa-clock-rotate-left"></i> Mostra Cronologia Risolte</button>
                <div id="reports-list"></div>
            </div>
            <button class="btn-modal" style="background: transparent; color: var(--danger); border: 2px solid var(--danger); margin-top: 15px;" onclick="window.chiudiModal('modal-segnalazioni-main')"><i class="fa-solid fa-xmark"></i> Chiudi Finestra</button>
        </div>
    </div>

    <!-- MODALE CREA NUOVA -->
    <div id="modal-nuova-segnalazione" class="modal-overlay" style="z-index: 7500;">
        <div class="modal-content">
            <h3 style="margin-top:0; border-bottom:1px solid var(--border-color); padding-bottom:15px; text-align:center;"><i class="fa-solid fa-paper-plane" style="color:var(--info);"></i> Invia Domanda</h3>
            <div class="float-wrapper">
                <textarea id="rep-messaggio" rows="4" class="input-field" placeholder=" " style="resize: vertical;"></textarea>
                <label style="top: 20px;">Messaggio / Problema</label>
            </div>
            <div class="float-wrapper">
                <input type="url" id="rep-link" class="input-field" placeholder=" ">
                <label>Link Allegato (Facoltativo)</label>
            </div>
            <button id="btn-salva-rep" class="btn-action" style="background-color: var(--info);" onclick="window.inviaSegnalazione()"><i class="fa-solid fa-paper-plane"></i> Invia ora</button>
            <button class="btn-modal" style="background-color: transparent; color: var(--text-muted); border: 1px solid var(--border-color);" onclick="window.chiudiModaleNuovaSegnalazione()">Annulla</button>
        </div>
    </div>

    <!-- MODALE CHAT SEGNALAZIONE -->
    <div id="modal-chat-segnalazione" class="modal-overlay" style="z-index: 7600; display:none;" onclick="if(event.target === this) window.chiudiChatModal()">
        <div class="modal-content" style="height: 80vh; max-width: 500px; display:flex; flex-direction:column; padding:0; overflow:hidden;">
            <!-- Header Chat -->
            <div style="padding: 15px 20px; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--surface);">
                <h3 style="margin:0; font-size:16px; color:var(--info); display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-comments"></i> Chat Ticket</h3>
                <i class="fa-solid fa-xmark" style="font-size:22px; cursor:pointer; color:var(--text-muted); transition:0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiChatModal()"></i>
            </div>
            
            <!-- Area Messaggi -->
            <div id="chat-messages-container" style="flex:1; overflow-y:auto; padding:20px; background:rgba(0,0,0,0.02); display:flex; flex-direction:column;">
                <!-- I fumetti vengono generati dinamicamente da JavaScript -->
            </div>
            
            <!-- Barra Input Chat -->
            <div style="padding:15px; border-top:1px solid var(--border-color); background:var(--surface); display:flex; gap:10px; align-items:flex-end;">
                <textarea id="input-chat-modal" rows="1" placeholder="Scrivi un messaggio..." style="flex:1; resize:none; padding:12px 15px; border-radius:20px; border:1px solid var(--border-color); background:var(--surface-hover); outline:none; font-family:inherit; color:var(--text-main); line-height:1.4;"></textarea>
                <button id="btn-invia-chat-modal" style="background:var(--info); color:white; border:none; width:45px; height:45px; border-radius:50%; cursor:pointer; display:flex; justify-content:center; align-items:center; flex-shrink:0; transition:0.2s;"><i class="fa-solid fa-paper-plane" style="font-size: 16px;"></i></button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

export function avviaMotoreSegnalazioni(database, authentication, uidOrUserData, userIsAdmin) {
    if (!document.getElementById('modal-segnalazioni-main')) {
        initUISegnalazioni();
    }

    db = database;
    auth = authentication;
    currentUid = auth?.currentUser?.uid || (typeof uidOrUserData === 'string' ? uidOrUserData : uidOrUserData?.uid);
    isAdmin = userIsAdmin;

    const btnCronologia = document.getElementById('btn-cronologia-admin');
    if (btnCronologia) {
        btnCronologia.style.display = isAdmin ? 'flex' : 'none';
    }
    
    ascoltaSegnalazioni();
}

function formattaData(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

window.apriModaleSegnalazioni = async () => {
    const modal = document.getElementById('modal-segnalazioni-main');
    if (modal) modal.style.display = 'flex';
    
    const uidAttivo = auth?.currentUser?.uid || currentUid;
    if (uidAttivo && typeof uidAttivo === 'string' && db) {
        try {
            const updateData = isAdmin ? 
                { ultimo_accesso_segnalazioni_admin: Date.now() } : 
                { ultimo_accesso_segnalazioni: Date.now() };
            await updateDoc(doc(db, "utenti", uidAttivo), updateData);
        } catch(e) {
            console.error("Errore salvataggio accesso report:", e);
        }
    }
};

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
    if (!currentUid || typeof currentUid !== 'string' || !db) return;
    if (unsubscribeReports) unsubscribeReports();

    const colRef = collection(db, "segnalazioni");
    let q;

    // USIAMO "timestamp_creazione" COME PRIMA, COSI' FIREBASE NON VA IN ERRORE PER L'INDICE MANCANTE
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

        // CARICHIAMO I TICKET IN UN ARRAY PER ORDINARLI IN LOCALE TRAMITE JAVASCRIPT
        let ticketList = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if(!data.timestamp_ultimo_messaggio) data.timestamp_ultimo_messaggio = data.timestamp_creazione;
            ticketList.push({ id: docSnap.id, data: data });
        });

        // ORDINAMENTO IN TEMPO REALE (CHAT PIÙ RECENTE IN ALTO)
        ticketList.sort((a, b) => b.data.timestamp_ultimo_messaggio - a.data.timestamp_ultimo_messaggio);

        // Riallinea il badge notifica sull'icona del modulo (index.js)
        if (window.controllaSegnalazioni) window.controllaSegnalazioni();

        // STAMPIAMO I TICKET SULLO SCHERMO
        ticketList.forEach(ticket => {
            segnalazioniLocali[ticket.id] = ticket.data; 
            creaCardSegnalazione(ticket.id, ticket.data, listContainer);
            
            if (isAdmin && !vistaCronologia && ticket.data.letta_da_admin === false) {
                updateDoc(doc(db, "segnalazioni", ticket.id), { letta_da_admin: true });
            } else if (!isAdmin && ticket.data.letta_da_utente === false) {
                updateDoc(doc(db, "segnalazioni", ticket.id), { letta_da_utente: true });
            }
        });

        if (chatApertaId && segnalazioniLocali[chatApertaId]) {
            renderizzaChatInterna(chatApertaId);
        }
    }, (error) => {
        console.error("Errore query segnalazioni:", error);
        const listContainer = document.getElementById('reports-list');
        if (listContainer) {
            listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger); font-size:13px; background:var(--surface-hover); border-radius:12px; border:1px solid var(--danger); margin-top:10px;">Errore caricamento segnalazioni: ${error.code || error.message}</div>`;
        }
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
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:${isAdmin ? '12px' : '0'}; display:flex; gap:5px; align-items:center;"><i class="fa-regular fa-clock"></i> Aggiornato: ${formattaData(data.timestamp_ultimo_messaggio)}</div>
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
                <div style="font-size:10px; color:var(--text-muted); margin-top:4px; font-weight: 500;">${formattaData(msg.timestamp)}</div>
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
    const msgInput = document.getElementById('rep-messaggio');
    const linkInput = document.getElementById('rep-link');
    const msg = msgInput.value.trim();
    const link = linkInput.value.trim();
    if (!msg) return;

    const uidAttivo = auth?.currentUser?.uid || currentUid;
    if (!uidAttivo || typeof uidAttivo !== 'string' || !db) {
        alert("Sessione non valida. Ricarica la pagina e riprova.");
        return;
    }

    btn.disabled = true;
    try {
        const uDoc = await getDoc(doc(db, "utenti", uidAttivo));
        const ud = uDoc.data() || {};
        const userEmail = auth?.currentUser?.email || ud.email || "N/D";
        const now = Date.now();
        
        await addDoc(collection(db, "segnalazioni"), {
            mittente_uid: uidAttivo,
            mittente_nome: ud.nome ? `${ud.nome} ${ud.cognome || ''}`.trim() : userEmail,
            mittente_matricola: ud.matricola || "N/D",
            mittente_email: userEmail,
            mittente_telefono: ud.telefono || null,
            messaggio: msg, 
            link_allegato: link || null,
            storico_chat: [{ 
                autore: 'user', 
                testo: msg, 
                timestamp: now, 
                link: link || null 
            }],
            timestamp_creazione: now,
            timestamp_ultimo_messaggio: now, 
            stato: "in_attesa",
            letta_da_admin: false,
            letta_da_utente: true
        });
        window.chiudiModaleNuovaSegnalazione();
        msgInput.value = ""; 
        linkInput.value = "";
    } catch(e) { 
        console.error("Errore invio:", e);
        alert("Errore durante l'invio: " + (e.code || e.message));
    } finally {
        btn.disabled = false;
    }
};

window.inviaRispostaChat = async (id, inputId) => {
    const input = document.getElementById(inputId);
    if(!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    input.disabled = true;
    
    // Svuotiamo IMMEDIATAMENTE il campo di testo per dare feedback visivo
    input.value = "";

    try {
        const now = Date.now();
        const updateData = {
            storico_chat: arrayUnion({ 
                autore: isAdmin ? 'admin' : 'user', 
                testo: msg, 
                timestamp: now 
            }),
            timestamp_ultimo_messaggio: now, 
            letta_da_admin: isAdmin,
            letta_da_utente: !isAdmin
        };

        if (!isAdmin) {
            updateData.stato = "in_attesa"; 
        }

        await updateDoc(doc(db, "segnalazioni", id), updateData);
    } catch(e) { 
        console.error("Errore invio chat:", e); 
        // Se c'è stato un errore, rimettiamo il testo
        const currentInput = document.getElementById(inputId);
        if(currentInput) currentInput.value = msg;
    }
    
    // Ripristiniamo la possibilità di scrivere usando l'elemento nel DOM aggiornato
    const currentInput = document.getElementById(inputId);
    if(currentInput) {
        currentInput.disabled = false;
        currentInput.focus();
    }
};

window.segnaRisolto = async (id) => {
    if (confirm("Vuoi contrassegnare questo ticket come risolto?")) {
        try {
            await updateDoc(doc(db, "segnalazioni", id), {
                stato: "risposto",
                letta_da_utente: false, 
                timestamp_ultimo_messaggio: Date.now() 
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
