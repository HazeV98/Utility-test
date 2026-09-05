import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMessaging, getToken, deleteToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";

import { avviaMotoreAuth } from './auth.js';

// ============================================================================
// SISTEMA DI LAZY LOADING INTEGRATO
// ============================================================================
const ModuliLazyLoader = {
    cache: new Map(),
    initializedUIs: new Set(),
    moduli: {
        turni: { motore: './turni.js', ui: './ui_turni.js', exports: ['avviaMotoreTurni', 'initUITurni'] },
        orari: { motore: './orari.js', ui: './ui_orari.js', exports: ['avviaMotoreOrari', 'initUIOrari'] },
        link: { motore: './link.js', ui: './ui_link.js', exports: ['avviaMotoreLink', 'initUILink'] },
        documenti: { motore: './documenti.js', ui: './ui_documenti.js', exports: ['avviaMotoreDocumenti', 'initUIDocumenti'] },
        contatti: { motore: './contatti.js', ui: './ui_contatti.js', exports: ['avviaMotoreContatti', 'initUIContatti'] },
        bacheca_utility: { motore: './bacheca_utility.js', ui: './ui_bacheca_utility.js', exports: ['avviaMotoreBachecaUtility', 'initUIBachecaUtility'] },
        rubrica: { motore: './rubrica.js', ui: './ui_rubrica.js', exports: ['avviaMotoreRubrica', 'initUIRubrica'] },
        bacheca_turni: { motore: './bacheca_turni.js', ui: './ui_bacheca_turni.js', exports: ['avviaMotoreBachecaTurni', 'initUIBachecaTurni'] },
        barcadvisor: { motore: './barcadvisor.js', ui: './ui_barcadvisor.js', exports: ['avviaMotoreBarcadvisor', 'initUIBarcadvisor'] },
        buoni_pasto: { motore: './buoni_pasto.js', ui: './ui_buoniPasto.js', exports: ['avviaMotoreBuoniPasto', 'initUIBuoniPasto'] },
        statistiche: { motore: './statistiche.js', ui: './ui_statistiche.js', exports: ['avviaMotoreStatistiche', 'initUIStatistiche'] },
        rotazioni: { motore: './rotazioni.js', ui: './ui_rotazioni.js', exports: ['avviaMotoreRotazioni', 'initUIRotazioni'] },
        rotazione_ferie: { motore: './rotazione_ferie.js', ui: './ui_rotazione_ferie.js', exports: ['avviaMotoreRotazioneFerie', 'initUIRotazioneFerie'] },
        promemoria: { motore: './promemoria.js', ui: './ui_promemoria.js', exports: ['avviaMotorePromemoria', 'initUIPromemoria'] },
        dds: { motore: './dds.js', ui: './ui_dds.js', exports: ['avviaMotoreDDS', 'initUIDDS'] },
        guida: { motore: './guida.js', ui: './ui_guida.js', exports: ['avviaMotoreGuida', 'initUIGuida'] },
        admin: { motore: './admin.js', ui: './ui_admin.js', exports: ['avviaMotoreAdmin', 'initUIAdmin'] },
        report: { motore: './report.js', ui: './ui_report.js', exports: ['avviaMotoreSegnalazioni', 'initUISegnalazioni'] }
    },
    
    async caricaModulo(nomeModulo) {
        const config = this.moduli[nomeModulo];
        if (!config) { console.error(`✗ Modulo '${nomeModulo}' non trovato`); return null; }

        if (this.cache.has(nomeModulo)) {
            const cached = this.cache.get(nomeModulo);
            if (config.exports.some(f => f.startsWith('initUI')) && !this.initializedUIs.has(nomeModulo)) {
                const initFunc = config.exports.find(f => f.startsWith('initUI'));
                if (cached[initFunc]) {
                    try { cached[initFunc](); this.initializedUIs.add(nomeModulo); } 
                    catch (initError) { console.warn(`⚠️ Errore init UI cached '${nomeModulo}':`, initError); }
                }
            }
            return cached;
        }
        
        try {
            const motoreModule = await import(config.motore);
            const uiModule = await import(config.ui);
            const esporta = {};
            
            config.exports.forEach(funz => {
                if (motoreModule[funz]) esporta[funz] = motoreModule[funz];
                if (uiModule[funz]) esporta[funz] = uiModule[funz];
            });
            
            this.cache.set(nomeModulo, esporta);

            const initFunc = config.exports.find(f => f.startsWith('initUI'));
            if (initFunc && esporta[initFunc] && !this.initializedUIs.has(nomeModulo)) {
                try { esporta[initFunc](); this.initializedUIs.add(nomeModulo); } 
                catch (initError) { console.warn(`⚠️ Errore init UI '${nomeModulo}':`, initError); }
            }
            return esporta;
        } catch (errore) {
            console.error(`✗ Errore caricamento modulo '${nomeModulo}':`, errore);
            return null;
        }
    },
    
    async inizializzaUI(nomeModulo) {
        const modulo = await this.caricaModulo(nomeModulo);
        if (!modulo) return null;
        const config = this.moduli[nomeModulo];
        const initFunc = config.exports.find(f => f.startsWith('initUI'));
        return modulo[initFunc] || null;
    },
    
    async avviaMotore(nomeModulo) {
        const modulo = await this.caricaModulo(nomeModulo);
        if (!modulo) return null;
        const config = this.moduli[nomeModulo];
        const motoreFunc = config.exports.find(f => f.startsWith('avviaMotore'));
        return modulo[motoreFunc] || null;
    },
    
    async precarica(nomiModuli = []) {
        const daPrecaricare = nomiModuli.length > 0 ? nomiModuli : Object.keys(this.moduli);
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                daPrecaricare.forEach(nome => { this.caricaModulo(nome).catch(e => console.warn(`Errore precaricamento ${nome}:`, e)); });
            }, { timeout: 3000 });
        } else {
            setTimeout(() => {
                daPrecaricare.forEach(nome => { this.caricaModulo(nome).catch(e => console.warn(`Errore precaricamento ${nome}:`, e)); });
            }, 2000);
        }
    },
    
    svuotaCache() { this.cache.clear(); },
    mostraStatistiche() { console.log(`Moduli in cache: ${this.cache.size}`); }
};
// ============================================================================

const firebaseConfig = { 
    apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4", 
    authDomain: "utility-haze.firebaseapp.com", 
    projectId: "utility-haze", 
    storageBucket: "utility-haze.firebasestorage.app", 
    messagingSenderId: "686237947418", 
    appId: "1:686237947418:web:f03ba19ab8fff43110a3a3" 
};

const app = initializeApp(firebaseConfig); 
const auth = getAuth(app); 
const db = getFirestore(app); 
const provider = new GoogleAuthProvider();

avviaMotoreAuth(auth, db, provider);

