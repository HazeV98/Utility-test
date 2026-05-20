export function initUITurni() {
    const uiHTML = `
    <!-- MODALE TURNI -->
    <div id="modal-turni-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-turni-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-turni-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-rotate"></i> Consultazione Turni
            </h3>

            <div id="content-area" style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 16px;">
            </div>
        </div>
    </div>

    <!-- Modale Cerca Corse -->
    <div id="searchCorseModal" class="modal-overlay-search" onclick="window.chiudiSeSfondoSearch(event)">
        <div class="modal-content-search">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiSearchCorseModal()"></i>
            <h3 style="margin-top:0; color:var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 20px; font-weight: 700; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-route" style="color: var(--primary);"></i> Cerca Corsa
            </h3>
            
            <div id="sc-status" class="status-message" style="padding: 20px; font-size:14px; display:none; margin-top: 20px;">
                <i class="fa-solid fa-spinner fa-spin" style="color:var(--primary);"></i> Caricamento dati in corso...
            </div>
            
            <div id="sc-form" style="display:none; margin-top: 24px;">
                <div class="tipo-toggle-container">
                    <button id="btn-partenza" class="btn-tipo" onclick="window.selezionaTipo('partenza')"><i class="fa-solid fa-plane-departure"></i> Partenza</button>
                    <button id="btn-arrivo" class="btn-tipo" onclick="window.selezionaTipo('arrivo')"><i class="fa-solid fa-plane-arrival"></i> Arrivo</button>
                </div>
                <input type="hidden" id="sc-tipo" value="">

                <div id="sc-rest-form">
                    <div class="sc-form-group">
                        <label id="label-luogo">Luogo:</label>
                        <select id="sc-luogo" onchange="window.aggiornaSuggerimentiOrario()"></select>
                    </div>
                    <div class="sc-form-group">
                        <label>Giorno (Opz. per rotazioni):</label>
                        <input type="date" id="sc-giorno">
                    </div>
                    <div class="sc-form-group" style="position: relative;">
                        <label id="label-orario">Orario:</label>
                        <input type="text" id="sc-orario" inputmode="numeric" placeholder="es. 07.30" oninput="window.formattaOrario(event)" autocomplete="off">
                        <div id="sc-suggestions"></div>
                    </div>
                    <button class="btn-action" style="margin-top: 10px;" onclick="window.eseguiRicercaCorsa()"><i class="fa-solid fa-magnifying-glass"></i> Trova Turno</button>
                </div>

                <div id="sc-risultato" class="risultato-box" style="display:none;"></div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}
