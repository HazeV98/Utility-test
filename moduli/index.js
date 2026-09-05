import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { avviaMotoreAuth } from './auth.js';

// ============================================================================
// SISTEMA DI LAZY LOADING (Risoluzione automatica cartella "moduli")
// ============================================================================
const ModuliLazyLoader = {
    cache: new Map(),
    initializedUIs: new Set(),
    
    async caricaModulo(nomeModulo) {
        if (!nomeModulo) return null;
        if (this.cache.has(nomeModulo)) return this.cache.get(nomeModulo);
        
        try {
            let motoreModule;
            try { motoreModule = await import(`./moduli/${nomeModulo}.js`); } 
            catch(e1) { motoreModule = await import(`./${nomeModulo}.js`); }
            
            let uiModule = {};
            try { uiModule = await import(`./moduli/ui_${nomeModulo}.js`); } 
            catch(e2) {
                try { uiModule = await import(`./ui_${nomeModulo}.js`); } catch(e3) {}
            } 
            
            const esporta = { ...motoreModule, ...uiModule };
            this.cache.set(nomeModulo, esporta);
            
            const initFuncKey = Object.keys(esporta).find(k => k.startsWith('initUI'));
            if (initFuncKey && typeof esporta[initFuncKey] === 'function' && !this.initializedUIs.has(nomeModulo)) {
                try {
                    esporta[initFuncKey]();
                    this.initializedUIs.add(nomeModulo);
                } catch(err) { console.warn(`Errore durante initUI di ${nomeModulo}:`, err); }
            }
            return esporta;
        } catch (errore) {
            console.error(`✗ Errore caricamento modulo dinamico '${nomeModulo}':`, errore);
            alert(`Impossibile trovare il modulo: ${nomeModulo}. Assicurati che il file esista.`);
            return null;
        }
    },
    
    async avviaMotore(nomeModulo) {
        const modulo = await this.caricaModulo(nomeModulo);
        if (!modulo) return null;
        const motoreFuncKey = Object.keys(modulo).find(k => k.startsWith('avviaMotore'));
        return motoreFuncKey ? modulo[motoreFuncKey] : (modulo.default || modulo);
    }
};

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

window.caricaAppsConfig = async () => {
    try {
        const r = await fetch('./assets/apps.json?v=' + Date.now());
        if(r.ok) { window.DYNAMIC_APPS = await r.json(); }
        else { window.DYNAMIC_APPS = []; }
    } catch(e) { window.DYNAMIC_APPS = []; }
};

// ============================================================================
// ROUTER DINAMICO E LANCIATORI NATIVI (Basato su ID, immune a errori JSON)
// ============================================================================
window.eseguiAzioneApp = async (appId) => {
    const appConfig = window.DYNAMIC_APPS.find(a => a.id === appId);
    if (!appConfig) return;

    if (appConfig.href) {
        window.location.href = appConfig.href;
        return;
    }

    // 1. CONTROLLI DI SICUREZZA GLOBALI E SPECIFICI
    if (!auth.currentUser && appId !== 'orari') {
        alert("Devi effettuare il login per accedere a questa funzione."); 
        return;
    }
    if (window.currentUserData && window.currentUserData.app_banned) {
        alert("Accesso all'app revocato dal sistema."); 
        return; 
    }

    if (appId === 'turni') {
        if (window.currentUserData?.turni_banned) { alert("Accesso alla pagina Turni revocato."); return; }
        if (!window.currentUserData?.nome || !window.currentUserData?.matricola) {
            alert("Completa il profilo (Nome e Matricola) per visualizzare i turni.");
            window.apriModal('profileModal'); return;
        }
        // Tracking accessi ai turni
        const oggiStr = new Date().toISOString().split('T')[0];
        if (window.currentUserData && (window.currentUserData.turni_access !== true || window.currentUserData.last_turni_access !== oggiStr)) {
            setDoc(doc(db, "utenti", auth.currentUser.uid), { turni_access: true, last_turni_access: oggiStr }, { merge: true });
            window.currentUserData.turni_access = true; window.currentUserData.last_turni_access = oggiStr;
        }
    } else if (appId === 'link' && window.currentUserData?.link_banned) {
        alert("Accesso ai Link revocato."); return;
    } else if (appId === 'documenti' && window.currentUserData?.documenti_banned) {
        alert("Accesso ai Documenti revocato."); return;
    }

    // 2. ECCEZIONI NON-MODULARI
    if (appId === 'accessi') { return window.apriGestioneAccessi(); }

    // 3. CARICAMENTO LOGICA MODULO
    let moduleName = (appConfig.isModule && appConfig.moduleName) ? appConfig.moduleName : null;
    
    if (!moduleName) {
        const legacyMap = { 
            'statistiche':'statistiche', 'rotazioni':'rotazioni', 'turni':'turni', 
            'bachecaturni':'bacheca_turni', 'barcadvisor':'barcadvisor', 'rubrica':'rubrica', 
            'ferie':'rotazione_ferie', 'orari':'orari', 'documenti':'documenti', 'link':'link', 
            'contatti':'contatti', 'buoni':'buoni_pasto', 'promemoria':'promemoria', 
            'dds':'dds', 'report':'report', 'admin':'admin' 
        };
        moduleName = legacyMap[appId];
    }

    if (moduleName) {
        const fn = await ModuliLazyLoader.avviaMotore(moduleName);
        if (fn) await fn(db, auth, window.currentUserData, globalIsAdmin);
    }

    // 4. AUTO-APERTURA MODAL
    const legacyModals = { 
        'bachecaturni': 'modal-bachecaturni-main', 
        'buoni': 'modal-buoni-main', 
        'ferie': 'modal-rotazione-ferie-main', 
        'report': 'modal-segnalazioni-main' 
    };
    
    const modalId = legacyModals[appId] || `modal-${appId}-main`;
    const modale = document.getElementById(modalId);
    
    if (modale) modale.style.display = 'flex';
    else console.warn(`Interfaccia non trovata: nessun elemento HTML con id "${modalId}"`);
};

