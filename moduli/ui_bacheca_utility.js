export function initUIBachecaUtility() {
    const uiHTML = `
    <div id="modal-bacheca-utility-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-bacheca-utility-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-bacheca-utility-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-bullhorn"></i> Bacheca Avvisi
            </h3>

            <div style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column;">
                <button id="btn-admin-add-bacheca" class="btn-action" style="display: none; margin-top: 0; margin-bottom: 16px;" onclick="window.apriModaleNuovoAvviso()"><i class="fa-solid fa-plus"></i> Pubblica Avviso</button>
                <div id="lista-messaggi"></div>
            </div>
        </div>
    </div>

    <div id="modal-nuovo-avviso" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-nuovo-avviso')" style="z-index: 7500;">
        <div class="modal-content">
            <i class="fa-solid fa-xmark close-modal" onclick="document.getElementById('modal-nuovo-avviso').style.display='none'"></i>
            <h3 style="margin-top: 0; margin-bottom: 24px; color: var(--text-main); display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-pen-to-square" style="color:var(--primary);"></i> Nuovo Avviso
            </h3>
            
            <label class="editor-label">Tipo di Annuncio:</label>
            <select id="pub-tipo" class="input-field" onchange="window.toggleCampiDDS()">
                <option value="normale">Messaggio Normale</option>
                <option value="dds">Avviso DDS</option>
            </select>

            <div id="area-dds" style="display: none; background: var(--danger-light); padding: 20px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid var(--danger-border);">
                <label class="editor-label" style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Titolo DDS:</label>
                <input type="text" id="pub-titolo-dds" class="input-field" placeholder="Es. Variante Linea 1" style="background:var(--surface); border-color:var(--danger-border);">
                
                <label class="editor-label" style="color: var(--danger); margin-top: 16px;"><i class="fa-regular fa-calendar-check"></i> Date di Validità:</label>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <input type="text" id="pub-date-dds-display" class="input-field" placeholder="Nessuna data selezionata" readonly style="margin-bottom: 0; cursor: pointer; background:var(--surface); border-color:var(--danger-border);" onclick="window.apriDatePickerAvviso()">
                    <button class="btn-action" style="margin-top: 0; width: auto; padding: 14px 20px; background:var(--danger); box-shadow:none;" onclick="window.apriDatePickerAvviso()"><i class="fa-regular fa-calendar"></i></button>
                </div>
            </div>

            <label class="editor-label">Destinatari (Target):</label>
            <select id="pub-target" class="input-field" onchange="window.toggleAreaTarget()">
                <option value="tutti">Visibile a Tutti</option>
                <option value="selezione">Solo Rotazioni Selezionate...</option>
            </select>

            <div id="area-target" style="display: none; margin-bottom: 20px; max-height: 250px; overflow-y: auto; background: var(--surface-hover); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div class="checkbox-grid">
                    <label><input type="checkbox" class="target-check" value="rot_fnove"> Rot F.Nove</label>
                    <label><input type="checkbox" class="target-check" value="spez_fnove"> Spez F.Nove</label>
                    <label><input type="checkbox" class="target-check" value="tc_spez_fnove"> TC Spez F.Nove</label>
                    <label><input type="checkbox" class="target-check" value="rot_proma"> Rot P.Roma</label>
                    <label><input type="checkbox" class="target-check" value="spez_proma"> Spez P.Roma</label>
                    <label><input type="checkbox" class="target-check" value="ris_proma"> Ris P.Roma</label>
                    <label><input type="checkbox" class="target-check" value="rot_szaccaria"> Rot S.Zac</label>
                    <label><input type="checkbox" class="target-check" value="spez_szaccaria"> Spez S.Zac</label>
                    <label><input type="checkbox" class="target-check" value="tc_spez_szaccaria"> TC Spez S.Zac</label>
                    <label><input type="checkbox" class="target-check" value="rot_lido"> Rot Lido</label>
                    <label><input type="checkbox" class="target-check" value="spez_lido"> Spez Lido</label>
                    <label><input type="checkbox" class="target-check" value="tc_spez_lido"> TC Spez Lido</label>
                    <label><input type="checkbox" class="target-check" value="rot_linea12"> Rot Linea 12</label>
                    <label><input type="checkbox" class="target-check" value="rot_linea13"> Rot Linea 13</label>
                    <label><input type="checkbox" class="target-check" value="rot_linea14"> Rot Linea 14</label>
                    <label><input type="checkbox" class="target-check" value="rot_linea14_mb"> Rot 14 M/B</label>
                    <label><input type="checkbox" class="target-check" value="rot_17sn"> Rot 17 SN</label>
                    <label><input type="checkbox" class="target-check" value="tc_rot_17sn"> TC Rot 17 SN</label>
                    <label><input type="checkbox" class="target-check" value="rot_17tr"> Rot 17 TR</label>
                    <label><input type="checkbox" class="target-check" value="tc_rot_17tr"> TC Rot 17 TR</label>
                    <label><input type="checkbox" class="target-check" value="disp_indet"> Disponibili</label>
                </div>
            </div>

            <label style="font-size: 15px; font-weight: 600; color: var(--primary); display: flex; align-items: center; gap: 10px; margin-top: 24px; margin-bottom: 16px; cursor:pointer;">
                <input type="checkbox" id="pub-has-sondaggio" onchange="window.toggleSondaggio()" style="width:18px; height:18px; accent-color:var(--primary);"> <i class="fa-solid fa-chart-pie"></i> Aggiungi Sondaggio
            </label>
            
            <div id="area-sondaggio" style="display: none; background: var(--surface-hover); padding: 20px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px dashed var(--primary);">
                <label style="font-size: 14px; color: var(--text-main); display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-weight: 500; cursor:pointer;">
                    <input type="checkbox" id="pub-multi-risposta" style="width:18px; height:18px; accent-color:var(--primary);"> Consenti risposte multiple
                </label>

                <label class="editor-label" style="color: var(--primary);">Opzioni di voto (minimo 2):</label>
                <div id="lista-opzioni-sondaggio" style="margin-top: 10px;"></div>
                <button class="btn-outline" style="width: 100%; margin-top: 8px; justify-content:center;" onclick="window.aggiungiOpzioneSondaggio()"><i class="fa-solid fa-plus"></i> Aggiungi un'opzione</button>
            </div>

            <label class="editor-label">Data di Scadenza (Auto-Elimina):</label>
            <input type="date" id="pub-scadenza" class="input-field">

            <label class="editor-label">Testo del messaggio:</label>
            <textarea id="msgTesto" class="input-field" rows="4" placeholder="Scrivi qui la comunicazione..." style="resize:vertical;"></textarea>
            
            <label class="editor-label">Link Esterno (Opzionale):</label>
            <input type="url" id="msgLink" class="input-field" placeholder="es. https://www.google.it o link Drive" style="text-transform:none;">
            
            <button id="btn-pubblica" class="btn-action" onclick="window.pubblicaMessaggio()"><i class="fa-regular fa-paper-plane"></i> Pubblica Avviso</button>
        </div>
    </div>

    <div id="modal-date-picker-avviso" class="modal-overlay" style="z-index: 8000;">
        <div class="modal-content" style="max-width: 320px; text-align: center;">
            <h3 style="margin-top: 0; color: var(--primary); display:flex; justify-content:center; align-items:center; gap:8px;"><i class="fa-regular fa-calendar-days"></i> Scegli Date</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Seleziona una data alla volta e clicca il tasto '+'</p>
            
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <input type="date" id="input-date-single" class="input-field" style="margin-bottom: 0;">
                <button class="btn-action" style="width: 54px; margin-top: 0; padding: 14px;" onclick="window.aggiungiDataSingola()"><i class="fa-solid fa-plus"></i></button>
            </div>

            <div id="date-tags-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; justify-content: center; min-height: 40px;"></div>

            <button class="btn-action btn-success" onclick="window.chiudiDatePickerAvviso()"><i class="fa-solid fa-check"></i> Fatto</button>
        </div>
    </div>

    <div id="modal-letture" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-letture')" style="z-index: 8000;">
        <div class="modal-content" style="max-width: 380px;">
            <i class="fa-solid fa-xmark close-modal" onclick="document.getElementById('modal-letture').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--primary); display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-eye"></i> Visualizzazioni</h3>
            <div id="lista-letture" style="margin-top: 20px; max-height: 60vh; overflow-y: auto; padding-right:5px;">
                <div class="status-message"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>
            </div>
        </div>
    </div>

    <div id="modal-voti" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-voti')" style="z-index: 8000;">
        <div class="modal-content" style="max-width: 380px;">
            <i class="fa-solid fa-xmark close-modal" onclick="document.getElementById('modal-voti').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--primary); display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-chart-bar"></i> Dettaglio Voti</h3>
            <div id="lista-voti-dettaglio" style="margin-top: 20px; max-height: 60vh; overflow-y: auto; padding-right:5px;">
                <div class="status-message"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}