const ADMIN_UID = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2"; 
let globalIsAdmin = false; 
let globalIsCollab = false;
window.currentUserData = {}; 
window.utentiMap = {};
window.utentiArrayCache = [];

window.ROTAZIONI_MAP = {
    "disp_5_1": "Disponibile 5-1", "disp_6_2_6_1": "Disponibile 6-2-6-1",
    "rot_fnove": "Rotazione F.Nove", "spez_fnove": "Spezzati F.Nove", "tc_spez_fnove": "T.C. Spezzati F.Nove",
    "rot_proma": "Rotazione P.Roma", "spez_proma": "Spezzati P.Roma", "ris_proma": "Riserva P.Roma",
    "rot_szaccaria": "Rotazione S.Zaccaria", "spez_szaccaria": "Spezzati S.Zaccaria", "tc_spez_szaccaria": "T.C. Spezzati S.Zaccaria",
    "rot_lido": "Rotazione Lido", "spez_lido": "Spezzati Lido", "tc_spez_lido": "T.C. Spezzati Lido",
    "rot_linea12": "Rotazione Linea 12", "rot_linea13": "Rotazione Linea 13", "rot_linea14": "Rotazione Linea 14 M/N",
    "rot_linea14_mb": "Rotazione Linea 14 M/B", "rot_17sn": "Rotazione Linea 17 S. Nicolò", "tc_rot_17sn": "T.C. Rotazione 17 S. Nicolò",
    "rot_17tr": "Rotazione Linea 17 Tron.", "tc_rot_17tr": "T.C. Rotazione Linea 17 Tronc."
};

const DEFAULT_APPS = [
    { id: "oggi", label: "Oggi", href: "calendario.html?oggi=true", icon: "fa-solid fa-bullseye", defaultColor: "#28a745" },
    { id: "calendario", label: "Calendario", href: "calendario.html", icon: "fa-solid fa-calendar-days", defaultColor: "#0066cc" },
    { id: "statistiche", label: "Statistiche\nCalendario", onclick: "window.apriModaleStatistiche()", icon: "fa-solid fa-chart-simple", defaultColor: "#6f42c1" },
    { id: "rotazioni", label: "Rotazioni", onclick: "window.apriModaleRotazioni()", icon: "fa-solid fa-users", defaultColor: "#fd7e14" },
    { id: "turni", label: "Turni", onclick: "window.apriModaleTurni()", icon: "fa-solid fa-rotate", defaultColor: "#20c997" },
    { id: "bachecaturni", label: "Bacheca\nTurni", onclick: "window.apriModaleBachecaTurni()", icon: "fa-solid fa-handshake-angle", defaultColor: "#e83e8c" },
    { id: "barcadvisor", label: "BarcAdvisor", onclick: "window.apriModaleBarcadvisor()", icon: "fa-solid fa-sailboat", defaultColor: "#ff9800" },
    { id: "rubrica", label: "Rubrica", onclick: "window.apriModaleRubrica()", icon: "fa-solid fa-address-book", defaultColor: "#343a40" },
    { id: "ferie", label: "Rotazione\nFerie", onclick: "window.apriModaleRotazioneFerie()", icon: "fa-solid fa-umbrella-beach", defaultColor: "#ffc107" },
    { id: "orari", label: "Orari\nNavigazione", onclick: "window.apriModaleOrari()", icon: "fa-regular fa-clock", defaultColor: "#17a2b8" },
    { id: "chebateo", label: "CheBateo", href: "https://m.chebateo.it/", icon: "fa-solid fa-water", defaultColor: "#0066cc" },
    { id: "documenti", label: "Documenti", onclick: "window.apriModaleDocumenti()", icon: "fa-solid fa-file-lines", defaultColor: "#6c757d" },
    { id: "vademecum", label: "Vademecum", href: "vademecum.html", icon: "fa-solid fa-book", defaultColor: "#8e8e93" },
    { id: "link", label: "Link", onclick: "window.apriModaleLink()", icon: "fa-solid fa-link", defaultColor: "#495057" },
    { id: "contatti", label: "Contatti", onclick: "window.apriModaleContatti()", icon: "fa-solid fa-id-card", defaultColor: "#2c3e50" },
    { id: "buoni", label: "Buoni\nPasto", onclick: "window.apriModaleBuoniPasto()", icon: "fa-solid fa-utensils", defaultColor: "#d63384" },
    { id: "promemoria", label: "Promemoria", onclick: "window.apriModalePromemoria()", icon: "fa-solid fa-stopwatch", defaultColor: "#0dcaf0" },
    { id: "dds", label: "Archivio\nDDS", onclick: "window.apriModaleDDS()", icon: "fa-solid fa-box-archive", defaultColor: "#5856d6" },
    { id: "report", label: "Assistenza\nApp", onclick: "window.avviaMotoreSegnalazioniDaIndex()", icon: "fa-solid fa-headset", defaultColor: "#0088ff" },
    { id: "spriss", label: "Spriss", href: "https://spriss.avmspa.it/", icon: "fa-solid fa-martini-glass", defaultColor: "#dc3545" },
    { id: "admin", label: "Admin", onclick: "window.apriModaleAdmin()", condition: "admin", icon: "fa-solid fa-lock", defaultColor: "#ff3b30" },
    { id: "accessi", label: "Accessi", onclick: "window.apriGestioneAccessi()", condition: "admin", icon: "fa-solid fa-users-gear", defaultColor: "#1c1c1e" }
];

window.apriMenuLaterale = () => { 
    const s = document.getElementById('sidebar'); if(s) s.classList.add('open'); 
    const o = document.getElementById('sidebar-overlay'); if(o) o.style.display = 'block'; 
};
window.chiudiMenuLaterale = () => { 
    const s = document.getElementById('sidebar'); if(s) s.classList.remove('open'); 
    const o = document.getElementById('sidebar-overlay'); if(o) o.style.display = 'none'; 
};

window.avviaMotoreTurniDaIndex = async () => {
    if (!auth.currentUser) { alert("Devi effettuare il login per accedere ai turni."); return; }
    if (window.currentUserData) {
        if (window.currentUserData.turni_banned === true) { alert("Il tuo accesso alla pagina Turni è stato temporaneamente revocato."); return; }
        if (!window.currentUserData.nome || !window.currentUserData.cognome || window.currentUserData.matricola === undefined || window.currentUserData.matricola === "") {
            alert("Devi prima completare il tuo profilo (Nome, Cognome e Matricola) per visualizzare i turni.");
            window.apriModal('profileModal'); return;
        }
    }
    const modulo = await ModuliLazyLoader.avviaMotore('turni');
    if (modulo) modulo();
    const oggiStr = new Date().toISOString().split('T')[0];
    if (window.currentUserData && (window.currentUserData.turni_access !== true || window.currentUserData.last_turni_access !== oggiStr)) {
        setDoc(doc(db, "utenti", auth.currentUser.uid), { turni_access: true, last_turni_access: oggiStr }, { merge: true });
        window.currentUserData.turni_access = true; window.currentUserData.last_turni_access = oggiStr;
    }
};

