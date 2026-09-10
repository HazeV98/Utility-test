import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
        .dash-turno-value { font-size: 36px; font-weight: 900; color: var(--primary); margin-bottom: 15px; }
        
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
                <i class="fa-solid fa-gauge-high"></i> Dashboard
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

                <div class="dash-card">
                    <div class="dash-turno-title">TURNO DI OGGI</div>
                    <div id="dash-turno-val" class="dash-turno-value">
                        <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary);"></i>
                    </div>
                    <button id="dash-btn-vedi-turno" class="btn-action" style="width: 100%; display: none;"><i class="fa-solid fa-image"></i> Vedi Turno</button>
                    <div id="dash-avviso-vedi-turno" style="display: none; background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; padding: 10px; border-radius: var(--radius-sm); color: #856404; font-size: 13px; font-weight: bold;">
                        <i class="fa-solid fa-circle-exclamation"></i> Variante in corso: vedi il turno corretto nella sezione turni.
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

                <!-- Container Promemoria (sopra il meteo) -->
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
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================
// 2. MOTORE LOGICO DASHBOARD
// ==========================================
export function avviaMotoreDashboard(db, auth, userDataPrivate) {
    let dataCorrente = new Date();
    let globalRotCache = null;
    let globalDbCache = null;
    let globalVariantiCache = null;
    const DATA_INIZIO_NUOVI_TURNI = "2026-06-01"; 

    let pzDashboard = null;
    let currentImagePathDash = "";
    let imgBaseFallbackDash = "";

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

    function dateToLocalISO(d) { 
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'); 
    }

    function stringToNum(s) { 
        if(!s) return 0; 
        let p = s.split('-'); 
        return Math.floor(Date.UTC(p[0], p[1]-1, p[2]) / 86400000); 
    }

    function creaDataSicura(dataStr) { 
        if(!dataStr) return new Date(); 
        let p = dataStr.split('-'); 
        return new Date(p[0], p[1] - 1, p[2], 12, 0, 0); 
    }

    function capitalizzaIniziali(str) {
        if (!str) return "";
        return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }

    // --- HELPER CONVERSIONE MANSIONE ---
    function convertiTurnoPerMansione(turno, mansione) {
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

    async function initCaches() {
        if (globalRotCache && globalDbCache && globalVariantiCache) return;
        globalRotCache = {}; globalDbCache = {}; globalVariantiCache = {};
        try {
            const resMap = await fetch("mappa_file.json?v=" + Date.now());
            if (resMap.ok) {
                const mappa = await resMap.json();
                const fetchPromises = [];
                for (let file of mappa.albero || []) {
                    const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);
                    if (file.startsWith("rotazioni_") && dateMatch) {
                        fetchPromises.push(fetch(file + "?v=" + Date.now()).then(r => r.json()).then(d => globalRotCache[dateMatch[0]] = d).catch(()=>{}));
                    } else if (file.startsWith("info_turni_") && dateMatch) {
                        fetchPromises.push(fetch(file + "?v=" + Date.now()).then(r => r.json()).then(d => globalDbCache[dateMatch[0]] = d).catch(()=>{}));
                    }
                }
                if (mappa.albero && mappa.albero.includes("presenza_varianti.json")) {
                    fetchPromises.push(fetch("presenza_varianti.json?v=" + Date.now()).then(r => r.json()).then(d => globalVariantiCache = d).catch(()=>{}));
                }
                await Promise.all(fetchPromises);
            }
        } catch (e) { console.error("Errore cache", e); }
    }

    function isGiornoRiposoBase(curr, cfg) { 
        if (!cfg.riposoStart) return false; 
        let ref = stringToNum(cfg.riposoStart); 
        if (cfg.depositoAttivo === 'disp_det') return (((curr - ref) % 6 + 6) % 6 === 0); 
        let pos = ((curr - ref + 6) % 15 + 15) % 15; 
        return (pos === 6 || pos === 13 || pos === 14); 
    }

    function calcolaTurnoBase(dStr, cfgData) {
        if (!cfgData || !cfgData.depositoAttivo || !cfgData.riposoStart) return "N/D";
        let curr = stringToNum(dStr);
        let isPastUpdate = (cfgData.history && curr < stringToNum(DATA_INIZIO_NUOVI_TURNI)); 
        let cfgBase = isPastUpdate ? cfgData.history : cfgData;
        
        if (isGiornoRiposoBase(curr, cfgBase)) {
            let tituloRiposo = 'RI'; 
            if (cfgBase.riposoStart && cfgBase.depositoAttivo !== 'disp_det') { 
                let ref = stringToNum(cfgBase.riposoStart); 
                let pos = ((curr - ref + 6) % 15 + 15) % 15; 
                if (pos === 13) tituloRiposo = 'AL'; 
            }
            return tituloRiposo;
        }

        if (cfgBase.depositoAttivo.startsWith('disp_')) return "DISP";

        if (cfgBase.rotazioneStart) {
            let activeCfg = (cfgData.futureConfig && curr >= stringToNum(cfgData.futureConfig.dataInizio)) 
                ? { start: cfgData.futureConfig.dataInizio, idx: cfgData.futureConfig.turnoIndex, tcPattern: cfgData.futureConfig.tcPattern } 
                : { start: cfgBase.rotazioneStart, idx: cfgBase.turnoIndex, tcPattern: cfgBase.tcPattern };
            
            let refRot = stringToNum(activeCfg.start), w = 0; 
            if (curr >= refRot) { for (let j = refRot; j < curr; j++) { if (!isGiornoRiposoBase(j, cfgBase)) w++; } } 
            else { for (let j = refRot; j > curr; j--) { if (!isGiornoRiposoBase(j, cfgBase)) w--; } }
            
            let refRip = stringToNum(cfgBase.riposoStart); 
            let startPos = ((refRot - refRip + 6) % 15 + 15) % 15; 
            let offset = [1, 3, 5, 8, 10, 12].includes(startPos) ? 1 : 0;
            
            let rotList = [];
            if (globalRotCache) {
                const dateChiavi = Object.keys(globalRotCache).sort();
                let rotCorrente = dateChiavi.length > 0 ? globalRotCache[dateChiavi[0]] : null; 
                for (let i = dateChiavi.length - 1; i >= 0; i--) { 
                    if (curr >= stringToNum(dateChiavi[i])) { rotCorrente = globalRotCache[dateChiavi[i]]; break; } 
                }
                if (rotCorrente && rotCorrente[cfgBase.depositoAttivo]) { rotList = rotCorrente[cfgBase.depositoAttivo]; }
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
                    if (isAlternato) { 
                        let dispOnEven = (cfgBase.depositoAttivo === 'tc_spez_lido'); 
                        if (dispOnEven && k % 2 === 0) t = "DISP"; 
                        if (!dispOnEven && k % 2 !== 0) t = "DISP"; 
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
                        } else { expandedRotList.push(currentTurn); expandedRotList.push(currentTurn); } 
                    }
                    let L_exp = expandedRotList.length; 
                    let baseExpIdx = originalToExpanded[activeCfg.idx]; 
                    let blockStartIdx = baseExpIdx - (baseExpIdx % 2); 
                    let idxExp = (blockStartIdx + w + offset) % L_exp; 
                    if (idxExp < 0) idxExp += L_exp; 
                    return expandedRotList[idxExp];
                }
            }
        }
        return "N/D";
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

    function trovaChiaveEsatta(dbLocal, codiceBase, dateStr) {
        if (!dbLocal || !codiceBase) return codiceBase;
        let codiciDaCercare = [codiceBase];
        let matchB = codiceBase.match(/^([1-9])B(\d{2})$/);
        if (matchB) {
            let linea = matchB[1]; let finale = matchB[2];
            let letteraPilota = (linea === '1' || linea === '2') ? 'C' : 'P';
            let regex = new RegExp(`^${linea}[A-Z]${finale}$`);
            let trovati = Object.keys(dbLocal).filter(k => regex.test(k));
            if (trovati.length > 0) codiciDaCercare.push(...trovati);
            else codiciDaCercare.push(`${linea}${letteraPilota}${finale}`);
        } else {
            let match50 = codiceBase.match(/^([A-Z0-9]+?)(\d{2})$/);
            if (match50) {
                let pref = match50[1]; let num = parseInt(match50[2], 10);
                if (num >= 50) codiciDaCercare.push(pref + String(num - 50).padStart(2, '0'));
            }
        }

        let giornoIdx = creaDataSicura(dateStr).getDay(); 
        let targetDay = giornoIdx === 0 ? 7 : giornoIdx; 
        const dayMap = { "LUN": 1, "MAR": 2, "MER": 3, "GIO": 4, "VEN": 5, "SAB": 6, "DOM": 7 };

        for (let codCercato of codiciDaCercare) {
            let keys = Object.keys(dbLocal).filter(k => k === codCercato || k.startsWith(codCercato + "_"));
            let exactMatch = null; let genericMatch = null;
            for (let k of keys) {
                if (k === codCercato) { genericMatch = k; continue; }
                let suffix = k.substring(codCercato.length + 1); 
                if (suffix.includes("-")) {
                    let parts = suffix.split("-");
                    if (parts.length === 2 && dayMap[parts[0]] && dayMap[parts[1]]) {
                        let start = dayMap[parts[0]]; let end = dayMap[parts[1]];
                        if (start <= end) { if (targetDay >= start && targetDay <= end) exactMatch = k; } 
                        else { if (targetDay >= start || targetDay <= end) exactMatch = k; }
                    }
                } else { if (dayMap[suffix] && dayMap[suffix] === targetDay) exactMatch = k; }
            }
            if (exactMatch) return exactMatch;
            if (genericMatch) return genericMatch;
        }
        return codiceBase; 
    }

    // --- FUNZIONE PER RECUPERARE PROMEMORIA DEL GIORNO ---
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
        request.onerror = function() {
            console.error("Errore IndexedDB in dashboard promemoria");
        };
    }

    // --- LOGICA UI PRINCIPALE ---
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
        
        document.getElementById('dash-turno-val').textContent = mioTurnoOggi || "N/D";
        
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
        
        const btnVedi = document.getElementById('dash-btn-vedi-turno');
        const avvisoVedi = document.getElementById('dash-avviso-vedi-turno');
        let isRiposo = (!mioTurnoOggi || ["RIPOSO", "RI", "DISP", "NPL", "AL", "FER", "FEP", "FES", "PRT", "KINF", "KMAL", "KNOP", "AVIS"].includes(mioTurnoOggi.toUpperCase().trim()));

        if (isRiposo) {
            btnVedi.style.display = "none";
            avvisoVedi.style.display = "none";
        } else {
            if (haVarianti) {
                btnVedi.style.display = "none";
                avvisoVedi.style.display = "block";
            } else {
                btnVedi.style.display = "block";
                avvisoVedi.style.display = "none";
                btnVedi.onclick = () => { apriImmagineDashboard(mioTurnoOggi, dStr); };
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
            
            // 1. Verifica se l'utente attuale ha dato il consenso alla rubrica
            const miaRubricaRef = doc(db, "rubrica", auth.currentUser.uid);
            const miaRubricaSnap = await getDoc(miaRubricaRef);
            const isCurrentUserInRubrica = miaRubricaSnap.exists();
            
            if (userSnap.exists() && userSnap.data().condivisioneVarianti === true) {
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

                // Modificato con for...of per supportare 'await' durante il loop
                for (let res of risultati) {
                    let turnoOriginaleBase = String(calcolaTurnoBase(dStr, res.calData) || "N/D");
                    turnoOriginaleBase = convertiTurnoPerMansione(turnoOriginaleBase, res.userData.mansione);
                    
                    let turnoManuale = res.calData.variazioni && res.calData.variazioni[dStr] ? String(res.calData.variazioni[dStr]) : null;
                    let turnoComp = turnoManuale !== null ? turnoManuale : turnoOriginaleBase;
                    
                    let stringaSicuraTurno = String(turnoComp).toUpperCase().replace(/\s+/g, '');
                    
                    let mTheir = String(res.userData.mansione || "").toLowerCase();
                    let isTheirMarinaio = mTheir.includes('marinaio') || mTheir.includes('timoniere');
                    
                    let isMate = false;
                    if (compagniPossibili.includes(stringaSicuraTurno)) {
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

                        // 2. Se l'utente attuale è in rubrica, controlla anche il compagno
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
                    // Utilizziamo innerHTML per iniettare correttamente i tag HTML delle icone
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

            let ciSaraPioggia = false;
            let htmlOrario = "";

            for (let i = 5; i <= 23; i += 2) {
                let temp = Math.round(data.hourly.temperature_2m[i]);
                let precProb = data.hourly.precipitation_probability[i];
                let wCode = data.hourly.weathercode[i];
                let timeStr = `${i.toString().padStart(2, '0')}:00`;

                if ((wCode >= 51 && wCode <= 67) || (wCode >= 80 && wCode <= 82) || wCode >= 95) ciSaraPioggia = true;

                let icona = '☀️';
                if (wCode >= 1 && wCode <= 3) icona = '⛅';
                if (wCode >= 45 && wCode <= 48) icona = '🌫️';
                if (wCode >= 51 && wCode <= 67) icona = '🌧️';
                if (wCode >= 71 && wCode <= 77) icona = '❄️';
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
            if (ciSaraPioggia || Math.max(...data.hourly.precipitation_probability) > 40) {
                alertDiv.style.display = 'flex';
            }
        } catch (e) {
            weatherContainer.innerHTML = '<div style="color:var(--danger); font-size:13px; text-align:center;">Errore caricamento meteo.</div>';
        }
    }

    // --- LOGICA VISUALIZZATORE ---
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
