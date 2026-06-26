import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4",
    authDomain: "utility-haze.firebaseapp.com",
    projectId: "utility-haze",
    storageBucket: "utility-haze.firebasestorage.app",
    messagingSenderId: "686237947418",
    appId: "1:686237947418:web:f03ba19ab8fff43110a3a3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.utenteLoggato = null;

window.deleteCloudData = async () => {
    if (window.utenteLoggato) {
        try {
            await setDoc(doc(db, "utenti", window.utenteLoggato), { deleted: true, lastUpdate: new Date().getTime() });
            await deleteDoc(doc(db, "utenti", window.utenteLoggato));
        } catch(e) { console.error("Errore eliminazione Cloud:", e); }
    }
};

window.syncToCloud = async (dati) => {
    if (window.utenteLoggato) {
        try {
            await setDoc(doc(db, "utenti", window.utenteLoggato), dati);
        } catch(e) { console.error("Errore salvataggio Cloud:", e); }
    }
};

// --- VARIABILI GLOBALI ---
let ROT_FERIE_INV = [];
let ROT_FERIE_EST = [];
const VERSIONE_TURNI = "1.0.3"; 
let VERSIONE_FERIE = "1.0.0"; 
const DATA_INIZIO_NUOVI_TURNI = "2026-06-01"; 
const AVVISO_VARIANTI = true;

const RESET_DOPO_AGGIORNAMENTO = {
        rot_fnove: false,
        spez_fnove: false,
        rot_proma: true,
        spez_proma: true,
        ris_proma: false,
        rot_szaccaria: true,
        spez_szaccaria: false,
        rot_lido: false,
        spez_lido: false,
        rot_linea14: true,
        rot_linea14_mb: true,
        rot_linea13: false,
        rot_17sn: false,
        rot_17tr: false,
        rot_linea12: false,
        tc_spez_fnove: false,
        tc_spez_szaccaria: false,
        tc_spez_lido: false,
        tc_rot_17sn: false,
        tc_rot_17tr: false
    };

let state = JSON.parse(localStorage.getItem('myTurniApp')) || { 
    version: "0", 
    variazioni: {}, 
    colori: {}, 
    nebbia: {}, 
    straordinario: {}, 
    sospesoRiposo: {}, 
    note: {}, 
    buonoPasto: {}, 
    permessoSP: {}, 
    setupStep: 0, 
    dbCache: {}, 
    rotCache: {}, 
    dispCache: {}, 
    ferie: {} 
};

if (!state.colori) state.colori = {}; 
if (!state.nebbia) state.nebbia = {};
if (!state.straordinario) state.straordinario = {};
if (!state.sospesoRiposo) state.sospesoRiposo = {};
if (!state.note) state.note = {};
if (!state.buonoPasto) state.buonoPasto = {};
if (!state.permessoSP) state.permessoSP = {};
if (!state.dispCache) state.dispCache = {};
if (!state.coloriRotazione) state.coloriRotazione = {}; 

let selectedDate, tempRotDate, calendar;
let currentImagePath = "";
let imgBaseFallback = ""; 
let pzInstance = null; 
let tempColoreAltro = "";
let variantiData = {};

// --- FUNZIONI MENU DESTRO E MODIFICA MULTIPLA ---
function apriMenuDestro() {
    document.getElementById('right-sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').style.display = 'block';
}

function chiudiMenuDestro() {
    document.getElementById('right-sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').style.display = 'none';
}

function apriMultiEdit() {
    chiudiMenuDestro();
    document.getElementById('multiEditModal').style.display = 'block';
}

function chiudiMultiEdit() {
    document.getElementById('multiEditModal').style.display = 'none';
}

// --- GESTIONE FERIE PROGRAMMATE ---
function apriFerieModal() {
    chiudiMenuDestro();
    let estSelect = document.getElementById('ferieEstiveBase');
    let invSelect = document.getElementById('ferieInvernaliBase');
    let estScambio = document.getElementById('ferieEstiveScambio');
    let invScambio = document.getElementById('ferieInvernaliScambio');

    if(estSelect.options.length <= 1) {
        ROT_FERIE_EST.forEach((f, i) => {
            estSelect.innerHTML += `<option value="${i}">${f.n}</option>`;
            estScambio.innerHTML += `<option value="${i}">${f.n}</option>`;
        });
        ROT_FERIE_INV.forEach((f, i) => {
            invSelect.innerHTML += `<option value="${i}">${f.n}</option>`;
            invScambio.innerHTML += `<option value="${i}">${f.n}</option>`;
        });
    }

    let currYear = new Date().getFullYear();
    document.getElementById('ferieAnnoBase').value = state.ferie?.baseAnno || currYear;
    document.getElementById('ferieEstiveBase').value = state.ferie?.baseEstiva ?? -1;
    document.getElementById('ferieInvernaliBase').value = state.ferie?.baseInvernale ?? -1;
    
    document.getElementById('ferieScambioAnno').value = currYear;
    aggiornaScambiUI(currYear);

    document.getElementById('ferieScambioAnno').addEventListener('change', (e) => aggiornaScambiUI(e.target.value));
    
    switchFerieTab('base');
    document.getElementById('ferieModal').style.display = 'block';
}

function switchFerieTab(tab) {
    if(tab === 'base') {
        document.getElementById('ferieBaseSection').style.display = 'block';
        document.getElementById('ferieScambioSection').style.display = 'none';
        document.getElementById('btnTabFerieBase').style.background = '#20c997';
        document.getElementById('btnTabFerieBase').style.color = 'white';
        document.getElementById('btnTabFerieScambio').style.background = 'var(--surface)';
        document.getElementById('btnTabFerieScambio').style.color = '#20c997';
    } else {
        document.getElementById('ferieBaseSection').style.display = 'none';
        document.getElementById('ferieScambioSection').style.display = 'block';
        document.getElementById('btnTabFerieScambio').style.background = '#20c997';
        document.getElementById('btnTabFerieScambio').style.color = 'white';
        document.getElementById('btnTabFerieBase').style.background = 'var(--surface)';
        document.getElementById('btnTabFerieBase').style.color = '#20c997';
    }
}

function chiudiFerieModal() {
    document.getElementById('ferieModal').style.display = 'none';
}

function aggiornaScambiUI(year) {
    if (!state.ferie || !state.ferie.scambi || !state.ferie.scambi[year]) {
        document.getElementById('ferieEstiveScambio').value = -1;
        document.getElementById('ferieInvernaliScambio').value = -1;
    } else {
        document.getElementById('ferieEstiveScambio').value = state.ferie.scambi[year].estiva ?? -1;
        document.getElementById('ferieInvernaliScambio').value = state.ferie.scambi[year].invernale ?? -1;
    }
}

function salvaFerie() {
    if (!state.ferie) {
        state.ferie = { version: VERSIONE_FERIE, scambi: {} };
    }
    state.ferie.version = VERSIONE_FERIE; 
    
    let annoBase = parseInt(document.getElementById('ferieAnnoBase').value);
    if (!annoBase) { 
        alert("Inserisci un anno di base valido."); 
        return; 
    }
    
    state.ferie.baseAnno = annoBase;
    state.ferie.baseEstiva = parseInt(document.getElementById('ferieEstiveBase').value);
    state.ferie.baseInvernale = parseInt(document.getElementById('ferieInvernaliBase').value);

    let annoScambio = document.getElementById('ferieScambioAnno').value;
    if (annoScambio) {
        let sEst = parseInt(document.getElementById('ferieEstiveScambio').value);
        let sInv = parseInt(document.getElementById('ferieInvernaliScambio').value);
        
        if (sEst !== -1 || sInv !== -1) {
            if (!state.ferie.scambi) state.ferie.scambi = {};
            if (!state.ferie.scambi[annoScambio]) state.ferie.scambi[annoScambio] = {};
            
            if (sEst !== -1) state.ferie.scambi[annoScambio].estiva = sEst;
            if (sInv !== -1) state.ferie.scambi[annoScambio].invernale = sInv;
        }
    }
    
    salvaERicarica();
}

function resetFerie() {
    if(confirm("Vuoi cancellare tutte le tue configurazioni delle Ferie Programmate (incluse quelle di scambio)?")) {
        state.ferie = { version: VERSIONE_FERIE, scambi: {} };
        let boost = new Date().getTime() + 5000;
        salvaERicarica(boost);
    }
}

function isDateInRange(dStr, startStr, endStr, year) {
    let d = new Date(year, parseInt(dStr.split('-')[1])-1, parseInt(dStr.split('-')[2]));
    let s = new Date(year, parseInt(startStr.split('-')[0])-1, parseInt(startStr.split('-')[1]));
    let e = new Date(year, parseInt(endStr.split('-')[0])-1, parseInt(endStr.split('-')[1]));
    return d >= s && d <= e;
}

function getFerieGiorno(dStr) {
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

    let uniqueR = [...new Set(r)];
    return uniqueR.length > 0 ? uniqueR.join(" + ") : null;
}

async function elaboraPdfBibbia(event) {
    const file = event.target.files[0];
    if (!file) return;
    chiudiMenuDestro();
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        let fullText = "";
        let righeTesto = []; 

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let righeY = {};
            textContent.items.forEach(item => {
                fullText += item.str + " ";
                let y = Math.round(item.transform[5]); 
                if (!righeY[y]) righeY[y] = [];
                righeY[y].push(item.str.trim());
            });
            
            let yKeys = Object.keys(righeY).sort((a, b) => b - a);
            yKeys.forEach(y => righeTesto.push(righeY[y].join(" ")));
        }

        const mesiMap = { "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12 };
        let monthMatch = fullText.match(/mese di ([a-z]+) (\d{4})/i);
        
        if (!monthMatch) {
            alert("Impossibile trovare il mese e l'anno di riferimento nel PDF. Verifica il file.");
            event.target.value = ""; 
            return;
        }
        
        let mese = mesiMap[monthMatch[1].toLowerCase()];
        let anno = parseInt(monthMatch[2]);
        
        let knownShifts = new Set(["DISP", "RI", "AL", "FER", "FEP", "FES", "MAL", "PERM", "KMAL"]);
        Object.values(state.dbCache || {}).forEach(db => {
            Object.keys(db).forEach(k => knownShifts.add(k.split('_')[0]));
        });
        let sortedShifts = Array.from(knownShifts).sort((a, b) => b.length - a.length);

        let turniLetti = {};
        
        righeTesto.forEach(testoRiga => {
            let matchGiorno = testoRiga.match(/(?:^|\s)(\d{2})\s(?:lun|mar|mer|gio|ven|sab|dom)(?:\s|$)/i);
            if (matchGiorno) {
                let giornoNum = matchGiorno[1];
                let dStr = `${anno}-${String(mese).padStart(2, '0')}-${String(giornoNum).padStart(2, '0')}`;
                
                let turnoTrovato = null;
                for (let code of sortedShifts) {
                    let regex = new RegExp(`\\b${code}\\b`, 'i');
                    if (regex.test(testoRiga)) {
                        turnoTrovato = code.toUpperCase();
                        break;
                    }
                }
                if (turnoTrovato) {
                    turniLetti[dStr] = turnoTrovato;
                }
            }
        });

        let turniAttuali = calcolaTurni();
        window.pendingPdfChanges = [];
        
        for (let dStr in turniLetti) {
            let turnoLetto = turniLetti[dStr];
            let [dAnno, dMese, dGiorno] = dStr.split('-');
            if (parseInt(dAnno) !== anno || parseInt(dMese) !== mese) continue;

            let turnoEsistenteObj = turniAttuali.find(e => e.start === dStr && !e.title.includes('FERIE') && e.title !== 'FEP');
            let turnoEsistentePulito = turnoEsistenteObj ? turnoEsistenteObj.title.replace(/<i[^>]*><\/i>/g, '').replace(/\(Sospeso\)/g, '').trim().toUpperCase() : "";
            
            if (turnoEsistentePulito !== turnoLetto) {
                window.pendingPdfChanges.push({
                    date: dStr,
                    giornoTesto: `${parseInt(dGiorno)} ${monthMatch[1].toLowerCase()}`,
                    oldShift: turnoEsistentePulito || "Nessuno",
                    newShift: turnoLetto
                });
            }
        }
        
        event.target.value = "";
        
        if (window.pendingPdfChanges.length === 0) {
            alert(`Sincronizzazione completata!\n\nMese analizzato: ${monthMatch[1].toUpperCase()} ${anno}\nNessuna modifica necessaria, il calendario è già allineato al PDF.`);
            return;
        }
        
        let listHtml = "";
        window.pendingPdfChanges.forEach((change, idx) => {
            listHtml += `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 5px; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="pdfSyncCheck_${idx}" checked style="width: 20px; height: 20px; margin: 0; accent-color: #e83e8c;">
                        <span style="font-size: 15px; color: var(--text); font-weight: bold; text-transform: capitalize;">${change.giornoTesto}</span>
                    </div>
                    <div style="font-size: 14px; color: var(--text-muted); text-align: right;">
                        <span style="text-decoration: line-through; color: #adb5bd; margin-right: 5px;">${change.oldShift}</span> 
                        <span style="font-weight: bold; color: #5e72e4;">➔ ${change.newShift}</span>
                    </div>
                </label>
            `;
        });
        
        document.getElementById('pdfSyncList').innerHTML = listHtml;
        document.getElementById('pdfSyncModal').style.display = 'block';

    } catch (error) {
        console.error("Errore lettura PDF:", error);
        alert("Si è verificato un errore durante l'elaborazione del PDF.");
        event.target.value = "";
    }
}

