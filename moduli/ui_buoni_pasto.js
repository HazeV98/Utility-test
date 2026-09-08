const buoniPastoHTML = `
    <!-- MODALE BUONI PASTO -->
    <div id="modal-buoni-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-buoni-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-buoni-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-utensils"></i> Buoni Pasto
            </h3>

            <div style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; width: 100%;">
                
                <div class="bp-counter-container animate-pop">
                    <button class="bp-btn-counter" onclick="window.modificaBuoniBP(-1)"><i class="fa-solid fa-minus"></i></button>
                    <div class="bp-count-display" id="bp-buoni-count">0</div>
                    <button class="bp-btn-counter" onclick="window.modificaBuoniBP(1)"><i class="fa-solid fa-plus"></i></button>
                </div>

                <div class="bp-quick-actions animate-pop">
                    <button class="bp-btn-quick" id="bp-btn-quick-1" onclick="window.modificaBuoniBP(-2)">-2</button>
                    <button class="bp-btn-quick" id="bp-btn-quick-2" onclick="window.modificaBuoniBP(-5)">-5</button>
                    <button class="bp-btn-quick" id="bp-btn-quick-3" onclick="window.modificaBuoniBP(-10)">-10</button>
                    <button class="settings-btn" style="position: absolute; right: 10px; background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: transform 0.2s, color 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.apriImpostazioniBP()"><i class="fa-solid fa-gear"></i></button>
                </div>

                <div class="bp-integration-box animate-pop">
                    <div style="text-align: left; flex-grow: 1;">
                        <div style="font-weight: 700; color: var(--text-main); font-size: 16px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-bolt" style="color:var(--warning);"></i> Calcolo Automatico</div>
                        <div style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">Sincronizza con il Calendario</div>
                    </div>
                    <label class="bp-switch">
                        <input type="checkbox" id="bp-toggleInt" onchange="window.gestisciToggleIntegrazioneBP()">
                        <span class="bp-slider"></span>
                    </label>
                </div>

                <div style="padding: 16px; background-color: var(--surface-hover); border-left: 4px solid var(--primary); border-radius: var(--radius-md); color: var(--text-main); font-size: 14px; line-height: 1.5; width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); margin-bottom: 15px;" class="animate-pop">
                    <i class="fa-solid fa-circle-info" style="color:var(--primary); margin-bottom: 8px; font-size:16px;"></i><br>
                    <strong>Nota Bene:</strong> I buoni pasto non maturano in presenza di Riposi (<strong>RI, AL</strong>), Ferie (<strong>FER, FEP, FES</strong>), Malattia (<strong>KMAL</strong>) o permessi vari (<strong>PRT, KNOP, AVIS, KINF</strong>).
                </div>

                <button class="btn-action animate-pop" style="margin-top: 0; margin-bottom: 15px;" onclick="window.apriCalcolatoreBP()"><i class="fa-solid fa-calculator"></i> Calcolatore Buoni</button>

                <div style="margin-top: 4px; padding: 16px; background-color: var(--danger-light); border: 1px dashed var(--danger-border); border-radius: var(--radius-md); color: var(--danger); font-size: 13px; text-align: center; line-height: 1.5; width: 100%; box-sizing: border-box; font-weight: 500;" class="animate-pop">
                    <i class="fa-solid fa-triangle-exclamation"></i> La responsabilità dell'inserimento e della verifica dei dati è unicamente dell'utente.
                </div>

            </div>
        </div>
    </div>

    <div id="bp-modal-settings" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'bp-modal-settings')" style="z-index: 7500;">
        <div class="modal-content">
            <h3 style="margin-top:0; margin-bottom:20px; color:var(--text-main); display:flex; justify-content:center; align-items:center; gap:10px; border-bottom:1px solid var(--border-color); padding-bottom:15px;"><i class="fa-solid fa-gear" style="color:var(--text-muted);"></i> Impostazioni</h3>
            <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.6; text-align:center;">Personalizza i valori da sottrarre con i 3 pulsanti rapidi rossi.</p>
            <div style="display: flex; flex-direction: row; gap: 12px; margin-bottom: 24px;">
                <div style="flex: 1; text-align: center;">
                    <label style="display: block; margin-bottom: 8px; font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Tasto 1</label>
                    <input type="number" id="bp-quick-val-1" class="input-field" style="text-align: center; font-weight: 700; color: var(--danger); font-size: 20px; margin-bottom:0;">
                </div>
                <div style="flex: 1; text-align: center;">
                    <label style="display: block; margin-bottom: 8px; font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Tasto 2</label>
                    <input type="number" id="bp-quick-val-2" class="input-field" style="text-align: center; font-weight: 700; color: var(--danger); font-size: 20px; margin-bottom:0;">
                </div>
                <div style="flex: 1; text-align: center;">
                    <label style="display: block; margin-bottom: 8px; font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Tasto 3</label>
                    <input type="number" id="bp-quick-val-3" class="input-field" style="text-align: center; font-weight: 700; color: var(--danger); font-size: 20px; margin-bottom:0;">
                </div>
            </div>
            <button class="btn-action btn-success" onclick="window.salvaImpostazioniBP()"><i class="fa-solid fa-check"></i> Salva Impostazioni</button>
            <button class="btn-outline" style="width:100%; justify-content:center; margin-top: 10px;" onclick="window.chiudiImpostazioniBP()">Chiudi</button>
        </div>
    </div>

    <div id="bp-wizard-step1" class="modal-overlay" style="z-index: 7500;">
        <div class="modal-content" style="text-align:center;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 48px; color: var(--warning); margin-bottom: 16px;"></i>
            <h3 style="color: var(--text-main); margin-top:0;">Attenzione</h3>
            <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.6;">
                Attivando l'integrazione, l'app aggiungerà <b>automaticamente</b> i buoni pasto in base ai turni presenti nel tuo calendario.<br><br>
                Affinché il calcolo sia esatto, assicurati di aggiornare sempre il calendario inserendo <b>Ferie, Malattie, Sospesi Riposo, ecc.</b><br><br>Sei pronto per iniziare?
            </p>
            <button class="btn-action btn-success" onclick="window.vaiAWizard2BP()">Sì, continua</button>
            <button class="btn-outline" style="width:100%; justify-content:center; margin-top: 10px;" onclick="window.chiudiWizardBP()">Annulla</button>
        </div>
    </div>

    <div id="bp-wizard-step2" class="modal-overlay" style="z-index: 7500;">
        <div class="modal-content" style="text-align:center;">
            <h3 style="color: var(--text-main); margin-top:0;"><i class="fa-solid fa-wallet" style="color:var(--success);"></i> Saldo Attuale</h3>
            <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.6;">
                Conosci già quanti buoni pasto hai a disposizione attualmente (compreso il turno di oggi)?
            </p>
            <div id="bp-scelta-saldo-btn">
                <button class="btn-action btn-success" onclick="window.mostraInputSaldoBP()">Sì, inserisco il numero</button>
                <button class="btn-outline" style="width:100%; justify-content:center; margin-top: 10px;" onclick="window.passaACalcolatoreBP()"><i class="fa-solid fa-calculator"></i> No, calcoliamolo</button>
            </div>
            
            <div id="bp-input-saldo-area" style="display: none;">
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; text-align: left;">
                    <label style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Inserisci i buoni a tua disposizione:</label>
                    <input type="number" id="bp-wizard-buoni-manuali" class="input-field" placeholder="Es. 12" style="font-size: 24px; text-align: center; font-weight: 700; color: var(--primary);">
                </div>
                <button class="btn-action" style="margin-top:0;" onclick="window.salvaSaldoEAttivaBP()"><i class="fa-solid fa-bolt"></i> Salva e Attiva Integrazione</button>
            </div>
            
            <button class="btn-outline" style="width:100%; justify-content:center; margin-top: 15px; border-color:var(--text-muted); color:var(--text-muted);" onclick="window.chiudiWizardBP()">Annulla</button>
        </div>
    </div>

    <div id="bp-modal-calcolatore" class="modal-overlay" style="z-index: 7500;">
        <div class="modal-content">
            <h3 style="margin-top:0; margin-bottom:20px; color:var(--text-main); display:flex; justify-content:center; align-items:center; gap:10px; border-bottom:1px solid var(--border-color); padding-bottom:15px;"><i class="fa-solid fa-calculator" style="color:var(--primary);"></i> Calcolatore Buoni</h3>
            
            <button class="btn-outline" onclick="window.precompilaDaCalendarioBP()" style="font-size: 14px; padding: 12px; margin-bottom: 24px; width:100%; justify-content:center;"><i class="fa-solid fa-wand-magic-sparkles"></i> Precompila con dati Calendario</button>

            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; text-align: left;">
                <label style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Presenze mese corrente</label>
                <input type="number" id="bp-pres-corrente" class="input-field" placeholder="0" style="margin-bottom:0;">
                
                <label style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top:10px;">Presenze mese passato</label>
                <input type="number" id="bp-pres-passato" class="input-field" placeholder="0" style="margin-bottom:0;">
                
                <label style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top:10px;">Buoni caricati sulla tessera</label>
                <input type="number" id="bp-buoni-tessera" class="input-field" placeholder="0" style="margin-bottom:0;">
            </div>

            <button class="btn-action btn-success" style="margin-top:0;" onclick="window.eseguiCalcoloBP()"><i class="fa-solid fa-equals"></i> Calcola Risultato</button>
            <div id="bp-btn-attiva-dopo-calcolo" style="display: none; margin-top:10px;">
                <button class="btn-action" style="margin-top:0;" onclick="window.salvaCalcoloEAttivaBP()"><i class="fa-solid fa-bolt"></i> Salva e Attiva Integrazione</button>
            </div>
            <button class="btn-outline" style="width:100%; justify-content:center; margin-top: 10px;" onclick="window.chiudiCalcolatoreBP()">Chiudi</button>
            
            <div id="bp-risultato-calcolo" style="margin-top: 20px; font-size: 24px; font-weight: 800; color: var(--primary); background: var(--primary-glow); padding: 16px; border-radius: var(--radius-md); text-align:center;"></div>
        </div>
    </div>
`;

export function initUIBuoniPasto() {
    // Inietta il blocco HTML una sola volta
    if (!document.getElementById('modal-buoni-main')) {
        document.body.insertAdjacentHTML('beforeend', buoniPastoHTML);
    }
}
