import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function avviaMotoreStatistiche(db, auth) {

    // ==========================================
    // FUNZIONE GLOBALE DI CALCOLO
    // ==========================================
    window.calcolaStatistiche = (isAutoLoad = false) => {
        const startStr = document.getElementById('dateStart').value;
        const endStr = document.getElementById('dateEnd').value;

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
            
            document.getElementById('titoloRisultati').innerHTML = '<i class="fa-solid fa-square-poll-vertical" style="color:var(--primary);"></i> Risultati Totali Registrati';
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
            
            document.getElementById('titoloRisultati').innerHTML = '<i class="fa-solid fa-calendar-day" style="color:var(--primary);"></i> Risultati del periodo';
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

        // Stampa a schermo
        document.getElementById('resFerie').innerText = stats.ferie;
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
    };

    // ==========================================
    // FUNZIONE PER CALCOLO TOTALE MALATTIA (Ultimi 42 mesi)
    // ==========================================
    window.getTotaleMalattiaCalendario = () => {
        let state = JSON.parse(localStorage.getItem('myTurniApp')) || {};
        let totaleMalattia = 0;
        
        let dataOggi = new Date();
        dataOggi.setHours(23, 59, 59, 999); 
        
        let dataLimite = new Date();
        dataLimite.setMonth(dataLimite.getMonth() - 42);
        dataLimite.setHours(0, 0, 0, 0); 

        if (state.variazioni) {
            for (const [dateString, varTurno] of Object.entries(state.variazioni)) {
                let v = varTurno.toUpperCase();
                if (v.includes("KMAL") || v === "MALATTIA") {
                    // Fix Fuso orario: scompone la stringa YYYY-MM-DD per creare una data locale esatta
                    let parts = dateString.split('-');
                    if (parts.length === 3) {
                        let dataRegistrata = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        if (dataRegistrata >= dataLimite && dataRegistrata <= dataOggi) {
                            totaleMalattia++;
                        }
                    }
                }
            }
        }
        return totaleMalattia;
    };

    // ==========================================
    // FUNZIONE PER RICERCA TURNI SPECIFICI
    // ==========================================
    window.cercaTurnoManuale = () => {
        let testoRicerca = document.getElementById('inputRicercaTurno').value.trim().toUpperCase();
        let boxRisultato = document.getElementById('risultatoRicercaTurno');
        
        if (!testoRicerca) {
            boxRisultato.innerHTML = '<span style="color: var(--danger);">Inserisci un testo da cercare.</span>';
            return;
        }

        let state = JSON.parse(localStorage.getItem('myTurniApp')) || {};
        let conteggio = 0;

        if (state.variazioni) {
            for (const [date, varTurno] of Object.entries(state.variazioni)) {
                if (varTurno.toUpperCase().includes(testoRicerca)) {
                    conteggio++;
                }
            }
        }
        
        boxRisultato.innerHTML = `Il turno <strong>${testoRicerca}</strong> è stato trovato <strong style="font-size:18px; color:var(--primary);">${conteggio}</strong> volte nel calendario.`;
    };

    // ==========================================
    // SYNC DATI FIREBASE (Avviato automaticamente)
    // ==========================================
    const eseguiSincronizzazione = async () => {
        if (auth.currentUser) {
            try {
                const docRef = doc(db, "utenti", auth.currentUser.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    let datiCloud = docSnap.data();
                    let datiLocali = JSON.parse(localStorage.getItem('myTurniApp')) || {};
                    
                    let stateAggiornato = { ...datiLocali, ...datiCloud }; 
                    localStorage.setItem('myTurniApp', JSON.stringify(stateAggiornato)); 
                }
            } catch(e) { console.error("Errore Sync Cloud Statistiche:", e); }
        }
        
        setTimeout(() => {
            if (typeof window.calcolaStatistiche === 'function') {
                window.calcolaStatistiche(true);
            }
        }, 300);
    };

    eseguiSincronizzazione();
}