function chiudiPdfSyncModal() {
    document.getElementById('pdfSyncModal').style.display = 'none';
    window.pendingPdfChanges = [];
}

function applicaModifichePdf() {
    let applicate = 0;
    if (window.pendingPdfChanges) {
        window.pendingPdfChanges.forEach((change, idx) => {
            let checkbox = document.getElementById(`pdfSyncCheck_${idx}`);
            if (checkbox && checkbox.checked) {
                state.variazioni[change.date] = change.newShift;
                applicate++;
            }
        });
    }
    
    chiudiPdfSyncModal();
    alert(`Sincronizzazione applicata!\nModifiche registrate: ${applicate}`);
    salvaERicarica();
}

let tempColoriRotazione = {};

function apriColoriRotazione() {
    chiudiMenuDestro();
    tempColoriRotazione = { ...(state.coloriRotazione || {}) };
    
    const giorniDaColorare = ['riposo', 1, 2, 3, 4, 5, 6];
    for(let i of giorniDaColorare) {
        let container = document.querySelector('#coloriRotazioneModal .day-' + i);
        if(container) {
            container.querySelectorAll('.color-circle').forEach(c => {
                c.classList.remove('selected');
                let cColor = c.getAttribute('data-color') || "";
                let targetColor = tempColoriRotazione[i] || "";
                if (cColor === targetColor) {
                    c.classList.add('selected');
                }
            });
        }
    }
    document.getElementById('coloriRotazioneModal').style.display = 'block';
}

function chiudiColoriRotazione() {
    document.getElementById('coloriRotazioneModal').style.display = 'none';
}

function selezionaColoreRotazione(giorno, hex, el) {
    if (hex) {
        tempColoriRotazione[giorno] = hex;
    } else {
        delete tempColoriRotazione[giorno];
    }
    
    let container = document.querySelector('#coloriRotazioneModal .day-' + giorno);
    if(container) {
        container.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
    }
    if(el) el.classList.add('selected');
}

function salvaColoriRotazione() {
    if (!state.coloriRotazione) state.coloriRotazione = {};
    const giorniDaColorare = ['riposo', 1, 2, 3, 4, 5, 6];
    for(let i of giorniDaColorare) {
        if (tempColoriRotazione[i]) {
            state.coloriRotazione[i] = tempColoriRotazione[i];
        } else {
            delete state.coloriRotazione[i];
        }
    }
    salvaERicarica();
}

