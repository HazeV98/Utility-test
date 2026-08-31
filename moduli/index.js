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
    
    // Solo mappa di referenza, nessuna funzione UI hardcoded necessaria qui.
    moduli: {},
    
    async caricaModulo(nomeModulo, isSplit = false) {
        let config = this.moduli[nomeModulo];
        
        // Creazione dinamica configurazione se non esiste (usa CamelCase per le funzioni esportate)
        if (!config) {
            const camelName = nomeModulo.replace(/_([a-z])/g, g => g[1].toUpperCase());
            const capName = camelName.charAt(0).toUpperCase() + camelName.slice(1);
            
            if (isSplit) {
                config = { motore: `./${nomeModulo}.js`, ui: `./ui_${nomeModulo}.js`, exports: [`avviaMotore${capName}`, `initUI${capName}`] };
            } else {
                config = { motore: `./${nomeModulo}.js`, ui: null, exports: [`avviaMotore${capName}`] };
            }
            this.moduli[nomeModulo] = config;
        }

        if (this.cache.has(nomeModulo)) {
            const cached = this.cache.get(nomeModulo);
            if (config.exports.some(f => f.startsWith('initUI')) && !this.initializedUIs.has(nomeModulo)) {
                const initFunc = config.exports.find(f => f.startsWith('initUI'));
                if (cached[initFunc]) {
                    try { cached[initFunc](); this.initializedUIs.add(nomeModulo); } catch (e) { console.warn(e); }
                }
            }
            return cached;
        }
        
        try {
            const motoreModule = await import(config.motore);
            let uiModule = null;
            if (config.ui) uiModule = await import(config.ui);
            
            const esporta = {};
            config.exports.forEach(funz => {
                if (motoreModule[funz]) esporta[funz] = motoreModule[funz];
                if (uiModule && uiModule[funz]) esporta[funz] = uiModule[funz];
            });
            
            this.cache.set(nomeModulo, esporta);

            const initFunc = config.exports.find(f => f.startsWith('initUI'));
            if (initFunc && esporta[initFunc] && !this.initializedUIs.has(nomeModulo)) {
                try { esporta[initFunc](); this.initializedUIs.add(nomeModulo); } catch (e) { console.warn(e); }
            }
            return esporta;
        } catch (errore) {
            console.error(`✗ Errore caricamento modulo '${nomeModulo}':`, errore);
            return null;
        }
    },
    
    async avviaMotore(nomeModulo, isSplit = false) {
        const modulo = await this.caricaModulo(nomeModulo, isSplit);
        if (!modulo) return null;
        const config = this.moduli[nomeModulo];
        const motoreFunc = config.exports.find(f => f.startsWith('avviaMotore'));
        return modulo[motoreFunc] || null;
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
const GITHUB_REPO = "HazeV98/Utility-test"; 

let globalIsAdmin = false; 
let globalIsCollab = false;
let globalIsVip = false;
window.currentUserData = {}; 
window.utentiMap = {};
window.utentiArrayCache = [];

window.apriMenuLaterale = () => { 
    const s = document.getElementById('sidebar'); if(s) s.classList.add('open'); 
    const o = document.getElementById('sidebar-overlay'); if(o) o.style.display = 'block'; 
};
window.chiudiMenuLaterale = () => { 
    const s = document.getElementById('sidebar'); if(s) s.classList.remove('open'); 
    const o = document.getElementById('sidebar-overlay'); if(o) o.style.display = 'none'; 
};

// ============================================================================
// FUNZIONI FISSE MANTENUTE (SOLO QUELLE DEL MENU SUPERIORE)
// ============================================================================
window.apriBachecaUtility = async () => {
    const fullName = `${window.currentUserData?.nome || ''} ${window.currentUserData?.cognome || ''}`.trim();
    const modulo = await ModuliLazyLoader.avviaMotore('bacheca_utility', true);
    if (modulo) {
        modulo(app, db, auth, globalIsAdmin || globalIsCollab, fullName);
        const modale = document.getElementById('modal-bacheca-utility-main');
        if (modale) modale.style.display = 'flex';
    }
};
window.apriModaleGuida = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { alert("Accesso revocato."); return; }
    const modulo = await ModuliLazyLoader.avviaMotore('guida', true);
    if (modulo) {
        modulo(db, auth, window.currentUserData, globalIsAdmin);
        const modale = document.getElementById('modal-guida-main');
        if (modale) modale.style.display = 'flex';
    }
};

