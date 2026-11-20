import {
    API_URL, DATA_INIZIO_NUOVI_TURNI, dateToLocalISO, creaDataSicura, convertiTurnoPerMansione,
    calcolaTurnoBase as calcolaTurnoCore, ferieDelGiorno, caricaDatiTurni
} from "./turni-core.js"; // logica turni condivisa con calendario e gps: va importato sempre con questo stesso percorso
import { creaVistaTurno } from "./turno-view.js"; // visualizzazione turno (riepilogo, timeline, corse, immagine)

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
        
        .dash-alert { display: none; padding: 15px; border-radius: var(--radius-sm); margin-bottom: 15px; text-align: left; align-items: center; gap: 12px; font-weight: bold; font-size: 14px; line-height: 1.4; }
        .dash-alert-danger { background: rgba(220, 53, 69, 0.1); border-left: 5px solid var(--danger); color: var(--danger); }
        .dash-alert-warning { background: rgba(255, 193, 7, 0.1); border-left: 5px solid #ffc107; color: #856404; }
        
        
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

        /* Dashboard responsive */
        .dash-modal-content { width: min(1080px, calc(100vw - 40px)); max-width: 1080px !important; height: min(90dvh, 900px) !important; max-height: 90dvh; border-radius: 22px !important; overflow: hidden; box-sizing: border-box; }
        .dash-modal-close { position: absolute; top: 14px; right: 14px; z-index: 5; display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; padding: 0; border: 1px solid var(--border-color); border-radius: 50%; background: var(--surface); color: var(--text-main); font-size: 19px; cursor: pointer; box-shadow: var(--shadow-sm); }
        .dash-modal-close:active { transform: scale(.94); }
        .dash-modal-close:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
        .dash-scroll-grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-content: start; width: 100%; padding: 2px 2px 12px; }
        .dash-scroll-grid > * { min-width: 0; }
        .dash-scroll-grid #dash-alert-varianti, .dash-scroll-grid #dash-card-turno-oggi, .dash-scroll-grid #dash-alert-pioggia, .dash-scroll-grid #dash-promemoria-container { grid-column: 1 / -1; }
        .dash-scroll-grid #dash-card-meteo, .dash-scroll-grid #dash-card-meteomarino { height: 100%; }
        .dash-scroll-grid #dash-card-meteomarino { grid-column: 1 / -1; }
        .dash-meteo-current { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:12px; margin-bottom:12px; }
        .dash-meteo-feature { background:var(--surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:14px; min-width:0; }
        .dash-meteo-feature-label { font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; }
        .dash-meteo-feature-value { display:flex; align-items:center; justify-content:center; gap:9px; margin:9px 0 5px; font-size:clamp(25px,4vw,36px); line-height:1.1; font-weight:900; color:var(--text-main); font-variant-numeric:tabular-nums; }
        .dash-meteo-arrow { display:inline-flex; align-items:center; justify-content:center; font-size:28px; line-height:1; }
        .dash-meteo-arrow.up { color:#16a34a; } .dash-meteo-arrow.down { color:#2563eb; }
        .dash-meteo-sub { font-size:12px; color:var(--text-muted); text-align:center; overflow-wrap:anywhere; }
        .dash-marine-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
        .dash-marine-item { border:1px solid var(--border-color); background:var(--surface); border-radius:var(--radius-md); padding:12px; min-width:0; }
        .dash-marine-name { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:.035em; }
        .dash-marine-value { font-size:clamp(17px,2.4vw,23px); font-weight:900; color:var(--text-main); margin-top:7px; overflow-wrap:anywhere; font-variant-numeric:tabular-nums; }
        .dash-marine-meta { font-size:11px; color:var(--text-muted); margin-top:4px; overflow-wrap:anywhere; }
        .dash-tide-forecast-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:9px; border:0; border-radius:var(--radius-md); padding:13px 16px; background:var(--primary); color:#fff; font-weight:800; font-size:14px; cursor:pointer; margin:0 0 14px; }
        .dash-tide-forecast-btn:active { transform:scale(.99); }
        .dash-tide-modal { position:fixed; inset:0; z-index:10050; display:none; align-items:center; justify-content:center; padding:14px; background:rgba(0,0,0,.62); }
        .dash-tide-modal.open { display:flex; }
        .dash-tide-panel { width:min(900px,100%); max-height: min(90dvh,900px); overflow:auto; background:var(--background, var(--surface)); color:var(--text-main); border:1px solid var(--border-color); border-radius:16px; padding:20px; box-shadow:var(--shadow-lg,0 20px 60px rgba(0,0,0,.25)); }
        .dash-tide-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
        .dash-tide-close { border:0; background:transparent; color:var(--text-muted); font-size:25px; padding:4px 8px; cursor:pointer; }
        .dash-tide-chart { width:100%; min-height:190px; display:block; overflow:visible; }
        .dash-tide-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; margin-top:14px; }
        .dash-tide-event { border:1px solid var(--border-color); background:var(--surface); border-radius:10px; padding:11px; min-width:0; }
        .dash-tide-event strong { display:block; font-size:19px; margin-top:4px; }
        .dash-data-stale { color:var(--text-muted); font-size:11px; margin-top:10px; }
        #dash-meteomarino-status { margin: 4px 0 12px; }
        @media (min-width: 1200px) { .dash-scroll-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } .dash-scroll-grid #dash-card-turno-oggi { grid-column:span 2; } .dash-scroll-grid #dash-card-meteo { grid-column:span 1; } .dash-scroll-grid #dash-card-meteomarino { grid-column:1 / -1; } .dash-marine-grid { grid-template-columns:repeat(4,minmax(0,1fr)); } }
        @media (max-width: 700px) {
            #modal-dashboard-main { padding: calc(env(safe-area-inset-top, 0px) + 12px) 14px calc(env(safe-area-inset-bottom, 0px) + 12px); box-sizing: border-box; align-items: center; justify-content: center; }
            .dash-modal-content { width: calc(100vw - 28px) !important; height: min(88dvh, 820px) !important; max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px); border-radius: 22px !important; padding: 16px !important; }
            .dash-modal-close { top: 10px; right: 10px; width: 40px; height: 40px; }
            .dash-modal-content > h3 { padding-right: 48px; }
            .dash-scroll-grid { grid-template-columns:minmax(0,1fr); gap:11px; }
            .dash-scroll-grid > * { grid-column:1 / -1 !important; }
            .dash-marine-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
            .dash-meteo-current { gap:8px; }
            .dash-meteo-feature { padding:11px 8px; }
            .dash-tide-panel { max-height:calc(100dvh - 20px); padding:15px; border-radius:12px; }
        }
        @media (max-width: 380px) { .dash-marine-grid { grid-template-columns:1fr 1fr; } .dash-tide-list { grid-template-columns:1fr; } }
    </style>

    <div id="modal-dashboard-main" class="modal-overlay" style="display:none;" onclick="window.chiudiSuSfondo(event, 'modal-dashboard-main')">
        <div class="modal-content dash-modal-content" style="display: flex; flex-direction: column; padding: 20px; position: relative;">
            <button type="button" class="dash-modal-close" aria-label="Chiudi dashboard" title="Chiudi" onclick="document.getElementById('modal-dashboard-main').style.display='none'"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            
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

            <div class="dash-scroll-grid">
                
                <div id="dash-alert-varianti" class="dash-alert dash-alert-warning">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 24px; color: #ffc107;"></i>
                    <span id="dash-varianti-text"></span>
                </div>

                <div class="dash-card" id="dash-card-turno-oggi">
                    <div class="dash-turno-title">TURNO DI OGGI</div>
                    <div id="dash-turno-view"></div>
                </div>

                <div id="dash-alert-pioggia" class="dash-alert dash-alert-danger">
                    <i class="fa-solid fa-cloud-showers-heavy" style="font-size: 24px;"></i>
                    <span>Prepara la cerata, oggi è prevista pioggia!</span>
                </div>

                <div id="dash-promemoria-container" style="display: none; width: 100%;"></div>

                <div class="dash-card" id="dash-card-meteo" style="text-align: left;">
                    <div class="dash-turno-title">METEO VENEZIA</div>
                    <div id="dash-daily-weather-container"></div>
                    <div id="dash-weather-container" class="dash-hourly-weather">
                        <div style="text-align:center; width:100%;"><i class="fa-solid fa-spinner fa-spin" style="color: var(--primary);"></i></div>
                    </div>
                </div>

                <div id="dash-card-meteomarino" class="dash-card" style="text-align:left;">
                    <div class="dash-turno-title"><i class="fa-solid fa-water"></i> METEO MARINO · LAGUNA DI VENEZIA</div>
                    <div id="dash-meteomarino-status" class="dash-data-stale">Caricamento dati CPSM…</div>
                    <button type="button" class="dash-tide-forecast-btn" onclick="window.apriPrevisioniMarea()"><i class="fa-solid fa-chart-line"></i> Previsioni marea</button>
                    <div id="dash-meteomarino-current"></div>
                    <div id="dash-meteomarino-grid" class="dash-marine-grid"></div>
                </div>
            </div>
        </div>
    </div>

    <div id="dash-tide-modal" class="dash-tide-modal" onclick="if(event.target===this) window.chiudiPrevisioniMarea()">
        <div class="dash-tide-panel" role="dialog" aria-modal="true" aria-labelledby="dash-tide-title">
            <div class="dash-tide-head">
                <div><div id="dash-tide-title" style="font-size:20px;font-weight:900;color:var(--primary);"><i class="fa-solid fa-chart-line"></i> Previsioni marea</div><div style="font-size:12px;color:var(--text-muted);margin-top:3px;">CPSM · Punta della Salute</div></div>
                <button class="dash-tide-close" type="button" aria-label="Chiudi" onclick="window.chiudiPrevisioniMarea()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="dash-tide-chart-wrap"><div class="dash-data-stale">Caricamento previsioni…</div></div>
            <div id="dash-tide-list" class="dash-tide-list"></div>
            <div id="dash-tide-updated" class="dash-data-stale"></div>
        </div>
    </div>

    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);

}

