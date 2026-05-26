import { collection, getDocs, getDoc, setDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";

let ddsDatesArray = [];

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

    // --- INIZIO AGGIUNTA: Rimozione avviso dal menù ---
    const badgeAvvisoMenu = document.getElementById('ID_DEL_TUO_BADGE_MENU');
    if (badgeAvvisoMenu) {
        badgeAvvisoMenu.style.display = 'none'; 
    }
    window.dispatchEvent(new Event('bacheca-utility-letta'));
    // --- FINE AGGIUNTA ---

    window.caricaBacheca();
}

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
    if(ddsDatesArray.length === 0) { 
        container.innerHTML = `<span style="color:var(--text-muted); font-size: 13px;">Nessuna data aggiunta.</span>`; 
    } else { 
        ddsDatesArray.forEach(d => { 
            container.innerHTML += `<div class="date-tag">${d} <span class="date-tag-remove" onclick="window.rimuoviDataSingola('${d}')"><i class="fa-solid fa-xmark"></i></span></div>`; 
        }); 
    }
};

window.segnaComeLetto = async (msgId) => {
    const ctx = window.bachecaContext;
    if (!ctx || !ctx.auth.currentUser) return;
    const key = 'letto_' + msgId;
    if (localStorage.getItem(key)) return; 
    try {
        const readRef = doc(ctx.db, "bacheca_utility", msgId, "letture", ctx.auth.currentUser.uid);
        await setDoc(readRef, { nome: ctx.currentUserFullName, data_lettura: Date.now() }, { merge: true });
        localStorage.setItem(key, 'true');
    } catch(e) { 
        console.log("Impossibile salvare la lettura"); 
    }
};