window.avviaMotoreOrariDaIndex = async () => {
    const modulo = await ModuliLazyLoader.avviaMotore('orari');
    if (modulo) modulo();
};

window.avviaMotoreLinkDaIndex = async () => {
    if (!auth.currentUser) { alert("Devi effettuare il login per accedere ai link aziendali."); return; }
    if (window.currentUserData) {
        if (window.currentUserData.link_banned === true) { alert("L'accesso ai Link ti è stato revocato da un Amministratore."); return; }
        if (!window.currentUserData.nome || !window.currentUserData.cognome || window.currentUserData.matricola === undefined) {
            alert("Devi prima completare il tuo profilo (Nome, Cognome e Matricola) per accedere.");
            window.apriModal('profileModal'); return;
        }
    }
    const modulo = await ModuliLazyLoader.avviaMotore('link');
    if (modulo) modulo(db, auth); 
    const oggiStr = new Date().toISOString().split('T')[0];
    if (window.currentUserData && (window.currentUserData.link_access !== true || window.currentUserData.last_link_access !== oggiStr)) {
        setDoc(doc(db, "utenti", auth.currentUser.uid), { link_access: true, last_link_access: oggiStr }, { merge: true });
        window.currentUserData.link_access = true; window.currentUserData.last_link_access = oggiStr;
    }
};

window.avviaMotoreDocumentiDaIndex = async () => {
    if (!auth.currentUser) { alert("Devi effettuare il login per accedere ai documenti."); return; }
    if (window.currentUserData) {
        if (window.currentUserData.documenti_banned === true) { alert("L'accesso ai Documenti ti è stato revocato da un Amministratore."); return; }
        if (!window.currentUserData.nome || !window.currentUserData.cognome || window.currentUserData.matricola === undefined) {
            alert("Devi prima completare il tuo profilo (Nome, Cognome e Matricola) per accedere all'archivio.");
            window.apriModal('profileModal'); return;
        }
    }
    const modulo = await ModuliLazyLoader.avviaMotore('documenti');
    if (modulo) modulo();
    const oggiStr = new Date().toISOString().split('T')[0];
    if (window.currentUserData && (window.currentUserData.documenti_access !== true || window.currentUserData.last_documenti_access !== oggiStr)) {
        setDoc(doc(db, "utenti", auth.currentUser.uid), { documenti_access: true, last_documenti_access: oggiStr }, { merge: true });
        window.currentUserData.documenti_access = true; window.currentUserData.last_documenti_access = oggiStr;
    }
};

window.avviaMotoreContattiDaIndex = async () => {
    if (!auth.currentUser) { alert("Devi effettuare il login per accedere ai contatti aziendali."); return; }
    if (window.currentUserData) {
        if (window.currentUserData.contatti_banned === true) { alert("L'accesso ai Contatti ti è stato revocato da un Amministratore."); return; }
        if (!window.currentUserData.nome || !window.currentUserData.cognome || window.currentUserData.matricola === undefined) {
            alert("Devi prima completare il tuo profilo (Nome, Cognome e Matricola) per accedere ai contatti.");
            window.apriModal('profileModal'); return;
        }
    }
    const modulo = await ModuliLazyLoader.avviaMotore('contatti');
    if (modulo) modulo(db, auth); 
    const oggiStr = new Date().toISOString().split('T')[0];
    if (window.currentUserData && (window.currentUserData.contatti_access !== true || window.currentUserData.last_contatti_access !== oggiStr)) {
        setDoc(doc(db, "utenti", auth.currentUser.uid), { contatti_access: true, last_contatti_access: oggiStr }, { merge: true });
        window.currentUserData.contatti_access = true; window.currentUserData.last_contatti_access = oggiStr;
    }
};

window.avviaMotoreBachecaUtilityDaIndex = async () => {
    const fullName = `${window.currentUserData?.nome || ''} ${window.currentUserData?.cognome || ''}`.trim();
    const modulo = await ModuliLazyLoader.avviaMotore('bacheca_utility');
    if (modulo) modulo(app, db, auth, globalIsAdmin || globalIsCollab, fullName);
};

