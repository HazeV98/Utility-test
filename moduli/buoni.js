import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- VARIABILI GLOBALI E STATO ---
let stateApp = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {} };
let pid = stateApp.profiloAttivoId || 'default';

let ROT_FERIE_INV = [];
let ROT_FERIE_EST = [];

let buoniAttuali = 0;
let integrazioneAttiva = false;
let quickVals = [2, 5, 10];
let isWizardOpen = false;
let calcolatoreDaWizard = false;

const TURNI_ESCLUSI_FISSI = ["RI", "RIPOSO", "AL", "FER", "FEP", "FES", "FERIE", "PRT", "MAL", "MALATTIA", "KMAL", "KNOP", "AVIS", "KINF"];
const DATA_INIZIO_NUOVI_TURNI = "2026-03-02";

let unsubBuoni = null;

// --- FUNZIONI DI UTILITÀ ---
function formatStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
}

function stringToNum(s) { 
    if(!s) return 0; 
    let p = s.split('-'); 
    return Math.floor(new Date(p[0], p[1]-1, p[2], 12, 0, 0).getTime() / 86400000); 
}

function isDateInRange(dStr, startStr, endStr, year) {
    let d = new Date(year, parseInt(dStr.split('-')[1])-1, parseInt(dStr.split('-')[2]));
    let s = new Date(year, parseInt(startStr.split('-')[0])-1, parseInt(startStr.split('-')[1]));
    let e = new Date(year, parseInt(endStr.split('-')[0])-1, parseInt(endStr.split('-')[1]));
    return d >= s && d <= e;
}

function isGiornoRiposoBase(curr, cfg) {
    if (!cfg || !cfg.riposoStart) return false;
    let ref = stringToNum(cfg.riposoStart);
    if (cfg.depositoAttivo === 'disp_det') return (((curr - ref) % 6 + 6) % 6 === 0);
    let pos = ((curr - ref + 6) % 15 + 15) % 15;
    return (pos === 6 || pos === 13 || pos === 14);
}

function getFerieGiorno(dStr, state) {
    if(!state.ferie || !state.ferie.baseAnno) return null;
    let year = parseInt(dStr.split('-')[0]);
    let r = [];

    let iEst = state.ferie.baseEstiva;
    if (iEst !== -1 && iEst !== null && iEst !== undefined && ROT_FERIE_EST.length > 0) {
        let idxEst = (iEst + (year - state.ferie.baseAnno)) % ROT_FERIE_EST.length;
        if(idxEst < 0) idxEst += ROT_FERIE_EST.length; 
        if(state.ferie.scambi && state.ferie.scambi[year] && state.ferie.scambi[year].estiva !== undefined) {
            idxEst = state.ferie.scambi[year].estiva;
        }
        let pEst = ROT_FERIE_EST[idxEst];
        if(pEst && isDateInRange(dStr, pEst.s, pEst.e, year)) r.push("FEP");
    }

    let iInv = state.ferie.baseInvernale;
    if (iInv !== -1 && iInv !== null && iInv !== undefined && ROT_FERIE_INV.length > 0) {
        let idxInv = (iInv + (year - state.ferie.baseAnno)) % ROT_FERIE_INV.length;
        if(idxInv < 0) idxInv += ROT_FERIE_INV.length;
        if(state.ferie.scambi && state.ferie.scambi[year] && state.ferie.scambi[year].invernale !== undefined) {
            idxInv = state.ferie.scambi[year].invernale;
        }
        let pInv = ROT_FERIE_INV[idxInv];
        if(pInv && isDateInRange(dStr, pInv.s, pInv.e, year)) r.push("FEP");
    }
    return r.length > 0 ? "FEP" : null;
}

function isBuonoMaturato(dStr, state, esclusiArray, ignoraUso = false) {
    let isSospeso = state.sospesoRiposo && state.sospesoRiposo[dStr];
    let isBuonoUsato = state.buonoPasto && state.buonoPasto[dStr]; 
    
    if (!ignoraUso && isBuonoUsato) return false;
    
    let turnoVal = (state.variazioni && state.variazioni[dStr]) ? state.variazioni[dStr].toUpperCase() : "";

    if (!turnoVal) {
        let ferieProg = getFerieGiorno(dStr, state);
        if (ferieProg) turnoVal = ferieProg;
    }

    if (turnoVal) {
        if (esclusiArray.includes(turnoVal)) {
            if (isSospeso && (turnoVal === "RI" || turnoVal === "RIPOSO" || turnoVal === "AL" || turnoVal === "FER" || turnoVal === "FEP")) return true;
            return false;
        }
        return true;
    }

    let cfg = (state.history && stringToNum(dStr) < stringToNum(DATA_INIZIO_NUOVI_TURNI)) ? state.history : state;
    if (isGiornoRiposoBase(stringToNum(dStr), cfg)) {
        if (isSospeso) return true;
        return false;
    }

    return true;
}