function salvaModificaMultipla() {
    const startDateStr = document.getElementById('multiStart').value;
    const endDateStr = document.getElementById('multiEnd').value;
    const turnoVal = document.getElementById('multiTurno').value.trim().toUpperCase();
    const escludiRiposi = document.getElementById('checkEscludiRiposi').checked;

    if (!startDateStr || !endDateStr) { alert("Seleziona entrambe le date."); return; }
    if (startDateStr > endDateStr) { alert("La data di inizio deve essere precedente o uguale a quella di fine."); return; }
    
    if (!turnoVal) { 
        if(!confirm("Hai lasciato il campo vuoto. Vuoi CANCELLARE le modifiche per questo periodo e ripristinare i turni base?")) return; 
    }

    let currentDate = creaDataSicura(startDateStr);
    let endDate = creaDataSicura(endDateStr);

    while (currentDate <= endDate) {
        let dStr = dateToLocalISO(currentDate);
        
        let saltaGiorno = false;
        if (escludiRiposi) {
            let varCorrente = state.variazioni[dStr];
            let eRiposoManual = (varCorrente === "RI" || varCorrente === "RIPOSO" || varCorrente === "AL");
            let eRiposoStrutturale = (!varCorrente && isGiornoRiposo(dStr));
            if (eRiposoManual || eRiposoStrutturale) {
                saltaGiorno = true;
            }
        }

        if (!saltaGiorno) {
            if (!turnoVal) {
                delete state.variazioni[dStr]; 
            } else {
                state.variazioni[dStr] = turnoVal; 
            }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }

    salvaERicarica();
}

function apriPdfTipo2Modal() {
    chiudiMenuDestro();
    let currDate = new Date();
    document.getElementById('pdfTipo2Mese').value = String(currDate.getMonth() + 1).padStart(2, '0');
    document.getElementById('pdfTipo2Anno').value = currDate.getFullYear();
    document.getElementById('pdfTipo2Modal').style.display = 'block';
}

function chiudiPdfTipo2Modal() {
    document.getElementById('pdfTipo2Modal').style.display = 'none';
}

function generaPdfTipo2() {
    let mese = document.getElementById('pdfTipo2Mese').value;
    let anno = document.getElementById('pdfTipo2Anno').value;
    let meseNome = new Date(anno, parseInt(mese)-1, 1).toLocaleDateString('it-IT', { month: 'long' });
    meseNome = meseNome.charAt(0).toUpperCase() + meseNome.slice(1);

    let html = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; padding: 10px; color: #000; background: white; width: 100%; box-sizing: border-box;">
        <h2 style="margin-bottom: 15px; text-align: center; font-size: 18px;">Bibbia ${meseNome} ${anno}</h2>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid #000; background-color: #f8f9fa;">
                    <th style="padding: 6px 8px;">Data</th>
                    <th style="padding: 6px 8px;">Turno</th>
                    <th style="padding: 6px 8px;">Loc. Monta</th>
                    <th style="padding: 6px 8px;">Dalle</th>
                    <th style="padding: 6px 8px;">Alle</th>
                    <th style="padding: 6px 8px;">Note</th>
                </tr>
            </thead>
            <tbody>
    `;

    const turni = calcolaTurni();
    const dateChiavi = Object.keys(state.dbCache || {}).sort();
    const giorniInMese = new Date(anno, mese, 0).getDate();
    const giorniSettimana = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

    for (let d = 1; d <= giorniInMese; d++) {
        let dStr = `${anno}-${mese}-${String(d).padStart(2, '0')}`;
        let dObj = new Date(anno, parseInt(mese)-1, d);
        let giornoNome = giorniSettimana[dObj.getDay()];
        let ev = turni.find(t => t.start === dStr && !t.title.includes('FERIE') && t.title !== 'FEP');
        
        let titolo = ev ? ev.title.replace(/<i[^>]*><\/i>/g, '').replace(/\(Sospeso\)/g, '').trim() : "";
        let codiceBase = titolo.toUpperCase();

        let locMonta = "", dalle = "", alle = "", note = "";

        if (state.note[dStr]) note = state.note[dStr].substring(0, 30) + (state.note[dStr].length > 30 ? "..." : "");

        if (codiceBase !== "RI" && codiceBase !== "RIPOSO" && codiceBase !== "AL" && codiceBase !== "DISP" && codiceBase !== "") {
            let dbCorrente = {};
            const dSelezionataNum = stringToNum(dStr);
            for (let i = dateChiavi.length - 1; i >= 0; i--) { 
                if (dSelezionataNum >= stringToNum(dateChiavi[i])) { 
                    dbCorrente = state.dbCache[dateChiavi[i]]; 
                    break; 
                } 
            }
            
            let chiaveTrovata = trovaChiaveEsatta(dbCorrente, codiceBase, dStr);
            let dettagli = dbCorrente[chiaveTrovata];

            if (dettagli) {
                locMonta = dettagli.luogoInizio || "";
                dalle = dettagli.inizio || "";
                alle = dettagli.fine || "";
                if (dettagli.inizio2 && dettagli.fine2) {
                    alle += ` (Ripr: ${dettagli.inizio2}-${dettagli.fine2})`;
                }
            }
        }

        let bg = dObj.getDay() === 0 ? "background-color: #f9f9f9;" : "";

        html += `
        <tr style="border-bottom: 1px solid #ddd; ${bg} page-break-inside: avoid;">
            <td style="padding: 5px 8px;">${String(d).padStart(2, '0')} ${giornoNome}</td>
            <td style="padding: 5px 8px; font-weight: bold;">${titolo}</td>
            <td style="padding: 5px 8px;">${locMonta}</td>
            <td style="padding: 5px 8px;">${dalle}</td>
            <td style="padding: 5px 8px;">${alle}</td>
            <td style="padding: 5px 8px; font-size: 10px;">${note}</td>
        </tr>`;
    }

    html += `
            </tbody>
        </table>
    </div>`;

    let wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    chiudiPdfTipo2Modal();

    const opt = {
        margin:       10,
        filename:     `Bibbia_${meseNome}_${anno}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(wrapper).save();
}

function apriCambioBibbia() {
    chiudiMenuDestro();
    document.getElementById('cambioBibbiaModal').style.display = 'block';
}

function chiudiCambioBibbia() {
    document.getElementById('cambioBibbiaModal').style.display = 'none';
}

function confermaCambioBibbia() {
    state.depositoAttivo = null;
    delete state.riposoStart;
    delete state.rotazioneStart;
    delete state.turnoIndex;
    delete state.history;
    delete state.futureConfig;
    delete state.baseDataFutura;
    delete state.tcPattern;
    state.setupStep = 0;
    
    let boost = new Date().getTime() + 5000;
    salvaERicarica(boost);
}

function saltaConfigurazione() {
    document.getElementById('welcomeModal').style.display = 'none';
    state.setupSkipped = true;
    salvaLocal();
    controllaEmptyState();
}

function controllaEmptyState() {
    if (!state.depositoAttivo && state.setupSkipped) {
        document.getElementById('calendar').style.display = 'none';
        document.getElementById('empty-state-calendario').style.display = 'block';
    } else {
        document.getElementById('calendar').style.display = 'block';
        document.getElementById('empty-state-calendario').style.display = 'none';
    }
}

function initProfili() {
    if (!state.profiliSalvati) {
        state.profiliSalvati = {};
        state.profiloAttivoId = "default";
        
        if (state.depositoAttivo) {
            salvaStatoInProfilo("default", "I Miei Turni");
        } else {
            state.profiliSalvati["default"] = { 
                nome: "I Miei Turni", variazioni: {}, note: {}, colori: {}, ferie: {}, 
                version: state.version || "0", setupStep: 0, setupSkipped: false 
            };
        }
    }
    renderizzaProfiliUI();
}

function salvaStatoInProfilo(id, nome) {
    let datiProfilo = {
        nome: nome,
        depositoAttivo: state.depositoAttivo,
        riposoStart: state.riposoStart,
        rotazioneStart: state.rotazioneStart,
        turnoIndex: state.turnoIndex,
        tcPattern: state.tcPattern,
        history: state.history,
        futureConfig: state.futureConfig,
        baseDataFutura: state.baseDataFutura,
        variazioni: state.variazioni || {},
        note: state.note || {},
        colori: state.colori || {},
        ferie: state.ferie || {},
        nebbia: state.nebbia || {},
        straordinario: state.straordinario || {},
        sospesoRiposo: state.sospesoRiposo || {},
        buonoPasto: state.buonoPasto || {},
        permessoSP: state.permessoSP || {},
        setupStep: state.setupStep,
        setupSkipped: state.setupSkipped,
        version: state.version || "0" 
    };
    state.profiliSalvati[id] = datiProfilo;
}

function cambiaProfilo(idSelezionato) {
    if (state.profiloAttivoId === idSelezionato) return; 
    
    let nomeAttuale = state.profiliSalvati[state.profiloAttivoId] ? state.profiliSalvati[state.profiloAttivoId].nome : "Profilo";
    salvaStatoInProfilo(state.profiloAttivoId, nomeAttuale);
    
    let nuovoProfilo = state.profiliSalvati[idSelezionato];
    state.profiloAttivoId = idSelezionato;
    
    state.depositoAttivo = nuovoProfilo.depositoAttivo;
    state.riposoStart = nuovoProfilo.riposoStart;
    state.rotazioneStart = nuovoProfilo.rotazioneStart;
    state.turnoIndex = nuovoProfilo.turnoIndex;
    state.tcPattern = nuovoProfilo.tcPattern;
    state.history = nuovoProfilo.history;
    state.futureConfig = nuovoProfilo.futureConfig;
    state.baseDataFutura = nuovoProfilo.baseDataFutura;
    state.variazioni = nuovoProfilo.variazioni || {};
    state.note = nuovoProfilo.note || {};
    state.colori = nuovoProfilo.colori || {};
    state.ferie = nuovoProfilo.ferie || {};
    state.nebbia = nuovoProfilo.nebbia || {};
    state.straordinario = nuovoProfilo.straordinario || {};
    state.sospesoRiposo = nuovoProfilo.sospesoRiposo || {};
    state.buonoPasto = nuovoProfilo.buonoPasto || {};
    state.permessoSP = nuovoProfilo.permessoSP || {};
    state.setupStep = nuovoProfilo.setupStep || 0;
    state.setupSkipped = nuovoProfilo.setupSkipped || false;
    state.version = nuovoProfilo.version || "0"; 
    
    chiudiMenuDestro();
    salvaERicarica();
}

function avviaNuovoProfilo() {
    let nome = prompt("Inserisci un nome per questo nuovo profilo (es. Moglie, Collega):");
    if (!nome || nome.trim() === "") return;
    
    let nuovoId = "prof_" + new Date().getTime();
    
    let nomeAttuale = state.profiliSalvati[state.profiloAttivoId] ? state.profiliSalvati[state.profiloAttivoId].nome : "I Miei Turni";
    salvaStatoInProfilo(state.profiloAttivoId, nomeAttuale);
    
    state.profiliSalvati[nuovoId] = { 
        nome: nome.trim(), variazioni: {}, note: {}, colori: {}, ferie: {},
        nebbia: {}, straordinario: {}, sospesoRiposo: {}, buonoPasto: {}, permessoSP: {},
        setupStep: 0, setupSkipped: false, version: "0" 
    };
    state.profiloAttivoId = nuovoId;
    
    state.depositoAttivo = null;
    state.riposoStart = null;
    state.rotazioneStart = null;
    state.turnoIndex = null;
    state.history = null;
    state.futureConfig = null;
    state.variazioni = {};
    state.note = {};
    state.colori = {};
    state.ferie = {};
    state.nebbia = {};
    state.straordinario = {};
    state.sospesoRiposo = {};
    state.buonoPasto = {};
    state.permessoSP = {};
    state.setupStep = 0;
    state.setupSkipped = false;
    state.version = "0";
    
    chiudiMenuDestro();
    salvaERicarica();
}

function rinominaProfilo(id) {
    let p = state.profiliSalvati[id];
    let nuovoNome = prompt("Rinomina il profilo:", p.nome);
    if (nuovoNome && nuovoNome.trim() !== "") {
        p.nome = nuovoNome.trim();
        if (id === state.profiloAttivoId) {
            salvaStatoInProfilo(id, p.nome);
        }
        salvaERicarica(); 
    }
}

function eliminaProfilo(id) {
    let p = state.profiliSalvati[id];
    let numProfili = Object.keys(state.profiliSalvati).length;
    
    if (numProfili <= 1) {
        alert("Non puoi eliminare l'unico profilo rimasto. Usa 'Reset Totale' se vuoi cancellare tutto.");
        return;
    }

    if (confirm(`Sei sicuro di voler eliminare il profilo "${p.nome}" e tutti i suoi turni?`)) {
        if (id === state.profiloAttivoId) {
            let altriIds = Object.keys(state.profiliSalvati).filter(k => k !== id);
            let idFallback = altriIds[0];
            let fallback = state.profiliSalvati[idFallback];
            
            state.profiloAttivoId = idFallback;
            state.depositoAttivo = fallback.depositoAttivo;
            state.riposoStart = fallback.riposoStart;
            state.rotazioneStart = fallback.rotazioneStart;
            state.turnoIndex = fallback.turnoIndex;
            state.tcPattern = fallback.tcPattern;
            state.history = fallback.history;
            state.futureConfig = fallback.futureConfig;
            state.variazioni = fallback.variazioni || {};
            state.note = fallback.note || {};
            state.colori = fallback.colori || {};
            state.ferie = fallback.ferie || {};
            state.nebbia = fallback.nebbia || {};
            state.straordinario = fallback.straordinario || {};
            state.sospesoRiposo = fallback.sospesoRiposo || {};
            state.buonoPasto = fallback.buonoPasto || {};
            state.permessoSP = fallback.permessoSP || {};
            state.setupStep = fallback.setupStep || 0;
            state.setupSkipped = fallback.setupSkipped || false;
            state.version = fallback.version || "0";
        }
        delete state.profiliSalvati[id];
        chiudiMenuDestro();
        salvaERicarica();
    }
}

function renderizzaProfiliUI() {
    let container = document.getElementById('lista-profili-dinamica');
    if (!container || !state.profiliSalvati) return;
    
    let html = "";
    let numProfili = Object.keys(state.profiliSalvati).length;

    for (let id in state.profiliSalvati) {
        let p = state.profiliSalvati[id];
        let isAttivo = (id === state.profiloAttivoId);
        
        let bg = isAttivo ? 'var(--turno)' : 'var(--bg)';
        let color = isAttivo ? 'white' : 'var(--text)';
        let icona = isAttivo ? '<i class="fa-solid fa-circle-dot"></i>' : '<i class="fa-regular fa-circle"></i>';
        let border = isAttivo ? '2px solid var(--turno)' : '1px solid var(--border-color)';
        
        html += `
        <div style="border: ${border}; border-radius: 12px; overflow: hidden; margin-bottom: 10px; background: ${bg}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <button class="btn btn-reset" style="background: transparent; color: ${color}; border: none; border-radius: 0; text-align: left; margin: 0; padding: 12px 15px; width: 100%; font-weight: bold; font-size: 16px; display: block;" onclick="cambiaProfilo('${id}')">
                ${icona} ${p.nome}
            </button>
            <div style="display: flex; border-top: 1px solid rgba(0,0,0,0.05); background: ${isAttivo ? 'rgba(255,255,255,0.1)' : 'transparent'};">
                <button class="btn btn-reset" style="background: transparent; color: ${isAttivo ? 'white' : 'var(--text-muted)'}; border: none; border-radius: 0; border-right: 1px solid rgba(0,0,0,0.05); margin: 0; padding: 8px; flex: 1; font-size: 13px;" onclick="rinominaProfilo('${id}')"><i class="fa-solid fa-pen"></i> Rinomina</button>
                ${numProfili > 1 ? `
                <button class="btn btn-reset" style="background: transparent; color: ${isAttivo ? '#ffc9c9' : '#f5365c'}; border: none; border-radius: 0; margin: 0; padding: 8px; flex: 1; font-size: 13px;" onclick="eliminaProfilo('${id}')"><i class="fa-solid fa-trash-can"></i> Elimina</button>
                ` : `<div style="flex:1;"></div>`}
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

function stringToNum(s) { 
    if(!s) return 0; 
    let p = s.split('-'); 
    return Math.floor(Date.UTC(p[0], p[1]-1, p[2]) / 86400000); 
}

function formattaData(d) { 
    let dataObj = new Date(d); 
    let mese = dataObj.toLocaleDateString('it-IT', { month: 'long' }); 
    return dataObj.getDate() + ' ' + mese.charAt(0).toUpperCase() + mese.slice(1); 
}

function salvaLocal(timestampManuale = null) { 
    state.lastUpdate = timestampManuale || new Date().getTime();
    
    if (state.profiloAttivoId && state.profiliSalvati) {
        let nomeAttuale = state.profiliSalvati[state.profiloAttivoId] ? state.profiliSalvati[state.profiloAttivoId].nome : "I Miei Turni";
        salvaStatoInProfilo(state.profiloAttivoId, nomeAttuale);
    }

    let copiaDati = JSON.parse(JSON.stringify(state)); 
    delete copiaDati.dbCache; 
    delete copiaDati.rotCache; 
    delete copiaDati.dispCache; 
    
    localStorage.setItem('myTurniApp', JSON.stringify(copiaDati)); 

    if (typeof window.syncToCloud === 'function') { 
        window.syncToCloud(copiaDati); 
    }
}

function salvaERicarica(timestampManuale = null) {
    state.lastUpdate = timestampManuale || new Date().getTime();
    
    if (state.profiloAttivoId && state.profiliSalvati) {
        let nomeAttuale = state.profiliSalvati[state.profiloAttivoId] ? state.profiliSalvati[state.profiloAttivoId].nome : "I Miei Turni";
        salvaStatoInProfilo(state.profiloAttivoId, nomeAttuale);
    }

    let copiaDati = JSON.parse(JSON.stringify(state));
    delete copiaDati.dbCache;
    delete copiaDati.rotCache;
    delete copiaDati.dispCache;

    localStorage.setItem('myTurniApp', JSON.stringify(copiaDati));
    document.body.style.opacity = '0.6';

    if (typeof window.syncToCloud === 'function' && window.utenteLoggato) {
        Promise.race([
            window.syncToCloud(copiaDati),
            new Promise(resolve => setTimeout(resolve, 2500))
        ]).then(() => {
            location.reload();
        });
    } else {
        location.reload();
    }
}

function estraiDataDaNome(nome) { 
    const match = nome.match(/\d{4}-\d{2}-\d{2}/); 
    return match ? match[0] : null; 
}

function dateToLocalISO(d) { 
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'); 
}

function creaDataSicura(dataStr) { 
    if(!dataStr) return new Date(); 
    let p = dataStr.split('-'); 
    return new Date(p[0], p[1] - 1, p[2], 12, 0, 0); 
}

function trovaChiaveEsatta(db, codiceBase, dateStr) {
    if (!db || !codiceBase) return codiceBase;
    
    let codiciDaCercare = [codiceBase];
    
    let matchB = codiceBase.match(/^([1-9])B(\d{2})$/);
    if (matchB) {
        let linea = matchB[1];
        let finale = matchB[2];
        let letteraPilota = (linea === '1' || linea === '2') ? 'C' : 'P';
        
        let regex = new RegExp(`^${linea}[A-Z]${finale}$`);
        let trovati = Object.keys(db).filter(k => regex.test(k));
        if (trovati.length > 0) {
            codiciDaCercare.push(...trovati);
        } else {
            codiciDaCercare.push(`${linea}${letteraPilota}${finale}`);
        }
    } else {
        let match50 = codiceBase.match(/^([A-Z0-9]+?)(\d{2})$/);
        if (match50) {
            let pref = match50[1];
            let num = parseInt(match50[2], 10);
            if (num >= 50) {
                let numPilota = String(num - 50).padStart(2, '0');
                codiciDaCercare.push(pref + numPilota);
            }
        }
    }

    let giornoIdx = creaDataSicura(dateStr).getDay(); 
    let targetDay = giornoIdx === 0 ? 7 : giornoIdx; 
    const dayMap = { "LUN": 1, "MAR": 2, "MER": 3, "GIO": 4, "VEN": 5, "SAB": 6, "DOM": 7 };

    for (let codCercato of codiciDaCercare) {
        let keys = Object.keys(db).filter(k => k === codCercato || k.startsWith(codCercato + "_"));
        
        let exactMatch = null;
        let genericMatch = null;

        for (let k of keys) {
            if (k === codCercato) {
                genericMatch = k;
                continue;
            }
            
            let suffix = k.substring(codCercato.length + 1); 
            
            if (suffix.includes("-")) {
                let parts = suffix.split("-");
                if (parts.length === 2 && dayMap[parts[0]] && dayMap[parts[1]]) {
                    let start = dayMap[parts[0]];
                    let end = dayMap[parts[1]];
                    
                    if (start <= end) { 
                        if (targetDay >= start && targetDay <= end) exactMatch = k;
                    } else { 
                        if (targetDay >= start || targetDay <= end) exactMatch = k;
                    }
                }
            } else {
                if (dayMap[suffix] && dayMap[suffix] === targetDay) {
                    exactMatch = k;
                }
            }
        }
        if (exactMatch) return exactMatch;
        if (genericMatch) return genericMatch;
    }
    
    return codiceBase; 
}

function getRotazionePerData(dateStr) {
    const dSelezionata = stringToNum(dateStr);
    const dateChiavi = Object.keys(state.rotCache || {}).sort();
    if (dateChiavi.length === 0) return null;
    
    let rotCorrente = state.rotCache[dateChiavi[0]]; 
    for (let i = dateChiavi.length - 1; i >= 0; i--) { 
        if (dSelezionata >= stringToNum(dateChiavi[i])) { 
            rotCorrente = state.rotCache[dateChiavi[i]]; 
            break; 
        } 
    }
    return rotCorrente;
}

function getDispPerData(dateStr) {
    const dSelezionata = stringToNum(dateStr);
    const dateChiavi = Object.keys(state.dispCache || {}).sort();
    if (dateChiavi.length === 0) return null;
    
    let dispCorrente = state.dispCache[dateChiavi[0]]; 
    for (let i = dateChiavi.length - 1; i >= 0; i--) { 
        if (dSelezionata >= stringToNum(dateChiavi[i])) { 
            dispCorrente = state.dispCache[dateChiavi[i]]; 
            break; 
        } 
    }
    return dispCorrente;
}

function trovaDataCambioProssimo(dataRifStr) {
    const rif = stringToNum(dataRifStr);
    const dateChiavi = Object.keys(state.rotCache || {}).sort();
    const futura = dateChiavi.find(d => stringToNum(d) > rif);
    return futura || null;
}

function scaricaPDF() {
    chiudiMenuDestro();
    const element = document.getElementById('calendar');
    let titleEl = document.querySelector('.fc-toolbar-title');
    let meseTesto = titleEl ? titleEl.innerText.replace(/ /g, "_") : "Calendario";
    const originalWidth = element.style.width;
    
    element.style.width = '700px';
    calendar.setOption('height', 960); 
    calendar.updateSize();
    
    const opt = {
        margin: [10, 5, 10, 5], 
        filename: `Turni_${meseTesto}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 800 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    const buttons = document.querySelectorAll('.fc-button'); 
    buttons.forEach(b => b.style.display = 'none');
    
    setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(() => {
            buttons.forEach(b => b.style.display = ''); 
            element.style.width = originalWidth;
            calendar.setOption('height', 'auto'); 
            calendar.updateSize();
        });
    }, 300);
}

