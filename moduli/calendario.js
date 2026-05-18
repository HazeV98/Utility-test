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
            await deleteDoc(doc(db, "utenti", window.utenteLoggato));
        } catch(e) { console.error("Errore eliminazione Cloud:", e); }
    }
};

// --- VARIABILI GLOBALI ---
let ROT_FERIE_INV = [];
let ROT_FERIE_EST = [];
const VERSIONE_TURNI = "1.0.1"; 
let VERSIONE_FERIE = "1.0.0"; 
const DATA_INIZIO_NUOVI_TURNI = "2026-03-28"; 
const AVVISO_VARIANTI = true;

const RESET_DOPO_AGGIORNAMENTO = {
    rot_fnove: false,
    spez_fnove: false,
    rot_proma: true,
    spez_proma: false,
    ris_proma: false, 
    rot_szaccaria: false,
    spez_szaccaria: false,
    rot_lido: false,
    spez_lido: false,
    rot_linea14: false,
    rot_linea14_mb: true,
    rot_linea13: false,
    rot_17sn: false,
    rot_17tr: false,
    rot_linea12: true,
    tc_spez_fnove: false,
    tc_spez_szaccaria: false,
    tc_spez_lido: false,
    tc_rot_17sn: false,
    tc_rot_17tr: false
};

// ==========================================
// FIX INIZIALIZZAZIONE STATO
// ==========================================
function getInitialState() {
    let savedState = null;
    try {
        savedState = JSON.parse(localStorage.getItem('myTurniApp'));
    } catch(e) {
        console.warn("localStorage danneggiato, resetto stato.");
    }

    let defaultState = { 
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
        ferie: {},
        coloriRotazione: {},
        profili: []
    };

    if (savedState && typeof savedState === 'object') {
        return { ...defaultState, ...savedState };
    }
    return defaultState;
}

let state = getInitialState();

// Fix per retrocompatibilità oggetti mancanti
if (!state.colori) state.colori = {}; 
if (!state.nebbia) state.nebbia = {};
if (!state.straordinario) state.straordinario = {};
if (!state.sospesoRiposo) state.sospesoRiposo = {};
if (!state.note) state.note = {};
if (!state.buonoPasto) state.buonoPasto = {};
if (!state.permessoSP) state.permessoSP = {};
if (!state.dispCache) state.dispCache = {};
if (!state.coloriRotazione) state.coloriRotazione = {}; 
if (!state.profili) state.profili = []; 
if (!state.variazioni) state.variazioni = {};

// ==========================================
// FIX BUG CRASH calcolaTurni / stringToNum
// ==========================================
function stringToNum(s) { 
    if (!s || typeof s !== 'string') return 0; 
    try {
        let p = s.split('-'); 
        if(p.length !== 3) return 0; 
        let parsedDate = Math.floor(Date.UTC(p[0], p[1]-1, p[2]) / 86400000);
        return isNaN(parsedDate) ? 0 : parsedDate;
    } catch (e) {
        console.error("Errore stringToNum per valore:", s, e);
        return 0;
    }
}

let selectedDate, tempRotDate, calendar;
let currentImagePath = "";
let imgBaseFallback = ""; 
let pzInstance = null; 
let tempColoreAltro = "";
let variantiData = {};

// --- FUNZIONI MENU LATERALE ---
window.apriMenuLaterale = function() { 
    document.getElementById('sidebar').classList.add('open'); 
    document.getElementById('sidebar-overlay').style.display = 'block'; 
};

window.chiudiMenuLaterale = function() { 
    document.getElementById('sidebar').classList.remove('open'); 
    document.getElementById('sidebar-overlay').style.display = 'none'; 
};

window.apriMenuDestro = function() {
    document.getElementById('right-sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').style.display = 'block';
};

window.chiudiMenuDestro = function() {
    document.getElementById('right-sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').style.display = 'none';
};

window.apriMultiEdit = function() {
    chiudiMenuDestro();
    document.getElementById('multiEditModal').style.display = 'block';
};

window.chiudiMultiEdit = function() {
    document.getElementById('multiEditModal').style.display = 'none';
};

// --- FUNZIONI PROFili ---
window.avviaNuovoProfilo = function() {
    chiudiMenuDestro();
    document.getElementById('welcomeModal').style.display = 'block';
};

window.cambiaProfilo = function(indexStr) {
    let index = parseInt(indexStr);
    if(isNaN(index) || !state.profili || index < 0 || index >= state.profili.length) return;
    
    if (state.profiloAttivo !== undefined && state.profiloAttivo >= 0 && state.profiloAttivo < state.profili.length) {
        state.profili[state.profiloAttivo] = JSON.parse(JSON.stringify(state)); 
    }
    
    let p = state.profili[index];
    state = { ...p }; 
    state.profiloAttivo = index;
    
    salvaERicarica();
};

window.eliminaProfilo = function(indexStr, evt) {
    evt.stopPropagation();
    let index = parseInt(indexStr);
    if(isNaN(index) || !state.profili || state.profili.length <= 1) {
        alert("Non puoi eliminare l'unico profilo.");
        return;
    }
    
    if(confirm("Sei sicuro di voler eliminare questo profilo? L'azione è irreversibile.")) {
        state.profili.splice(index, 1);
        
        if(state.profiloAttivo === index) {
            state.profiloAttivo = 0;
            let p = state.profili[0];
            state = { ...p };
            state.profiloAttivo = 0;
        } else if (state.profiloAttivo > index) {
            state.profiloAttivo--;
        }
        
        salvaERicarica();
    }
};