window.controllaBacheca = async () => {};
window.controllaRichiesteSospese = async () => {};
window.controllaPromemoria = async () => {};
window.controllaSegnalazioni = async () => {};

// ============================================================================
// GESTIONE LAYOUT GRAFICA - DOM NATIVO & EVENT DELEGATION
// ============================================================================
window.LayoutEngine = {
    prefs: { c1: "#a9dfcd", c2: "#ffffff", c3: "#a4c5e3", theme: "system" },
    _eventsBound: false,
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
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if(this.prefs.theme === 'system') this.applicaGrafica();
        });

        this.applicaGrafica();
        this.popolaModaleImpostazioni();
        
        if (!this._eventsBound) {
            const gridContainer = document.getElementById('app-container');
            if (gridContainer) {
                gridContainer.addEventListener('click', (e) => {
                    const card = e.target.closest('.app-btn');
                    if (card && card.dataset.id) {
                        window.eseguiAzioneApp(card.dataset.id);
                    }
                });
                this._eventsBound = true;
            }
        }
        
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
            const cond = app.conditions || [app.condition].filter(Boolean);
            const isVisibleByCond = () => {
                if(globalIsAdmin) return true;
                if(!cond || cond.length === 0) return true; 
                if(cond.includes('vip') && (globalIsVip || globalIsCollab)) return true;
                if(cond.includes('collab') && globalIsCollab) return true;
                if(cond.includes('tutti')) return true;
                return false;
            };

            if(!isVisibleByCond() && !globalIsAdmin) return;
            
            const finalColor = app.defaultColor || "#0066cc";
            
            const btn = document.createElement('div');
            btn.className = 'app-btn';
            btn.dataset.id = app.id;
            btn.style.animationDelay = `${index * 0.04}s`;
            btn.style.cursor = 'pointer';
            
            btn.innerHTML = `
                <div class="app-icon" style="background-color: ${finalColor};"><i class="${app.icon || 'fa-solid fa-link'}"></i></div>
                <div class="app-label">${app.label.replace(/\n/g, '<br>')}</div>
            `;
            
            container.appendChild(btn);
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
window.apriGestioneAccessi = async () => {
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
                    
                    <div style="display:flex; gap:10px; margin-top:15px; justify-content:center;">
                        <button title="Aggiungi Icona" class="btn-modal" style="width:50px; background:#0066cc; color:white; padding:10px; font-size:16px;" onclick="window.apriModalAddApp()"><i class="fa-solid fa-plus"></i></button>
                        <button title="Modifica Icone" class="btn-modal" style="width:50px; background:#6f42c1; color:white; padding:10px; font-size:16px;" onclick="window.apriModalEditListApp()"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button title="Riordina Layout" class="btn-modal" style="width:50px; background:#fd7e14; color:white; padding:10px; font-size:16px;" onclick="window.apriModalReorderApp()"><i class="fa-solid fa-arrows-up-down"></i></button>
                    </div>
                </div>
            </div>`);
            
            document.body.insertAdjacentHTML('beforeend', `
            <div id="modal-add-app" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-add-app')">
                <div class="modal-content">
                    <h2 id="modal-app-title">Aggiungi Icona</h2>
                    <input type="hidden" id="edit-original-id">
                    <input type="text" id="add-id" class="input-field" placeholder="ID univoco (es. mappa)" style="margin-bottom:10px;">
                    <input type="text" id="add-label" class="input-field" placeholder="Nome App" style="margin-bottom:10px;">
                    <input type="text" id="add-icon" class="input-field" placeholder="Classe FontAwesome (es. fa-solid fa-map)" style="margin-bottom:10px;">
                    
                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <input type="color" id="add-color" value="#0066cc" style="flex:1; height:40px; border:none;">
                        <input type="text" id="add-color-hex" class="input-field" value="#0066cc" style="flex:2; text-align:center;" oninput="document.getElementById('add-color').value=this.value">
                    </div>
                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">Accesso rapido colori: 
                        <span onclick="window.impostaColorePreset('#28a745')" style="background:#28a745; width:15px; height:15px; display:inline-block; border-radius:50%; cursor:pointer; margin-left:4px;"></span>
                        <span onclick="window.impostaColorePreset('#0066cc')" style="background:#0066cc; width:15px; height:15px; display:inline-block; border-radius:50%; cursor:pointer; margin-left:4px;"></span>
                        <span onclick="window.impostaColorePreset('#6f42c1')" style="background:#6f42c1; width:15px; height:15px; display:inline-block; border-radius:50%; cursor:pointer; margin-left:4px;"></span>
                        <span onclick="window.impostaColorePreset('#fd7e14')" style="background:#fd7e14; width:15px; height:15px; display:inline-block; border-radius:50%; cursor:pointer; margin-left:4px;"></span>
                        <span onclick="window.impostaColorePreset('#e83e8c')" style="background:#e83e8c; width:15px; height:15px; display:inline-block; border-radius:50%; cursor:pointer; margin-left:4px;"></span>
                        <span onclick="window.impostaColorePreset('#dc3545')" style="background:#dc3545; width:15px; height:15px; display:inline-block; border-radius:50%; cursor:pointer; margin-left:4px;"></span>
                    </div>

                    <select id="add-type" class="input-field" style="margin-bottom:10px;" onchange="document.getElementById('add-module-opts').style.display = this.value==='module'?'block':'none'">
                        <option value="link">Link Esterno / URL</option>
                        <option value="onclick">Funzione personalizzata (JS)</option>
                        <option value="module">Modulo Interno Dinamico</option>
                    </select>
                    
                    <input type="text" id="add-link-val" class="input-field" placeholder="URL o stringa JS o Nome Modulo" style="margin-bottom:10px;">

                    <div id="add-module-opts" style="display:none; margin-bottom:10px;">
                        <label><input type="checkbox" id="add-split"> Diviso in modulo.js e ui_modulo.js?</label>
                    </div>

                    <div style="background:var(--surface-hover); padding:10px; border-radius:8px; margin-bottom:15px;">
                        <label style="font-size:12px; font-weight:700; display:block; margin-bottom:5px;">Visibilità extra (Admin sempre incluso):</label>
                        <label style="display:block; font-size:13px; margin-bottom:4px;"><input type="checkbox" class="chk-cond" value="vip"> VIP</label>
                        <label style="display:block; font-size:13px; margin-bottom:4px;"><input type="checkbox" class="chk-cond" value="collab"> Collaboratori</label>
                        <label style="display:block; font-size:13px;"><input type="checkbox" class="chk-cond" value="tutti"> Tutti (Pubblica)</label>
                    </div>

                    <button class="btn-modal" style="background:var(--success); color:white;" onclick="window.salvaAppConfig()"><i class="fa-solid fa-cloud-arrow-up"></i> Salva su GitHub</button>
                </div>
            </div>

            <div id="modal-edit-list" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-edit-list')">
                <div class="modal-content">
                    <h2>Modifica / Elimina Icone</h2>
                    <div id="edit-list-container" style="max-height:60vh; overflow-y:auto; margin-bottom:20px;"></div>
                </div>
            </div>
            
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

window.impostaColorePreset = (hex) => {
    document.getElementById('add-color').value = hex;
    document.getElementById('add-color-hex').value = hex;
};

window.apriModalAddApp = () => {
    document.getElementById('modal-app-title').innerText = "Aggiungi Icona";
    document.getElementById('edit-original-id').value = "";
    document.getElementById('add-id').value = "";
    document.getElementById('add-label').value = "";
    document.getElementById('add-icon').value = "";
    document.getElementById('add-color').value = "#0066cc";
    document.getElementById('add-color-hex').value = "#0066cc";
    document.getElementById('add-type').value = "link";
    document.getElementById('add-link-val').value = "";
    document.getElementById('add-split').checked = false;
    document.querySelectorAll('.chk-cond').forEach(c => c.checked = false);
    document.getElementById('add-module-opts').style.display = 'none';
    window.apriModal('modal-add-app');
};

window.apriModalEditApp = (appId) => {
    const app = window.DYNAMIC_APPS.find(a => a.id === appId);
    if(!app) return;
    document.getElementById('modal-app-title').innerText = "Modifica Icona";
    document.getElementById('edit-original-id').value = app.id;
    document.getElementById('add-id').value = app.id;
    document.getElementById('add-label').value = app.label;
    document.getElementById('add-icon').value = app.icon || '';
    const col = app.defaultColor || '#0066cc';
    document.getElementById('add-color').value = col;
    document.getElementById('add-color-hex').value = col;
    
    if(app.href) { document.getElementById('add-type').value = 'link'; document.getElementById('add-link-val').value = app.href; }
    else if(app.onclick) { document.getElementById('add-type').value = 'onclick'; document.getElementById('add-link-val').value = app.onclick; }
    else if(app.isModule) { document.getElementById('add-type').value = 'module'; document.getElementById('add-link-val').value = app.moduleName; document.getElementById('add-split').checked = !!app.splitModule; }
    
    document.getElementById('add-module-opts').style.display = (app.isModule?'block':'none');
    
    const conds = app.conditions || [app.condition].filter(Boolean);
    document.querySelectorAll('.chk-cond').forEach(c => { c.checked = conds.includes(c.value); });
    
    window.chiudiModal('modal-edit-list');
    window.apriModal('modal-add-app');
};

window.apriModalEditListApp = () => {
    const cont = document.getElementById('edit-list-container');
    cont.innerHTML = window.DYNAMIC_APPS.map((a, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--surface-hover); border-radius:8px; margin-bottom:5px;">
            <span><i class="${a.icon}" style="color:${a.defaultColor}; margin-right:10px;"></i> ${a.label}</span>
            <div style="display:flex; gap:5px;">
                <button class="btn-modal" style="background:#0066cc; color:white; padding:5px 10px; font-size:12px;" onclick="window.apriModalEditApp('${a.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-modal" style="background:var(--danger); color:white; padding:5px 10px; font-size:12px;" onclick="window.eliminaApp('${a.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    window.apriModal('modal-edit-list');
};

window.eliminaApp = async (appId) => {
    if(!confirm("Confermi l'eliminazione di questa icona?")) return;
    let currentApps = [...window.DYNAMIC_APPS].filter(a => a.id !== appId);
    if(await window.pushToGitHub(currentApps)) window.chiudiModal('modal-edit-list');
};

window.salvaAppConfig = async () => {
    const originalId = document.getElementById('edit-original-id').value;
    const id = document.getElementById('add-id').value.trim();
    if(!id) return alert("Inserisci un ID univoco.");
    
    const checkedConds = Array.from(document.querySelectorAll('.chk-cond:checked')).map(c => c.value);
    
    let appObj = {
        id: id,
        label: document.getElementById('add-label').value,
        icon: document.getElementById('add-icon').value,
        defaultColor: document.getElementById('add-color').value,
        conditions: checkedConds
    };
    
    const type = document.getElementById('add-type').value;
    const val = document.getElementById('add-link-val').value;
    if(type === 'link') appObj.href = val;
    else if(type === 'onclick') appObj.onclick = val;
    else if(type === 'module') {
        appObj.isModule = true;
        appObj.moduleId = id;
        appObj.moduleName = val;
        appObj.splitModule = document.getElementById('add-split').checked;
    }
    
    let currentApps = [...window.DYNAMIC_APPS];
    if(originalId) {
        const idx = currentApps.findIndex(a => a.id === originalId);
        if(idx !== -1) currentApps[idx] = appObj;
        else currentApps.push(appObj);
    } else {
        currentApps.push(appObj);
    }
    
    if(await window.pushToGitHub(currentApps)) window.chiudiModal('modal-add-app');
};

window.apriModalReorderApp = () => {
    const cont = document.getElementById('reorder-list');
    cont.innerHTML = window.DYNAMIC_APPS.map((a, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--surface-hover); border-radius:8px; margin-bottom:5px;">
            <span><i class="${a.icon}" style="color:${a.defaultColor}; margin-right:10px;"></i> ${a.label}</span>
            <div style="display:flex; gap:5px;">
                <button onclick="window.spostaApp(${i}, -1)" style="padding:5px 10px; border-radius:4px; background:var(--surface); border:1px solid gray;">▲</button>
                <button onclick="window.spostaApp(${i}, 1)" style="padding:5px 10px; border-radius:4px; background:var(--surface); border:1px solid gray;">▼</button>
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
    window.apriModalReorderApp();
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
