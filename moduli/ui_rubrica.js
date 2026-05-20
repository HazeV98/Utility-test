export function initUIRubrica() {
    const uiHTML = `
    <!-- ========================================================== -->
    <!-- MODALE RUBRICA COLLEGHI -->
    <!-- ========================================================== -->
    <style>
        .contact-item { background: var(--surface); padding: 16px; border-radius: var(--radius-md); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm); border-left: 5px solid var(--primary); border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); transition: transform 0.2s; animation: slideInUp 0.3s ease both; text-align: left;}
        .contact-item:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .contact-info { text-align: left; flex: 1; }
        .contact-name { font-weight: 700; font-size: 16px; color: var(--text-main); margin-bottom: 4px; text-transform: capitalize; }
        .contact-detail { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; font-weight: 500; }
        .contact-phone { font-size: 15px; color: var(--primary); font-weight: 600; display: flex; align-items: center; gap: 6px;}
        .contact-actions { display: flex; gap: 10px; margin-left: 10px;}
        .action-icon { background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 18px; color: var(--text-main); transition: all 0.2s; box-shadow: var(--shadow-sm);}
        .action-icon:active { background: var(--primary-glow); color: var(--primary); border-color: var(--primary); transform: scale(0.95); }
        .wa-icon { color: #25D366; font-size: 20px;}
        .phone-icon { color: var(--primary); }
    </style>

    <div id="modal-rubrica-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-rubrica-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-rubrica-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-address-book"></i> Rubrica Colleghi
            </h3>

            <div style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; align-items: center; width: 100%;">
                
                <!-- VISTA NON AUTENTICATO -->
                <div id="view-no-auth" style="display: none; width: 100%; text-align: center; margin-top: 20px;">
                    <div style="background: var(--surface-hover); padding: 32px 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                        <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                        <h3 style="color: var(--danger); margin-top: 0; font-weight: 800;">Accesso Richiesto</h3>
                        <p style="color: var(--text-muted); font-size: 15px; margin-bottom: 24px;">La rubrica è un'area protetta. Per accedere devi effettuare il login tramite il Cloud nella Home page.</p>
                        <button class="btn-action" style="background-color: var(--primary); margin: 0 auto; width: auto; padding: 12px 24px;" onclick="window.apriModal('authModal', 'login')"><i class="fa-solid fa-right-to-bracket"></i> Accedi ora</button>
                    </div>
                </div>

                <!-- VISTA OPT-IN -->
                <div id="view-opt-in" style="display: none; width: 100%; text-align: center; margin-top: 20px;">
                    <div style="background: var(--surface-hover); padding: 32px 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                        <i class="fa-solid fa-handshake-simple" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
                        <h3 style="color: var(--primary); margin-top: 0; font-weight: 800;">Condividi per accedere</h3>
                        <p style="color: var(--text-muted); font-size: 15px; margin-bottom: 16px;">Questa rubrica contiene i numeri dei colleghi che hanno deciso di condividerli.<br><br><b>Solo chi condivide il proprio numero può visualizzare quello degli altri.</b> Vuoi unirti?</p>
                        
                        <div id="strike-warning" style="background: var(--warning-light); color: var(--warning); padding: 12px; border-radius: 10px; border: 1px dashed var(--warning-border); font-size: 13px; margin-bottom: 24px; text-align: left;">
                            ⚠️ <b>Regola Anti-Furbetti:</b> Se revochi ripetutamente la condivisione del numero il sistema ti bloccherà permanentemente l'accesso alla rubrica.
                        </div>
                        
                        <button class="btn-action" onclick="window.avviaCondivisioneRubrica()"><i class="fa-solid fa-share-nodes"></i> Condividi il tuo numero</button>
                    </div>
                </div>

                <!-- VISTA RUBRICA COMPLETA -->
                <div id="view-directory" style="display: none; flex-direction: column; width: 100%;">
                    <div style="position: relative; width: 100%;">
                        <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 16px; top: 16px; color: var(--text-muted);"></i>
                        <input type="text" id="search-bar-rubrica" class="input-field" style="padding-left: 45px; margin-bottom: 10px;" placeholder="Cerca collega..." oninput="window.filtraRubrica()">
                    </div>
                    
                    <div style="font-size: 13px; color: var(--text-muted); margin-top: -2px; margin-bottom: 12px; font-weight: 700; text-align: left; width: 100%; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-users"></i> <span id="contatore-contatti">0</span> contatti in rubrica
                    </div>
                    
                    <div id="contacts-list" style="width: 100%;"></div>
                    
                    <button style="background: transparent; color: var(--danger); border: 2px solid var(--danger); padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 20px; transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;" onclick="window.revocaCondivisioneRubrica()"><i class="fa-solid fa-user-slash"></i> Smetti di condividere</button>
                </div>

                <!-- VISTA BANNATO -->
                <div id="view-blocked" style="display: none; width: 100%; text-align: center; margin-top: 20px;">
                    <div style="background: var(--danger-light); padding: 32px 24px; border-radius: var(--radius-lg); border: 2px solid var(--danger-border);">
                        <i class="fa-solid fa-ban" style="font-size: 48px; color: var(--danger); margin-bottom: 16px;"></i>
                        <h3 style="color: var(--danger); margin-top: 0; font-weight: 800;">Accesso Bloccato</h3>
                        <p style="color: var(--text-main); font-size: 15px; margin-bottom: 24px;">Hai rimosso il tuo numero dalla rubrica per 3 volte consecutive.<br><br>Per proteggere la community da comportamenti scorretti, il tuo accesso alla funzione rubrica è stato bloccato definitivamente.</p>
                    </div>
                </div>

                <!-- VISTA CARICAMENTO -->
                <div id="view-loading-rubrica" style="display: none; width: 100%; justify-content: center; margin-top: 40px;">
                    <div style="text-align: center; color: var(--text-muted); font-size: 15px; font-weight: 500; padding: 30px 20px; background: var(--surface-hover); border-radius: var(--radius-md); border: 1px dashed var(--border-color); display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i>
                        Verifica autorizzazioni in corso...
                    </div>
                </div>

            </div>
        </div>
    </div>

    <!-- Modale Profilo Specifica per Rubrica (inserimento dati mancanti) -->
    <div id="modal-profilo-rubrica" class="modal-overlay" style="z-index: 7500;">
        <div class="modal-content">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-profilo-rubrica').style.display='none'"></i>
            <h3 style="margin-top: 0; margin-bottom: 8px; color: var(--primary); text-align: center; font-weight: 800;"><i class="fa-solid fa-id-card"></i> Completa il Profilo</h3>
            <p style="font-size: 13px; color: var(--text-muted); text-align: center; margin-bottom: 24px;">Per entrare in rubrica abbiamo bisogno dei tuoi dati completi.</p>
            
            <div class="float-wrapper"><input type="text" id="regNomeRub" class="input-field" placeholder=" "><label>Nome *</label></div>
            <div class="float-wrapper"><input type="text" id="regCognomeRub" class="input-field" placeholder=" "><label>Cognome *</label></div>
            <div class="float-wrapper"><input type="text" id="regProgressivoRub" class="input-field" placeholder=" "><label>Omonimia (es. 02)</label></div>
            <div class="float-wrapper"><input type="text" id="regSoprannomeRub" class="input-field" placeholder=" "><label>Soprannome</label></div>
            
            <select id="regMansioneRub" class="input-field" style="margin-bottom: 16px;">
                <option value="">-- Seleziona Mansione * --</option>
                <option value="Marinaio">Marinaio</option>
                <option value="Preposto al comando">Preposto al comando</option>
                <option value="Comandante">Comandante</option>
                <option value="Timoniere">Timoniere</option>
                <option value="Marinaio polivalente">Marinaio polivalente</option>
                <option value="Direttore di macchina">Direttore di macchina</option>
            </select>

            <div class="float-wrapper"><input type="text" id="regMatricolaRub" class="input-field" placeholder=" "><label>Matricola *</label></div>
            <div class="float-wrapper"><input type="tel" id="regTelefonoRub" class="input-field" placeholder=" "><label>Numero di Telefono *</label></div>
            
            <button id="btnSalvaRubrica" class="btn-action" onclick="window.salvaECondividiRubrica()"><i class="fa-solid fa-check"></i> Salva e Accedi</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
} 