// ============================================================================
// GESTIONE GITHUB API PER MENU DINAMICO E RIORDINAMENTO
// ============================================================================
let remoteApps = [];

window.salvaPAT = () => {
    const pat = document.getElementById('github-pat').value;
    if(pat) { localStorage.setItem('gh_pat', pat); alert('PAT salvato localmente.'); }
};

async function fetchGitHubFile(path) {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=main`);
    if(!res.ok) return null;
    const data = await res.json();
    return { sha: data.sha, content: decodeURIComponent(escape(atob(data.content))) };
}

async function pushGitHubFile(path, contentBase64, message, sha) {
    const pat = localStorage.getItem('gh_pat');
    if(!pat) { alert("Errore: PAT mancante! Inseriscilo nelle impostazioni Admin."); return false; }
    
    const body = { message: message, content: contentBase64, branch: "main" };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
        method: "PUT",
        headers: { "Authorization": `token ${pat}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    
    if(!res.ok) {
        const err = await res.json();
        console.error(err);
        alert("Errore caricamento GitHub: " + (err.message || res.statusText));
        return false;
    }
    return true;
}

window.salvaAppSuGitHub = async () => {
    const id = document.getElementById('app-edit-id').value || "app_" + Date.now();
    const visInputs = Array.from(document.querySelectorAll('.app-vis:checked')).map(el => el.value);
    
    const targetVal = document.getElementById('app-target').value;
    if(!targetVal) { alert("Devi inserire un Target (Link o Modulo)!"); return; }

    const tipoIcona = document.getElementById('app-tipo-icona').value;
    let iconaVal = document.getElementById('app-icona-fa').value;
    
    if (tipoIcona === 'png') {
        const fileInput = document.getElementById('app-icona-file');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `icon_${id}.png`;
            iconaVal = `assets/icons/${fileName}`;
            
            const reader = new FileReader();
            reader.onload = async function(e) {
                const base64Content = e.target.result.split(',')[1];
                const existingImg = await fetchGitHubFile(iconaVal);
                await pushGitHubFile(iconaVal, base64Content, `Aggiunta icona ${fileName}`, existingImg?.sha);
                procediSalvataggioJson();
            };
            reader.readAsDataURL(file);
            return; 
        } else if (!document.getElementById('app-edit-id').value) {
            alert("Seleziona un'immagine PNG!"); return;
        }
    }
    
    procediSalvataggioJson();

    async function procediSalvataggioJson() {
        const nuovaApp = {
            id: id,
            tipo: document.getElementById('app-tipo').value,
            nome: document.getElementById('app-nome').value,
            target: targetVal,
            split: document.getElementById('app-split').checked,
            iconaTipo: tipoIcona,
            iconaValore: iconaVal, 
            visibilita: visInputs
        };

        document.querySelector('#modaleAggiuntaIcona .btn-modal').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...';

        const existingFile = await fetchGitHubFile('assets/apps.json');
        let appsArray = existingFile ? JSON.parse(existingFile.content) : [];
        
        const index = appsArray.findIndex(a => a.id === id);
        if(index > -1) appsArray[index] = nuovaApp;
        else appsArray.push(nuovaApp);

        const strJson = JSON.stringify(appsArray, null, 2);
        const b64Json = btoa(unescape(encodeURIComponent(strJson)));

        const success = await pushGitHubFile('assets/apps.json', b64Json, "Aggiornamento apps.json via Admin", existingFile?.sha);
        
        document.querySelector('#modaleAggiuntaIcona .btn-modal').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Salva in apps.json';

        if(success) { 
            alert("App salvata con successo su GitHub!"); 
            window.chiudiModal('modaleAggiuntaIcona'); 
            window.LayoutEngine.init(); 
        }
    }
};

