import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
    API_URL, DATA_INIZIO_NUOVI_TURNI, TURNI_SENZA_CORSE, dateToLocalISO, stringToNum, creaDataSicura, esc, getLineStyle,
    convertiTurnoPerMansione, trovaChiaveEsatta, unisciRebecchini, calcolaTurnoBase as calcolaTurnoCore, ferieDelGiorno, caricaDatiTurni
} from "./turni-core.js"; // logica turni condivisa con calendario e gps: va importato sempre con questo stesso percorso

// ==========================================
// 1. INIEZIONE UI DASHBOARD
// ==========================================
export function initUIDashboard() {
    if (document.getElementById('modal-dashboard-main')) return;
    
    const uiHTML = `
        <style>
        .dash-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 15px; }
        .dash-date { text-align: center; flex: 1; }
        .dash-date-dayname { font-weight: 800; color: var(--primary); font-size: 18px; text-transform: uppercase; }
        .dash-date-fulldate { font-size: 14px; color: var(--text-muted); }
        .dash-nav-btn { background: none; border: none; color: var(--text-main); font-size: 20px; cursor: pointer; padding: 10px; }
        
        .dash-card { background: var(--surface); padding: 20px; border-radius: var(--radius-md); margin-bottom: 15px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); text-align: center; }
        .dash-turno-title { font-size: 14px; color: var(--text-muted); margin-bottom: 5px; font-weight: bold; }
        
        /* Nuovi Stili Card Turno */
        .dash-turno-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .dash-turno-value { font-size: 36px; font-weight: 900; color: var(--primary); margin: 0; line-height: 1; }
        .btn-img-turno { background: rgba(128, 128, 128, 0.1); color: var(--primary); border: none; width: 42px; height: 42px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .btn-img-turno:hover { background: var(--primary); color: white; }
        
        /* Stili riepilogo e timeline adattati alla dark mode */
        .turno-locations { display: flex; justify-content: space-between; align-items: center; background: rgba(128, 128, 128, 0.05); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 10px; text-align: center; }
        .location-time { font-size: 20px; font-weight: 800; color: var(--text-main); }
        .location-name { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-top: 4px; }
        .location-arrow { color: var(--text-muted); font-size: 20px; opacity: 0.5; }
        .turno-duration { font-size: 14px; font-weight: 600; color: var(--text-muted); text-align: center; margin-bottom: 10px; }
        
        .dash-turno-expand-btn { text-align: center; color: var(--text-muted); cursor: pointer; padding: 10px 0 0 0; margin-top: 10px; border-top: 1px solid var(--border-color); font-size: 20px; transition: transform 0.3s; }
        .dash-turno-expand-btn.expanded i { transform: rotate(180deg); transition: transform 0.3s; }
        
        .timeline { position: relative; padding-left: 20px; text-align: left; margin-top: 15px; }
        .timeline::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 2px; background: var(--border-color); }
        .timeline-parte-header { font-size: 14px; font-weight: 800; color: var(--primary); margin: 20px 0 15px 0; text-transform: uppercase; background: rgba(128, 128, 128, 0.1); display: inline-block; padding: 5px 12px; border-radius: 6px; }
        
        .activity-card { background: transparent; border-radius: 10px; padding: 15px; margin-bottom: 15px; position: relative; border: 1px solid var(--border-color); transition: all 0.3s ease; }
        .activity-card::before { content: ''; position: absolute; left: -25px; top: 20px; width: 12px; height: 12px; border-radius: 50%; background: var(--primary); border: 3px solid var(--surface); }
        .activity-card.cliccabile { cursor: pointer; }
        .activity-card.cliccabile:active { background: rgba(128, 128, 128, 0.05); }
        
        /* Stati del tempo */
        .act-past { opacity: 0.5; filter: grayscale(80%); }
        .act-current { border-left: 4px solid var(--primary); box-shadow: 0 4px 15px rgba(0, 82, 155, 0.15); background: rgba(0, 82, 155, 0.03); }
        .act-current::before { background: #ff4757; border-color: var(--surface); animation: pulse 1.5s infinite; }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.4); }
            70% { box-shadow: 0 0 0 8px rgba(255, 71, 87, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
        }

        .act-header { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center; }
        .act-time { font-weight: 800; font-size: 15px; color: var(--text-main); }
        .act-duration { font-size: 12px; color: var(--text-muted); background: rgba(128, 128, 128, 0.15); padding: 3px 8px; border-radius: 12px; }
        .act-route { font-size: 14px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .act-type { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .type-linea { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; border: 2px solid; font-size: 12px; padding: 0; }
        
        /* Badge con trasparenze alfa per matchare entrambi i temi */
        .type-vuoto { background: rgba(71, 85, 105, 0.15); color: var(--text-muted); }
        .type-pausa { background: rgba(217, 119, 6, 0.15); color: #d97706; }
        .type-altro { background: rgba(100, 116, 139, 0.15); color: var(--text-muted); }
        .type-rebecchino { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid #8b5cf6; }
        
        .act-notes { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-color); font-size: 12px; color: #d97706; font-weight: 600; }
        .act-handoff { font-size: 12px; color: var(--primary); font-weight: 600; }
        .act-fermate-hint { font-size: 12px; color: var(--primary); font-weight: 600; margin-top: 8px; }

        .turno-part-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(128, 128, 128, 0.05); padding: 12px 15px; border-radius: 8px; margin-bottom: 7px; text-align: left; border: 1px solid var(--border-color); }
        .turno-part-label { font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; min-width: 55px; }
        .turno-part-location { text-align: center; flex: 1; }
        .turno-part-time { font-size: 18px; font-weight: 800; color: var(--text-main); }
        .turno-part-place { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 3px; }

        /* Stili Modal Corse */
        .corsa-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(0, 0, 0, 0.7); display: none; align-items: flex-end; justify-content: center; }
        .corsa-overlay.aperto { display: flex; }
        .corsa-modal { background: var(--surface); width: 100%; max-width: 560px; max-height: 88vh; border-radius: 18px 18px 0 0; display: flex; flex-direction: column; box-shadow: 0 -8px 30px rgba(0,0,0,0.5); position: relative; text-align: left; }
        @media (min-width: 600px) { .corsa-overlay { align-items: center; } .corsa-modal { border-radius: 18px; max-height: 80vh; } }
        .corsa-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px 12px; border-bottom: 1px solid var(--border-color); }
        .corsa-titolo { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-weight: 700; font-size: 16px; color: var(--text-main); }
        .corsa-sotto { font-size: 12px; color: var(--text-muted); margin-top: 4px; font-weight: 400; }
        .corsa-chiudi { border: none; background: rgba(128, 128, 128, 0.1); color: var(--text-main); width: 34px; height: 34px; border-radius: 50%; font-size: 16px; cursor: pointer; flex: none; }
        .corsa-corpo { overflow-y: auto; padding: 14px 18px 22px; position: relative; }
        .corsa-stato { text-align: center; color: var(--text-muted); padding: 30px 10px; font-size: 14px; }
        .corsa-stato.errore { color: #b42318; }
        
        /* Modifiche linee e nodi modale corse */
        .fermata { display: flex; align-items: center; gap: 12px; padding: 9px 0; position: relative; }
        .fermata::before { content: ''; position: absolute; left: 5px; top: 0; bottom: 0; width: 2px; background: var(--border-color); }
        .fermata:first-child::before { top: 50%; }
        .fermata:last-child::before { bottom: 50%; }
        .fermata-punto { width: 12px; height: 12px; border-radius: 50%; background: var(--surface); border: 2px solid var(--text-muted); flex: none; position: relative; z-index: 1; }
        .fermata.nel-turno .fermata-punto { background: var(--primary); border-color: var(--primary); }
        .fermata-nome { flex: 1; font-size: 14px; color: var(--text-muted); }
        .fermata.nel-turno .fermata-nome { color: var(--text-main); font-weight: 600; }
        .fermata-ora { font-variant-numeric: tabular-nums; font-size: 14px; color: var(--text-muted); text-align: right; }
        .fermata.nel-turno .fermata-ora { color: var(--text-main); font-weight: 700; }
        
        .fermata-ora small { display: block; font-size: 11px; font-weight: 400; color: var(--text-muted); }
        .giorno-dopo { font-size: 10px; color: #b42318; font-weight: 700; margin-left: 3px; }
        .fermata-estremo { font-size: 11px; color: var(--primary); font-weight: 700; text-transform: uppercase; }
        .corsa-legenda { font-size: 12px; color: var(--text-muted); margin-top: 10px; }

        .dash-alert { display: none; padding: 15px; border-radius: var(--radius-sm); margin-bottom: 15px; text-align: left; align-items: center; gap: 12px; font-weight: bold; font-size: 14px; line-height: 1.4; }
        .dash-alert-danger { background: rgba(220, 53, 69, 0.1); border-left: 5px solid var(--danger); color: var(--danger); }
        .dash-alert-warning { background: rgba(255, 193, 7, 0.1); border-left: 5px solid #ffc107; color: #856404; }
        
        .dash-mate { display: none; background: rgba(40, 167, 69, 0.1); border-left: 5px solid var(--success); padding: 15px; border-radius: var(--radius-sm); margin-bottom: 15px; text-align: left; }
        
        .dash-prom-card { background: rgba(52, 152, 219, 0.1); border-left: 5px solid #3498db; padding: 12px; border-radius: var(--radius-sm); margin-bottom: 15px; text-align: left; }
        .dash-prom-title { font-weight: bold; font-size: 14px; color: #2980b9; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
        .dash-prom-note { font-size: 13px; color: var(--text-main); }

        .dash-daily-weather { display: flex; align-items: center; justify-content: space-between; padding: 10px 0 15px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 10px; }
        .dash-daily-main { display: flex; align-items: center; gap: 15px; }
        .dash-daily-icon { font-size: 42px; line-height: 1; }
        .dash-daily-desc { font-weight: bold; font-size: 16px; color: var(--text-main); }
        .dash-daily-temps { text-align: right; }
        .dash-daily-temp-max { font-size: 26px; font-weight: 900; color: var(--text-main); }
        .dash-daily-temp-min { font-size: 16px; color: var(--text-muted); font-weight: bold; }

        .dash-hourly-weather { display: flex; overflow-x: auto; gap: 15px; padding-bottom: 5px; }
        .weather-hour-card { min-width: 60px; text-align: center; font-size: 13px; }
        .weather-hour-time { font-weight: bold; color: var(--text-main); }
        .weather-hour-icon { font-size: 26px; margin: 8px 0; line-height: 1; }
        .weather-hour-temp { color: var(--primary); font-weight: bold; font-size: 15px;}
    </style>

    <div id="modal-dashboard-main" class="modal-overlay" style="display:none;" onclick="window.chiudiSuSfondo(event, 'modal-dashboard-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-dashboard-main').style.display='none'"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <i class="fa-solid fa-chart-bar"></i> Dashboard
            </h3>

            <div class="dash-header">
                <button class="dash-nav-btn" onclick="window.cambiaDataDashboard(-1)"><i class="fa-solid fa-chevron-left"></i></button>
                <div class="dash-date">
                    <div id="dash-dayname" class="dash-date-dayname">--</div>
                    <div id="dash-fulldate" class="dash-date-fulldate">--</div>
                </div>
                <button class="dash-nav-btn" onclick="window.cambiaDataDashboard(1)"><i class="fa-solid fa-chevron-right"></i></button>
            </div>

            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; width: 100%;">
                
                <div id="dash-alert-varianti" class="dash-alert dash-alert-warning">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 24px; color: #ffc107;"></i>
                    <span id="dash-varianti-text"></span>
                </div>

                <!-- CARD TURNO AGGIORNATA -->
                <div class="dash-card" id="dash-card-turno-oggi">
                    <div class="dash-turno-title">TURNO DI OGGI</div>
                    
                    <div id="dash-turno-loading" style="display: none; padding: 20px 0;">
                        <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary);"></i>
                    </div>

                    <div id="dash-turno-content">
                        <div class="dash-turno-header-row">
                            <div id="dash-turno-val" class="dash-turno-value">--</div>
                            <button id="dash-btn-img-turno" class="btn-img-turno" style="display: none;"><i class="fa-solid fa-image"></i></button>
                        </div>
                        
                        <div id="dash-avviso-vedi-turno" style="display: none; background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; padding: 10px; border-radius: var(--radius-sm); color: #856404; font-size: 13px; font-weight: bold; text-align: left; margin-bottom: 15px;">
                            <i class="fa-solid fa-circle-exclamation"></i> Variante in corso: vedi il turno corretto nella sezione turni.
                        </div>

                        <div id="dash-turno-riepilogo"></div>
                        
                        <div id="dash-turno-expand-btn" class="dash-turno-expand-btn" style="display: none;">
                            <i class="fa-solid fa-chevron-down"></i>
                        </div>
                        
                        <div id="dash-timeline-container" class="timeline" style="display: none;"></div>
                    </div>
                </div>

                <div id="dash-alert-pioggia" class="dash-alert dash-alert-danger">
                    <i class="fa-solid fa-cloud-showers-heavy" style="font-size: 24px;"></i>
                    <span>Prepara la cerata, oggi è prevista pioggia!</span>
                </div>

                <div id="dash-mate-container" class="dash-mate">
                    <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 5px;"><i class="fa-solid fa-users"></i> Oggi lavorerai con:</div>
                    <div id="dash-mate-name" style="font-weight: bold; font-size: 17px; color: var(--text-main);">--</div>
                </div>

                <div id="dash-promemoria-container" style="display: none; width: 100%;"></div>

                <div class="dash-card" style="text-align: left;">
                    <div class="dash-turno-title">METEO VENEZIA</div>
                    <div id="dash-daily-weather-container"></div>
                    <div id="dash-weather-container" class="dash-hourly-weather">
                        <div style="text-align:center; width:100%;"><i class="fa-solid fa-spinner fa-spin" style="color: var(--primary);"></i></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modale Immagine Dashboard -->
    <div id="modal-image-dashboard" class="modal-overlay" style="z-index: 9999; display: none; background: rgba(0,0,0,0.9);" onclick="window.chiudiImageModalDashboardSeSfondo(event)">
        <div id="imageFlexContainerDashboard" style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 30px; cursor: pointer; color: white; z-index: 10; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" onclick="window.chiudiImageModalDashboard()"></i>
            <img id="img-dashboard-turno" style="max-width: 100%; max-height: 100vh; object-fit: contain; transition: transform 0.2s;" src="">
        </div>
    </div>

    <!-- Modale Corse (API) -->
    <div class="corsa-overlay" id="corsa-overlay-dash" onclick="if (event.target === this) window.chiudiCorsaDash()">
        <div class="corsa-modal" role="dialog" aria-modal="true" aria-labelledby="corsa-titolo-dash">
            <div class="corsa-head">
                <div>
                    <div class="corsa-titolo" id="corsa-titolo-dash"></div>
                    <div class="corsa-sotto" id="corsa-sotto-dash"></div>
                </div>
                <button class="corsa-chiudi" onclick="window.chiudiCorsaDash()" aria-label="Chiudi"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="corsa-corpo" id="corsa-corpo-dash"></div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);

    // Event listener per il tasto espandi timeline
    const expandBtn = document.getElementById('dash-turno-expand-btn');
    if (expandBtn) {
        expandBtn.addEventListener('click', function() {
            const timeline = document.getElementById('dash-timeline-container');
            this.classList.toggle('expanded');
            if (this.classList.contains('expanded')) {
                timeline.style.display = 'block';
            } else {
                timeline.style.display = 'none';
            }
        });
    }
}

// ==========================================
// 2. MOTORE LOGICO DASHBOARD
// ==========================================
export function avviaMotoreDashboard(db, auth, userDataPrivate) {
    let dataCorrente = new Date();
    let globalRotCache = null;
    let globalDbCache = null;
    let globalVariantiCache = null;
    let datiTurni = null;

    let pzDashboard = null;
    let currentImagePathDash = "";
    let imgBaseFallbackDash = "";

    // Variabili per visualizzatore timeline API
    let attivitaCorrentiDash = [];
    const cacheCorseDash = new Map();
    let richiestaCorsaDash = 0;
    

    const imgElem = document.getElementById('img-dashboard-turno');
    if (typeof Panzoom !== 'undefined' && !pzDashboard) {
        pzDashboard = Panzoom(imgElem, { maxScale: 5, minScale: 1 });
        document.getElementById('imageFlexContainerDashboard').addEventListener('wheel', pzDashboard.zoomWithWheel);
        
        function eseguiZoomToggle(e) {
            if (!pzDashboard) return;
            let currentScale = pzDashboard.getScale();
            if (currentScale < 1.1) { pzDashboard.zoom(1.75, { animate: true }); } 
            else { pzDashboard.reset({ animate: true }); }
        }
        
        let lastTap = 0, isPinching = false;
        imgElem.addEventListener('touchstart', function(e) { if (e.touches.length > 1) { isPinching = true; } });
        imgElem.addEventListener('touchend', function(e) {
            if (isPinching) { if (e.touches.length === 0) { setTimeout(() => isPinching = false, 300); } return; }
            let currentTime = new Date().getTime(); 
            let tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) { eseguiZoomToggle(e); if (e.cancelable) e.preventDefault(); }
            lastTap = currentTime;
        });
        imgElem.addEventListener('dblclick', eseguiZoomToggle);
    }

    // HELPER FUNZIONI
    function capitalizzaIniziali(str) { if (!str) return ""; return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
    function dataIt(iso) { return iso.split('-').reverse().join('/'); }

    // --- HELPER CONVERSIONE MANSIONE ---

    function verificaSeMarinaio(codiceInput) {
        if (!codiceInput) return false;
        const cod = String(codiceInput).trim().toUpperCase();
        if (/^[1-9]B\d{2}$/.test(cod)) return true;
        const match = cod.match(/^([A-Z0-9]+?)(\d{2})$/);
        if (match) {
            const prefisso = match[1];
            const num = parseInt(match[2], 10);
            if (/^[1-9][CP]$/.test(prefisso)) return false;
            if (prefisso === "PO") return true;
            if (num >= 50) return true;
        }
        return false;
    }

    function formattaCodiceTurno(linea, numero, isMarinaio) {
        if (!linea || numero === undefined || numero === null) return "";
        const lineaBase = String(linea).trim().toUpperCase();
        let num = parseInt(numero, 10);
        if (isNaN(num)) return `${lineaBase}${numero}`;
        const matchSingola = lineaBase.match(/^([1-9])(?:\.\d+)?$/);

        if (matchSingola) {
            const numLinea = matchSingola[1];
            let lettera = isMarinaio ? "B" : ((numLinea === "1" || numLinea === "2") ? "C" : "P");
            return `${numLinea}${lettera}${String(num).padStart(2, "0")}`;
        } else {
            if (isMarinaio && lineaBase !== "PO") { if (num < 50) num += 50; }
            return `${lineaBase}${String(num).padStart(2, "0")}`;
        }
    }


    async function initCaches() {
        if (datiTurni) return;
        try {
            // un solo scaricamento condiviso con calendario e gps (vedi turni-core.js)
            datiTurni = await caricaDatiTurni();
            globalRotCache = datiTurni.rot; globalDbCache = datiTurni.db; globalVariantiCache = datiTurni.varianti;
        } catch (e) { console.error("Errore cache", e); }
    }


    function calcolaTurnoBase(dStr, cfgData) {
        return calcolaTurnoCore(dStr, cfgData, { rot: globalRotCache, disp: datiTurni && datiTurni.disp });
    }

    // Stessa logica di varianti.js: assenze -> NPL; NPL e DISP non danno mai match compagno
    function turnoEscludeMatch(turnoStr) {
        if (!turnoStr) return false;
        const t = String(turnoStr).toUpperCase().trim();
        const codiciSensibili = ["KMAL", "KNOP", "AVIS", "KINF", "FER", "FEP", "FES", "PRT", "FERIE"];
        if (codiciSensibili.some(c => new RegExp(`\\b${c}\\b`).test(t))) return true;
        return /\bNPL\b/.test(t) || /\bDISP\b/.test(t);
    }

    function calcolaCompagniPossibili(mioTurnoStr) {
        let mates = [];
        if (!mioTurnoStr) return mates;
        let tClean = String(mioTurnoStr).toUpperCase().replace(/\s+/g, '');
        let matchB = tClean.match(/^([1-9])B(\d{2})$/);
        if (matchB) {
            let l = matchB[1]; let f = matchB[2];
            let letPilota = (l === '1' || l === '2') ? 'C' : 'P';
            mates.push(`${l}${letPilota}${f}`);
        } else {
            let matchP = tClean.match(/^([1-9])[CP](\d{2})$/);
            if (matchP) mates.push(`${matchP[1]}B${matchP[2]}`);
            else {
                let match50 = tClean.match(/^([A-Z0-9]+?)(\d{2})$/);
                if (match50) {
                    let p = match50[1]; let n = parseInt(match50[2], 10);
                    if (n >= 50) mates.push(p + String(n - 50).padStart(2, '0'));
                    else mates.push(p + String(n + 50).padStart(2, '0'));
                }
            }
        }
        return mates;
    }


    function caricaPromemoriaDashboard(dStr) {
        const container = document.getElementById('dash-promemoria-container');
        if (!container) return;
        container.innerHTML = '';
        container.style.display = 'none';

        const request = indexedDB.open("UtilityDB");
        request.onsuccess = function(event) {
            const dbLocal = event.target.result;
            if (!dbLocal.objectStoreNames.contains("archivio_dds")) return;

            const tx = dbLocal.transaction("archivio_dds", "readonly");
            tx.objectStore("archivio_dds").getAll().onsuccess = function(e) {
                let ddsArray = e.target.result;
                let promGiorno = ddsArray.filter(dds => dds.isPromemoria && dds.dateValidita && dds.dateValidita.includes(dStr));

                if (promGiorno.length > 0) {
                    let html = '';
                    promGiorno.forEach(prom => {
                        html += `
                            <div class="dash-prom-card">
                                <div class="dash-prom-title"><i class="fa-solid fa-bell"></i> ${prom.titolo}</div>
                                ${prom.note ? `<div class="dash-prom-note">${prom.note}</div>` : ''}
                            </div>
                        `;
                    });
                    container.innerHTML = html;
                    container.style.display = 'block';
                }
            };
        };
        request.onerror = function() { console.error("Errore IndexedDB in dashboard promemoria"); };
    }

    // --- CHIAMATA API E RENDERING TIMELINE ---
    async function caricaDettagliTurnoDaApi(codice, dataGiorno, mansione) {
        const loading = document.getElementById('dash-turno-loading');
        const content = document.getElementById('dash-turno-content');
        const riepilogo = document.getElementById('dash-turno-riepilogo');
        const timelineCont = document.getElementById('dash-timeline-container');
        const expandBtn = document.getElementById('dash-turno-expand-btn');
        const btnImg = document.getElementById('dash-btn-img-turno');

        loading.style.display = 'block';
        content.style.display = 'none';
        riepilogo.innerHTML = '';
        timelineCont.innerHTML = '';
        expandBtn.style.display = 'none';
        expandBtn.classList.remove('expanded');

        const fetchUrl = `${API_URL}/api/v1/turno?codice=${encodeURIComponent(codice)}&data=${encodeURIComponent(dataGiorno)}`; 

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error("Errore API");
            const responseData = await response.json();
            
            document.getElementById('dash-turno-val').textContent = codice;
            renderTurnoAPI(responseData.turno, codice, dataGiorno, mansione);
            
            loading.style.display = 'none';
            content.style.display = 'block';
            btnImg.style.display = 'flex';
            expandBtn.style.display = 'block';

        } catch (error) {
            console.error("Fetch API Turno fallita, fallback solo immagine", error);
            // Fallback: mostra solo il codice e il bottone immagine se l'API fallisce
            loading.style.display = 'none';
            content.style.display = 'block';
            document.getElementById('dash-turno-val').textContent = codice;
            btnImg.style.display = 'flex';
        }
    }

    function renderTurnoAPI(turno, codiceCercato, dataGiorno, mansione) {
        const isMarinaio = verificaSeMarinaio(codiceCercato);
        const corseVisualizzate = unisciRebecchini(turno.corse_linea || []);
        const tutteLeAttivita = [
            ...corseVisualizzate,
            ...(turno.altre_attivita || [])
        ];

        tutteLeAttivita.sort((a, b) => a.ordine - b.ordine);
        attivitaCorrentiDash = tutteLeAttivita;

        // 1. RIEPILOGO (Luoghi e Durata)
        const parti = Array.isArray(turno.parti) && turno.parti.length > 0 ? turno.parti : [{ inizio: turno.inizio_turno, fine: turno.fine_turno }];
        let partiHtml = "";
        
        if (parti.length === 1) {
            const p = parti[0];
            partiHtml = `
                <div class="turno-locations">
                    <div class="location-block">
                        <div class="location-time">${p.inizio.ora}</div>
                        <div class="location-name">${p.inizio.luogo}</div>
                    </div>
                    <div class="location-arrow"><i class="fa-solid fa-arrow-right-long"></i></div>
                    <div class="location-block">
                        <div class="location-time">${p.fine.ora}</div>
                        <div class="location-name">${p.fine.luogo}</div>
                    </div>
                </div>
            `;
        } else {
            partiHtml = `<div style="margin-bottom:10px;">` + parti.map((p, index) => `
                <div class="turno-part-row">
                    <div class="turno-part-label">Parte ${index + 1}</div>
                    <div class="turno-part-location">
                        <div class="turno-part-time">${p.inizio.ora}</div>
                        <div class="turno-part-place">${p.inizio.luogo}</div>
                    </div>
                    <div class="turno-part-arrow"><i class="fa-solid fa-arrow-right-long"></i></div>
                    <div class="turno-part-location">
                        <div class="turno-part-time">${p.fine.ora}</div>
                        <div class="turno-part-place">${p.fine.luogo}</div>
                    </div>
                </div>`).join("") + `</div>`;
        }

        document.getElementById('dash-turno-riepilogo').innerHTML = `
            ${partiHtml}
            <div class="turno-duration">Durata turno: ${turno.durata} h</div>
        `;

        // 2. TIMELINE E LOGICA TEMPO REALE
        let htmlTimeline = "";
        let currentParte = null;

        const now = new Date();
        const [annoG, meseG, giornoG] = dataGiorno.split('-').map(Number);

        let evidenzaTrovata = false;
        let previousRawStart = -1;
        let dayOffsetDays = 0;

        tutteLeAttivita.forEach(act => {
            const isRebecchino = act.tipo_attivita === "rebecchino";
            const isCorsa = act.hasOwnProperty('linea');

            if (parti.length > 1 && act.parte && act.parte !== currentParte) {
                currentParte = act.parte;
                htmlTimeline += `<div class="timeline-parte-header">Parte ${currentParte}</div>`;
            }

            let statusClass = "";

            if (act.partenza && act.arrivo) {
                let [hP, mP] = act.partenza.split(':').map(Number);
                let [hA, mA] = act.arrivo.split(':').map(Number);

                let rawStart = hP * 60 + mP;
                let rawEnd = hA * 60 + mA;

                // Se l'orario di inizio fa un salto all'indietro (es. da 23:30 a 00:15), scatta il giorno logico successivo
                if (previousRawStart !== -1 && rawStart < previousRawStart - 12 * 60) {
                    dayOffsetDays += 1;
                }
                previousRawStart = rawStart;

                // Creazione oggetti Date assoluti per un confronto chirurgico
                let actStartDate = new Date(annoG, meseG - 1, giornoG + dayOffsetDays, hP, mP);

                let endDayOffset = dayOffsetDays;
                // Se la singola attività scavalca la mezzanotte (es. 23:45 -> 00:30)
                if (rawEnd < rawStart) {
                    endDayOffset += 1;
                }
                let actEndDate = new Date(annoG, meseG - 1, giornoG + endDayOffset, hA, mA);

                // Confronto diretto tra la fine dell'attività e l'orario attuale esatto
                if (now > actEndDate) {
                    statusClass = "act-past";
                } else if (!evidenzaTrovata) {
                    statusClass = "act-current";
                    evidenzaTrovata = true;
                }
            }

            let topLabelHtml = "";
            let bottomLabelHtml = "";

            if (isCorsa) {
                const styleInline = getLineStyle(act.linea);
                topLabelHtml = `<span class="act-type type-linea" style="${styleInline}">${act.linea}</span>`;
            }

            if (isRebecchino) {
                bottomLabelHtml = `<span class="act-type type-rebecchino">Rebecchino</span>`;
            } else if (!isCorsa) {
                let typeClass = "type-altro";
                let typeLabel = act.tipo || "Attività";
                if (act.categoria === "spostamento_a_vuoto" || (act.tipo && act.tipo.includes("TRASFERIMENTO"))) { typeClass = "type-vuoto"; typeLabel = act.tipo; }
                else if (act.categoria === "altra_attivita" && act.tipo && act.tipo.includes("PASTO")) { typeClass = "type-pausa"; typeLabel = act.tipo; }
                bottomLabelHtml = `<span class="act-type ${typeClass}">${typeLabel}</span>`;
            }

            let noteHtml = '';
            if (act.note && act.note.length > 0) {
                const testiNote = act.note.map(n => n.testo).join(" - ");
                noteHtml = `<div class="act-notes"><i class="fa-solid fa-triangle-exclamation"></i> ${testiNote}</div>`;
            }

            let handoffHtml = '';
            if (act.imbarca) {
                const codImbarca = formattaCodiceTurno(act.imbarca.linea, act.imbarca.turno, isMarinaio);
                handoffHtml += `<div><i class="fa-solid fa-arrow-right-to-bracket"></i> Consegnata da: ${codImbarca}</div>`;
            }
            if (act.consegna) {
                const codConsegna = formattaCodiceTurno(act.consegna.linea, act.consegna.turno, isMarinaio);
                handoffHtml += `<div><i class="fa-solid fa-arrow-right-from-bracket"></i> Consegna a: ${codConsegna}</div>`;
            }

            const apri = isCorsa ? ` cliccabile" onclick="window.apriCorsaDash(${act.ordine}, '${dataGiorno}')" role="button" tabindex="0"` : '"';

            htmlTimeline += `
                <div class="activity-card ${statusClass}${apri}>
                    <div class="act-header">
                        <span class="act-time">${act.partenza} - ${act.arrivo}</span>
                        <span class="act-duration">${act.durata_min} min</span>
                    </div>
                    <div class="act-route">
                        ${topLabelHtml}
                        <span>${act.da || ''} <i class="fa-solid fa-caret-right" style="color:#cbd5e1; margin:0 5px;"></i> ${act.a || ''}</span>
                    </div>
                    ${noteHtml}
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: ${(handoffHtml || bottomLabelHtml) ? '10px' : '0'};">
                        <div class="act-handoff">${handoffHtml}</div>
                        <div>${bottomLabelHtml}</div>
                    </div>
                    ${isCorsa ? '<div class="act-fermate-hint"><i class="fa-solid fa-list-ul"></i> Fermate e orari</div>' : ''}
                </div>
            `;
        });

        document.getElementById('dash-timeline-container').innerHTML = htmlTimeline;
    }

    // --- FUNZIONI MODAL CORSA DASHBOARD ---
    async function fetchCorsaSingolaDash(act, dataCorrente) {
        const params = new URLSearchParams({
            linea: act.linea, data: dataCorrente,
            partenza_min: act.partenza_min, arrivo_min: act.arrivo_min, da: act.da, a: act.a
        });
        const url = `${API_URL}/api/v1/corsa?${params}`;
        let dati = cacheCorseDash.get(url);
        if (!dati) {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error("Errore recupero fermate.");
            dati = await resp.json();
            cacheCorseDash.set(url, dati);
        }
        return dati;
    }

    window.apriCorsaDash = async function(ordine, dataCorrente) {
        const act = attivitaCorrentiDash.find(a => a.ordine === ordine);
        if (!act || !act.linea) return;
        const mio = ++richiestaCorsaDash;

        const stile = getLineStyle(act.linea);
        let titoloHtml = `<span class="act-type type-linea" style="${stile}">${esc(act.linea)}</span>`;
        if (act.tipo_attivita === "rebecchino") titoloHtml += `<span class="act-type type-rebecchino" style="margin-left: 6px;">Rebecchino</span>`;
        titoloHtml += `<span style="margin-left: 8px;">${esc(act.da)} <i class="fa-solid fa-caret-right" style="color:#cbd5e1; margin:0 5px;"></i> ${esc(act.a)}</span>`;
        
        document.getElementById('corsa-titolo-dash').innerHTML = titoloHtml;
        document.getElementById('corsa-sotto-dash').textContent = `${act.partenza} - ${act.arrivo} · ${dataIt(dataCorrente)}`;
        
        const corpo = document.getElementById('corsa-corpo-dash');
        corpo.innerHTML = '<div class="corsa-stato"><i class="fa-solid fa-spinner fa-spin"></i> Carico le fermate…</div>';
        document.getElementById('corsa-overlay-dash').classList.add('aperto');

        try {
            let dati;
            if (act.tipo_attivita === "rebecchino" && act.rebecchino_prima_corsa && act.rebecchino_seconda_corsa) {
                let dati1 = await fetchCorsaSingolaDash(act.rebecchino_prima_corsa, dataCorrente);
                if (mio !== richiestaCorsaDash) return;
                let dati2 = await fetchCorsaSingolaDash(act.rebecchino_seconda_corsa, dataCorrente);
                if (mio !== richiestaCorsaDash) return;

                let f1 = dati1.fermate.slice(0, dati1.tratta.a + 1);
                let f2 = dati2.fermate.slice(dati2.tratta.da + 1);

                dati = { ...dati1, fermate: f1.concat(f2), tratta: { da: dati1.tratta.da, a: (f1.length - 1) + (dati2.tratta.a - dati2.tratta.da) } };
            } else {
                dati = await fetchCorsaSingolaDash(act, dataCorrente);
                if (mio !== richiestaCorsaDash) return;
            }

            const { fermate, tratta, corsa } = dati;
            document.getElementById('corsa-sotto-dash').textContent = `${act.partenza} - ${act.arrivo} · ${dataIt(dataCorrente)} ${corsa && corsa.direzione ? '· verso ' + corsa.direzione : ''}`;
            
            const righe = fermate.map((f, i) => {
                const nel = i >= tratta.da && i <= tratta.a;
                const ultima = i === fermate.length - 1;
                const ora = ultima ? f.arrivo : f.partenza;
                const sosta = !ultima && f.arrivo !== f.partenza ? `<small>arr. ${f.arrivo}</small>` : '';
                const estremo = i === tratta.da ? 'Inizio' : (i === tratta.a ? 'Fine' : '');
                const idInizio = i === tratta.da ? ' id="fermata-inizio-dash"' : '';

                return `<div class="fermata${nel ? ' nel-turno' : ''}"${idInizio}>
                    <span class="fermata-punto"></span>
                    <span class="fermata-nome">${esc(f.nome)}${estremo ? ` <span class="fermata-estremo">· ${estremo}</span>` : ''}</span>
                    <span class="fermata-ora">${ora}${f.oltre_mezzanotte ? '<span class="giorno-dopo">+1</span>' : ''}${sosta}</span>
                </div>`;
            }).join('');
            
            corpo.innerHTML = righe + `<div class="corsa-legenda">${tratta.da > 0 || tratta.a < fermate.length - 1 ? 'In blu il tratto della tua corsa; le altre fermate sono del resto del percorso.' : 'Tutte le fermate della corsa.'}</div>`;
            
            setTimeout(() => {
                const startFermata = document.getElementById('fermata-inizio-dash');
                if (startFermata && corpo) { corpo.scrollTo({ top: startFermata.offsetTop - 14, behavior: 'smooth' }); }
            }, 50);

        } catch (e) {
            if (mio !== richiestaCorsaDash) return;
            corpo.innerHTML = `<div class="corsa-stato errore"><i class="fa-solid fa-circle-exclamation"></i> ${esc(e.message)}</div>`;
        }
    };

    window.chiudiCorsaDash = function() {
        richiestaCorsaDash++;
        document.getElementById('corsa-overlay-dash').classList.remove('aperto');
    };

    // --- LOGICA UI PRINCIPALE DASHBOARD ---
    window.cambiaDataDashboard = function(giorni) {
        dataCorrente.setDate(dataCorrente.getDate() + giorni);
        aggiornaVistaDashboard();
    };

    async function aggiornaVistaDashboard() {
        await initCaches();
        
        const dStr = dateToLocalISO(dataCorrente); 
        
        document.getElementById('dash-dayname').textContent = dataCorrente.toLocaleDateString('it-IT', { weekday: 'long' });
        document.getElementById('dash-fulldate').textContent = dataCorrente.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

        let state = JSON.parse(localStorage.getItem('myTurniApp')) || {};
        
        let mioTurnoBase = calcolaTurnoBase(dStr, state);
        let mioTurnoConvertito = convertiTurnoPerMansione(mioTurnoBase, userDataPrivate?.mansione);
        let mioTurnoOggi = state.variazioni && state.variazioni[dStr] ? state.variazioni[dStr] : mioTurnoConvertito;

        // giorni di ferie previsti dalla rotazione ferie (come nel calendario): senza variazione manuale il turno diventa FEP
        if (!(state.variazioni && state.variazioni[dStr]) && datiTurni && !["RI", "AL"].includes(String(mioTurnoOggi).toUpperCase())) {
            const ferieGiorno = ferieDelGiorno(state, dStr, datiTurni.ferie);
            if (ferieGiorno) mioTurnoOggi = ferieGiorno;
        }
        
        const alertVar = document.getElementById('dash-alert-varianti');
        const alertVarText = document.getElementById('dash-varianti-text');
        alertVar.style.display = 'none';
        
        let haVarianti = false;

        if (globalVariantiCache && globalVariantiCache[dStr]) {
            haVarianti = true;
            let lineeData = globalVariantiCache[dStr];
            let isEmpty = (Array.isArray(lineeData) && lineeData.length === 0) || (typeof lineeData === 'string' && lineeData.trim() === '') || !lineeData;
            
            if (isEmpty) { 
                alertVarText.innerHTML = "Attenzione: nella data selezionata sono presenti varianti per il servizio, verificare le DDS su spriss.";
            } else { 
                let linee = Array.isArray(lineeData) ? lineeData.join(", ") : lineeData;
                alertVarText.innerHTML = "Attenzione: nella data selezionata sono presenti varianti per le linee: <b>" + linee + "</b>";
            }
            alertVar.style.display = 'flex';
        }
        
        const btnVedi = document.getElementById('dash-btn-img-turno');
        const avvisoVedi = document.getElementById('dash-avviso-vedi-turno');
        const loading = document.getElementById('dash-turno-loading');
        const content = document.getElementById('dash-turno-content');
        let isRiposo = (!mioTurnoOggi || TURNI_SENZA_CORSE.includes(mioTurnoOggi.toUpperCase().trim()));

        // Reset visuale
        document.getElementById('dash-turno-riepilogo').innerHTML = '';
        document.getElementById('dash-timeline-container').innerHTML = '';
        document.getElementById('dash-turno-expand-btn').style.display = 'none';

        if (isRiposo) {
            loading.style.display = 'none';
            content.style.display = 'block';
            document.getElementById('dash-turno-val').textContent = mioTurnoOggi || "N/D";
            btnVedi.style.display = "none";
            avvisoVedi.style.display = "none";
        } else {
            if (haVarianti) {
                loading.style.display = 'none';
                content.style.display = 'block';
                document.getElementById('dash-turno-val').textContent = mioTurnoOggi;
                btnVedi.style.display = "none";
                avvisoVedi.style.display = "block";
            } else {
                avvisoVedi.style.display = "none";
                btnVedi.onclick = () => { apriImmagineDashboard(mioTurnoOggi, dStr); };
                // Chiamo API per riempire i dettagli (Timeline, luoghi, durata)
                caricaDettagliTurnoDaApi(mioTurnoOggi, dStr, userDataPrivate?.mansione);
            }
        }

        cercaCompagno(dStr, mioTurnoOggi);
        caricaPromemoriaDashboard(dStr);
        aggiornaMeteo(dStr);
    }

    async function cercaCompagno(dStr, mioTurno) {
        const container = document.getElementById('dash-mate-container');
        container.style.display = 'none';
        if (!auth.currentUser || !mioTurno) return;

        try {
            const userRef = doc(db, "utenti", auth.currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            const miaRubricaRef = doc(db, "rubrica", auth.currentUser.uid);
            const miaRubricaSnap = await getDoc(miaRubricaRef);
            const isCurrentUserInRubrica = miaRubricaSnap.exists();
            
            if (userSnap.exists() && userSnap.data().condivisioneVarianti === true) {
                if (turnoEscludeMatch(mioTurno)) return;
                let mioTurnoClean = String(mioTurno).toUpperCase().replace(/\s+/g, '');
                let compagniPossibili = calcolaCompagniPossibili(mioTurno);
                
                let mStr = String(userDataPrivate?.mansione || "").toLowerCase();
                let isMioMarinaio = mStr.includes('marinaio') || mStr.includes('timoniere');

                const q = query(collection(db, "utenti"), where("condivisioneVarianti", "==", true));
                const querySnapshot = await getDocs(q);
                
                let compagniTrovati = [];
                let promises = [];

                querySnapshot.forEach((docSnap) => {
                    if (docSnap.id !== auth.currentUser.uid) {
                        const userData = docSnap.data();
                        if (userData.cognome) {
                            const calRef = doc(db, "calendario", docSnap.id);
                            promises.push(getDoc(calRef).then(calSnap => {
                                return { id: docSnap.id, userData: userData, calData: calSnap.exists() ? calSnap.data() : {} };
                            }));
                        }
                    }
                });

                const risultati = await Promise.all(promises);

                for (let res of risultati) {
                    let turnoOriginaleBase = String(calcolaTurnoBase(dStr, res.calData) || "N/D");
                    turnoOriginaleBase = convertiTurnoPerMansione(turnoOriginaleBase, res.userData.mansione);
                    
                    let turnoManuale = res.calData.variazioni && res.calData.variazioni[dStr] ? String(res.calData.variazioni[dStr]) : null;
                    let turnoComp = turnoManuale !== null ? turnoManuale : turnoOriginaleBase;
                    
                    let stringaSicuraTurno = String(turnoComp).toUpperCase().replace(/\s+/g, '');
                    
                    let mTheir = String(res.userData.mansione || "").toLowerCase();
                    let isTheirMarinaio = mTheir.includes('marinaio') || mTheir.includes('timoniere');
                    
                    let isMate = false;
                    if (turnoEscludeMatch(stringaSicuraTurno)) {
                        isMate = false;
                    } else if (compagniPossibili.includes(stringaSicuraTurno)) {
                        isMate = true;
                    } else if (stringaSicuraTurno === mioTurnoClean && (isMioMarinaio !== isTheirMarinaio)) {
                        if (!["NPL", "RI", "RIPOSO", "AL"].includes(stringaSicuraTurno)) {
                            isMate = true;
                        }
                    }

                    if (isMate) {
                        let cognomeCap = capitalizzaIniziali(res.userData.cognome);
                        let nomeCap = capitalizzaIniziali(res.userData.nome);
                        let matricola = res.userData.matricola ? ` (Mat: ${res.userData.matricola})` : "";
                        
                        let mateHtml = `<span>${cognomeCap} ${nomeCap}${matricola}</span>`;

                        if (isCurrentUserInRubrica) {
                            const mateRubricaRef = doc(db, "rubrica", res.id);
                            const mateRubricaSnap = await getDoc(mateRubricaRef);
                            
                            if (mateRubricaSnap.exists() && mateRubricaSnap.data().telefono) {
                                const matePhone = String(mateRubricaSnap.data().telefono).replace(/\s+/g, '');
                                mateHtml += `
                                    <span style="white-space: nowrap;">
                                        <a href="tel:${matePhone}" style="margin-left: 12px; color: var(--text-main); text-decoration: none;"><i class="fa-solid fa-phone"></i></a>
                                        <a href="https://wa.me/39${matePhone}" target="_blank" style="margin-left: 12px; color: #25D366; text-decoration: none;"><i class="fa-brands fa-whatsapp"></i></a>
                                    </span>
                                `;
                            }
                        }

                        compagniTrovati.push(mateHtml);
                    }
                }

                if (compagniTrovati.length > 0) {
                    document.getElementById('dash-mate-name').innerHTML = compagniTrovati.join("<br><br>");
                    container.style.display = 'block';
                }
            }
        } catch (e) { console.error("Errore compagno", e); }
    }


    async function aggiornaMeteo(dStr) {
        const alertDiv = document.getElementById('dash-alert-pioggia');
        const dailyContainer = document.getElementById('dash-daily-weather-container');
        const weatherContainer = document.getElementById('dash-weather-container');
        
        alertDiv.style.display = 'none';
        dailyContainer.innerHTML = '';
        weatherContainer.innerHTML = '<div style="text-align:center; width:100%;"><i class="fa-solid fa-spinner fa-spin" style="color:var(--primary);"></i></div>';

        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=45.4371&longitude=12.3326&hourly=temperature_2m,precipitation_probability,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&start_date=${dStr}&end_date=${dStr}`);
            const data = await res.json();

            if (data.daily) {
                let dailyWCode = data.daily.weathercode[0];
                let dailyMax = Math.round(data.daily.temperature_2m_max[0]);
                let dailyMin = Math.round(data.daily.temperature_2m_min[0]);
                
                let dailyIcona = '☀️';
                let descMeteo = "Sereno";
                
                if (dailyWCode >= 1 && dailyWCode <= 3) { dailyIcona = '⛅'; descMeteo = "Nuvoloso"; }
                if (dailyWCode >= 45 && dailyWCode <= 48) { dailyIcona = '🌫️'; descMeteo = "Nebbia"; }
                if (dailyWCode >= 51 && dailyWCode <= 67) { dailyIcona = '🌧️'; descMeteo = "Pioggia"; }
                if (dailyWCode >= 71 && dailyWCode <= 77) { dailyIcona = '❄️'; descMeteo = "Neve"; }
                if (dailyWCode >= 80 && dailyWCode <= 82) { dailyIcona = '🌦️'; descMeteo = "Rovescio"; }
                if (dailyWCode >= 95) { dailyIcona = '⛈️'; descMeteo = "Temporale"; }

                dailyContainer.innerHTML = `
                    <div class="dash-daily-weather">
                        <div class="dash-daily-main">
                            <div class="dash-daily-icon">${dailyIcona}</div>
                            <div class="dash-daily-desc">${descMeteo}</div>
                        </div>
                        <div class="dash-daily-temps">
                            <span class="dash-daily-temp-max">${dailyMax}°</span>
                            <span class="dash-daily-temp-min">/ ${dailyMin}°</span>
                        </div>
                    </div>
                `;
            }

            let isToday = (dStr === dateToLocalISO(new Date()));
            let currentHour = new Date().getHours();
            
            let ciSaraPioggia = false;
            let maxFutureProb = 0;

            for (let i = 0; i <= 23; i++) {
                let isFutureOrPresentHour = !isToday || (i >= currentHour);
                if (isFutureOrPresentHour) {
                    let wCode = data.hourly.weathercode[i];
                    let precProb = data.hourly.precipitation_probability[i];
                    
                    if ((wCode >= 51 && wCode <= 67) || (wCode >= 80 && wCode <= 82) || wCode >= 95) {
                        ciSaraPioggia = true;
                    }
                    if (precProb > maxFutureProb) {
                        maxFutureProb = precProb;
                    }
                }
            }

            let htmlOrario = "";
            for (let i = 5; i <= 23; i += 2) {
                let temp = Math.round(data.hourly.temperature_2m[i]);
                let precProb = data.hourly.precipitation_probability[i];
                let wCode = data.hourly.weathercode[i];
                let timeStr = `${i.toString().padStart(2, '0')}:00`;

                let icona = '☀️';
                if (wCode >= 1 && wCode <= 3) icona = '⛅';
                if (wCode >= 45 && wCode <= 48) icona = '🌫️';
                if (wCode >= 51 && wCode <= 67) icona = '🌧️';
                if (wCode >= 71 && wCode <= 77) icona = '❄';
                if (wCode >= 80 && wCode <= 82) icona = '🌦️';
                if (wCode >= 95) icona = '⛈️';

                htmlOrario += `
                    <div class="weather-hour-card">
                        <div class="weather-hour-time">${timeStr}</div>
                        <div class="weather-hour-icon">${icona}</div>
                        <div class="weather-hour-temp">${temp}°</div>
                        <div style="font-size:11px; color:var(--text-muted); font-weight:bold;">${precProb}% <i class="fa-solid fa-droplet" style="color:#3498db;"></i></div>
                    </div>
                `;
            }

            weatherContainer.innerHTML = htmlOrario;
            
            if (ciSaraPioggia || maxFutureProb > 40) {
                alertDiv.style.display = 'flex';
            }
        } catch (e) {
            weatherContainer.innerHTML = '<div style="color:var(--danger); font-size:13px; text-align:center;">Errore caricamento meteo.</div>';
        }
    }

    // --- LOGICA VISUALIZZATORE IMMAGINE ---
    function apriImmagineDashboard(turno, dateStr) {
        let dSelezionata = stringToNum(dateStr);
        let dateChiavi = Object.keys(globalDbCache || {}).sort();
        let dbCorrente = {}; 
        let dataAttiva = dateChiavi.length > 0 ? dateChiavi[0] : "2026-03-02";
        
        for (let i = dateChiavi.length - 1; i >= 0; i--) { 
            if (dSelezionata >= stringToNum(dateChiavi[i])) { 
                dbCorrente = globalDbCache[dateChiavi[i]]; dataAttiva = dateChiavi[i]; break; 
            } 
        }

        let chiaveTrovata = trovaChiaveEsatta(dbCorrente, turno, dateStr); 
        currentImagePathDash = `turni_${dataAttiva}/${chiaveTrovata}.jpg`; 
        imgBaseFallbackDash = `turni_${dataAttiva}/${turno}.jpg`; 
        
        let imgElement = document.getElementById('img-dashboard-turno');
        
        imgElement.onerror = function() {
            if (imgBaseFallbackDash) {
                currentImagePathDash = imgBaseFallbackDash;
                imgElement.src = imgBaseFallbackDash;
                imgBaseFallbackDash = "";
            } else {
                imgElement.onerror = null;
                alert("Immagine non disponibile sul server.");
                window.chiudiImageModalDashboard();
            }
        };

        imgElement.src = currentImagePathDash;
        document.getElementById('modal-image-dashboard').style.display = 'flex';
        if (pzDashboard) pzDashboard.reset();
    }

    window.chiudiImageModalDashboard = function() {
        document.getElementById('modal-image-dashboard').style.display = 'none';
        document.getElementById('img-dashboard-turno').removeAttribute('src');
        if (pzDashboard) pzDashboard.reset();
    };

    window.chiudiImageModalDashboardSeSfondo = function(event) {
        if (event.target.id === 'modal-image-dashboard' || event.target.id === 'imageFlexContainerDashboard') {
            window.chiudiImageModalDashboard();
        }
    };

    aggiornaVistaDashboard();
}
