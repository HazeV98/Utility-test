// dati_calendario.js - Modulo Statistiche con UI iniettata dinamicamente

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const statisticheHTML = `
<style id="stat-specific-styles">
    .results-container { display: none; background: var(--surface); padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); border: 1px solid var(--border-color); margin-top: 20px; }
    .results-title { color: var(--text-main); font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; display:flex; align-items:center; gap:8px; }
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border-color); }
    .stat-row:last-child { border-bottom: none; padding-bottom: 0;}
    .stat-label { font-size: 14px; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 10px; }
    .stat-label i { width: 20px; text-align: center; font-size: 16px; }
    .stat-value { font-size: 16px; font-weight: 700; color: var(--text-main); background: var(--surface-hover); padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border-color); min-width: 30px; text-align: center;}
    
    .color-ferie { color: var(--success); }
    .color-parentale { color: var(--info); }
    .color-sospeso { color: var(--danger); }
    .color-nebbia { color: var(--primary); }
    .color-malattia { color: var(--warning); }
    .color-sangue { color: var(--danger); }
    .color-straord { color: var(--primary); }
    .color-sp { color: var(--text-muted); }
</style>

<div id="modal-statistiche-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-statistiche-main')">
    <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
        <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-statistiche-main')"></i>
        
        <h3 style="margin-top: 0; color: var(--text-main); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
            <i class="fa-solid fa-chart-simple" style="color:var(--primary);"></i> Statistiche
        </h3>

        <div style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column;">
            
            <div style="background: var(--surface); padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 12px;">
                <div>
                    <label class="editor-label">Da (Inizio):</label>
                    <input type="date" id="stat-dateStart" class="input-field" style="margin-bottom:0; text-transform:none;">
                </div>
                <div>
                    <label class="editor-label">A (Fine):</label>
                    <input type="date" id="stat-dateEnd" class="input-field" style="margin-bottom:8px; text-transform:none;">
                    <div style="font-size: 13px; color: var(--text-muted); margin-top: -4px;">Lascia vuoti i campi per calcolare i dati totali registrati.</div>
                </div>
                <button class="btn-action" style="margin-top:5px;" onclick="window.calcolaStatistiche(false)"><i class="fa-solid fa-calculator"></i> Calcola Statistiche</button>
            </div>

            <div id="stat-results" class="results-container">
                <h3 class="results-title" id="stat-titoloRisultati"><i class="fa-solid fa-square-poll-vertical" style="color:var(--primary);"></i> Risultati Totali</h3>
                
                <div class="stat-row">
                    <div class="stat-label"><i class="fa-solid fa-umbrella-beach color-ferie"></i> Ferie (FER)</div>
                    <div class="stat-value" id="stat-resFerie">0</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><i class="fa-solid fa-baby-carriage color-parentale"></i> Congedi Parentali (KNOP)</div>
                    <div class="stat-value" id="stat-resParentali">0</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><i class="fa-solid fa-circle-exclamation color-sospeso"></i> Sospesi Riposo</div>
                    <div class="stat-value" id="stat-resSospesi">0</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><i class="fa-solid fa-smog color-nebbia"></i> Indennità Nebbia</div>
                    <div class="stat-value" id="stat-resNebbia">0</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><i class="fa-solid fa-house-medical color-malattia"></i> Malattia (KMAL)</div>
                    <div class="stat-value" id="stat-resMalattia">0</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><i class="fa-solid fa-droplet color-sangue"></i> Donazione Sangue</div>
                    <div class="stat-value" id="stat-resSangue">0</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><i class="fa-solid fa-stopwatch color-straord"></i> Ore Straordinario</div>
                    <div class="stat-value" id="stat-resStraord">0h 0m</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><i class="fa-solid fa-money-bill-transfer color-sp"></i> Permesso Senza Paga</div>
                    <div class="stat-value" id="stat-resPermessoSP">0h 0m</div>
                </div>
            </div>
            
        </div>
    </div>
</div>
`;

export function avviaMotoreStatistiche(db, auth) {
    if (!document.getElementById('modal-statistiche-main')) {
        document.body.insertAdjacentHTML('beforeend', statisticheHTML);
    }
    
    document.getElementById('modal-statistiche-main').style.display = 'flex';
    
    // 1. Esegue un primo calcolo istantaneo usando la cache locale
    window.calcolaStatistiche(true);

    // 2. Se l'utente è loggato, scarica i dati aggiornati dal Cloud in background e ricalcola
    if (auth && auth.currentUser) {
        syncStatisticheDaCloud(db, auth.currentUser.uid);
    }
}

window.apriModaleStatistiche = (db, auth) => avviaMotoreStatistiche(db, auth);

async function syncStatisticheDaCloud(db, uid) {
    try {
        const docRef = doc(db, "utenti", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let datiCloud = docSnap.data();
            let datiLocali = JSON.parse(localStorage.getItem('myTurniApp')) || {};
            let stateAggiornato = { ...datiLocali, ...datiCloud }; 
            localStorage.setItem('myTurniApp', JSON.stringify(stateAggiornato)); 
            window.calcolaStatistiche(true);
        }
    } catch(e) { console.error("Errore Sync Cloud Statistiche:", e); }
}

