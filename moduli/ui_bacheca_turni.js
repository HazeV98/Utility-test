export function initUIBachecaTurni() {
    const uiHTML = `
    <!-- MODALE BACHECA TURNI -->
    <div id="modal-bachecaturni-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-bachecaturni-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-bachecaturni-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-handshake-angle"></i> Bacheca Turni
            </h3>

            <div style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; width: 100%;">
                
                <div id="bt-view-no-auth" style="display:none; flex-direction:column; align-items:center; width: 100%; margin-top: 20px;">
                    <div style="background: var(--surface-hover); padding: 32px 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); text-align: center; width: 100%;">
                        <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                        <h3 style="color: var(--danger); margin-top: 0; font-weight: 800;">Accesso Richiesto</h3>
                        <p style="color: var(--text-muted); font-size: 15px; margin-bottom: 24px;">Devi effettuare il login per usare la bacheca scambi.</p>
                        <button class="btn-action" style="background-color: var(--primary); margin: 0 auto; width: auto; padding: 12px 24px;" onclick="window.apriModal('authModal', 'login'); window.chiudiModal('modal-bachecaturni-main');"><i class="fa-solid fa-right-to-bracket"></i> Accedi ora</button>
                    </div>
                </div>

                <div id="bt-view-main" style="display:none; flex-direction:column; gap:16px; width:100%;" class="animate-pop">
                    <button class="btn-action" style="margin-top: 0; margin-bottom: 10px;" onclick="window.apriModaleAnnuncioBT()"><i class="fa-solid fa-plus"></i> Nuovo Scambio</button>
                    
                    <div style="background: var(--surface); padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); border: 1px solid var(--border-color); margin-bottom: 8px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="flex: 1;">
                                <label class="editor-label">Filtra Mansione:</label>
                                <select id="bt-filtroMansione" class="input-field" style="margin-bottom: 0; text-transform: none;" onchange="window.caricaBachecaTurni()">
                                    <option value="Tutte">Tutte le mansioni</option>
                                    <option value="Marinaio">Marinaio</option>
                                    <option value="Preposto al comando">Preposto al comando</option>
                                    <option value="Comandante">Comandante</option>
                                    <option value="Timoniere">Timoniere</option>
                                    <option value="Marinaio polivalente">Marinaio polivalente</option>
                                    <option value="Direttore di macchina">Direttore di macchina</option>
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label class="editor-label">Filtra Data:</label>
                                <input type="date" id="bt-filtroData" class="input-field" style="margin-bottom: 0; text-transform: none;" onchange="window.caricaBachecaTurni()">
                            </div>
                        </div>
                    </div>
                    
                    <div id="bt-suggeriti-bacheca-container" style="display: none; border-bottom: 2px dashed var(--border-color); padding-bottom: 16px; margin-bottom: 16px;">
                        <div style="font-size: 15px; font-weight: 600; color: var(--warning); text-align: left; margin-bottom: 16px; margin-top: 10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-wand-magic-sparkles"></i> Suggeriti per te (Offrono ciò che cerchi)</div>
                        <div id="bt-suggeriti-bacheca" style="display:flex; flex-direction: column; gap:12px;"></div>
                    </div>

                    <div id="bt-lista-annunci" style="display:flex; flex-direction: column; gap:12px;"></div>
                </div>

            </div>
        </div>
    </div>

    <div id="bt-profileModal" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'bt-profileModal')" style="z-index: 7500;">
        <div class="modal-content">
            <i id="btnCloseProfileModalBT" class="fa-solid fa-xmark close-modal" style="display:none;" onclick="window.chiudiModaleProfiloBT()"></i>
            <h3 style="margin-top: 0; color: var(--text-main); text-align: center; display:flex; flex-direction:column; align-items:center; gap:10px;">
                <i class="fa-solid fa-user-pen" style="color:var(--primary); font-size: 32px;"></i> Dati Profilo
            </h3>
            <p style="font-size: 13px; color: var(--text-muted); text-align: center; margin-bottom: 20px;">Questi dati verranno mostrati nei tuoi annunci.</p>
            
            <input type="text" id="bt-regNome" class="input-field" placeholder="Nome" style="text-transform: capitalize;">
            <input type="text" id="bt-regCognome" class="input-field" placeholder="Cognome" style="text-transform: capitalize;">
            <input type="text" id="bt-regProgressivo" class="input-field" placeholder="Numero omonimia es. 02, 03 ecc (facoltativo)" style="text-transform: none;">
            <input type="text" id="bt-regMatricola" class="input-field" placeholder="Matricola" style="text-transform: uppercase;">
            <input type="tel" id="bt-regTelefono" class="input-field" placeholder="Telefono (per WhatsApp)" style="text-transform: none;">
            <select id="bt-regMansione" class="input-field" style="text-transform: none;">
                <option value="">-- Seleziona Mansione --</option>
                <option value="Marinaio">Marinaio</option>
                <option value="Preposto al comando">Preposto al comando</option>
                <option value="Comandante">Comandante</option>
                <option value="Timoniere">Timoniere</option>
                <option value="Marinaio polivalente">Marinaio polivalente</option>
                <option value="Direttore di macchina">Direttore di macchina</option>
            </select>
            <button id="btnSalvaProfiloBT" class="btn-action btn-success" style="margin-top: 10px;" onclick="window.salvaProfiloBT()"><i class="fa-solid fa-check"></i> Salva Dati</button>
        </div>
    </div>

    <div id="bt-adModal" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'bt-adModal')" style="z-index: 7500;">
        <div class="modal-content">
            <i class="fa-solid fa-xmark close-modal" onclick="document.getElementById('bt-adModal').style.display='none'"></i>
            <h3 style="margin-top: 0; margin-bottom: 24px; color: var(--text-main); display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-bullhorn" style="color:var(--primary);"></i> Crea Annuncio
            </h3>
            
            <div class="bt-tabs">
                <button id="bt-tab-ad-turno" class="bt-tab-btn active" onclick="window.switchAdTabBT('turno')">Cambio Turno</button>
                <button id="bt-tab-ad-riposo" class="bt-tab-btn" onclick="window.switchAdTabBT('riposo')">Cambio Riposo</button>
            </div>

            <div id="bt-form-ad-turno">
                <label class="editor-label">Data del cambio:</label>
                <input type="date" id="bt-adDataTurno" class="input-field" style="text-transform: none;" onchange="window.verificaTurnoBT()">
                
                <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                        <label class="editor-label">Cedo:</label>
                        <select id="bt-adCedoTurno" class="input-field" style="text-transform: none;">
                            <option value="primo">Primo</option>
                            <option value="mezzo">Mezzo</option>
                            <option value="terzo">Terzo</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label class="editor-label">Cerco:</label>
                        <select id="bt-adCercoTurno" class="input-field" style="text-transform: none;">
                            <option value="primo">Primo</option>
                            <option value="mezzo">Mezzo</option>
                            <option value="terzo">Terzo</option>
                        </select>
                    </div>
                </div>

                <hr style="border: 0; border-top: 1px dashed var(--border-color); margin: 20px 0;">
                
                <label class="editor-label" style="color: var(--primary);">Codice Turno Ceduto:</label>
                <input type="text" id="bt-adCodiceTurno" class="input-field" placeholder="es. 1C01, 1B01 ecc..." oninput="this.value = this.value.toUpperCase(); window.verificaTurnoBT()">
                
                <label class="editor-label" style="margin-top: 16px;">Info Turno (Facoltativo):</label>
                
                <div style="display: flex; gap: 12px;">
                    <input type="time" id="bt-adOraInizio" class="input-field" placeholder="Ora Inizio" style="flex:1; text-transform: none;">
                    <input type="text" id="bt-adLuogoInizio" class="input-field" placeholder="Luogo Inizio" style="flex:2; text-transform: none;">
                </div>
                <div style="display: flex; gap: 12px;">
                    <input type="time" id="bt-adOraFine" class="input-field" placeholder="Ora Fine" style="flex:1; text-transform: none;">
                    <input type="text" id="bt-adLuogoFine" class="input-field" placeholder="Luogo Fine" style="flex:2; text-transform: none;">
                </div>
                
                <input type="hidden" id="bt-adChiaveEsatta">
                <input type="hidden" id="bt-adDataAttivaDb">
            </div>

            <div id="bt-form-ad-riposo" style="display: none;">
                <label class="editor-label">Cerco Riposo il giorno:</label>
                <input type="date" id="bt-adDataRiposo" class="input-field" style="text-transform: none;">
                
                <label class="editor-label" style="margin-top: 16px;">Giorni in cui posso restituirlo (Facoltativo):</label>
                <input type="date" id="bt-adDataRestituzione1" class="input-field" style="margin-bottom: 8px; text-transform: none;">
                <input type="date" id="bt-adDataRestituzione2" class="input-field" style="text-transform: none;">
                <p style="font-size: 11px; color: var(--text-muted); margin-top: 0; text-transform: none;">Puoi lasciare vuoto se vuoi concordarlo in chat.</p>
            </div>

            <hr style="border: 0; border-top: 1px dashed var(--border-color); margin: 20px 0;">
            <label class="editor-label">Note (Facoltative):</label>
            <textarea id="bt-adNote" class="input-field" placeholder="Es. Cerco solo mattina, flessibile sull'orario..." style="text-transform: none; resize: vertical; min-height: 80px;"></textarea>

            <button id="bt-btnPubblica" class="btn-action btn-success" style="margin-top: 10px;" onclick="window.pubblicaAnnuncioBT()"><i class="fa-solid fa-paper-plane"></i> Pubblica Annuncio</button>
            <button class="btn-outline" style="width:100%; margin-top: 12px; justify-content:center;" onclick="window.apriModaleProfiloBT()"><i class="fa-regular fa-user"></i> Controlla i miei Dati</button>
        </div>
    </div>

    <div id="imageModal" style="display: none; position: fixed; z-index: 20000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); overflow: hidden; animation: fadeIn 0.3s ease;" onclick="window.chiudiImageModalSeSfondoBT(event)">
        <i class="fa-solid fa-xmark" style="position: absolute; top: calc(20px + env(safe-area-inset-top)); right: 24px; font-size: 32px; color: white; cursor: pointer; text-shadow: 0 2px 10px rgba(0,0,0,0.5); z-index: 20001; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" onclick="window.chiudiImageModalBT()"></i>
        <div id="imageFlexContainer" style="display:flex; flex-direction: column; justify-content:center; align-items:center; height:100%; padding:20px; padding-bottom: 100px; position: relative;">
            <img id="turnoImage" src="" style="max-width: 100%; max-height: 75vh; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); object-fit: contain; background: white;">
            
            <div id="imageBanner" style="position: relative; z-index: 20001; margin-top: 24px; background: rgba(20,20,20,0.85); backdrop-filter: blur(10px); color: #fff; padding: 14px 24px; border-radius: 12px; font-size: 14px; text-align: center; max-width: 90%; box-shadow: 0 8px 20px rgba(0,0,0,0.4); font-weight: 500; border: 1px solid rgba(255,255,255,0.1); display:flex; align-items:center; gap:10px;">
                ⚠️ Controllare sempre la presenza di eventuali varianti.
            </div>
        </div>
        <button onclick="window.scaricaImmagineTurnoBT()" style="position: absolute; bottom: calc(40px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); background: var(--primary); color: white; border: none; padding: 16px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 25px var(--primary-glow); cursor: pointer; z-index: 20001; transition: all 0.2s; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-download" style="font-size: 18px;"></i> Scarica Turno
        </button>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', uiHTML);
} 
