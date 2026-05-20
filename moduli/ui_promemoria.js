export function initUIPromemoria() {
    if (document.getElementById('modal-promemoria-main')) return;

    // Iniezione librerie Flatpickr (se non già presenti)
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
        #modal-promemoria-main {
            background-color: var(--bg-color);
            transition: background-color var(--transition-speed), color var(--transition-speed);
            overflow-y: auto;
            align-items: flex-start;
            padding: 0;
        }

        .prom-wrapper {
            padding: calc(20px + env(safe-area-inset-top)) 20px 40px 20px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .prom-header {
            width: 100%;
            max-width: 440px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }

        .prom-header h2 { margin: 0; color: var(--warning); font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 8px; letter-spacing: -0.5px; }

        .prom-content-area { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 20px; }
        
        /* CARD PROMEMORIA */
        .promemoria-card { background: var(--surface); padding: 20px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; border-left: 6px solid var(--warning); transition: transform 0.2s, box-shadow 0.2s; animation: slideInUp 0.3s ease both;}
        .promemoria-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .prom-title { font-weight: 700; font-size: 16px; color: var(--text-main); display: flex; align-items: center; gap: 8px; line-height: 1.4; }
        .prom-date { font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; font-weight: 500;}
        .prom-note-text { font-size: 13px; color: var(--text-main); background: var(--surface-hover); padding: 12px; border-radius: 10px; border-left: 3px solid var(--border-color); margin-top: 5px; font-style: italic; white-space: pre-wrap; line-height: 1.5; }
        
        .prom-btn-delete { background-color: var(--surface); color: var(--danger); border: 1px solid var(--danger); padding: 12px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: all 0.2s; width: 100%; margin-top: 5px; }
        .prom-btn-delete:active { background-color: var(--danger-light); transform: scale(0.97); }

        .prom-btn-add-main { background-color: var(--warning); color: #1a1a1a; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; box-shadow: 0 4px 12px rgba(255,152,0,0.3); width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px; transition: all 0.2s; }
        .prom-btn-add-main:hover { transform: translateY(-2px); filter: brightness(1.05); }
        .prom-btn-add-main:active { transform: translateY(1px); box-shadow: none; }

        /* SOTTOMODALE AGGIUNGI */
        .prom-input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .prom-input-group label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .prom-input-field, .prom-input-group input[type="text"], .prom-input-group textarea, .prom-input-group input[type="time"] { padding: 14px; border: 2px solid var(--border-color); border-radius: var(--radius-md); font-size: 15px; width: 100%; box-sizing: border-box; font-family: inherit; background-color: var(--surface); color: var(--text-main); transition: all 0.2s; }
        .prom-input-field:focus, .prom-input-group input[type="text"]:focus, .prom-input-group textarea:focus, .prom-input-group input[type="time"]:focus { border-color: var(--warning); outline: none; box-shadow: 0 0 0 4px rgba(255,152,0,0.2); }
        
        .input-with-icon { padding-left: 42px !important; background-color: var(--surface) !important; }

        .prom-checkbox-group { display: flex; flex-direction: column; gap: 12px; background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); }
        .prom-checkbox-label { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: var(--text-main); cursor: pointer; }
        .prom-checkbox-label input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; margin: 0; accent-color: var(--warning); }

        .prom-btn-esegui { background-color: var(--warning); color: #1a1a1a; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: 12px; cursor: pointer; width: 100%; margin-top: 10px; margin-bottom: 12px; display: flex; justify-content: center; align-items: center; gap: 8px; transition: all 0.2s; }
        .prom-btn-esegui:active { transform: scale(0.98); }
        
        .prom-btn-chiudi { background-color: transparent; color: var(--text-muted); border: 1px solid var(--border-color); padding: 14px; font-size: 15px; font-weight: 600; border-radius: 12px; cursor: pointer; width: 100%; text-align: center; transition: all 0.2s;}
        .prom-btn-chiudi:active { background-color: var(--surface-hover); }
        
        .prom-empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 15px; font-weight: 500; background: var(--surface-hover); border-radius: var(--radius-md); border: 1px dashed var(--border-color); }

        @keyframes slideInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);

    // Iniezione HTML Principale
    const container = document.createElement('div');
    container.id = 'modal-promemoria-main';
    container.className = 'modal-overlay';
    container.innerHTML = `
        <div class="prom-wrapper">
            <div class="prom-header">
                <button style="background:none; border:none; font-size: 20px; color: var(--text-main); cursor:pointer; padding:10px; transition: 0.2s;" onmouseover="this.style.color='var(--warning)'" onmouseout="this.style.color='var(--text-main)'" onclick="window.chiudiModal('modal-promemoria-main')"><i class="fa-solid fa-arrow-left"></i></button>
                <h2><i class="fa-solid fa-stopwatch"></i> Promemoria</h2>
                <div style="width: 44px;"></div>
            </div>

            <div class="prom-content-area">
                <button class="prom-btn-add-main" onclick="window.apriModaleAggiungiPromemoria()"><i class="fa-solid fa-bell-plus"></i> Nuovo Promemoria</button>
                <div id="promemoria-list-container"></div>
            </div>
        </div>

        <!-- Sottomodale per aggiungere un promemoria -->
        <div id="modal-aggiungi-promemoria" class="modal-overlay" style="z-index: 7500;">
            <div class="modal-content">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModal('modal-aggiungi-promemoria')"></i>
                <h3 style="margin-top: 0; margin-bottom: 24px; color: var(--text-main); text-align: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; font-weight: 800;"><i class="fa-solid fa-stopwatch" style="color:var(--warning);"></i> Nuovo Promemoria</h3>
                
                <div class="prom-input-group">
                    <label>TITOLO (Nel calendario)</label>
                    <input type="text" id="prom-titolo" placeholder="Es. Visita medica">
                </div>

                <div class="prom-input-group">
                    <label>GIORNI DI VALIDITÀ</label>
                    <div style="position: relative;">
                        <i class="fa-regular fa-calendar" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); z-index: 5;"></i>
                        <input type="text" id="prom-date-picker" class="input-with-icon" placeholder="Seleziona le date..." readonly>
                    </div>
                </div>

                <div class="prom-input-group">
                    <label>NOTE / DESCRIZIONE</label>
                    <textarea id="prom-note" rows="3" placeholder="Aggiungi dettagli o note..."></textarea>
                </div>

                <div class="prom-input-group">
                    <label>AVVISI SUL CALENDARIO (All'avvio):</label>
                    <div class="prom-checkbox-group">
                        <label class="prom-checkbox-label"><input type="checkbox" value="day_before" class="rem-prom-checkbox"> Il giorno prima</label>
                        <label class="prom-checkbox-label"><input type="checkbox" value="first_day" class="rem-prom-checkbox"> Il primo giorno</label>
                        <label class="prom-checkbox-label"><input type="checkbox" value="all_days" class="rem-prom-checkbox" checked> Tutti i giorni</label>
                    </div>
                </div>

                <div class="prom-input-group" id="prom-time-picker-group" style="display: none; background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <label style="color: var(--warning);"><i class="fa-solid fa-bell"></i> ORARIO NOTIFICA PUSH APP</label>
                    <input type="time" id="prom-orario" style="background: var(--surface); border: 2px solid var(--border-color); border-radius: 10px; padding: 12px; font-size: 15px; width: 100%; box-sizing: border-box; font-family: inherit; color: var(--text-main);">
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px; font-weight: 500;">Seleziona un orario per ricevere una notifica push nei giorni di validità.</div>
                </div>

                <div class="prom-input-group" style="background: var(--warning-light); padding: 16px; border-radius: var(--radius-md); border: 1px dashed var(--warning-border);">
                    <label class="prom-checkbox-label" style="font-weight: 700; color: var(--warning);">
                        <input type="checkbox" id="prom-banner-attiva" style="accent-color: var(--warning);"> Mostra banner in Home Page
                    </label>
                    <div style="font-size: 12px; color: var(--text-main); margin-top: 8px;">Se attivo, vedrai un avviso nella Home Page per tutta la durata dei giorni validi.</div>
                </div>

                <button id="btn-salva-prom" class="prom-btn-esegui" onclick="window.salvaPromemoria()"><i class="fa-solid fa-floppy-disk"></i> Salva Promemoria</button>
                <button class="prom-btn-chiudi" onclick="window.chiudiModal('modal-aggiungi-promemoria')">Annulla</button>
            </div>
        </div>
    `;
    document.body.appendChild(container);
}