window.calcolaStatistiche = function(isAutoLoad = false) {
    const startInput = document.getElementById('stat-dateStart');
    const endInput = document.getElementById('stat-dateEnd');
    
    if (!startInput || !endInput) return;

    const startStr = startInput.value;
    const endStr = endInput.value;

    if ((startStr && !endStr) || (!startStr && endStr)) {
        if (!isAutoLoad) alert("Seleziona entrambe le date, oppure lasciale entrambe vuote per i dati totali.");
        return;
    }

    if (startStr && endStr && startStr > endStr) {
        if (!isAutoLoad) alert("La data d'inizio deve essere precedente alla fine!");
        return;
    }

    let state = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {}, straordinario: {}, sospesoRiposo: {}, nebbia: {}, permessoSP: {} };
    
    let stats = { ferie: 0, parentali: 0, sospesi: 0, nebbia: 0, malattia: 0, sangue: 0, straordMinutiTotali: 0, permessoSPMinutiTotali: 0 };
    let dateArray = [];

    if (!startStr && !endStr) {
        let allDates = new Set([
            ...Object.keys(state.variazioni || {}),
            ...Object.keys(state.sospesoRiposo || {}),
            ...Object.keys(state.straordinario || {}),
            ...Object.keys(state.nebbia || {}),
            ...Object.keys(state.permessoSP || {})
        ]);
        dateArray = Array.from(allDates);
        
        if (dateArray.length === 0 && !isAutoLoad) alert("Nessun dato registrato nel calendario.");
        
        const titoloRisultati = document.getElementById('stat-titoloRisultati');
        if (titoloRisultati) titoloRisultati.innerHTML = '<i class="fa-solid fa-square-poll-vertical" style="color:var(--primary);"></i> Risultati Totali Registrati';
    } else {
        let currentDate = new Date(startStr);
        let endDate = new Date(endStr);

        while (currentDate <= endDate) {
            let dStr = currentDate.getFullYear() + "-" + String(currentDate.getMonth() + 1).padStart(2, '0') + "-" + String(currentDate.getDate()).padStart(2, '0');
            dateArray.push(dStr);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const titoloRisultati = document.getElementById('stat-titoloRisultati');
        if (titoloRisultati) titoloRisultati.innerHTML = '<i class="fa-solid fa-calendar-day" style="color:var(--primary);"></i> Risultati del periodo';
    }

    dateArray.forEach(dStr => {
        let varTurno = state.variazioni && state.variazioni[dStr] ? state.variazioni[dStr].toUpperCase() : "";

        let isSospesoSpuntato = state.sospesoRiposo && state.sospesoRiposo[dStr];
        let isSospesoTesto = (varTurno === "SOSPESO" || varTurno === "SOR");
        if (isSospesoSpuntato || isSospesoTesto) stats.sospesi++;
        if (state.nebbia && state.nebbia[dStr]) stats.nebbia++;
        if (varTurno === "KNOP" || varTurno.includes("KNOP")) stats.parentali++;
        if (varTurno.includes("FER") || varTurno === "FERIE") stats.ferie++;
        if (varTurno.includes("KMAL") || varTurno === "MALATTIA") stats.malattia++;
        if (varTurno.includes("AVIS") || varTurno === "AVIS") stats.sangue++;

        if (state.straordinario && state.straordinario[dStr]) {
            let h = parseInt(state.straordinario[dStr].ore) || 0;
            let m = parseInt(state.straordinario[dStr].minuti) || 0;
            stats.straordMinutiTotali += (h * 60) + m;
        }
        if (state.permessoSP && state.permessoSP[dStr]) {
            let hSP = parseInt(state.permessoSP[dStr].ore) || 0;
            let mSP = parseInt(state.permessoSP[dStr].minuti) || 0;
            stats.permessoSPMinutiTotali += (hSP * 60) + mSP;
        }
    });

    const resFerie = document.getElementById('stat-resFerie');
    if (resFerie) {
        resFerie.innerText = stats.ferie;
        document.getElementById('stat-resParentali').innerText = stats.parentali;
        document.getElementById('stat-resSospesi').innerText = stats.sospesi;
        document.getElementById('stat-resNebbia').innerText = stats.nebbia;
        document.getElementById('stat-resMalattia').innerText = stats.malattia;
        document.getElementById('stat-resSangue').innerText = stats.sangue;

        let finalHours = Math.floor(stats.straordMinutiTotali / 60);
        let finalMins = stats.straordMinutiTotali % 60;
        document.getElementById('stat-resStraord').innerText = `${finalHours}h ${finalMins}m`;

        let finalHoursSP = Math.floor(stats.permessoSPMinutiTotali / 60);
        let finalMinsSP = stats.permessoSPMinutiTotali % 60;
        document.getElementById('stat-resPermessoSP').innerText = `${finalHoursSP}h ${finalMinsSP}m`;

        document.getElementById('stat-results').style.display = 'block';
    }
};
