// dati_calendario.js - Modulo per il calcolo delle statistiche del calendario

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function avviaMotoreStatistiche(db, auth) {
    // 1. Esegue un primo calcolo istantaneo usando la cache locale (localStorage)
    window.calcolaStatistiche(true);

    // 2. Se l'utente è loggato, scarica i dati aggiornati dal Cloud in background e ricalcola
    if (auth && auth.currentUser) {
        syncStatisticheDaCloud(db, auth.currentUser.uid);
    }
}

async function syncStatisticheDaCloud(db, uid) {
    try {
        const docRef = doc(db, "utenti", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let datiCloud = docSnap.data();
            let datiLocali = JSON.parse(localStorage.getItem('myTurniApp')) || {};
            
            // Fonde i dati locali con quelli scaricati dal cloud
            let stateAggiornato = { ...datiLocali, ...datiCloud }; 
            localStorage.setItem('myTurniApp', JSON.stringify(stateAggiornato)); 
            
            // Ricalcola le statistiche in modo invisibile all'utente
            window.calcolaStatistiche(true);
        }
    } catch(e) { 
        console.error("Errore Sync Cloud Statistiche:", e); 
    }
}

window.calcolaStatistiche = function(isAutoLoad = false) {
    const startInput = document.getElementById('dateStart');
    const endInput = document.getElementById('dateEnd');
    
    if (!startInput || !endInput) return; // Sicurezza nel caso il DOM non sia pronto

    const startStr = startInput.value;
    const endStr = endInput.value;

    // Avviso se si compila solo un campo
    if ((startStr && !endStr) || (!startStr && endStr)) {
        if (!isAutoLoad) alert("Seleziona entrambe le date, oppure lasciale entrambe vuote per i dati totali.");
        return;
    }

    if (startStr && endStr && startStr > endStr) {
        if (!isAutoLoad) alert("La data d'inizio deve essere precedente alla fine!");
        return;
    }

    let state = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {}, straordinario: {}, sospesoRiposo: {}, nebbia: {}, permessoSP: {} };
    
    let stats = {
        ferie: 0,
        parentali: 0,
        sospesi: 0,
        nebbia: 0,
        malattia: 0,
        sangue: 0,
        straordMinutiTotali: 0,
        permessoSPMinutiTotali: 0
    };

    let dateArray = [];

    // Se non ci sono date, calcola tutti i giorni che hanno variazioni o dati aggiuntivi
    if (!startStr && !endStr) {
        let allDates = new Set([
            ...Object.keys(state.variazioni || {}),
            ...Object.keys(state.sospesoRiposo || {}),
            ...Object.keys(state.straordinario || {}),
            ...Object.keys(state.nebbia || {}),
            ...Object.keys(state.permessoSP || {})
        ]);
        dateArray = Array.from(allDates);
        
        if (dateArray.length === 0 && !isAutoLoad) {
            alert("Nessun dato registrato nel calendario.");
        }
        
        const titoloRisultati = document.getElementById('titoloRisultati');
        if (titoloRisultati) {
            titoloRisultati.innerHTML = '<i class="fa-solid fa-square-poll-vertical" style="color:var(--primary);"></i> Risultati Totali Registrati';
        }
    } else {
        // Altrimenti, calcola le statistiche giorno per giorno nel periodo selezionato
        let currentDate = new Date(startStr);
        let endDate = new Date(endStr);

        while (currentDate <= endDate) {
            let dStr = currentDate.getFullYear() + "-" + 
                       String(currentDate.getMonth() + 1).padStart(2, '0') + "-" + 
                       String(currentDate.getDate()).padStart(2, '0');
            dateArray.push(dStr);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const titoloRisultati = document.getElementById('titoloRisultati');
        if (titoloRisultati) {
            titoloRisultati.innerHTML = '<i class="fa-solid fa-calendar-day" style="color:var(--primary);"></i> Risultati del periodo';
        }
    }

    // Calcolo effettivo sulle date selezionate o totali
    dateArray.forEach(dStr => {
        let varTurno = state.variazioni && state.variazioni[dStr] ? state.variazioni[dStr].toUpperCase() : "";

        // CALCOLA SOSPESO RIPOSO
        let isSospesoSpuntato = state.sospesoRiposo && state.sospesoRiposo[dStr];
        let isSospesoTesto = (varTurno === "SOSPESO" || varTurno === "SOR");
        let isSospesoRiposo = isSospesoSpuntato || isSospesoTesto;

        if (isSospesoRiposo) stats.sospesi++;

        // CALCOLA NEBBIA
        if (state.nebbia && state.nebbia[dStr]) stats.nebbia++;

        // CALCOLA ALTRE CAUSALI
        if (varTurno === "KNOP" || varTurno.includes("KNOP")) stats.parentali++;
        if (varTurno.includes("FER") || varTurno === "FERIE") stats.ferie++;
        if (varTurno.includes("KMAL") || varTurno === "MALATTIA") stats.malattia++;
        if (varTurno.includes("AVIS") || varTurno === "AVIS") stats.sangue++;

        // CALCOLA STRAORDINARI
        if (state.straordinario && state.straordinario[dStr]) {
            let h = parseInt(state.straordinario[dStr].ore) || 0;
            let m = parseInt(state.straordinario[dStr].minuti) || 0;
            stats.straordMinutiTotali += (h * 60) + m;
        }

        // CALCOLA PERMESSO SENZA PAGA
        if (state.permessoSP && state.permessoSP[dStr]) {
            let hSP = parseInt(state.permessoSP[dStr].ore) || 0;
            let mSP = parseInt(state.permessoSP[dStr].minuti) || 0;
            stats.permessoSPMinutiTotali += (hSP * 60) + mSP;
        }
    });

    // Stampa a schermo aggiornando l'UI
    const resFerie = document.getElementById('resFerie');
    if (resFerie) {
        resFerie.innerText = stats.ferie;
        document.getElementById('resParentali').innerText = stats.parentali;
        document.getElementById('resSospesi').innerText = stats.sospesi;
        document.getElementById('resNebbia').innerText = stats.nebbia;
        document.getElementById('resMalattia').innerText = stats.malattia;
        document.getElementById('resSangue').innerText = stats.sangue;

        let finalHours = Math.floor(stats.straordMinutiTotali / 60);
        let finalMins = stats.straordMinutiTotali % 60;
        document.getElementById('resStraord').innerText = `${finalHours}h ${finalMins}m`;

        let finalHoursSP = Math.floor(stats.permessoSPMinutiTotali / 60);
        let finalMinsSP = stats.permessoSPMinutiTotali % 60;
        document.getElementById('resPermessoSP').innerText = `${finalHoursSP}h ${finalMinsSP}m`;

        document.getElementById('results').style.display = 'block';
    }
};
