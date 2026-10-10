import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
    DATA_INIZIO_NUOVI_TURNI, dateToLocalISO, creaDataSicura, convertiTurnoPerMansione,
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

                <div class="dash-card" id="dash-card-turno-oggi">
                    <div class="dash-turno-title">TURNO DI OGGI</div>
                    <div id="dash-turno-view"></div>
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

    // la visualizzazione del turno (riepilogo, timeline, corse, immagine) vive in turno-view.js
    const vistaTurno = creaVistaTurno(document.getElementById('dash-turno-view'));

    // HELPER FUNZIONI
    function capitalizzaIniziali(str) { if (!str) return ""; return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
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

    aggiornaVistaDashboard();
}