function renderListaProfili() {
    const listaDiv = document.getElementById('lista-profili-dinamica');
    if(!listaDiv) return;
    
    if(!state.profili || state.profili.length === 0) {
        listaDiv.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); text-align: center;">Nessun profilo extra</div>';
        return;
    }
    
    let html = "";
    state.profili.forEach((p, idx) => {
        let isAttivo = (state.profiloAttivo === idx) || (state.profiloAttivo === undefined && idx === 0);
        let nomeRot = p.depositoAttivo ? p.depositoAttivo.replace('rot_', 'Rot. ').replace('spez_', 'Spez. ').toUpperCase() : 'Non Configurato';
        
        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: ${isAttivo ? 'rgba(94, 114, 228, 0.1)' : 'var(--bg)'}; border: 1px solid ${isAttivo ? 'var(--primary)' : 'var(--border-color)'}; border-radius: 12px; cursor: pointer;" onclick="cambiaProfilo(${idx})">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${isAttivo ? 'var(--primary)' : 'var(--border-color)'};"></div>
                    <div style="display: flex; flex-direction: column; text-align: left;">
                        <span style="font-size: 14px; font-weight: bold; color: var(--text);">${p.nomeProfilo || 'Profilo ' + (idx + 1)}</span>
                        <span style="font-size: 11px; color: var(--text-muted);">${nomeRot}</span>
                    </div>
                </div>
                ${state.profili.length > 1 ? `<button onclick="eliminaProfilo(${idx}, event)" style="background: none; border: none; color: #f5365c; cursor: pointer; padding: 5px;"><i class="fa-solid fa-trash-can"></i></button>` : ''}
            </div>
        `;
    });
    
    listaDiv.innerHTML = html;
}

// --- GESTIONE FERIE PROGRAMMATE ---
window.apriFerieModal = function() {
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
    
    window.switchFerieTab('base');
    document.getElementById('ferieModal').style.display = 'block';
};

window.switchFerieTab = function(tab) {
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
};

window.chiudiFerieModal = function() {
    document.getElementById('ferieModal').style.display = 'none';
};

function aggiornaScambiUI(year) {
    if (!state.ferie || !state.ferie.scambi || !state.ferie.scambi[year]) {
        document.getElementById('ferieEstiveScambio').value = -1;
        document.getElementById('ferieInvernaliScambio').value = -1;
    } else {
        document.getElementById('ferieEstiveScambio').value = state.ferie.scambi[year].estiva ?? -1;
        document.getElementById('ferieInvernaliScambio').value = state.ferie.scambi[year].invernale ?? -1;
    }
}

window.salvaFerie = function() {
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
};

window.resetFerie = function() {
    if(confirm("Vuoi cancellare tutte le tue configurazioni delle Ferie Programmate (incluse quelle di scambio)?")) {
        state.ferie = { version: VERSIONE_FERIE, scambi: {} };
        let boost = new Date().getTime() + 5000;
        salvaERicarica(boost);
    }
};

function isDateInRange(dStr, startStr, endStr, year) {
    if (typeof dStr !== 'string' || typeof startStr !== 'string' || typeof endStr !== 'string') return false;
    let d = new Date(year, parseInt(dStr.split('-')[1])-1, parseInt(dStr.split('-')[2]));
    let s = new Date(year, parseInt(startStr.split('-')[0])-1, parseInt(startStr.split('-')[1]));
    let e = new Date(year, parseInt(endStr.split('-')[0])-1, parseInt(endStr.split('-')[1]));
    return d >= s && d <= e;
}

function getFerieGiorno(dStr) {
    if(!state.ferie || !state.ferie.baseAnno || typeof dStr !== 'string') return null;
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

window.elaboraPdfBibbia = async function(event) {
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
};

window.chiudiPdfSyncModal = function() {
    document.getElementById('pdfSyncModal').style.display = 'none';
    window.pendingPdfChanges = [];
};

window.applicaModifichePdf = function() {
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
};

let tempColoriRotazione = {};

window.apriColoriRotazione = function() {
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
};

window.chiudiColoriRotazione = function() {
    document.getElementById('coloriRotazioneModal').style.display = 'none';
};

window.selezionaColoreRotazione = function(giorno, hex, el) {
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
};

window.salvaColoriRotazione = function() {
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
};

window.salvaModificaMultipla = function() {
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
};

window.apriPdfTipo2Modal = function() {
    chiudiMenuDestro();
    let currDate = new Date();
    document.getElementById('pdfTipo2Mese').value = String(currDate.getMonth() + 1).padStart(2, '0');
    document.getElementById('pdfTipo2Anno').value = currDate.getFullYear();
    document.getElementById('pdfTipo2Modal').style.display = 'block';
};

window.chiudiPdfTipo2Modal = function() {
    document.getElementById('pdfTipo2Modal').style.display = 'none';
};

window.generaPdfTipo2 = function() {
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
        </tr>
        `;
    }

    html += `
            </tbody>
        </table>
    </div>
    `;

    let opt = {
        margin: 10,
        filename: `turni_${meseNome}_${anno}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(html).save();
    chiudiPdfTipo2Modal();
};

window.scaricaPDF = function() {
    chiudiMenuDestro();
    let currentView = calendar.view;
    let title = currentView.title;
    
    let containerHTML = `
        <div style="font-family: Arial, sans-serif; background: #fff; color: #000; padding: 20px; width: 1200px;">
            <h2 style="text-align:center; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">Turni - ${title}</h2>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; text-align: center;">
                <div style="font-weight: bold; padding: 10px; background: #eee; border: 1px solid #ccc;">Lunedì</div>
                <div style="font-weight: bold; padding: 10px; background: #eee; border: 1px solid #ccc;">Martedì</div>
                <div style="font-weight: bold; padding: 10px; background: #eee; border: 1px solid #ccc;">Mercoledì</div>
                <div style="font-weight: bold; padding: 10px; background: #eee; border: 1px solid #ccc;">Giovedì</div>
                <div style="font-weight: bold; padding: 10px; background: #eee; border: 1px solid #ccc;">Venerdì</div>
                <div style="font-weight: bold; padding: 10px; background: #eee; border: 1px solid #ccc;">Sabato</div>
                <div style="font-weight: bold; padding: 10px; background: #eee; border: 1px solid #ccc;">Domenica</div>
    `;

    let startObj = currentView.currentStart;
    let curr = new Date(startObj);
    let dow = curr.getDay();
    let shift = (dow === 0) ? 6 : dow - 1;
    curr.setDate(curr.getDate() - shift);

    let endObj = new Date(currentView.currentEnd);
    let turni = calcolaTurni();

    while(curr < endObj) {
        let dStr = dateToLocalISO(curr);
        let gNum = curr.getDate();
        
        let t = turni.find(x => x.start === dStr && !x.title.includes('FERIE') && x.title !== 'FEP');
        let text = t ? t.title.replace(/<i[^>]*><\/i>/g, '').replace(/\(Sospeso\)/g, '').trim() : "";
        let color = "#fff";
        let isRiposo = false;
        
        if (t) {
            if (t.className.includes('bg-riposo')) { color = "#d4edda"; isRiposo = true; }
            else if (t.className.includes('bg-disp')) color = "#fff3cd";
            else if (t.className.includes('bg-turno')) color = "#cce5ff";
            else if (t.className.includes('bg-modificato')) color = "#f8d7da";
        }
        
        let bgColorStyle = `background: ${color};`;
        if (state.colori[dStr]) {
            bgColorStyle = `background: ${state.colori[dStr]}; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;`;
        } else if (!isRiposo && !state.variazioni[dStr] && state.coloriRotazione) {
            let rotDays = ['riposo', 1, 2, 3, 4, 5, 6];
            let posRot = (((stringToNum(dStr) - stringToNum(state.riposoStart || dStr)) % 6 + 6) % 6);
            if (state.depositoAttivo === 'disp_det') { posRot = (((stringToNum(dStr) - stringToNum(state.riposoStart || dStr)) % 6 + 6) % 6); }
            else { posRot = (((stringToNum(dStr) - stringToNum(state.riposoStart || dStr) + 6) % 15 + 15) % 15); }
            
            let gIdx = 0;
            if(posRot === 0 || posRot === 6 || posRot === 13 || posRot === 14) {
                 gIdx = 'riposo';
            } else {
                 let arrLavorativi = [];
                 for(let i=0; i< (state.depositoAttivo === 'disp_det' ? 6 : 15); i++) {
                     if(i!==0 && i!==6 && i!==13 && i!==14) arrLavorativi.push(i);
                 }
                 let idx = arrLavorativi.indexOf(posRot);
                 if(idx !== -1) gIdx = (idx % 6) + 1;
            }
            if (state.coloriRotazione[gIdx]) {
                bgColorStyle = `background: ${state.coloriRotazione[gIdx]}; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;`;
            }
        }

        let ferieHtml = "";
        let ferieTurno = turni.find(x => x.start === dStr && (x.title.includes('FERIE') || x.title === 'FEP'));
        if (ferieTurno) {
            ferieHtml = `<div style="font-size: 10px; background: #20c997; color: white; padding: 2px; border-radius: 4px; margin-bottom: 5px;">${ferieTurno.title}</div>`;
        }

        let isCurrentMonth = curr.getMonth() === startObj.getMonth();
        let opacity = isCurrentMonth ? "1" : "0.5";
        
        containerHTML += `
            <div style="border: 1px solid #ccc; border-radius: 8px; padding: 8px; ${bgColorStyle} opacity: ${opacity}; min-height: 80px; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="text-align: right; font-size: 14px; font-weight: bold; margin-bottom: 5px;">${gNum}</div>
                ${ferieHtml}
                <div style="font-weight: bold; font-size: 14px; text-transform: uppercase;">${text}</div>
            </div>
        `;
        curr.setDate(curr.getDate() + 1);
    }
    
    containerHTML += `</div></div>`;

    let opt = {
        margin: [10, 10, 10, 10],
        filename: `calendario_${title.replace(' ', '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(containerHTML).save();
};

window.esportaICS = function() {
    chiudiIcsModal();
    const startStr = document.getElementById('icsStartDate').value;
    const endStr = document.getElementById('icsEndDate').value;
    
    if(!startStr || !endStr) { alert("Seleziona entrambe le date."); return; }
    if(startStr > endStr) { alert("Data di inizio maggiore della data di fine."); return; }

    const turni = calcolaTurni();
    let startD = stringToNum(startStr);
    let endD = stringToNum(endStr);
    
    let icsData = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Haze//TurniCalendario//IT\n";

    turni.forEach(t => {
        let evNum = stringToNum(t.start);
        if (evNum >= startD && evNum <= endD && !t.title.includes('FERIE') && t.title !== 'FEP') {
            let desc = "";
            let codiceBase = t.title.replace(/<i[^>]*><\/i>/g, '').replace(/\(Sospeso\)/g, '').trim().toUpperCase();
            
            const dateChiavi = Object.keys(state.dbCache || {}).sort();
            let dbCorrente = {};
            for (let i = dateChiavi.length - 1; i >= 0; i--) { 
                if (evNum >= stringToNum(dateChiavi[i])) { 
                    dbCorrente = state.dbCache[dateChiavi[i]]; 
                    break; 
                } 
            }
            
            if (codiceBase !== "RI" && codiceBase !== "RIPOSO" && codiceBase !== "AL" && codiceBase !== "DISP") {
                let chiaveTrovata = trovaChiaveEsatta(dbCorrente, codiceBase, t.start);
                let dettagli = dbCorrente[chiaveTrovata];
                if (dettagli) {
                    desc = `Monta: ${dettagli.luogoInizio || ""}\\nOrario: ${dettagli.inizio || ""} - ${dettagli.fine || ""}`;
                    if (dettagli.inizio2) desc += ` (Ripresa: ${dettagli.inizio2} - ${dettagli.fine2})`;
                }
            }

            if (state.note && state.note[t.start]) {
                desc += `\\n\\nNote: ${state.note[t.start].replace(/\n/g, '\\n')}`;
            }

            let p = t.start.split('-');
            let dt = p[0] + p[1] + p[2];
            icsData += "BEGIN:VEVENT\n";
            icsData += `DTSTART;VALUE=DATE:${dt}\n`;
            icsData += `DTEND;VALUE=DATE:${dt}\n`;
            icsData += `SUMMARY:${t.title.replace(/<[^>]*>/g, '')}\n`;
            if (desc) icsData += `DESCRIPTION:${desc}\n`;
            icsData += "END:VEVENT\n";
        }
    });

    icsData += "END:VCALENDAR";

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'turni.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.esportaDatiSuFile = function() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backup_turni.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    chiudiBackup();
};

window.importaDatiDaFile = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const newState = JSON.parse(e.target.result);
                if (newState && typeof newState === 'object') {
                    if (Object.keys(newState).length === 0) {
                         alert("Il file di backup sembra vuoto o non valido.");
                         return;
                    }
                    state = { ...getInitialState(), ...newState }; 
                    salvaERicarica();
                    alert('Backup caricato con successo!');
                } else {
                    alert("Formato file non valido.");
                }
            } catch (error) {
                alert('Errore durante il caricamento del file. Assicurati che sia un file JSON valido.');
            }
        };
        reader.readAsText(file);
    }
    chiudiBackup();
};