async function caricaDatiEsterniDinamici() {
    try {
        const nocache = "?v=" + new Date().getTime();
        const resMappa = await fetch("mappa_file.json" + nocache);
        if (!resMappa.ok) throw new Error("Mappa file non trovata");
        const mappa = await resMappa.json();
        const albero = mappa.albero || [];

        if (albero.includes("rotazione_ferie.json")) {
            try {
                const resFerie = await fetch("rotazione_ferie.json" + nocache);
                if (resFerie.ok) {
                    const datiFerie = await resFerie.json();
                    if (datiFerie.versione) VERSIONE_FERIE = datiFerie.versione;
                    ROT_FERIE_INV = datiFerie.invernali || [];
                    ROT_FERIE_EST = datiFerie.estive || [];
                }
            } catch (e) { console.error("Errore ferie", e); }
        }

        if (AVVISO_VARIANTI && albero.includes("presenza_varianti.json")) {
            try {
                const resVar = await fetch("presenza_varianti.json" + nocache);
                if (resVar.ok) variantiData = await resVar.json();
            } catch (e) { console.error("Errore varianti", e); }
        }

        state.dbCache = {};
        state.rotCache = {};
        state.dispCache = {};

        for (let file of albero) {
            const dataInizio = estraiDataDaNome(file);
            if (!dataInizio) continue;

            try {
                if (file.startsWith("info_turni_")) {
                    const res = await fetch(file + nocache);
                    if (res.ok) state.dbCache[dataInizio] = await res.json();
                } else if (file.startsWith("rotazioni_")) {
                    const res = await fetch(file + nocache);
                    if (res.ok) state.rotCache[dataInizio] = await res.json();
                } else if (file.startsWith("turni_disp_")) {
                    const res = await fetch(file + nocache);
                    if (res.ok) state.dispCache[dataInizio] = await res.json();
                }
            } catch(e) { console.error("Errore caricamento " + file, e); }
        }
    } catch (e) { console.error("Errore caricamento dinamico", e); }
}

async function inizializzaApp() {
    await caricaDatiEsterniDinamici();

    initProfili();

    if (!state.ferie) {
        state.ferie = { version: VERSIONE_FERIE, scambi: {} };
    } else if (state.ferie.version !== VERSIONE_FERIE) {
        let avevaConfigurato = state.ferie.baseAnno !== undefined;
        state.ferie = { version: VERSIONE_FERIE, scambi: {} };
        let boost = new Date().getTime() + 5000;
        salvaLocal(boost);
        if (avevaConfigurato) {
            alert("⚠️ Aggiornamento Rotazione Ferie: Le sequenze delle ferie programmate sono state modificate in una nuova versione. È necessario reinserire il gruppo base e gli eventuali scambi.");
        }
    }
    
    const imgElem = document.getElementById('turnoImage');
    if (typeof Panzoom !== 'undefined') {
        pzInstance = Panzoom(imgElem, { maxScale: 5, minScale: 1 });
        document.getElementById('imageFlexContainer').addEventListener('wheel', pzInstance.zoomWithWheel);
        
        function eseguiZoomToggle(e) {
            if (!pzInstance) return;
            let currentScale = pzInstance.getScale();
            if (currentScale < 1.1) { 
                pzInstance.zoom(1.75, { animate: true }); 
            } else { 
                pzInstance.reset({ animate: true }); 
            }
        }
        
        let lastTap = 0; 
        let isPinching = false;
        imgElem.addEventListener('touchstart', function(e) { 
            if (e.touches.length > 1) { isPinching = true; } 
        });
        imgElem.addEventListener('touchend', function(e) {
            if (isPinching) { 
                if (e.touches.length === 0) { setTimeout(() => isPinching = false, 300); } 
                return; 
            }
            let currentTime = new Date().getTime(); 
            let tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) { 
                eseguiZoomToggle(e); 
                if (e.cancelable) e.preventDefault(); 
            }
            lastTap = currentTime;
        });
        imgElem.addEventListener('dblclick', function(e) { eseguiZoomToggle(e); });
    }

    if (!state.depositoAttivo) { 
        if (state.setupSkipped) {
            controllaEmptyState();
            aggiornaUI();
        } else {
            document.getElementById('welcomeModal').style.display = 'block'; 
        }
    } else if (state.version !== VERSIONE_TURNI) {
        const deveResettare = RESET_DOPO_AGGIORNAMENTO[state.depositoAttivo] !== false;
        if (state.depositoAttivo.startsWith('disp_') || !deveResettare) {
            state.version = VERSIONE_TURNI; 
            let boost = new Date().getTime() + 5000;
            salvaLocal(boost); 
            aggiornaUI(); 
            inizializzaCalendario();
        } else {
            const dataLimiteObj = new Date(DATA_INIZIO_NUOVI_TURNI); 
            const dataMenoUnoObj = new Date(dataLimiteObj);
            dataMenoUnoObj.setDate(dataMenoUnoObj.getDate() - 1);
            
            document.getElementById('welcomeTitle').innerText = "Aggiornamento Turni";
            document.getElementById('welcomeDesc').innerText = `Il calendario rimarrà invariato fino al ${formattaData(dataMenoUnoObj.toISOString().split('T')[0])}. Dal ${formattaData(DATA_INIZIO_NUOVI_TURNI)} inizierà la nuova rotazione.`;
            document.getElementById('depotSelectMain').style.display = 'none';
            document.getElementById('btnConfRot').disabled = false;
            document.getElementById('btnConfRot').style.background = 'var(--turno)';
            document.getElementById('btnConfRot').innerText = "Avvia Aggiornamento";
            
            const btnSalta = document.querySelector('button[onclick="saltaConfigurazione()"]');
            if (btnSalta) btnSalta.style.display = 'none';
            
            document.getElementById('welcomeModal').style.display = 'block';
        }
    } else {
        aggiornaUI(); 
        controllaEmptyState(); 
        inizializzaCalendario(); 
        checkGuida();
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('oggi') === 'true') {
            let dObj = new Date(); 
            let todayStr = dateToLocalISO(dObj);
            setTimeout(() => gestisciInterazione(todayStr), 300);
            
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({path: newUrl}, '', newUrl);
        }
    }
    
    let btnConfRot = document.getElementById('depotSelectMain');
    if (btnConfRot) {
        btnConfRot.addEventListener('change', () => {
            document.getElementById('btnConfRot').disabled = false; 
            document.getElementById('btnConfRot').style.background = 'var(--turno)';
            document.getElementById('btnConfRot').style.color = '#fff';
        });
    }
}

function confermaRotazione() {
    if (!state.depositoAttivo) { 
        state.depositoAttivo = document.getElementById('depotSelectMain').value; 
        state.setupStep = 1; 
        state.setupSkipped = false;
    } else if (state.version !== VERSIONE_TURNI) { 
        state.history = { 
            riposoStart: state.riposoStart, 
            rotazioneStart: state.rotazioneStart,
            depositoAttivo: state.depositoAttivo,
            turnoIndex: state.turnoIndex, 
            tcPattern: state.tcPattern 
        }; 
    }
    
    state.version = VERSIONE_TURNI; 
    document.getElementById('welcomeModal').style.display = 'none';
    
    if (!state.riposoStart || state.setupStep < 3) { 
        aggiornaUI(); 
        controllaEmptyState();
        inizializzaCalendario(); 
        checkGuida(); 
        let boost = new Date().getTime() + 5000;
        salvaLocal(boost); 
    } else { 
        avviaRiconfigurazioneAggiornamento(); 
    }
}

function tornaAllaRotazione() { 
    state.setupStep = 0; 
    state.depositoAttivo = null; 
    salvaERicarica(); 
}

function checkGuida() {
    if (state.setupStep === 1) {
        document.getElementById('stepTitle').innerText = "Passo 2"; 
        document.getElementById('stepDesc').innerText = "Seleziona nel calendario uno dei tuoi riposi singoli";
        document.getElementById('btnConfirmDate').style.display = "none"; 
        document.getElementById('btnBackStep').style.display = "block"; 
        document.getElementById('btnCloseStep').style.display = "block"; 
        document.getElementById('btnCloseStep').innerText = "Seleziona";
        document.getElementById('stepModal').style.display = 'block';
    }
}

function abilitaSalvataggio() { 
    document.getElementById('btnSalvaCambio').disabled = false; 
}

