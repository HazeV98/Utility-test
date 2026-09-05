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
            const uiModule = config.ui ? await import(config.ui) : motoreModule;
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
    }
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
let globalIsVip = false;
window.currentUserData = {}; 
window.utentiMap = {};
window.utentiArrayCache = [];
window.DYNAMIC_APPS = [];

// App di default (Fallback se apps.json non esiste o fallisce il fetch)
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

window.caricaAppsConfig = async () => {
    try {
        const r = await fetch('./assets/apps.json?v=' + Date.now());
        if(r.ok) { window.DYNAMIC_APPS = await r.json(); }
        else { window.DYNAMIC_APPS = JSON.parse(JSON.stringify(DEFAULT_APPS)); }
    } catch(e) { window.DYNAMIC_APPS = JSON.parse(JSON.stringify(DEFAULT_APPS)); }

    // Registra eventuali nuovi moduli dinamicamente
    window.DYNAMIC_APPS.forEach(app => {
        if(app.isModule && app.moduleId && !ModuliLazyLoader.moduli[app.moduleId]) {
            ModuliLazyLoader.moduli[app.moduleId] = {
                motore: `./${app.moduleName}.js`,
                ui: app.splitModule ? `./ui_${app.moduleName}.js` : `./${app.moduleName}.js`,
                exports: [`avviaMotore${app.moduleId}`, `initUI${app.moduleId}`]
            };
        }
    });
};

