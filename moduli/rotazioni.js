import { doc, getDoc, collection, getDocs, updateDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =====================================================================
// MODULO ROTAZIONI (unico file): interfaccia (initUIRotazioni) + motore (avviaMotoreRotazioni)
// =====================================================================

// ---------- INTERFACCIA: CSS e HTML dei modali ----------
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
        /* FIX FORZATO: Modale a finestra al centro dello schermo */
        #modal-rotazioni-main {
            background-color: rgba(0, 0, 0, 0.5) !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
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
        .rot-header { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-shrink: 0; }
        .rot-header h2 { margin: 0; color: var(--primary); font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 8px; flex: 2; justify-content: center; }
        
        .rot-header-icon-btn { background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--text-main); cursor: pointer; transition: all 0.2s; position: relative;}
        .rot-header-icon-btn:active { transform: scale(0.95); }
        .rot-badge-req { background: var(--danger); color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; line-height: 20px; text-align: center; font-weight: 800; display: inline-block; box-shadow: 0 2px 4px rgba(217, 48, 37, 0.4);}

        /* CARD PANELS (Auth/Request) */
        .rot-card-panel { width: 100%; background: var(--surface); padding: 32px 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); box-sizing: border-box; text-align: center; border: 1px solid var(--border-color); margin-bottom: 20px;}
        #rot-content-section { display: none; width: 100%; flex-direction: column; gap: 16px; }
        
        .rot-card-panel p { color: var(--text-muted); font-size: 15px; line-height: 1.5; margin-bottom: 20px; }

        .rot-input, .rot-select {
            width: 100%; padding: 14px; margin-bottom: 16px; border: 2px solid var(--border-color); border-radius: var(--radius-md); box-sizing: border-box; font-size: 15px; background-color: var(--surface); color: var(--text-main); font-family: inherit; transition: all 0.2s;
        }
        .rot-input:focus, .rot-select:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 4px var(--primary-glow); }

        #rot-input-codice-turno { font-size: 18px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; text-align: center;}
        #rot-input-codice-turno::placeholder { text-transform: none; font-size: 15px; letter-spacing: normal; font-weight: normal; }
        
        /* BOTTONI */
        .rot-btn { background-color: var(--primary); color: white; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; width: 100%; transition: all 0.2s; margin-bottom: 12px; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 12px var(--primary-glow); flex-shrink: 0;}
        .rot-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
        .rot-btn:active:not(:disabled) { transform: translateY(1px); box-shadow: none; }
        
        .rot-btn-outline { background-color: transparent; border: 2px solid var(--border-color); color: var(--text-muted); padding: 14px; font-size: 15px; font-weight: 600; border-radius: var(--radius-md); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; flex-shrink: 0;}
        .rot-btn-outline:active { background-color: var(--surface-hover); transform: scale(0.98); }

        /* Bottoni icona compatti (accetta/rifiuta richieste) */
        .rot-btn-icon { background: var(--success); color: #fff; border: none; width: 36px; height: 36px; min-width: 36px; padding: 0; border-radius: 50%; font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        .rot-btn-icon:active:not(:disabled) { transform: scale(0.92); }
        .rot-btn-icon:disabled { opacity: 0.6; cursor: not-allowed; }
        .rot-btn-icon-danger { background: transparent; color: var(--danger); border: 2px solid var(--danger); box-shadow: none; }

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
        .rot-modulo-ricerca { background: var(--surface-hover); border: 1px solid var(--border-color); padding: 20px; border-radius: 16px; margin-top: 20px; flex-shrink: 0;}
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
        .rot-rotazioni-table td:first-child, .rot-rotazioni-table th:first-child { position: sticky; left: 0; width: 36px; min-width: 36px; max-width: 36px; z-index: 3; }
        .rot-rotazioni-table td:first-child { background-color: var(--surface-hover); font-weight: 700; text-align: center; color: var(--text-muted); font-size: 12px; }
        .rot-rotazioni-table th:first-child { z-index: 5; }
        .rot-rotazioni-table td:nth-child(2), .rot-rotazioni-table th:nth-child(2) { position: sticky; left: 36px; min-width: 120px; max-width: 160px; white-space: normal; line-height: 1.4; }
        .rot-rotazioni-table td:nth-child(2) { background-color: var(--surface-hover); font-weight: 700; text-align: left; border-right: 2px solid var(--border-color); color: var(--primary); font-size: 12px; z-index: 3; }
        .rot-rotazioni-table th:nth-child(2) { z-index: 4; border-right: 2px solid var(--primary-hover); }

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

    // Iniezione HTML Principale - Modale Finestra
    const container = document.createElement('div');
    container.id = 'modal-rotazioni-main';
    container.className = 'modal-overlay';
    // Chiusura al click sullo sfondo
    container.onclick = (e) => { window.chiudiSuSfondo(e, 'modal-rotazioni-main') };

    container.innerHTML = `
        <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-rotazioni-main')"></i>
            
            <div class="rot-header" style="border: none; margin-bottom: 10px; padding-bottom: 0;">
                <h2 style="margin-top: 0; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; width: 100%; display: flex; justify-content: space-between; align-items: center;">
                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-users"></i> Rotazioni</span>
                    
                    <!-- MARGINE DESTRO AGGIUNTO QUI (margin-right: 36px) PER NON SOVRAPPORSI ALLA X -->
                    <div style="display: flex; gap: 12px; align-items: center; justify-content: flex-end; width: auto; margin-right: 36px;">
                        <button id="rot-btn-miei-dati" class="rot-header-icon-btn" style="display:none;" onclick="window.apriMieiDatiModalRotazioni()" title="I Miei Dati">
                            <i class="fa-solid fa-user-pen"></i>
                        </button>
                        <button id="rot-btn-gestione-accessi" class="rot-header-icon-btn" style="display:none;" onclick="window.apriGestioneAccessiModalRot()" title="Gestione">
                            <i class="fa-solid fa-users-gear"></i>
                            <span id="rot-badge-header" class="rot-badge-req" style="display:none; position:absolute; top:-6px; right:-6px;"></span>
                        </button>
                    </div>
                </h2>
            </div>

            <!-- Area scrollabile -->
            <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
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
        </div>

        <!-- MODALI SPECIFICHE PER LE ROTAZIONI -->
        <div id="rot-search-modal" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-search-modal')">
            <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalRotazioni('rot-search-modal')"></i>
                <h3 id="rot-modal-title" style="margin-top:0; margin-bottom: 20px; color:var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0;"><i class="fa-solid fa-magnifying-glass"></i> Ricerca Turni</h3>
                
                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
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
        </div>

        <div id="rot-future-search-modal" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-future-search-modal')">
            <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalRotazioni('rot-future-search-modal')"></i>
                <h3 id="rot-future-modal-title" style="margin-top:0; margin-bottom: 20px; color:var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0;"><i class="fa-solid fa-crystal-ball"></i> Ricerca Mesi Successivi</h3>

                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
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
        </div>

        <div id="rot-table-modal" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-table-modal')">
            <div class="modal-content" style="max-width: 1200px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative; background: var(--bg-color);">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalRotazioni('rot-table-modal')"></i>
                <h3 id="rot-table-modal-title" style="margin-top:0; color:var(--primary); padding-right: 40px; font-weight: 800; font-size: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0;"><i class="fa-solid fa-table"></i> Tabella Rotazione</h3>
                
                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column;">
                    <div id="rot-table-container"></div>
                </div>
            </div>
        </div>

        <!-- MODALI GESTIONE/PROFILO -->
        <div id="rot-modal-miei-dati" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-miei-dati')">
            <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative; text-align: left;">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalRotazioni('rot-modal-miei-dati')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:var(--primary); text-align: center; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0;"><i class="fa-solid fa-user-pen"></i> I Miei Dati</h3>
                
                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
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
        </div>

        <div id="rot-modal-gestione-accessi" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-gestione-accessi')">
            <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalRotazioni('rot-modal-gestione-accessi')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0;"><i class="fa-solid fa-users-gear"></i> Gestione Accessi</h3>
                
                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-top: 10px; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
                    <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-shrink: 0;">
                        <button class="rot-btn" style="background: var(--info); padding: 12px; font-size: 14px; margin: 0; flex: 1; position:relative; box-shadow: var(--shadow-sm);" onclick="window.apriGestioneRichiesteRot()">
                            <i class="fa-solid fa-bell"></i> Richieste
                            <span id="rot-badge-modal" class="rot-badge-req" style="display:none; position:absolute; top:-6px; right:-6px;"></span>
                        </button>
                        <button id="rot-btn-collab-admin" class="rot-btn" style="display:none; background: #9c27b0; padding: 12px; font-size: 14px; margin: 0; flex: 1; box-shadow: var(--shadow-sm);" onclick="window.apriGestioneCollaboratoriRot()">
                            <i class="fa-solid fa-user-shield"></i> Collaboratori
                        </button>
                    </div>
                    
                    <div style="position: relative; margin-bottom: 16px; flex-shrink: 0;">
                        <i class="fa-solid fa-search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                        <input type="text" id="rot-search-utenti-abilitati" class="rot-input" placeholder="Cerca collega abilitato..." style="padding-left: 40px; margin-bottom: 0;" onkeyup="window.filtraUtentiAbilitatiRot()">
                    </div>
                    
                    <div id="rot-lista-utenti-abilitati" style="flex: 1; overflow-y: auto; padding-right: 5px;"></div>
                </div>
            </div>
        </div>

        <div id="rot-modal-gestione-richieste" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-gestione-richieste')">
            <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalRotazioni('rot-modal-gestione-richieste')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:var(--info); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0;"><i class="fa-solid fa-bell"></i> Richieste in Attesa</h3>
                
                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
                    <button class="rot-btn-outline" style="margin-bottom: 20px;" onclick="window.chiudiModalRotazioni('rot-modal-gestione-richieste'); window.apriGestioneAccessiModalRot();"><i class="fa-solid fa-arrow-left"></i> Torna alla Gestione</button>
                    <div id="rot-lista-richieste" style="flex: 1; overflow-y: auto; padding-right: 5px;"></div>
                </div>
            </div>
        </div>

        <div id="rot-modal-dettaglio-utente" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-dettaglio-utente')">
            <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalRotazioni('rot-modal-dettaglio-utente')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:var(--primary); text-align: center; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0;"><i class="fa-solid fa-id-card"></i> Scheda Utente</h3>
                
                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
                    <div id="rot-dettaglio-utente-body" style="font-size: 14px; line-height: 1.8; background: var(--surface-hover); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 20px; color: var(--text-main);"></div>
                    
                    <button id="rot-btn-scarica-pdf" class="rot-btn" style="background: var(--info); margin: 0;" onclick="window.scaricaPDFConsensoRot()"><i class="fa-solid fa-file-pdf"></i> Scarica Modulo Consenso</button>
                </div>
            </div>
        </div>

        <div id="rot-modal-gestione-collaboratori" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-gestione-collaboratori')">
            <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalRotazioni('rot-modal-gestione-collaboratori')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:#9c27b0; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0;"><i class="fa-solid fa-user-shield"></i> Collaboratori</h3>
                
                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
                    <button class="rot-btn-outline" style="margin-bottom: 20px;" onclick="window.chiudiModalRotazioni('rot-modal-gestione-collaboratori'); window.apriGestioneAccessiModalRot();"><i class="fa-solid fa-arrow-left"></i> Torna alla Gestione</button>
                    <div id="rot-lista-collaboratori" style="flex: 1; overflow-y: auto; padding-right: 5px;"></div>
                </div>
            </div>
        </div>
        
        <div id="rot-modal-permessi-collaboratore" class="modal-overlay" onclick="window.chiudiSeSfondoRotazioni(event, 'rot-modal-permessi-collaboratore')">
            <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalRotazioni('rot-modal-permessi-collaboratore')"></i>
                <h3 style="margin-top:0; margin-bottom: 20px; color:#9c27b0; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0;"><i class="fa-solid fa-key"></i> Permessi: <span id="rot-nome-collab-titolo" style="color:var(--text-main);"></span></h3>
                
                <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; padding-bottom: 20px;">
                    <input type="hidden" id="rot-uid-collab-edit">
                    <div id="rot-lista-checkbox-rotazioni" style="flex: 1; overflow-y: auto; text-align: left; margin-bottom: 20px; background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);"></div>
                    <button class="rot-btn" style="background: var(--success); margin: 0; flex-shrink: 0;" onclick="window.salvaPermessiCollabRot()"><i class="fa-solid fa-floppy-disk"></i> Salva Permessi</button>
                </div>
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

// ---------- MOTORE: logica, Firestore, tabelle, ricerche ----------

export function avviaMotoreRotazioni(db, auth) {
    const ADMIN_UID = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2";
    const CARTELLA_BASE = "rotazioni";
    
    const ROTAZIONI_MAP = {
        "disp_5_1": "Disponibile 5-1",
        "disp_6_2_6_1": "Disponibile 6-2-6-1",
        "rot_fnove": "Rotazione F.Nove", "spez_fnove": "Spezzati F.Nove", "tc_spez_fnove": "T.C. Spezzati F.Nove",
        "rot_proma": "Rotazione P.Roma", "spez_proma": "Spezzati P.Roma", "ris_proma": "Riserva P.Roma",
        "rot_szaccaria": "Rotazione S.Zaccaria", "spez_szaccaria": "Spezzati S.Zaccaria", "tc_spez_szaccaria": "T.C. Spezzati S.Zaccaria",
        "rot_lido": "Rotazione Lido", "spez_lido": "Spezzati Lido", "tc_spez_lido": "T.C. Spezzati Lido",
        "rot_linea12": "Rotazione Linea 12", "rot_linea13": "Rotazione Linea 13", "rot_linea14": "Rotazione Linea 14 M/N",
        "rot_linea14_mb": "Rotazione Linea 14 M/B", "rot_17sn": "Rotazione Linea 17 S. Nicolò", "tc_rot_17sn": "T.C. Rotazione 17 S. Nicolò",
        "rot_17tr": "Rotazione Linea 17 Tron.", "tc_rot_17tr": "T.C. Rotazione Linea 17 Tronc.",
        "tfg_proma": "TFG P.Roma", "tfg_lido": "TFG Lido",
        "m115": "M115", "m116": "M116",
        "notti": "Notti"
    };

    const paroleDaSaltare = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE", "MESE", "AGENTI"];

    // Titolo atteso del gruppo dentro il json mensile (rotazioni/rotazioni_<mese>_<anno>.json) per ciascuna chiave di rotazione.
    // ATTENZIONE: se in futuro il json usa un nome diverso per un gruppo, aggiornare qui, altrimenti verrà creato un gruppo duplicato "auto-generato".
    const ROTAZIONI_TITOLI_JSON = {
        "rot_fnove": "Fondamente nove", "spez_fnove": "Spezzati F.Nove", "tc_spez_fnove": "T.C. Spezzati F.Nove",
        "rot_proma": "P.Roma", "spez_proma": "Spezzati P.Roma", "ris_proma": "Riserva P.Roma",
        "rot_szaccaria": "S.Zaccaria", "spez_szaccaria": "Spezzati S.Zaccaria", "tc_spez_szaccaria": "T.C. Spezzati S.Zaccaria",
        "rot_lido": "Lido", "spez_lido": "Spezzati Lido", "tc_spez_lido": "T.C. Spezzati Lido",
        "rot_linea12": "Linea 12", "rot_linea13": "Linea 13", "rot_linea14": "Linea 14 M/N",
        "rot_linea14_mb": "Linea 14 M/B", "rot_17sn": "Linea 17 S. Nicolò", "tc_rot_17sn": "T.C. Linea 17 S. Nicolò",
        "rot_17tr": "Linea 17 Tronchetto", "tc_rot_17tr": "T.C. Linea 17 Tronchetto",
        "tfg_proma": "TFG P.Roma", "tfg_lido": "TFG Lido",
        "m115": "M115", "m116": "M116",
        "notti": "Notti"
    };

    // Stessa data soglia usata dal modulo varianti per il calcolo dei turni storici/attuali
    const DATA_INIZIO_NUOVI_TURNI_ROT = "2026-06-01";

    // Globals per UI
    window.globalNomiRotazioni = [];
    window.utentiMap = {}; 
    window.currentUtentePdf = null; 
    window.rotazioniAutoGenerateRot = new Set(); // titoli dei gruppi ricostruiti dal calendario (assenti dal json mensile)

    // Stato Interno
    let databaseTurni = []; 
    let activePredictors = []; 
    let globalShiftData = {};
    let globalImgDir = "";
    let globalRotPatternCache = {}; // cache dei file rotazioni_YYYY-MM-DD.json (pattern posizionali, come in varianti.js)
    let globalRotPatternCacheLoaded = false;
    let pzInstance = null;
    let currentImagePath = "";

    let currentUserDoc = null; 
    let isCollab = false; 
    let isAdmin = false; 
    let currentUserId = null;

    // Popola le select rotazioni (Request e Edit)
    const selRot = document.getElementById('rot-req-rotazione');
    const selRotEdit = document.getElementById('rot-edit-rotazione');
    if (selRot && selRot.options.length <= 1) {
        for(let key in ROTAZIONI_MAP) {
            let opt = document.createElement('option'); opt.value = key; opt.innerText = ROTAZIONI_MAP[key]; selRot.appendChild(opt);
            if(selRotEdit) {
                let opt2 = document.createElement('option'); opt2.value = key; opt2.innerText = ROTAZIONI_MAP[key]; selRotEdit.appendChild(opt2);
            }
        }
    }

    // ==========================================
    // FUNZIONI DI GESTIONE MODALI SPECIFICHE
    // ==========================================
    window.chiudiModalRotazioni = (modalId) => {
        document.getElementById(modalId).style.display = 'none';
        if(modalId === 'rot-search-modal') {
            document.getElementById('rot-risultato-turno').innerHTML = '';
            document.getElementById('rot-risultato-turno').style.display = 'none';
            document.getElementById('rot-risultato-cambi').innerHTML = '';
            document.getElementById('rot-risultato-cambi').style.display = 'none';
            document.getElementById('rot-input-codice-turno').value = '';
            document.getElementById('rot-input-giorno-turno').value = '';
            document.getElementById('rot-input-giorno-cambio').value = '';
        } else if (modalId === 'rot-future-search-modal') {
            document.getElementById('rot-risultato-futuro').innerHTML = '';
            document.getElementById('rot-risultato-futuro').style.display = 'none';
            document.getElementById('rot-input-date-futura').value = '';
        }
    };
    
    window.chiudiSeSfondoRotazioni = (event, modalId) => {
        if (event.target.id === modalId) window.chiudiModalRotazioni(modalId);
    };

    window.chiudiSeSfondoModalImgRot = (event) => {
        if (event.target.id === 'rot-imageModal' || event.target.id === 'rot-imageFlexContainer') window.chiudiImageModalRot();
    };

    // ==========================================
    // ANIMAZIONE DI CARICAMENTO (contenuta nello spazio del modulo dove
    // compaiono poi le rotazioni, NON a schermo intero)
    // ==========================================
    function mostraCaricamentoRotazioni(testo = "Preparazione rotazioni in corso...") {
        const area = document.getElementById('rot-rotazioni-list');
        if (area) {
            area.innerHTML = `<div style="text-align:center; padding:60px 20px; color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:34px; color:var(--primary);"></i><br><br>${testo}</div>`;
        }
    }

    function nascondiCaricamentoRotazioni() {
        // Non serve fare nulla: il contenuto vero (renderizzato da caricaRotazioniMain,
        // oppure le sezioni auth/pending) sostituisce già il messaggio di caricamento.
    }

    // ==========================================
    // INIT STATO E ROTAZIONI (SPA UPGRADE)
    // ==========================================
    window.initRotazioniState = async () => {
        datiTurniPromiseRot = null;
        globalRotPatternCacheLoaded = false;
        const user = auth.currentUser;
        const authSect = document.getElementById('rot-auth-section'); 
        const warnLog = document.getElementById('rot-login-warning');
        const reqSect = document.getElementById('rot-request-section'); 
        const pendSect = document.getElementById('rot-pending-section');
        const contSect = document.getElementById('rot-content-section');
        
        // Pulizia iniziale: nascondiamo i sottomenù
        if(warnLog) warnLog.style.display = 'none';
        if(reqSect) reqSect.style.display = 'none';
        if(pendSect) pendSect.style.display = 'none';
        if(contSect) contSect.style.display = 'none';

        try {
            if (user) {
                currentUserId = user.uid; 
                isAdmin = (user.uid === ADMIN_UID);
                
                // Lettura parallela da utenti e permessi_rotazioni
                const docRef = doc(db, "utenti", user.uid); 
                const permRef = doc(db, "permessi_rotazioni", user.uid);
                
                const [docSnap, permSnap] = await Promise.all([getDoc(docRef), getDoc(permRef)]);
                
                const uData = docSnap.exists() ? docSnap.data() : {};
                const pData = permSnap.exists() ? permSnap.data() : {};
                
                // Merge in memoria per compatibilità con il resto dell'interfaccia
                currentUserDoc = { ...uData, ...pData }; 
                isCollab = (uData.ruolo === 'collaborator');
                
                // BYPASS ADMIN O UTENTE APPROVATO
                if (isAdmin || pData.abilitato_rotazioni === true || pData.stato_richiesta === 'approved') {
                    if (isAdmin) currentUserDoc.abilitato_rotazioni = true; 
                    
                    // Se ha accesso, nascondiamo tutto il blocco auth e mostriamo i contenuti
                    if(authSect) authSect.style.display = 'none'; 
                    if(contSect) contSect.style.display = 'flex';
                    mostraCaricamentoRotazioni();
                    
                    let btnMieiDati = document.getElementById('rot-btn-miei-dati');
                    if (btnMieiDati) btnMieiDati.style.display = 'flex';
                    
                    let btnGestAccessi = document.getElementById('rot-btn-gestione-accessi');
                    if (isAdmin || isCollab) {
                        if (btnGestAccessi) btnGestAccessi.style.display = 'flex';
                        window.aggiornaBadgeRichiesteRotazioni();
                    }
                    
                    window.initPanzoomRotazioni(); 
                    await Promise.all([
                        window.caricaDatiTurniSilenziosoRot(),
                        window.caricaRotazioniMain()
                    ]);
                    
                } else if (pData.stato_richiesta === 'pending') {
                    // In attesa di approvazione: mostra contenitore auth e messaggio
                    if(authSect) authSect.style.display = 'block';
                    if(pendSect) pendSect.style.display = 'block';
                } else {
                    // Nessun accesso: mostra contenitore auth e modulo di richiesta
                    if(authSect) authSect.style.display = 'block';
                    if(reqSect) reqSect.style.display = 'block';
                    
                    if(document.getElementById('rot-req-nome')) document.getElementById('rot-req-nome').value = uData.nome || '';
                    if(document.getElementById('rot-req-cognome')) document.getElementById('rot-req-cognome').value = uData.cognome || '';
                    if(document.getElementById('rot-req-matricola')) document.getElementById('rot-req-matricola').value = uData.matricola || '';
                    if(document.getElementById('rot-req-omonimia')) document.getElementById('rot-req-omonimia').value = uData.progressivo || '';
                }
            } else { 
                // Non loggato: mostra avviso
                if(authSect) authSect.style.display = 'block';
                if(warnLog) warnLog.style.display = 'block'; 
            }
        } catch(e) {
            console.error("Errore durante l'inizializzazione delle rotazioni:", e);
        } finally {
            nascondiCaricamentoRotazioni();
        }
    };

    window.mostraFormRichiestaRot = () => {
        document.getElementById('rot-intro-request').style.display = 'none';
        document.getElementById('rot-form-request').style.display = 'block';
    };

    // Event listeners per le select rotazioni
    document.getElementById('rot-req-rotazione').addEventListener('change', function() {
        let isDisp = this.value.startsWith('disp_');
        document.getElementById('rot-div-data-riposo-req').style.display = isDisp ? 'block' : 'none';
        document.getElementById('rot-div-mansione-req').style.display = isDisp ? 'block' : 'none';
    });
    document.getElementById('rot-edit-rotazione').addEventListener('change', function() {
        let isDisp = this.value.startsWith('disp_');
        document.getElementById('rot-div-data-riposo-edit').style.display = isDisp ? 'block' : 'none';
        document.getElementById('rot-div-mansione-edit').style.display = isDisp ? 'block' : 'none';
    });

    // ==========================================
    // LOGICA DI CARICAMENTO DATI
    // ==========================================
    
    let datiTurniPromiseRot = null;
    window.caricaDatiTurniSilenziosoRot = () => {
        if (!datiTurniPromiseRot) datiTurniPromiseRot = caricaDatiTurniSilenziosoImplRot();
        return datiTurniPromiseRot;
    };
    async function caricaDatiTurniSilenziosoImplRot() {
        try {
            const resMappa = await fetch('mappa_file.json?t=' + new Date().getTime());
            if (!resMappa.ok) return;
            
            const mappa = await resMappa.json();
            const rootFiles = mappa.albero || mappa.root || [];
            
            let imgDirs = rootFiles.filter(f => f.match(/^turni_\d{4}-\d{2}-\d{2}\/?$/));
            if (imgDirs.length > 0) {
                imgDirs.sort((a, b) => b.localeCompare(a));
                globalImgDir = imgDirs[0].replace("/", "");
            }
            
            let jsonFiles = rootFiles.filter(f => f.match(/^info_turni_\d{4}-\d{2}-\d{2}\.json$/));
            for (let jf of jsonFiles) {
                fetch(jf + `?t=${new Date().getTime()}`)
                    .then(r => r.json())
                    .then(jData => { globalShiftData = { ...globalShiftData, ...jData }; })
                    .catch(e => console.error("Errore info turni"));
            }

            // File pattern posizionali delle rotazioni (rotazioni_YYYY-MM-DD.json in root), usati per ricalcolare i turni dal calendario personale
            let rotPatternFiles = rootFiles.filter(f => f.match(/^rotazioni_\d{4}-\d{2}-\d{2}\.json$/));
            const rotPatternPromises = rotPatternFiles.map(f => {
                const dateMatch = f.match(/\d{4}-\d{2}-\d{2}/);
                if (!dateMatch) return Promise.resolve();
                return fetch(f + `?t=${new Date().getTime()}`)
                    .then(r => r.json())
                    .then(d => { globalRotPatternCache[dateMatch[0]] = d; })
                    .catch(() => {});
            });
            await Promise.all(rotPatternPromises);
            globalRotPatternCacheLoaded = true;
        } catch (e) { console.error("Errore mappa"); }
    }

    // ==========================================
    // MOTORE DI CALCOLO TURNI DAL CALENDARIO PERSONALE (porting da varianti.js)
    // Usato per ricostruire una rotazione mancante nel json mensile, leggendo il
    // calendario di chi ha aderito al modulo rotazioni con quella rotazione.
    // ==========================================
    function stringToNumUTC(s) {
        if (!s) return 0;
        let p = s.split('-');
        return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000);
    }

    function creaDataSicuraRot(dataStr) {
        if (!dataStr) return new Date();
        let p = dataStr.split('-');
        return new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
    }

    function isGiornoRiposoBaseRot(curr, cfg) {
        if (!cfg.riposoStart) return false;
        let ref = stringToNumUTC(cfg.riposoStart);
        if (cfg.depositoAttivo === 'disp_det') return (((curr - ref) % 6 + 6) % 6 === 0);
        let pos = ((curr - ref + 6) % 15 + 15) % 15;
        return (pos === 6 || pos === 13 || pos === 14);
    }

    // Converte il codice turno in base alla mansione (marinaio/timoniere vs pilota), identico a varianti.js
    function convertiTurnoPerMansioneRot(turno, mansione) {
        if (!turno || !mansione) return turno;
        let t = String(turno).toUpperCase();
        let m = String(mansione).toLowerCase();
        let isMarinaio = m.includes('marinaio') || m.includes('timoniere');

        if (isMarinaio) {
            let matchP = t.match(/^([1-9])[CP](\d{2})$/);
            if (matchP) return `${matchP[1]}B${matchP[2]}`;
        } else {
            let matchB = t.match(/^([1-9])B(\d{2})$/);
            if (matchB) {
                let l = matchB[1]; let f = matchB[2];
                let letPilota = (l === '1' || l === '2') ? 'C' : 'P';
                return `${l}${letPilota}${f}`;
            }
        }
        return t;
    }

    // Ricostruisce il turno "teorico" (calcolato) per una data, identico alla logica di varianti.js,
    // ma basato sulla cache locale globalRotPatternCache. Non tiene conto di variazioni/cambi manuali.
    function calcolaTurnoBaseRot(dStr, cfgData, info) {
        if (!cfgData || !cfgData.depositoAttivo || !cfgData.riposoStart) return null;
        let curr = stringToNumUTC(dStr);
        let isPastUpdate = (cfgData.history && curr < stringToNumUTC(DATA_INIZIO_NUOVI_TURNI_ROT));
        let cfgBase = isPastUpdate ? cfgData.history : cfgData;

        if (isGiornoRiposoBaseRot(curr, cfgBase)) {
            let titoloRiposo = 'RI';
            if (cfgBase.riposoStart && cfgBase.depositoAttivo !== 'disp_det') {
                let ref = stringToNumUTC(cfgBase.riposoStart);
                let pos = ((curr - ref + 6) % 15 + 15) % 15;
                if (pos === 13) titoloRiposo = 'AL';
            }
            return titoloRiposo;
        }

        if (cfgBase.depositoAttivo.startsWith('disp_')) return "Disp";

        if (cfgBase.rotazioneStart) {
            let activeCfg = (cfgData.futureConfig && curr >= stringToNumUTC(cfgData.futureConfig.dataInizio))
                ? { start: cfgData.futureConfig.dataInizio, idx: cfgData.futureConfig.turnoIndex, tcPattern: cfgData.futureConfig.tcPattern }
                : { start: cfgBase.rotazioneStart, idx: cfgBase.turnoIndex, tcPattern: cfgBase.tcPattern };

            let refRot = stringToNumUTC(activeCfg.start), w = 0;
            if (curr >= refRot) { for (let j = refRot; j < curr; j++) { if (!isGiornoRiposoBaseRot(j, cfgBase)) w++; } }
            else { for (let j = refRot; j > curr; j--) { if (!isGiornoRiposoBaseRot(j, cfgBase)) w--; } }

            let refRip = stringToNumUTC(cfgBase.riposoStart);
            let startPos = ((refRot - refRip + 6) % 15 + 15) % 15;
            let offset = [1, 3, 5, 8, 10, 12].includes(startPos) ? 1 : 0;

            let rotList = [];
            if (globalRotPatternCache) {
                const dateChiavi = Object.keys(globalRotPatternCache).sort();
                let rotCorrente = dateChiavi.length > 0 ? globalRotPatternCache[dateChiavi[0]] : null;
                for (let i = dateChiavi.length - 1; i >= 0; i--) {
                    if (curr >= stringToNumUTC(dateChiavi[i])) { rotCorrente = globalRotPatternCache[dateChiavi[i]]; break; }
                }
                if (rotCorrente && rotCorrente[cfgBase.depositoAttivo]) {
                    rotList = rotCorrente[cfgBase.depositoAttivo];
                }
            }

            if (rotList.length > 0) {
                if (cfgBase.depositoAttivo.startsWith('tc_')) {
                    let currPos = ((curr - refRip + 6) % 15 + 15) % 15;
                    let isBlock2 = (currPos >= 7 && currPos <= 12);
                    let k = isBlock2 ? (currPos - 7) : currPos;
                    let patternDopoSingolo = activeCfg.tcPattern || cfgBase.tcPattern || 'doppio';
                    let isAlternato = (patternDopoSingolo === 'disp') ? isBlock2 : !isBlock2;
                    let idx = Math.floor(k / 2);
                    if (idx >= rotList.length) idx = rotList.length - 1;
                    let t = rotList[idx].toUpperCase();
                    if (info) { info.tc = true; info.currPos = currPos; }
                    if (isAlternato) {
                        let dispOnEven = (cfgBase.depositoAttivo === 'tc_spez_lido');
                        if (dispOnEven && k % 2 === 0) t = "Disp";
                        if (!dispOnEven && k % 2 !== 0) t = "Disp";
                    }
                    return t;
                } else {
                    let expandedRotList = [];
                    let originalToExpanded = [];
                    for (let j = 0; j < rotList.length; j++) {
                        originalToExpanded[j] = expandedRotList.length;
                        let currentTurn = rotList[j].toUpperCase();
                        if (currentTurn.includes('+')) {
                            let parts = currentTurn.split('+');
                            expandedRotList.push(parts[0].trim());
                            if (parts.length > 1) { expandedRotList.push(parts[1].trim()); }
                        } else {
                            expandedRotList.push(currentTurn);
                            expandedRotList.push(currentTurn);
                        }
                    }
                    let L_exp = expandedRotList.length;
                    let baseExpIdx = originalToExpanded[activeCfg.idx];
                    let blockStartIdx = baseExpIdx - (baseExpIdx % 2);
                    let idxExp = (blockStartIdx + w + offset) % L_exp;
                    if (idxExp < 0) idxExp += L_exp;
                    if (info) { info.tc = false; info.idxExp = idxExp; info.L = L_exp; info.currPos = ((curr - refRip + 6) % 15 + 15) % 15; }
                    return expandedRotList[idxExp];
                }
            }
        }
        return null;
    }

    // Chiave di ordinamento "a cascata" di un utente all'interno della sua rotazione.
    // Nel documento ufficiale chi sta sotto fa lo stesso turno di chi sta sopra con 2 giorni di ritardo
    // (x il giorno 1-2 -> x il giorno 3-4 per la riga successiva). La posizione viene ricavata dalla lista
    // posizionale (rotazioni_YYYY-MM-DD.json): si prende l'indice nella lista al primo giorno lavorativo del mese
    // e lo si riporta al giorno 1 come se non ci fossero riposi (ritardo in giorni di calendario), cosi' due
    // utenti con riposi sfasati non finiscono a pari merito. Chiave piu' bassa = riga piu' in alto.
    // Ritorna null se la posizione non e' calcolabile (l'utente finisce in fondo, in ordine alfabetico).
    function calcolaChiaveCascataRot(y, m, giorniMese, cfgData, turniBase) {
        let df = null;
        for (let i = 1; i <= giorniMese; i++) {
            const t = String(turniBase[i.toString()] || '').toUpperCase();
            if (t && t !== 'N/D' && t !== 'RI' && t !== 'AL') { df = i; break; }
        }
        if (df === null) return null;
        const dfStr = `${y}-${String(m).padStart(2, '0')}-${String(df).padStart(2, '0')}`;
        const info = {};
        if (calcolaTurnoBaseRot(dfStr, cfgData, info) === null) return null;
        if (info.tc === true) {
            // T.C.: il turno dipende solo dalla fase nel ciclo di riposo (15 giorni di calendario)
            const pos1 = (((info.currPos - (df - 1)) % 15) + 15) % 15;
            return (15 - pos1) % 15;
        }
        if (info.tc === false) {
            const L = info.L;
            const idxV = info.idxExp - (df - 1);
            const k1 = (((-idxV) % L) + L) % L;
            // Criterio secondario: se un riposo cade subito dopo il giorno 1, due righe possono avere lo stesso
            // indice in lista ma fase diversa nel ciclo di riposo (15 giorni): si ordina anche per quella.
            const pos1 = (((info.currPos - (df - 1)) % 15) + 15) % 15;
            const k2 = (15 - pos1) % 15;
            return k1 * 15 + k2;
        }
        return null;
    }

    function normalizzaTitoloRot(s) {
        return (s || '').toString().trim().toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[.\s]+/g, ' ').trim();
    }

    // Costruisce, per le rotazioni non-disp assenti dal json mensile, i turni di tutti gli
    // utenti abilitati al modulo rotazioni con quella rotazione, leggendo il loro calendario
    // (solo turni calcolati, ignorando i cambi/variazioni manuali).
    async function costruisciRotazioniMancantiRot(jsonData, allU, y, m) {
        if (!y || !m) return [];
        const titoliEsistenti = Object.keys(jsonData).map(normalizzaTitoloRot);
        const giorniMese = new Date(y, m, 0).getDate();
        const gruppiCreati = [];

        for (let key in ROTAZIONI_MAP) {
            if (key.startsWith('disp_')) continue; // gestite a parte
            const titolo = ROTAZIONI_TITOLI_JSON[key] || ROTAZIONI_MAP[key];
            if (titoliEsistenti.includes(normalizzaTitoloRot(titolo))) continue; // già presente nel json

            const utentiRotazione = allU.filter(u => u.rotazione_richiesta === key && u.uid);
            if (utentiRotazione.length === 0) continue; // nessun utente con questa rotazione, niente da creare

            const risultati = await Promise.all(utentiRotazione.map(async u => {
                try {
                    const [calSnap, uSnap] = await Promise.all([
                        getDoc(doc(db, "calendario", u.uid)),
                        getDoc(doc(db, "utenti", u.uid))
                    ]);
                    if (!calSnap.exists()) return null;
                    const cfgData = calSnap.data();
                    const mansione = uSnap.exists() ? (uSnap.data().mansione || '') : '';
                    const isMarinaio = /marinaio|timoniere/i.test(mansione);

                    const turniBase = {};   // codice grezzo, non convertito per mansione -> usato per l'accoppiamento armo
                    const turniDisplay = {}; // codice convertito secondo la propria mansione -> usato per la visualizzazione
                    let haAlmenoUnGiornoValido = false;
                    for (let i = 1; i <= giorniMese; i++) {
                        const dStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                        let base = calcolaTurnoBaseRot(dStr, cfgData);
                        if (base === null) { turniBase[i.toString()] = "N/D"; turniDisplay[i.toString()] = "N/D"; continue; }
                        turniBase[i.toString()] = base;
                        turniDisplay[i.toString()] = convertiTurnoPerMansioneRot(base, mansione);
                        haAlmenoUnGiornoValido = true;
                    }
                    // Calendario presente ma non configurato (o config incompatibile): niente da mostrare, nascondiamo l'utente
                    if (!haAlmenoUnGiornoValido) return null;

                    const nomeLabel = `${u.cognome || ''} ${u.nome || ''} ${u.progressivo || ''}`.replace(/\s+/g, ' ').trim();
                    const chiave = calcolaChiaveCascataRot(y, m, giorniMese, cfgData, turniBase);
                    return { nome: nomeLabel || 'Sconosciuto', turniBase, turniDisplay, isMarinaio, mansioneNota: mansione.trim() !== '', chiave };
                } catch (e) { console.error("Errore calcolo turni per rotazione mancante", e); return null; }
            }));

            const validi = risultati.filter(r => r !== null);
            if (validi.length === 0) continue;

            // Accoppiamento in un unico "armo": utenti con la stessa sequenza di turni del mese
            // (stesso mezzo/incarico condiviso) vengono uniti in un'unica riga "Cognome Nome - Cognome Nome".
            // Il confronto usa il codice BASE (non convertito per mansione): un pilota e un marinaio sullo
            // stesso mezzo hanno lo stesso codice base ma vengono mostrati con lettere diverse (P/C vs B),
            // quindi confrontare i codici già convertiti impedirebbe l'accoppiamento.
            // Ignora inoltre i giorni "N/D" di uno dei due membri (calendario non ancora configurato per
            // quel giorno/periodo), così una lacuna isolata non impedisce l'accoppiamento; il turno di
            // quel giorno viene poi completato con il valore del collega abbinato.
            function turniCompatibili(t1, t2) {
                let sovrapposizioneTrovata = false;
                for (let day in t1) {
                    const v1 = t1[day], v2 = t2[day];
                    if (v1 === "N/D" || v2 === "N/D") continue;
                    sovrapposizioneTrovata = true;
                    if (v1 !== v2) return false;
                }
                return sovrapposizioneTrovata;
            }

            const parent = validi.map((_, i) => i);
            function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
            function union(a, b) { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }

            for (let i = 0; i < validi.length; i++) {
                for (let j = i + 1; j < validi.length; j++) {
                    if (turniCompatibili(validi[i].turniBase, validi[j].turniBase)) union(i, j);
                }
            }

            const gruppiPerFirma = {};
            validi.forEach((v, i) => {
                const radice = find(i);
                if (!gruppiPerFirma[radice]) gruppiPerFirma[radice] = { nomi: [], membri: [] };
                gruppiPerFirma[radice].nomi.push(v.nome);
                gruppiPerFirma[radice].membri.push(v);
            });

            let righe = Object.values(gruppiPerFirma).map(g => {
                // Ordine dei nomi nell'armo: prima il preposto (mansione nota e non marinaio/timoniere), sotto il marinaio.
                // Se la mansione non e' stata identificata l'utente sta in mezzo; a pari ruolo vale l'ordine alfabetico.
                const rangoMansione = mm => !mm.mansioneNota ? 1 : (mm.isMarinaio ? 2 : 0);
                const nomi = g.membri.slice()
                    .sort((a, b) => (rangoMansione(a) - rangoMansione(b)) || a.nome.localeCompare(b.nome))
                    .map(mm => mm.nome);
                // Turni uniti: per ogni giorno preferisce il codice mostrato da un membro non-marinaio
                // (convenzione del documento ufficiale, es. "4P04"), altrimenti usa il primo valore valido disponibile.
                const turniUniti = {};
                const membriPilota = g.membri.filter(mm => !mm.isMarinaio);
                const ordinePreferenza = [...membriPilota, ...g.membri];
                for (let day in g.membri[0].turniDisplay) {
                    let valore = "N/D";
                    for (const mm of ordinePreferenza) {
                        if (mm.turniDisplay[day] !== "N/D") { valore = mm.turniDisplay[day]; break; }
                    }
                    turniUniti[day] = valore;
                }
                // Posizione del gruppo nella cascata: chiave del primo membro che ne ha una
                const chiaviMembri = g.membri.map(mm => mm.chiave).filter(k => k !== null && k !== undefined);
                const chiave = chiaviMembri.length > 0 ? Math.min(...chiaviMembri) : null;
                return { nome: nomi.join(" - "), turni: turniUniti, chiave };
            });
            // Ordine a cascata (vedi calcolaChiaveCascataRot); a parita' o senza posizione, ordine alfabetico
            righe.sort((a, b) => {
                const ka = a.chiave, kb = b.chiave;
                if (ka !== null && kb !== null && ka !== kb) return ka - kb;
                if (ka !== null && kb === null) return -1;
                if (ka === null && kb !== null) return 1;
                return a.nome.localeCompare(b.nome);
            });

            let finalObj = {};
            righe.forEach(r => finalObj[r.nome] = r.turni);
            jsonData[titolo] = finalObj;
            gruppiCreati.push(titolo);
        }
        return gruppiCreati;
    }

    function stringToNum(s) { 
        if(!s) return 0; 
        let p = s.split('-'); 
        return Math.floor(new Date(p[0], p[1]-1, p[2], 12, 0, 0).getTime() / 86400000); 
    }

    function pulisciNomeRotazione(nome) {
        let pulito = nome.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        return pulito.charAt(0).toUpperCase() + pulito.slice(1);
    }

    // Aggiornata per leggere da permessi_rotazioni e unire i dati utente
    window.getUtentiAbilitatiFirebaseRot = async () => {
        const q = query(collection(db, "permessi_rotazioni"), where("abilitato_rotazioni", "==", true));
        const permSnap = await getDocs(q);
        
        const utentiSnap = await getDocs(collection(db, "utenti"));
        let utentiBase = {};
        utentiSnap.forEach(d => utentiBase[d.id] = d.data());

        let arr = [];
        permSnap.forEach(d => {
            let pData = d.data();
            let uData = utentiBase[d.id] || {};
            arr.push({ ...uData, ...pData, uid: d.id });
        });
        return arr;
    };

    window.caricaRotazioniMain = async () => {
        window.rotazioniAutoGenerateRot = new Set();
        const area = document.getElementById('rot-rotazioni-list');
        mostraCaricamentoRotazioni("Scansione documenti in corso...");

        try {
            const timestamp = new Date().getTime();
            const resMappa = await fetch('mappa_file.json?t=' + timestamp);
            if (!resMappa.ok) throw new Error("Mappa non trovata");
            
            const datiMappa = await resMappa.json();
            const files = datiMappa.rotazioni || []; 
            let groups = {};

            files.forEach(nomeFile => {
                let ext = nomeFile.substring(nomeFile.lastIndexOf('.')).toLowerCase();
                let baseName = nomeFile.substring(0, nomeFile.lastIndexOf('.'));
                
                if(['.pdf', '.xlsx', '.xls', '.json'].includes(ext)) {
                    if(!groups[baseName]) groups[baseName] = { pdf: null, excel: null, json: null, base: baseName };
                    if(ext === '.pdf') groups[baseName].pdf = nomeFile;
                    if(ext === '.xlsx' || ext === '.xls') groups[baseName].excel = nomeFile;
                    if(ext === '.json') groups[baseName].json = nomeFile;
                }
            });

            // NON svuotiamo l'area qui: lo spinner deve restare visibile finche' non e' pronta la prima card
            // (le card vengono aggiunte solo dopo le letture da Firestore, che richiedono qualche secondo).
            mostraCaricamentoRotazioni("Caricamento rotazioni in corso...");
            let spinnerAttivo = true;
            const rimuoviSpinner = () => { if (spinnerAttivo) { area.innerHTML = ""; spinnerAttivo = false; } };

            // Lettura utenti abilitati: avviata subito in parallelo e condivisa tra tutti i mesi
            let allUPromise = null;
            const getAllU = () => allUPromise || (allUPromise = window.getUtentiAbilitatiFirebaseRot());
            if (Object.keys(groups).length > 0) getAllU().catch(() => {});

            if (Object.keys(groups).length === 0) {
                area.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-regular fa-folder-open" style="font-size:32px;"></i><br><br>Nessun documento trovato.</div>`;
                return;
            }

            let indexRot = 0;
            for (let base in groups) {
                let g = groups[base];
                let monthCard = document.createElement('div');
                monthCard.className = "rot-month-card";
                monthCard.style.animationDelay = `${indexRot * 0.1}s`;
                monthCard.innerHTML = `<h3><i class="fa-regular fa-calendar" style="color: var(--text-muted); font-size: 16px;"></i> ${pulisciNomeRotazione(g.base)}</h3>`;

                let btnGrid = document.createElement('div');
                btnGrid.className = "rot-btn-grid";

                if (g.json) {
                    try {
                        let dataRes = await fetch(`${CARTELLA_BASE}/${g.json}?t=${timestamp}`);
                        let jsonData = await dataRes.json();

                        let allU = await getAllU();
                        let dispGroups = { "disp_5_1": {}, "disp_6_2_6_1": {} };
                        let parts = g.base.split('_');
                        
                        if (parts.length >= 3) {
                            const mesiMap = { "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12 };
                            let m = mesiMap[parts[1].toLowerCase()];
                            let y = parseInt(parts[2]);

                            if (m && y) {
                                let cNum_1st = stringToNum(`${y}-${m}-1`);

                                allU.forEach(u => {
                                    if (u.data_riposo_singolo && (u.rotazione_richiesta === "disp_5_1" || u.rotazione_richiesta === "disp_6_2_6_1")) {
                                        let nomeCompl = (u.cognome + " " + u.nome + " " + (u.progressivo || "")).trim().toUpperCase();
                                        let turni = {};
                                        let dRiposoNum = stringToNum(u.data_riposo_singolo);
                                        let manKey = u.mansione || "Mansione non specificata"; 
                                        
                                        for(let i=1; i<=31; i++) {
                                            let dCheck = new Date(y, m-1, i);
                                            if (dCheck.getMonth() !== m-1) break; 
                                            let cNum = stringToNum(`${y}-${m}-${i}`);
                                            
                                            if (u.rotazione_richiesta === "disp_5_1") {
                                                let diff = (cNum - dRiposoNum) % 6;
                                                if (diff < 0) diff += 6;
                                                turni[i.toString()] = (diff === 0) ? "RI" : "DISP";
                                            } else if (u.rotazione_richiesta === "disp_6_2_6_1") {
                                                let diff = (cNum - dRiposoNum) % 15;
                                                if (diff < 0) diff += 15;
                                                if (diff === 0 || diff === 7 || diff === 8) { turni[i.toString()] = "RI"; } 
                                                else { turni[i.toString()] = "DISP"; }
                                            }
                                        }

                                        let rotKey = u.rotazione_richiesta;
                                        let sortKey = 0;

                                        if (rotKey === "disp_5_1") {
                                            let offset = (cNum_1st - dRiposoNum) % 6;
                                            if (offset < 0) offset += 6;
                                            sortKey = (6 - offset) % 6; 
                                        } else if (rotKey === "disp_6_2_6_1") {
                                            let offset = (cNum_1st - dRiposoNum) % 15;
                                            if (offset < 0) offset += 15;
                                            sortKey = (15 + 7 - offset) % 15; 
                                        }

                                        if (!dispGroups[rotKey][manKey]) dispGroups[rotKey][manKey] = [];
                                        dispGroups[rotKey][manKey].push({ nome: nomeCompl, turni: turni, sortKey: sortKey });
                                    }
                                });

                                const mapNomiRotDisp = { "disp_5_1": "Disponibili 5-1", "disp_6_2_6_1": "Disponibili 6-2-6-1" };

                                // Rotazioni non presenti nel json mensile: le ricostruiamo dal calendario
                                // personale di chi ha aderito al modulo rotazioni con quella rotazione.
                                // Vanno inserite PRIMA dei gruppi "Disponibili" per rispettare l'ordine richiesto:
                                // [rotazioni da documento] -> [rotazioni auto-generate] -> [disponibili]
                                if (!globalRotPatternCacheLoaded) { await window.caricaDatiTurniSilenziosoRot(); }
                                let gruppiAutoGenerati = await costruisciRotazioniMancantiRot(jsonData, allU, y, m);
                                gruppiAutoGenerati.forEach(t => window.rotazioniAutoGenerateRot.add(t));

                                for (let rotKey in dispGroups) {
                                    for (let manKey in dispGroups[rotKey]) {
                                        dispGroups[rotKey][manKey].sort((a, b) => a.sortKey - b.sortKey);
                                        let finalObj = {};
                                        dispGroups[rotKey][manKey].forEach(x => finalObj[x.nome] = x.turni);
                                        let tabName = `${mapNomiRotDisp[rotKey]} - ${manKey}`;
                                        jsonData[tabName] = finalObj;
                                    }
                                }
                            }
                        }

                        Object.values(jsonData).forEach(rot => {
                            Object.keys(rot).forEach(nome => {
                                if (!window.globalNomiRotazioni.includes(nome.toUpperCase())) {
                                    window.globalNomiRotazioni.push(nome.toUpperCase());
                                }
                            });
                        });

                        Object.keys(jsonData).forEach(rotName => {
                            let rotContainer = document.createElement('div');
                            rotContainer.className = "rot-container-box";

                            let rotTitle = document.createElement('h4');
                            rotTitle.className = "rot-title-box";
                            let badgeAuto = window.rotazioniAutoGenerateRot.has(rotName)
                                ? ` <i class="fa-solid fa-arrows-rotate" style="color: var(--info); font-size: 12px;" title="Ricostruita automaticamente dai calendari personali (nessun documento caricato per questa rotazione)"></i>`
                                : '';
                            rotTitle.innerHTML = `<i class="fa-solid fa-folder-tree" style="color: var(--text-muted); font-size: 14px;"></i> ${rotName}${badgeAuto}`;
                            rotContainer.appendChild(rotTitle);

                            let btnTab = document.createElement('button');
                            btnTab.className = "rot-file-btn rot-btn-table";
                            btnTab.innerHTML = `<i class="fa-solid fa-table"></i> Visualizza Tabella`;
                            btnTab.onclick = () => window.apriTabellaRot(rotName, jsonData);
                            rotContainer.appendChild(btnTab);

                            let btnSearch = document.createElement('button');
                            btnSearch.className = "rot-file-btn rot-btn-search";
                            btnSearch.style.marginTop = "10px";
                            btnSearch.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Cerca Colleghi e Cambi`;
                            btnSearch.onclick = () => window.apriRicercaJsonRot(rotName, jsonData);
                            rotContainer.appendChild(btnSearch);

                            let btnFuturo = document.createElement('button');
                            btnFuturo.className = "rot-file-btn rot-btn-search";
                            btnFuturo.style.marginTop = "10px";
                            btnFuturo.style.backgroundColor = "var(--warning)";
                            btnFuturo.style.color = "#fff";
                            btnFuturo.innerHTML = `<i class="fa-solid fa-crystal-ball"></i> Ricerca mesi successivi`;
                            btnFuturo.onclick = () => window.apriRicercaFuturaRot(g.base, rotName, jsonData);
                            rotContainer.appendChild(btnFuturo);

                            btnGrid.appendChild(rotContainer);
                        });
                    } catch(e) { console.error("Errore lettura JSON", e); }
                } else if (g.excel) {
                    let btnSearch = document.createElement('button');
                    btnSearch.className = "rot-file-btn rot-btn-search";
                    btnSearch.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Cerca (Modalità Lenta)`;
                    btnSearch.onclick = () => window.apriFinestraRicercaExcelRot(g.pdf ? g.pdf : g.excel, files);
                    btnGrid.appendChild(btnSearch);
                }

                if (g.pdf) {
                    let btnPdf = document.createElement('a');
                    btnPdf.className = "rot-file-btn rot-btn-pdf";
                    btnPdf.innerHTML = `<i class="fa-regular fa-file-pdf"></i> Apri PDF Originale`;
                    btnPdf.href = `${CARTELLA_BASE}/${g.pdf}?t=${timestamp}`; 
                    btnPdf.target = "_blank";
                    btnGrid.appendChild(btnPdf);
                }

                monthCard.appendChild(btnGrid);
                rimuoviSpinner();
                area.appendChild(monthCard);
                indexRot++;
            }

        } catch (e) { 
            area.innerHTML = `<div style="color:var(--danger); text-align:center; padding:20px; background:var(--danger-light); border-radius:12px;"><i class="fa-solid fa-triangle-exclamation" style="font-size:28px;"></i><br>Errore di connessione.</div>`; 
        }
    };

    function getClassForTurno(turno) {
        let t = turno.toUpperCase().replace(/\s+/g, '');
        if (t === 'AL') return 'cell-al';
        if (t === 'RI') return 'cell-ri';
        if (t === 'DISP' || t === 'DI') return 'cell-disp';
        if (t === 'ESPE') return 'cell-espe';
        if (t === 'FER' || t === 'FEP' || t === 'FES') return 'cell-fer';
        return '';
    }

    window.apriTabellaRot = (rotName, data) => {
        const modal = document.getElementById('rot-table-modal');
        const title = document.getElementById('rot-table-modal-title');
        const container = document.getElementById('rot-table-container');

        title.innerHTML = `<i class="fa-solid fa-table" style="color:var(--text-muted); font-size:18px;"></i> ${rotName}`;
        
        let html = `<div class="rot-table-responsive"><table class="rot-rotazioni-table">`;
        html += `<thead><tr><th>N.</th><th>Colleghi</th>`;
        for(let i=1; i<=31; i++) html += `<th>${i}</th>`;
        html += `</tr></thead><tbody>`;

        const dipendenti = data[rotName];
        let numeroArmo = 0;
        for (let nome in dipendenti) {
            let nomeUpper = nome.toUpperCase();
            if (paroleDaSaltare.some(parola => nomeUpper.includes(parola)) || nome.trim() === "") continue;

            numeroArmo++;
            let nomeFormattato = nome.split(" - ").join("<br>");
            html += `<tr><td class="rot-cell-num">${numeroArmo}</td><td>${nomeFormattato}</td>`;
            
            for(let i=1; i<=31; i++) {
                let turno = dipendenti[nome][i.toString()] || "";
                let classCss = getClassForTurno(turno);
                html += `<td class="${classCss}">${turno}</td>`;
            }
            html += `</tr>`;
        }
        html += `</tbody></table></div>`;
        
        container.innerHTML = html;
        modal.style.display = 'flex';
    };

    window.apriRicercaJsonRot = (rotName, jsonData) => {
        databaseTurni = []; 
        let dipendenti = jsonData[rotName];
        for (let nome in dipendenti) {
            let nomeUpper = nome.toUpperCase();
            if (paroleDaSaltare.some(parola => nomeUpper.includes(parola)) || nome.trim() === "") continue;

            let turniArr = [];
            for (let i = 1; i <= 31; i++) {
                let val = dipendenti[nome][i.toString()] || "";
                if (val.toUpperCase().replace(/\s+/g, '') === "DI") val = "DISP";
                turniArr.push(val.toUpperCase().replace(/\s+/g, ''));
            }
            databaseTurni.push({
                nome: nome.split(" - ").join(" e "), 
                turni: turniArr,
                rotazione: rotName 
            });
        }

        document.getElementById('rot-modal-title').innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> ${rotName}`;
        document.getElementById('rot-search-modal').style.display = 'flex';
        document.getElementById('rot-modal-status').style.display = 'none';
        document.getElementById('rot-modal-search-sections').style.display = 'block';
        document.getElementById('rot-risultato-turno').innerHTML = "";
        document.getElementById('rot-risultato-turno').style.display = 'none';
        document.getElementById('rot-risultato-cambi').innerHTML = "";
        document.getElementById('rot-risultato-cambi').style.display = 'none';
    };

    window.cercaTurnoRot = () => {
        const giorno = parseInt(document.getElementById('rot-input-giorno-turno').value);
        const codice = document.getElementById('rot-input-codice-turno').value.trim().toUpperCase();
        const boxRisultato = document.getElementById('rot-risultato-turno');

        boxRisultato.style.display = 'block';

        if (!giorno || !codice) {
            boxRisultato.innerHTML = "<i class='fa-solid fa-triangle-exclamation' style='color:var(--warning);'></i> Compila sia il Giorno che il Turno.";
            return;
        }

        const indiceGiorno = giorno - 1;
        let trovati = [];

        databaseTurni.forEach(dipendente => {
            if (dipendente.turni[indiceGiorno] === codice) trovati.push(dipendente.nome);
        });

        if (trovati.length > 0) {
            let detailsHtml = "";
            if (globalShiftData && globalShiftData[codice]) {
                let info = globalShiftData[codice];
                detailsHtml = `
                    <div class="rot-turn-details-box">
                        <div style="margin-bottom:6px;"><i class="fa-solid fa-play" style="color:var(--success); font-size:10px;"></i> Inizio: <strong style="color:var(--text-main);">${info.luogoInizio} (${info.inizio})</strong></div>
                        <div><i class="fa-solid fa-stop" style="color:var(--danger); font-size:10px;"></i> Fine: <strong style="color:var(--text-main);">${info.luogoFine} (${info.fine})</strong></div>
                        <button class="rot-file-btn" style="padding: 10px; margin-top: 12px; font-size: 13px; width: 100%; box-sizing:border-box; background-color: var(--info);" onclick="window.apriImmagineDaRotazioniRot('${codice}')"><i class="fa-regular fa-image"></i> Mostra Immagine Turno</button>
                    </div>
                `;
            } else {
                detailsHtml = `
                    <div style="margin-top: 12px;">
                        <button class="rot-file-btn" style="padding: 10px; font-size: 13px; width: 100%; box-sizing:border-box; background-color: var(--info);" onclick="window.apriImmagineDaRotazioniRot('${codice}')"><i class="fa-regular fa-image"></i> Mostra Immagine Turno</button>
                    </div>
                `;
            }
            boxRisultato.innerHTML = `<div style="font-weight:700; color:var(--primary); margin-bottom:12px;">Trovati il giorno ${giorno} a fare ${codice}:</div><ul style="margin-bottom:15px;"><li>` + trovati.join("</li><li>") + "</li></ul>" + detailsHtml;
        } else {
            boxRisultato.innerHTML = "<i class='fa-solid fa-user-slash' style='color:var(--text-muted);'></i> Nessuno fa questo turno nel giorno indicato.";
        }
    };

    function analizzaCicloLavorativo(turniMese, indiceGiorno, rotazione) {
        const turnoAttuale = turniMese[indiceGiorno];
        
        if (turnoAttuale === "AL" || turnoAttuale === "RI" || turnoAttuale === "") {
            let tipoRiposo = "Vuoto";
            if (turnoAttuale === "AL") {
                let domani = (indiceGiorno + 1 < turniMese.length) ? turniMese[indiceGiorno + 1] : "";
                tipoRiposo = (domani === "RI" || domani === "AL") ? "Doppio (Oggi AL)" : "Singolo (AL)";
            } else if (turnoAttuale === "RI") {
                let ieri = (indiceGiorno - 1 >= 0) ? turniMese[indiceGiorno - 1] : "";
                let domani = (indiceGiorno + 1 < turniMese.length) ? turniMese[indiceGiorno + 1] : "";
                tipoRiposo = (ieri === "AL" || ieri === "RI" || domani === "AL" || domani === "RI") ? "Doppio (Oggi RI)" : "Singolo (RI)";
            }
            return { fase: "Riposo", giornoEsatto: 0, tipoRiposo: tipoRiposo };
        }

        let giorniLavorati = 1; 
        let trovatoRiposoPassato = false;
        for (let i = indiceGiorno - 1; i >= 0; i--) {
            if (turniMese[i] === "AL" || turniMese[i] === "RI" || turniMese[i] === "") {
                trovatoRiposoPassato = true; break;
            }
            giorniLavorati++;
        }

        if (trovatoRiposoPassato) return determinaFaseDaGiorno(giorniLavorati, rotazione);

        let giorniAlProssimoRiposo = 0;
        for (let i = indiceGiorno + 1; i < turniMese.length; i++) {
            if (turniMese[i] === "AL" || turniMese[i] === "RI" || turniMese[i] === "") break;
            giorniAlProssimoRiposo++;
        }

        let stima = 6 - giorniAlProssimoRiposo;
        if (rotazione && rotazione.includes("5-1")) {
            stima = 5 - giorniAlProssimoRiposo;
        }
        return determinaFaseDaGiorno(stima > 0 ? stima : giorniLavorati, rotazione);
    }

    function determinaFaseDaGiorno(n, rotazione) {
        if (rotazione && rotazione.includes("5-1")) {
            if (n === 1 || n === 2) return { fase: "Terzo", giornoEsatto: n };
            if (n === 3) return { fase: "Mezzo", giornoEsatto: n };
            if (n === 4 || n === 5) return { fase: "Primo", giornoEsatto: n };
            return { fase: "Oltre 5 giorni", giornoEsatto: n };
        }
        if (n === 1 || n === 2) return { fase: "Terzo", giornoEsatto: n };
        if (n === 3 || n === 4) return { fase: "Mezzo", giornoEsatto: n };
        if (n === 5 || n === 6) return { fase: "Primo", giornoEsatto: n };
        return { fase: "Oltre 6 giorni", giornoEsatto: n };
    }

    window.cercaCambiRot = () => {
        const giorno = parseInt(document.getElementById('rot-input-giorno-cambio').value);
        const faseDesiderata = document.getElementById('rot-select-fase-cambio').value;
        const boxRisultato = document.getElementById('rot-risultato-cambi');

        boxRisultato.style.display = 'block';

        if (!giorno) {
            boxRisultato.innerHTML = "<i class='fa-solid fa-triangle-exclamation' style='color:var(--warning);'></i> Inserisci il giorno del mese.";
            return;
        }

        const indiceGiorno = giorno - 1;
        let risultatiHtml = [];

        databaseTurni.forEach(dipendente => {
            const analisi = analizzaCicloLavorativo(dipendente.turni, indiceGiorno, dipendente.rotazione);
            if (analisi.fase === faseDesiderata) {
                if (faseDesiderata === "Riposo") {
                    if (analisi.tipoRiposo !== "Vuoto") {
                        risultatiHtml.push(`<strong>${dipendente.nome}</strong> <span style="float:right; color:var(--danger); font-size:12px; font-weight:700;">[Riposo ${analisi.tipoRiposo}]</span>`);
                    }
                } else {
                    let turnoCod = dipendente.turni[indiceGiorno];
                    let isRiposoOrDisp = ["AL", "RI", "DISP", "ESPE", "DI", ""].includes(turnoCod);
                    
                    if (!isRiposoOrDisp) {
                        let infoExtra = "";
                        if (globalShiftData && globalShiftData[turnoCod]) {
                            let info = globalShiftData[turnoCod];
                            infoExtra = `<div style="margin-top:6px; font-size:12px;"><i class="fa-solid fa-play" style="color:var(--success); font-size:10px;"></i> In: <strong style="color:var(--text-main);">${info.luogoInizio} (${info.inizio})</strong> <span style="margin:0 4px; color:var(--border-color);">|</span> <i class="fa-solid fa-stop" style="color:var(--danger); font-size:10px;"></i> Out: <strong style="color:var(--text-main);">${info.luogoFine} (${info.fine})</strong></div>`;
                        }
                        
                        let detailsHtml = `
                            <div class="rot-turn-details-box">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <strong style="color:var(--primary); font-size:14px;"><i class="fa-solid fa-clock"></i> Turno: ${turnoCod}</strong>
                                    <button class="rot-btn" style="padding: 6px 10px; margin: 0; font-size: 11px; width: auto; background-color: var(--info); box-shadow:none;" onclick="window.apriImmagineDaRotazioniRot('${turnoCod}')"><i class="fa-regular fa-image"></i> Img</button>
                                </div>
                                ${infoExtra}
                            </div>
                        `;
                        risultatiHtml.push(`<strong>${dipendente.nome}</strong> <span style="color:var(--text-muted); font-size:12px;">(Giorno lav. ${analisi.giornoEsatto})</span> ${detailsHtml}`);
                    } else {
                        risultatiHtml.push(`<strong>${dipendente.nome}</strong> <span style="color:var(--text-muted); font-size:12px;">(Giorno lav. ${analisi.giornoEsatto})</span> - <span style="color:var(--warning); font-weight:700;">[${turnoCod}]</span>`);
                    }
                }
            }
        });

        if (risultatiHtml.length > 0) {
            boxRisultato.innerHTML = `<div style="margin-bottom:12px; font-weight:700; color:var(--success);">Colleghi in fase "Di ${faseDesiderata}" il giorno ${giorno}:</div><ul style="padding-left:0; list-style:none; margin:0;"><li style='margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;'>` + risultatiHtml.join("</li><li style='margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;'>") + "</li></ul>";
        } else {
            boxRisultato.innerHTML = "<i class='fa-solid fa-user-slash' style='color:var(--text-muted);'></i> Nessun collega in questa fase.";
        }
    };

    function buildColleaguePredictor(nome, turniMese, m, y, rotazione) {
        let refNum = null;
        let is51 = rotazione && rotazione.includes("5-1");

        if (is51) {
            let riIndex = turniMese.findIndex(t => t === "RI" || t === "AL");
            if (riIndex !== -1) {
                let dNum = stringToNum(`${y}-${m}-${riIndex + 1}`);
                refNum = dNum - 5; 
            }
        } else {
            let alIndex = turniMese.findIndex(t => t === "AL");
            if (alIndex !== -1) {
                refNum = stringToNum(`${y}-${m}-${alIndex + 1}`) - 7;
            } else {
                for (let i = 0; i < turniMese.length; i++) {
                    if (turniMese[i] === "RI") {
                        let prevAL = (i - 1 >= 0 && turniMese[i-1] === "AL");
                        let prevRI = (i - 1 >= 0 && turniMese[i-1] === "RI");
                        let nextRI = (i + 1 < turniMese.length && turniMese[i+1] === "RI");
                        
                        let dNum = stringToNum(`${y}-${m}-${i + 1}`);
                        if (prevAL || prevRI) { refNum = dNum - 8; } 
                        else if (nextRI) { refNum = dNum - 7; } 
                        else { refNum = dNum; }
                        break;
                    }
                }
            }
        }
        if (refNum === null) return null; 
        return { nome, refNum, rotazione };
    }

    window.apriRicercaFuturaRot = (baseName, rotName, jsonData) => {
        document.getElementById('rot-future-modal-title').innerHTML = `<i class="fa-solid fa-crystal-ball"></i> ${rotName}`;
        
        let parts = baseName.split('_'); 
        let meseStr = parts[1];
        let annoStr = parts[2];
        const mesiMap = { "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12 };
        let m = mesiMap[meseStr.toLowerCase()];
        let y = parseInt(annoStr);

        activePredictors = [];
        
        let dipendenti = jsonData[rotName];
        for (let nome in dipendenti) {
            if (paroleDaSaltare.some(p => nome.toUpperCase().includes(p)) || nome.trim() === "") continue;

            let turniMese = [];
            for (let i = 1; i <= 31; i++) {
                let t = dipendenti[nome][i.toString()] || "";
                turniMese.push(t.toUpperCase().replace(/\s+/g, ''));
            }

            let p = buildColleaguePredictor(nome.split(" - ").join(" e "), turniMese, m, y, rotName);
            if (p) activePredictors.push(p);
        }

        document.getElementById('rot-future-search-modal').style.display = 'flex';
        document.getElementById('rot-risultato-futuro').innerHTML = "";
        document.getElementById('rot-risultato-futuro').style.display = 'none';
    };

    window.eseguiRicercaFuturaRot = () => {
        const dateStr = document.getElementById('rot-input-date-futura').value;
        const faseDesiderata = document.getElementById('rot-select-fase-futura').value;
        const boxRisultato = document.getElementById('rot-risultato-futuro');

        boxRisultato.style.display = 'block';

        if (!dateStr) {
            boxRisultato.innerHTML = "<i class='fa-solid fa-triangle-exclamation' style='color:var(--warning);'></i> Seleziona una data.";
            return;
        }

        let targetNum = stringToNum(dateStr);
        let trovati = [];

        activePredictors.forEach(p => {
            let faseCalcolata = "";
            let infoExtra = "";
            let giornoLav = 0;

            if (p.rotazione && p.rotazione.includes("5-1")) {
                let pos = ((targetNum - p.refNum) % 6 + 6) % 6;
                if (pos === 5) { 
                    faseCalcolata = "Riposo"; infoExtra = "Singolo (RI)"; 
                } else {
                    giornoLav = pos + 1;
                    if (giornoLav === 1 || giornoLav === 2) faseCalcolata = "Terzo";
                    else if (giornoLav === 3) faseCalcolata = "Mezzo";
                    else if (giornoLav === 4 || giornoLav === 5) faseCalcolata = "Primo";
                }
            } 
            else {
                let pos = ((targetNum - p.refNum + 6) % 15 + 15) % 15;
                if (pos === 6) { faseCalcolata = "Riposo"; infoExtra = "Singolo (RI)"; }
                else if (pos === 13) { faseCalcolata = "Riposo"; infoExtra = "Doppio (1° g. AL)"; }
                else if (pos === 14) { faseCalcolata = "Riposo"; infoExtra = "Doppio (2° g. RI)"; }
                else {
                    if (pos >= 0 && pos <= 5) giornoLav = pos + 1; 
                    else if (pos >= 7 && pos <= 12) giornoLav = pos - 6; 
                    
                    if (giornoLav === 1 || giornoLav === 2) faseCalcolata = "Terzo";
                    else if (giornoLav === 3 || giornoLav === 4) faseCalcolata = "Mezzo";
                    else if (giornoLav === 5 || giornoLav === 6) faseCalcolata = "Primo";
                }
            }

            if (faseCalcolata === faseDesiderata) {
                if (faseCalcolata === "Riposo") {
                    trovati.push(`<strong>${p.nome}</strong> <span style="float:right; color:var(--danger); font-size:12px; font-weight:700;">[Riposo ${infoExtra}]</span>`);
                } else {
                    trovati.push(`<strong>${p.nome}</strong> <span style="color:var(--text-muted); font-size:12px; margin-left:6px;">(Giorno lav. ${giornoLav})</span>`);
                }
            }
        });

        if (trovati.length > 0) {
            let p = dateStr.split('-');
            let f = `${p[2]}/${p[1]}/${p[0]}`;
            let msg = `Colleghi in fase di <strong style="color:var(--success); text-transform:uppercase;">${faseDesiderata}</strong> il ${f}:`;
            boxRisultato.innerHTML = `<div style="margin-bottom:12px;">${msg}</div><ul style="padding-left:0; list-style:none; margin:0;"><li style='margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:8px;'>` + trovati.join("</li><li style='margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:8px;'>") + "</li></ul>";
        } else {
            boxRisultato.innerHTML = "<i class='fa-solid fa-user-slash' style='color:var(--text-muted);'></i> Nessun collega in questa fase per la data indicata.";
        }
    };

    window.apriFinestraRicercaExcelRot = async (pdfName, tuttiIFileNomi) => {
        const modal = document.getElementById('rot-search-modal');
        const statusEl = document.getElementById('rot-modal-status');
        const sezioniRicerca = document.getElementById('rot-modal-search-sections');
        const title = document.getElementById('rot-modal-title');
        
        title.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Ricerca Globale`;
        modal.style.display = 'flex';
        sezioniRicerca.style.display = 'none';
        statusEl.style.display = 'flex';
        statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i><span>Apertura e scansione documento Excel... <br><span style="font-size:12px;">(L'operazione richiede qualche secondo)</span></span>`;
        
        document.getElementById('rot-risultato-turno').innerHTML = "";
        document.getElementById('rot-risultato-cambi').innerHTML = "";
        databaseTurni = [];

        if (typeof XLSX === 'undefined') {
            statusEl.innerHTML = "Errore: Libreria Excel non caricata."; return;
        }

        const timestamp = new Date().getTime();
        const baseName = pdfName.substring(0, pdfName.lastIndexOf('.'));
        
        let targetUrl = `${CARTELLA_BASE}/${encodeURIComponent(baseName)}.xlsx?t=${timestamp}`;
        let res;

        try {
            res = await fetch(targetUrl);
            
            if (!res.ok && tuttiIFileNomi) {
                const baseNameLower = baseName.toLowerCase().trim();
                const excelFileName = tuttiIFileNomi.find(nome => {
                    const itemNameLower = nome.toLowerCase();
                    return itemNameLower === baseNameLower + ".xlsx" || itemNameLower === baseNameLower + ".xls";
                });
                if (excelFileName) res = await fetch(`${CARTELLA_BASE}/${excelFileName}?t=${timestamp}`);
            }

            if (!res || !res.ok) throw new Error("File Excel non trovato.");

            const arrayBuffer = await res.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, {type: 'array'});
            
            let foundAnyTurns = false;

            for (let sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                let headerRowIndex = -1;
                let dayColIndices = new Array(31).fill(-1);

                for (let r = 0; r < rows.length; r++) {
                    let row = rows[r];
                    if (!row) continue;
                    for (let c = 0; c < row.length - 2; c++) {
                        let cell1 = String(row[c]).trim(); let cell2 = String(row[c+1]).trim(); let cell3 = String(row[c+2]).trim();
                        if (cell1 === "1" && cell2 === "2" && cell3 === "3") {
                            headerRowIndex = r;
                            for (let d = 1; d <= 31; d++) {
                                for (let look = c; look < row.length; look++) {
                                    if (String(row[look]).trim() === String(d)) { dayColIndices[d - 1] = look; break; }
                                }
                            }
                            break;
                        }
                    }
                    if (headerRowIndex !== -1) break;
                }

                if (headerRowIndex !== -1) {
                    let currentPos = 0;
                    for (let r = headerRowIndex + 1; r < rows.length; r++) {
                        let row = rows[r];
                        if (!row || row.length === 0) continue;

                        let bloccoGiorni = new Array(31).fill("");
                        let conteggioValidi = 0;

                        for (let d = 0; d < 31; d++) {
                            let colIdx = dayColIndices[d];
                            if (colIdx !== -1 && colIdx < row.length) {
                                let cella = row[colIdx];
                                if (cella) {
                                    let val = String(cella).replace(/[\s]+/g, '').toUpperCase();
                                    if (["AL", "RI", "DISP", "DI", "FER", "MAL", "PRT", "ESPE"].includes(val) || val.match(/^[0-9]+[A-Z]+[0-9]*$/) || val.match(/^[A-Z]+[0-9]+$/)) {
                                        if (val === "DI") val = "DISP";
                                        bloccoGiorni[d] = val;
                                        conteggioValidi++;
                                    }
                                }
                            }
                        }

                        if (conteggioValidi >= 15) {
                            currentPos++;
                            let firstDayCol = dayColIndices[0];
                            
                            let nameParts1 = [];
                            for (let c = 0; c < firstDayCol; c++) {
                                if (row[c]) {
                                    let txt = String(row[c]).replace(/[0-9]/g, '').trim();
                                    if (txt.length >= 2 && !paroleDaSaltare.includes(txt.toUpperCase())) nameParts1.push(txt);
                                }
                            }
                            let nome1 = nameParts1.join(" ");

                            let nomeFinale = nome1;
                            if (!nomeFinale) nomeFinale = `Collega (Posizione ${currentPos})`;

                            databaseTurni.push({ pos: currentPos, nome: nomeFinale, turni: bloccoGiorni });
                        }
                    }
                    if (databaseTurni.length > 0) { foundAnyTurns = true; break; }
                }
            }

            if (foundAnyTurns) {
                statusEl.style.display = 'none';
                sezioniRicerca.style.display = 'block';
            } else {
                statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Formato tabella non supportato.`;
            }

        } catch (error) {
            statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> ${error.message}`;
        }
    };

    // ==========================================
    // ZOOM IMMAGINI
    // ==========================================

    window.initPanzoomRotazioni = () => {
        const imgElem = document.getElementById('rot-turnoImage');
        if (typeof Panzoom !== 'undefined' && !pzInstance && imgElem) {
            pzInstance = Panzoom(imgElem, { maxScale: 5, minScale: 1 });
            document.getElementById('rot-imageFlexContainer').addEventListener('wheel', pzInstance.zoomWithWheel);
            
            function eseguiZoomToggle(e) {
                if (!pzInstance) return;
                let currentScale = pzInstance.getScale();
                if (currentScale < 1.1) pzInstance.zoom(1.75, { animate: true });
                else pzInstance.reset({ animate: true });
            }

            let lastTap = 0;
            let isPinching = false;
            imgElem.addEventListener('touchstart', function(e) { if (e.touches.length > 1) { isPinching = true; } });
            imgElem.addEventListener('touchend', function(e) {
                if (isPinching) {
                    if (e.touches.length === 0) { setTimeout(() => isPinching = false, 300); }
                    return;
                }
                let currentTime = new Date().getTime();
                let tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    eseguiZoomToggle(e);
                    if (e.cancelable) e.preventDefault();
                }
                lastTap = currentTime;
            });
            imgElem.addEventListener('dblclick', function(e) { eseguiZoomToggle(e); });
        }
    };

    window.apriImmagineDaRotazioniRot = (turnoPilota) => {
        if (!globalImgDir) {
            alert("Cartella immagini non trovata."); return;
        }

        let imgElement = document.getElementById('rot-turnoImage');
        currentImagePath = `${globalImgDir}/${turnoPilota}.jpg`;
        
        imgElement.onload = function() {
            if (pzInstance) { pzInstance.reset(); }
            document.getElementById('rot-imageModal').style.display = 'block';
            imgElement.onload = null; imgElement.onerror = null;
        };

        imgElement.onerror = function() {
            currentImagePath = `${globalImgDir}/${turnoPilota}.png`;
            imgElement.onload = function() {
                if (pzInstance) { pzInstance.reset(); }
                document.getElementById('rot-imageModal').style.display = 'block';
                imgElement.onload = null; imgElement.onerror = null;
            };
            imgElement.onerror = function() {
                alert("L'immagine per il turno " + turnoPilota + " non è presente.");
                window.chiudiImageModalRot();
            };
            imgElement.src = currentImagePath;
        };

        imgElement.src = currentImagePath;
    };

    window.chiudiImageModalRot = () => {
        document.getElementById('rot-imageModal').style.display = 'none';
        document.getElementById('rot-turnoImage').removeAttribute('src');
        if (pzInstance) { pzInstance.reset(); }
    };

    window.scaricaImmagineTurnoRot = () => {
        if (!currentImagePath) return;
        const a = document.createElement('a');
        a.href = currentImagePath;
        a.download = currentImagePath.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };


    // ==========================================
    // LOGICA DI GESTIONE ACCESSI E COLLABORATORI
    // ==========================================

    window.inviaRichiestaAccessoRot = async () => {
        const rot = document.getElementById('rot-req-rotazione').value;
        const n = document.getElementById('rot-req-nome').value.trim();
        const c = document.getElementById('rot-req-cognome').value.trim();
        const m = document.getElementById('rot-req-matricola').value.trim();
        const omo = document.getElementById('rot-req-omonimia').value.trim();
        const cons = document.getElementById('rot-req-consenso').checked;
        const dRip = document.getElementById('rot-req-data-riposo').value;
        const man = document.getElementById('rot-req-mansione').value;
        const err = document.getElementById('rot-req-error-msg');
        const btn = document.getElementById('rot-btn-invia-req');
        
        if (!n || !c || !m) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Nome, Cognome e Matricola sono obbligatori."; return; }
        if (!rot) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona la tua rotazione di appartenenza."; return; }
        if (rot.startsWith('disp_')) {
            if (!dRip) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Inserisci la data di un tuo riposo singolo."; return; }
            if (!man) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona la tua mansione."; return; }
        }
        if (!cons) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Devi accettare di condividere i dati per continuare."; return; }
        if (!currentUserId) return;
        
        err.innerHTML = ""; 
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Invio in corso..."; 
        btn.disabled = true;
        
        try {
            // Profilo in UTENTI (manteniamo updateDoc come richiesto, l'utente esiste già per l'app base)
            let pUtenti = { nome: n, cognome: c, matricola: m, progressivo: omo };
            await updateDoc(doc(db, "utenti", currentUserId), pUtenti);
            
            // Permessi in PERMESSI_ROTAZIONI
            let pRotazioni = {
                stato_richiesta: 'pending', rotazione_richiesta: rot, 
                data_riposo_singolo: dRip || null, mansione: rot.startsWith('disp_') ? man : null
            };
            await setDoc(doc(db, "permessi_rotazioni", currentUserId), pRotazioni, { merge: true });
            
            window.initRotazioniState();
        } catch(e) { 
            err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore durante l'invio. Riprova."; 
            btn.innerHTML = "<i class='fa-solid fa-paper-plane'></i> Invia Richiesta";
            btn.disabled = false;
        }
    };

    window.apriMieiDatiModalRotazioni = () => {
        if (!currentUserDoc) return;
        document.getElementById('rot-edit-nome').value = currentUserDoc.nome || '';
        document.getElementById('rot-edit-cognome').value = currentUserDoc.cognome || '';
        document.getElementById('rot-edit-matricola').value = currentUserDoc.matricola || '';
        document.getElementById('rot-edit-omonimia').value = currentUserDoc.progressivo || '';
        
        let rReq = currentUserDoc.rotazione_richiesta;
        if (ROTAZIONI_MAP[rReq]) {
            document.getElementById('rot-edit-rotazione').value = rReq;
        } else {
            document.getElementById('rot-edit-rotazione').value = '';
        }
        
        let isDisp = rReq && rReq.startsWith('disp_');
        document.getElementById('rot-edit-data-riposo').value = currentUserDoc.data_riposo_singolo || '';
        document.getElementById('rot-edit-mansione').value = currentUserDoc.mansione || '';
        
        document.getElementById('rot-div-data-riposo-edit').style.display = isDisp ? 'block' : 'none';
        document.getElementById('rot-div-mansione-edit').style.display = isDisp ? 'block' : 'none';
        
        document.getElementById('rot-edit-error-msg').innerText = '';
        document.getElementById('rot-btn-salva-dati').innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Modifiche";
        document.getElementById('rot-btn-salva-dati').disabled = false;
        document.getElementById('rot-modal-miei-dati').style.display = 'flex';
    };

    window.salvaMieiDatiRot = async () => {
        const rot = document.getElementById('rot-edit-rotazione').value;
        const n = document.getElementById('rot-edit-nome').value.trim();
        const c = document.getElementById('rot-edit-cognome').value.trim();
        const m = document.getElementById('rot-edit-matricola').value.trim();
        const omo = document.getElementById('rot-edit-omonimia').value.trim();
        const dRip = document.getElementById('rot-edit-data-riposo').value;
        const man = document.getElementById('rot-edit-mansione').value;
        const err = document.getElementById('rot-edit-error-msg');
        const btn = document.getElementById('rot-btn-salva-dati');
        
        if (!n || !c || !m) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Nome, Cognome e Matricola sono obbligatori."; return; }
        if (!rot) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona rotazione."; return; }
        if (rot.startsWith('disp_')) {
            if (!dRip) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Inserisci riposo singolo."; return; }
            if (!man) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona mansione."; return; }
        }
        
        err.innerHTML = "";
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio..."; 
        btn.disabled = true;
        
        try {
            // Aggiorna profilo in utenti
            let pUtenti = { nome: n, cognome: c, matricola: m, progressivo: omo };
            await updateDoc(doc(db, "utenti", currentUserId), pUtenti);
            
            // Aggiorna permessi in permessi_rotazioni
            let pRotazioni = { 
                rotazione_richiesta: rot, data_riposo_singolo: dRip || null,
                mansione: rot.startsWith('disp_') ? man : null
            };
            await setDoc(doc(db, "permessi_rotazioni", currentUserId), pRotazioni, { merge: true });
            
            currentUserDoc.nome = n; currentUserDoc.cognome = c; currentUserDoc.matricola = m; 
            currentUserDoc.progressivo = omo; currentUserDoc.rotazione_richiesta = rot;
            currentUserDoc.data_riposo_singolo = pRotazioni.data_riposo_singolo;
            currentUserDoc.mansione = pRotazioni.mansione;
            
            alert("Dati aggiornati con successo!");
            window.chiudiModalRotazioni('rot-modal-miei-dati');
        } catch(e) { 
            err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore durante il salvataggio."; 
            btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Modifiche";
            btn.disabled = false;
        }
    };

    window.apriDettaglioUtenteRot = (uid) => {
        const u = window.utentiMap[uid];
        if (!u) return;
        window.currentUtentePdf = u;
        const omo = u.progressivo ? ` ${u.progressivo}` : '';
        const htmlData = `
            <div style="margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;"><strong><i class="fa-solid fa-user"></i> Nome:</strong> ${u.nome || '-'}</div>
            <div style="margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;"><strong><i class="fa-regular fa-user"></i> Cognome:</strong> ${u.cognome || '-'}${omo}</div>
            <div style="margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;"><strong><i class="fa-regular fa-id-badge"></i> Matricola:</strong> <span style="font-family:monospace; font-size:15px; color:var(--primary); font-weight:700;">${u.matricola || '-'}</span></div>
            <div style="margin-bottom:4px;"><strong><i class="fa-solid fa-folder-tree"></i> Rotazione:</strong> <span style="color:var(--success); font-weight:700;">${ROTAZIONI_MAP[u.rotazione_richiesta] || u.rotazione_richiesta || '-'}</span></div>
        `;
        document.getElementById('rot-dettaglio-utente-body').innerHTML = htmlData;
        document.getElementById('rot-modal-dettaglio-utente').style.display = 'flex';
    };

    window.scaricaPDFConsensoRot = () => {
        const u = window.currentUtentePdf;
        if(!u) return;
        if (typeof window.jspdf === 'undefined') { alert("Libreria PDF non ancora caricata. Riprova."); return; }
        const { jsPDF } = window.jspdf;
        const docObj = new jsPDF();
        
        const omo = u.progressivo ? ` ${u.progressivo}` : '';
        const email = u.email || 'Email non registrata nel database';
        
        docObj.setFontSize(16);
        docObj.text("Modulo di Consenso Rotazioni", 10, 20);
        
        docObj.setFontSize(12);
        docObj.text(`Nome: ${u.nome || '-'}`, 10, 40);
        docObj.text(`Cognome: ${u.cognome || '-'}${omo}`, 10, 50);
        docObj.text(`Matricola: ${u.matricola || '-'}`, 10, 60);
        docObj.text(`Email: ${email}`, 10, 70);
        docObj.text(`Codice ID utility: ${u.uid}`, 10, 80);
        
        docObj.setFontSize(11);
        const text = "Richiedendo l'accesso alla pagina rotazioni do il mio consenso ad inserire i miei dati nei documenti di programmazione turni mensile \"rotazioni\".";
        const splitText = docObj.splitTextToSize(text, 180);
        docObj.text(splitText, 10, 100);
        
        const safeNome = (u.nome || 'nome').replace(/[^a-zA-Z0-9]/g, '');
        const safeCognome = (u.cognome || 'cognome').replace(/[^a-zA-Z0-9]/g, '');
        docObj.save(`${safeCognome}_${safeNome}_consenso_rotazioni.pdf`);
    };

    window.aggiornaBadgeRichiesteRotazioni = async () => {
        if (!isAdmin && !isCollab) return;
        try {
            const q = query(collection(db, "permessi_rotazioni"), where("stato_richiesta", "==", "pending"));
            const snap = await getDocs(q);
            let count = 0;
            snap.forEach(d => {
                const u = d.data();
                if (isAdmin) { count++; }
                else if (isCollab && (currentUserDoc.permessi_gestione || []).includes(u.rotazione_richiesta)) { count++; }
            });
            
            const bHead = document.getElementById('rot-badge-header');
            const bMod = document.getElementById('rot-badge-modal');
            if (count > 0) {
                bHead.innerText = count; bHead.style.display = 'block';
                bMod.innerText = count; bMod.style.display = 'inline-block';
            } else {
                bHead.style.display = 'none';
                bMod.style.display = 'none';
            }
        } catch(e) { console.error("Errore conteggio richieste", e); }

        // Riallinea il badge notifica sull'icona del modulo (index.js) — solo admin
        if (window.controllaRichiesteSospese) window.controllaRichiesteSospese();
    };

    window.apriGestioneAccessiModalRot = async () => {
        document.getElementById('rot-modal-gestione-accessi').style.display = 'flex';
        if (isAdmin) document.getElementById('rot-btn-collab-admin').style.display = 'flex';
        const cont = document.getElementById('rot-lista-utenti-abilitati');
        cont.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px;"></i> Caricamento...</div>`;
        
        // Fetch combinato (utenti + permessi_rotazioni)
        const permSnap = await getDocs(collection(db, "permessi_rotazioni")); 
        const utentiSnap = await getDocs(collection(db, "utenti")); 
        
        let utentiBase = {};
        utentiSnap.forEach(d => utentiBase[d.id] = d.data());

        window.utentiMap = {}; 
        let utentiArr = [];
        
        permSnap.forEach(d => {
            const pData = d.data();
            if (pData.abilitato_rotazioni === true) {
                const uData = utentiBase[d.id] || {};
                const u = { ...uData, ...pData, uid: d.id }; // Merge
                
                let isLegacy = (u.rotazione_richiesta === 'legacy_code' || (u.rotazione_richiesta && u.rotazione_richiesta.length > 50));
                if (isCollab && !isAdmin && !isLegacy && !(currentUserDoc.permessi_gestione || []).includes(u.rotazione_richiesta)) return;
                
                window.utentiMap[d.id] = u;
                utentiArr.push(u);
            }
        });

        utentiArr.sort((a, b) => {
            let cognomeA = (a.cognome || '').trim().toUpperCase();
            let cognomeB = (b.cognome || '').trim().toUpperCase();
            if (cognomeA < cognomeB) return -1;
            if (cognomeA > cognomeB) return 1;
            let nomeA = (a.nome || '').trim().toUpperCase();
            let nomeB = (b.nome || '').trim().toUpperCase();
            if (nomeA < nomeB) return -1;
            if (nomeA > nomeB) return 1;
            return 0;
        });

        let html = "";
        utentiArr.forEach(u => {
            let isLegacy = (u.rotazione_richiesta === 'legacy_code' || (u.rotazione_richiesta && u.rotazione_richiesta.length > 50));
            let rotNome = ROTAZIONI_MAP[u.rotazione_richiesta];
            if (!rotNome) { rotNome = isLegacy ? 'Accesso con Codice' : (u.rotazione_richiesta || 'Assegnazione Manuale'); }
            
            const checkC = (u.cognome || '').trim().toUpperCase();
            const checkN = (u.nome || '').trim().toUpperCase();
            const presente = checkC && checkN && (window.globalNomiRotazioni || []).some(n => n.includes(checkC) && n.includes(checkN));
            const pallino = presente ? '<i class="fa-solid fa-circle-check" style="color:var(--success); font-size:12px; margin-left:6px;" title="Presente nei tabulati"></i>' : '';

            let btnBloccaHTML = (u.uid === ADMIN_UID) ? 
                `<span style="font-size:12px; color:var(--info); font-weight:800; text-transform:uppercase; letter-spacing:0.5px; border:1px solid var(--info-border); background:var(--info-light); padding:4px 8px; border-radius:8px;">Admin</span>` : 
                `<button class="rot-btn" style="width:auto; padding:8px 12px; font-size:13px; background:var(--danger); margin:0;" onclick="window.revocaAccessoRot('${u.uid}')"><i class="fa-solid fa-ban"></i> Blocca</button>`;

            html += `<div class="rot-utente-row" data-search="${checkC} ${checkN} ${u.matricola||''}">
                <div>
                    <div style="font-weight:700; font-size:15px; cursor:pointer; color:var(--text-main); display:flex; align-items:center;" onclick="window.apriDettaglioUtenteRot('${u.uid}')">${u.cognome||''} ${u.nome||''} ${u.progressivo||''} ${pallino}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:4px; font-weight:500;"><i class="fa-solid fa-id-badge"></i> Matr: ${u.matricola||''} <span style="margin:0 4px;">|</span> <i class="fa-solid fa-folder-tree"></i> ${rotNome}</div>
                </div>
                ${btnBloccaHTML}
            </div>`;
        });
        cont.innerHTML = html || `<div style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-user-slash" style="font-size:24px;"></i> Nessun utente trovato nella tua area.</div>`;
        
        let searchInput = document.getElementById('rot-search-utenti-abilitati');
        if (searchInput) searchInput.value = '';
    };

    window.revocaAccessoRot = async (uid) => {
        if(confirm("Vuoi revocare l'accesso a questo utente? Dovrà rifare la richiesta.")) { 
            await setDoc(doc(db, "permessi_rotazioni", uid), { abilitato_rotazioni: false, stato_richiesta: 'rejected' }, { merge: true }); 
            window.apriGestioneAccessiModalRot(); 
        }
    };

    window.filtraUtentiAbilitatiRot = () => {
        let input = document.getElementById('rot-search-utenti-abilitati');
        let filter = input.value.toUpperCase();
        let rows = document.getElementsByClassName('rot-utente-row');
        for (let i = 0; i < rows.length; i++) {
            let txtValue = rows[i].getAttribute('data-search');
            if (txtValue.indexOf(filter) > -1) rows[i].style.display = "flex";
            else rows[i].style.display = "none";
        }
    };

    window.apriGestioneRichiesteRot = async () => {
        window.chiudiModalRotazioni('rot-modal-gestione-accessi'); 
        document.getElementById('rot-modal-gestione-richieste').style.display = 'flex';
        const cont = document.getElementById('rot-lista-richieste'); 
        cont.innerHTML = `<div style="text-align:center; padding:20px; color:var(--info);"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px;"></i> Ricerca richieste...</div>`;
        
        // Fetch combinato
        const permSnap = await getDocs(collection(db, "permessi_rotazioni"));
        const utentiSnap = await getDocs(collection(db, "utenti")); 
        
        let utentiBase = {};
        utentiSnap.forEach(d => utentiBase[d.id] = d.data());

        let groupedRequests = {}; let count = 0;
        window.utentiMap = {}; 
        
        permSnap.forEach(d => {
            const pData = d.data();
            
            if (pData.stato_richiesta === 'pending') {
                const uData = utentiBase[d.id] || {};
                const u = { ...uData, ...pData, uid: d.id }; // Merge
                
                window.utentiMap[d.id] = u;
                
                if (isCollab && !isAdmin && !(currentUserDoc.permessi_gestione || []).includes(u.rotazione_richiesta)) return;
                let rotKey = u.rotazione_richiesta || 'Sconosciuta';
                if (!groupedRequests[rotKey]) groupedRequests[rotKey] = [];
                groupedRequests[rotKey].push(u);
                count++;
            }
        });

        if (count === 0) {
            cont.innerHTML = `<div style="text-align:center; padding:20px; color:var(--success);"><i class="fa-solid fa-check-double" style="font-size:32px;"></i><br><br>Nessuna richiesta in sospeso.</div>`;
            return;
        }

        let html = "";
        for (let k in groupedRequests) {
            let rotNome = ROTAZIONI_MAP[k] || k;
            let reqs = groupedRequests[k];
            html += `<details style="margin-bottom:16px; border:1px solid var(--border-color); border-radius:var(--radius-md); background:var(--surface);" open>
                <summary style="padding:16px; font-weight:700; cursor:pointer; background:var(--surface-hover); border-radius:var(--radius-md); color:var(--text-main); outline:none; display:flex; justify-content:space-between; align-items:center;">
                    <span><i class="fa-regular fa-folder-open" style="color:var(--info); margin-right:8px;"></i> ${rotNome}</span>
                    <span style="background:var(--danger); color:#fff; border-radius:12px; padding:2px 10px; font-size:12px; box-shadow:0 2px 4px rgba(217, 48, 37, 0.3);">${reqs.length}</span>
                </summary>
                <div style="padding:16px; border-top:1px solid var(--border-color);">`;
            
            reqs.forEach(u => {
                const checkC = (u.cognome || '').trim().toUpperCase();
                const checkN = (u.nome || '').trim().toUpperCase();
                const presente = checkC && checkN && (window.globalNomiRotazioni || []).some(n => n.includes(checkC) && n.includes(checkN));
                const pallino = presente ? '<i class="fa-solid fa-circle-check" style="color:var(--success); font-size:12px; margin-left:6px;" title="Presente nei tabulati"></i>' : '';

                html += `<div style="background:var(--warning-light); border:1px dashed var(--warning-border); padding:16px; margin-bottom:12px; border-radius:12px;">
                    <div style="font-weight:800; font-size:15px; color:var(--warning); cursor:pointer; display:flex; align-items:center;" onclick="window.apriDettaglioUtenteRot('${u.uid}')">${u.cognome||''} ${u.nome||''} ${u.progressivo||''} ${pallino}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:4px; font-weight:600;"><i class="fa-solid fa-id-badge"></i> Matr: ${u.matricola||''}</div>
                    <div style="display:flex; gap:8px; margin-top:16px; justify-content:flex-end;">
                        <button class="rot-btn-icon" title="Accetta" onclick="window.gestisciRichiestaRot('${u.uid}', true, this)"><i class="fa-solid fa-check"></i></button>
                        <button class="rot-btn-icon rot-btn-icon-danger" title="Rifiuta" onclick="window.gestisciRichiestaRot('${u.uid}', false, this)"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>`;
            });
            html += `</div></details>`;
        }
        cont.innerHTML = html;
    };

    window.gestisciRichiestaRot = async (uid, ok, btnElem) => {
        try {
            if (btnElem) { btnElem.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>"; btnElem.disabled = true; }
            await setDoc(doc(db, "permessi_rotazioni", uid), { 
                abilitato_rotazioni: ok, 
                stato_richiesta: ok ? 'approved' : 'rejected' 
            }, { merge: true });
            window.aggiornaBadgeRichiesteRotazioni();
            window.apriGestioneRichiesteRot();
        } catch(e) {
            alert("Errore di connessione.");
            window.apriGestioneRichiesteRot();
        }
    };

    window.apriGestioneCollaboratoriRot = async () => {
        if(!isAdmin) return;
        window.chiudiModalRotazioni('rot-modal-gestione-accessi'); 
        document.getElementById('rot-modal-gestione-collaboratori').style.display = 'flex';
        const cont = document.getElementById('rot-lista-collaboratori'); 
        cont.innerHTML = `<div style="text-align:center; padding:20px; color:#9c27b0;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px;"></i> Caricamento...</div>`;
        
        const utentiSnap = await getDocs(collection(db, "utenti")); 
        const permSnap = await getDocs(collection(db, "permessi_rotazioni"));
        
        let permBase = {};
        permSnap.forEach(d => permBase[d.id] = d.data());
        
        let html = "";
        utentiSnap.forEach(d => {
            const u = d.data();
            if (u.ruolo === 'collaborator') {
                const p = permBase[d.id] || {};
                const permGestione = p.permessi_gestione || [];
                
                html += `<div class="rot-utente-row" style="border-left: 4px solid #9c27b0;">
                    <div>
                        <strong style="font-size:15px; color:var(--text-main);">${u.cognome||''} ${u.nome||''}</strong><br>
                        <span style="font-size:12px; color:var(--text-muted); font-weight:600;"><i class="fa-solid fa-key"></i> Permessi: ${permGestione.length} aree</span>
                    </div>
                    <button class="rot-btn" style="width:auto; padding:8px 12px; background:#9c27b0; margin:0; box-shadow:none;" onclick='window.apriPermessiCollabRot("${d.id}", "${u.nome}", ${JSON.stringify(permGestione)})'><i class="fa-solid fa-pen-to-square"></i> Modifica</button>
                </div>`;
            }
        });
        cont.innerHTML = html || `<div style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-user-slash" style="font-size:24px;"></i> Nessun collaboratore trovato.</div>`;
    };

    window.apriPermessiCollabRot = (uid, nome, perms) => {
        window.chiudiModalRotazioni('rot-modal-gestione-collaboratori'); 
        document.getElementById('rot-modal-permessi-collaboratore').style.display = 'flex';
        document.getElementById('rot-nome-collab-titolo').innerText = nome || '';
        document.getElementById('rot-uid-collab-edit').value = uid;
        const cont = document.getElementById('rot-lista-checkbox-rotazioni'); let html = "";
        for(let k in ROTAZIONI_MAP) {
            html += `<label style="display: flex; align-items: center; gap: 10px; font-size: 14px; background:var(--surface); border:1px solid var(--border-color); padding:12px; border-radius:10px; margin-bottom:8px;">
                <input type="checkbox" class="rot-collab-perm-check" value="${k}" ${perms.includes(k)?"checked":""} style="width: 18px; height: 18px; margin: 0; accent-color:#9c27b0; cursor: pointer;"> 
                ${ROTAZIONI_MAP[k]}
            </label>`;
        }
        cont.innerHTML = html;
    };

    window.salvaPermessiCollabRot = async () => {
        const uid = document.getElementById('rot-uid-collab-edit').value;
        const btn = document.querySelector('#rot-modal-permessi-collaboratore .rot-btn');
        if(btn) { btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>"; btn.disabled = true; }
        
        const nP = Array.from(document.querySelectorAll('.rot-collab-perm-check:checked')).map(c => c.value);
        try {
            await setDoc(doc(db, "permessi_rotazioni", uid), { permessi_gestione: nP }, { merge: true });
            alert("Permessi aggiornati con successo.");
            window.chiudiModalRotazioni('rot-modal-permessi-collaboratore'); 
            window.apriGestioneCollaboratoriRot();
        } catch(e) { 
            alert("Errore nel salvataggio dei permessi."); 
            if(btn) { btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Permessi"; btn.disabled = false; }
        }
    };

    // INIZIO ESECUZIONE 
    window.initRotazioniState();
}

// Avvio completo del modulo (UI + motore) in un'unica chiamata
export function avviaRotazioni(db, auth) {
    initUIRotazioni();
    avviaMotoreRotazioni(db, auth);
}