async function gestisciInterazione(date) {
    selectedDate = date;
    if (state.setupStep === 1) {
        document.getElementById('stepDateDisplay').innerText = formattaData(date); 
        document.getElementById('stepDesc').innerText = "È un tuo giorno di riposo?";
        document.getElementById('btnConfirmDate').style.display = "block"; 
        document.getElementById('btnBackStep').style.display = "none"; 
        document.getElementById('btnCloseStep').style.display = "block"; 
        document.getElementById('btnCloseStep').innerText = "Chiudi";
        document.getElementById('stepModal').style.display = 'block';
    } else {
        document.getElementById('modalDate').innerText = formattaData(date);
        let areaVarianti = document.getElementById('avvisoVariantiArea'); 
        areaVarianti.style.display = 'none'; 
        
        if (AVVISO_VARIANTI && variantiData && variantiData.hasOwnProperty(date)) {
            let lineeData = variantiData[date];
            let isEmpty = (Array.isArray(lineeData) && lineeData.length === 0) || (typeof lineeData === 'string' && lineeData.trim() === '') || !lineeData;
            
            if (isEmpty) { 
                areaVarianti.innerHTML = "⚠️ Attenzione: nella data selezionata sono presenti varianti per il servizio, verificare le DDS su spriss."; 
            } else { 
                let linee = Array.isArray(lineeData) ? lineeData.join(", ") : lineeData; 
                areaVarianti.innerHTML = "⚠️ Attenzione: nella data selezionata sono presenti varianti per le linee: " + linee; 
            }
            areaVarianti.style.display = 'block';
        }
        
        let infoArea = document.getElementById('infoTurniArea'); 
        let turniCalc = calcolaTurni();
        let turnoCorrenteObj = turniCalc.find(e => e.start === date && !e.title.includes('FERIE') && e.title !== 'FEP');
        let nomeTurnoCompleto = turnoCorrenteObj ? turnoCorrenteObj.title : "Nessun turno";
        let nomeTurnoPulito = nomeTurnoCompleto.replace(/<i[^>]*><\/i>/g, '').replace(/\(Sospeso\)/g, '').trim();
        let codiceBase = nomeTurnoPulito.toUpperCase();
        
        document.getElementById('singleTurnoSelect').style.display = 'block';
        let htmlInfo = `<strong>Turno attuale:</strong> ${nomeTurnoPulito} ${state.variazioni[date] ? '(Modificato)' : ''}`;

        try {
            const ddsList = await new Promise((resolve) => {
                const reqDB = indexedDB.open("UtilityDB");
                reqDB.onsuccess = (e) => {
                    const db = e.target.result; 
                    if (!db.objectStoreNames.contains("archivio_dds")) { 
                        db.close(); 
                        resolve([]); 
                        return; 
                    }
                    const tx = db.transaction("archivio_dds", "readonly"); 
                    const store = tx.objectStore("archivio_dds");
                    const reqAll = store.getAll(); 
                    reqAll.onsuccess = () => { 
                        const res = reqAll.result; 
                        db.close(); 
                        resolve(res); 
                    };
                    reqAll.onerror = () => { 
                        db.close(); 
                        resolve([]); 
                    };
                };
                reqDB.onerror = () => resolve([]);
            });
            
            const validDDS = ddsList.filter(item => item.dateValidita && item.dateValidita.includes(date));
            validDDS.forEach(item => { 
                htmlInfo += `<br><span style="color: #d63384; font-weight: bold;"><i class="fa-solid fa-circle-info"></i> "${item.titolo}"</span>`; 
            });
        } catch (e) { 
            console.error("Errore lettura DDS per modal", e); 
        }
        
        if (state.variazioni[date]) {
            let tempVar = state.variazioni[date]; 
            delete state.variazioni[date];
            let turniSenzaVariazioni = calcolaTurni();
            let turnoOrigObj = turniSenzaVariazioni.find(e => e.start === date && !e.title.includes('FERIE') && e.title !== 'FEP');
            let origPulito = turnoOrigObj ? turnoOrigObj.title.replace(/<i[^>]*><\/i>/g, '').replace(/\(Sospeso\)/g, '').trim() : "Nessun turno";
            htmlInfo += `<br><span style="font-size: 0.9em; color: var(--text-muted);"><b>Turno original:</b> ${origPulito}</span>`;
            state.variazioni[date] = tempVar;
            
            if (localStorage.getItem('auth_rotazioni')) {
                let turnoAttualePulito = tempVar.replace(/<i[^>]*><\/i>/g, '').replace(/\(Sospeso\)/g, '').trim().toUpperCase();
                let parts = date.split('-'); 
                let anno = parts[0]; 
                let meseIdx = parseInt(parts[1], 10) - 1; 
                let giornoNum = parseInt(parts[2], 10).toString(); 
                const mesiNomi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
                let meseNome = mesiNomi[meseIdx]; 
                let urlRotazioni = `rotazioni/rotazioni_${meseNome}_${anno}.json?v=${new Date().getTime()}`;
                
                htmlInfo += `<div id="proprietario-turno-container" style="font-size: 0.9em; color: var(--turno); margin-top: 5px;"><i class="fa-solid fa-spinner fa-spin"></i> <i>Ricerca titolare in corso...</i></div>`;
                
                fetch(urlRotazioni).then(res => { 
                    if (!res.ok) throw new Error("File non trovato"); 
                    return res.json(); 
                }).then(rotData => {
                        let trovati = [];
                        
                        let tCercatoClean = turnoAttualePulito.replace(/\s+/g, '');
                        let codiciDaCercareArray = [tCercatoClean];
                        
                        let matchB_rot = tCercatoClean.match(/^([1-9])B(\d{2})$/);
                        if (matchB_rot) {
                            let l = matchB_rot[1]; let f = matchB_rot[2];
                            let letteraPilota = (l === '1' || l === '2') ? 'C' : 'P';
                            
                            let regex = new RegExp(`^${l}[A-Z]${f}$`);
                            let dbMatches = Object.keys(dbCorrente).filter(k => regex.test(k));
                            if(dbMatches.length > 0) codiciDaCercareArray.push(...dbMatches);
                            else codiciDaCercareArray.push(`${l}${letteraPilota}${f}`, `${l}C${f}`, `${l}P${f}`);
                        } else {
                            let match50_rot = tCercatoClean.match(/^([A-Z0-9]+?)(\d{2})$/);
                            if (match50_rot) {
                                let p = match50_rot[1]; let n = parseInt(match50_rot[2], 10);
                                if (n >= 50) codiciDaCercareArray.push(p + String(n - 50).padStart(2, '0'));
                            }
                        }
                        
                        for (let rotName in rotData) {
                            let dipendenti = rotData[rotName];
                            for (let nome in dipendenti) {
                                let tAssegnato = dipendenti[nome][giornoNum];
                                if (tAssegnato) {
                                    let tClean = tAssegnato.toUpperCase().replace(/\s+/g, '');
                                    if (codiciDaCercareArray.includes(tClean)) {
                                        trovati.push(nome.split(" - ").join(" e "));
                                    }
                                }
                            }
                        }
                        
                        let container = document.getElementById('proprietario-turno-container');
                        if (container) {
                            if (trovati.length > 0) {
                                container.innerHTML = `<i class="fa-solid fa-users"></i> <b>:</b> ${trovati.join(", ")}`;
                            } else {
                                container.innerHTML = ``; 
                            }
                        }
                    }).catch(e => { 
                    let container = document.getElementById('proprietario-turno-container'); 
                    if (container) container.innerHTML = ``; 
                });
            }
        }
        
        const dateChiavi = Object.keys(state.dbCache || {}).sort(); 
        let dbCorrente = {}; 
        let dataAttiva = dateChiavi[0] || "2026-03-02";
        const dSelezionata = stringToNum(date);
        
        for (let i = dateChiavi.length - 1; i >= 0; i--) { 
            if (dSelezionata >= stringToNum(dateChiavi[i])) { 
                dbCorrente = state.dbCache[dateChiavi[i]]; 
                dataAttiva = dateChiavi[i]; 
                break; 
            } 
        }
        
        let chiaveTrovata = trovaChiaveEsatta(dbCorrente, codiceBase, date); 
        let dettagli = dbCorrente[chiaveTrovata];
        
        if (dettagli) { 
            htmlInfo += `<hr style="margin:10px 0; border:0; border-top:1px solid var(--border-color);">`; 
            htmlInfo += `<b>Inizio:</b> ${dettagli.inizio} (${dettagli.luogoInizio})<br><b>Fine:</b> ${dettagli.fine} (${dettagli.luogoFine})`; 
        }
        
        if (state.nebbia[date] || state.straordinario[date] || state.sospesoRiposo[date] || state.note[date] || state.buonoPasto[date] || state.permessoSP[date]) {
            htmlInfo += `<hr style="margin:10px 0; border:0; border-top:1px solid var(--border-color);">`;
            if (state.sospesoRiposo[date]) htmlInfo += `<div style="margin-bottom: 5px;"><b>Riposo:</b> Sospeso</div>`;
            if (state.nebbia[date]) htmlInfo += `<div style="margin-bottom: 5px;"><i class="fa-solid fa-smog fa-fw"></i> <b>Indennità Nebbia:</b> Presente</div>`;
            if (state.buonoPasto[date]) htmlInfo += `<div style="margin-bottom: 5px;"><i class="fa-solid fa-utensils fa-fw"></i> <b>Buono Pasto:</b> Utilizzato</div>`;
            if (state.straordinario[date]) htmlInfo += `<div style="margin-bottom: 5px;"><i class="fa-solid fa-stopwatch fa-fw"></i> <b>Straordinario:</b> ${state.straordinario[date].ore}h ${state.straordinario[date].minuti}m</div>`;
            if (state.permessoSP[date]) htmlInfo += `<div style="margin-bottom: 5px;"><i class="fa-solid fa-money-bill-wave fa-fw"></i> <b>Perm. Senza Paga:</b> ${state.permessoSP[date].ore}h ${state.permessoSP[date].minuti}m</div>`;
            if (state.note[date]) htmlInfo += `<div style="margin-top: 5px; white-space: pre-wrap;"><i class="fa-solid fa-clipboard fa-fw"></i> <b>Note:</b><br>${state.note[date]}</div>`;
        }
        
        infoArea.innerHTML = htmlInfo; 
        infoArea.style.display = "block"; 
        popolaCambio();
        
        const btnImmagine = document.getElementById('btnVisualizzaTurno'); 
        let isRiposo = (codiceBase === 'RI' || codiceBase === 'RIPOSO' || codiceBase === 'AL');
        
        if (!isRiposo && codiceBase !== 'DISP' && codiceBase !== 'NESSUN TURNO') {
            if (chiaveTrovata !== codiceBase && dbCorrente[chiaveTrovata]) { 
                currentImagePath = `turni_${dataAttiva}/${chiaveTrovata}.jpg`; 
                imgBaseFallback = `turni_${dataAttiva}/${codiceBase}.jpg`; 
            } else { 
                currentImagePath = `turni_${dataAttiva}/${codiceBase}.jpg`; 
                imgBaseFallback = ""; 
            }
            btnImmagine.style.display = 'block';
        } else { 
            currentImagePath = ""; 
            imgBaseFallback = ""; 
            btnImmagine.style.display = 'none'; 
        }
        document.getElementById('editModal').style.display = 'block';
    }
}

function apriAltroModal() {
    document.getElementById('editModal').style.display = 'none';
    
    document.getElementById('checkSospesoRiposoAltro').checked = !!state.sospesoRiposo[selectedDate];
    document.getElementById('checkNebbiaAltro').checked = !!state.nebbia[selectedDate];
    document.getElementById('checkBuonoPastoAltro').checked = !!state.buonoPasto[selectedDate];
    
    let hasStraord = !!state.straordinario[selectedDate]; 
    document.getElementById('checkStraordinarioAltro').checked = hasStraord;
    document.getElementById('straordinarioInputsAltro').style.display = hasStraord ? 'flex' : 'none';
    document.getElementById('oreStraordAltro').value = hasStraord ? state.straordinario[selectedDate].ore : '';
    document.getElementById('minutiStraordAltro').value = hasStraord ? state.straordinario[selectedDate].minuti : '';
    
    let hasPermessoSP = !!state.permessoSP[selectedDate]; 
    document.getElementById('checkPermessoSPAltro').checked = hasPermessoSP;
    document.getElementById('permessoSPInputsAltro').style.display = hasPermessoSP ? 'flex' : 'none';
    document.getElementById('orePermessoSPAltro').value = hasPermessoSP ? state.permessoSP[selectedDate].ore : '';
    document.getElementById('minutiPermessoSPAltro').value = hasPermessoSP ? state.permessoSP[selectedDate].minuti : '';
    
    document.getElementById('notaAltro').value = state.note[selectedDate] || "";
    
    tempColoreAltro = state.colori[selectedDate] || ""; 
    aggiornaSelezioneColoreUI();
    
    document.getElementById('altroModal').style.display = 'block';
}

function chiudiAltroModal() { 
    document.getElementById('altroModal').style.display = 'none'; 
    document.getElementById('editModal').style.display = 'block'; 
}

function chiudiAltroSeSfondo(event) { 
    if (event.target.id === 'altroModal') chiudiAltroModal(); 
}

function toggleStraordinarioAltro() { 
    const isChecked = document.getElementById('checkStraordinarioAltro').checked; 
    document.getElementById('straordinarioInputsAltro').style.display = isChecked ? 'flex' : 'none'; 
}

function togglePermessoSPAltro() { 
    const isChecked = document.getElementById('checkPermessoSPAltro').checked; 
    document.getElementById('permessoSPInputsAltro').style.display = isChecked ? 'flex' : 'none'; 
}

function selezionaColoreAltro(hex, el) { 
    tempColoreAltro = hex; 
    aggiornaSelezioneColoreUI(); 
}

function aggiornaSelezioneColoreUI() { 
    document.querySelectorAll('.color-circle').forEach(c => { 
        c.classList.remove('selected'); 
        if (tempColoreAltro && c.getAttribute('data-color') === tempColoreAltro) { 
            c.classList.add('selected'); 
        } 
    }); 
}

function salvaAltro() {
    if (document.getElementById('checkSospesoRiposoAltro').checked) { 
        state.sospesoRiposo[selectedDate] = true; 
    } else { 
        delete state.sospesoRiposo[selectedDate]; 
    }
    
    if (document.getElementById('checkNebbiaAltro').checked) { 
        state.nebbia[selectedDate] = true; 
    } else { 
        delete state.nebbia[selectedDate]; 
    }
    
    if (document.getElementById('checkBuonoPastoAltro').checked) { 
        state.buonoPasto[selectedDate] = true; 
    } else { 
        delete state.buonoPasto[selectedDate]; 
    }
    
    if (document.getElementById('checkStraordinarioAltro').checked) { 
        state.straordinario[selectedDate] = { 
            ore: document.getElementById('oreStraordAltro').value || "0", 
            minuti: document.getElementById('minutiStraordAltro').value || "0" 
        }; 
    } else { 
        delete state.straordinario[selectedDate]; 
    }
    
    if (document.getElementById('checkPermessoSPAltro').checked) { 
        state.permessoSP[selectedDate] = { 
            ore: document.getElementById('orePermessoSPAltro').value || "0", 
            minuti: document.getElementById('minutiPermessoSPAltro').value || "0" 
        }; 
    } else { 
        delete state.permessoSP[selectedDate]; 
    }
    
    const notaVal = document.getElementById('notaAltro').value.trim(); 
    if (notaVal) { 
        state.note[selectedDate] = notaVal; 
    } else { 
        delete state.note[selectedDate]; 
    }
    
    if (tempColoreAltro) { 
        state.colori[selectedDate] = tempColoreAltro; 
    } else { 
        delete state.colori[selectedDate]; 
    }
    
    salvaERicarica(); 
}

