export function initUIContatti() {
    const uiHTML = `
    <!-- MODALE CONTATTI -->
    <div id="modal-contatti-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-contatti-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-contatti-main')"></i>
            
            <h3 style="margin-top: 0; margin-bottom: 15px; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-id-card"></i> Contatti
            </h3>

            <!-- BARRA DI RICERCA -->
            <div style="margin-bottom: 15px; position: relative;">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                <input type="text" id="ricerca-contatti" placeholder="Cerca nome o numero..." style="width: 100%; padding: 10px 10px 10px 36px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-color); color: var(--text-color); box-sizing: border-box; font-family: inherit; font-size: 14px;">
            </div>
            
            <div id="contatti-content-area" style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 14px;">
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}