// ==========================================
// 2. MOTORE LOGICO DASHBOARD
// ==========================================
export function avviaMotoreDashboard(db, auth, userDataPrivate) {
    let dataCorrente = new Date();
    let globalRotCache = null;
    let globalVariantiCache = null;
    let datiTurni = null;
    let cacheMeteomarinoDashboard = null;
    let meteomarinoDashboardUltimoFetch = 0;
    let meteomarinoDashboardInCaricamento = false;

    // la visualizzazione del turno (riepilogo, timeline, corse, immagine) vive in turno-view.js
    const vistaTurno = creaVistaTurno(document.getElementById('dash-turno-view'));

    // HELPER FUNZIONI
    function dataIt(iso) { return iso.split('-').reverse().join('/'); }


    async function initCaches() {
        if (datiTurni) return;
        try {
            // un solo scaricamento condiviso con calendario e gps (vedi turni-core.js)
            datiTurni = await caricaDatiTurni();
            globalRotCache = datiTurni.rot; globalVariantiCache = datiTurni.varianti;
        } catch (e) { console.error("Errore cache", e); }
    }


    function calcolaTurnoBase(dStr, cfgData) {
        return calcolaTurnoCore(dStr, cfgData, { rot: globalRotCache, disp: datiTurni && datiTurni.disp });
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
        
        vistaTurno.carica({ codice: mioTurnoOggi, data: dStr, variante: haVarianti });

        caricaPromemoriaDashboard(dStr);
        aggiornaMeteo(dStr);
        aggiornaMeteomarinoDashboard();
    }




    function testoSicuroMeteo(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    }

    const COORD_PUNTA_MAREA = { lat: 45.4371, lon: 12.3326 };
    function distanzaMeteoKm(a, b) {
        if (!Number.isFinite(a?.latitudine) || !Number.isFinite(a?.longitudine)) return Infinity;
        const rad = x => x * Math.PI / 180;
        const dLat = rad(a.latitudine - b.lat), dLon = rad(a.longitudine - b.lon);
        const h = Math.sin(dLat/2)**2 + Math.cos(rad(b.lat))*Math.cos(rad(a.latitudine))*Math.sin(dLon/2)**2;
        return 6371 * 2 * Math.asin(Math.sqrt(h));
    }
    function stazioneMeteoPerTipo(tipo, stazioni, preferisciPunta = false) {
        const valide = (stazioni || []).filter(st => {
            const rec = st.dati?.[tipo];
            if (!rec || rec.valore === null || rec.valore === undefined) return false;
            if (tipo === 'vento') return rec.velocitaMs !== null || rec.direzioneGradi !== null;
            return true;
        });
        if (!valide.length) return null;
        if (preferisciPunta) {
            const punta = valide.find(st => /punta\s*della\s*salute/i.test(st.nome || ''));
            if (punta) return punta;
        }
        const ordinate = valide.sort((a,b) => distanzaMeteoKm(a, COORD_PUNTA_MAREA) - distanzaMeteoKm(b, COORD_PUNTA_MAREA));
        if (tipo === 'vento') {
            const conVentoAttivo = ordinate.find(st => Number(st.dati?.vento?.velocitaMs) > 0);
            if (conVentoAttivo) return conVentoAttivo;
        }
        return ordinate[0];
    }
    function formattaOraMeteo(value) {
        if (!value) return 'orario non disponibile';
        const d = new Date(String(value).replace(' ', 'T'));
        return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('it-IT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
    }
    function formattaNumeroMeteo(value, decimali = 1) {
        return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('it-IT', { maximumFractionDigits:decimali, minimumFractionDigits:0 }) : '—';
    }
    function creaSchedaMeteo(titolo, valore, unita, stazione, data) {
        return `<div class="dash-marine-item"><div class="dash-marine-name">${testoSicuroMeteo(titolo)}</div><div class="dash-marine-value">${valore}${unita ? `<span style="font-size:12px;font-weight:700;color:var(--text-muted);margin-left:4px;">${unita}</span>` : ''}</div><div class="dash-marine-meta">${testoSicuroMeteo(stazione || 'Stazione non indicata')}${data ? ` · ${testoSicuroMeteo(formattaOraMeteo(data))}` : ''}</div></div>`;
    }
    function renderMeteomarinoDashboard() {
        const status = document.getElementById('dash-meteomarino-status');
        const current = document.getElementById('dash-meteomarino-current');
        const grid = document.getElementById('dash-meteomarino-grid');
        if (!status || !current || !grid) return;
        const payload = cacheMeteomarinoDashboard;
        if (!payload?.stazioni) {
            status.textContent = 'Dati meteomarini momentaneamente non disponibili.';
            current.innerHTML = ''; grid.innerHTML = ''; return;
        }
        const stazioni = payload.stazioni;
        const stMarea = stazioneMeteoPerTipo('livello', stazioni, true);
        const stVento = stazioneMeteoPerTipo('vento', stazioni);
        const marea = stMarea?.dati?.livello;
        const vento = stVento?.dati?.vento;
        const trend = stMarea?.andamentoMarea;
        const crescente = Number.isFinite(Number(trend?.deltaCm)) && Number(trend.deltaCm) > 0;
        const direzioneMarea = trend?.deltaCm == null ? 'andamento in rilevamento' : (crescente ? 'Marea in crescita' : 'Marea in calo');
        const arrowMarea = trend?.deltaCm == null ? '↕' : (crescente ? '↑' : '↓');
        const classeMarea = trend?.deltaCm == null ? '' : (crescente ? 'up' : 'down');
        const dir = vento?.direzioneGradi == null ? NaN : Number(vento.direzioneGradi);
        const arrowWind = Number.isFinite(dir) ? `<span class="dash-meteo-arrow" style="transform:rotate(${dir}deg);color:#0ea5e9;" title="Direzione ${testoSicuroMeteo(vento.direzioneCardinale || '')}">↑</span>` : '';
        current.innerHTML = `<div class="dash-meteo-current">\n            <div class="dash-meteo-feature"><div class="dash-meteo-feature-label"><i class="fa-solid fa-water"></i> Marea attuale</div><div class="dash-meteo-feature-value"><span class="dash-meteo-arrow ${classeMarea}">${arrowMarea}</span>${marea?.valoreCm == null ? '—' : `${formattaNumeroMeteo(marea.valoreCm,1)} <small style="font-size:15px;">cm</small>`}</div><div class="dash-meteo-sub">${direzioneMarea} · ${testoSicuroMeteo(stMarea?.nome || 'Stazione non disponibile')}</div></div>\n            <div class="dash-meteo-feature"><div class="dash-meteo-feature-label"><i class="fa-solid fa-wind"></i> Vento attuale</div><div class="dash-meteo-feature-value">${arrowWind}${vento?.velocitaMs == null ? '—' : `${formattaNumeroMeteo(vento.velocitaMs * 3.6,1)} <small style="font-size:15px;">km/h</small>`}</div><div class="dash-meteo-sub">${testoSicuroMeteo(vento?.direzioneCardinale || 'Direzione n/d')} · ${testoSicuroMeteo(stVento?.nome || 'Stazione non disponibile')}${vento?.velocitaMassimaMs == null ? '' : ` · valore aggiuntivo ${formattaNumeroMeteo(vento.velocitaMassimaMs,1)} m/s`}</div></div>\n        </div>`;
        const items = [
            ['Pressione','pressione','hPa',v=>formattaNumeroMeteo(v,1)],
            ['Radiazione solare','radiazione','W/m²',v=>formattaNumeroMeteo(v,0)],
            ['Temperatura aria','temperaturaAria','°C',v=>formattaNumeroMeteo(v,1)],
            ['Temperatura acqua','temperaturaAcqua','°C',v=>formattaNumeroMeteo(v,1)],
            ['Umidità','umidita','%',v=>formattaNumeroMeteo(v,0)],
            ['Onde in laguna','ondeLaguna','m',v=>v?.significativaM == null ? '—' : `${formattaNumeroMeteo(v.significativaM,2)} <small style="font-size:12px;color:var(--text-muted);">sign. · max ${formattaNumeroMeteo(v.massimaM,2)}</small>`],
            ['Onde in mare','ondeMare','m',v=>v?.significativaM == null ? '—' : `${formattaNumeroMeteo(v.significativaM,2)} <small style="font-size:12px;color:var(--text-muted);">sign. · max ${formattaNumeroMeteo(v.massimaM,2)}</small>`],
        ];
        grid.innerHTML = items.map(([label,tipo,unita,fmt]) => {
            const st = stazioneMeteoPerTipo(tipo, stazioni);
            const rec = st?.dati?.[tipo];
            const v = rec?.valore;
            const valore = v && typeof v === 'object' ? fmt(v) : fmt(v);
            return creaSchedaMeteo(label, valore, unita, st?.nome, rec?.data);
        }).join('');
        const stato = payload.stato?.stato || 'dati ricevuti';
        const updated = payload.stato?.ultimoAggiornamento ? new Date(payload.stato.ultimoAggiornamento).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) : '—';
        status.textContent = `Fonte CPSM · aggiornamento ${updated} · stato ${stato}`;
    }
    async function aggiornaMeteomarinoDashboard(forza = false) {
        if (meteomarinoDashboardInCaricamento || (!forza && Date.now() - meteomarinoDashboardUltimoFetch < 5 * 60 * 1000)) return;
        meteomarinoDashboardInCaricamento = true;
        try {
            const response = await fetch(`${API_URL}/api/meteomarino`, { cache:'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            cacheMeteomarinoDashboard = await response.json();
            meteomarinoDashboardUltimoFetch = Date.now();
            renderMeteomarinoDashboard();
            renderPrevisioniMareaDashboard();
        } catch (e) {
            console.warn('Dashboard: dati meteomarini non disponibili:', e.message);
            const status = document.getElementById('dash-meteomarino-status');
            if (status) status.textContent = 'Impossibile caricare i dati CPSM. Riproverò automaticamente.';
        } finally { meteomarinoDashboardInCaricamento = false; }
    }
    function formattaDataPrevisione(ts, completa = false, dataOra = null) {
        const d = dataOra ? new Date(String(dataOra).replace(' ', 'T')) : (ts ? new Date(ts) : null);
        if (!d || Number.isNaN(d.getTime())) return 'Data non disponibile';
        return d.toLocaleString('it-IT', completa ? {weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'} : {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    }
    function renderPrevisioniMareaDashboard() {
        const wrap = document.getElementById('dash-tide-chart-wrap');
        const list = document.getElementById('dash-tide-list');
        const updated = document.getElementById('dash-tide-updated');
        if (!wrap || !list || !updated || !cacheMeteomarinoDashboard) return;
        const previsioni = (cacheMeteomarinoDashboard.previsioni || []).filter(p => Number.isFinite(Number(p.valoreCm)) && Number.isFinite(Number(p.timestamp))).sort((a,b)=>a.timestamp-b.timestamp);
        if (!previsioni.length) { wrap.innerHTML = '<div class="dash-data-stale">Previsioni non disponibili al momento.</div>'; list.innerHTML=''; return; }
        const W=820,H=240,L=48,R=18,T=18,B=38;
        const vals=previsioni.map(p=>Number(p.valoreCm));
        const min=Math.min(0,...vals)-5, max=Math.max(...vals)+5, span=Math.max(1,max-min);
        const x=i=>L+(previsioni.length===1?0:i*(W-L-R)/(previsioni.length-1));
        const y=v=>T+(max-v)*(H-T-B)/span;
        const points=previsioni.map((p,i)=>`${x(i).toFixed(1)},${y(Number(p.valoreCm)).toFixed(1)}`).join(' ');
        const ticks=[min,(min+max)/2,max].map(v=>`<g><line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="var(--border-color)" stroke-dasharray="4 5"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" fill="var(--text-muted)" font-size="11">${Math.round(v)}</text></g>`).join('');
        const circles=previsioni.map((p,i)=>`<circle cx="${x(i)}" cy="${y(Number(p.valoreCm))}" r="5" fill="${String(p.tipoEstremale).toLowerCase().includes('min')?'#0ea5e9':'#f59e0b'}"><title>${formattaDataPrevisione(p.timestamp,true,p.dataOra)} · ${formattaNumeroMeteo(p.valoreCm,0)} cm</title></circle>`).join('');
        const labels=previsioni.map((p,i)=> i===0 || i===previsioni.length-1 || i%Math.ceil(previsioni.length/6)===0 ? `<text x="${x(i)}" y="${H-9}" text-anchor="middle" fill="var(--text-muted)" font-size="10">${new Date(String(p.dataOra || '').replace(' ','T') || p.timestamp).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'})}</text>` : '').join('');
        wrap.innerHTML=`<div style="font-size:12px;color:var(--text-muted);margin-bottom:5px;">Altezza prevista in centimetri</div><svg class="dash-tide-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafico delle previsioni di marea">${ticks}<polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}${labels}</svg><div style="display:flex;gap:15px;flex-wrap:wrap;font-size:11px;color:var(--text-muted);"><span>🟠 Alta marea</span><span>🔵 Bassa marea</span></div>`;
        list.innerHTML=previsioni.map(p=>`<div class="dash-tide-event"><div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;">${testoSicuroMeteo(p.tipoEstremale || 'Previsione')}</div><strong>${formattaNumeroMeteo(p.valoreCm,0)} cm</strong><div style="font-size:12px;color:var(--text-muted);margin-top:3px;">${testoSicuroMeteo(formattaDataPrevisione(p.timestamp,true,p.dataOra))}</div></div>`).join('');
        updated.textContent = `Previsioni pubblicate: ${previsioni[0].dataPrevisione || '—'} · Fonte: CPSM Comune di Venezia`;
    }
    window.apriPrevisioniMarea = function() {
        const modal = document.getElementById('dash-tide-modal');
        if (modal) modal.classList.add('open');
        aggiornaMeteomarinoDashboard();
        renderPrevisioniMareaDashboard();
    };
    window.chiudiPrevisioniMarea = function() {
        const modal = document.getElementById('dash-tide-modal');
        if (modal) modal.classList.remove('open');
    };
    setInterval(() => aggiornaMeteomarinoDashboard(), 5 * 60 * 1000);

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

    aggiornaVistaDashboard();
}
