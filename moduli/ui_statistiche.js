export function initUIStatistiche() {
    if (document.getElementById('modal-statistiche-main')) return;

    // Iniezione CSS specifico per le Statistiche e Modali Malattia
    const style = document.createElement('style');
    style.innerHTML = `
        /* FIX FORZATO: Modale a finestra al centro dello schermo */
        #modal-statistiche-main, #modal-limite-malattia, #modal-calcolo-manuale-malattia {
            background-color: rgba(0, 0, 0, 0.5) !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            z-index: 1000;
        }
        
        .stat-header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-shrink: 0;
        }

        .stat-header h2 { margin: 0; color: var(--text-main); font-size: 24px; font-weight: 700; display: flex; align-items: center; gap: 8px;}

        .stat-description {
            font-size: 14px;
            color: var(--text-muted);
            line-height: 1.5;
            margin-bottom: 20px;
            text-align: left;
            background: var(--surface-hover);
            padding: 12px;
            border-radius: var(--radius-md);
            border-left: 4px solid var(--primary);
        }

        .stat-content-area { width: 100%; display: flex; flex-direction: column; gap: 16px; }
        
        .stat-card-panel { 
            background: var(--surface); 
            padding: 24px; 
            border-radius: var(--radius-lg); 
            box-shadow: var(--shadow-md); 
            border: 1px solid var(--border-color); 
            display: flex; 
            flex-direction: column; 
            gap: 16px; 
            flex-shrink: 0;
        }

        .stat-editor-label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 8px; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;}
        .stat-input-help { font-size: 13px; color: var(--text-muted); margin-top: -4px; margin-bottom: 16px;}
        
        .stat-results-container { 
            display: none; 
            background: var(--surface); 
            padding: 24px; 
            border-radius: var(--radius-lg); 
            box-shadow: var(--shadow-md); 
            border: 1px solid var(--border-color); 
            margin-top: 10px; 
            flex-shrink: 0;
        }
        
        .stat-results-title { color: var(--text-main); font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; display:flex; align-items:center; gap:8px; }
        
        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border-color); }
        .stat-row:last-child { border-bottom: none; padding-bottom: 0;}
        .stat-label { font-size: 14px; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 10px; }
        .stat-label i { width: 20px; text-align: center; font-size: 16px; }
        .stat-value { font-size: 16px; font-weight: 700; color: var(--text-main); background: var(--surface-hover); padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border-color); min-width: 30px; text-align: center;}
        
        .color-ferie { color: var(--success); }
        .color-parentale { color: var(--info); }
        .color-sospeso { color: var(--danger); }
        .color-nebbia { color: var(--primary); }
        .color-malattia { color: var(--warning); }
        .color-sangue { color: var(--danger); }
        .color-straord { color: var(--primary); }
        .color-sp { color: var(--text-muted); }

        /* Stili per il calcolatore manuale */
        .manual-calc-header {
            position: sticky;
            top: 0;
            background: var(--surface);
            padding: 15px 0;
            border-bottom: 2px solid var(--border-color);
            z-index: 10;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .totale-manuale-box {
            font-size: 20px;
            font-weight: bold;
            background: var(--surface-hover);
            padding: 8px 16px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
        }
    `;
    document.head.appendChild(style);

    // ==========================================
    // FINESTRA PRINCIPALE: DATI CALENDARIO
    // ==========================================
    const container = document.createElement('div');
    container.id = 'modal-statistiche-main';
    container.className = 'modal-overlay';
    container.onclick = (e) => { window.chiudiSuSfondo(e, 'modal-statistiche-main') };

    container.innerHTML = `
        <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-statistiche-main')"></i>
            
            <div class="stat-header" style="border: none; margin-bottom: 10px; padding-bottom: 0;">
                <h2 style="margin-top: 0; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; width: 100%; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-chart-simple" style="color:var(--primary);"></i> Dati calendario
                </h2>
            </div>

            <!-- Area scrollabile -->
            <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
                
                <p class="stat-description">
                    In questa finestra puoi vedere un riassunto dei dati inseriti nel calendario. Puoi selezionare un periodo inserendo le date qui sotto, lasciando i campi vuoti vedrai i dati inseriti totali. Puoi trovare anche il calcolo della malattia per controllare di non aver superato i 180 giorni in 3 anni e mezzo che fanno scattare la decurtazione della paga.
                </p>

                <div class="stat-content-area animate-pop">
                    <div class="stat-card-panel animate-pop" style="animation-delay: 0s;">
                        <div>
                            <label class="stat-editor-label">Da (Inizio):</label>
                            <input type="date" id="dateStart" class="input-field" style="width: 100%; padding: 14px; border: 2px solid var(--border-color); border-radius: var(--radius-md); box-sizing: border-box; font-size: 15px; background-color: var(--surface); color: var(--text-main); font-family: inherit;">
                        </div>
                        
                        <div style="margin-top: 16px;">
                            <label class="stat-editor-label">A (Fine):</label>
                            <input type="date" id="dateEnd" class="input-field" style="width: 100%; padding: 14px; border: 2px solid var(--border-color); border-radius: var(--radius-md); box-sizing: border-box; font-size: 15px; background-color: var(--surface); color: var(--text-main); font-family: inherit; margin-bottom: 8px;">
                            <div class="stat-input-help">Lascia vuoti i campi per calcolare i dati totali registrati.</div>
                        </div>
                        
                        <button class="btn-action" style="background-color: var(--success); color: white; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; width: 100%; margin-top: 10px; box-shadow: 0 4px 12px rgba(15,157,88,0.2);" onclick="window.calcolaStatistiche(false)"><i class="fa-solid fa-calculator"></i> Vedi dati</button>
                    </div>

                    <div id="results" class="stat-results-container animate-pop" style="animation-delay: 0.1s;">
                        <h3 class="stat-results-title" id="titoloRisultati"><i class="fa-solid fa-square-poll-vertical" style="color:var(--primary);"></i> Risultati Totali Registrati</h3>
                        
                        <div class="stat-row">
                            <div class="stat-label"><i class="fa-solid fa-umbrella-beach color-ferie"></i> Ferie (FER)</div>
                            <div class="stat-value" id="resFerie">0</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label"><i class="fa-solid fa-baby-carriage color-parentale"></i> Congedi Parentali (KNOP)</div>
                            <div class="stat-value" id="resParentali">0</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label"><i class="fa-solid fa-circle-exclamation color-sospeso"></i> Sospesi Riposo</div>
                            <div class="stat-value" id="resSospesi">0</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label"><i class="fa-solid fa-smog color-nebbia"></i> Indennità Nebbia</div>
                            <div class="stat-value" id="resNebbia">0</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label"><i class="fa-solid fa-house-medical color-malattia"></i> Malattia (KMAL)</div>
                            <div class="stat-value" id="resMalattia">0</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label"><i class="fa-solid fa-droplet color-sangue"></i> Donazione Sangue</div>
                            <div class="stat-value" id="resSangue">0</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label"><i class="fa-solid fa-stopwatch color-straord"></i> Ore Straordinario</div>
                            <div class="stat-value" id="resStraord">0h 0m</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label"><i class="fa-solid fa-money-bill-transfer color-sp"></i> Permesso Senza Paga</div>
                            <div class="stat-value" id="resPermessoSP">0h 0m</div>
                        </div>
                    </div>

                    <button class="btn-action" style="background-color: var(--warning); color: #fff; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; width: 100%; margin-top: 10px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);" onclick="window.apriModalLimiteMalattia()">
                        <i class="fa-solid fa-notes-medical"></i> Dati limite malattia
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(container);
}

// ==========================================
// FUNZIONI GLOBALI PER FINESTRE MALATTIA
// ==========================================

window.apriModalLimiteMalattia = () => {
    if (document.getElementById('modal-limite-malattia')) return;

    let totaleMalattia = 0;
    if (typeof window.getTotaleMalattiaCalendario === 'function') {
        totaleMalattia = window.getTotaleMalattiaCalendario();
    }

    const modal = document.createElement('div');
    modal.id = 'modal-limite-malattia';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.onclick = (e) => { window.chiudiSuSfondo(e, 'modal-limite-malattia') };

    modal.innerHTML = `
        <div class="modal-content animate-pop" style="max-width: 400px; padding: 24px; position: relative; text-align: center;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModal('modal-limite-malattia')"></i>
            
            <h2 style="margin-top: 0; color: var(--text-main); font-size: 22px; margin-bottom: 20px;">
                <i class="fa-solid fa-notes-medical" style="color:var(--warning);"></i> Limite Malattia
            </h2>
            
            <p style="color: var(--text-muted); font-size: 15px; margin-bottom: 24px; text-align: left;">
                Ecco il totale dei giorni di malattia (KMAL) registrati nel calendario negli ultimi 42 mesi (3 anni e mezzo).
            </p>

            <div class="stat-card-panel" style="margin-bottom: 24px; padding: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px;">Malattia nel calendario:</div>
                <div style="font-size: 36px; font-weight: 800; color: var(--warning);">${totaleMalattia} <span style="font-size:16px; color:var(--text-main);">giorni</span></div>
            </div>

            <button class="btn-action" style="background-color: var(--primary); color: white; border: none; padding: 14px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; width: 100%;" onclick="window.apriCalcolatoreManualeMalattia()">
                <i class="fa-solid fa-calculator"></i> Apri finestra di calcolo
            </button>
        </div>
    `;
    document.body.appendChild(modal);
};

window.apriCalcolatoreManualeMalattia = () => {
    // Chiude la modale precedente per pulizia
    window.chiudiModal('modal-limite-malattia');

    if (document.getElementById('modal-calcolo-manuale-malattia')) return;

    // Generazione dei 42 mesi a ritroso
    let mesiHtml = '';
    let oggi = new Date();
    
    for (let i = 0; i < 42; i++) {
        let d = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
        let nomeMese = d.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
        // Capitalizza la prima lettera
        nomeMese = nomeMese.charAt(0).toUpperCase() + nomeMese.slice(1);
        
        mesiHtml += `
            <div class="stat-row" style="padding: 10px 0;">
                <label class="stat-label" style="font-weight: 500;">${nomeMese}</label>
                <div style="display:flex; align-items:center; gap: 8px;">
                    <input type="number" min="0" max="31" class="manual-malattia-input input-field" value="0" oninput="window.aggiornaTotaleManualeMalattia()" style="width: 70px; text-align: center; padding: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--surface); color: var(--text-main); font-size: 16px;">
                    <span style="font-size: 12px; color: var(--text-muted);">gg</span>
                </div>
            </div>
        `;
    }

    const modal = document.createElement('div');
    modal.id = 'modal-calcolo-manuale-malattia';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.onclick = (e) => { window.chiudiSuSfondo(e, 'modal-calcolo-manuale-malattia') };

    modal.innerHTML = `
        <div class="modal-content animate-pop" style="max-width: 450px; height: 90vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            
            <i class="fa-solid fa-arrow-left close-modal" style="position: absolute; left: 20px; top: 20px; font-size: 20px; cursor: pointer; color: var(--text-muted); z-index:20;" onclick="window.chiudiModal('modal-calcolo-manuale-malattia'); window.apriModalLimiteMalattia();"></i>
            
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); z-index:20;" onclick="window.chiudiModal('modal-calcolo-manuale-malattia')"></i>
            
            <h2 style="margin-top: 0; color: var(--text-main); font-size: 20px; text-align: center; margin-bottom: 10px; padding-top: 5px;">
                Calcolo Manuale (42 Mesi)
            </h2>

            <div class="manual-calc-header">
                <span style="font-size: 15px; font-weight: 600; color: var(--text-main);">Totale inserito:</span>
                <div class="totale-manuale-box">
                    <span id="totaleManualeTesto">0</span> / 180
                </div>
            </div>

            <!-- Area scrollabile dei 42 mesi -->
            <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; padding-bottom: 20px;">
                <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; margin-bottom: 15px;">
                    Inserisci i giorni di malattia fatti nei mesi precedenti per verificare la somma totale degli ultimi 3 anni e mezzo.
                </p>
                ${mesiHtml}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.aggiornaTotaleManualeMalattia = () => {
    let inputs = document.querySelectorAll('.manual-malattia-input');
    let totale = 0;
    
    inputs.forEach(inp => {
        let val = parseInt(inp.value);
        if (!isNaN(val) && val > 0) {
            totale += val;
        }
    });

    let totEl = document.getElementById('totaleManualeTesto');
    if(totEl) {
        totEl.innerText = totale;
        // Se supera i 180 diventa rosso per avvisare l'utente
        if (totale > 180) {
            totEl.style.color = 'var(--danger)';
        } else {
            totEl.style.color = 'var(--text-main)';
        }
    }
};