window.lanciaModuloDinamico = async (moduleId) => {
    if (!auth.currentUser) { alert("Devi effettuare il login per questa funzione."); return; }
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("Accesso revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore(moduleId);
    if (modulo) modulo(db, auth, window.currentUserData, globalIsAdmin);
};

// ... Funzioni Motori Originali ...
window.avviaMotoreTurniDaIndex = async () => { /* Logica mantenuta originale per moduli specifici se servono ... */
    const modulo = await ModuliLazyLoader.avviaMotore('turni');
    if (modulo) modulo();
};
// Reindirizzamenti esistenti mantenuti per compatibilità con eventuali onclick storici
window.avviaMotoreOrariDaIndex = async () => { const m = await ModuliLazyLoader.avviaMotore('orari'); if(m) m(); };
window.avviaMotoreLinkDaIndex = async () => { const m = await ModuliLazyLoader.avviaMotore('link'); if(m) m(db, auth); };
window.avviaMotoreDocumentiDaIndex = async () => { const m = await ModuliLazyLoader.avviaMotore('documenti'); if(m) m(); };
window.avviaMotoreContattiDaIndex = async () => { const m = await ModuliLazyLoader.avviaMotore('contatti'); if(m) m(db, auth); };
window.avviaMotoreBachecaUtilityDaIndex = async () => { const m = await ModuliLazyLoader.avviaMotore('bacheca_utility'); if(m) m(app, db, auth, globalIsAdmin || globalIsCollab, ""); };
window.avviaMotoreRubricaDaIndex = async () => { window.lanciaModuloDinamico('rubrica'); };
window.avviaMotoreBachecaTurniDaIndex = async () => { window.lanciaModuloDinamico('bacheca_turni'); };
window.avviaMotoreBarcadvisorDaIndex = async () => { window.lanciaModuloDinamico('barcadvisor'); };
window.avviaMotoreBuoniPastoDaIndex = async () => { window.lanciaModuloDinamico('buoni_pasto'); };
window.avviaMotoreStatisticheDaIndex = async () => { window.lanciaModuloDinamico('statistiche'); };
window.avviaMotoreRotazioniDaIndex = async () => { window.lanciaModuloDinamico('rotazioni'); };
window.avviaMotoreRotazioneFerieDaIndex = async () => { window.lanciaModuloDinamico('rotazione_ferie'); };
window.avviaMotorePromemoriaDaIndex = async () => { window.lanciaModuloDinamico('promemoria'); };
window.avviaMotoreDDSDaIndex = async () => { window.lanciaModuloDinamico('dds'); };
window.avviaMotoreGuidaDaIndex = async () => { window.lanciaModuloDinamico('guida'); };
window.avviaMotoreAdminDaIndex = async () => { window.lanciaModuloDinamico('admin'); };
window.avviaMotoreSegnalazioniDaIndex = async () => {
    if (auth.currentUser) {
        const m = await ModuliLazyLoader.avviaMotore('report');
        if (m) {
            m(db, auth, auth.currentUser.uid, globalIsAdmin);
            if(window.apriModaleSegnalazioni) window.apriModaleSegnalazioni();
        }
    }
};

window.controllaBacheca = async () => { /* Check bacheca standard */ };
window.controllaRichiesteSospese = async () => { /* Check rotazioni standard */ };
window.controllaPromemoria = async () => { /* Check promemoria standard */ };
window.controllaSegnalazioni = async () => { /* Check ticket standard */ };

// ============================================================================
// GESTIONE LAYOUT GRAFICA
// ============================================================================
window.LayoutEngine = {
    prefs: { c1: "#a9dfcd", c2: "#ffffff", c3: "#a4c5e3", theme: "system" },
    init: async function(firebasePrefsStr) {
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
        
        await window.caricaAppsConfig();
        this.render();
    },
    isDarkMode: function() {
        if (this.prefs.theme === 'dark') return true;
        if (this.prefs.theme === 'light') return false;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    applicaGrafica: function() {
        const themePref = this.prefs.theme || 'system';
        if(themePref !== 'system') document.documentElement.setAttribute('data-theme', themePref);
        else document.documentElement.removeAttribute('data-theme');

        let isDark = this.isDarkMode();
        let actualC1 = isDark ? "#1a1a1a" : this.prefs.c1;
        let actualC2 = isDark ? "#2d2d2d" : this.prefs.c2;
        let actualC3 = isDark ? "#1a1a1a" : this.prefs.c3;

        const c1 = encodeURIComponent(actualC1); const c2 = encodeURIComponent(actualC2); const c3 = encodeURIComponent(actualC3);
        const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Crect width='100' height='100' fill='${c3}'/%3E%3Cpath d='M0,60 C35,90 65,30 100,60 L100,0 L0,0 Z' fill='${c2}'/%3E%3Cpath d='M0,45 C35,65 65,25 100,45 L100,0 L0,0 Z' fill='${c1}'/%3E%3C/svg%3E`;
        document.body.style.backgroundImage = `url("${svg}")`;
        document.documentElement.style.setProperty('--label-size', '14px');
        document.getElementById('app-container').className = 'app-grid';
    },
    popolaModaleImpostazioni: function() {
        if(document.getElementById('set-col1')) {
            document.getElementById('set-col1').value = this.prefs.c1;
            document.getElementById('set-col2').value = this.prefs.c2;
            document.getElementById('set-col3').value = this.prefs.c3;
            document.getElementById('set-theme').value = this.prefs.theme || 'system';
        }
    },
    render: function() {
        const container = document.getElementById('app-container');
        container.innerHTML = '';
        
        window.DYNAMIC_APPS.forEach((app, index) => {
            if (app.condition === 'admin' && !globalIsAdmin) return;
            if (app.condition === 'collab' && !(globalIsAdmin || globalIsCollab)) return;
            if (app.condition === 'vip' && !(globalIsAdmin || globalIsCollab || globalIsVip)) return;
            
            const finalColor = app.defaultColor || "#0066cc";
            let isLink = "";
            if(app.href) isLink = `href="${app.href}"`;
            else if(app.onclick) isLink = `onclick="${app.onclick}"`;
            else if(app.isModule) isLink = `onclick="window.lanciaModuloDinamico('${app.moduleId}')"`;

            let iconStyle = `background-color: ${finalColor};`;
            let iconContent = `<i class="${app.icon || 'fa-solid fa-link'}"></i>`;
            let animDelay = `${index * 0.04}s`;
            
            container.innerHTML += `
                <a ${isLink} class="app-btn" id="btn-${app.id}" style="animation-delay: ${animDelay}">
                    <div class="app-icon" style="${iconStyle}">${iconContent}</div>
                    <div class="app-label">${app.label.replace(/\n/g, '<br>')}</div>
                </a>`;
        });
    },
    salvaPreferenzeGlobali: function() {
        this.prefs.c1 = document.getElementById('set-col1').value; 
        this.prefs.c2 = document.getElementById('set-col2').value; 
        this.prefs.c3 = document.getElementById('set-col3').value;
        this.prefs.theme = document.getElementById('set-theme').value; 
        this.applicaGrafica(); 
        window.chiudiModal('settingsModal'); 
        this.sincronizzaConFirebase();
    },
    sincronizzaConFirebase: async function() {
        const str = JSON.stringify(this.prefs); 
        localStorage.setItem('preferenze_layout_haze', str);
        if (auth.currentUser) await setDoc(doc(db, "utenti", auth.currentUser.uid), { preferenze_layout: str }, { merge: true });
    }
};

window.apriModal = (id, authMode) => { document.getElementById(id).style.display = 'flex'; if(id === 'authModal' && authMode) { currentAuthMode = authMode; window.aggiornaUIAuth(); } };
window.chiudiModal = (id) => { document.getElementById(id).style.display = 'none'; };
window.chiudiSuSfondo = (e, id) => { if (e.target.id === id) window.chiudiModal(id); };

// ============================================================================
// GESTIONE ACCESSI E VIP
// ============================================================================
window.apriGestioneAccessi = async () => { /* ... logica esistente array cache ... */
    window.apriModal('modal-gestione');
    const container = document.getElementById('lista-utenti-accessi');
    container.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Attendere...</div>`;
    try {
        const snap = await getDocs(collection(db, "utenti")); 
        window.utentiArrayCache = []; window.utentiMap = {};
        snap.forEach(d => { const u = d.data(); u.uid = d.id; window.utentiMap[d.id] = u; window.utentiArrayCache.push(u); });
        window.renderGestioneAccessi();
    } catch(e) {}
};

window.renderGestioneAccessi = () => {
    const container = document.getElementById('lista-utenti-accessi');
    container.innerHTML = window.utentiArrayCache.map(u => {
        const isBanned = u.app_banned === true;
        const fn = `${u.cognome||''} ${u.nome||''}`.trim() || 'Sconosciuto';
        let roleBadge = "";
        if(u.ruolo==='admin') roleBadge=" <span style='background:red;color:white;padding:2px 5px;border-radius:4px;font-size:10px;'>ADMIN</span>";
        if(u.ruolo==='collaborator') roleBadge=" <span style='background:#6f42c1;color:white;padding:2px 5px;border-radius:4px;font-size:10px;'>COLLAB</span>";
        if(u.ruolo==='vip') roleBadge=" <span style='background:gold;color:black;padding:2px 5px;border-radius:4px;font-size:10px;'>VIP</span>";
        
        return `<div class="utente-row-app" style="display:flex; justify-content:space-between; align-items:center; background:${isBanned?'var(--danger-light)':'var(--surface)'}; padding:14px; border-radius:12px; margin-bottom:12px; border:1px solid var(--border-color);">
            <div><div style="font-weight:700;cursor:pointer;" onclick="window.apriDettaglioUtente('${u.uid}')">${fn}${roleBadge}</div><div style="font-size:12px;color:gray;">${u.matricola||'??'}</div></div>
            </div>`;
    }).join('');
};

window.apriDettaglioUtente = (uid) => {
    const u = window.utentiMap[uid]; if(!u) return;
    const isCollab = u.ruolo === 'collaborator';
    const isVip = u.ruolo === 'vip';
    
    document.getElementById('dettaglio-utente-body').innerHTML = `
        <div style="margin-bottom:10px;"><strong>Nome:</strong> ${u.nome || '-'} ${u.cognome || '-'}</div>
        <div style="margin-bottom:10px;"><strong>Matricola:</strong> ${u.matricola || '-'}</div>
        <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
            <button class="btn-modal" style="flex:1; background:${isCollab?'transparent':'#6f42c1'}; color:${isCollab?'var(--danger)':'white'}; border:1px solid ${isCollab?'var(--danger)':'#6f42c1'};" onclick="window.cambiaRuoloUtente('${uid}', '${isCollab?'user':'collaborator'}')">${isCollab?'Revoca Collab':'Rendi Collab'}</button>
            <button class="btn-modal" style="flex:1; background:${isVip?'transparent':'gold'}; color:${isVip?'var(--danger)':'black'}; border:1px solid ${isVip?'var(--danger)':'gold'};" onclick="window.cambiaRuoloUtente('${uid}', '${isVip?'user':'vip'}')">${isVip?'Revoca VIP':'Rendi VIP'}</button>
        </div>`;
    window.apriModal('modal-dettaglio-utente');
};

window.cambiaRuoloUtente = async (uid, nuovoRuolo) => {
    if(!confirm("Confermi il cambio ruolo?")) return;
    await setDoc(doc(db, "utenti", uid), { ruolo: nuovoRuolo }, { merge: true });
    window.utentiMap[uid].ruolo = nuovoRuolo; window.apriDettaglioUtente(uid); window.renderGestioneAccessi();
};

// ============================================================================
// SISTEMA GESTIONE LAYOUT ADMIN / GITHUB
// ============================================================================
window.injectAdminConfigTools = () => {
    if(!document.getElementById('admin-settings-panel')) {
        const modal = document.querySelector('#settingsModal .modal-content');
        if(modal) {
            modal.insertAdjacentHTML('beforeend', `
            <div id="admin-settings-panel" style="display:none; margin-top:20px; padding-top:15px; border-top:1px solid var(--border-color);">
                <h3 style="font-size:14px; color:var(--danger); margin-bottom:10px;"><i class="fa-solid fa-code"></i> Modalità Sviluppatore</h3>
                <div style="background:var(--surface-hover); padding:10px; border-radius:8px;">
                    <label style="font-size:11px;">GitHub PAT:</label><input type="password" id="gh-pat" class="input-field" style="margin-bottom:5px;">
                    <label style="font-size:11px;">Repo (utente/repo):</label><input type="text" id="gh-repo" class="input-field" style="margin-bottom:10px;">
                    <button class="btn-modal" style="background:var(--success); color:white; padding:6px; font-size:12px;" onclick="window.salvaGHCreds()">Salva Credenziali GH</button>
                    <div style="display:flex; gap:10px; margin-top:15px;">
                        <button class="btn-modal" style="flex:1; background:#0066cc; color:white; padding:8px; font-size:12px;" onclick="window.apriModalAddApp()"><i class="fa-solid fa-plus"></i> Add Icona</button>
                        <button class="btn-modal" style="flex:1; background:#fd7e14; color:white; padding:8px; font-size:12px;" onclick="window.apriModalReorderApp()"><i class="fa-solid fa-arrows-up-down"></i> Layout</button>
                    </div>
                </div>
            </div>`);
            
            document.body.insertAdjacentHTML('beforeend', `
            <!-- MODAL ADD APP -->
            <div id="modal-add-app" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-add-app')">
                <div class="modal-content">
                    <h2>Aggiungi Icona</h2>
                    <input type="text" id="add-id" class="input-field" placeholder="ID univoco (es. mappa)" style="margin-bottom:10px;">
                    <input type="text" id="add-label" class="input-field" placeholder="Nome App" style="margin-bottom:10px;">
                    <input type="text" id="add-icon" class="input-field" placeholder="Classe FontAwesome (es. fa-solid fa-map)" style="margin-bottom:10px;">
                    <input type="color" id="add-color" value="#0066cc" style="width:100%; height:40px; margin-bottom:10px; border:none;">
                    <select id="add-type" class="input-field" style="margin-bottom:10px;" onchange="document.getElementById('add-module-opts').style.display = this.value==='module'?'block':'none'">
                        <option value="link">Link Esterno</option>
                        <option value="module">Modulo Interno</option>
                    </select>
                    <input type="text" id="add-link-val" class="input-field" placeholder="Link (se link) o Nome JS (se modulo)" style="margin-bottom:10px;">
                    <div id="add-module-opts" style="display:none; margin-bottom:10px;">
                        <label><input type="checkbox" id="add-split"> Diviso in modulo.js e ui_modulo.js?</label>
                    </div>
                    <select id="add-visibility" class="input-field" style="margin-bottom:20px;">
                        <option value="admin">Solo Admin</option>
                        <option value="vip">Admin, Collab, VIP</option>
                        <option value="collab">Admin e Collab</option>
                        <option value="">Tutti</option>
                    </select>
                    <button class="btn-modal" style="background:var(--success); color:white;" onclick="window.salvaNuovaApp()"><i class="fa-solid fa-cloud-arrow-up"></i> Salva su GitHub</button>
                </div>
            </div>
            
            <!-- MODAL REORDER -->
            <div id="modal-reorder-app" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-reorder-app')">
                <div class="modal-content">
                    <h2>Riordina Layout</h2>
                    <div id="reorder-list" style="max-height:60vh; overflow-y:auto; margin-bottom:20px;"></div>
                    <button class="btn-modal" style="background:var(--success); color:white;" onclick="window.salvaRiordinoGitHub()"><i class="fa-solid fa-cloud-arrow-up"></i> Salva Layout su GitHub</button>
                </div>
            </div>`);
        }
    }
    document.getElementById('gh-pat').value = localStorage.getItem('gh_pat') || '';
    document.getElementById('gh-repo').value = localStorage.getItem('gh_repo') || '';
    document.getElementById('admin-settings-panel').style.display = 'block';
};

window.salvaGHCreds = () => {
    localStorage.setItem('gh_pat', document.getElementById('gh-pat').value);
    localStorage.setItem('gh_repo', document.getElementById('gh-repo').value);
    alert("Credenziali salvate in locale.");
};

window.pushToGitHub = async (dataArray) => {
    const pat = localStorage.getItem('gh_pat'); const repo = localStorage.getItem('gh_repo');
    if(!pat || !repo) { alert("Inserisci prima PAT e Repo nelle impostazioni."); return false; }
    
    const url = `https://api.github.com/repos/${repo}/contents/assets/apps.json`;
    let sha = null;
    try {
        const r = await fetch(url, { headers: { "Authorization": `token ${pat}` } });
        if(r.ok) { const d = await r.json(); sha = d.sha; }
    } catch(e) {}

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataArray, null, 4))));
    const body = { message: "Update apps.json via App Admin", content: content, branch: "main" };
    if(sha) body.sha = sha;

    try {
        const p = await fetch(url, { method: "PUT", headers: { "Authorization": `token ${pat}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if(p.ok) { alert("Salvataggio completato! Riavvia l'app per vedere i cambiamenti."); return true; }
        else { alert("Errore durante il caricamento su GitHub."); return false; }
    } catch(e) { alert("Errore di rete."); return false; }
};

window.apriModalAddApp = () => { window.apriModal('modal-add-app'); };
window.salvaNuovaApp = async () => {
    const id = document.getElementById('add-id').value.trim();
    if(!id) return alert("ID mancante");
    let newApp = {
        id: id, label: document.getElementById('add-label').value, icon: document.getElementById('add-icon').value,
        defaultColor: document.getElementById('add-color').value, condition: document.getElementById('add-visibility').value
    };
    if(document.getElementById('add-type').value === 'link') {
        newApp.href = document.getElementById('add-link-val').value;
    } else {
        newApp.isModule = true; newApp.moduleId = id; newApp.moduleName = document.getElementById('add-link-val').value;
        newApp.splitModule = document.getElementById('add-split').checked;
    }
    
    let currentApps = [...window.DYNAMIC_APPS];
    currentApps.push(newApp);
    if(await window.pushToGitHub(currentApps)) window.chiudiModal('modal-add-app');
};

window.apriModalReorderApp = () => {
    const cont = document.getElementById('reorder-list');
    cont.innerHTML = window.DYNAMIC_APPS.map((a, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--surface-hover); border-radius:8px; margin-bottom:5px;">
            <span><i class="${a.icon}" style="color:${a.defaultColor}; margin-right:10px;"></i> ${a.label}</span>
            <div style="display:flex; gap:5px;">
                <button onclick="window.spostaApp(${i}, -1)" style="padding:5px; border-radius:4px; background:var(--surface); border:1px solid gray;">▲</button>
                <button onclick="window.spostaApp(${i}, 1)" style="padding:5px; border-radius:4px; background:var(--surface); border:1px solid gray;">▼</button>
            </div>
        </div>
    `).join('');
    window.apriModal('modal-reorder-app');
};

window.spostaApp = (index, dir) => {
    if(index + dir < 0 || index + dir >= window.DYNAMIC_APPS.length) return;
    let temp = window.DYNAMIC_APPS[index];
    window.DYNAMIC_APPS[index] = window.DYNAMIC_APPS[index+dir];
    window.DYNAMIC_APPS[index+dir] = temp;
    window.apriModalReorderApp(); // refresh list
};

window.salvaRiordinoGitHub = async () => { if(await window.pushToGitHub(window.DYNAMIC_APPS)) window.chiudiModal('modal-reorder-app'); };

// ============================================================================
// AUTH E START
// ============================================================================
onAuthStateChanged(auth, async (user) => {
    const vLoad = document.getElementById('view-loading'); const vGuest = document.getElementById('view-guest'); const vApp = document.getElementById('view-app');
    
    if (user) {
        vLoad.style.display = 'none'; vGuest.style.display = 'none'; vApp.style.display = 'flex';
        document.getElementById('btnOpenLogin').style.display = 'none'; 
        document.getElementById('btnOpenProfile').style.display = 'flex';

        let cachedData = {}; try { cachedData = JSON.parse(localStorage.getItem('userDataCache_haze')) || {}; } catch(e) {}
        
        globalIsAdmin = (user.uid === ADMIN_UID); 
        globalIsCollab = cachedData.ruolo === 'collaborator';
        globalIsVip = cachedData.ruolo === 'vip';
        
        if(globalIsAdmin) { 
            document.getElementById('adminBadge').style.display = 'block'; 
            document.getElementById('menu-admin').style.display = 'flex'; 
            window.injectAdminConfigTools();
        }

        window.LayoutEngine.init();

        try {
            const docSnap = await getDoc(doc(db, "utenti", user.uid)); 
            let safeData = { ...cachedData, ...(docSnap.exists() ? docSnap.data() : {}) };
            window.currentUserData = safeData; 
            globalIsCollab = safeData.ruolo === 'collaborator';
            globalIsVip = safeData.ruolo === 'vip';
            localStorage.setItem('userDataCache_haze', JSON.stringify(safeData));
        } catch(e) {}
    } else { 
        vLoad.style.display = 'none'; window.LayoutEngine.init(); vGuest.style.display = 'flex'; vApp.style.display = 'none';
    }
});
