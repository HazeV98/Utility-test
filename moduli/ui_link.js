export function initUILink() {
    if (document.getElementById('modal-link-main')) return;

    const uiHTML = `
    <!-- MODALE LINK PRINCIPALE -->
    <div id="modal-link-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-link-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-link-main')"></i>
            
            <h3 style="margin-top: 0; margin-bottom: 15px; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; justify-content: space-between;">
                <div style="display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-link"></i> Link Utili</div>
                <button id="btn-add-link" style="display:none; background: var(--success); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; margin-right: 30px; align-items:center; justify-content:center; box-shadow: var(--shadow-sm); transition: 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.apriFormNuovoLink()"><i class="fa-solid fa-plus"></i></button>
            </h3>

            <!-- BARRA DI RICERCA -->
            <div style="margin-bottom: 15px; position: relative;">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                <input type="text" id="ricerca-link" placeholder="Cerca nome o URL..." style="width: 100%; padding: 12px 12px 12px 40px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--surface-hover); color: var(--text-main); box-sizing: border-box; font-family: inherit; font-size: 14px; transition: 0.2s; outline: none;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-color)'">
            </div>

            <div id="link-content-area" style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 14px;">
            </div>
        </div>
    </div>

    <!-- MODALE SCHEDA DETTAGLIO LINK -->
    <div id="modal-scheda-link" class="modal-overlay" style="z-index: 9000; display: none;" onclick="window.chiudiSuSfondo(event, 'modal-scheda-link')">
        <div class="modal-content" style="max-width: 340px; padding: 24px; display: flex; flex-direction: column; gap: 20px; position: relative;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 16px; top: 16px; font-size: 20px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModal('modal-scheda-link')"></i>

            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; margin-top: 10px;">
                <div id="scheda-link-icona" style="display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: var(--surface-hover); border-radius: 16px; box-shadow: var(--shadow-sm);"></div>
                <h3 id="scheda-link-nome" style="margin: 0; color: var(--text-main); font-size: 20px; font-weight: 800; word-break: break-word;"></h3>
            </div>

            <div style="background: var(--surface-hover); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); max-height: 90px; overflow-y: auto;">
                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;"><i class="fa-solid fa-globe"></i> INDIRIZZO WEB</div>
                <div id="scheda-link-url" style="font-size: 13px; color: var(--text-main); word-break: break-all; font-family: monospace;"></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <a id="btn-scheda-apri" class="btn-modal" style="background: var(--primary); color: white; margin: 0; padding: 12px; text-decoration: none; display: flex; justify-content: center; align-items: center; gap: 8px;" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> Apri</a>
                <button id="btn-scheda-copia" class="btn-modal" style="background: var(--surface); color: var(--text-main); border: 1px solid var(--border-color); margin: 0; padding: 12px; display: flex; justify-content: center; align-items: center; gap: 8px;"><i class="fa-regular fa-copy"></i> Copia</button>
                <button id="btn-scheda-qr" class="btn-modal" style="background: var(--surface); color: var(--text-main); border: 1px solid var(--border-color); margin: 0; padding: 12px; display: flex; justify-content: center; align-items: center; gap: 8px; grid-column: span 2;"><i class="fa-solid fa-qrcode"></i> Mostra QR Code</button>
                
                <!-- Tasto Modifica Admin -->
                <button id="btn-scheda-modifica" class="btn-modal" style="background: transparent; color: var(--primary); border: 1px dashed var(--primary); margin: 0; margin-top: 5px; padding: 12px; display: none; justify-content: center; align-items: center; gap: 8px; grid-column: span 2;"><i class="fa-solid fa-pen"></i> Modifica Link (Admin)</button>
            </div>
        </div>
    </div>

    <!-- MODALE AGGIUNGI/MODIFICA LINK (SOLO ADMIN) -->
    <div id="modal-aggiungi-link" class="modal-overlay" style="z-index: 9500;" onclick="window.chiudiSuSfondo(event, 'modal-aggiungi-link')">
        <div class="modal-content" style="max-width: 360px;">
            <h3 id="titolo-modal-link" style="margin-top: 0; color: var(--primary); border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-plus"></i> Nuovo Link</h3>
            
            <input type="hidden" id="edit-link-id" value="">
            
            <label style="font-size:12px; color:var(--text-muted); font-weight:700; display:block; margin-bottom:6px;">NOME / DESCRIZIONE *</label>
            <input type="text" id="nuovo-link-nome" class="input-field" placeholder="Es. Portale Dipendenti">
            
            <label style="font-size:12px; color:var(--text-muted); font-weight:700; display:block; margin-bottom:6px; margin-top:10px;">CATEGORIA *</label>
            <select id="nuovo-link-categoria-select" class="input-field" style="cursor: pointer;" onchange="window.toggleNuovaCategoriaLink(this.value)">
                <!-- Opzioni popolate via JS -->
            </select>
            <input type="text" id="nuovo-link-categoria-nuova" class="input-field" placeholder="Nome nuova categoria..." style="display:none; margin-top:5px;">
            
            <label style="font-size:12px; color:var(--text-main); font-weight:700; display:block; margin-bottom:6px; margin-top:10px;">URL (Indirizzo Web) *</label>
            <input type="url" id="nuovo-link-url" class="input-field" placeholder="Es. https://www.azienda.it">
            
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modal" style="background:var(--success); color:white; flex:1; margin-top:0; padding:10px;" onclick="window.salvaNuovoLink()"><i class="fa-solid fa-check"></i> Salva</button>
                <button id="btn-elimina-link" class="btn-modal" style="background:var(--danger); color:white; flex:1; margin-top:0; display:none; padding:10px;" onclick="window.eliminaLink()"><i class="fa-solid fa-trash"></i> Elimina</button>
                <button class="btn-modal" style="background:transparent; color:var(--text-muted); border:2px solid var(--border-color); flex:1; margin-top:0; padding:10px;" onclick="window.chiudiModal('modal-aggiungi-link')">Annulla</button>
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
