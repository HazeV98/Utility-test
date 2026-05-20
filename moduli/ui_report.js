export function initUISegnalazioni() {
    const uiHTML = `
    <!-- MODALI SEGNALAZIONI -->
    <div id="modal-segnalazioni-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-segnalazioni-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-segnalazioni-main')"></i>
            <h3 style="margin-top: 0; color: var(--info); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-headset"></i> Segnalazioni</h3>
            <div style="flex: 1; overflow-y: auto; padding-right: 5px;">
                <button style="background-color: var(--info); color: white; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; box-shadow: 0 4px 12px rgba(0, 136, 255, 0.3); width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px; transition: all 0.2s; margin-bottom: 15px;" onclick="window.apriModaleNuovaSegnalazione()"><i class="fa-solid fa-paper-plane"></i> Nuova Segnalazione</button>
                <button id="btn-cronologia-admin" style="display: none; background-color: var(--surface); color: var(--text-main); border: 2px solid var(--border-color); padding: 14px; font-size: 14px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; width: 100%; justify-content: center; align-items: center; gap: 10px; transition: all 0.2s; margin-bottom: 15px;" onclick="window.toggleVistaAdminSegnalazioni()"><i class="fa-solid fa-clock-rotate-left"></i> Mostra Cronologia Risposte</button>
                <div id="reports-list"></div>
            </div>
            <button class="btn-modal" style="background: transparent; color: var(--danger); border: 2px solid var(--danger); margin-top: 15px;" onclick="window.chiudiModal('modal-segnalazioni-main')"><i class="fa-solid fa-xmark"></i> Chiudi Finestra</button>
        </div>
    </div>

    <div id="modal-nuova-segnalazione" class="modal-overlay" style="z-index: 7500;">
        <div class="modal-content">
            <h3 style="margin-top:0; border-bottom:1px solid var(--border-color); padding-bottom:15px; text-align:center;"><i class="fa-solid fa-paper-plane" style="color:var(--info);"></i> Invia Segnalazione</h3>
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

    <div id="modal-risposta-segnalazione" class="modal-overlay" style="z-index: 7500;">
        <div class="modal-content">
            <h3 style="margin-top:0; border-bottom:1px solid var(--border-color); padding-bottom:15px; text-align:center;"><i class="fa-solid fa-reply" style="color:var(--success);"></i> Rispondi</h3>
            <input type="hidden" id="admin-rep-id">
            <div class="float-wrapper">
                <textarea id="admin-rep-messaggio" rows="4" class="input-field" placeholder=" " style="resize: vertical;"></textarea>
                <label style="top: 20px;">Risposta</label>
            </div>
            <div class="float-wrapper">
                <input type="url" id="admin-rep-link" class="input-field" placeholder=" ">
                <label>Link Allegato (Facoltativo)</label>
            </div>
            <button id="btn-invia-risposta" class="btn-action" style="background:var(--success);" onclick="window.inviaRispostaAdmin()"><i class="fa-solid fa-reply"></i> Invia Risposta</button>
            <button class="btn-modal" style="background-color: transparent; color: var(--text-muted); border: 1px solid var(--border-color);" onclick="window.chiudiModaleRispostaSegnalazione()">Annulla</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
} 