window.confermaReset = function() {
    localStorage.removeItem('myTurniApp');
    deleteCloudData().then(() => {
        location.reload();
    });
};

function salvaERicarica(boostValue) {
    try {
        localStorage.setItem('myTurniApp', JSON.stringify(state));
        if (window.utenteLoggato) {
            setDoc(doc(db, "utenti", window.utenteLoggato), state).catch(e => console.error("Errore salvataggio Firebase", e));
        }
        if (boostValue) localStorage.setItem('refreshBoost', boostValue);
        location.reload();
    } catch(e) {
        console.error("Errore salvataggio localStorage, possibile limite superato:", e);
        alert("Errore di salvataggio! Spazio sul dispositivo esaurito.");
    }
}

// --- LOGICA REGOLE TURNI E ROTAZIONI ---

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

function formattaData(d) { 
    let dataObj = new Date(d); 
    let mese = dataObj.toLocaleDateString('it-IT', { month: 'long' }); 
    return dataObj.getDate() + ' ' + mese.charAt(0).toUpperCase() + mese.slice(1); 
}

function dateToLocalISO(d) { 
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'); 
}

function creaDataSicura(dataStr) { 
    if(!dataStr) return new Date(); 
    let p = dataStr.split('-'); 
    return new Date(p[0], p[1] - 1, p[2], 12, 0, 0); 
}

// --- SETUP INIZIALE ---
window.saltaConfigurazione = function() {
    state.setupSkipped = true;
    salvaERicarica();
};

window.confermaRotazione = function() { 
    let s = document.getElementById('depotSelectMain'); 
    state.depositoAttivo = s.value; 
    state.setupStep = 1; 
    document.getElementById('welcomeModal').style.display = 'none'; 
    mostraStepConfigurazione(); 
};