window.apriModificaIcona = (id) => {
    let app = remoteApps.find(a => a.id === id);
    if(!app) {
        // Modalità Nuova Icona
        app = { id: '', tipo: 'modulo', nome: '', target: '', split: false, iconaTipo: 'fa', iconaValore: '', visibilita: [] };
    }
    
    document.getElementById('app-edit-id').value = app.id;
    document.getElementById('app-tipo').value = app.tipo;
    document.getElementById('app-nome').value = app.nome;
    document.getElementById('app-target').value = app.target;
    document.getElementById('app-split').checked = app.split || false;
    document.getElementById('app-tipo-icona').value = app.iconaTipo;
    document.getElementById('app-icona-fa').value = (app.iconaTipo === 'fa') ? (app.iconaValore || '') : '';
    
    document.querySelectorAll('.app-vis').forEach(cb => { 
        cb.checked = app.visibilita ? app.visibilita.includes(cb.value) : false; 
    });
    
    window.aggiornaUIFormApp();
    window.apriModal('modaleAggiuntaIcona');
};

// ============================================================================
// LAYOUT ENGINE - RENDERING E SORTABLE JS (DRAG&DROP)
// ============================================================================
window.LayoutEngine = {
    prefs: { c1: "#a9dfcd", c2: "#ffffff", c3: "#a4c5e3", appBg: "#0066cc", view: "grid", theme: "system" },
    isEditMode: false,
    sortableInstance: null,
    
    init: async function() {
        if(globalIsAdmin) document.getElementById('admin-settings-panel').style.display = 'block';
        
        let localStr = localStorage.getItem('preferenze_layout_haze');
        if (localStr) { try { this.prefs = { ...this.prefs, ...JSON.parse(localStr) }; } catch(e) {} }
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if(this.prefs.theme === 'system') this.applicaGrafica();
        });

        this.applicaGrafica();
        this.popolaModaleImpostazioni();
        
        try {
            const file = await fetchGitHubFile('assets/apps.json');
            if (file) remoteApps = JSON.parse(file.content);
        } catch (e) { console.warn("Impossibile caricare apps.json", e); }

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

        const c1 = encodeURIComponent(actualC1); 
        const c2 = encodeURIComponent(actualC2); 
        const c3 = encodeURIComponent(actualC3);
        
        const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Crect width='100' height='100' fill='${c3}'/%3E%3Cpath d='M0,60 C35,90 65,30 100,60 L100,0 L0,0 Z' fill='${c2}'/%3E%3Cpath d='M0,45 C35,65 65,25 100,45 L100,0 L0,0 Z' fill='${c1}'/%3E%3C/svg%3E`;
        document.body.style.backgroundImage = `url("${svg}")`;
        
        let baseClass = this.prefs.view === 'list' ? 'app-list' : 'app-grid';
        document.getElementById('app-container').className = baseClass;
    },
    
    popolaModaleImpostazioni: function() {
        document.getElementById('set-col1').value = this.prefs.c1 || "#a9dfcd";
        document.getElementById('set-col2').value = this.prefs.c2 || "#ffffff";
        document.getElementById('set-col3').value = this.prefs.c3 || "#a4c5e3";
        document.getElementById('set-appbg').value = this.prefs.appBg || "#0066cc";
        document.getElementById('set-viewmode').value = this.prefs.view || "grid";
        document.getElementById('set-theme').value = this.prefs.theme || 'system';
    },
    
    render: function() {
        const container = document.getElementById('app-container');
        const sidebarContainer = document.getElementById('dynamic-sidebar-links');
        
        container.innerHTML = '';
        sidebarContainer.innerHTML = '';
        
        if(this.isEditMode) container.classList.add('wiggle-mode'); else container.classList.remove('wiggle-mode');
        
        remoteApps.forEach((app, index) => {
            const vis = app.visibilita || [];
            let canSee = globalIsAdmin; 
            
            if (!canSee) {
                if (vis.length === 0) return; 
                if (vis.includes('tutti')) canSee = true;
                if (vis.includes('collab') && (globalIsCollab || globalIsVip)) canSee = true;
                if (vis.includes('vip') && globalIsVip) canSee = true;
            }
            if(!canSee) return;

            // Creazione Wrapper Dinamico per il Modulo se non è un link
            let isLinkAttr = "";
            let sidebarLinkAttr = "";
            if (this.isEditMode) {
                isLinkAttr = `onclick="event.preventDefault(); window.apriModificaIcona('${app.id}');"`;
            } else {
                if (app.tipo === 'link') {
                    isLinkAttr = `href="${app.target}" target="_blank"`;
                    sidebarLinkAttr = isLinkAttr;
                } else {
                    window[`avviaDin_${app.id}`] = async () => {
                        const moduloFunc = await ModuliLazyLoader.avviaMotore(app.target, app.split);
                        if(moduloFunc) {
                            moduloFunc(db, auth, window.currentUserData, globalIsAdmin); 
                            const nomeModale = `modal-${app.target.replace('_', '')}-main`;
                            const modale = document.getElementById(nomeModale) || document.getElementById(`modal-${app.target}-main`);
                            if (modale) modale.style.display = 'flex';
                        }
                    };
                    isLinkAttr = `onclick="window.avviaDin_${app.id}()"`;
                    sidebarLinkAttr = `href="#" onclick="window.chiudiMenuLaterale(); window.avviaDin_${app.id}(); return false;"`;
                }
            }

            const badgeHtml = this.isEditMode ? `<div class="edit-badge"><i class="fa-solid fa-pen"></i></div>` : '';
            
            let iconStyle = `background-color: ${this.prefs.appBg};`;
            let iconContent = "";
            let sidebarIconHtml = "";
            
            if (app.iconaTipo === 'png' && app.iconaValore) {
                const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${app.iconaValore}`;
                iconStyle += ` background-image: url('${rawUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat;`;
                sidebarIconHtml = `<img src="${rawUrl}" style="width:20px; height:20px; border-radius:4px; margin-right:8px; display:inline-block; vertical-align:middle;">`;
            } else if (app.iconaTipo === 'favicon' && app.tipo === 'link') {
                try {
                    const urlObj = new URL(app.target);
                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
                    iconStyle += ` background-image: url('${faviconUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat;`;
                    sidebarIconHtml = `<img src="https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32" style="width:20px; height:20px; border-radius:4px; margin-right:8px; display:inline-block; vertical-align:middle;">`;
                } catch(e) { iconContent = "🔗"; sidebarIconHtml = `<i class="fa-solid fa-link" style="width:28px; text-align:left;"></i>`; }
            } else {
                iconContent = `<i class="${app.iconaValore || 'fa-solid fa-link'}"></i>`;
                sidebarIconHtml = `<i class="${app.iconaValore || 'fa-solid fa-link'}" style="width:28px; text-align:left;"></i>`;
            }

            let animDelay = this.isEditMode ? "0s" : `${index * 0.04}s`;
            
            // Appendi alla griglia principale
            container.innerHTML += `
                <a ${isLinkAttr} class="app-btn" id="btn-${app.id}" style="animation-delay: ${animDelay}">
                    ${badgeHtml}
                    <div class="app-icon" style="${iconStyle}">${iconContent}</div>
                    <div class="app-label">${app.nome.replace('\n', '<br>')}</div>
                </a>`;
            
            // Appendi alla Sidebar
            sidebarContainer.innerHTML += `
                <a ${sidebarLinkAttr} class="sidebar-link">
                    ${sidebarIconHtml} ${app.nome.replace('\n', ' ')}
                </a>
            `;
        });
    },
    
    toggleEditMode: function() {
        this.isEditMode = !this.isEditMode;
        document.getElementById('btn-salva-layout').style.display = this.isEditMode ? 'flex' : 'none';
        this.render(); 
        
        if(this.isEditMode) {
            this.sortableInstance = new Sortable(document.getElementById('app-container'), { 
                animation: 250, 
                delay: 150, 
                delayOnTouchOnly: true, 
                ghostClass: "sortable-ghost", 
                onEnd: () => { this.aggiornaOrdineDaDOM(); } 
            });
        } else { 
            if(this.sortableInstance) this.sortableInstance.destroy(); 
            this.salvaOrdineSuGitHub(); 
        }
    },

    aggiornaOrdineDaDOM: function() {
        const nuovoOrdine = []; 
        document.querySelectorAll('#app-container .app-btn').forEach(nodo => {
            const id = nodo.id.replace('btn-', ''); 
            const app = remoteApps.find(a => a.id === id); 
            if (app) nuovoOrdine.push(app);
        });
        
        // Aggiunge in fondo le app nascoste all'utente corrente per non perderle
        remoteApps.forEach(app => { 
            if (!nuovoOrdine.find(a => a.id === app.id)) nuovoOrdine.push(app); 
        });
        remoteApps = nuovoOrdine;
    },

    salvaOrdineSuGitHub: async function() {
        const btnSalva = document.getElementById('btn-salva-layout');
        btnSalva.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...';
        btnSalva.style.display = 'flex';
        
        const existingFile = await fetchGitHubFile('assets/apps.json');
        const strJson = JSON.stringify(remoteApps, null, 2);
        const b64Json = btoa(unescape(encodeURIComponent(strJson)));

        const success = await pushGitHubFile('assets/apps.json', b64Json, "Riordinamento app da interfaccia Admin", existingFile?.sha);
        
        btnSalva.style.display = 'none';
        btnSalva.innerHTML = '<i class="fa-solid fa-check"></i> Fatto (Salva Layout)';
        if(!success) alert("Errore durante il salvataggio del nuovo ordine su GitHub!");
    },
    
    salvaPreferenzeGlobali: function() {
        this.prefs.c1 = document.getElementById('set-col1').value; 
        this.prefs.c2 = document.getElementById('set-col2').value; 
        this.prefs.c3 = document.getElementById('set-col3').value;
        this.prefs.appBg = document.getElementById('set-appbg').value; 
        this.prefs.view = document.getElementById('set-viewmode').value;
        this.prefs.theme = document.getElementById('set-theme').value;
        
        this.applicaGrafica(); 
        this.render(); 
        window.chiudiModal('settingsModal'); 
        this.sincronizzaConFirebase();
    },
    
    sincronizzaConFirebase: async function() {
        const str = JSON.stringify(this.prefs); localStorage.setItem('preferenze_layout_haze', str);
        if (auth.currentUser) await setDoc(doc(db, "utenti", auth.currentUser.uid), { preferenze_layout: str }, { merge: true });
    },
    
    ripristinaPredefiniti: async function() { 
        if(!confirm("Ripristinare tutto?")) return; 
        localStorage.removeItem('preferenze_layout_haze'); 
        if (auth.currentUser) await setDoc(doc(db, "utenti", auth.currentUser.uid), { preferenze_layout: null }, { merge: true }); 
        location.reload(); 
    }
};