window.avviaMotoreRubricaDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('rubrica');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreBachecaTurniDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('bacheca_turni');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreBarcadvisorDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('barcadvisor');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreBuoniPastoDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('buoni_pasto');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreStatisticheDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('statistiche');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreRotazioniDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('rotazioni');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreRotazioneFerieDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('rotazione_ferie');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotorePromemoriaDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('promemoria');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreDDSDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('dds');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreGuidaDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('guida');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreAdminDaIndex = async () => {
    if (!globalIsAdmin) { alert("Accesso negato. Solo gli amministratori possono accedere a questa sezione."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('admin');
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreSegnalazioniDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("L'accesso alle funzioni ti è stato revocato."); return; }
    if (auth.currentUser) {
        const modulo = await ModuliLazyLoader.avviaMotore('report');
        if (modulo) {
            modulo(db, auth, auth.currentUser.uid, globalIsAdmin);
            if(window.apriModaleSegnalazioni) {
                window.apriModaleSegnalazioni();
                const btn = document.getElementById('btn-report');
                if (btn) { let b = btn.querySelector('.badge-notif'); if (b) b.remove(); }
                const banner = document.getElementById('banner-segnalazioni-alert');
                if (banner) banner.style.display = 'none';
            }
        }
    }
};

window.controllaSegnalazioni = async () => {
    if (!auth.currentUser) return;
    try {
        let count = 0; let messaggioBanner = "";
        if (globalIsAdmin) {
            const q = query(collection(db, "segnalazioni"), where("stato", "==", "in_attesa"));
            const snap = await getDocs(q);
            snap.forEach(d => { if (d.data().letta_da_admin === false) count++; });
            if (count > 0) messaggioBanner = count === 1 ? "Hai 1 nuovo messaggio nei ticket!" : `Hai ${count} nuovi messaggi nei ticket!`;
        } else {
            const q = query(collection(db, "segnalazioni"), where("mittente_uid", "==", auth.currentUser.uid));
            const snap = await getDocs(q);
            snap.forEach(d => { if (d.data().letta_da_utente === false) count++; });
            if (count > 0) messaggioBanner = count === 1 ? "L'Admin ha risposto al tuo ticket!" : `L'Admin ha risposto a ${count} tuoi ticket!`;
        }

        const banner = document.getElementById('banner-segnalazioni-alert');
        const btn = document.getElementById('btn-report');
        
        if (count > 0) {
            if (banner) {
                const testo = document.getElementById('testo-segnalazione-banner');
                if(testo) testo.innerText = messaggioBanner;
                banner.style.display = 'flex';
            }
            if (btn) {
                let b = btn.querySelector('.badge-notif'); if (b) b.remove();
                btn.insertAdjacentHTML('beforeend', `<div class="badge-notif" style="background:var(--danger);">${count}</div>`);
            }
        } else {
            if (banner) banner.style.display = 'none';
            if (btn) { let b = btn.querySelector('.badge-notif'); if (b) b.remove(); }
        }
    } catch(e) { console.error("Errore check segnalazioni:", e); }
};

window.controllaBacheca = async () => {
    if (!auth.currentUser) return;
    try {
        let fbAccess = parseInt(window.currentUserData?.ultimo_accesso_bacheca || 0);
        let localAccess = parseInt(localStorage.getItem('ultimo_accesso_bacheca') || 0);
        let ultimoAccesso = Math.max(fbAccess, localAccess);

        const stateApp = JSON.parse(localStorage.getItem('myTurniApp')) || {};
        const pid = stateApp.profiloAttivoId || 'default';
        const profileObj = stateApp.profiliSalvati ? stateApp.profiliSalvati[pid] : stateApp;
        const rotazioneUtente = profileObj ? profileObj.depositoAttivo : null;
        
        const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
        const oggiStr = formatterDate.format(new Date());

        const q = query(collection(db, "bacheca_utility"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);

        let avvisiNormali = 0; let avvisiDDS = [];

        snap.forEach(d => {
            let m = d.data();
            if (m.scadenza && m.scadenza < oggiStr) return; 
            if (!globalIsAdmin && !globalIsCollab && m.target && m.target !== "tutti") {
                if (!rotazioneUtente || !m.target.includes(rotazioneUtente)) return;
            }
            const giaLetto = localStorage.getItem('letto_' + d.id);
            if (m.timestamp > ultimoAccesso && !giaLetto) {
                if (m.tipo === "dds") avvisiDDS.push(m.titolo_dds);
                else avvisiNormali++;
            }
        });

        let totali = avvisiNormali + avvisiDDS.length;

        const badge = document.getElementById('badge-messaggi');
        if (badge) { 
            if (totali > 0) { badge.innerText = totali; badge.style.display = 'flex'; }
            else { badge.style.display = 'none'; }
        }

        const bannerNormal = document.getElementById('banner-nuovo-messaggio');
        if (bannerNormal) {
            if (avvisiNormali > 0) bannerNormal.style.display = 'flex';
            else bannerNormal.style.display = 'none';
        }
        
        const bannerDDS = document.getElementById('banner-dds-alert');
        const textDDS = document.getElementById('titolo-dds-text');
        if (bannerDDS && textDDS) {
            if (avvisiDDS.length > 0) {
                textDDS.innerText = avvisiDDS[0] + (avvisiDDS.length > 1 ? ` (+${avvisiDDS.length - 1})` : '');
                bannerDDS.style.display = 'flex';
            } else { bannerDDS.style.display = 'none'; }
        }
    } catch(e) { console.error("Errore check bacheca:", e); }
};

window.addEventListener('bacheca-utility-letta', async () => {
    const badge = document.getElementById('badge-messaggi'); if (badge) badge.style.display = 'none';
    const bannerNormal = document.getElementById('banner-nuovo-messaggio'); if (bannerNormal) bannerNormal.style.display = 'none';
    const bannerDDS = document.getElementById('banner-dds-alert'); if (bannerDDS) bannerDDS.style.display = 'none';

    const now = Date.now();
    localStorage.setItem('ultimo_accesso_bacheca', now);
    
    if (window.currentUserData) window.currentUserData.ultimo_accesso_bacheca = now;
    if (auth.currentUser) {
        try { await setDoc(doc(db, "utenti", auth.currentUser.uid), { ultimo_accesso_bacheca: now }, { merge: true }); } 
        catch(e) { console.error("Errore salvataggio ultimo accesso bacheca:", e); }
    }
});

window.controllaRichiesteSospese = async () => {
    if (!globalIsAdmin && !globalIsCollab) return;
    try {
        let permessiGestione = [];
        if (globalIsCollab && auth.currentUser) {
            const myPermsSnap = await getDoc(doc(db, "permessi_rotazioni", auth.currentUser.uid));
            if (myPermsSnap.exists() && myPermsSnap.data().permessi_gestione) {
                permessiGestione = myPermsSnap.data().permessi_gestione;
            }
        }

        const q = query(collection(db, "permessi_rotazioni"), where("stato_richiesta", "==", "pending"));
        const snap = await getDocs(q);
        let count = 0;
        
        snap.forEach(d => {
            const p = d.data();
            if (globalIsAdmin) count++;
            else if (globalIsCollab && permessiGestione.includes(p.rotazione_richiesta)) count++;
        });
        
        const btnRot = document.getElementById('btn-rotazioni');
        if (btnRot) {
            let b = btnRot.querySelector('.badge-notif'); if (b) b.remove();
            if (count > 0) btnRot.insertAdjacentHTML('beforeend', `<div class="badge-notif">${count}</div>`);
        }
    } catch(e) { console.error("Errore check richieste rotazioni:", e); }
};

window.controllaPromemoria = async () => {
    if (!auth.currentUser) return;
    try {
        const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
        const oggiStr = formatterDate.format(new Date());
        
        const q = query(collection(db, "utenti", auth.currentUser.uid, "promemoria_sync"), where("completato", "==", false));
        const snap = await getDocs(q);
        let activeCount = 0;

        snap.forEach(d => {
            const p = d.data();
            if (p.date && p.date.includes(oggiStr)) activeCount++;
        });

        if (activeCount > 0) {
            const banner = document.getElementById('banner-promemoria-alert');
            if (banner) {
                banner.innerHTML = `<i class="fa-solid fa-stopwatch fa-beat"></i> Hai ${activeCount} promemoria per oggi!`;
                banner.style.display = 'flex';
            }
            const btn = document.getElementById('btn-promemoria');
            if (btn) {
                let b = btn.querySelector('.badge-notif'); if (b) b.remove();
                btn.insertAdjacentHTML('beforeend', `<div class="badge-notif" style="background:#17a2b8; border-color:var(--bg-color);">${activeCount}</div>`);
            }
        }
    } catch(e) { console.error("Errore check promemoria:", e); }
};

window.inizializzaNotificheSeNativa = async (userData) => {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.PushNotifications;
    const isWeb = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

    if (isNative || isWeb) {
        document.getElementById('native-notifications-center').style.display = 'block';
        
        const statusText = document.getElementById('notif-status-text');
        const btn = document.getElementById('btn-attiva-notifiche');
        const btnDisattiva = document.getElementById('btn-disattiva-notifiche');
        const prefSection = document.getElementById('notif-preferences-section');

        if (userData && (userData.ruolo === 'admin' || userData.ruolo === 'collaborator' || globalIsAdmin || globalIsCollab)) {
            document.getElementById('label-notif-rotazioni').style.display = 'flex';
        }

        if (userData && userData.preferenze_notifiche) {
            document.getElementById('pref-notif-promemoria').checked = !!userData.preferenze_notifiche.promemoria;
            document.getElementById('pref-notif-dds').checked = !!userData.preferenze_notifiche.dds;
            document.getElementById('pref-notif-utility').checked = !!userData.preferenze_notifiche.bacheca_utility;
            document.getElementById('pref-notif-rotazioni').checked = !!userData.preferenze_notifiche.richieste_rotazioni;
            document.getElementById('pref-notif-segnalazioni').checked = !!userData.preferenze_notifiche.segnalazioni;

            if (Array.isArray(userData.preferenze_notifiche.mansioni_turni)) {
                document.querySelectorAll('.pref-mansione').forEach(cb => {
                    cb.checked = userData.preferenze_notifiche.mansioni_turni.includes(cb.value);
                });
            }
        }

        const aggiornaGraficaPermessi = (isGranted) => {
            if (isGranted) {
                statusText.innerHTML = "<i class='fa-solid fa-circle-check'></i> Notifiche app attive";
                statusText.style.color = "var(--success)";
                btn.style.display = 'none';
                if (btnDisattiva) btnDisattiva.style.display = 'flex';
                prefSection.style.display = 'block';
            } else {
                statusText.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Notifiche bloccate o non attive";
                statusText.style.color = "#856404";
                btn.style.display = 'block';
                if (btnDisattiva) btnDisattiva.style.display = 'none';
                prefSection.style.display = 'none';
            }
        };

        if (isNative) {
            const PushNotifications = window.Capacitor.Plugins.PushNotifications;
            PushNotifications.addListener('registration', async (token) => {
                if (auth.currentUser) {
                    await setDoc(doc(db, "utenti", auth.currentUser.uid), { fcm_token: token.value, device_type: 'android_app' }, { merge: true });
                    aggiornaGraficaPermessi(true);
                }
            });

            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive === 'prompt') { permStatus = await PushNotifications.requestPermissions(); }
            if (permStatus.receive === 'granted') { PushNotifications.register(); aggiornaGraficaPermessi(true); } 
            else { aggiornaGraficaPermessi(false); }
        } else if (isWeb) {
            if (Notification.permission === 'granted') {
                aggiornaGraficaPermessi(true);
                try {
                    const messaging = getMessaging(app);
                    const swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
                    const token = await getToken(messaging, { 
                        vapidKey: "BLex63nSSs-uyUZUIRzWPOQyznfTkHC8ZtNnInGArryQnYddSfIHjAH1IwfoopM9otZ4jl2NGL5vM4xtLHkqwyI",
                        serviceWorkerRegistration: swRegistration
                    });
                    if (token && auth.currentUser) {
                        await setDoc(doc(db, "utenti", auth.currentUser.uid), { fcm_token: token, device_type: 'pwa_web' }, { merge: true });
                    }
                } catch (e) { console.warn("Nessun token web ottenuto:", e); }
            } else { aggiornaGraficaPermessi(false); }
        }
    }
};

window.gestisciNotificheNative = async () => {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.PushNotifications;
    const isWeb = 'Notification' in window;
    const statusText = document.getElementById('notif-status-text');
    const btnDisattiva = document.getElementById('btn-disattiva-notifiche');
    
    statusText.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Richiesta permesso in corso...";

    if (isNative) {
        const PushNotifications = window.Capacitor.Plugins.PushNotifications;
        let permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive === 'granted') { await PushNotifications.register(); } 
        else {
            statusText.innerHTML = "<i class='fa-solid fa-xmark'></i> Devi attivarle dalle Impostazioni.";
            statusText.style.color = "var(--danger)";
        }
    } else if (isWeb) {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                statusText.innerHTML = "<i class='fa-solid fa-circle-check'></i> Notifiche app attive";
                statusText.style.color = "var(--success)";
                document.getElementById('btn-attiva-notifiche').style.display = 'none';
                if (btnDisattiva) btnDisattiva.style.display = 'flex';
                document.getElementById('notif-preferences-section').style.display = 'block';

                try {
                    const messaging = getMessaging(app);
                    const swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
                    const token = await getToken(messaging, { 
                        vapidKey: "BLex63nSSs-uyUZUIRzWPOQyznfTkHC8ZtNnInGArryQnYddSfIHjAH1IwfoopM9otZ4jl2NGL5vM4xtLHkqwyI",
                        serviceWorkerRegistration: swRegistration
                    });
                    if (token && auth.currentUser) {
                        await setDoc(doc(db, "utenti", auth.currentUser.uid), { fcm_token: token, device_type: 'pwa_web' }, { merge: true });
                    }
                } catch (e) { console.error("Errore recupero token FCM Web:", e); }
            } else {
                statusText.innerHTML = "<i class='fa-solid fa-xmark'></i> Devi attivarle dalle Impostazioni del browser.";
                statusText.style.color = "var(--danger)";
            }
        } catch (error) {
            statusText.innerHTML = "<i class='fa-solid fa-xmark'></i> Errore durante la richiesta.";
            statusText.style.color = "var(--danger)";
        }
    }
};