function apriImmagineTurno() { 
    if (!currentImagePath) return; 
    let imgElement = document.getElementById('turnoImage'); 
    imgElement.onerror = erroreImmagine; 
    imgElement.src = currentImagePath; 
    if (pzInstance) { pzInstance.reset(); } 
    document.getElementById('imageModal').style.display = 'block'; 
}

function chiudiImageModal() { 
    document.getElementById('imageModal').style.display = 'none'; 
    document.getElementById('turnoImage').removeAttribute('src'); 
    if (pzInstance) { pzInstance.reset(); } 
}

function chiudiSeSfondo(event) { 
    if (event.target.id === 'imageModal' || event.target.id === 'imageFlexContainer') chiudiImageModal(); 
}

function chiudiEditSeSfondo(event) { 
    if (event.target.id === 'editModal') chiudiEdit(); 
}

function erroreImmagine() { 
    let imgElement = document.getElementById('turnoImage'); 
    if (imgBaseFallback) { 
        currentImagePath = imgBaseFallback; 
        imgElement.src = imgBaseFallback; 
        imgBaseFallback = ""; 
    } else { 
        imgElement.onerror = null; 
        alert("L'immagine del turno non è stata trovata nel database."); 
        chiudiImageModal(); 
    } 
}

function scaricaImmagineTurno() { 
    if (!currentImagePath) return; 
    const a = document.createElement('a'); 
    a.href = currentImagePath; 
    a.download = currentImagePath.split('/').pop(); 
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
}

function apriJumpModal() {
    const yearSelect = document.getElementById('jumpYear');
    if(yearSelect.options.length === 0) { 
        let currYear = new Date().getFullYear(); 
        for(let i = currYear - 2; i <= currYear + 5; i++) { 
            let opt = document.createElement('option'); 
            opt.value = i; 
            opt.text = i; 
            if(i === currYear) opt.selected = true; 
            yearSelect.appendChild(opt); 
        } 
    }
    let currMonth = (new Date().getMonth() + 1).toString().padStart(2, '0'); 
    document.getElementById('jumpMonth').value = currMonth; 
    document.getElementById('jumpModal').style.display = 'block';
}

function chiudiJumpModal() { 
    document.getElementById('jumpModal').style.display = 'none'; 
}

function eseguiSalto() { 
    let m = document.getElementById('jumpMonth').value; 
    let y = document.getElementById('jumpYear').value; 
    calendar.gotoDate(y + '-' + m + '-01'); 
    chiudiJumpModal(); 
}

function procediConfigurazione() {
    state.riposoStart = selectedDate; 
    document.getElementById('btnBackStep').style.display = "none";
    
    if (state.depositoAttivo.startsWith('disp_')) { 
        state.setupStep = 3; 
        salvaERicarica(); 
    } else if (state.depositoAttivo.startsWith('tc_')) {
        let altText = state.depositoAttivo === 'tc_spez_lido' ? 'Alternati (es. DISP, Turno)' : 'Alternati (es. Turno, DISP)';
        document.getElementById('stepTitle').innerText = "Settimana Successiva"; 
        document.getElementById('stepDateDisplay').innerText = ""; 
        document.getElementById('stepDesc').innerHTML = `Nei 6 giorni successivi a questo riposo singolo, fai i turni doppi o quelli alternati con i DISP?`;
        
        document.getElementById('stepActionArea').innerHTML = `
            <button class="btn" style="background: var(--turno);" onclick="impostaTcPattern('doppio')">Turni Doppi (es. Turno, Turno)</button>
            <button class="btn" style="background: var(--disp); color: #fff; margin-top: 10px;" onclick="impostaTcPattern('disp')">${altText}</button>
        `;
        document.getElementById('btnConfirmDate').style.display = "none"; 
        document.getElementById('btnCloseStep').style.display = "block";
    } else { 
        avviaSelezioneTurnoIniziale(); 
    }
}

function impostaTcPattern(pattern) {
    state.tcPattern = pattern; 
    state.turnoIndex = 0; 
    
    let d = creaDataSicura(selectedDate); 
    d.setDate(d.getDate() + 1); 
    state.rotazioneStart = dateToLocalISO(d);
    
    let dataFutura = trovaDataCambioProssimo(state.rotazioneStart); 
    if (dataFutura) { 
        state.futureConfig = { 
            dataInizio: dataFutura, 
            turnoIndex: 0, 
            tcPattern: pattern 
        }; 
    }
    
    state.setupStep = 3; 
    salvaERicarica(); 
}

function avviaSelezioneTurnoIniziale() {
    state.setupStep = 2; 
    let d = creaDataSicura(selectedDate); 
    d.setDate(d.getDate() + 1); 
    tempRotDate = dateToLocalISO(d);
    
    document.getElementById('btnConfirmDate').style.display = "none"; 
    document.getElementById('btnCloseStep').style.display = "none"; 
    document.getElementById('stepTitle').innerText = "Passo 3"; 
    document.getElementById('stepDateDisplay').innerText = ""; 
    document.getElementById('stepDesc').innerHTML = `Che turno hai il giorno <strong style="color: var(--turno);">${formattaData(tempRotDate)}</strong>?`;
    document.getElementById('stepActionArea').innerHTML = `<select id="tSel"><option value="" disabled selected>Seleziona turno...</option>${getOptionsTurni()}</select>`;
    document.getElementById('btnConfirmFinal').style.display = "block"; 
    document.getElementById('stepModal').style.display = 'block';
}

function avviaRiconfigurazioneAggiornamento() {
    if (state.depositoAttivo.startsWith('tc_')) { 
        state.futureConfig = { 
            dataInizio: DATA_INIZIO_NUOVI_TURNI, 
            turnoIndex: 0, 
            tcPattern: state.history.tcPattern 
        }; 
        state.setupStep = 4; 
        salvaERicarica(); 
        return; 
    }
    
    let d = creaDataSicura(DATA_INIZIO_NUOVI_TURNI); 
    let dStr = dateToLocalISO(d); 
    
    while(isGiornoRiposo(dStr)) { 
        d.setDate(d.getDate() + 1); 
        dStr = dateToLocalISO(d); 
    }
    
    tempRotDate = dStr; 
    document.getElementById('stepTitle').innerText = "Nuova Rotazione"; 
    document.getElementById('stepDateDisplay').innerText = ""; 
    document.getElementById('btnCloseStep').style.display = "none"; 
    document.getElementById('stepDesc').innerHTML = `Dal <strong>${formattaData(DATA_INIZIO_NUOVI_TURNI)}</strong> entra in vigore una nuova rotazione.<br>Che turno avrai il <strong style="color: var(--turno);">${formattaData(tempRotDate)}</strong>?`;
    document.getElementById('stepActionArea').innerHTML = `<select id="tSel"><option value="" disabled selected>Seleziona turno...</option>${getOptionsTurni()}</select>`;
    document.getElementById('btnConfirmFinal').style.display = "block"; 
    document.getElementById('stepModal').style.display = 'block';
}

function isGiornoRiposoBase(curr, cfg) { 
    if (!cfg.riposoStart) return false; 
    let ref = stringToNum(cfg.riposoStart); 
    if (cfg.depositoAttivo === 'disp_det') return (((curr - ref) % 6 + 6) % 6 === 0); 
    let pos = ((curr - ref + 6) % 15 + 15) % 15; 
    return (pos === 6 || pos === 13 || pos === 14); 
}

function isGiornoRiposo(dStr) { 
    if (state.variazioni[dStr] === "RI" || state.variazioni[dStr] === "RIPOSO" || state.variazioni[dStr] === "AL") return true; 
    let cfg = (state.history && stringToNum(dStr) < stringToNum(DATA_INIZIO_NUOVI_TURNI)) ? state.history : state; 
    return isGiornoRiposoBase(stringToNum(dStr), cfg); 
}

function attivaRotazioneFinale() {
    const valStr = document.getElementById('tSel').value; 
    if (!valStr) return;
    
    let isSkipDay = false;
    
    if (valStr === "RIPOSO") { 
        isSkipDay = true; 
    } else {
        const val = parseInt(valStr); 
        if(isNaN(val)) return;
        
        const currentRotRules = getRotazionePerData(tempRotDate);
        if (currentRotRules && currentRotRules[state.depositoAttivo]) { 
            if (currentRotRules[state.depositoAttivo][val] && currentRotRules[state.depositoAttivo][val].toUpperCase() === "DISP") { 
                isSkipDay = true; 
            } 
        }
    }
    
    if (isSkipDay) {
        let d = creaDataSicura(tempRotDate); 
        d.setDate(d.getDate() + 1); 
        let dStr = dateToLocalISO(d); 
        
        while(isGiornoRiposo(dStr)) { 
            d.setDate(d.getDate() + 1); 
            dStr = dateToLocalISO(d); 
        }
        
        tempRotDate = dStr; 
        document.getElementById('stepDateDisplay').innerText = ""; 
        document.getElementById('stepDesc').innerHTML = `Che turno avrai il <strong style="color: var(--turno);">${formattaData(tempRotDate)}</strong>?`;
        document.getElementById('stepActionArea').innerHTML = `<select id="tSel"><option value="" disabled selected>Seleziona turno...</option>${getOptionsTurni()}</select>`; 
        return; 
    }
    
    const val = parseInt(valStr); 
    if(isNaN(val)) return;
    
    if (state.setupStep === 2) {
        state.turnoIndex = val; 
        state.rotazioneStart = tempRotDate; 
        let dataFutura = trovaDataCambioProssimo(tempRotDate);
        
        if (dataFutura) {
            state.setupStep = 4; 
            state.baseDataFutura = dataFutura;
            let dFut = creaDataSicura(dataFutura); 
            let dFutStr = dateToLocalISO(dFut); 
            
            while(isGiornoRiposo(dFutStr)) { 
                dFut.setDate(dFut.getDate() + 1); 
                dFutStr = dateToLocalISO(dFut); 
            }
            
            tempRotDate = dFutStr; 
            document.getElementById('stepTitle').innerText = "Passo 4 (Cambio Turni)"; 
            document.getElementById('stepDateDisplay').innerText = ""; 
            document.getElementById('stepDesc').innerHTML = `Dal <strong>${formattaData(state.baseDataFutura)}</strong> entra in vigore una nuova rotazione. Che turno avrai il <strong style="color: var(--turno);">${formattaData(tempRotDate)}</strong>?`;
            document.getElementById('stepActionArea').innerHTML = `<select id="tSel"><option value="" disabled selected>Seleziona turno...</option>${getOptionsTurni()}</select>`; 
            return;
        }
    } else if (state.setupStep === 4) { 
        state.futureConfig = { dataInizio: tempRotDate, turnoIndex: val }; 
    } else if (state.setupStep === 3) { 
        state.turnoIndex = val; 
        state.rotazioneStart = tempRotDate; 
    }
    
    state.setupStep = 3; 
    salvaERicarica(); 
}