function mostraStepConfigurazione() {
    if (!state.depositoAttivo) return;

    const mod = document.getElementById('stepModal');
    const title = document.getElementById('stepTitle');
    const desc = document.getElementById('stepDesc');
    const area = document.getElementById('stepActionArea');
    const dateDisp = document.getElementById('stepDateDisplay');
    
    document.getElementById('btnConfirmDate').style.display = 'none';
    document.getElementById('btnConfirmFinal').style.display = 'none';
    document.getElementById('btnBackStep').style.display = 'none';

    mod.style.display = 'block';

    if (state.setupStep === 1) {
        title.innerText = "Scegli il Riposo";
        desc.innerText = "Seleziona dal calendario un giorno in cui sei stato o sarai a riposo (RI).";
        area.innerHTML = '';
        dateDisp.innerText = tempRotDate ? "Data selezionata: " + formattaData(tempRotDate) : "";
        document.getElementById('btnBackStep').style.display = 'block';
        if (tempRotDate) document.getElementById('btnConfirmDate').style.display = 'block';
    } else if (state.setupStep === 2) {
        title.innerText = "Conferma Gruppo";
        let dNum = stringToNum(state.riposoStart);
        if (state.depositoAttivo === 'disp_det') {
            desc.innerText = "Hai selezionato un riposo. Il ciclo sarà di 5 giorni di lavoro e 1 di riposo.";
            area.innerHTML = '';
        } else {
            desc.innerText = "In base al riposo selezionato, scegli in che punto del ciclo ti trovi.";
            area.innerHTML = `
                <div style="text-align:left; margin-bottom:10px;">
                    <label style="display:block; margin-bottom:5px; font-weight:bold; cursor:pointer;">
                        <input type="radio" name="rotPos" value="0" checked>
                        Singolo (dopo i 6 GG lavorativi)
                    </label>
                    <label style="display:block; font-weight:bold; cursor:pointer;">
                        <input type="radio" name="rotPos" value="7">
                        Doppio (dopo i 5 GG lavorativi)
                    </label>
                </div>
            `;
        }
        document.getElementById('btnConfirmFinal').style.display = 'block';
        document.getElementById('btnBackStep').style.display = 'block';
        document.getElementById('btnBackStep').onclick = () => { state.setupStep = 1; mostraStepConfigurazione(); };
    }
}

window.procediConfigurazione = function() {
    if (state.setupStep === 1 && tempRotDate) { 
        state.riposoStart = tempRotDate; 
        state.setupStep = 2; 
        mostraStepConfigurazione(); 
    }
};

window.attivaRotazioneFinale = function() {
    if (state.depositoAttivo !== 'disp_det') {
        let sc = document.querySelector('input[name="rotPos"]:checked');
        if (sc) {
            let offset = parseInt(sc.value);
            if (offset === 7) { 
                let d = creaDataSicura(state.riposoStart); 
                d.setDate(d.getDate() - 7); 
                state.riposoStart = dateToLocalISO(d); 
            }
        }
    }
    state.setupSkipped = false;
    delete state.setupStep; 
    if(!state.profili || state.profili.length === 0) {
        state.nomeProfilo = "Profilo 1";
        state.profili = [JSON.parse(JSON.stringify(state))];
        state.profiloAttivo = 0;
    } else {
        if(state.profiloAttivo !== undefined) {
             state.nomeProfilo = "Profilo " + (state.profiloAttivo + 1);
        }
    }
    salvaERicarica();
};

window.tornaAllaRotazione = function() {
    state.setupStep = 0;
    tempRotDate = null;
    document.getElementById('stepModal').style.display = 'none';
    document.getElementById('welcomeModal').style.display = 'block';
};

window.chiudiStep = function() { document.getElementById('stepModal').style.display = 'none'; };
window.apriCambioBibbia = function() { chiudiMenuDestro(); document.getElementById('cambioBibbiaModal').style.display = 'block'; };
window.chiudiCambioBibbia = function() { document.getElementById('cambioBibbiaModal').style.display = 'none'; };
window.apriReset = function() { chiudiMenuDestro(); document.getElementById('resetModal').style.display = 'block'; };
window.chiudiReset = function() { document.getElementById('resetModal').style.display = 'none'; };
window.apriBackup = function() { chiudiMenuDestro(); document.getElementById('backupModal').style.display = 'block'; };
window.chiudiBackup = function() { document.getElementById('backupModal').style.display = 'none'; };
window.apriIcsModal = function() { chiudiMenuDestro(); document.getElementById('icsModal').style.display = 'block'; };
window.chiudiIcsModal = function() { document.getElementById('icsModal').style.display = 'none'; };
window.apriJumpModal = function() { document.getElementById('jumpModal').style.display = 'block'; };
window.chiudiJumpModal = function() { document.getElementById('jumpModal').style.display = 'none'; };

window.confermaCambioBibbia = function() {
    state.depositoAttivo = null;
    state.riposoStart = null;
    state.setupStep = 0;
    state.setupSkipped = false;
    salvaERicarica();
};

window.eseguiSalto = function() {
    let m = document.getElementById('jumpMonth').value;
    let y = document.getElementById('jumpYear').value;
    calendar.gotoDate(`${y}-${m}-01`);
    chiudiJumpModal();
};

document.getElementById('depotSelectMain').addEventListener('change', function() {
    document.getElementById('btnConfRot').disabled = !this.value;
    document.getElementById('btnConfRot').style.background = this.value ? "var(--turno)" : "var(--border-color)";
    document.getElementById('btnConfRot').style.color = this.value ? "white" : "var(--text-muted)";
});

// --- EDIT E ALTRO ---
window.chiudiEditSeSfondo = function(event) { if (event.target.id === 'editModal') window.chiudiEdit(); };
window.chiudiAltroSeSfondo = function(event) { if (event.target.id === 'altroModal') window.chiudiAltroModal(); };
window.chiudiSeSfondo = function(event) { if (event.target.id === 'imageModal') window.chiudiImageModal(); };

