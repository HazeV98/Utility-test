export function initUIStatistiche() {
    if (document.getElementById('modal-statistiche-main')) return;

    // Iniezione CSS specifico per le Statistiche
    const style = document.createElement('style');
    style.innerHTML = `
        #modal-statistiche-main {
            background-color: var(--bg-color);
            transition: background-color var(--transition-speed), color var(--transition-speed);
            overflow-y: auto;
            align-items: flex-start;
            padding: 0;
        }
        
        .stat-wrapper {
            padding: calc(20px + env(safe-area-inset-top)) 20px 40px 20px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .stat-header {
            width: 100%;
            max-width: 440px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .stat-header h2 { margin: 0; color: var(--text-main); font-size: 24px; font-weight: 700; display: flex; align-items: center; gap: 8px;}

        .stat-content-area { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 16px; }
        
        .stat-card-panel { 
            background: var(--surface); 
            padding: 24px; 
            border-radius: var(--radius-lg); 
            box-shadow: var(--shadow-md); 
            border: 1px solid var(--border-color); 
            display: flex; 
            flex-direction: column; 
            gap: 16px; 
            opacity: 0; 
        }

        .stat-editor-label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 8px; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;}
        .stat-input-help { font-size: 13px; color: var(--text-muted); margin-top: -4px; margin-bottom: 16px;}
        
        .stat-results-container { display: none; background: var(--surface); padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); border: 1px solid var(--border-color); margin-top: 10px; opacity: 0;}
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
    `;
    document.head.appendChild(style);

    // Iniezione dell'HTML
    const container = document.createElement('div');
    container.id = 'modal-statistiche-main';
    container.className = 'modal-overlay';
    container.innerHTML = `
        <div class="stat-wrapper">
            <div class="stat-header">
                <button style="background:none; border:none; font-size: 20px; color: var(--text-main); cursor:pointer; padding:10px; transition: 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-main)'" onclick="window.chiudiModal('modal-statistiche-main')"><i class="fa-solid fa-arrow-left"></i></button>
                <h2><i class="fa-solid fa-chart-simple" style="color:var(--primary);"></i> Statistiche</h2>
                <div style="width: 40px;"></div>
            </div>

            <div class="stat-content-area animate-pop">
                <div class="stat-card-panel animate-pop" style="animation-delay: 0s;">
                    <div>
                        <label class="stat-editor-label">Da (Inizio):</label>
                        <input type="date" id="dateStart" class="input-field">
                    </div>
                    
                    <div>
                        <label class="stat-editor-label">A (Fine):</label>
                        <input type="date" id="dateEnd" class="input-field" style="margin-bottom: 8px;">
                        <div class="stat-input-help">Lascia vuoti i campi per calcolare i dati totali registrati.</div>
                    </div>
                    
                    <button class="btn-action" onclick="window.calcolaStatistiche(false)"><i class="fa-solid fa-calculator"></i> Calcola Statistiche</button>
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
            </div>
        </div>
    `;
    document.body.appendChild(container);
} 
