export function initUIRotazioneFerie() {
    if (document.getElementById('modal-rotazione-ferie-main')) return;

    // Iniezione CSS specifico
    const style = document.createElement('style');
    style.innerHTML = `
        #modal-rotazione-ferie-main {
            background-color: var(--bg-color);
            transition: background-color var(--transition-speed), color var(--transition-speed);
            overflow-y: auto;
            align-items: flex-start;
            padding: 0;
        }

        .ferie-wrapper {
            padding: calc(20px + env(safe-area-inset-top)) 20px 40px 20px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .ferie-header {
            width: 100%;
            max-width: 440px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .ferie-header h2 { margin: 0; color: var(--primary); font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 8px; letter-spacing: -0.5px; }

        /* VISTE E CONTENITORI */
        .ferie-view-container { width: 100%; max-width: 440px; display: none; flex-direction: column; gap: 16px; text-align: center; }
        
        /* PULSANTI TOP BAR */
        .ferie-top-actions { width: 100%; max-width: 440px; display: flex; gap: 12px; margin-bottom: 20px; }
        .ferie-btn-top { flex: 1; padding: 14px 10px; font-size: 13px; font-weight: 700; border-radius: 12px; border: none; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: var(--shadow-sm); transition: all 0.2s; }
        .ferie-btn-top:active { transform: scale(0.97); }

        /* CARDS */
        .ferie-card { background: var(--surface); padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); text-align: left; margin-bottom: 16px; border: 1px solid var(--border-color); }
        .ferie-card-suggested { background: var(--warning-light); border: 2px solid var(--warning); padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); text-align: left; margin-bottom: 16px; position: relative; }
        .ferie-card-suggested::before { content: "✨ MATCH IDEALE"; position: absolute; top: -12px; right: 20px; background: var(--warning); color: #fff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.5px; box-shadow: 0 2px 5px rgba(242, 166, 0, 0.3); }

        /* PULSANTI GENERALI */
        .ferie-btn-action { background-color: var(--success); color: white; border: none; padding: 16px; font-size: 15px; font-weight: 700; border-radius: var(--radius-md); cursor: pointer; width: 100%; transition: all 0.2s; margin-top: 10px; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(15,157,88,0.2); }
        .ferie-btn-action:hover { transform: translateY(-2px); filter: brightness(1.05); }
        .ferie-btn-action:active { transform: translateY(1px); box-shadow: none; }
        
        /* FORM ELEMENTS */
        .ferie-input-field { width: 100%; padding: 14px; margin-bottom: 16px; border: 2px solid var(--border-color); border-radius: var(--radius-md); box-sizing: border-box; font-size: 15px; background-color: var(--surface); color: var(--text-main); font-family: inherit; transition: all 0.2s;}
        .ferie-input-field:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 4px var(--primary-glow); }
        
        .ferie-warning-box { background: var(--warning-light); color: var(--warning); padding: 16px; border-radius: var(--radius-md); font-size: 14px; text-align: left; margin-bottom: 20px; border: 1px dashed var(--warning-border); display: flex; gap: 10px; align-items: flex-start; }
        .ferie-section-title { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 24px 0 10px 0; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; letter-spacing: 0.5px; }

        /* TABS */
        .ferie-tabs { display: flex; background: var(--surface-hover); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 20px; width: 100%; max-width: 440px; border: 1px solid var(--border-color); padding: 4px; }
        .ferie-tab-btn { flex: 1; padding: 12px; text-align: center; font-weight: 600; color: var(--text-muted); cursor: pointer; background: transparent; border: none; border-radius: 10px; transition: all 0.2s; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .ferie-tab-btn.active { background: var(--surface); color: var(--primary); box-shadow: var(--shadow-sm); }

        /* CHECKBOXES E BADGES */
        .ferie-checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .ferie-checkbox-label { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; background: var(--surface-hover); padding: 12px; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer; color: var(--text-main); }
        .ferie-checkbox-label input[type="checkbox"] { width: 18px; height: 18px; margin: 0; accent-color: var(--primary); cursor: pointer; }
        
        .badge-estivo { background: #fff3e0; color: #e65100; padding: 6px 12px; border-radius: 14px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 6px; border: 1px solid #ffe0b2;}
        .badge-invernale { background: #e3f2fd; color: #0d47a1; padding: 6px 12px; border-radius: 14px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 6px; border: 1px solid #bbdefb;}
        .badge-cerco { background: var(--surface-hover); color: var(--text-muted); padding: 6px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1px dashed var(--border-color);}
        .badge-scambiato { background: var(--danger-light); color: var(--danger); padding: 2px 8px; border-radius: 6px; font-size: 10px; margin-left: 8px; border: 1px solid var(--danger-border); }
        
        .ferie-action-icon { background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 20px; color: var(--text-main); cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm); flex-shrink: 0;}
        .ferie-action-icon:active { transform: scale(0.95); background: var(--border-color); }
        .ferie-action-icon.btn-wa { background: #25D366; border-color: #25D366; color: white; }
        .ferie-action-icon.btn-wa:active { background: #128C7E; border-color: #128C7E; }

        .ferie-contact-actions { display: flex; flex-direction: column; justify-content: center; gap: 10px; padding-left: 15px; border-left: 1px dashed var(--border-color); }
        .ferie-result-banner { text-align: center; margin-bottom: 20px; font-size: 15px; font-weight: 600; background: var(--surface); color: var(--text-main); padding: 14px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); }
    `;
    document.head.appendChild(style);

    // Iniezione HTML Principale
    const container = document.createElement('div');
    container.id = 'modal-rotazione-ferie-main';
    container.className = 'modal-overlay';
    container.innerHTML = `
        <div class="ferie-wrapper">
            <div class="ferie-header">
                <button style="background:none; border:none; font-size: 20px; color: var(--text-main); cursor:pointer; padding:10px; transition: 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-main)'" onclick="window.chiudiModal('modal-rotazione-ferie-main')"><i class="fa-solid fa-arrow-left"></i></button>
                <h2><i class="fa-solid fa-umbrella-beach"></i> Ferie</h2>
                <div style="width: 44px;"></div>
            </div>

            <div id="ferie-top-actions-bar" class="ferie-top-actions" style="display: none;">
                <button class="ferie-btn-top" style="background: var(--primary);" onclick="window.apriModaleCondivisioneFerie()"><i class="fa-solid fa-pen-to-square"></i> I Tuoi Dati</button>
                <button class="ferie-btn-top" style="background: var(--danger);" onclick="window.revocaCondivisioneFerie()"><i class="fa-solid fa-user-slash"></i> Annulla Condivisione</button>
            </div>

            <div id="ferie-view-no-auth" class="ferie-view-container">
                <div class="ferie-card" style="text-align: center;">
                    <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--text-main); margin-top: 0; font-weight: 800;">Accesso Richiesto</h3>
                    <p style="color: var(--text-muted); font-size: 15px; margin-bottom: 24px;">Devi aver effettuato l'accesso per entrare in questa sezione.</p>
                    <button class="ferie-btn-action" style="background-color: var(--primary); margin: 0 auto;" onclick="window.chiudiModal('modal-rotazione-ferie-main')"><i class="fa-solid fa-house"></i> Torna alla Home</button>
                </div>
            </div>

            <div id="ferie-view-opt-in" class="ferie-view-container">
                <div class="ferie-card" style="text-align: center;">
                    <i class="fa-solid fa-handshake" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--primary); margin-top: 0; font-weight: 800;">Condividi per accedere</h3>
                    <p style="color: var(--text-main); font-size: 15px; margin-bottom: 24px;">Solo chi condivide le proprie ferie può cercare e proporre scambi agli altri colleghi.</p>
                    
                    <div id="ferie-strike-warning" class="ferie-warning-box">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size: 24px;"></i>
                        <div>
                            <strong style="display:block; margin-bottom:4px;">Regola Anti-Furbetti</strong>
                            Se revochi ripetutamente la condivisione per "sbirciare" senza farti vedere, l'accesso a questa sezione verrà bloccato permanentemente.
                        </div>
                    </div>
                    
                    <button class="ferie-btn-action" onclick="window.apriModaleCondivisioneFerie()"><i class="fa-solid fa-share-nodes"></i> Inserisci le tue ferie</button>
                </div>
            </div>

            <div id="ferie-view-blocked" class="ferie-view-container">
                <div class="ferie-card" style="text-align: center; background: var(--danger-light); border-color: var(--danger-border);">
                    <i class="fa-solid fa-ban" style="font-size: 48px; color: var(--danger); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--danger); margin-top: 0; font-weight: 800;">Accesso Bloccato</h3>
                    <p style="color: var(--text-main); font-size: 15px; margin-bottom: 24px;">Hai superato il limite massimo di 3 revoche. L'accesso alla sezione ferie è stato disabilitato per il tuo account.</p>
                    <button class="ferie-btn-action" style="background-color: var(--text-muted); margin: 0 auto;" onclick="window.chiudiModal('modal-rotazione-ferie-main')"><i class="fa-solid fa-house"></i> Chiudi</button>
                </div>
            </div>

            <div id="ferie-view-main" class="ferie-view-container">
                <div class="ferie-tabs">
                    <button id="ferie-tab-cerca" class="ferie-tab-btn active" onclick="window.switchTabFerie('cerca')"><i class="fa-solid fa-magnifying-glass"></i> Ricerca</button>
                    <button id="ferie-tab-bacheca" class="ferie-tab-btn" onclick="window.switchTabFerie('bacheca')"><i class="fa-solid fa-thumbtack"></i> Bacheca</button>
                </div>

                <div id="ferie-panel-cerca">
                    <div class="ferie-card" style="padding: 20px;">
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">ANNO RICERCA</label>
                        <input type="number" id="ferie-searchAnno" class="ferie-input-field" onchange="window.eseguiRicercaFerie()">
                        
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">FILTRO MANSIONE</label>
                        <select id="ferie-searchMansione" class="ferie-input-field" onchange="window.eseguiRicercaFerie()">
                            <option value="Tutte">Tutte le mansioni</option>
                            <option value="Marinaio">Marinaio</option>
                            <option value="Preposto al comando">Preposto al comando</option>
                            <option value="Comandante">Comandante</option>
                            <option value="Timoniere">Timoniere</option>
                            <option value="Marinaio polivalente">Marinaio polivalente</option>
                            <option value="Direttore di macchina">Direttore di macchina</option>
                        </select>
                        
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">FILTRO PERIODO</label>
                        <select id="ferie-searchPeriodo" class="ferie-input-field" style="margin-bottom: 0;" onchange="window.eseguiRicercaFerie()">
                            <option value="">Tutti i periodi</option>
                            <optgroup label="Ferie Estive" id="ferie-optgroup-estive-ricerca"></optgroup>
                            <optgroup label="Ferie Invernali" id="ferie-optgroup-invernali-ricerca"></optgroup>
                        </select>
                    </div>
                    
                    <div class="ferie-result-banner">
                        Risultati Ferie Anno: <span id="ferie-span-anno-ricerca" style="font-size: 18px; color: var(--primary); font-weight: 800; margin-left: 5px;"></span>
                    </div>

                    <div id="ferie-suggeriti-ricerca-container" style="display: none; margin-bottom: 20px;"><div id="ferie-suggeriti-ricerca"></div></div>
                    <div id="ferie-risultati-ricerca"></div>
                </div>

                <div id="ferie-panel-bacheca" style="display: none;">
                    <button class="ferie-btn-action" style="margin-top: 0; margin-bottom: 20px;" onclick="window.apriModaleAnnuncioFerie()"><i class="fa-solid fa-plus"></i> Inserisci Annuncio</button>
                    
                    <div class="ferie-card" style="padding: 20px; margin-bottom: 20px;">
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">FILTRA ANNUNCI PER MANSIONE</label>
                        <select id="ferie-filtroMansioneBacheca" class="ferie-input-field" style="margin-bottom: 0;" onchange="window.caricaBachecaFerie()">
                            <option value="Tutte">Tutte le mansioni</option>
                            <option value="Marinaio">Marinaio</option>
                            <option value="Preposto al comando">Preposto al comando</option>
                            <option value="Comandante">Comandante</option>
                            <option value="Timoniere">Timoniere</option>
                            <option value="Marinaio polivalente">Marinaio polivalente</option>
                            <option value="Direttore di macchina">Direttore di macchina</option>
                        </select>
                    </div>

                    <div id="ferie-suggeriti-bacheca-container" style="display: none; margin-bottom: 20px;"><div id="ferie-suggeriti-bacheca"></div></div>
                    <div id="ferie-lista-annunci"></div>
                </div>
            </div>
        </div>

        <!-- MODALI SECONDARIE -->
        <div id="modal-condivisione-ferie" class="modal-overlay" style="z-index: 7500;">
            <div class="modal-content" style="max-width: 480px;">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModal('modal-condivisione-ferie')"></i>
                <h3 style="text-align: center; margin-top: 0; margin-bottom: 20px; color: var(--text-main); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-clipboard-user" style="color: var(--primary);"></i> Le mie Ferie</h3>

                <div class="ferie-section-title">DATI PERSONALI</div>
                <input type="text" id="ferie-regNome" class="ferie-input-field" placeholder="Nome *">
                <input type="text" id="ferie-regCognome" class="ferie-input-field" placeholder="Cognome *">
                <input type="text" id="ferie-regProgressivo" class="ferie-input-field" placeholder="Numero omonimia es. 02 (Opzionale)">
                <input type="text" id="ferie-regMatricola" class="ferie-input-field" placeholder="Matricola *">
                <input type="tel" id="ferie-regTelefono" class="ferie-input-field" placeholder="Telefono *">
                
                <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">MANSIONE *</label>
                <select id="ferie-regMansione" class="ferie-input-field">
                    <option value="Marinaio">Marinaio</option>
                    <option value="Preposto al comando">Preposto al comando</option>
                    <option value="Comandante">Comandante</option>
                    <option value="Timoniere">Timoniere</option>
                    <option value="Marinaio polivalente">Marinaio polivalente</option>
                    <option value="Direttore di macchina">Direttore di macchina</option>
                </select>

                <div class="ferie-section-title">FERIE ASSEGNATE ALL'ASSUNZIONE</div>
                <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">ANNO DI RIFERIMENTO *</label>
                <input type="number" id="ferie-regAnno" class="ferie-input-field" placeholder="Es. 2024">
                
                <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                        <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">PERIODO ESTIVO *</label>
                        <select id="ferie-regEstive" class="ferie-input-field"></select>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">PERIODO INVERNALE *</label>
                        <select id="ferie-regInvernali" class="ferie-input-field"></select>
                    </div>
                </div>

                <div class="ferie-section-title">FERIE ATTUALI CAMBIATE (OPZIONALE)</div>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 0; margin-bottom: 12px; line-height: 1.4;">Compila solo se nel tempo hai cambiato gruppo ferie rispetto a quello assegnato all'assunzione.</p>
                <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                        <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">NUOVO ESTIVO</label>
                        <select id="ferie-currEstive" class="ferie-input-field"></select>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">NUOVO INVERNALE</label>
                        <select id="ferie-currInvernali" class="ferie-input-field"></select>
                    </div>
                </div>

                <button id="ferie-btnSalvaFerie" class="ferie-btn-action" onclick="window.salvaFerie()"><i class="fa-solid fa-floppy-disk"></i> Salva Dati Profilo</button>
            </div>
        </div>

        <div id="modal-annuncio-ferie" class="modal-overlay" style="z-index: 7500;">
            <div class="modal-content">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModal('modal-annuncio-ferie')"></i>
                <h3 id="ferie-titoloModalAnnuncio" style="margin-top: 0; margin-bottom: 24px; color: var(--text-main); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;"><i class="fa-solid fa-bullhorn" style="color: var(--primary);"></i> Nuovo Annuncio</h3>
                
                <input type="hidden" id="ferie-editAdId">

                <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">TIPO FERIE DA SCAMBIARE *</label>
                <select id="ferie-adTipoFerie" class="ferie-input-field" onchange="window.aggiornaFormAnnuncioFerie()">
                    <option value="estive">☀️ Estive</option>
                    <option value="invernali">❄️ Invernali</option>
                </select>
                
                <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 8px;">ANNO DI RIFERIMENTO DELLO SCAMBIO *</label>
                <input type="number" id="ferie-adAnnoRiferimento" class="ferie-input-field" placeholder="Es. 2026">

                <div style="background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px dashed var(--border-color); margin-bottom: 16px;">
                    <label style="font-size: 12px; font-weight: 800; color: var(--primary); display: block; margin-bottom: 10px;"><i class="fa-solid fa-arrow-right-from-bracket"></i> CEDO IL PERIODO:</label>
                    <select id="ferie-adPeriodoOfferto" class="ferie-input-field" style="margin-bottom: 0; border-color: var(--primary);"></select>
                </div>
                
                <div style="background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px dashed var(--border-color); margin-bottom: 16px;">
                    <label style="font-size: 12px; font-weight: 800; color: var(--success); display: block; margin-bottom: 10px;"><i class="fa-solid fa-arrow-right-to-bracket"></i> IN CAMBIO CERCO:</label>
                    <select id="ferie-adCercoTipo" class="ferie-input-field" onchange="window.aggiornaFormAnnuncioFerie()">
                        <option value="mesi">Mesi Generici (Es. Agosto o Luglio)</option>
                        <option value="periodo">Un Periodo Specifico Esatto</option>
                    </select>
                    
                    <div id="ferie-cerco-mesi-container"><div id="ferie-checkboxes-mesi" class="ferie-checkbox-grid" style="margin-bottom:0;"></div></div>
                    <div id="ferie-cerco-periodo-container" style="display:none;"><select id="ferie-adPeriodoCercato" class="ferie-input-field" style="margin-bottom: 0; border-color: var(--success);"></select></div>
                </div>
                
                <button id="ferie-btnSalvaAnnuncio" class="ferie-btn-action" onclick="window.pubblicaAnnuncioFerie()"><i class="fa-solid fa-paper-plane"></i> Pubblica Annuncio</button>
            </div>
        </div>
    `;
    document.body.appendChild(container);
}
