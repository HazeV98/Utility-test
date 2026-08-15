export function initUIContatti() {
    // Controllo di sicurezza: se esiste già, non ricrearla!
    if (document.getElementById('modal-contatti-main')) return;

    const uiHTML = `
    <!-- MODALE CONTATTI -->
    <div id="modal-contatti-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-contatti-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-contatti-main')"></i>
            
            <h3 style="margin-top: 0; margin-bottom: 15px; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; justify-content: space-between;">
                <div style="display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-id-card"></i> Contatti</div>
                <button id="btn-add-contact" style="display:none; background: var(--success); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; margin-right: 30px; align-items:center; justify-content:center; box-shadow: var(--shadow-sm); transition: 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.apriFormNuovoContatto()"><i class="fa-solid fa-plus"></i></button>
            </h3>

            <!-- BARRA DI RICERCA -->
            <div style="margin-bottom: 15px; position: relative;">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                <input type="text" id="ricerca-contatti" placeholder="Cerca nome o numero..." style="width: 100%; padding: 12px 12px 12px 40px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--surface-hover); color: var(--text-main); box-sizing: border-box; font-family: inherit; font-size: 14px; transition: 0.2s; outline: none;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-color)'">
            </div>
            
            <div id="contatti-content-area" style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 14px;">
            </div>
        </div>
    </div>

    <!-- MODALE AGGIUNGI CONTATTO (SOLO ADMIN) -->
    <div id="modal-aggiungi-contatto" class="modal-overlay" style="z-index: 8000;" onclick="window.chiudiSuSfondo(event, 'modal-aggiungi-contatto')">
        <div class="modal-content" style="max-width: 360px;">
            <h3 style="margin-top: 0; color: var(--primary); border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-plus"></i> Nuovo Contatto</h3>
            
            <label style="font-size:12px; color:var(--text-muted); font-weight:700; display:block; margin-bottom:6px;">NOME / DESCRIZIONE</label>
            <input type="text" id="nuovo-contatto-nome" class="input-field" placeholder="Es. Ufficio Personale">
            
            <label style="font-size:12px; color:var(--text-muted); font-weight:700; display:block; margin-bottom:6px; margin-top:10px;">CATEGORIA</label>
            <select id="nuovo-contatto-categoria-select" class="input-field" style="cursor: pointer;" onchange="window.toggleNuovaCategoria(this.value)">
                <!-- Opzioni popolate via JS -->
            </select>
            <input type="text" id="nuovo-contatto-categoria-nuova" class="input-field" placeholder="Nome nuova categoria..." style="display:none; margin-top:5px;">
            
            <label style="font-size:12px; color:var(--text-muted); font-weight:700; display:block; margin-bottom:6px; margin-top:10px;">TIPO DI RECAPITO</label>
            <select id="nuovo-contatto-tipo" class="input-field" style="cursor: pointer;">
                <option value="telefono">Telefono</option>
                <option value="email">Email</option>
            </select>

            <label style="font-size:12px; color:var(--text-muted); font-weight:700; display:block; margin-bottom:6px; margin-top:10px;">VALORE (Numero o Email)</label>
            <input type="text" id="nuovo-contatto-valore" class="input-field" placeholder="Es. 041 272 1111">
            
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modal" style="background:var(--success); color:white; flex:1; margin-top:0;" onclick="window.salvaNuovoContatto()"><i class="fa-solid fa-check"></i> Salva</button>
                <button class="btn-modal" style="background:transparent; color:var(--danger); border:2px solid var(--danger); flex:1; margin-top:0;" onclick="window.chiudiModal('modal-aggiungi-contatto')">Annulla</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}
