export function initUIBarcadvisor() {
    const uiHTML = `
    <!-- MODALE BARCADVISOR -->
    <div id="modal-barcadvisor-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-barcadvisor-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-barcadvisor-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-ship"></i> BarcAdvisor
            </h3>

            <div style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; width: 100%;">
                
                <div class="animate-pop" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                    <div style="position: relative;">
                        <input type="text" id="ba-searchInput" class="input-field" placeholder="Cerca unità..." style="margin-bottom:0;" oninput="window.renderUnitsBA()">
                        <i class="fa-solid fa-magnifying-glass" style="position:absolute; right:16px; top:18px; color:var(--text-muted);"></i>
                    </div>
                    <button class="btn-action btn-success" onclick="window.openAddUnitBA()">
                        <i class="fa-solid fa-plus"></i> Aggiungi Unità
                    </button>
                </div>

                <div id="ba-unitsContainer"></div>

            </div>
        </div>
    </div>

    <div id="ba-detailViewModal" class="modal-overlay" onclick="window.closeDetailModalBA()" style="z-index: 7500;">
        <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 440px; height: 90vh; display: flex; flex-direction: column; padding: 0; overflow: hidden; width: 100%;">
            <header style="padding: 24px; background: var(--surface); border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                <h2 id="ba-detailTitle" style="margin: 0; font-size: 22px; color:var(--text-main);"><i class="fa-solid fa-ship" style="color:var(--text-muted); font-size:18px;"></i> Nome</h2>
                <i class="fa-solid fa-xmark close-modal" style="position:static;" onclick="window.closeDetailModalBA()"></i>
            </header>
            
            <div style="flex: 1; overflow-y: auto; padding: 24px; background: var(--bg-color);">
                <div style="background: var(--surface); padding: 24px; border-radius: var(--radius-md); margin-bottom: 24px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);">
                    <div style="display: flex; flex-direction: column; margin-bottom: 20px;">
                        <div style="font-weight: 600; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; color: var(--text-main); font-size: 15px;">
                            <span>Potenza <span id="ba-val-potenza" style="font-weight:normal; color:var(--text-muted); margin-left:5px;">-</span></span>
                            <span id="ba-media-potenza" style="font-size: 12px; color: var(--primary); background: var(--primary-glow); padding: 4px 10px; border-radius: 12px; font-weight: 600;">Media: -</span>
                        </div>
                        <div class="ba-stars" data-category="potenza">
                            <i class="fa-solid fa-star ba-star" data-value="1" onclick="window.votaStarBA(this, 1)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="2" onclick="window.votaStarBA(this, 2)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="3" onclick="window.votaStarBA(this, 3)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="4" onclick="window.votaStarBA(this, 4)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="5" onclick="window.votaStarBA(this, 5)"></i>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; margin-bottom: 20px;">
                        <div style="font-weight: 600; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; color: var(--text-main); font-size: 15px;">
                            <span>Manovrabilità <span id="ba-val-manovrabilita" style="font-weight:normal; color:var(--text-muted); margin-left:5px;">-</span></span>
                            <span id="ba-media-manovrabilita" style="font-size: 12px; color: var(--primary); background: var(--primary-glow); padding: 4px 10px; border-radius: 12px; font-weight: 600;">Media: -</span>
                        </div>
                        <div class="ba-stars" data-category="manovrabilita">
                            <i class="fa-solid fa-star ba-star" data-value="1" onclick="window.votaStarBA(this, 1)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="2" onclick="window.votaStarBA(this, 2)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="3" onclick="window.votaStarBA(this, 3)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="4" onclick="window.votaStarBA(this, 4)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="5" onclick="window.votaStarBA(this, 5)"></i>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <div style="font-weight: 600; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; color: var(--text-main); font-size: 15px;">
                            <span>Stato Generale <span id="ba-val-stato" style="font-weight:normal; color:var(--text-muted); margin-left:5px;">-</span></span>
                            <span id="ba-media-stato" style="font-size: 12px; color: var(--primary); background: var(--primary-glow); padding: 4px 10px; border-radius: 12px; font-weight: 600;">Media: -</span>
                        </div>
                        <div class="ba-stars" data-category="stato">
                            <i class="fa-solid fa-star ba-star" data-value="1" onclick="window.votaStarBA(this, 1)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="2" onclick="window.votaStarBA(this, 2)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="3" onclick="window.votaStarBA(this, 3)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="4" onclick="window.votaStarBA(this, 4)"></i>
                            <i class="fa-solid fa-star ba-star" data-value="5" onclick="window.votaStarBA(this, 5)"></i>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 style="margin-top:0; margin-bottom: 16px; color: var(--text-main); font-size: 18px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Segnalazioni Problemi</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                        <input type="text" id="ba-newReportInput" class="input-field" placeholder="Descrivi il problema..." style="margin-bottom:0; flex:1;">
                        <button class="btn-action" style="margin-top:0; width:auto; padding:0 24px;" onclick="window.submitReportBA()"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                    
                    <button id="ba-toggleHistoryBtn" class="btn-outline" style="width:100%; margin-bottom:20px; justify-content:center; font-size: 13px; padding: 8px;" onclick="window.toggleHistoryBA()">
                        <i class="fa-solid fa-clock-rotate-left"></i> Cronologia segnalazioni
                    </button>
                    
                    <div id="ba-historyContainer" style="display: none; margin-bottom: 20px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
                        <div id="ba-historyList"></div>
                    </div>

                    <div id="ba-reportsContainer"></div>
                </div>
            </div>

            <div style="padding: 20px; background: var(--surface); border-top: 1px solid var(--border-color); border-radius: 0 0 var(--radius-lg) var(--radius-lg);">
                <button class="btn-action btn-danger" style="margin-top:0; margin-bottom:0;" onclick="window.closeDetailModalBA()"><i class="fa-solid fa-check"></i> FATTO</button>
            </div>
        </div>
    </div>

    <div id="ba-modalOverlay" class="modal-overlay" onclick="window.closeModalBA()" style="z-index: 7500;">
        <div class="modal-content" style="max-width: 380px;" onclick="event.stopPropagation()">
            <h3 id="ba-modalTitle" style="margin-top:0; margin-bottom:20px; color:var(--text-main); font-size:20px;">Titolo Modal</h3>
            
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <select id="ba-modalPrefix" class="input-field" style="margin-bottom:0; width:auto; padding-right:35px;">
                    <option value="M/S">M/S</option>
                    <option value="M/B">M/B</option>
                    <option value="M/N">M/N</option>
                    <option value="M/Z">M/Z</option>
                </select>
                <input type="text" id="ba-modalInput" class="input-field" style="margin-bottom:0;" placeholder="Nome/Numero">
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                <button id="ba-modalConfirmBtn" class="btn-action btn-success" style="margin-top:0; margin-bottom:0;"><i class="fa-solid fa-check"></i> Conferma</button>
                <button onclick="window.closeModalBA()" class="btn-outline" style="width:100%; justify-content:center; margin-bottom:0;">Annulla</button>
                <button id="ba-modalDeleteBtn" class="btn-action btn-danger" style="margin-bottom:0; display:none;"><i class="fa-solid fa-trash-can"></i> Elimina Unità</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', uiHTML);
}
