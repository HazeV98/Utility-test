export function initUILink() {
    const uiHTML = `
    <!-- MODALE LINK -->
    <div id="modal-link-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-link-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-link-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-link"></i> Link Utili
            </h3>
            <div id="link-content-area" style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 14px;">
            </div>
        </div>
    </div>

    <!-- MODALE QR CODE -->
    <div id="modal-qr-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-qr-main')" style="display: none; z-index: 10000;">
        <div class="modal-content" style="max-width: 320px; padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-qr-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fa-solid fa-qrcode"></i> QR Code
            </h3>
            <img id="qr-code-img" src="" alt="QR Code Link" style="width: 200px; height: 200px; margin-top: 15px; border-radius: 8px; border: 1px solid var(--border-color); padding: 10px; background: white;">
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
} 