// ============================================================================
// GESTIONE GESTIONE ACCESSI E UTENTI
// ============================================================================
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
        
        let badges = '';
        if(u.ruolo === 'collaborator') badges += `<span style="font-size:10px; background:#6f42c1; color:white; padding:2px 6px; border-radius:10px; margin-left:6px;">Collab</span>`;
        if(u.ruolo === 'vip') badges += `<span style="font-size:10px; background:#ffc107; color:#333; padding:2px 6px; border-radius:10px; margin-left:6px;">VIP</span>`;

        const clickableName = `<span style="font-weight:700; font-size:14px; cursor:pointer; color:var(--primary); text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'" onclick="window.apriDettaglioUtente('${u.uid}')">${fullName}</span>${badges}`;
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
    const ruoloAttuale = u.ruolo || 'user';
    
    document.getElementById('dettaglio-utente-body').innerHTML = `
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-user" style="color:var(--primary); width:16px;"></i> <strong>Nome:</strong> ${u.nome || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-regular fa-user" style="color:var(--primary); width:16px;"></i> <strong>Cognome:</strong> ${u.cognome || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-hashtag" style="color:var(--primary); width:16px;"></i> <strong>Matricola:</strong> ${u.matricola || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-tag" style="color:var(--primary); width:16px;"></i> <strong>Omonimia:</strong> ${u.progressivo || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-envelope" style="color:var(--primary); width:16px;"></i> <strong>Email:</strong> ${u.email || 'Non registrata'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-phone" style="color:var(--primary); width:16px;"></i> <strong>Telefono:</strong> ${u.telefono || 'Non registrato'}</div>
        <div style="margin-bottom:5px; font-size:12px; color:var(--text-muted); word-break: break-all; margin-top:20px; border-top:1px solid var(--border-color); padding-top:10px;"><i class="fa-solid fa-fingerprint"></i> <strong>ID Account:</strong> ${u.uid || '-'}</div>`;
        
    let btnCollab = `<button class="btn-modal" style="background: ${ruoloAttuale==='collaborator' ? 'transparent' : '#6f42c1'}; color: ${ruoloAttuale==='collaborator' ? 'var(--danger)' : 'white'}; border: ${ruoloAttuale==='collaborator' ? '2px solid var(--danger)' : 'none'};" onclick="window.cambiaRuoloUtente('${uid}', '${ruoloAttuale==='collaborator' ? 'user' : 'collaborator'}')">${ruoloAttuale==='collaborator' ? "<i class='fa-solid fa-user-minus'></i> Revoca Collaboratore" : "<i class='fa-solid fa-user-shield'></i> Rendi Collaboratore"}</button>`;
    
    let btnVip = `<button class="btn-modal" style="background: ${ruoloAttuale==='vip' ? 'transparent' : '#ffc107'}; color: ${ruoloAttuale==='vip' ? 'var(--danger)' : '#333'}; border: ${ruoloAttuale==='vip' ? '2px solid var(--danger)' : 'none'}; margin-top:10px;" onclick="window.cambiaRuoloUtente('${uid}', '${ruoloAttuale==='vip' ? 'user' : 'vip'}')">${ruoloAttuale==='vip' ? "<i class='fa-solid fa-user-minus'></i> Revoca VIP" : "<i class='fa-solid fa-star'></i> Rendi VIP"}</button>`;
    
    let btnEdit = `<button class="btn-modal" style="background: #ff9800; color: white; margin-top:15px; margin-bottom:5px;" onclick="window.apriEditorAdminUtente('${uid}')"><i class="fa-solid fa-pen"></i> Correggi Dati Utente</button>`;
    
    document.getElementById('dettaglio-utente-body').insertAdjacentHTML('beforeend', btnCollab + btnVip + btnEdit);
    
    window.apriModal('modal-dettaglio-utente');
};