window.disattivaNotifiche = async () => {
    if (!confirm("Vuoi disattivare le notifiche e scollegare questo dispositivo?")) return;
    const statusText = document.getElementById('notif-status-text');
    statusText.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Disattivazione in corso...";
    
    try {
        if (auth.currentUser) await setDoc(doc(db, "utenti", auth.currentUser.uid), { fcm_token: null, device_type: null }, { merge: true });
        const isWeb = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
        if (isWeb) {
            try { const messaging = getMessaging(app); await deleteToken(messaging); } 
            catch (e) { console.warn("Service worker non presente", e); }
        }

        statusText.innerHTML = "<i class='fa-solid fa-bell-slash'></i> Notifiche disattivate";
        statusText.style.color = "var(--text-muted)";
        document.getElementById('btn-disattiva-notifiche').style.display = 'none';
        document.getElementById('btn-attiva-notifiche').style.display = 'flex';
        document.getElementById('notif-preferences-section').style.display = 'none';
        
    } catch (error) {
        statusText.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore disattivazione";
        statusText.style.color = "var(--danger)";
    }
};

window.salvaPreferenzeNotifiche = async () => {
    if (!auth.currentUser) return;
    const mansioniSelezionate = Array.from(document.querySelectorAll('.pref-mansione:checked')).map(cb => cb.value);
    const preferenze_notifiche = {
        promemoria: document.getElementById('pref-notif-promemoria').checked,
        dds: document.getElementById('pref-notif-dds').checked,
        bacheca_utility: document.getElementById('pref-notif-utility').checked,
        richieste_rotazioni: document.getElementById('pref-notif-rotazioni').checked,
        segnalazioni: document.getElementById('pref-notif-segnalazioni').checked,
        mansioni_turni: mansioniSelezionate
    };
    try { await setDoc(doc(db, "utenti", auth.currentUser.uid), { preferenze_notifiche: preferenze_notifiche }, { merge: true }); } 
    catch (error) { console.error("Errore salvataggio preferenze notifiche:", error); }
};