async function caricaFerie() {
    try {
        const resFerie = await fetch("rotazione_ferie.json?v=" + new Date().getTime());
        if (resFerie.ok) {
            const datiFerie = await resFerie.json();
            if (datiFerie.invernali) ROT_FERIE_INV = datiFerie.invernali;
            if (datiFerie.estive) ROT_FERIE_EST = datiFerie.estive;
        }
    } catch (e) {
        console.error("Errore caricamento file ferie programmate", e);
    }
}

function inizializzaTondini() {
    for(let i=0; i<3; i++) {
        let btn = document.getElementById(`bp-btn-quick-${i+1}`);
        if(btn) {
            btn.innerText = `-${quickVals[i]}`;
            btn.onclick = () => window.modificaBuoniBP(-quickVals[i]);
        }
    }
}

function sincronizzaBuoni(fromCloud = false) {
    const toggleInt = document.getElementById('bp-toggleInt');
    if(toggleInt) toggleInt.checked = true;
    
    let esclusiArray = [...TURNI_ESCLUSI_FISSI];
    let state = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {} };
    
    let oggi = new Date();
    oggi.setHours(0, 0, 0, 0); 
    
    let baseDataStr = localStorage.getItem(`buoni_base_data_${pid}`);
    let baseSaldo = parseInt(localStorage.getItem(`buoni_base_saldo_${pid}`));
    
    if (!baseDataStr || isNaN(baseSaldo)) {
        impostaSaldoDaInput(buoniAttuali);
        baseDataStr = localStorage.getItem(`buoni_base_data_${pid}`);
        baseSaldo = parseInt(localStorage.getItem(`buoni_base_saldo_${pid}`));
    }
    
    let p = baseDataStr.split('-');
    let baseDateObj = new Date(p[0], p[1]-1, p[2], 0, 0, 0);
    
    let thirtyDaysAgo = new Date(oggi);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    while (baseDateObj < thirtyDaysAgo) {
        baseDateObj.setDate(baseDateObj.getDate() + 1);
        let dStr = formatStr(baseDateObj);
        if (isBuonoMaturato(dStr, state, esclusiArray)) {
            baseSaldo++;
        }
    }
    
    baseDataStr = formatStr(baseDateObj);
    localStorage.setItem(`buoni_base_data_${pid}`, baseDataStr);
    localStorage.setItem(`buoni_base_saldo_${pid}`, baseSaldo);
    
    let dinamici = 0;
    let calcDate = new Date(baseDateObj);
    calcDate.setDate(calcDate.getDate() + 1);
    
    while (calcDate <= oggi) {
        let dStr = formatStr(calcDate);
        if (isBuonoMaturato(dStr, state, esclusiArray)) {
            dinamici++;
        }
        calcDate.setDate(calcDate.getDate() + 1);
    }
    
    buoniAttuali = baseSaldo + dinamici;
    
    const countDisplay = document.getElementById('bp-buoni-count');
    if(countDisplay) countDisplay.innerText = buoniAttuali;
    
    localStorage.setItem(`buoni_salvati_${pid}`, buoniAttuali);
    
    if (!fromCloud && typeof window.syncBuoniToCloudBP === 'function') {
        window.syncBuoniToCloudBP();
    }
}

function impostaSaldoDaInput(inputValore) {
    let state = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {} };
    let esclusiArray = [...TURNI_ESCLUSI_FISSI];
    
    let oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    let thirtyDaysAgo = new Date(oggi);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let thirtyDaysAgoStr = formatStr(thirtyDaysAgo);
    
    let maturatiUltimi30 = 0;
    let d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + 1);
    while(d <= oggi) {
        let dStr = formatStr(d);
        if (isBuonoMaturato(dStr, state, esclusiArray)) maturatiUltimi30++;
        d.setDate(d.getDate() + 1);
    }
    
    let baseSaldo = inputValore - maturatiUltimi30;
    
    localStorage.setItem(`buoni_base_saldo_${pid}`, baseSaldo);
    localStorage.setItem(`buoni_base_data_${pid}`, thirtyDaysAgoStr);
    localStorage.setItem(`buoni_salvati_${pid}`, inputValore);
    
    buoniAttuali = inputValore;
    const countDisplay = document.getElementById('bp-buoni-count');
    if(countDisplay) countDisplay.innerText = buoniAttuali;
}

