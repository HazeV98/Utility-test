export function initUIDDS() {
    if (document.getElementById('modal-dds-main')) return;

    // Iniezione librerie Flatpickr (se non già presenti da admin.html)
    if (!document.querySelector('link[href*="flatpickr"]')) {
        const flatCss = document.createElement('link');
        flatCss.rel = "stylesheet";
        flatCss.href = "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css";
        document.head.appendChild(flatCss);
    }
    if (!document.querySelector('script[src*="flatpickr"]')) {
        const flatJs = document.createElement('script');
        flatJs.src = "https://cdn.jsdelivr.net/npm/flatpickr";
        document.head.appendChild(flatJs);
        
        flatJs.onload = () => {
            const flatLang = document.createElement('script');
            flatLang.src = "https://npmcdn.com/flatpickr/dist/l10n/it.js";
            document.head.appendChild(flatLang);
        };
    }

    // Iniezione CSS specifico
    const style = document.createElement('style');
    style.innerHTML = `
        /* Rimosso il CSS che forzava lo schermo intero (wrapper e padding: 0) */

        /* CARD DDS */
        .dds-card { background: var(--surface); padding: 20px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; border-left: 6px solid var(--primary); transition: transform 0.2s, box-shadow 0.2s; flex-shrink: 0; }
        .dds-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .dds-title { font-weight: 700; font-size: 16px; color: var(--primary); display: flex; align-items: center; gap: 8px; line-height: 1.4; }
        .dds-date { font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; font-weight: 500;}
        
        .dds-btn-group { display: flex; gap: 10px; margin-top: 5px; }
        .dds-btn-open { background-color: var(--primary); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 600; font-size: 14px; flex: 1; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: all 0.2s; }
        .dds-btn-open:active { transform: scale(0.97); }
        .dds-btn-delete { background-color: var(--surface); color: var(--danger); border: 1px solid var(--danger); padding: 12px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: all 0.2s; }
        .dds-btn-delete:active { background-color: var(--danger-light); transform: scale(0.97); }

        .dds-btn-add-main { background-color: var(--success); color: white; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; box-shadow: 0 4px 12px rgba(15,157,88,0.2); width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px; transition: all 0.2s; flex-shrink: 0;}
        .dds-btn-add-main:hover { transform: translateY(-2px); filter: brightness(1.05); }
        .dds-btn-add-main:active { transform: translateY(1px); box-shadow: none; }
        
        .dds-backup-group { display: flex; gap: 12px; width: 100%; flex-shrink: 0;}
        .dds-btn-outline { background-color: var(--surface); color: var(--text-main); border: 1px solid var(--border-color); padding: 14px; font-size: 14px; font-weight: 600; border-radius: 12px; cursor: pointer; flex: 1; text-align: center; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: var(--shadow-sm); transition: all 0.2s; }
        .dds-btn-outline:active { background-color: var(--surface-hover); transform: scale(0.97); }

        /* SOTTOMODALE */
        .dds-input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; flex-shrink: 0;}
        .dds-input-group label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .dds-input-field, .dds-input-group input[type="text"], .dds-input-group input[type="file"], .dds-input-group input[type="time"] { padding: 14px; border: 2px solid var(--border-color); border-radius: var(--radius-md); font-size: 15px; width: 100%; box-sizing: border-box; font-family: inherit; background-color: var(--surface); color: var(--text-main); transition: all 0.2s; }
        .dds-input-field:focus, .dds-input-group input[type="text"]:focus, .dds-input-group input[type="time"]:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 4px var(--primary-glow); }
        
        /* Classe per il fix calendario Flatpickr */
        .input-with-icon { padding-left: 42px !important; background-color: var(--surface) !important; }

        .dds-checkbox-group { display: flex; flex-direction: column; gap: 12px; background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); }
        .dds-checkbox-label { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: var(--text-main); cursor: pointer; }
        .dds-checkbox-label input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; margin: 0; accent-color: var(--primary); }

        .dds-btn-esegui { background-color: var(--success); color: white; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: 12px; cursor: pointer; width: 100%; margin-top: 10px; margin-bottom: 12px; display: flex; justify-content: center; align-items: center; gap: 8px; transition: all 0.2s; flex-shrink: 0;}
        .dds-btn-esegui:active { transform: scale(0.98); }
        
        .dds-btn-chiudi { background-color: transparent; color: var(--text-muted); border: 1px solid var(--border-color); padding: 14px; font-size: 15px; font-weight: 600; border-radius: 12px; cursor: pointer; width: 100%; text-align: center; transition: all 0.2s; flex-shrink: 0;}
        .dds-btn-chiudi:active { background-color: var(--surface-hover); }
        
        .dds-empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 15px; font-weight: 500; background: var(--surface-hover); border-radius: var(--radius-md); border: 1px dashed var(--border-color); flex-shrink: 0;}
    `;
    document.head.appendChild(style);

    // Iniezione HTML Principale (Corretto per aprirsi in una finestra scrollabile)
    const container = document.createElement('div');
    container.id = 'modal-dds-main';
    container.className = 'modal-overlay';
    // Permette di chiudere la finestra cliccando fuori
    container.onclick = (e) => { window.chiudiSuSfondo(e, 'modal-dds-main') };

    container.innerHTML = `
        <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-dds-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-box-archive"></i> Archivio DDS
            </h3>

            <!-- Area scrollabile -->
            <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; gap: 20px; padding-bottom: 20px; margin-top: 10px;">
                
                <button class="dds-btn-add-main" onclick="window.apriModaleAggiungiDDS()"><i class="fa-solid fa-file-circle-plus"></i> Carica Nuova DDS</button>
                
                <div class="dds-backup-group">
                    <button class="dds-btn-outline" onclick="window.esportaDDS()"><i class="fa-solid fa-download"></i> Esporta</button>
                    <button class="dds-btn-outline" onclick="document.getElementById('importa-file-dds').click()"><i class="fa-solid fa-upload"></i> Importa</button>
                    <input type="file" id="importa-file-dds" style="display: none;" accept=".json" onchange="window.importaDDS(event)">
                </div>

                <div id="dds-list" style="display: flex; flex-direction: column; gap: 16px;"></div>
            </div>
        </div>

        <!-- Sottomodale per aggiungere una DDS -->
        <div id="modal-aggiungi-dds" class="modal-overlay" style="z-index: 7500; display: none;" onclick="window.chiudiSuSfondo(event, 'modal-aggiungi-dds')">
            <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
                
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-aggiungi-dds')"></i>
                
                <h3 style="margin-top: 0; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 15px; font-weight: 800; flex-shrink: 0; display:flex; align-items:center; gap:10px;">
                    <i class="fa-solid fa-folder-plus" style="color:var(--primary);"></i> Nuova DDS
                </h3>
                
                <!-- Area scrollabile per la sottomodale in caso di schermi piccoli -->
                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px; margin-top: 10px;">
                    <div class="dds-input-group">
                        <label>TITOLO</label>
                        <input type="text" id="dds-titolo" placeholder="Inserisci il titolo della DDS...">
                    </div>

                    <div class="dds-input-group">
                        <label>GIORNI DI VALIDITÀ (Tocca per scegliere)</label>
                        <div style="position: relative;">
                            <i class="fa-regular fa-calendar" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); z-index: 5;"></i>
                            <input type="text" id="dds-date-picker" class="input-with-icon" placeholder="Seleziona le date..." readonly>
                        </div>
                    </div>

                    <div class="dds-input-group">
                        <label>FILE PDF</label>
                        <input type="file" id="dds-file" accept="application/pdf" style="padding: 10px; background: var(--surface-hover);">
                    </div>

                    <div class="dds-input-group">
                        <label>AVVISI SUL CALENDARIO (All'avvio):</label>
                        <div class="dds-checkbox-group">
                            <label class="dds-checkbox-label"><input type="checkbox" value="day_before" class="rem-checkbox"> Il giorno prima</label>
                            <label class="dds-checkbox-label"><input type="checkbox" value="first_day" class="rem-checkbox"> Il primo giorno</label>
                            <label class="dds-checkbox-label"><input type="checkbox" value="all_days" class="rem-checkbox" checked> Tutti i giorni</label>
                        </div>
                    </div>

                    <div class="dds-input-group" id="dds-time-picker-group" style="display: none; background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                        <label style="color: var(--primary);"><i class="fa-solid fa-bell"></i> ORARIO NOTIFICA PUSH APP</label>
                        <input type="time" id="dds-orario" style="background: var(--surface); border: 2px solid var(--border-color); border-radius: 10px; padding: 12px; font-size: 15px; width: 100%; box-sizing: border-box; font-family: inherit; color: var(--text-main);">
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px; font-weight: 500;">Seleziona un orario per ricevere una notifica push nei giorni di validità.</div>
                    </div>

                    <div class="dds-input-group" style="background: var(--danger-light); padding: 16px; border-radius: var(--radius-md); border: 1px dashed var(--danger-border);">
                        <label class="dds-checkbox-label" style="font-weight: 700; color: var(--danger);">
                            <input type="checkbox" id="banner-attiva" style="accent-color: var(--danger);"> Mostra banner in Home Page
                        </label>
                        <div style="font-size: 12px; color: var(--text-main); margin-top: 8px;">Se attivo, vedrai un avviso rosso nella Home Page per tutta la durata dei giorni validi.</div>
                    </div>

                    <button id="btn-salva-dds" class="dds-btn-esegui" onclick="window.salvaDDS()"><i class="fa-solid fa-floppy-disk"></i> Salva DDS</button>
                    <button class="dds-btn-chiudi" onclick="window.chiudiModal('modal-aggiungi-dds')">Annulla</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(container);
}