window.caricaBacheca = async () => {
    const ctx = window.bachecaContext;
    if (!ctx) return;
    
    const container = document.getElementById('lista-messaggi');
    const stateApp = JSON.parse(localStorage.getItem('myTurniApp')) || {};
    const pid = stateApp.profiloAttivoId || 'default';
    const profileObj = stateApp.profiliSalvati ? stateApp.profiliSalvati[pid] : stateApp;
    const rotazioneUtente = profileObj ? profileObj.depositoAttivo : null;
    const oggiStr = new Date().toISOString().split('T')[0];

    container.innerHTML = `<div class="status-message"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary);"></i> Caricamento annunci...</div>`;

    try {
        const q = query(collection(ctx.db, "bacheca_utility"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        
        container.innerHTML = "";
        let msgsMostrati = 0;

        snap.forEach(d => { 
            let m = d.data(); 
            m.id = d.id; 
            
            if (m.scadenza && m.scadenza < oggiStr) return; 
            if (!ctx.isPrivilegedUser && m.target && m.target !== "tutti") {
                if (!rotazioneUtente || !m.target.includes(rotazioneUtente)) return;
            }

            window.segnaComeLetto(m.id);
            msgsMostrati++;
            const dataObj = new Date(m.timestamp);
            const dataFormattata = dataObj.toLocaleDateString('it-IT') + " alle " + dataObj.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
            
            let extraHTML = "";
            let cardClass = "card";

            if (m.tipo === "dds") {
                cardClass += " card-dds";
                extraHTML += `<div class="msg-title-dds"><i class="fa-solid fa-triangle-exclamation"></i> DDS: ${m.titolo_dds}</div>`;
                if (m.date_validita) {
                    extraHTML += `<div style="font-size: 14px; color: var(--danger); margin-bottom: 12px; font-weight: 600;"><i class="fa-regular fa-calendar-check"></i> Date valide: <b>${m.date_validita}</b></div>`;
                }
            }

            if (m.target && m.target !== "tutti" && ctx.isPrivilegedUser) {
                extraHTML += `<div style="font-size: 11px; background: var(--primary-glow); color: var(--primary); display: inline-flex; align-items:center; gap:6px; padding: 4px 8px; border-radius: 6px; margin-bottom: 12px; font-weight:600;"><i class="fa-solid fa-bullseye"></i> Mirato a specifiche rotazioni</div><br>`;
            }

            if (m.link) {
                extraHTML += `<a href="${m.link}" target="_blank" class="msg-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Apri Link Esterno</a>`;
            }

            let sondaggioHTML = "";
            if (m.sondaggio_opzioni && m.sondaggio_opzioni.length > 0) {
                sondaggioHTML = `<div id="sondaggio-${m.id}" style="margin-top: 16px;"><div style="font-size:13px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento sondaggio...</div></div>`;
                let isMulti = m.sondaggio_multi === true;
                window.calcolaSondaggio(m.id, m.sondaggio_opzioni, isMulti);
            }

            let adminBtn = ctx.isPrivilegedUser ? `<button class="btn-delete" onclick="window.eliminaMessaggio('${m.id}')"><i class="fa-solid fa-trash-can"></i> Elimina</button>` : '';
            
            let topPosVisite = ctx.isPrivilegedUser ? '52px' : '16px';
            let infoBtn = (ctx.auth.currentUser && ctx.auth.currentUser.uid === "xm1LR5TeiKgBfuo0Htt6q3G1LdU2") 
                ? `<button class="btn-outline" style="position: absolute; top: ${topPosVisite}; right: 16px; padding: 6px 10px; font-size: 12px; background: var(--surface); z-index: 10;" onclick="window.mostraLetture('${m.id}')"><i class="fa-solid fa-eye"></i> Visite</button>` 
                : '';

            container.innerHTML += `
                <div class="${cardClass}">
                    ${adminBtn}
                    ${infoBtn}
                    <div class="msg-date"><i class="fa-regular fa-calendar"></i> Pubblicato il ${dataFormattata}</div>
                    ${extraHTML}
                    <div class="msg-text">${m.testo}</div>
                    ${sondaggioHTML}
                </div>
            `;
        });

        if (msgsMostrati === 0) {
            container.innerHTML = `<div class="status-message"><i class="fa-regular fa-envelope-open" style="font-size:32px; color:var(--text-muted); margin-bottom:10px;"></i> Nessun avviso in bacheca.</div>`;
        }
    } catch (e) { 
        container.innerHTML = `<div class="status-message" style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Errore caricamento: ${e.message}</div>`; 
    }
};

window.calcolaSondaggio = async (msgId, opzioni, isMulti) => {
    const ctx = window.bachecaContext;
    if (!ctx) return;
    try {
        const snap = await getDocs(collection(ctx.db, "bacheca_utility", msgId, "voti"));
        let conteggi = {};
        opzioni.forEach(opt => conteggi[opt] = 0);
        
        let mieScelte = []; 
        let totPartecipanti = 0; 

        snap.forEach(d => {
            const v = d.data();
            let scelteUtente = Array.isArray(v.scelte) ? v.scelte : (v.scelta ? [v.scelta] : []);
            if (scelteUtente.length > 0) {
                totPartecipanti++;
                scelteUtente.forEach(s => { 
                    if (conteggi[s] !== undefined) conteggi[s]++; 
                });
            }
            if (d.id === ctx.auth.currentUser.uid) mieScelte = scelteUtente;
        });

        let adminVotiBtn = (ctx.auth.currentUser && ctx.auth.currentUser.uid === "xm1LR5TeiKgBfuo0Htt6q3G1LdU2") 
            ? `<button class="btn-outline" style="padding: 4px 10px; font-size: 12px; background: var(--surface); margin-left: 12px;" onclick="window.mostraVotiDettaglio('${msgId}')"><i class="fa-solid fa-users-viewfinder"></i> Voti</button>` 
            : '';

        let tipoText = isMulti ? "(Risposte multiple)" : "(Risposta singola)";
        let html = `<div style="background: var(--surface-hover); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 15px; font-weight: 700; color: var(--primary); margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap:8px;">
                        <i class="fa-solid fa-chart-pie"></i> Sondaggio
                        ${adminVotiBtn}
                    </div>
                    <span style="font-weight: 500; font-size: 13px; color: var(--text-muted); background:var(--bg-color); padding:4px 8px; border-radius:6px; border:1px solid var(--border-color);">${totPartecipanti} partecipanti</span>
                </div>
                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${tipoText}</div>`;

        opzioni.forEach(opt => {
            const isMio = mieScelte.includes(opt);
            const voti = conteggi[opt];
            const percentuale = totPartecipanti > 0 ? Math.round((voti / totPartecipanti) * 100) : 0;
            const testoVoti = isMulti ? `${voti} voti` : `${voti} (${percentuale}%)`;
            const btnStyle = isMio ? "background: var(--primary); color: white; border-color: var(--primary);" : "background: var(--surface); color: var(--primary); border-color: var(--primary);";
            const safeOpt = opt.replace(/'/g, "\\'"); 
            
            html += `<button class="btn-outline" style="width: 100%; margin-bottom: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; ${btnStyle} box-shadow:var(--shadow-sm);" onclick="window.inviaVotoSondaggio('${msgId}', '${safeOpt}', ${isMulti})">
                    <span style="font-weight: 600; font-size: 15px; display:flex; align-items:center; gap:8px;">${isMio ? '<i class="fa-solid fa-check"></i> ' : ''}${opt}</span>
                    <span style="font-size: 14px; font-weight:500;">${testoVoti}</span>
                </button>`;
        });
        html += `</div>`;
        document.getElementById(`sondaggio-${msgId}`).innerHTML = html;
    } catch(e) { 
        document.getElementById(`sondaggio-${msgId}`).innerHTML = `<div style="color:var(--danger); font-size:13px;"><i class="fa-solid fa-triangle-exclamation"></i> Errore caricamento voti.</div>`; 
    }
};

window.inviaVotoSondaggio = async (msgId, scelta, isMulti) => {
    const ctx = window.bachecaContext;
    if (!ctx || !ctx.auth.currentUser) return;
    try {
        const votoRef = doc(ctx.db, "bacheca_utility", msgId, "voti", ctx.auth.currentUser.uid);
        if (isMulti) {
            const docSnap = await getDoc(votoRef);
            let attuali = docSnap.exists() ? (Array.isArray(docSnap.data().scelte) ? docSnap.data().scelte : (docSnap.data().scelta ? [docSnap.data().scelta] : [])) : [];
            attuali = attuali.includes(scelta) ? attuali.filter(s => s !== scelta) : [...attuali, scelta];
            await setDoc(votoRef, { scelte: attuali, timestamp: Date.now() }, { merge: true });
        } else {
            await setDoc(votoRef, { scelte: [scelta], timestamp: Date.now() }, { merge: true });
        }
        window.caricaBacheca(); 
    } catch(e) { 
        alert("Errore durante la votazione."); 
    }
};

window.mostraLetture = async (msgId) => {
    const ctx = window.bachecaContext;
    document.getElementById('modal-letture').style.display = 'flex';
    const container = document.getElementById('lista-letture');
    container.innerHTML = `<div class="status-message"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>`;
    try {
        const snap = await getDocs(collection(ctx.db, "bacheca_utility", msgId, "letture"));
        let html = "";
        snap.forEach(d => {
            const data = d.data();
            const dateStr = new Date(data.data_lettura).toLocaleDateString('it-IT') + " - " + new Date(data.data_lettura).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
            html += `<div style="padding: 14px 10px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 700; font-size: 15px; color: var(--text-main);">${data.nome}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${dateStr}</div></div>`;
        });
        container.innerHTML = html || `<div class="status-message">Nessuno ha ancora visualizzato.</div>`;
    } catch(e) { 
        container.innerHTML = `<div class="status-message" style="color:var(--danger);">Errore.</div>`; 
    }
};

window.mostraVotiDettaglio = async (msgId) => {
    const ctx = window.bachecaContext;
    document.getElementById('modal-voti').style.display = 'flex';
    const container = document.getElementById('lista-voti-dettaglio');
    container.innerHTML = `<div class="status-message"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>`;

    try {
        const snapVoti = await getDocs(collection(ctx.db, "bacheca_utility", msgId, "voti"));
        if (snapVoti.empty) {
            container.innerHTML = `<div class="status-message">Nessuno ha ancora votato.</div>`;
            return;
        }

        const snapUtenti = await getDocs(collection(ctx.db, "utenti"));
        let mappaUtenti = {};
        snapUtenti.forEach(d => {
            const u = d.data();
            const omo = u.progressivo ? ` ${u.progressivo}` : '';
            mappaUtenti[d.id] = `${u.cognome || ''} ${u.nome || ''}${omo}`.trim() || 'Utente Sconosciuto';
        });

        let html = "";
        snapVoti.forEach(d => {
            const v = d.data();
            const userName = mappaUtenti[d.id] || 'Utente Sconosciuto';
            let scelte = Array.isArray(v.scelte) ? v.scelte.join(", ") : (v.scelta || "Nessuna scelta");
            const dateStr = v.timestamp ? new Date(v.timestamp).toLocaleDateString('it-IT') + " - " + new Date(v.timestamp).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}) : '';

            html += `
                <div style="padding: 14px 10px; border-bottom: 1px solid var(--border-color);">
                    <div style="font-weight: 700; font-size: 15px; color: var(--text-main); margin-bottom:4px;">${userName}</div>
                    <div style="font-size: 14px; color: var(--primary); margin-top: 4px;">Scelta: <b style="background:var(--primary-glow); padding:2px 6px; border-radius:4px;">${scelte}</b></div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">${dateStr}</div>
                </div>`;
        });

        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = `<div class="status-message" style="color:var(--danger);">Errore: ${e.message}</div>`;
    }
};

window.apriModaleNuovoAvviso = () => {
    document.getElementById('msgTesto').value = ""; 
    document.getElementById('msgLink').value = ""; 
    document.getElementById('pub-titolo-dds').value = ""; 
    document.getElementById('pub-date-dds-display').value = ""; 
    document.getElementById('pub-scadenza').value = ""; 
    ddsDatesArray = []; 
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

    let dataToSave = { 
        tipo, 
        testo, 
        link, 
        target: targetVal, 
        scadenza: scadenza || null, 
        timestamp: Date.now(), 
        autore: ctx.auth.currentUser.email.split('@')[0], 
        uid: ctx.auth.currentUser.uid, 
        sondaggio_opzioni: arraySondaggio, 
        sondaggio_multi: isMulti 
    };

    if (tipo === 'dds') {
        const titoloDds = document.getElementById('pub-titolo-dds').value.trim(); 
        const dateDds = ddsDatesArray.join(", "); 
        if (!titoloDds) return alert("Inserisci il titolo della DDS.");
        dataToSave.titolo_dds = titoloDds; 
        dataToSave.date_validita = dateDds;
    }

    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Pubblicazione..."; 
    btn.disabled = true;
    try {
        await setDoc(doc(ctx.db, "bacheca_utility", "msg_" + Date.now()), dataToSave);
        document.getElementById('modal-nuovo-avviso').style.display = 'none';
        alert("Annuncio pubblicato!"); 
        window.caricaBacheca(); 
    } catch (error) { 
        alert("Errore durante la pubblicazione."); 
    } finally { 
        btn.innerHTML = "<i class='fa-regular fa-paper-plane'></i> Pubblica Avviso"; 
        btn.disabled = false; 
    }
};

window.eliminaMessaggio = async (id) => {
    const ctx = window.bachecaContext;
    if (!confirm("Sei sicuro di voler eliminare questo avviso?")) return;
    try { 
        await deleteDoc(doc(ctx.db, "bacheca_utility", id)); 
        window.caricaBacheca(); 
    } catch (e) { 
        alert("Errore durante l'eliminazione."); 
    }
};

console.log("Bacheca Utility: file caricato e pronto all'uso.");