function attivaIntegrazioneFinale() {
    integrazioneAttiva = true;
    localStorage.setItem(`buoni_integrazione_attiva_${pid}`, 'true');
    const toggleInt = document.getElementById('bp-toggleInt');
    if(toggleInt) toggleInt.checked = true;
    if (typeof window.syncBuoniToCloudBP === 'function') window.syncBuoniToCloudBP();
}

function calcolaPresenzeInMese(giornoInizio, giornoFine, mese, anno, state, esclusiArray) {
    let conteggio = 0;
    for (let i = giornoInizio; i <= giornoFine; i++) {
        let d = new Date(anno, mese, i, 0, 0, 0);
        let dStr = formatStr(d);
        if (isBuonoMaturato(dStr, state, esclusiArray, true)) {
            conteggio++;
        }
    }
    return conteggio;
}

// ==============================================================
// FUNZIONI ESPOSTE GLOBALMENTE SULL'OGGETTO WINDOW
// ==============================================================

window.modificaBuoniBP = function(valore) {
    buoniAttuali += valore;
    
    const countDisplay = document.getElementById('bp-buoni-count');
    if(countDisplay) countDisplay.innerText = buoniAttuali;
    localStorage.setItem(`buoni_salvati_${pid}`, buoniAttuali);
    
    if (integrazioneAttiva) {
        impostaSaldoDaInput(buoniAttuali);
    }
    if (typeof window.syncBuoniToCloudBP === 'function') window.syncBuoniToCloudBP();
};

window.apriImpostazioniBP = function() {
    document.getElementById('bp-quick-val-1').value = quickVals[0];
    document.getElementById('bp-quick-val-2').value = quickVals[1];
    document.getElementById('bp-quick-val-3').value = quickVals[2];
    document.getElementById('bp-modal-settings').style.display = 'flex';
};

window.chiudiImpostazioniBP = function() {
    document.getElementById('bp-modal-settings').style.display = 'none';
};

window.salvaImpostazioniBP = function() {
    let v1 = Math.abs(parseInt(document.getElementById('bp-quick-val-1').value)) || 2;
    let v2 = Math.abs(parseInt(document.getElementById('bp-quick-val-2').value)) || 5;
    let v3 = Math.abs(parseInt(document.getElementById('bp-quick-val-3').value)) || 10;
    
    quickVals = [v1, v2, v3];
    localStorage.setItem(`buoni_quick_vals_${pid}`, JSON.stringify(quickVals));
    
    inizializzaTondini();
    window.chiudiImpostazioniBP();
};

window.gestisciToggleIntegrazioneBP = function() {
    const toggle = document.getElementById('bp-toggleInt');
    if (toggle.checked) {
        toggle.checked = false; 
        document.getElementById('bp-wizard-step1').style.display = 'flex';
        isWizardOpen = true;
    } else {
        integrazioneAttiva = false;
        localStorage.setItem(`buoni_integrazione_attiva_${pid}`, 'false');
        if (typeof window.syncBuoniToCloudBP === 'function') window.syncBuoniToCloudBP();
    }
};

window.vaiAWizard2BP = function() {
    document.getElementById('bp-wizard-step1').style.display = 'none';
    document.getElementById('bp-wizard-step2').style.display = 'flex';
    document.getElementById('bp-scelta-saldo-btn').style.display = 'block';
    document.getElementById('bp-input-saldo-area').style.display = 'none';
};

window.chiudiWizardBP = function() {
    document.getElementById('bp-wizard-step1').style.display = 'none';
    document.getElementById('bp-wizard-step2').style.display = 'none';
    isWizardOpen = false;
};

window.mostraInputSaldoBP = function() {
    document.getElementById('bp-scelta-saldo-btn').style.display = 'none';
    document.getElementById('bp-input-saldo-area').style.display = 'block';
    document.getElementById('bp-wizard-buoni-manuali').value = buoniAttuali;
};