// ============================================================================
// GESTIONE LAYOUT GRAFICA SEMPLIFICATA E FISSATA
// ============================================================================
window.LayoutEngine = {
    prefs: { c1: "#a9dfcd", c2: "#ffffff", c3: "#a4c5e3", theme: "system" },
    init: function(firebasePrefsStr) {
        let localStr = localStorage.getItem('preferenze_layout_haze');
        let targetStr = firebasePrefsStr || localStr;
        if (targetStr) {
            try { 
                let parsed = JSON.parse(targetStr);
                if (parsed.c1) this.prefs.c1 = parsed.c1;
                if (parsed.c2) this.prefs.c2 = parsed.c2;
                if (parsed.c3) this.prefs.c3 = parsed.c3;
                if (parsed.theme) this.prefs.theme = parsed.theme;
            } catch(e) {}
        }
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if(this.prefs.theme === 'system') this.applicaGrafica();
        });

        this.applicaGrafica();
        this.popolaModaleImpostazioni();
        this.render();
    },
    isDarkMode: function() {
        if (this.prefs.theme === 'dark') return true;
        if (this.prefs.theme === 'light') return false;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    applicaGrafica: function() {
        const themePref = this.prefs.theme || 'system';
        if(themePref !== 'system') {
            document.documentElement.setAttribute('data-theme', themePref);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        let isDark = this.isDarkMode();
        let actualC1 = isDark ? "#1a1a1a" : this.prefs.c1;
        let actualC2 = isDark ? "#2d2d2d" : this.prefs.c2;
        let actualC3 = isDark ? "#1a1a1a" : this.prefs.c3;

        const c1 = encodeURIComponent(actualC1); 
        const c2 = encodeURIComponent(actualC2); 
        const c3 = encodeURIComponent(actualC3);
        
        const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Crect width='100' height='100' fill='${c3}'/%3E%3Cpath d='M0,60 C35,90 65,30 100,60 L100,0 L0,0 Z' fill='${c2}'/%3E%3Cpath d='M0,45 C35,65 65,25 100,45 L100,0 L0,0 Z' fill='${c1}'/%3E%3C/svg%3E`;
        document.body.style.backgroundImage = `url("${svg}")`;
        document.documentElement.style.setProperty('--label-size', '14px');
        document.getElementById('app-container').className = 'app-grid';
    },
    popolaModaleImpostazioni: function() {
        document.getElementById('set-col1').value = this.prefs.c1;
        document.getElementById('set-col2').value = this.prefs.c2;
        document.getElementById('set-col3').value = this.prefs.c3;
        document.getElementById('set-theme').value = this.prefs.theme || 'system';
    },
    render: function() {
        const container = document.getElementById('app-container');
        container.innerHTML = '';
        
        DEFAULT_APPS.forEach((app, index) => {
            if (app.condition === 'admin' && !globalIsAdmin) return;
            if (app.condition === 'collab' && !(globalIsAdmin || globalIsCollab)) return;
            
            const finalColor = app.defaultColor || "#0066cc";
            const isLink = app.href ? `href="${app.href}"` : `onclick="${app.onclick}"`;
            
            let iconStyle = `background-color: ${finalColor};`;
            let iconContent = `<i class="${app.icon || 'fa-solid fa-link'}"></i>`;
            let animDelay = `${index * 0.04}s`;
            
            container.innerHTML += `
                <a ${isLink} class="app-btn" id="btn-${app.id}" style="animation-delay: ${animDelay}">
                    <div class="app-icon" style="${iconStyle}">${iconContent}</div>
                    <div class="app-label">${app.label.replace(/\n/g, '<br>')}</div>
                </a>`;
        });

        setTimeout(() => {
            if(window.controllaRichiesteSospese) window.controllaRichiesteSospese();
            if(window.controllaPromemoria) window.controllaPromemoria();
            if(window.controllaSegnalazioni) window.controllaSegnalazioni();
            if(window.controllaBacheca) window.controllaBacheca();
        }, 200);
    },
    salvaPreferenzeGlobali: function() {
        this.prefs.c1 = document.getElementById('set-col1').value; 
        this.prefs.c2 = document.getElementById('set-col2').value; 
        this.prefs.c3 = document.getElementById('set-col3').value;
        this.prefs.theme = document.getElementById('set-theme').value; 
        
        this.applicaGrafica(); 
        this.render(); 
        window.chiudiModal('settingsModal'); 
        this.sincronizzaConFirebase();
    },
    sincronizzaConFirebase: async function() {
        const str = JSON.stringify(this.prefs); 
        localStorage.setItem('preferenze_layout_haze', str);
        if (auth.currentUser) await setDoc(doc(db, "utenti", auth.currentUser.uid), { preferenze_layout: str }, { merge: true });
    },
    ripristinaPredefiniti: async function() { 
        if(!confirm("Vuoi ripristinare i colori originali?")) return; 
        localStorage.removeItem('preferenze_layout_haze'); 
        if (auth.currentUser) await setDoc(doc(db, "utenti", auth.currentUser.uid), { preferenze_layout: null }, { merge: true }); 
        location.reload(); 
    }
};

window.apriModal = (id, authMode) => { document.getElementById(id).style.display = 'flex'; if(id === 'authModal' && authMode) { currentAuthMode = authMode; window.aggiornaUIAuth(); } };
window.chiudiModal = (id) => { document.getElementById(id).style.display = 'none'; };
window.chiudiSuSfondo = (e, id) => { if (e.target.id === id) window.chiudiModal(id); };

window.apriGestioneAccessi = async () => {
    window.apriModal('modal-gestione');
    const container = document.getElementById('lista-utenti-accessi');
    const bTot = document.getElementById('badge-totali'); 
    const bOggi = document.getElementById('badge-oggi');
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Attendere...</div>`;
    
    try {
        const snap = await getDocs(collection(db, "utenti")); 
        let tot = 0; let oggi = 0; 
        const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
        const oggiStr = formatterDate.format(new Date());
        
        window.utentiArrayCache = []; window.utentiMap = {};

        snap.forEach(d => {
            const u = d.data(); tot++; const isOggi = (u.last_app_access === oggiStr); if (isOggi) oggi++;
            u.uid = d.id;
            window.utentiMap[d.id] = u;
            window.utentiArrayCache.push(u);
        });
        
        bTot.innerText = tot; bOggi.innerText = oggi;
        window.renderGestioneAccessi();

    } catch(e) { container.innerHTML = "<div style='color:var(--danger); text-align:center;'><i class='fa-solid fa-triangle-exclamation'></i> Errore.</div>"; }
};

window.renderGestioneAccessi = () => {
    const container = document.getElementById('lista-utenti-accessi');
    const sortMode = document.getElementById('sort-utenti-app') ? document.getElementById('sort-utenti-app').value : 'recente';
    const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
    const oggiStr = formatterDate.format(new Date());
    
    let dataCopy = [...window.utentiArrayCache];

    const sortAlpha = (a, b) => {
        let cognomeA = (a.cognome || '').trim().toUpperCase(); let cognomeB = (b.cognome || '').trim().toUpperCase();
        if (cognomeA < cognomeB) return -1; if (cognomeA > cognomeB) return 1;
        let nomeA = (a.nome || '').trim().toUpperCase(); let nomeB = (b.nome || '').trim().toUpperCase();
        if (nomeA < nomeB) return -1; if (nomeA > nomeB) return 1;
        return 0;
    };

    if (sortMode === 'alfabetico') { dataCopy.sort(sortAlpha); } 
    else {
        dataCopy.sort((a, b) => {
            let dateA = a.last_access_full || a.last_app_access || '1970-01-01';
            let dateB = b.last_access_full || b.last_app_access || '1970-01-01';
            if (dateA > dateB) return -1; if (dateA < dateB) return 1;
            return sortAlpha(a, b);
        });
    }

    const buildRiga = (u) => {
        const isOggi = (u.last_app_access === oggiStr); const isBanned = u.app_banned === true; 
        const fullName = `${u.cognome || ''} ${u.nome || ''} ${u.progressivo || ''}`.trim() || 'Sconosciuto';
        const dot = isOggi ? `<span style="display:inline-block; width:8px; height:8px; background:var(--success); border-radius:50%; margin-left:8px; box-shadow: 0 0 5px rgba(15,157,88,0.5);"></span>` : '';
        const clickableName = `<span style="font-weight:700; font-size:14px; cursor:pointer; color:var(--primary); text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'" onclick="window.apriDettaglioUtente('${u.uid}')">${fullName}</span>`;
        const searchData = `${u.cognome || ''} ${u.nome || ''} ${u.matricola || ''}`.toUpperCase();
        
        let accessDisplay = 'Mai';
        if (u.last_access_full) {
            let d = new Date(u.last_access_full);
            accessDisplay = d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
        } else if (u.last_app_access) {
            let p = u.last_app_access.split('-');
            if(p.length === 3) accessDisplay = `${p[2]}/${p[1]}/${p[0]}`; else accessDisplay = u.last_app_access;
        }
        
        return `<div class="utente-row-app" data-search="${searchData}" style="display:flex; justify-content:space-between; align-items:center; background:${isBanned ? 'var(--danger-light)' : 'var(--surface-hover)'}; padding:14px; border-radius:12px; margin-bottom:12px; border:1px solid ${isBanned ? 'var(--danger-border)' : 'var(--border-color)'}; box-shadow:var(--shadow-sm); transition: transform 0.2s;"><div><div style="display:flex; align-items:center;">${clickableName}${dot}</div><div style="font-size:12px; color:var(--text-muted); margin-top:4px;"><i class="fa-regular fa-id-badge"></i> ${u.matricola || '??'} • <i class="fa-regular fa-clock"></i> ${accessDisplay}</div></div><button style="border:1px solid ${isBanned ? 'var(--success)' : 'var(--danger)'}; color:${isBanned ? 'var(--success)' : 'var(--danger)'}; background:var(--surface); padding:8px 12px; border-radius:10px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:13px; transition:all 0.2s;" onmouseover="this.style.background='${isBanned ? 'var(--success)' : 'var(--danger)'}'; this.style.color='white';" onmouseout="this.style.background='var(--surface)'; this.style.color='${isBanned ? 'var(--success)' : 'var(--danger)'}';" onclick="window.toggleAppBan('${u.uid}', ${!isBanned})">${isBanned ? '<i class="fa-solid fa-unlock"></i> Sblocca' : '<i class="fa-solid fa-ban"></i> Blocca'}</button></div>`;
    };

    let html = dataCopy.map(u => buildRiga(u)).join('');
    container.innerHTML = html;
    window.filtraUtentiApp();
};

window.filtraUtentiApp = () => {
    let input = document.getElementById('search-utenti-app');
    let filter = input.value.toUpperCase();
    let rows = document.getElementsByClassName('utente-row-app');
    for (let i = 0; i < rows.length; i++) {
        let txtValue = rows[i].getAttribute('data-search');
        if (txtValue.indexOf(filter) > -1) rows[i].style.display = "flex";
        else rows[i].style.display = "none";
    }
};

window.toggleAppBan = async (uid, status) => { if(confirm("Confermi l'azione?")) { await setDoc(doc(db, "utenti", uid), { app_banned: status }, { merge: true }); window.apriGestioneAccessi(); } };

window.apriDettaglioUtente = (uid) => {
    const u = window.utentiMap[uid]; if(!u) return;
    const isCollab = u.ruolo === 'collaborator';
    document.getElementById('dettaglio-utente-body').innerHTML = `
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-user" style="color:var(--primary); width:16px;"></i> <strong>Nome:</strong> ${u.nome || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-regular fa-user" style="color:var(--primary); width:16px;"></i> <strong>Cognome:</strong> ${u.cognome || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-hashtag" style="color:var(--primary); width:16px;"></i> <strong>Matricola:</strong> ${u.matricola || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-tag" style="color:var(--primary); width:16px;"></i> <strong>Omonimia:</strong> ${u.progressivo || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-envelope" style="color:var(--primary); width:16px;"></i> <strong>Email:</strong> ${u.email || 'Non registrata'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-phone" style="color:var(--primary); width:16px;"></i> <strong>Telefono:</strong> ${u.telefono || 'Non registrato'}</div>
        <div style="margin-bottom:5px; font-size:12px; color:var(--text-muted); word-break: break-all; margin-top:20px; border-top:1px solid var(--border-color); padding-top:10px;"><i class="fa-solid fa-fingerprint"></i> <strong>ID Account:</strong> ${u.uid || '-'}</div>`;
    const btnCollab = document.getElementById('btn-rendi-collab');
    if (isCollab) { btnCollab.innerHTML = "<i class='fa-solid fa-user-minus'></i> Revoca Collaboratore"; btnCollab.style.background = "transparent"; btnCollab.style.color = "var(--danger)"; btnCollab.style.border = "2px solid var(--danger)"; btnCollab.onclick = () => window.cambiaRuoloUtente(uid, 'user'); }
    else { btnCollab.innerHTML = "<i class='fa-solid fa-user-shield'></i> Rendi Collaboratore"; btnCollab.style.background = "#6f42c1"; btnCollab.style.color = "white"; btnCollab.style.border = "none"; btnCollab.onclick = () => window.cambiaRuoloUtente(uid, 'collaborator'); }
    
    document.getElementById('dettaglio-utente-body').insertAdjacentHTML('beforeend', `<button class="btn-modal" style="background: #ff9800; color: white; margin-top:15px; margin-bottom:5px;" onclick="window.apriEditorAdminUtente('${uid}')"><i class="fa-solid fa-pen"></i> Correggi Dati Utente</button>`);
    
    window.apriModal('modal-dettaglio-utente');
};

window.apriEditorAdminUtente = (uid) => {
    const u = window.utentiMap[uid]; if(!u) return;
    document.getElementById('dettaglio-utente-body').innerHTML = `
        <div class="float-wrapper"><input type="text" id="adm-edit-nome" class="input-field" value="${u.nome || ''}"><label style="top:12px; font-size:11px; color:var(--primary); font-weight:700;">Nome</label></div>
        <div class="float-wrapper"><input type="text" id="adm-edit-cognome" class="input-field" value="${u.cognome || ''}"><label style="top:12px; font-size:11px; color:var(--primary); font-weight:700;">Cognome</label></div>
        <div class="float-wrapper"><input type="text" id="adm-edit-matricola" class="input-field" value="${u.matricola || ''}"><label style="top:12px; font-size:11px; color:var(--primary); font-weight:700;">Matricola</label></div>
        <div class="float-wrapper"><input type="text" id="adm-edit-prog" class="input-field" value="${u.progressivo || ''}"><label style="top:12px; font-size:11px; color:var(--primary); font-weight:700;">Omonimia</label></div>
        <div class="float-wrapper"><input type="text" id="adm-edit-tel" class="input-field" value="${u.telefono || ''}"><label style="top:12px; font-size:11px; color:var(--primary); font-weight:700;">Telefono</label></div>
        <button class="btn-modal" style="background: var(--success); color: white;" onclick="window.salvaEditorAdminUtente('${uid}')"><i class="fa-solid fa-floppy-disk"></i> Salva Dati Corretti</button>
    `;
};

window.salvaEditorAdminUtente = async (uid) => {
    if(!confirm("Confermi la modifica dei dati di questo utente?")) return;
    const datiAggiornati = {
        nome: document.getElementById('adm-edit-nome').value.trim(),
        cognome: document.getElementById('adm-edit-cognome').value.trim(),
        matricola: document.getElementById('adm-edit-matricola').value.trim(),
        progressivo: document.getElementById('adm-edit-prog').value.trim(),
        telefono: document.getElementById('adm-edit-tel').value.trim()
    };
    try {
        await setDoc(doc(db, "utenti", uid), datiAggiornati, { merge: true });
        window.utentiMap[uid] = { ...window.utentiMap[uid], ...datiAggiornati };
        window.apriDettaglioUtente(uid);
        window.renderGestioneAccessi();
    } catch(e) { alert("Errore nel salvataggio su Firebase."); }
};

window.cambiaRuoloUtente = async (uid, nuovoRuolo) => { if(!confirm("Sei sicuro?")) return; try { await setDoc(doc(db, "utenti", uid), { ruolo: nuovoRuolo }, { merge: true }); window.utentiMap[uid].ruolo = nuovoRuolo; window.chiudiModal('modal-dettaglio-utente'); alert("Ruolo aggiornato!"); } catch(e) { alert("Errore."); } };

onAuthStateChanged(auth, async (user) => {
    const vLoad = document.getElementById('view-loading'); const vGuest = document.getElementById('view-guest'); const vApp = document.getElementById('view-app'); const vBanned = document.getElementById('view-banned');
    
    if (user) {
        vLoad.style.display = 'none';
        vGuest.style.display = 'none';
        vApp.style.display = 'flex';
        vBanned.style.display = 'none';
        document.getElementById('btnOpenLogin').style.display = 'none'; 
        document.getElementById('btnOpenProfile').style.display = 'flex';
        document.getElementById('profileEmail').value = user.email;

        let cachedData = {};
        try { cachedData = JSON.parse(localStorage.getItem('userDataCache_haze')) || {}; } catch(e) {}
        window.currentUserData = cachedData;
        
        globalIsAdmin = (user.uid === ADMIN_UID); 
        globalIsCollab = cachedData.ruolo === 'collaborator';
        if(globalIsAdmin) { document.getElementById('adminBadge').style.display = 'block'; document.getElementById('menu-admin').style.display = 'flex'; }

        window.LayoutEngine.init();

        try {
            const docSnap = await getDoc(doc(db, "utenti", user.uid)); 
            let data = docSnap.exists() ? docSnap.data() : {};
            let safeData = { ...cachedData, ...data };
            
            if (docSnap.exists()) { localStorage.setItem('userDataCache_haze', JSON.stringify(safeData)); }
            window.currentUserData = safeData; 
            
            if (safeData.app_banned === true) { 
                document.body.style.backgroundImage = 'none'; document.body.style.backgroundColor = "var(--bg-color)"; 
                vApp.style.display = 'none'; vBanned.style.display = 'flex'; 
                return; 
            }
            
            if (!safeData.nome || !safeData.cognome || !safeData.matricola) {
                document.getElementById('modal-dati-obbligatori').style.display = 'flex';
            }
            
            globalIsCollab = safeData.ruolo === 'collaborator';
            
            const oggiLog = new Date();
            const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
            const oggiLogStr = formatterDate.format(oggiLog);
            
            if (safeData.last_app_access !== oggiLogStr || !safeData.email) { 
                setDoc(doc(db, "utenti", user.uid), { last_app_access: oggiLogStr, last_access_full: oggiLog.toISOString(), email: user.email }, { merge: true }); 
            }
            
            if (safeData.preferenze_layout && safeData.preferenze_layout !== localStorage.getItem('preferenze_layout_haze')) {
                window.LayoutEngine.init(safeData.preferenze_layout);
            }
            
            if(window.inizializzaNotificheSeNativa) window.inizializzaNotificheSeNativa(safeData);

            document.getElementById('profileNome').value = safeData.nome || ''; 
            document.getElementById('profileCognome').value = safeData.cognome || '';
            document.getElementById('profileMatricola').value = safeData.matricola || ''; 
            document.getElementById('profileProgressivo').value = safeData.progressivo || '';
            document.getElementById('profileSoprannome').value = safeData.soprannome || '';
            document.getElementById('profileTelefono').value = safeData.telefono || '';
            document.getElementById('profileMansione').value = safeData.mansione || '';
            
        } catch(e) { console.error("Errore aggiornamento dati in background:", e); }
    } else { 
        vLoad.style.display = 'none'; window.LayoutEngine.init(); vGuest.style.display = 'flex'; vApp.style.display = 'none'; vBanned.style.display = 'none'; 
    }
});

let deferredPrompt;
const installBtn = document.getElementById('install-btn');
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

if (!isStandalone) {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if(installBtn) installBtn.style.display = 'flex';
    });

    if(installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt !== null) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') { deferredPrompt = null; installBtn.style.display = 'none'; }
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        if(installBtn) installBtn.style.display = 'none';
        deferredPrompt = null;
    });
} else {
    if(installBtn) installBtn.style.display = 'none';
}