function apriModifica(dStr) {
    selectedDate = dStr;
    document.getElementById('modalDate').innerText = formattaData(dStr);
    let sInfoArea = document.getElementById('infoTurniArea');
    sInfoArea.style.display = 'none';
    
    let avvisoVariantiArea = document.getElementById('avvisoVariantiArea');
    avvisoVariantiArea.style.display = 'none';
    avvisoVariantiArea.innerHTML = '';
    
    document.getElementById('btnVisualizzaTurno').style.display = 'none';

    let turnoDisplay = "";
    
    if (state.variazioni && state.variazioni[dStr]) {
        turnoDisplay = state.variazioni[dStr];
    } else if (isGiornoRiposo(dStr)) {
        turnoDisplay = "RI";
    } else {
        if (!state.depositoAttivo || state.depositoAttivo.includes('disp')) {
            turnoDisplay = "DISP";
        } else {
            let turnoCalcolato = calcolaTurni().find(t => t.start === dStr && !t.title.includes('FERIE') && t.title !== 'FEP');
            if(turnoCalcolato) {
                turnoDisplay = turnoCalcolato.title.replace(/<i[^>]*><\/i>/g, '').replace(/\(Sospeso\)/g, '').trim();
            }
        }
    }
    
    document.getElementById('singleTurnoSelect').value = turnoDisplay;
    abilitaSalvataggio();

    let codeBase = turnoDisplay.toUpperCase();
    if (codeBase && codeBase !== "RI" && codeBase !== "RIPOSO" && codeBase !== "AL" && codeBase !== "DISP" && codeBase !== "FEP") {
        
        const dateChiavi = Object.keys(state.dbCache || {}).sort();
        let dbCorrente = {};
        const dSelezionataNum = stringToNum(dStr);
        for (let i = dateChiavi.length - 1; i >= 0; i--) { 
            if (dSelezionataNum >= stringToNum(dateChiavi[i])) { 
                dbCorrente = state.dbCache[dateChiavi[i]]; 
                break; 
            } 
        }

        let chiave = trovaChiaveEsatta(dbCorrente, codeBase, dStr);
        if (chiave && dbCorrente[chiave]) {
            let val = dbCorrente[chiave];
            let orarioStr = `<strong><i class="fa-regular fa-clock"></i> Orario:</strong> ${val.inizio} - ${val.fine}`;
            if (val.inizio2 && val.fine2) {
                orarioStr += `<br><strong><i class="fa-solid fa-arrows-rotate"></i> Ripresa:</strong> ${val.inizio2} - ${val.fine2}`;
            }
            let infoHtml = `
                <div style="font-size:15px; margin-bottom:10px; font-weight:bold; color:var(--text); text-align:center;">${codeBase}</div>
                <div style="margin-bottom:8px;"><strong><i class="fa-solid fa-location-dot"></i> Luogo Monta:</strong> ${val.luogoInizio}</div>
                <div style="margin-bottom:8px;">${orarioStr}</div>
                <div><strong><i class="fa-solid fa-stopwatch"></i> Ore totali:</strong> ${val.ore}</div>
            `;
            sInfoArea.innerHTML = infoHtml;
            sInfoArea.style.display = 'block';
            
            if (AVVISO_VARIANTI && variantiData && Object.keys(variantiData).length > 0) {
                 const variantiGiornoList = variantiData[dStr];
                 if (variantiGiornoList && variantiGiornoList.length > 0) {
                     const varianteSpecifica = variantiGiornoList.find(v => v.turnoBase && v.turnoBase.toUpperCase() === codeBase);
                     if (varianteSpecifica) {
                         avvisoVariantiArea.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Attenzione Variante al Turno:</strong><br>Oggi il turno ${codeBase} subisce una variazione.<br><strong>Nuovo orario:</strong> ${varianteSpecifica.inizio} - ${varianteSpecifica.fine}`;
                         avvisoVariantiArea.style.display = 'block';
                     } else {
                         avvisoVariantiArea.innerHTML = `<i class="fa-solid fa-circle-info"></i> Oggi sono presenti varianti per altri turni, ma il turno <strong>${codeBase}</strong> non sembra essere coinvolto. Controlla comunque i documenti ufficiali.`;
                         avvisoVariantiArea.style.display = 'block';
                     }
                 }
            }

            imgBaseFallback = `https://utilityhaze.github.io/Turni-Actv/DB_Turni_img/${codeBase}.png`; 
            
            const meseNumStr = dStr.split('-')[1];
            let cartellaMese = "";
            switch (meseNumStr) {
                case "11": cartellaMese = "DB_11_24_img"; break;
                case "12": cartellaMese = "DB_12_24_img"; break;
                case "01": cartellaMese = "DB_01_25_img"; break;
                case "02": cartellaMese = "DB_02_25_img"; break;
                case "03": cartellaMese = "DB_03_25_img"; break;
                case "04": cartellaMese = "DB_04_25_img"; break;
                default: cartellaMese = ""; break;
            }

            if (cartellaMese) {
                 currentImagePath = `https://utilityhaze.github.io/Turni-Actv/${cartellaMese}/${codeBase}.png`;
            } else {
                 currentImagePath = imgBaseFallback;
            }

            document.getElementById('btnVisualizzaTurno').style.display = 'inline-block';
        }
    }
    document.getElementById('editModal').style.display = 'block';
}

window.apriImmagineTurno = function() {
    const imgEl = document.getElementById('turnoImage');
    
    imgEl.onerror = function() {
        if (imgEl.src !== imgBaseFallback) {
            console.log("Immagine specifica del mese non trovata, tento il fallback base...");
            imgEl.src = imgBaseFallback;
        } else {
            console.log("Anche il fallback fallito.");
            alert("Immagine del turno non disponibile.");
            window.chiudiImageModal();
        }
    };
    
    imgEl.src = currentImagePath;
    document.getElementById('imageModal').style.display = 'block';

    if (pzInstance) {
        pzInstance.destroy();
        pzInstance = null;
    }

    setTimeout(() => {
        const elem = document.getElementById('turnoImage');
        pzInstance = Panzoom(elem, { maxScale: 4, minScale: 1, contain: 'outside' });
        elem.parentElement.addEventListener('wheel', pzInstance.zoomWithWheel);
    }, 100);
};

window.chiudiImageModal = function() {
    document.getElementById('imageModal').style.display = 'none';
    if (pzInstance) {
        pzInstance.destroy();
        pzInstance = null;
    }
};

window.scaricaImmagineTurno = function() {
    const imgSrc = document.getElementById('turnoImage').src;
    if (!imgSrc) return;

    fetch(imgSrc)
      .then(response => {
          if (!response.ok) throw new Error("Errore nel fetch");
          return response.blob();
      })
      .then(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const fileName = imgSrc.substring(imgSrc.lastIndexOf('/') + 1) || 'turno.png';
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
      })
      .catch(e => {
          console.error(e);
          const link = document.createElement('a');
          link.href = imgSrc;
          link.target = "_blank";
          link.download = "turno.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      });
};

window.abilitaSalvataggio = function() { document.getElementById('btnSalvaCambio').disabled = false; };
window.chiudiEdit = function() { document.getElementById('editModal').style.display = 'none'; };

window.salvaCambioSingolo = function() {
    let t = document.getElementById('singleTurnoSelect').value.trim().toUpperCase();
    if (t) { state.variazioni[selectedDate] = t; } 
    else { delete state.variazioni[selectedDate]; }
    salvaERicarica();
};

window.resetGiornoSingolo = function() {
    delete state.variazioni[selectedDate];
    delete state.colori[selectedDate];
    delete state.note[selectedDate];
    delete state.nebbia[selectedDate];
    delete state.straordinario[selectedDate];
    delete state.sospesoRiposo[selectedDate];
    delete state.buonoPasto[selectedDate];
    delete state.permessoSP[selectedDate];
    salvaERicarica();
};

window.apriAltroModal = function() {
    chiudiEdit();
    tempColoreAltro = state.colori[selectedDate] || "";
    document.getElementById('notaAltro').value = state.note[selectedDate] || "";
    document.getElementById('checkNebbiaAltro').checked = !!state.nebbia[selectedDate];
    document.getElementById('checkSospesoRiposoAltro').checked = !!state.sospesoRiposo[selectedDate];
    document.getElementById('checkBuonoPastoAltro').checked = !!state.buonoPasto[selectedDate];
    
    let permSP = state.permessoSP[selectedDate];
    let chkPermSP = document.getElementById('checkPermessoSPAltro');
    let divPermSP = document.getElementById('permessoSPInputsAltro');
    if (permSP) {
        chkPermSP.checked = true;
        divPermSP.style.display = 'flex';
        document.getElementById('orePermessoSPAltro').value = permSP.ore || '';
        document.getElementById('minutiPermessoSPAltro').value = permSP.minuti || '';
    } else {
        chkPermSP.checked = false;
        divPermSP.style.display = 'none';
        document.getElementById('orePermessoSPAltro').value = '';
        document.getElementById('minutiPermessoSPAltro').value = '';
    }
    
    let st = state.straordinario[selectedDate];
    let chkSt = document.getElementById('checkStraordinarioAltro');
    let divSt = document.getElementById('straordinarioInputsAltro');
    if(st) {
        chkSt.checked = true;
        divSt.style.display = 'flex';
        document.getElementById('oreStraordAltro').value = st.ore || '';
        document.getElementById('minutiStraordAltro').value = st.minuti || '';
    } else {
        chkSt.checked = false;
        divSt.style.display = 'none';
        document.getElementById('oreStraordAltro').value = '';
        document.getElementById('minutiStraordAltro').value = '';
    }
    
    document.querySelectorAll('#altroModal .color-circle').forEach(c => {
        c.classList.remove('selected');
        if(c.getAttribute('data-color') === tempColoreAltro) c.classList.add('selected');
    });
    
    document.getElementById('altroModal').style.display = 'block';
};

window.toggleStraordinarioAltro = function() {
    const chk = document.getElementById('checkStraordinarioAltro');
    const div = document.getElementById('straordinarioInputsAltro');
    div.style.display = chk.checked ? 'flex' : 'none';
};

window.togglePermessoSPAltro = function() {
    const chk = document.getElementById('checkPermessoSPAltro');
    const div = document.getElementById('permessoSPInputsAltro');
    div.style.display = chk.checked ? 'flex' : 'none';
};

window.chiudiAltroModal = function() { document.getElementById('altroModal').style.display = 'none'; };

window.selezionaColoreAltro = function(hex, el) {
    tempColoreAltro = hex;
    document.querySelectorAll('#altroModal .color-circle').forEach(c => c.classList.remove('selected'));
    if(el) el.classList.add('selected');
};

window.salvaAltro = function() {
    let n = document.getElementById('notaAltro').value.trim();
    if(n) state.note[selectedDate] = n; else delete state.note[selectedDate];
    
    if(tempColoreAltro) state.colori[selectedDate] = tempColoreAltro; else delete state.colori[selectedDate];
    
    if(document.getElementById('checkNebbiaAltro').checked) state.nebbia[selectedDate] = true; 
    else delete state.nebbia[selectedDate];

    if(document.getElementById('checkSospesoRiposoAltro').checked) state.sospesoRiposo[selectedDate] = true;
    else delete state.sospesoRiposo[selectedDate];
    
    if(document.getElementById('checkBuonoPastoAltro').checked) state.buonoPasto[selectedDate] = true;
    else delete state.buonoPasto[selectedDate];
    
    if(document.getElementById('checkStraordinarioAltro').checked) {
        let o = parseInt(document.getElementById('oreStraordAltro').value) || 0;
        let m = parseInt(document.getElementById('minutiStraordAltro').value) || 0;
        if(o > 0 || m > 0) state.straordinario[selectedDate] = { ore: o, minuti: m };
        else delete state.straordinario[selectedDate];
    } else {
        delete state.straordinario[selectedDate];
    }

    if(document.getElementById('checkPermessoSPAltro').checked) {
        let o = parseInt(document.getElementById('orePermessoSPAltro').value) || 0;
        let m = parseInt(document.getElementById('minutiPermessoSPAltro').value) || 0;
        if(o > 0 || m > 0) state.permessoSP[selectedDate] = { ore: o, minuti: m };
        else delete state.permessoSP[selectedDate];
    } else {
        delete state.permessoSP[selectedDate];
    }

    salvaERicarica();
};

function calcolaTurni() {
    if (!state.depositoAttivo && !state.setupSkipped) return [];
    
    let turni = [];
    const dbKeys = Object.keys(state.dbCache || {}).sort();
    if (dbKeys.length === 0 && (!state.variazioni || Object.keys(state.variazioni).length === 0)) return [];
    
    let dateMin = Infinity, dateMax = -Infinity;
    if (state.variazioni) {
         Object.keys(state.variazioni).forEach(d => {
             let n = stringToNum(d);
             if (n < dateMin) dateMin = n;
             if (n > dateMax) dateMax = n;
         });
    }
    
    let offset = (365 * 3) * 86400000;
    let nOggi = stringToNum(dateToLocalISO(new Date()));
    let startCalc = Math.min(nOggi - offset, dateMin !== Infinity ? dateMin - offset : nOggi - offset);
    let endCalc = Math.max(nOggi + offset, dateMax !== -Infinity ? dateMax + offset : nOggi + offset);

    for (let currentNum = startCalc; currentNum <= endCalc; currentNum += 86400000) {
        let d = new Date(currentNum);
        let dStr = dateToLocalISO(d);
        let code = "";
        let classColor = "";

        if (state.variazioni && state.variazioni[dStr]) {
            code = state.variazioni[dStr];
            classColor = (code === "RI" || code === "RIPOSO" || code === "AL") ? "bg-riposo" : "bg-modificato";
        } else if (state.setupSkipped) {
            continue; 
        } else {
            if (isGiornoRiposo(dStr)) {
                code = "RI";
                classColor = "bg-riposo";
            } else if (state.depositoAttivo.includes('disp')) {
                let dispCacheCorrente = getDispPerData(dStr);
                if (dispCacheCorrente && dispCacheCorrente.length > 0) {
                    let pos = (((currentNum - stringToNum(state.riposoStart)) % 6 + 6) % 6) - 1;
                    if (pos < 0) pos = 5;
                    let cycleDays = dispCacheCorrente.length; 
                    code = dispCacheCorrente[pos % cycleDays] || "DISP";
                } else {
                    code = "DISP";
                }
                classColor = "bg-disp";
            } else {
                let rStart = stringToNum(state.riposoStart);
                let pos = (((currentNum - rStart + 6) % 15 + 15) % 15);
                let cicloIndice = 0;
                
                if (pos >= 0 && pos <= 5) cicloIndice = pos;
                else if (pos >= 7 && pos <= 12) cicloIndice = pos - 1;
                else cicloIndice = null;

                if (cicloIndice !== null) {
                    let rotCorrente = getRotazionePerData(dStr);
                    if (rotCorrente) {
                        code = rotCorrente[cicloIndice % rotCorrente.length] || "DISP";
                        classColor = "bg-turno";
                    } else {
                        code = "ERR"; classColor = "bg-modificato";
                    }
                } else {
                    code = "ERR_RI"; classColor = "bg-modificato";
                }
            }
        }
        
        let turniAggiuntivi = [];
        let ferieStr = getFerieGiorno(dStr);
        if (ferieStr) {
            turniAggiuntivi.push({
                title: ferieStr,
                start: dStr,
                allDay: true,
                className: "bg-ferie",
                display: "block",
                order: 1 
            });
        }

        if (state.sospesoRiposo && state.sospesoRiposo[dStr]) {
            code += " (Sospeso)";
            classColor = "bg-modificato"; 
        }

        let iconeHtml = "";
        let haIcone = false;
        if(state.note && state.note[dStr]) { iconeHtml += '<i class="fa-solid fa-clipboard fa-fw"></i> '; haIcone = true; }
        if(state.nebbia && state.nebbia[dStr]) { iconeHtml += '<i class="fa-solid fa-smog fa-fw" style="color:white;"></i> '; haIcone = true; }
        if(state.straordinario && state.straordinario[dStr]) { iconeHtml += '<i class="fa-solid fa-stopwatch fa-fw" style="color:#f1c40f;"></i> '; haIcone = true; }
        if(state.buonoPasto && state.buonoPasto[dStr]) { iconeHtml += '<i class="fa-solid fa-utensils fa-fw" style="color:#fd7e14;"></i> '; haIcone = true; }
        if(state.permessoSP && state.permessoSP[dStr]) { iconeHtml += '<i class="fa-solid fa-money-bill-wave fa-fw" style="color:#2dce89;"></i> '; haIcone = true; }
        
        if (haIcone) {
             code = `<div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:3px;">${iconeHtml}</div><div>${code}</div>`;
        }

        turniAggiuntivi.push({ 
            title: code, 
            start: dStr, 
            allDay: true, 
            className: classColor,
            order: 2 
        });

        turni.push(...turniAggiuntivi);
    }
    return turni;
}

function initCalendar() {
    let calEl = document.getElementById('calendar');
    if (!calEl) return;
    
    if (!state.depositoAttivo && state.setupSkipped) {
         document.getElementById('empty-state-calendario').style.display = 'block';
         calEl.style.display = 'none';
         return;
    } else {
         document.getElementById('empty-state-calendario').style.display = 'none';
         calEl.style.display = 'block';
    }
    
    let now = new Date();
    let cy = now.getFullYear();
    let sY = document.getElementById('jumpYear');
    if(sY && sY.options.length === 0) {
        for(let y=cy-5; y<=cy+5; y++) sY.add(new Option(y, y));
        sY.value = cy;
    }

    if (calendar) { calendar.destroy(); }
    
    calendar = new FullCalendar.Calendar(calEl, {
        initialView: 'dayGridMonth',
        locale: 'it',
        firstDay: 1,
        headerToolbar: { 
            left: 'prev,next searchBtn today', 
            center: 'title', 
            right: '' 
        },
        buttonText: { today: 'Oggi' },
        customButtons: {
            searchBtn: {
                text: '🔍',
                click: function() { apriJumpModal(); }
            }
        },
        height: 'auto',
        eventOrder: "order", 
        events: function(info, successCallback, failureCallback) {
            let turni = calcolaTurni();
            successCallback(turni);
        },
        dateClick: function(info) {
            if (state.setupStep === 1) {
                tempRotDate = info.dateStr;
                document.querySelectorAll('.fc-daygrid-day').forEach(el => el.style.border = '');
                info.dayEl.style.border = '2px solid red';
                mostraStepConfigurazione();
            } else if (!state.setupStep && (state.depositoAttivo || state.setupSkipped)) {
                apriModifica(info.dateStr);
            }
        },
        eventClick: function(info) {
            if (state.setupStep === 1) {
                tempRotDate = info.event.startStr;
                document.querySelectorAll('.fc-daygrid-day').forEach(el => el.style.border = '');
                info.el.closest('.fc-daygrid-day').style.border = '2px solid red';
                mostraStepConfigurazione();
            } else if (!state.setupStep && (state.depositoAttivo || state.setupSkipped)) {
                apriModifica(info.event.startStr);
            }
        },
        eventContent: function(arg) {
            let dStr = arg.event.startStr;
            let bgColor = "";
            let colorVal = "";

            if (arg.event.className.includes('bg-ferie')) {
                return { html: `<div style="text-align:center;">${arg.event.title}</div>` };
            }

            if (state.colori && state.colori[dStr]) {
                bgColor = state.colori[dStr];
                colorVal = "#fff"; 
            } else {
                let varCorr = state.variazioni && state.variazioni[dStr];
                let isRip = (varCorr === "RI" || varCorr === "RIPOSO" || varCorr === "AL") || (!varCorr && isGiornoRiposo(dStr));
                
                if (!isRip && !varCorr && state.coloriRotazione) {
                    let rotDays = ['riposo', 1, 2, 3, 4, 5, 6];
                    let posRot = (((stringToNum(dStr) - stringToNum(state.riposoStart || dStr)) % 6 + 6) % 6);
                    if (state.depositoAttivo === 'disp_det') {
                        posRot = (((stringToNum(dStr) - stringToNum(state.riposoStart || dStr)) % 6 + 6) % 6);
                    } else {
                        posRot = (((stringToNum(dStr) - stringToNum(state.riposoStart || dStr) + 6) % 15 + 15) % 15);
                    }
                    
                    let gIdx = 0;
                    if(posRot === 0 || posRot === 6 || posRot === 13 || posRot === 14) {
                         gIdx = 'riposo';
                    } else {
                         let arrLavorativi = [];
                         for(let i=0; i< (state.depositoAttivo === 'disp_det' ? 6 : 15); i++) {
                             if(i!==0 && i!==6 && i!==13 && i!==14) arrLavorativi.push(i);
                         }
                         let idx = arrLavorativi.indexOf(posRot);
                         if(idx !== -1) gIdx = (idx % 6) + 1;
                    }
                    if (state.coloriRotazione[gIdx]) {
                        bgColor = state.coloriRotazione[gIdx];
                        colorVal = "#fff";
                    }
                }
            }

            if (bgColor) {
                return { html: `<div style="background-color:${bgColor}; color:${colorVal}; border-radius:4px; padding:2px; height:100%; display:flex; flex-direction:column; justify-content:center;">${arg.event.title}</div>` };
            } else {
                return { html: `<div>${arg.event.title}</div>` }; 
            }
        }
    });
    calendar.render();
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

async function caricaDatiRemoti(forza = false) {
    if (!state.depositoAttivo && !forza) return;

    if (state.version !== VERSIONE_TURNI || forza) {
        try {
            const rotData = await fetch('https://utilityhaze.github.io/Turni-Actv/rotazioni_turni.json?t=' + new Date().getTime()).then(r => r.json());
            const dispData = await fetch('https://utilityhaze.github.io/Turni-Actv/rotazioni_disp.json?t=' + new Date().getTime()).then(r => r.json());
            const ferieData = await fetch('https://utilityhaze.github.io/Turni-Actv/rotazione_ferie.json?t=' + new Date().getTime()).then(r => r.json());
            
            ROT_FERIE_INV = ferieData.invernali || [];
            ROT_FERIE_EST = ferieData.estive || [];
            
            let filesDbMap = {
                "rot_fnove": ["db_turni_fnove.json", "db_turni_fnove_nuovi.json"],
                "spez_fnove": ["db_turni_fnove.json", "db_turni_fnove_nuovi.json"],
                "tc_spez_fnove": ["db_turni_fnove.json", "db_turni_fnove_nuovi.json"],
                "rot_proma": ["db_turni_proma.json", "db_turni_proma_nuovi.json"],
                "spez_proma": ["db_turni_proma.json", "db_turni_proma_nuovi.json"],
                "ris_proma": ["db_turni_proma.json", "db_turni_proma_nuovi.json"],
                "rot_szaccaria": ["db_turni_szaccaria.json", "db_turni_szaccaria_nuovi.json"],
                "spez_szaccaria": ["db_turni_szaccaria.json", "db_turni_szaccaria_nuovi.json"],
                "tc_spez_szaccaria": ["db_turni_szaccaria.json", "db_turni_szaccaria_nuovi.json"],
                "rot_lido": ["db_turni_lido.json", "db_turni_lido_nuovi.json"],
                "spez_lido": ["db_turni_lido.json", "db_turni_lido_nuovi.json"],
                "tc_spez_lido": ["db_turni_lido.json", "db_turni_lido_nuovi.json"],
                "rot_linea14": ["db_turni_l14.json", "db_turni_l14_nuovi.json"],
                "rot_linea14_mb": ["db_turni_l14.json", "db_turni_l14_mb_nuovi.json"],
                "rot_linea13": ["db_turni_l13.json", "db_turni_l13_nuovi.json"],
                "rot_linea12": ["db_turni_l12.json", "db_turni_l12_nuovi.json"],
                "rot_17sn": ["db_turni_17sn.json", "db_turni_17sn_nuovi.json"],
                "tc_rot_17sn": ["db_turni_17sn.json", "db_turni_17sn_nuovi.json"],
                "rot_17tr": ["db_turni_17tr.json", "db_turni_17tr_nuovi.json"],
                "tc_rot_17tr": ["db_turni_17tr.json", "db_turni_17tr_nuovi.json"],
                "disp_indet": ["db_turni_disp.json", "db_turni_disp_nuovi.json"],
                "disp_det": ["db_turni_disp.json", "db_turni_disp_nuovi.json"]
            };

            let dep = state.depositoAttivo || "rot_fnove"; 
            let arrayFiles = filesDbMap[dep] || filesDbMap["rot_fnove"];
            
            let fileVecchio = arrayFiles[0];
            let fileNuovo = arrayFiles[1];

            const dbDataVecchio = await fetch('https://utilityhaze.github.io/Turni-Actv/' + fileVecchio + '?t=' + new Date().getTime()).then(r => r.json());
            const dbDataNuovo = await fetch('https://utilityhaze.github.io/Turni-Actv/' + fileNuovo + '?t=' + new Date().getTime()).then(r => r.json());

            state.rotCache = { "2020-01-01": rotData[dep] }; 
            if (rotData[dep + "_nuovi"]) {
                state.rotCache[DATA_INIZIO_NUOVI_TURNI] = rotData[dep + "_nuovi"];
            }

            state.dispCache = { "2020-01-01": dispData[dep] };
            if (dispData[dep + "_nuovi"]) {
                state.dispCache[DATA_INIZIO_NUOVI_TURNI] = dispData[dep + "_nuovi"];
            }
            
            state.dbCache = { "2020-01-01": dbDataVecchio };
            state.dbCache[DATA_INIZIO_NUOVI_TURNI] = dbDataNuovo;

            if (state.version !== VERSIONE_TURNI && RESET_DOPO_AGGIORNAMENTO[state.depositoAttivo]) {
                if (state.riposoStart && stringToNum(state.riposoStart) < stringToNum(DATA_INIZIO_NUOVI_TURNI)) {
                    state.history = {
                        depositoAttivo: state.depositoAttivo,
                        riposoStart: state.riposoStart
                    };
                    state.depositoAttivo = null;
                    state.riposoStart = null;
                    state.setupStep = 0;
                    alert("Nuovi turni rilevati! La tua rotazione è stata azzerata e salvata nello storico.\nI tuoi turni passati sono conservati, ma devi reimpostare la tua riga dalla schermata di Configurazione per continuare ad usare il calendario.");
                }
            }

            state.version = VERSIONE_TURNI;
            localStorage.setItem('myTurniApp', JSON.stringify(state));
            
        } catch (error) {
            console.error("Errore fetch dati:", error);
            if (!state.dbCache) alert("Impossibile caricare i dati. Controlla la connessione.");
        }
    } else {
        try {
            const ferieData = await fetch('https://utilityhaze.github.io/Turni-Actv/rotazione_ferie.json?t=' + new Date().getTime()).then(r => r.json());
            ROT_FERIE_INV = ferieData.invernali || [];
            ROT_FERIE_EST = ferieData.estive || [];
        } catch(e) { console.error("Errore fetch ferie", e); }
    }
}

async function caricaVarianti() {
    try {
        if (!AVVISO_VARIANTI) return;
        const resp = await fetch('https://utilityhaze.github.io/Turni-Actv/varianti_turni.json?t=' + new Date().getTime());
        variantiData = await resp.json();
    } catch(e) {
        console.error("Errore fetch varianti:", e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.utenteLoggato = user.uid;
            localStorage.setItem('utenteFirebase', user.uid);
            
            const boost = localStorage.getItem('refreshBoost');
            if(boost) {
                if(new Date().getTime() < parseInt(boost)) {
                     console.log("Boost attivo, skip sync da Firebase");
                     return;
                } else {
                     localStorage.removeItem('refreshBoost');
                }
            }

            onSnapshot(doc(db, "utenti", user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    let remoteState = docSnap.data();
                    
                    if (state && remoteState && remoteState.versioneRemota) {
                        if (remoteState.versioneRemota > (state.versioneRemota || 0)) {
                            state = { ...getInitialState(), ...remoteState };
                            localStorage.setItem('myTurniApp', JSON.stringify(state));
                            initCalendar();
                        }
                    } else if (!state.depositoAttivo && remoteState.depositoAttivo) {
                        state = { ...getInitialState(), ...remoteState };
                        localStorage.setItem('myTurniApp', JSON.stringify(state));
                        initCalendar();
                    }
                }
            });
        }
    });

    await caricaDatiRemoti();
    await caricaVarianti();

    if (!state.depositoAttivo && !state.setupSkipped) {
        document.getElementById('welcomeModal').style.display = 'block';
    } else if (state.setupStep) {
        mostraStepConfigurazione();
    }
    
    initCalendar();
    renderListaProfili();
    
    document.getElementById('singleTurnoSelect').addEventListener('input', function(e) {
        this.value = this.value.toUpperCase();
    });
});