window.salvaSaldoEAttivaBP = function() {
    let val = parseInt(document.getElementById('bp-wizard-buoni-manuali').value);
    if (!isNaN(val)) {
        impostaSaldoDaInput(val);
        attivaIntegrazioneFinale();
        window.chiudiWizardBP();
        if (typeof window.syncBuoniToCloudBP === 'function') window.syncBuoniToCloudBP();
    } else {
        alert("Inserisci un numero valido.");
    }
};

window.passaACalcolatoreBP = function() {
    window.chiudiWizardBP();
    window.apriCalcolatoreBP(true); 
};

window.apriCalcolatoreBP = function(daWizard = false) {
    calcolatoreDaWizard = daWizard;
    document.getElementById('bp-modal-calcolatore').style.display = 'flex';
    document.getElementById('bp-risultato-calcolo').innerText = ''; 
    document.getElementById('bp-btn-attiva-dopo-calcolo').style.display = 'none';
};

window.chiudiCalcolatoreBP = function() {
    document.getElementById('bp-modal-calcolatore').style.display = 'none';
};

window.eseguiCalcoloBP = function() {
    const presCorrente = parseInt(document.getElementById('bp-pres-corrente').value) || 0;
    const presPassato = parseInt(document.getElementById('bp-pres-passato').value) || 0;
    const buoniTessera = parseInt(document.getElementById('bp-buoni-tessera').value) || 0;
    
    let nuovoSaldo = presCorrente + presPassato + buoniTessera - 62;

    document.getElementById('bp-risultato-calcolo').innerText = "Saldo: " + nuovoSaldo;
    buoniAttuali = nuovoSaldo; 
    
    if (calcolatoreDaWizard) {
        document.getElementById('bp-btn-attiva-dopo-calcolo').style.display = 'block';
    } else {
        impostaSaldoDaInput(buoniAttuali);
    }
};

window.salvaCalcoloEAttivaBP = function() {
    impostaSaldoDaInput(buoniAttuali);
    window.chiudiCalcolatoreBP();
    attivaIntegrazioneFinale();
};

window.precompilaDaCalendarioBP = function() {
    let esclusiArray = [...TURNI_ESCLUSI_FISSI];
    let state = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {} };
    
    let oggi = new Date();
    let meseCorrente = oggi.getMonth();
    let annoCorrente = oggi.getFullYear();
    
    let mesePassato = meseCorrente - 1;
    let annoPassato = annoCorrente;
    if (mesePassato < 0) { mesePassato = 11; annoPassato--; }

    let presenzeCorrente = calcolaPresenzeInMese(1, oggi.getDate(), meseCorrente, annoCorrente, state, esclusiArray);
    
    let ultimoGiornoPassato = new Date(annoPassato, mesePassato + 1, 0).getDate();
    let presenzePassato = calcolaPresenzeInMese(1, ultimoGiornoPassato, mesePassato, annoPassato, state, esclusiArray);

    document.getElementById('bp-pres-corrente').value = presenzeCorrente;
    document.getElementById('bp-pres-passato').value = presenzePassato;
    
    alert("Dati precompilati in base al calendario!");
};