function calcolaTurni() {
    if (!state.riposoStart) return [];
    let evs = []; 
    let today = new Date(); 
    today.setHours(12, 0, 0, 0); 
    
    let limitTurni = 365; 
    let limitRiposi = 1825; 
    let todayNum = stringToNum(dateToLocalISO(today)); 
    
    if (state.rotazioneStart) { 
        let distDaOggi = Math.abs(todayNum - stringToNum(state.rotazioneStart)); 
        limitTurni = distDaOggi + 365; 
        limitRiposi = distDaOggi + 1825; 
    }
    
    if (state.futureConfig && state.futureConfig.dataInizio) { 
        let distFutura = Math.abs(todayNum - stringToNum(state.futureConfig.dataInizio)); 
        if (distFutura + 365 > limitTurni) limitTurni = distFutura + 365; 
        if (distFutura + 1825 > limitRiposi) limitRiposi = distFutura + 1825; 
    }
    
    let processati = new Set(); 
    
    for (let i = -60; i < limitRiposi; i++) {
        let dObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i, 12, 0, 0); 
        let dStr = dateToLocalISO(dObj); 
        let curr = stringToNum(dStr); 
        processati.add(dStr);
        
        let ferieAssegnate = getFerieGiorno(dStr); 
        if (ferieAssegnate) { 
            evs.push({ title: ferieAssegnate, start: dStr, allDay: true, className: 'bg-ferie', myOrder: 1 }); 
        }
        
        let customColor = (state.colori && state.colori[dStr]) ? state.colori[dStr] : null;
        let isPastUpdate = (state.history && curr < stringToNum(DATA_INIZIO_NUOVI_TURNI)); 
        let cfgBase = isPastUpdate ? state.history : state;
        
        if (!customColor && state.coloriRotazione) {
            let isManualManual = (state.variazioni[dStr] === "RI" || state.variazioni[dStr] === "RIPOSO" || state.variazioni[dStr] === "AL");
            let isStrutturaleRest = isGiornoRiposoBase(curr, cfgBase);
            
            if (isManualManual || isStrutturaleRest) { 
                if (state.coloriRotazione['riposo']) customColor = state.coloriRotazione['riposo']; 
            } else { 
                let indiceGiornata = 1; 
                for (let k = curr - 1; k >= curr - 10; k--) { 
                    if (isGiornoRiposoBase(k, cfgBase)) break; 
                    indiceGiornata++; 
                } 
                if (indiceGiornata <= 6 && state.coloriRotazione[indiceGiornata]) { 
                    customColor = state.coloriRotazione[indiceGiornata]; 
                } 
            }
        }
        
        let tColor = (customColor === '#f1c40f') ? '#32325d' : '#ffffff';
        let titleAddon = ""; 
        
        if (state.nebbia[dStr]) titleAddon += " <i class='fa-solid fa-smog'></i>"; 
        if (state.straordinario[dStr]) titleAddon += " <i class='fa-solid fa-stopwatch'></i>"; 
        if (state.buonoPasto[dStr]) titleAddon += " <i class='fa-solid fa-utensils'></i>"; 
        if (state.sospesoRiposo[dStr]) titleAddon += " (Sospeso)"; 
        if (state.permessoSP[dStr]) titleAddon += " <i class='fa-solid fa-money-bill-wave'></i>"; 
        if (state.note[dStr]) titleAddon += " <i class='fa-solid fa-clipboard'></i>";
        
        if (state.variazioni[dStr]) {
            let ev = { title: state.variazioni[dStr] + titleAddon, start: dStr, allDay: true, myOrder: 2 };
            if (customColor) { 
                ev.backgroundColor = customColor; 
                ev.textColor = tColor; 
            } else { 
                ev.className = (state.variazioni[dStr]==='RI' || state.variazioni[dStr]==='RIPOSO' || state.variazioni[dStr]==='AL') ? 'bg-riposo' : 'bg-modificato'; 
            }
            evs.push(ev); 
            continue;
        }
        
        if (isGiornoRiposo(dStr)) { 
            let tituloRiposo = 'RI'; 
            if (cfgBase.riposoStart && cfgBase.depositoAttivo !== 'disp_det') { 
                let ref = stringToNum(cfgBase.riposoStart); 
                let pos = ((curr - ref + 6) % 15 + 15) % 15; 
                if (pos === 13) tituloRiposo = 'AL'; 
            }
            
            let ev = { title: tituloRiposo + titleAddon, start: dStr, allDay: true, myOrder: 2 }; 
            if (customColor) { 
                ev.backgroundColor = customColor; 
                ev.textColor = tColor; 
            } else { 
                ev.className = 'bg-riposo'; 
            }
            evs.push(ev);
            
        } else if (i < limitTurni) {
            const currentRotRules = getRotazionePerData(dStr); 
            let t = "";
            
            if (cfgBase.depositoAttivo.startsWith('disp_')) { 
                t = "DISP"; 
            } else if (cfgBase.rotazioneStart) {
                let activeCfg = (state.futureConfig && curr >= stringToNum(state.futureConfig.dataInizio)) ? { start: state.futureConfig.dataInizio, idx: state.futureConfig.turnoIndex, tcPattern: state.futureConfig.tcPattern } : { start: cfgBase.rotazioneStart, idx: cfgBase.turnoIndex, tcPattern: cfgBase.tcPattern };
                let refRot = stringToNum(activeCfg.start), w = 0; 
                
                if (curr >= refRot) { 
                    for (let j = refRot; j < curr; j++) { 
                        if (!isGiornoRiposoBase(j, cfgBase)) w++; 
                    } 
                } else { 
                    for (let j = refRot; j > curr; j--) { 
                        if (!isGiornoRiposoBase(j, cfgBase)) w--; 
                    } 
                }
                
                let refRip = stringToNum(cfgBase.riposoStart); 
                let startPos = ((refRot - refRip + 6) % 15 + 15) % 15; 
                let offset = [1, 3, 5, 8, 10, 12].includes(startPos) ? 1 : 0;
                
                const rotList = (currentRotRules && currentRotRules[cfgBase.depositoAttivo]) ? currentRotRules[cfgBase.depositoAttivo] : [];
                
                if (rotList.length > 0) {
                    if (cfgBase.depositoAttivo.startsWith('tc_')) {
                        let currPos = ((curr - refRip + 6) % 15 + 15) % 15; 
                        let isBlock2 = (currPos >= 7 && currPos <= 12); 
                        let k = isBlock2 ? (currPos - 7) : currPos; 
                        let patternDopoSingolo = activeCfg.tcPattern || cfgBase.tcPattern || 'doppio'; 
                        let isAlternato = (patternDopoSingolo === 'disp') ? isBlock2 : !isBlock2;
                        let idx = Math.floor(k / 2); 
                        
                        if (idx >= rotList.length) idx = rotList.length - 1; 
                        t = rotList[idx].toUpperCase();
                        
                        if (isAlternato) { 
                            let dispOnEven = (cfgBase.depositoAttivo === 'tc_spez_lido'); 
                            if (dispOnEven && k % 2 === 0) t = "DISP"; 
                            if (!dispOnEven && k % 2 !== 0) t = "DISP"; 
                        }
                    } else {
                        let expandedRotList = []; 
                        let originalToExpanded = [];
                        
                        for (let j = 0; j < rotList.length; j++) { 
                            originalToExpanded[j] = expandedRotList.length; 
                            let currentTurn = rotList[j].toUpperCase(); 
                            
                            if (currentTurn.includes('+')) { 
                                let parts = currentTurn.split('+'); 
                                expandedRotList.push(parts[0].trim()); 
                                if (parts.length > 1) { 
                                    expandedRotList.push(parts[1].trim()); 
                                } 
                            } else { 
                                expandedRotList.push(currentTurn); 
                                expandedRotList.push(currentTurn); 
                            } 
                        }
                        
                        let L_exp = expandedRotList.length; 
                        let baseExpIdx = originalToExpanded[activeCfg.idx]; 
                        let blockStartIdx = baseExpIdx - (baseExpIdx % 2); 
                        let idxExp = (blockStartIdx + w + offset) % L_exp; 
                        
                        if (idxExp < 0) idxExp += L_exp; 
                        t = expandedRotList[idxExp];
                    }
                    
                    let currentDispRules = getDispPerData(dStr); 
                    if (currentDispRules) { 
                        const mapG = ["DOMENICA", "LUNEDI", "MARTEDI", "MERCOLEDI", "GIOVEDI", "VENERDI", "SABATO"]; 
                        let nomeG = mapG[dObj.getDay()]; 
                        let rGiorno = currentDispRules[nomeG] || currentDispRules[nomeG.toLowerCase()] || currentDispRules[nomeG.charAt(0) + nomeG.slice(1).toLowerCase()] || currentDispRules[dObj.getDay().toString()]; 
                        
                        if (rGiorno && Array.isArray(rGiorno)) { 
                            if (rGiorno.map(x => x.toUpperCase()).includes(t)) { 
                                t = "DISP"; 
                            } 
                        } 
                    }
                }
            }
            
            if (t !== "") { 
                let ev = { title: t + titleAddon, start: dStr, allDay: true, myOrder: 2 }; 
                if (customColor) { 
                    ev.backgroundColor = customColor; 
                    ev.textColor = tColor; 
                } else { 
                    ev.className = (t==='DISP' ? 'bg-disp' : 'bg-turno'); 
                } 
                evs.push(ev); 
            }
        }
    }
    
    let chiaviModificate = new Set([
        ...Object.keys(state.variazioni || {}), 
        ...Object.keys(state.nebbia || {}), 
        ...Object.keys(state.straordinario || {}), 
        ...Object.keys(state.sospesoRiposo || {}), 
        ...Object.keys(state.colori || {}), 
        ...Object.keys(state.note || {}), 
        ...Object.keys(state.buonoPasto || {}), 
        ...Object.keys(state.permessoSP || {})
    ]);
    
    chiaviModificate.forEach(dStr => {
        if (!processati.has(dStr)) {
            let ferieAssegnate = getFerieGiorno(dStr); 
            if (ferieAssegnate) { 
                evs.push({ title: ferieAssegnate, start: dStr, allDay: true, className: 'bg-ferie', myOrder: 1 }); 
            }
            
            let customColor = (state.colori && state.colori[dStr]) ? state.colori[dStr] : null;
            let currMod = stringToNum(dStr); 
            let isPastUpdateMod = (state.history && currMod < stringToNum(DATA_INIZIO_NUOVI_TURNI)); 
            let cfgBaseMod = isPastUpdateMod ? state.history : state;
            
            if (!customColor && state.coloriRotazione) {
                let isManualManual = (state.variazioni[dStr] === "RI" || state.variazioni[dStr] === "RIPOSO" || state.variazioni[dStr] === "AL");
                let isStrutturaleRest = isGiornoRiposoBase(currMod, cfgBaseMod);
                
                if (isManualManual || isStrutturaleRest) { 
                    if (state.coloriRotazione['riposo']) customColor = state.coloriRotazione['riposo']; 
                } else { 
                    let indiceGiornata = 1; 
                    for (let k = currMod - 1; k >= currMod - 10; k--) { 
                        if (isGiornoRiposoBase(k, cfgBaseMod)) break; 
                        indiceGiornata++; 
                    } 
                    if (indiceGiornata <= 6 && state.coloriRotazione[indiceGiornata]) { 
                        customColor = state.coloriRotazione[indiceGiornata]; 
                    } 
                }
            }
            
            let tColor = (customColor === '#f1c40f') ? '#32325d' : '#ffffff';
            let titleAddon = ""; 
            if (state.nebbia[dStr]) titleAddon += " <i class='fa-solid fa-smog'></i>"; 
            if (state.straordinario[dStr]) titleAddon += " <i class='fa-solid fa-stopwatch'></i>"; 
            if (state.buonoPasto[dStr]) titleAddon += " <i class='fa-solid fa-utensils'></i>"; 
            if (state.sospesoRiposo[dStr]) titleAddon += " (Sospeso)"; 
            if (state.permessoSP[dStr]) titleAddon += " <i class='fa-solid fa-money-bill-wave'></i>"; 
            if (state.note[dStr]) titleAddon += " <i class='fa-solid fa-clipboard'></i>";
            
            let titleTxt = state.variazioni[dStr] ? state.variazioni[dStr] : "NOTA"; 
            let ev = { title: titleTxt + titleAddon, start: dStr, allDay: true, myOrder: 2 };
            
            if (customColor) { 
                ev.backgroundColor = customColor; 
                ev.textColor = tColor; 
            } else { 
                ev.className = (titleTxt==='RI' || titleTxt==='RIPOSO' || titleTxt==='AL') ? 'bg-riposo' : 'bg-modificato'; 
            }
            evs.push(ev);
        }
    });
    return evs;
}

function getOptionsTurni(includeDisp = false) {
    let d = new Date(); 
    d.setHours(12,0,0,0); 
    let referenceDate = tempRotDate || dateToLocalISO(d); 
    const rot = getRotazionePerData(referenceDate);
    
    if (!rot || !rot[state.depositoAttivo]) return ""; 
    
    let htmlDisp = "", htmlTurni = "", dispAggiunto = false;
    let htmlRiposo = `<option value="RIPOSO" style="font-weight:bold; color:var(--riposo);">RIPOSO</option>`;
    
    rot[state.depositoAttivo].map((n, i) => ({ n: n.toUpperCase(), i: i }))
        .sort((a, b) => a.n.localeCompare(b.n, undefined, {numeric: true}))
        .forEach(item => { 
            if (item.n === "DISP") { 
                if (!dispAggiunto) { 
                    htmlDisp = `<option value="${item.i}">DISP</option>`; 
                    dispAggiunto = true; 
                } 
            } else { 
                htmlTurni += `<option value="${item.i}">${item.n}</option>`; 
            } 
        });
        
    if (includeDisp && state.depositoAttivo.startsWith('tc_') && !dispAggiunto) { 
        htmlDisp = `<option value="DISP">DISP</option>`; 
    }
    
    return htmlRiposo + htmlDisp + htmlTurni;
}

