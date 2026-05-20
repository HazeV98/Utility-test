export function initUIRotazioni() {
    if (document.getElementById('modal-rotazioni-main')) return;

    // Iniezione dinamica delle librerie necessarie (se non già presenti)
    const scriptUrls = [
        "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
        "https://cdn.jsdelivr.net/npm/@panzoom/panzoom@4.5.0/dist/panzoom.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    ];
    scriptUrls.forEach(src => {
        if (!document.querySelector(`script[src="${src}"]`)) {
            const s = document.createElement('script');
            s.src = src;
            document.head.appendChild(s);
        }
    });

    // Iniezione CSS specifico
    const style = document.createElement('style');
    style.innerHTML = `
        #modal-rotazioni-main {
            background-color: var(--bg-color);
            transition: background-color var(--transition-speed), color var(--transition-speed);
            overflow-y: auto;
            align-items: flex-start;
            padding: 0;
        }

        .rotazioni-wrapper {
            padding: calc(20px + env(safe-area-inset-top)) 20px 40px 20px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* --- OVERRIDE COLORI CELLE --- */
        :root {
            --bg-al: #e8f5e9; --text-al: #2e7d32; --border-al: #c8e6c9;
            --bg-ri: #f1f8e9; --text-ri: #558b2f; --border-ri: #dcedc8;
            --bg-disp: #fff8e1; --text-disp: #f57f17; --border-disp: #ffecb3;
            --bg-espe: #f3e5f5; --text-espe: #6a1b9a; --border-espe: #e1bee7;
            --bg-fer: #e0f7fa; --text-fer: #00838f; --border-fer: #b2ebf2;
        }
        :root[data-theme="dark"] {
            --bg-al: rgba(46, 125, 50, 0.25); --text-al: #81c784; --border-al: rgba(46, 125, 50, 0.5);
            --bg-ri: rgba(85, 139, 47, 0.25); --text-ri: #aed581; --border-ri: rgba(85, 139, 47, 0.5);
            --bg-disp: rgba(245, 127, 23, 0.25); --text-disp: #ffd54f; --border-disp: rgba(245, 127, 23, 0.5);
            --bg-espe: rgba(106, 27, 154, 0.25); --text-espe: #ce93d8; --border-espe: rgba(106, 27, 154, 0.5);
            --bg-fer: rgba(0, 131, 143, 0.25); --text-fer: #4dd0e1; --border-fer: rgba(0, 131, 143, 0.5);
        }
        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
                --bg-al: rgba(46, 125, 50, 0.2); --text-al: #81c784; --border-al: rgba(46, 125, 50, 0.4);
                --bg-ri: rgba(85, 139, 47, 0.2); --text-ri: #aed581; --border-ri: rgba(85, 139, 47, 0.4);
                --bg-disp: rgba(245, 127, 23, 0.2); --text-disp: #ffd54f; --border-disp: rgba(245, 127, 23, 0.4);
                --bg-espe: rgba(106, 27, 154, 0.2); --text-espe: #ce93d8; --border-espe: rgba(106, 27, 154, 0.4);
                --bg-fer: rgba(0, 131, 143, 0.2); --text-fer: #4dd0e1; --border-fer: rgba(0, 131, 143, 0.4);
            }
        }

        /* --- HEADER --- */
        .rot-header { width: 100%; max-width: 440px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .rot-header h2 { margin: 0; color: var(--primary); font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 8px; flex: 2; justify-content: center; }
        
        .rot-header-icon-btn { background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--text-main); cursor: pointer; transition: all 0.2s; position: relative;}
        .rot-header-icon-btn:active { transform: scale(0.95); }
        .rot-badge-req { background: var(--danger); color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; line-height: 20px; text-align: center; font-weight: 800; display: inline-block; box-shadow: 0 2px 4px rgba(217, 48, 37, 0.4);}

        /* CARD PANELS (Auth/Request) */
        .rot-card-panel { width: 100%; max-width: 440px; background: var(--surface); padding: 32px 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); box-sizing: border-box; text-align: center; border: 1px solid var(--border-color); margin-bottom: 20px;}
        #rot-content-section { display: none; width: 100%; max-width: 440px; flex-direction: column; gap: 16px; }
        
        .rot-card-panel p { color: var(--text-muted); font-size: 15px; line-height: 1.5; margin-bottom: 20px; }

        .rot-input, .rot-select {
            width: 100%; padding: 14px; margin-bottom: 16px; border: 2px solid var(--border-color); border-radius: var(--radius-md); box-sizing: border-box; font-size: 15px; background-color: var(--surface); color: var(--text-main); font-family: inherit; transition: all 0.2s;
        }
        .rot-input:focus, .rot-select:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 4px var(--primary-glow); }

        #rot-input-codice-turno { font-size: 18px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; text-align: center;}
        #rot-input-codice-turno::placeholder { text-transform: none; font-size: 15px; letter-spacing: normal; font-weight: normal; }
        
        /* BOTTONI */
        .rot-btn { background-color: var(--primary); color: white; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; width: 100%; transition: all 0.2s; margin-bottom: 12px; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 12px var(--primary-glow); }
        .rot-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
        .rot-btn:active:not(:disabled) { transform: translateY(1px); box-shadow: none; }
        
        .rot-btn-outline { background-color: transparent; border: 2px solid var(--border-color); color: var(--text-muted); padding: 14px; font-size: 15px; font-weight: 600; border-radius: var(--radius-md); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
        .rot-btn-outline:active { background-color: var(--surface-hover); transform: scale(0.98); }

        #rot-error-msg, .rot-error-msg { color: var(--danger); font-size: 14px; margin-top: 10px; min-height: 20px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;}

        /* --- CARDS MENSILI --- */
        .rot-month-card { background: var(--surface); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-md); width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); animation: slideInUp 0.4s ease both;}
        .rot-month-card h3 { margin-top: 0; color: var(--text-main); text-align: center; border-bottom: 2px solid var(--border-color); padding-bottom: 16px; margin-bottom: 20px; text-transform: capitalize; font-weight: 800; font-size: 18px;}
        
        .rot-container-box { background: var(--surface-hover); border: 1px solid var(--border-color); padding: 20px; border-radius: 16px; margin-bottom: 16px; box-shadow: var(--shadow-sm); }
        .rot-title-box { margin: 0 0 16px 0; color: var(--primary); font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;}

        .rot-btn-grid { display: flex; flex-direction: column; gap: 12px; }

        .rot-file-btn { width: 100%; background-color: var(--primary); color: white; border: none; padding: 14px 16px; font-size: 15px; border-radius: 12px; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: var(--shadow-sm); transition: all 0.2s; box-sizing: border-box; gap: 8px;}
        .rot-file-btn:active { transform: translateY(1px); box-shadow: none; }
        .rot-btn-search { background-color: var(--success); color: white; } 
        .rot-btn-table { background-color: var(--info); color: white; }
        .rot-btn-pdf { background-color: transparent; border: 1px solid var(--border-color); color: var(--text-muted); box-shadow: none;}

        /* --- MODULI RICERCA E BOX RISULTATI --- */
        .rot-modulo-ricerca { background: var(--surface-hover); border: 1px solid var(--border-color); padding: 20px; border-radius: 16px; margin-top: 20px; }
        .rot-modulo-ricerca h4 { margin-top: 0; color: var(--primary); margin-bottom: 12px; font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px;}
        
        .rot-risultato-box { background: var(--surface); border: 1px solid var(--border-color); border-left: 4px solid var(--primary); padding: 16px; border-radius: 0 12px 12px 0; margin-top: 16px; min-height: 40px; font-size: 14px; color: var(--text-main); }
        .rot-risultato-box ul { padding-left: 20px; margin: 12px 0 0 0; color: var(--text-main); }
        .rot-risultato-box li { margin-bottom: 8px; }
        .rot-turn-details-box { margin-top: 10px; font-size: 13px; color: var(--text-muted); background: var(--surface-hover); padding: 12px; border-radius: 10px; border: 1px solid var(--border-color); line-height: 1.5;}

        /* --- TABELLA HTML COLORI --- */
        .rot-table-responsive { width: 100%; max-height: 75vh; overflow: auto; -webkit-overflow-scrolling: touch; margin-top: 16px; border: 1px solid var(--border-color); border-radius: 12px; position: relative; background: var(--surface); box-shadow: var(--shadow-sm); }
        .rot-rotazioni-table { border-collapse: separate; border-spacing: 0; width: max-content; background: var(--surface); font-size: 13px; text-align: center; }
        .rot-rotazioni-table th, .rot-rotazioni-table td { border-bottom: 1px solid var(--border-color); border-right: 1px solid var(--border-color); padding: 12px 10px; white-space: nowrap; color: var(--text-main); }
        
        .rot-rotazioni-table th { background-color: var(--primary); color: white; position: sticky; top: 0; z-index: 2; font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;}
        .rot-rotazioni-table td:first-child, .rot-rotazioni-table th:first-child { position: sticky; left: 0; min-width: 120px; max-width: 160px; white-space: normal; line-height: 1.4; }
        .rot-rotazioni-table td:first-child { background-color: var(--surface-hover); font-weight: 700; text-align: left; border-right: 2px solid var(--border-color); color: var(--primary); font-size: 12px; z-index: 3; }
        .rot-rotazioni-table th:first-child { z-index: 4; border-right: 2px solid var(--primary-hover); }

        .cell-al { background-color: var(--bg-al); color: var(--text-al); font-weight: 700; border: 1px solid var(--border-al);}
        .cell-ri { background-color: var(--bg-ri); color: var(--text-ri); border: 1px solid var(--border-ri);}
        .cell-disp { background-color: var(--bg-disp); color: var(--text-disp); font-weight: 700; border: 1px solid var(--border-disp);}
        .cell-espe { background-color: var(--bg-espe); color: var(--text-espe); font-weight: 700; border: 1px solid var(--border-espe);}
        .cell-fer { background-color: var(--bg-fer); color: var(--text-fer); font-size: 11px; font-weight: 800; border: 1px solid var(--border-fer);}

        .rot-utente-row { background: var(--surface-hover); border: 1px solid var(--border-color); padding: 16px; margin-bottom: 12px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; transition: transform 0.2s; box-shadow: var(--shadow-sm);}
        .rot-utente-row:active { transform: scale(0.98); }

        details > summary::-webkit-details-marker { display: none; }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);

    // Iniezione HTML Principale
    const container = document.createElement('div');
    container.id = 'modal-rotazioni-main';
    container.className = 'modal-overlay';
    container.innerHTML = `
        <div class="rotazioni-wrapper">
            <div class="rot-header">
                <button style="background:none; border:none; font-size: 20px; color: var(--text-main); cursor:pointer; padding:10px; transition: 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-main)'" onclick="window.chiudiModal('modal-rotazioni-main')"><i class="fa-solid fa-arrow-left"></i></button>
                <h2><i class="fa-solid fa-users"></i> Rotazioni</h2>
                <div style="display: flex; gap: 12px; align-items: center; justify-content: flex-end; width: auto;">
                    <button id="rot-btn-miei-dati" class="rot-header-icon-btn" style="display:none;" onclick="window.apriMieiDatiModalRotazioni()" title="I Miei Dati">
                        <i class="fa-solid fa-user-pen"></i>
                    </button>
                    <button id="rot-btn-gestione-accessi" class="rot-header-icon-btn" style="display:none;" onclick="window.apriGestioneAccessiModalRot()" title="Gestione">
                        <i class="fa-solid fa-users-gear"></i>
                        <span id="rot-badge-header" class="rot-badge-req" style="display:none; position:absolute; top:-6px; right:-6px;"></span>
                    </button>
                </div>
            </div>

            <div id="rot-auth-section" class="rot-card-panel">
                <div id="rot-login-warning" style="display: none; text-align: center;">
                    <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--text-main); margin-top: 0; font-weight: 800;">Accesso Riservato</h3>
                    <p>Effettua il login o registrati dalla Home Page per continuare.</p>
                    <button class="rot-btn" onclick="window.chiudiModal('modal-rotazioni-main')"><i class="fa-solid fa-house"></i> Vai alla Home</button>
                </div>
                
                <div id="rot-pending-section" style="display: none; text-align: center;">
                    <i class="fa-solid fa-hourglass-half" style="font-size: 48px; color: var(--info); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--info); font-weight: 800; font-size: 20px; margin-top: 0;">Richiesta In Attesa</h3>
                    <p>La tua richiesta di accesso è in fase di valutazione da parte di un amministratore.</p>
                    <button class="rot-btn" style="background-color: var(--info);" onclick="window.initRotazioniState()"><i class="fa-solid fa-rotate-right"></i> Aggiorna</button>
                </div>

                <div id="rot-request-section" style="display: none; text-align: left;">
                    <h3 style="color: var(--primary); text-align: center; margin-top: 0; font-size: 22px; font-weight: 800;"><i class="fa-solid fa-address-card"></i> Richiesta Accesso</h3>
                    
                    <div id="rot-intro-request">
                        <p style="font-size: 15px; color: var(--text-muted); text-align: center; margin-bottom: 24px; line-height: 1.5;">
                            In questa pagina troverai le rotazioni dei turni.<br>Per accedere si deve dare il consenso a condividere i propri dati nelle rotazioni. Puoi richiedere l'accesso qui sotto.
                        </p>
                        <button class="rot-btn" onclick="window.mostraFormRichiestaRot()"><i class="fa-solid fa-paper-plane"></i> Compila Richiesta</button>
                    </div>

                    <div id="rot-form-request" style="display: none;">
                        <p style="font-size: 14px; color: var(--text-muted); text-align: center; margin-bottom: 20px; font-weight: 500;">Verifica i tuoi dati e scegli la tua rotazione di appartenenza.</p>
                        
                        <input type="text" id="rot-req-nome" class="rot-input" placeholder="Nome *">
                        <input type="text" id="rot-req-cognome" class="rot-input" placeholder="Cognome *">
                        <input type="text" id="rot-req-matricola" class="rot-input" placeholder="Matricola *">
                        <input type="text" id="rot-req-omonimia" class="rot-input" placeholder="Numero omonimia es. 02 (Opzionale)">
                        
                        <select id="rot-req-rotazione" class="rot-select" style="margin-top: 8px;">
                            <option value="" disabled selected>-- Seleziona Rotazione di Appartenenza --</option>
                        </select>

                        <div id="rot-div-mansione-req" style="display:none; margin-top: 8px;">
                            <select id="rot-req-mansione" class="rot-select">
                                <option value="" disabled selected>-- Seleziona Mansione --</option>
                                <option value="Preposto al comando">Preposto al comando</option>
                                <option value="Marinaio">Marinaio</option>
                                <option value="Comandante">Comandante</option>
                                <option value="Timoniere">Timoniere</option>
                                <option value="Marinaio polivalente">Marinaio polivalente</option>
                                <option value="Direttore di macchina">Direttore di macchina</option>
                            </select>
                        </div>
                        
                        <div id="rot-div-data-riposo-req" style="display:none; margin-top: 8px;">
                            <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-align: left; display: block; margin-bottom: 8px;">DATA DI UN TUO RIPOSO SINGOLO *</label>
                            <input type="date" id="rot-req-data-riposo" class="rot-input">
                        </div>
                        
                        <div style="background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-top: 16px;">
                            <label style="display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: var(--text-main); cursor: pointer; font-weight: 500;">
                                <input type="checkbox" id="rot-req-consenso" style="width: 20px; height: 20px; margin: 0; margin-top: 2px; accent-color: var(--primary); cursor: pointer;">
                                <span style="flex:1; line-height: 1.4;">Accetto di condividere i miei dati nelle tabelle delle rotazioni visibili agli altri colleghi.</span>
                            </label>
                        </div>

                        <button class="rot-btn" id="rot-btn-invia-req" style="margin-top: 20px; background-color: var(--success);" onclick="window.inviaRichiestaAccessoRot()"><i class="fa-solid fa-paper-plane"></i> Invia Richiesta</button>
                        <div id="rot-req-error-msg" class="rot-error-msg"></div>
                    </div>
                </div>
            </div>

            <div id="rot-content-section">
                <div id="rot-rotazioni-list"></div>
            </div>
        </div>

        <!-- MODALI SPECIFICHE PER LE ROTAZIONI -->
        <div id="rot-search-modal" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-search-modal')">
            <div class="modal-content">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModalRotazioni('rot-search-modal')"></i>
                <h3 id="rot-modal-title" style="margin-top:0; margin-bottom: 20px; color:var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-magnifying-glass"></i> Ricerca Turni</h3>
                
                <div id="rot-modal-status" style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 15px;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i> In attesa elaborazione dati...
                </div>

                <div id="rot-modal-search-sections" style="display:none;">
                    <div class="rot-modulo-ricerca" style="margin-top: 0;">
                        <h4><i class="fa-solid fa-user-clock"></i> Cerca chi fa un turno</h4>
                        <div style="display: flex; gap: 10px;">
                            <input type="number" id="rot-input-giorno-turno" class="rot-input" min="1" max="31" placeholder="Giorno (Es. 15)" style="flex: 1;">
                            <input type="text" id="rot-input-codice-turno" class="rot-input" placeholder="Turno" style="flex: 2;">
                        </div>
                        <button class="rot-btn" style="padding: 14px; margin-top:5px;" onclick="window.cercaTurnoRot()"><i class="fa-solid fa-search"></i> Cerca</button>
                        <div id="rot-risultato-turno" class="rot-risultato-box" style="display: none;"></div>
                    </div>

                    <div class="rot-modulo-ricerca">
                        <h4><i class="fa-solid fa-right-left"></i> Trova colleghi per un cambio</h4>
                        <input type="number" id="rot-input-giorno-cambio" class="rot-input" min="1" max="31" placeholder="Giorno del mese (1-31)">
                        <select id="rot-select-fase-cambio" class="rot-select">
                            <option value="Terzo">Fase: Di Terzo</option>
                            <option value="Mezzo">Fase: Di Mezzo</option>
                            <option value="Primo">Fase: Di Primo</option>
                            <option value="Riposo">Fase: Di Riposo</option>
                        </select>
                        <button class="rot-btn" style="padding: 14px; margin-top:5px; background-color: var(--success);" onclick="window.cercaCambiRot()"><i class="fa-solid fa-search"></i> Cerca Cambi</button>
                        <div id="rot-risultato-cambi" class="rot-risultato-box" style="display: none;"></div>
                    </div>
                </div>
            </div>
        </div>

        <div id="rot-future-search-modal" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-future-search-modal')">
            <div class="modal-content">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModalRotazioni('rot-future-search-modal')"></i>
                <h3 id="rot-future-modal-title" style="margin-top:0; margin-bottom: 20px; color:var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-crystal-ball"></i> Ricerca Mesi Successivi</h3>

                <div class="rot-modulo-ricerca" style="margin-top: 0; background: transparent; border: none; padding: 0;">
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display:block; margin-bottom:8px;">DATA FUTURA *</label>
                    <div style="position: relative;">
                        <i class="fa-regular fa-calendar" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                        <input type="date" id="rot-input-date-futura" class="rot-input" style="margin-bottom: 20px; padding-left: 40px;">
                    </div>
                    
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display:block; margin-bottom:8px;">TROVA I COLLEGHI IN FASE DI:</label>
                    <select id="rot-select-fase-futura" class="rot-select" style="margin-bottom: 20px;">
                        <option value="Terzo">Di Terzo (1° o 2° Giorno)</option>
                        <option value="Mezzo">Di Mezzo (3° o 4° Giorno)</option>
                        <option value="Primo">Di Primo (5° o 6° Giorno)</option>
                        <option value="Riposo">Di Riposo (Singolo o Doppio)</option>
                    </select>
                    
                    <button class="rot-btn" style="background-color: var(--success); padding: 16px;" onclick="window.eseguiRicercaFuturaRot()"><i class="fa-solid fa-search"></i> Avvia Previsione</button>
                    <div id="rot-risultato-futuro" class="rot-risultato-box" style="display: none;"></div>
                </div>
            </div>
        </div>

        <div id="rot-table-modal" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-table-modal')">
            <div class="modal-content" style="max-width: 1200px; padding: 20px; display: flex; flex-direction: column; background: var(--bg-color);">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModalRotazioni('rot-table-modal')"></i>
                <h3 id="rot-table-modal-title" style="margin-top:0; color:var(--primary); padding-right: 40px; font-weight: 800; font-size: 20px;"><i class="fa-solid fa-table"></i> Tabella Rotazione</h3>
                <div id="rot-table-container"></div>
            </div>
        </div>

        <!-- MODALI GESTIONE/PROFILO -->
        <div id="rot-modal-miei-dati" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-miei-dati')">
            <div class="modal-content" style="max-width: 440px; text-align: left;">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModalRotazioni('rot-modal-miei-dati')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:var(--primary); text-align: center; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-user-pen"></i> I Miei Dati</h3>
                <p style="font-size: 14px; color: var(--text-muted); text-align: center; margin-bottom: 20px; font-weight: 500;">Aggiorna i tuoi dati o la tua rotazione di appartenenza.</p>
                
                <input type="text" id="rot-edit-nome" class="rot-input" placeholder="Nome *">
                <input type="text" id="rot-edit-cognome" class="rot-input" placeholder="Cognome *">
                <input type="text" id="rot-edit-matricola" class="rot-input" placeholder="Matricola *">
                <input type="text" id="rot-edit-omonimia" class="rot-input" placeholder="Numero omonimia es. 02 (Opzionale)">
                
                <select id="rot-edit-rotazione" class="rot-select" style="margin-top: 10px;">
                    <option value="" disabled selected>-- Seleziona Rotazione --</option>
                </select>

                <div id="rot-div-mansione-edit" style="display:none; margin-top: 10px;">
                    <select id="rot-edit-mansione" class="rot-select">
                        <option value="" disabled selected>-- Seleziona Mansione --</option>
                        <option value="Preposto al comando">Preposto al comando</option>
                        <option value="Marinaio">Marinaio</option>
                        <option value="Comandante">Comandante</option>
                        <option value="Timoniere">Timoniere</option>
                        <option value="Marinaio polivalente">Marinaio polivalente</option>
                        <option value="Direttore di macchina">Direttore di macchina</option>
                    </select>
                </div>
                
                <div id="rot-div-data-riposo-edit" style="display:none; margin-top: 10px;">
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-align: left; display: block; margin-bottom: 8px;">DATA DI UN TUO RIPOSO SINGOLO *</label>
                    <input type="date" id="rot-edit-data-riposo" class="rot-input">
                </div>
                
                <button class="rot-btn" id="rot-btn-salva-dati" style="margin-top: 20px; background-color: var(--success);" onclick="window.salvaMieiDatiRot()"><i class="fa-solid fa-floppy-disk"></i> Salva Modifiche</button>
                <div id="rot-edit-error-msg" class="rot-error-msg"></div>
            </div>
        </div>

        <div id="rot-modal-gestione-accessi" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-gestione-accessi')">
            <div class="modal-content" style="max-width: 440px;">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModalRotazioni('rot-modal-gestione-accessi')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-users-gear"></i> Gestione Accessi</h3>
                
                <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                    <button class="rot-btn" style="background: var(--info); padding: 12px; font-size: 14px; margin: 0; flex: 1; position:relative; box-shadow: var(--shadow-sm);" onclick="window.apriGestioneRichiesteRot()">
                        <i class="fa-solid fa-bell"></i> Richieste
                        <span id="rot-badge-modal" class="rot-badge-req" style="display:none; position:absolute; top:-6px; right:-6px;"></span>
                    </button>
                    <button id="rot-btn-collab-admin" class="rot-btn" style="display:none; background: #9c27b0; padding: 12px; font-size: 14px; margin: 0; flex: 1; box-shadow: var(--shadow-sm);" onclick="window.apriGestioneCollaboratoriRot()">
                        <i class="fa-solid fa-user-shield"></i> Collaboratori
                    </button>
                </div>
                
                <div style="position: relative; margin-bottom: 16px;">
                    <i class="fa-solid fa-search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                    <input type="text" id="rot-search-utenti-abilitati" class="rot-input" placeholder="Cerca collega abilitato..." style="padding-left: 40px; margin-bottom: 0;" onkeyup="window.filtraUtentiAbilitatiRot()">
                </div>
                
                <div id="rot-lista-utenti-abilitati" style="max-height: 55vh; overflow-y: auto; padding-right: 5px;"></div>
            </div>
        </div>

        <div id="rot-modal-gestione-richieste" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-gestione-richieste')">
            <div class="modal-content" style="max-width: 440px; padding: 24px;">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModalRotazioni('rot-modal-gestione-richieste')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:var(--info); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-bell"></i> Richieste in Attesa</h3>
                
                <button class="rot-btn-outline" style="margin-bottom: 20px;" onclick="window.chiudiModalRotazioni('rot-modal-gestione-richieste'); window.apriGestioneAccessiModalRot();"><i class="fa-solid fa-arrow-left"></i> Torna alla Gestione</button>
                <div id="rot-lista-richieste" style="max-height: 55vh; overflow-y: auto; padding-right: 5px;"></div>
            </div>
        </div>

        <div id="rot-modal-dettaglio-utente" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-dettaglio-utente')">
            <div class="modal-content" style="max-width: 380px;">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModalRotazioni('rot-modal-dettaglio-utente')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:var(--primary); text-align: center; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-id-card"></i> Scheda Utente</h3>
                
                <div id="rot-dettaglio-utente-body" style="font-size: 14px; line-height: 1.8; background: var(--surface-hover); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 20px; color: var(--text-main);"></div>
                
                <button id="rot-btn-scarica-pdf" class="rot-btn" style="background: var(--info); margin: 0;" onclick="window.scaricaPDFConsensoRot()"><i class="fa-solid fa-file-pdf"></i> Scarica Modulo Consenso</button>
            </div>
        </div>

        <div id="rot-modal-gestione-collaboratori" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-gestione-collaboratori')">
            <div class="modal-content" style="max-width: 440px;">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModalRotazioni('rot-modal-gestione-collaboratori')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:#9c27b0; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-user-shield"></i> Collaboratori</h3>
                
                <button class="rot-btn-outline" style="margin-bottom: 20px;" onclick="window.chiudiModalRotazioni('rot-modal-gestione-collaboratori'); window.apriGestioneAccessiModalRot();"><i class="fa-solid fa-arrow-left"></i> Torna alla Gestione</button>
                <div id="rot-lista-collaboratori" style="max-height: 55vh; overflow-y: auto; padding-right: 5px;"></div>
            </div>
        </div>
        
        <div id="rot-modal-permessi-collaboratore" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-permessi-collaboratore')">
            <div class="modal-content" style="max-width: 440px;">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModalRotazioni('rot-modal-permessi-collaboratore')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:#9c27b0; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-key"></i> Permessi: <span id="rot-nome-collab-titolo" style="color:var(--text-main);"></span></h3>
                
                <input type="hidden" id="rot-uid-collab-edit">
                <div id="rot-lista-checkbox-rotazioni" style="max-height: 50vh; overflow-y: auto; text-align: left; margin-bottom: 20px; background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);"></div>
                <button class="rot-btn" style="background: var(--success); margin: 0;" onclick="window.salvaPermessiCollabRot()"><i class="fa-solid fa-floppy-disk"></i> Salva Permessi</button>
            </div>
        </div>

        <div id="rot-imageModal" style="display: none; position: fixed; z-index: 20000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); overflow: hidden; animation: fadeIn 0.2s ease;" onclick="window.chiudiSeSfondoModalImgRot(event)">
            <button style="position: absolute; top: calc(20px + env(safe-area-inset-top)); right: 20px; font-size: 28px; color: white; cursor: pointer; background: rgba(255,255,255,0.2); border: none; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 20001; backdrop-filter: blur(4px);" onclick="window.chiudiImageModalRot()"><i class="fa-solid fa-xmark"></i></button>
            
            <div id="rot-imageFlexContainer" style="display:flex; flex-direction: column; justify-content:center; align-items:center; height:100%; padding:20px; padding-bottom: 90px; position: relative;">
                <img id="rot-turnoImage" src="" style="max-width: 100%; max-height: 70vh; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); object-fit: contain; background: white;">
                
                <div style="position: relative; z-index: 20001; margin-top: 20px; background: rgba(242,166,0,0.9); color: #fff; padding: 12px 20px; border-radius: var(--radius-md); font-size: 13px; font-weight: 600; text-align: center; max-width: 90%; box-shadow: 0 4px 15px rgba(242,166,0,0.3); display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 16px;"></i> Controllare sempre la presenza di eventuali varianti.
                </div>
            </div>
            
            <button onclick="window.scaricaImmagineTurnoRot()" style="position: absolute; bottom: calc(30px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); background: var(--info); color: white; border: none; padding: 14px 28px; border-radius: 24px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 20px rgba(0,136,255,0.4); cursor: pointer; z-index: 20001; display: flex; align-items: center; gap: 10px; transition: transform 0.2s;"><i class="fa-solid fa-download"></i> Scarica Immagine</button>
        </div>
    `;
    document.body.appendChild(container);
}