// --- Inizializzazione Principale del Modulo ---
export async function avviaMotoreBuoniPasto(db, auth) {
    const currentUser = auth.currentUser;
    
    // Rinfresco stato
    stateApp = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {} };
    pid = stateApp.profiloAttivoId || 'default';

    // Gestione Migrazione Dati
    if (localStorage.getItem('buoni_salvati') !== null && localStorage.getItem(`buoni_salvati_${pid}`) === null) {
        localStorage.setItem(`buoni_salvati_${pid}`, localStorage.getItem('buoni_salvati'));
        localStorage.setItem(`buoni_integrazione_attiva_${pid}`, localStorage.getItem('buoni_integrazione_attiva') || 'false');
        if(localStorage.getItem('buoni_base_data')) localStorage.setItem(`buoni_base_data_${pid}`, localStorage.getItem('buoni_base_data'));
        if(localStorage.getItem('buoni_base_saldo')) localStorage.setItem(`buoni_base_saldo_${pid}`, localStorage.getItem('buoni_base_saldo'));
        if(localStorage.getItem('buoni_quick_vals')) localStorage.setItem(`buoni_quick_vals_${pid}`, localStorage.getItem('buoni_quick_vals'));
    }

    buoniAttuali = parseInt(localStorage.getItem(`buoni_salvati_${pid}`)) || 0;
    integrazioneAttiva = localStorage.getItem(`buoni_integrazione_attiva_${pid}`) === 'true';
    quickVals = JSON.parse(localStorage.getItem(`buoni_quick_vals_${pid}`)) || [2, 5, 10];

    // Impostazione UI e Caricamento
    await caricaFerie(); 
    inizializzaTondini();
    if (integrazioneAttiva) {
        sincronizzaBuoni(false);
    } else {
        const countDisplay = document.getElementById('bp-buoni-count');
        if(countDisplay) countDisplay.innerText = buoniAttuali;
    }

    // Funzione globale di Sincronizzazione verso Firebase
    window.syncBuoniToCloudBP = async () => {
        if (currentUser) {
            try {
                const docRef = doc(db, "utenti", currentUser.uid);
                let dataToSave = {};
                
                dataToSave[`buoni_pasto_totali_${pid}`] = buoniAttuali;
                dataToSave[`buoni_integrazione_${pid}`] = integrazioneAttiva;
                dataToSave[`buoni_base_saldo_${pid}`] = parseInt(localStorage.getItem(`buoni_base_saldo_${pid}`)) || 0;
                dataToSave[`buoni_base_data_${pid}`] = localStorage.getItem(`buoni_base_data_${pid}`) || "";
                
                await setDoc(docRef, dataToSave, { merge: true });
            } catch(e) { console.error("Errore Sync Cloud Buoni:", e); }
        }
    };

    // Ascoltatore Dati Firebase
    if (currentUser) {
        if(unsubBuoni) unsubBuoni();
        const docRef = doc(db, "utenti", currentUser.uid);
        unsubBuoni = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                let datiCloud = docSnap.data();
                let datiLocali = JSON.parse(localStorage.getItem('myTurniApp')) || {};

                let cloudTime = datiCloud.lastUpdate || 0;
                let localTime = datiLocali.lastUpdate || 0;

                // 1. Sincronizzazione Base Calendario
                if (cloudTime > localTime) {
                    Object.assign(stateApp, datiCloud);
                    pid = stateApp.profiloAttivoId || 'default';
                    
                    if (stateApp.profiliSalvati && stateApp.profiliSalvati[pid]) {
                        let p = stateApp.profiliSalvati[pid];
                        stateApp.variazioni = p.variazioni || {};
                        stateApp.note = p.note || {};
                        stateApp.colori = p.colori || {};
                        stateApp.nebbia = p.nebbia || {};
                        stateApp.straordinario = p.straordinario || {};
                        stateApp.sospesoRiposo = p.sospesoRiposo || {};
                        stateApp.buonoPasto = p.buonoPasto || {};
                        stateApp.permessoSP = p.permessoSP || {};
                        stateApp.ferie = p.ferie || {};
                    }
                    
                    localStorage.setItem('myTurniApp', JSON.stringify(stateApp));
                    
                    if (integrazioneAttiva) {
                        sincronizzaBuoni(true);
                    }
                }

                // 2. Recupero Contatore Buoni Pasto
                pid = stateApp.profiloAttivoId || 'default'; 
                
                if (datiCloud[`buoni_pasto_totali_${pid}`] !== undefined) {
                    let cloudInt = datiCloud[`buoni_integrazione_${pid}`] === true;
                    
                    if (datiCloud[`buoni_base_saldo_${pid}`] !== undefined) {
                        localStorage.setItem(`buoni_base_saldo_${pid}`, datiCloud[`buoni_base_saldo_${pid}`]);
                        localStorage.setItem(`buoni_base_data_${pid}`, datiCloud[`buoni_base_data_${pid}`]);
                    }
                    
                    integrazioneAttiva = cloudInt;
                    localStorage.setItem(`buoni_integrazione_attiva_${pid}`, cloudInt ? 'true' : 'false');
                    
                    const toggleInt = document.getElementById('bp-toggleInt');
                    if(toggleInt) toggleInt.checked = integrazioneAttiva;
                    
                    if (integrazioneAttiva) {
                        sincronizzaBuoni(true);
                    } else {
                        let cloudBuoni = parseInt(datiCloud[`buoni_pasto_totali_${pid}`]);
                        buoniAttuali = cloudBuoni;
                        localStorage.setItem(`buoni_salvati_${pid}`, cloudBuoni);
                        const countDisplay = document.getElementById('bp-buoni-count');
                        if(countDisplay) countDisplay.innerText = buoniAttuali;
                    }
                    
                } else {
                    if (localStorage.getItem(`buoni_salvati_${pid}`) !== null) {
                        window.syncBuoniToCloudBP();
                    }
                }
            }
        });
    }
}