function salvaCambioSingolo() { 
    const val = document.getElementById('singleTurnoSelect').value.trim().toUpperCase(); 
    if(val) { state.variazioni[selectedDate] = val; } 
    salvaERicarica(); 
}

function resetGiornoSingolo() { 
    delete state.variazioni[selectedDate]; 
    delete state.colori[selectedDate]; 
    delete state.nebbia[selectedDate]; 
    delete state.straordinario[selectedDate]; 
    delete state.sospesoRiposo[selectedDate]; 
    delete state.note[selectedDate]; 
    delete state.buonoPasto[selectedDate]; 
    delete state.permessoSP[selectedDate]; 
    salvaERicarica(); 
}

function aggiornaUI() { 
    // rimosso document.getElementById('activeDepotLabel').innerText = state.depositoAttivo || "Configurazione";
}

function apriReset() { 
    chiudiMenuDestro(); 
    document.getElementById('resetModal').style.display = 'block'; 
}

function chiudiReset() { 
    document.getElementById('resetModal').style.display = 'none'; 
}

async function confermaReset() { 
    document.body.style.opacity = "0.5";
    
    if(typeof window.deleteCloudData === 'function') {
        await window.deleteCloudData();
    }
    
    localStorage.removeItem('myTurniApp'); 
    localStorage.setItem('app_just_reset', 'true');
    
    setTimeout(() => {
        location.reload(); 
    }, 800);
}

function apriBackup() { 
    chiudiMenuDestro(); 
    document.getElementById('backupModal').style.display = 'block'; 
}

function chiudiBackup() { 
    document.getElementById('backupModal').style.display = 'none'; 
}

function chiudiStep() { 
    document.getElementById('stepModal').style.display = 'none'; 
}

function chiudiEdit() { 
    document.getElementById('editModal').style.display = 'none'; 
}

function esportaDatiSuFile() { 
    const data = localStorage.getItem('myTurniApp'); 
    if(!data) return; 
    const blob = new Blob([data], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `backup_turni_${new Date().toISOString().split('T')[0]}.json`; 
    a.click(); 
    URL.revokeObjectURL(url); 
}

function importaDatiDaFile(event) { 
    const file = event.target.files[0]; 
    if (!file) return; 
    const reader = new FileReader(); 
    reader.onload = function(e) { 
        try { 
            let parsed = JSON.parse(e.target.result);
            parsed.lastUpdate = new Date().getTime(); 
            localStorage.setItem('myTurniApp', JSON.stringify(parsed)); 
            alert("Backup ripristinato!"); 
            location.reload(); 
        } catch (err) { 
            alert("Errore file non valido."); 
        } 
    }; 
    reader.readAsText(file); 
}

function popolaCambio() { 
    const input = document.getElementById('singleTurnoSelect'); 
    input.value = ''; 
    document.getElementById('btnSalvaCambio').disabled = true; 
}

function apriIcsModal() { 
    chiudiMenuDestro(); 
    document.getElementById('icsModal').style.display = 'block'; 
}

function chiudiIcsModal() { 
    document.getElementById('icsModal').style.display = 'none'; 
}

function esportaICS() {
    const startDate = document.getElementById('icsStartDate').value; 
    const endDate = document.getElementById('icsEndDate').value;
    
    if (!startDate || !endDate) { alert("Seleziona entrambe le date."); return; } 
    if (startDate > endDate) { alert("La data di inizio deve essere precedente alla data di fine."); return; }
    
    const turni = calcolaTurni(); 
    const turniFiltrati = turni.filter(t => t.start >= startDate && t.start <= endDate); 
    
    if (turniFiltrati.length === 0) { alert("Nessun turno nel periodo selezionato."); return; }
    
    let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MyTurniApp//IT\r\nCALSCALE:GREGORIAN\r\n"; 
    const dateChiavi = Object.keys(state.dbCache || {}).sort();
    
    turniFiltrati.forEach(t => {
        const dateParts = t.start.split('-'); 
        const icsDate = dateParts[0] + dateParts[1] + dateParts[2];
        let d = creaDataSicura(t.start); 
        d.setDate(d.getDate() + 1); 
        
        const nextDateStr = dateToLocalISO(d); 
        const nextParts = nextDateStr.split('-'); 
        const icsNextDate = nextParts[0] + nextParts[1] + nextParts[2];
        
        let pulitoTitle = t.title.replace(/<i[^>]*><\/i>/g, '').replace(/\(Sospeso\)/g, '').trim(); 
        const uid = t.start + "-" + pulitoTitle.replace(/\s+/g, '') + "@myturniapp"; 
        const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + "Z";
        
        let dbCorrente = {}; 
        const dSelezionata = stringToNum(t.start);
        for (let i = dateChiavi.length - 1; i >= 0; i--) { 
            if (dSelezionata >= stringToNum(dateChiavi[i])) { 
                dbCorrente = state.dbCache[dateChiavi[i]]; 
                break; 
            } 
        }
        
        let codiceBase = pulitoTitle.toUpperCase(); 
        let chiaveTrovata = trovaChiaveEsatta(dbCorrente, codiceBase, t.start); 
        let dettagli = dbCorrente[chiaveTrovata];
        
        let orariTitolo = ""; 
        let descrizione = ""; 
        let location = "";
        
        if (dettagli && dettagli.inizio && dettagli.fine) { 
            orariTitolo = ` (${dettagli.inizio} - ${dettagli.fine})`; 
            descrizione = `Inizio: ${dettagli.inizio} (${dettagli.luogoInizio})\\nFine: ${dettagli.fine} (${dettagli.luogoFine})`; 
            location = dettagli.luogoInizio; 
        }
        
        ics += "BEGIN:VEVENT\r\n"; 
        ics += "UID:" + uid + "\r\n"; 
        ics += "DTSTAMP:" + now + "\r\n"; 
        ics += "DTSTART;VALUE=DATE:" + icsDate + "\r\n"; 
        ics += "DTEND;VALUE=DATE:" + icsNextDate + "\r\n"; 
        ics += "SUMMARY:" + pulitoTitle + orariTitolo + "\r\n"; 
        if (descrizione) ics += "DESCRIPTION:" + descrizione + "\r\n"; 
        if (location) ics += "LOCATION:" + location + "\r\n"; 
        ics += "END:VEVENT\r\n";
    });
    
    ics += "END:VCALENDAR"; 
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `turni_${startDate}_al_${endDate}.ics`; 
    document.body.appendChild(a); 
    a.click(); 
    URL.revokeObjectURL(url); 
    document.body.removeChild(a); 
    chiudiIcsModal();
}

function inizializzaCalendario() { 
    calendar = new FullCalendar.Calendar(document.getElementById('calendar'), { 
        initialView: 'dayGridMonth', 
        locale: 'it', 
        firstDay: 1, 
        height: 'auto', 
        eventOrder: 'myOrder', 
        buttonText: { today: 'Oggi' }, 
        customButtons: { btnSalto: { text: '🔍', click: apriJumpModal } }, 
        headerToolbar: { left: 'prev,next', center: 'title', right: 'btnSalto today' }, 
        eventContent: function(arg) {
            return { html: arg.event.title };
        },
        dateClick: (i) => gestisciInterazione(i.dateStr),
        eventClick: (info) => gestisciInterazione(info.event.startStr),
        events: (i, success) => success(calcolaTurni())
    });
    calendar.render();
}

// --- ESPORTAZIONE DELLE FUNZIONI GLOBALI ---
window.apriMenuDestro = apriMenuDestro;
window.chiudiMenuDestro = chiudiMenuDestro;
window.apriMultiEdit = apriMultiEdit;
window.chiudiMultiEdit = chiudiMultiEdit;
window.apriFerieModal = apriFerieModal;
window.switchFerieTab = switchFerieTab;
window.chiudiFerieModal = chiudiFerieModal;
window.salvaFerie = salvaFerie;
window.resetFerie = resetFerie;
window.elaboraPdfBibbia = elaboraPdfBibbia;
window.chiudiPdfSyncModal = chiudiPdfSyncModal;
window.applicaModifichePdf = applicaModifichePdf;
window.apriColoriRotazione = apriColoriRotazione;
window.chiudiColoriRotazione = chiudiColoriRotazione;
window.selezionaColoreRotazione = selezionaColoreRotazione;
window.salvaColoriRotazione = salvaColoriRotazione;
window.salvaModificaMultipla = salvaModificaMultipla;
window.apriPdfTipo2Modal = apriPdfTipo2Modal;
window.chiudiPdfTipo2Modal = chiudiPdfTipo2Modal;
window.generaPdfTipo2 = generaPdfTipo2;
window.apriCambioBibbia = apriCambioBibbia;
window.chiudiCambioBibbia = chiudiCambioBibbia;
window.confermaCambioBibbia = confermaCambioBibbia;
window.saltaConfigurazione = saltaConfigurazione;
window.avviaNuovoProfilo = avviaNuovoProfilo;
window.cambiaProfilo = cambiaProfilo;
window.rinominaProfilo = rinominaProfilo;
window.eliminaProfilo = eliminaProfilo;
window.scaricaPDF = scaricaPDF;
window.confermaRotazione = confermaRotazione;
window.tornaAllaRotazione = tornaAllaRotazione;
window.abilitaSalvataggio = abilitaSalvataggio;
window.apriAltroModal = apriAltroModal;
window.chiudiAltroModal = chiudiAltroModal;
window.chiudiAltroSeSfondo = chiudiAltroSeSfondo;
window.toggleStraordinarioAltro = toggleStraordinarioAltro;
window.togglePermessoSPAltro = togglePermessoSPAltro;
window.selezionaColoreAltro = selezionaColoreAltro;
window.salvaAltro = salvaAltro;
window.apriImmagineTurno = apriImmagineTurno;
window.chiudiImageModal = chiudiImageModal;
window.chiudiSeSfondo = chiudiSeSfondo;
window.chiudiEditSeSfondo = chiudiEditSeSfondo;
window.scaricaImmagineTurno = scaricaImmagineTurno;
window.apriJumpModal = apriJumpModal;
window.chiudiJumpModal = chiudiJumpModal;
window.eseguiSalto = eseguiSalto;
window.procediConfigurazione = procediConfigurazione;
window.impostaTcPattern = impostaTcPattern;
window.attivaRotazioneFinale = attivaRotazioneFinale;
window.salvaCambioSingolo = salvaCambioSingolo;
window.resetGiornoSingolo = resetGiornoSingolo;
window.apriReset = apriReset;
window.chiudiReset = chiudiReset;
window.confermaReset = confermaReset;
window.apriBackup = apriBackup;
window.chiudiBackup = chiudiBackup;
window.chiudiStep = chiudiStep;
window.chiudiEdit = chiudiEdit;
window.esportaDatiSuFile = esportaDatiSuFile;
window.importaDatiDaFile = importaDatiDaFile;
window.apriIcsModal = apriIcsModal;
window.chiudiIcsModal = chiudiIcsModal;
window.esportaICS = esportaICS;

// --- INIZIALIZZAZIONE GESTITA DA FIREBASE ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.utenteLoggato = user.uid;
        
        const appenaResettato = localStorage.getItem('app_just_reset') === 'true';
        if (appenaResettato) {
            localStorage.removeItem('app_just_reset'); 
        }

        try {
            const docSnap = await getDoc(doc(db, "utenti", user.uid));
            
            if (docSnap.exists() && !appenaResettato) {
                const cloudData = docSnap.data();
                
                if (!cloudData.deleted) {
                    const localData = JSON.parse(localStorage.getItem('myTurniApp'));
                    let usaCloud = false;
                    
                    if (!localData || Object.keys(localData).length <= 2) {
                        usaCloud = true;
                    } else if (cloudData.lastUpdate && (!localData.lastUpdate || cloudData.lastUpdate > localData.lastUpdate)) {
                        usaCloud = true;
                    }

                    if (usaCloud) {
                        state = { ...state, ...cloudData };
                        
                        let copiaDati = JSON.parse(JSON.stringify(state));
                        delete copiaDati.dbCache;
                        delete copiaDati.rotCache;
                        delete copiaDati.dispCache;
                        localStorage.setItem('myTurniApp', JSON.stringify(copiaDati));
                    } else if (localData && (!cloudData.lastUpdate || localData.lastUpdate > cloudData.lastUpdate)) {
                        let copiaDati = JSON.parse(JSON.stringify(state));
                        delete copiaDati.dbCache;
                        delete copiaDati.rotCache;
                        delete copiaDati.dispCache;
                        window.syncToCloud(copiaDati);
                    }
                }
            }
        } catch(e) {
            console.error("Errore lettura dati da Cloud:", e);
        }
    } else {
        window.utenteLoggato = null;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inizializzaApp);
    } else {
        inizializzaApp();
    }
});