window.cambiaRuoloUtente = async (uid, nuovoRuolo) => { 
    if(!confirm(`Impostare il ruolo dell'utente a: ${nuovoRuolo}?`)) return; 
    try { 
        await setDoc(doc(db, "utenti", uid), { ruolo: nuovoRuolo }, { merge: true }); 
        window.utentiMap[uid].ruolo = nuovoRuolo; 
        window.chiudiModal('modal-dettaglio-utente'); 
        window.renderGestioneAccessi();
        alert("Ruolo aggiornato!"); 
    } catch(e) { alert("Errore durante l'aggiornamento."); } 
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


// ============================================================================
// GESTIONE AUTENTICAZIONE PRINCIPALE
// ============================================================================
window.apriModal = (id, authMode) => { document.getElementById(id).style.display = 'flex'; if(id === 'authModal' && authMode) { window.currentAuthMode = authMode; window.aggiornaUIAuth(); } };
window.chiudiModal = (id) => { document.getElementById(id).style.display = 'none'; };
window.chiudiSuSfondo = (e, id) => { if (e.target.id === id) window.chiudiModal(id); };

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
        globalIsVip = cachedData.ruolo === 'vip';
        
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
            globalIsVip = safeData.ruolo === 'vip';
            
            const oggiLog = new Date();
            const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
            const oggiLogStr = formatterDate.format(oggiLog);
            
            if (safeData.last_app_access !== oggiLogStr || !safeData.email) { 
                setDoc(doc(db, "utenti", user.uid), { last_app_access: oggiLogStr, last_access_full: oggiLog.toISOString(), email: user.email }, { merge: true }); 
            }
            
            if (safeData.preferenze_layout && safeData.preferenze_layout !== localStorage.getItem('preferenze_layout_haze')) {
                window.LayoutEngine.prefs = { ...window.LayoutEngine.prefs, ...JSON.parse(safeData.preferenze_layout) };
                window.LayoutEngine.applicaGrafica();
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
