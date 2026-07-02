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
