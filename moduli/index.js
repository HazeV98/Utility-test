import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, deleteUser, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocFromServer, collection, getDocs, query, orderBy, deleteDoc, where, Timestamp, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMessaging, getToken, deleteToken, onMessage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";

import { avviaMotoreAuth } from './auth.js';

// ============================================================================
// SISTEMA DI LAZY LOADING OTTIMIZZATO E CORRETTO
// ============================================================================
const ModuliLazyLoader = {
    cache: new Map(),
    initializedUIs: new Set(),
    
    async caricaModulo(nomeModulo, isSplit = false) {
        if (!nomeModulo) return null;
        if (this.cache.has(nomeModulo)) return this.cache.get(nomeModulo);
        
        try {
            let esporta = {};
            
            if (isSplit) {
                const [motoreRes, uiRes] = await Promise.all([
                    import(`./${nomeModulo}.js`),
                    import(`./ui_${nomeModulo}.js`).catch(() => ({})) 
                ]);
                esporta = { ...motoreRes, ...uiRes };
            } else {
                esporta = await import(`./${nomeModulo}.js`);
            }
            
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
            console.error(`✗ Errore caricamento modulo '${nomeModulo}':`, errore);
            alert(`Impossibile trovare il modulo: ${nomeModulo}. Assicurati che esista e sia configurato correttamente.`);
            return null;
        }
    },
    
    async avviaMotore(nomeModulo, isSplit) {
        const modulo = await this.caricaModulo(nomeModulo, isSplit);
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
const BACKEND_URL = 'https://utilitybe.homeserver.foo'; // backend del mini PC (bacheca avvisi) 
let globalIsAdmin = false; 
let globalIsCollab = false;
let globalIsVip = false;
window.currentUserData = {}; 
window.utentiMap = {};
window.utentiArrayCache = [];
window.DYNAMIC_APPS = [];
window.ModuleBadges = {};

window.caricaAppsConfig = async () => {
    try {
        const r = await fetch('./assets/apps.json?v=' + Date.now());
        if(r.ok) { window.DYNAMIC_APPS = await r.json(); }
        else { window.DYNAMIC_APPS = []; }
    } catch(e) { window.DYNAMIC_APPS = []; }
};

// ============================================================================
// ROUTER DINAMICO E LANCIATORI NATIVI 
// ============================================================================
window.eseguiAzioneApp = async (appId) => {
    const appConfig = window.DYNAMIC_APPS.find(a => a.id === appId);
    if (!appConfig) return;

    if (appConfig.href) {
        window.location.href = appConfig.href;
        return;
    }

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

    if (appId === 'accessi') { return window.apriGestioneAccessi(); }

    let moduleName = (appConfig.isModule && appConfig.moduleName) ? appConfig.moduleName : null;
    let isSplit = appConfig.hasOwnProperty('splitModule') ? appConfig.splitModule : true;
    
    if (!moduleName) {
        const legacyMap = { 
    'bacheca_utility': 'bacheca_utility', 'guida': 'guida',
    'statistiche':'statistiche', 'rotazioni':'rotazioni', 'turni':'turni', 
    'bachecaturni':'bacheca_turni', 'barcadvisor':'barcadvisor', 'rubrica':'rubrica', 
    'ferie':'rotazione_ferie', 'orari':'orari', 'documenti':'documenti', 'link':'link', 
    'contatti':'contatti', 'buoni':'buoni_pasto', 'buoni_pasto':'buoni_pasto', 'promemoria':'promemoria', 
    'dds':'dds', 'report':'report', 'admin':'admin' 
};

        moduleName = legacyMap[appId];
    }

    if (moduleName) {
        const fn = await ModuliLazyLoader.avviaMotore(moduleName, isSplit);
        if (fn) await fn(db, auth, window.currentUserData, globalIsAdmin);
    }

    // Riallinea il badge del modulo appena aperto: report.js/rotazioni.js
    // segnano già come "letto" alla lettura, qui aggiorniamo solo l'icona.
    if (appId === 'storie' && window.segnaStorieLette) window.segnaStorieLette();

    if (appId === 'rotazioni' || appId === 'report' || appId === 'promemoria') {
        setTimeout(() => {
            if (appId === 'rotazioni' && window.controllaRichiesteSospese) window.controllaRichiesteSospese();
            if (appId === 'report' && window.controllaSegnalazioni) window.controllaSegnalazioni();
            if (appId === 'promemoria' && window.controllaPromemoria) window.controllaPromemoria();
        }, 900);
    }

    const legacyModals = { 
    'bachecaturni': 'modal-bachecaturni-main', 
    'buoni': 'modal-buoni-main', 
    'buoni_pasto': 'modal-buoni-main',
    'ferie': 'modal-rotazione-ferie-main', 
    'report': 'modal-segnalazioni-main' 
};

    
    const modalId = legacyModals[appId] || `modal-${appId}-main`;
    const modale = document.getElementById(modalId);
    
    if (modale) modale.style.display = 'flex';
    else console.warn(`Interfaccia non trovata: nessun elemento HTML con id "${modalId}"`);
};

window.avviaMotoreGuidaDaIndex = async () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) { 
        alert("L'accesso alle funzioni ti è stato revocato."); 
        return; 
    }
    const fn = await ModuliLazyLoader.avviaMotore('guida', true);
    if (fn) fn(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreBachecaUtilityDaIndex = async () => {
    const fullName = `${window.currentUserData?.nome || ''} ${window.currentUserData?.cognome || ''}`.trim();
    const fn = await ModuliLazyLoader.avviaMotore('bacheca_utility', false);
    if (fn) fn(app, db, auth, globalIsAdmin || globalIsCollab, fullName);
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

        // Il server restituisce solo gli avvisi non scaduti e visibili a questo utente (rotazione, ruolo)
        const token = await auth.currentUser.getIdToken();
        const risposta = await fetch(`${BACKEND_URL}/api/bacheca?rotazione=${encodeURIComponent(rotazioneUtente || '')}`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (!risposta.ok) throw new Error('Server bacheca: errore ' + risposta.status);
        const { avvisi } = await risposta.json();

        let avvisiNormali = 0; let avvisiDDS = [];

        avvisi.forEach(m => {
            const giaLetto = localStorage.getItem('letto_' + m.id);
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

// ============================================================================
// GESTIONE BADGE NOTIFICHE MODULI (icona app / cartella)
// L'id modulo (chiave in window.ModuleBadges) coincide sempre con l'appId,
// che a sua volta coincide col nome file del modulo senza ".js".
// ============================================================================

// Applica i conteggi correnti (window.ModuleBadges) a TUTTI gli elementi badge
// presenti nel DOM in questo momento (griglia principale + modale cartella).
window.sincronizzaBadgeDOM = () => {
    Object.keys(window.ModuleBadges).forEach(appId => {
        const count = window.ModuleBadges[appId] || 0;
        document.querySelectorAll(`[data-badge-appid="${appId}"]`).forEach(el => {
            if (count > 0) { el.innerText = count > 99 ? '99+' : count; el.style.display = 'flex'; }
            else { el.style.display = 'none'; }
        });
    });
    window.ricalcolaBadgeCartelle();
};

// Somma i badge di tutte le app contenute in ciascuna cartella e aggiorna
// il pallino aggregato mostrato sull'icona della cartella.
window.ricalcolaBadgeCartelle = () => {
    const folderTotals = {};
    (window.DYNAMIC_APPS || []).forEach(app => {
        if (!app.folder) return;
        const c = window.ModuleBadges[app.id] || 0;
        folderTotals[app.folder] = (folderTotals[app.folder] || 0) + c;
    });
    document.querySelectorAll('[data-badge-folder]').forEach(el => {
        const folderName = el.dataset.badgeFolder;
        const total = folderTotals[folderName] || 0;
        if (total > 0) { el.innerText = total > 99 ? '99+' : total; el.style.display = 'flex'; }
        else { el.style.display = 'none'; }
    });
};

// Aggiorna il conteggio di un singolo modulo e ripropaga la modifica nel DOM.
window.aggiornaBadgeUI = (appId, count) => {
    window.ModuleBadges[appId] = count || 0;
    window.sincronizzaBadgeDOM();
};

// --- ROTAZIONI: notifica solo per l'admin, nuove richieste in attesa ---
window.controllaRichiesteSospese = async () => {
    if (!auth.currentUser || !globalIsAdmin) { window.aggiornaBadgeUI('rotazioni', 0); return; }
    try {
        const q = query(collection(db, "permessi_rotazioni"), where("stato_richiesta", "==", "pending"));
        const snap = await getDocs(q);
        window.aggiornaBadgeUI('rotazioni', snap.size);
    } catch(e) { console.error("Errore badge rotazioni:", e); }
};

// --- REPORT (Assistenza): numero di chat con messaggi non letti (nuovi messaggi per l'admin, nuove risposte per l'utente) ---
// Il conteggio arriva dal backend; si azzera quando la chat viene aperta (gestito da report.js).
window.controllaSegnalazioni = async () => {
    if (!auth.currentUser) { window.aggiornaBadgeUI('report', 0); return; }
    try {
        const token = await auth.currentUser.getIdToken();
        const risposta = await fetch(`${BACKEND_URL}/api/assistenza/badge`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (!risposta.ok) throw new Error('Server assistenza: errore ' + risposta.status);
        const { nonLette } = await risposta.json();
        window.aggiornaBadgeUI('report', nonLette);
    } catch(e) { console.error("Errore badge report:", e); }
};

// --- PROMEMORIA: numero di promemoria attualmente impostati (non scaduti) ---
window.controllaPromemoria = async () => {
    try {
        const req = indexedDB.open("UtilityDB", 3);
        req.onsuccess = (event) => {
            const localDb = event.target.result;
            if (!localDb.objectStoreNames.contains("archivio_dds")) { window.aggiornaBadgeUI('promemoria', 0); return; }
            const tx = localDb.transaction("archivio_dds", "readonly");
            tx.objectStore("archivio_dds").getAll().onsuccess = (e) => {
                const oggiStr = new Date().toISOString().split('T')[0];
                const attivi = (e.target.result || []).filter(d =>
                    d.isPromemoria && (!d.dateValidita || !d.dateValidita.length || d.dateValidita[d.dateValidita.length - 1] >= oggiStr)
                );
                window.aggiornaBadgeUI('promemoria', attivi.length);
            };
        };
        req.onerror = () => { window.aggiornaBadgeUI('promemoria', 0); };
    } catch(e) { console.error("Errore badge promemoria:", e); }
};

// --- STORIE: storie di altri utenti e commenti ai propri post o a quelli seguiti ---
window.controllaStorie = async () => {
    if (!auth.currentUser) { window.aggiornaBadgeUI('storie', 0); return; }
    try {
        const fbAccess = parseInt(window.currentUserData?.ultimo_accesso_storie || 0);
        const localAccess = parseInt(localStorage.getItem('ultimo_accesso_storie') || 0);
        const ultimoAccesso = Math.max(fbAccess, localAccess);
        let count = 0;

        // 1. Nuove storie pubblicate da altri
        const qStorie = query(collection(db, "storie"), where("timestamp", ">", Timestamp.fromMillis(ultimoAccesso)));
        const snapStorie = await getDocs(qStorie);
        snapStorie.forEach(d => { if (d.data().autoreId !== auth.currentUser.uid) count++; });

        // 2. Nuovi commenti ai TUOI post
        // Rimuoviamo il where() sulla data e filtriamo in JS per non richiedere indici composti
        const qComPropri = query(collection(db, "storie"), where("autoreId", "==", auth.currentUser.uid));
        const snapComPropri = await getDocs(qComPropri);
        snapComPropri.forEach(d => { 
            const data = d.data();
            if (data.lastCommentTimestamp && data.lastCommentTimestamp.toMillis() > ultimoAccesso) {
                if (data.lastCommentAuthor !== auth.currentUser.uid) count++;
            }
        });

        // 3. Nuovi commenti ai post a cui hai messo la campanellina
        const qComSeguiti = query(collection(db, "storie"), where("followers", "array-contains", auth.currentUser.uid));
        const snapComSeguiti = await getDocs(qComSeguiti);
        snapComSeguiti.forEach(d => { 
            const data = d.data();
            if (data.lastCommentTimestamp && data.lastCommentTimestamp.toMillis() > ultimoAccesso) {
                if (data.autoreId !== auth.currentUser.uid && data.lastCommentAuthor !== auth.currentUser.uid) count++; 
            }
        });

        window.aggiornaBadgeUI('storie', count);
    } catch(e) { console.error("Errore badge storie:", e); }
};


// Segna tutte le storie come lette (chiamata all'apertura del modulo e quando arrivano storie a modulo aperto).
window.segnaStorieLette = async () => {
    const now = Date.now();
    localStorage.setItem('ultimo_accesso_storie', now);
    if (window.currentUserData) window.currentUserData.ultimo_accesso_storie = now;
    window.aggiornaBadgeUI('storie', 0);
    if (auth.currentUser) {
        try { await setDoc(doc(db, "utenti", auth.currentUser.uid), { ultimo_accesso_storie: now }, { merge: true }); }
        catch(e) { console.error("Errore salvataggio ultimo accesso storie:", e); }
    }
};

// Esegue un refresh di tutti i badge dei moduli monitorati.
window.aggiornaTuttiIBadge = () => {
    window.controllaRichiesteSospese();
    window.controllaSegnalazioni();
    window.controllaPromemoria();
    window.controllaStorie();
};

// ============================================================================
// GESTIONE NOTIFICHE (APP NATIVA / WEB PUSH): toggle generale + toggle Annunci Bacheca
// Nel profilo (Firestore utenti/{uid}) si salvano: fcm_token (dispositivo collegato),
// preferenze_notifiche.bacheca_utility e rotazione_notifiche. L'invio lo fa il backend (bacheca.js).
// Le altre preferenze gia' presenti nel profilo (promemoria, dds, ...) non vengono toccate.
// ============================================================================
const VAPID_KEY = "BLex63nSSs-uyUZUIRzWPOQyznfTkHC8ZtNnInGArryQnYddSfIHjAH1IwfoopM9otZ4jl2NGL5vM4xtLHkqwyI";

const isNativePush = () => !!(window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.PushNotifications);
const isWebPush = () => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

function rotazioneDaProfiloLocale() {
    try {
        const stateApp = JSON.parse(localStorage.getItem('myTurniApp')) || {};
        const pid = stateApp.profiloAttivoId || 'default';
        const profileObj = stateApp.profiliSalvati ? stateApp.profiliSalvati[pid] : stateApp;
        return (profileObj && profileObj.depositoAttivo) || null;
    } catch (e) { return null; }
}

function mostraStatoNotifiche(attive) {
    const toggle = document.getElementById('toggle-notifiche-generale');
    const statusText = document.getElementById('notif-status-text');
    const prefSection = document.getElementById('notif-preferences-section');
    if (toggle) toggle.checked = attive;
    if (prefSection) prefSection.style.display = attive ? 'block' : 'none';
    if (statusText) {
        statusText.innerHTML = attive
            ? "<i class='fa-solid fa-circle-check'></i> Notifiche attive su questo dispositivo"
            : "<i class='fa-solid fa-bell-slash'></i> Notifiche disattivate";
        statusText.style.color = attive ? "var(--success)" : "var(--text-muted)";
    }
}

// Ogni dispositivo aggiunge il proprio token all'elenco fcm_tokens: cosi' telefono e PC dello stesso account ricevono entrambi
// le notifiche (prima l'ultimo dispositivo aperto sovrascriveva gli altri). fcm_token resta l'ultimo, per compatibilita'.
async function salvaTokenDispositivo(token, tipoDispositivo) {
    if (!auth.currentUser) return;
    const ref = doc(db, "utenti", auth.currentUser.uid);
    const precedente = localStorage.getItem('fcm_token_dispositivo');
    if (precedente && precedente !== token) {
        try { await setDoc(ref, { fcm_tokens: arrayRemove(precedente) }, { merge: true }); } catch (e) { console.warn("Token precedente non rimosso:", e); }
    }
    await setDoc(ref, { fcm_token: token, fcm_tokens: arrayUnion(token), device_type: tipoDispositivo }, { merge: true });
    localStorage.setItem('fcm_token_dispositivo', token);
}

let listenerNativoRegistrato = false;
function registraListenerNativo() {
    if (listenerNativoRegistrato || !isNativePush()) return;
    listenerNativoRegistrato = true;
    window.Capacitor.Plugins.PushNotifications.addListener('registration', async (token) => {
        if (auth.currentUser) {
            await salvaTokenDispositivo(token.value, 'android_app');
        }
    });
}

// Con l'app aperta e visibile il sistema non mostra la notifica: all'arrivo di un messaggio si aggiornano
// badge e banner della bacheca, cosi' il nuovo avviso si vede subito.
let listenerPrimoPianoRegistrato = false;
function registraListenerPrimoPiano() {
    if (listenerPrimoPianoRegistrato) return;
    listenerPrimoPianoRegistrato = true;
    const aggiornaBacheca = () => {
        if (window.controllaBacheca) window.controllaBacheca();
        if (window.controllaSegnalazioni) window.controllaSegnalazioni();
        if (window.aggiornaAssistenza) window.aggiornaAssistenza();
    };
    try {
        if (isNativePush()) window.Capacitor.Plugins.PushNotifications.addListener('pushNotificationReceived', aggiornaBacheca);
        else if (isWebPush()) onMessage(getMessaging(app), aggiornaBacheca);
    } catch (e) { console.warn("Listener notifiche in primo piano non attivato:", e); }
}

// Chiede il permesso (se serve) e collega questo dispositivo. Restituisce true se riuscito.
async function collegaDispositivo() {
    if (!auth.currentUser) return false;

    if (isNativePush()) {
        const PushNotifications = window.Capacitor.Plugins.PushNotifications;
        registraListenerNativo();
        let permesso = await PushNotifications.checkPermissions();
        if (permesso.receive !== 'granted') permesso = await PushNotifications.requestPermissions();
        if (permesso.receive !== 'granted') return false;
        await PushNotifications.register(); // il token arriva dal listener 'registration'
        return true;
    }

    if (isWebPush()) {
        const permesso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
        if (permesso !== 'granted') return false;
        const messaging = getMessaging(app);
        // Scope dedicato: sw.js (registrato in index.html) usa gia' lo scope './' e due service worker non possono
        // convivere nello stesso scope, altrimenti si sostituiscono a vicenda e le notifiche arrivano a intermittenza.
        const swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js', { scope: './firebase-cloud-messaging-push-scope' });
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration });
        if (!token) return false;
        await salvaTokenDispositivo(token, 'pwa_web');
        return true;
    }

    return false;
}

async function scollegaDispositivo() {
    if (auth.currentUser) {
        const ref = doc(db, "utenti", auth.currentUser.uid);
        const mio = localStorage.getItem('fcm_token_dispositivo');
        if (!mio) {
            await setDoc(ref, { fcm_token: null, device_type: null }, { merge: true });   // dispositivo collegato con la versione precedente
        } else {
            // toglie solo il token di questo dispositivo: gli altri dispositivi dello stesso account restano collegati
            const snap = await getDocFromServer(ref);
            const dati = snap.exists() ? snap.data() : {};
            const restanti = (Array.isArray(dati.fcm_tokens) ? dati.fcm_tokens : []).filter((x) => x !== mio);
            const aggiornamento = { fcm_tokens: arrayRemove(mio) };
            if (dati.fcm_token === mio || !dati.fcm_token) aggiornamento.fcm_token = restanti.length ? restanti[0] : null;
            await setDoc(ref, aggiornamento, { merge: true });
            localStorage.removeItem('fcm_token_dispositivo');
        }
    }
    if (isWebPush()) {
        try { await deleteToken(getMessaging(app)); }
        catch (e) { console.warn("Service worker non presente", e); }
    }
}

// Tiene aggiornati nel profilo la rotazione (serve al server per gli avvisi mirati)
// e, al primo collegamento, attiva di default gli annunci della bacheca.
async function sincronizzaProfiloNotifiche(primoCollegamento) {
    if (!auth.currentUser) return;
    const dati = {};
    const rotazione = rotazioneDaProfiloLocale();
    const profilo = window.currentUserData || {};
    if (rotazione && profilo.rotazione_notifiche !== rotazione) dati.rotazione_notifiche = rotazione;

    const prefs = profilo.preferenze_notifiche || {};
    if (primoCollegamento && prefs.bacheca_utility === undefined) {
        dati.preferenze_notifiche = { bacheca_utility: true };
    }
    if (Object.keys(dati).length === 0) return;

    await setDoc(doc(db, "utenti", auth.currentUser.uid), dati, { merge: true });
    if (window.currentUserData) {
        if (dati.rotazione_notifiche) window.currentUserData.rotazione_notifiche = dati.rotazione_notifiche;
        if (dati.preferenze_notifiche) window.currentUserData.preferenze_notifiche = { ...prefs, ...dati.preferenze_notifiche };
    }
    const prefUtility = document.getElementById('pref-notif-utility');
    if (prefUtility && dati.preferenze_notifiche) prefUtility.checked = true;
}

window.inizializzaNotificheSeNativa = async (userData) => {
    if (!isNativePush() && !isWebPush()) return;
    document.getElementById('native-notifications-center').style.display = 'block';

    const prefUtility = document.getElementById('pref-notif-utility');
    if (prefUtility) prefUtility.checked = !!(userData && userData.preferenze_notifiche && userData.preferenze_notifiche.bacheca_utility);

    registraListenerNativo();
    registraListenerPrimoPiano();

    // Attive solo se il dispositivo risulta collegato (token nel profilo) e il permesso e' ancora concesso
    let permessoOk = false;
    try {
        permessoOk = isNativePush()
            ? (await window.Capacitor.Plugins.PushNotifications.checkPermissions()).receive === 'granted'
            : Notification.permission === 'granted';
    } catch (e) { permessoOk = false; }

    // Il dispositivo e' collegato se il suo token e' nell'elenco; chi si era collegato con la versione precedente ha solo fcm_token
    const mio = localStorage.getItem('fcm_token_dispositivo');
    const tokens = userData && Array.isArray(userData.fcm_tokens) ? userData.fcm_tokens : [];
    const registrato = mio ? (tokens.includes(mio) || (userData && userData.fcm_token === mio)) : !!(userData && userData.fcm_token);
    const attive = !!(permessoOk && registrato);
    mostraStatoNotifiche(attive);

    if (attive) {
        // Rinnova il token in silenzio e aggiorna la rotazione
        try { await collegaDispositivo(); await sincronizzaProfiloNotifiche(false); }
        catch (e) { console.warn("Aggiornamento notifiche non riuscito:", e); }
    }
};

window.cambiaNotificheGenerali = async (attiva) => {
    const toggle = document.getElementById('toggle-notifiche-generale');
    const statusText = document.getElementById('notif-status-text');
    if (toggle) toggle.disabled = true;
    if (statusText) {
        statusText.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Un momento...";
        statusText.style.color = "var(--text-muted)";
    }

    try {
        if (attiva) {
            const collegato = await collegaDispositivo();
            if (collegato) {
                await sincronizzaProfiloNotifiche(true);
                mostraStatoNotifiche(true);
            } else {
                mostraStatoNotifiche(false);
                if (statusText) {
                    statusText.innerHTML = "<i class='fa-solid fa-xmark'></i> Permesso negato: attivalo dalle impostazioni del dispositivo o del browser.";
                    statusText.style.color = "var(--danger)";
                }
            }
        } else {
            await scollegaDispositivo();
            mostraStatoNotifiche(false);
        }
    } catch (error) {
        console.error("Errore gestione notifiche:", error);
        mostraStatoNotifiche(!attiva);
        if (statusText) {
            statusText.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore, riprova.";
            statusText.style.color = "var(--danger)";
        }
    } finally {
        if (toggle) toggle.disabled = false;
    }
};

window.salvaPreferenzeNotifiche = async () => {
    if (!auth.currentUser) return;
    const prefUtility = document.getElementById('pref-notif-utility');
    const attivo = prefUtility.checked;
    try {
        // merge: aggiorna solo questa preferenza e lascia intatte le altre
        await setDoc(doc(db, "utenti", auth.currentUser.uid), { preferenze_notifiche: { bacheca_utility: attivo } }, { merge: true });
        if (window.currentUserData) {
            window.currentUserData.preferenze_notifiche = { ...(window.currentUserData.preferenze_notifiche || {}), bacheca_utility: attivo };
        }
    } catch (error) {
        console.error("Errore salvataggio preferenze notifiche:", error);
        prefUtility.checked = !attivo;
    }
};

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
        
        let foldersMap = {};
        let visualIndex = 0; // <-- NUOVO CONTATORE AGGIUNTO QUI

        window.DYNAMIC_APPS.forEach((app) => { // <-- Tolto l'index dal ciclo
            const cond = app.conditions || [app.condition].filter(Boolean);
            const excl = app.excludeConditions || [];
            const isVisibleByCond = () => {
                if(excl.includes('admin') && globalIsAdmin) return false;
                if(globalIsAdmin) return true;
                if(excl.includes('vip') && globalIsVip) return false;
                if(excl.includes('collab') && globalIsCollab) return false;
                if(!cond || cond.length === 0) return true; 
                if(cond.includes('vip') && (globalIsVip || globalIsCollab)) return true;
                if(cond.includes('collab') && globalIsCollab) return true;
                if(cond.includes('tutti')) return true;
                return false;
            };

            if(!isVisibleByCond()) return;
            
            if (app.folder) {
                if (!foldersMap[app.folder]) {
                    foldersMap[app.folder] = { count: 0, element: null };
                    
                    const btn = document.createElement('div');
                    btn.className = 'app-btn';
                    btn.dataset.folder = app.folder;
                    // Usa visualIndex invece di index
                    btn.style.animationDelay = `${visualIndex * 0.04}s`; 
                    visualIndex++; // <-- Incrementa solo quando disegni la cartella
                    
                    btn.style.cursor = 'pointer';
                    btn.onclick = () => window.apriCartella(app.folder);
                    
                    // Contenitore cartella con CSS Grid 2x2 esatto
                    btn.innerHTML = `
                        <div class="app-icon folder-grid" style="background-color: var(--surface-hover); border: 2px solid var(--border-color); display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px; padding: 8px; box-sizing: border-box; align-items: center; justify-items: center; position: relative;">
                            <div class="app-notif-badge" data-badge-folder="${app.folder}" style="display:none; position:absolute; top:-4px; right:-4px; background:#e53935; color:#fff; font-size:10px; font-weight:800; min-width:18px; height:18px; line-height:18px; padding:0 4px; border-radius:9px; text-align:center; z-index:2; box-shadow:0 0 0 2px var(--surface);"></div>
                        </div>
                        <div class="app-label">${app.folder}</div>
                    `;
                    
                    foldersMap[app.folder].element = btn;
                    container.appendChild(btn);
                }
                
                // Aggiunge solo le prime 4 icone per l'anteprima esterna
                if (foldersMap[app.folder].count < 4) {
                    const grid = foldersMap[app.folder].element.querySelector('.folder-grid');
                    const finalColor = app.defaultColor || "#0066cc";
                    grid.insertAdjacentHTML('beforeend', `
                        <div style="background-color: ${finalColor}; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; width: 100%; height: 100%; box-shadow: var(--shadow-sm);">
                            <i class="${app.icon || 'fa-solid fa-link'}"></i>
                        </div>
                    `);
                    foldersMap[app.folder].count++;
                }
            } else {
                const finalColor = app.defaultColor || "#0066cc";
                
                const btn = document.createElement('div');
                btn.className = 'app-btn';
                btn.dataset.id = app.id;
                // Usa visualIndex invece di index
                btn.style.animationDelay = `${visualIndex * 0.04}s`;
                visualIndex++; // <-- Incrementa quando disegni un'app normale
                
                btn.style.cursor = 'pointer';
                
                btn.innerHTML = `
                    <div class="app-icon" style="background-color: ${finalColor}; position: relative;">
                        <i class="${app.icon || 'fa-solid fa-link'}"></i>
                        <div class="app-notif-badge" data-badge-appid="${app.id}" style="display:none; position:absolute; top:-4px; right:-4px; background:#e53935; color:#fff; font-size:10px; font-weight:800; min-width:18px; height:18px; line-height:18px; padding:0 4px; border-radius:9px; text-align:center; box-shadow:0 0 0 2px var(--surface);"></div>
                    </div>
                    <div class="app-label">${app.label.replace(/\n/g, '<br>')}</div>
                `;
                
                container.appendChild(btn);
            }
        });

        window.sincronizzaBadgeDOM();

        setTimeout(() => {
            if(window.controllaBacheca) window.controllaBacheca();
            if(window.aggiornaTuttiIBadge) window.aggiornaTuttiIBadge();
        }, 200);
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

window.apriModal = (id, authMode) => { 
    document.getElementById(id).style.display = 'flex'; 
    if(id === 'authModal' && authMode) { 
        currentAuthMode = authMode; 
        window.aggiornaUIAuth(); 
    }
    
    if (id === 'profileModal' && window.currentUserData) {
        if (auth.currentUser) document.getElementById('profileEmail').value = auth.currentUser.email || '';
        document.getElementById('profileNome').value = window.currentUserData.nome || '';
        document.getElementById('profileCognome').value = window.currentUserData.cognome || '';
        document.getElementById('profileMatricola').value = window.currentUserData.matricola || '';
        document.getElementById('profileProgressivo').value = window.currentUserData.progressivo || '';
        document.getElementById('profileSoprannome').value = window.currentUserData.soprannome || '';
        document.getElementById('profileTelefono').value = window.currentUserData.telefono || '';
        document.getElementById('profileMansione').value = window.currentUserData.mansione || '';
    }
};

window.chiudiModal = (id) => { document.getElementById(id).style.display = 'none'; };
window.chiudiSuSfondo = (e, id) => { if (e.target.id === id) window.chiudiModal(id); };

// ============================================================================
// GESTIONE ACCESSI E VIP
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
        
        if (bTot) bTot.innerText = tot; 
        if (bOggi) bOggi.innerText = oggi;
        window.renderGestioneAccessi();

    } catch(e) { container.innerHTML = "<div style='color:var(--danger); text-align:center;'><i class='fa-solid fa-triangle-exclamation'></i> Errore.</div>"; }
};

window.renderGestioneAccessi = () => {
    const container = document.getElementById('lista-utenti-accessi');
    const sortMode = document.getElementById('sort-utenti-app') ? document.getElementById('sort-utenti-app').value : 'recente';
    const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
    const oggiStr = formatterDate.format(new Date());
    
    let dataCopy = [...window.utentiArrayCache];

    const nIncompleti = dataCopy.filter(u => !profiloCompleto(u)).length;
    const optInc = document.querySelector('#sort-utenti-app option[value="incompleti"]');
    if (optInc) optInc.textContent = `Profilo incompleto (${nIncompleti})`;
    if (sortMode === 'incompleti') dataCopy = dataCopy.filter(u => !profiloCompleto(u));

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
        
        let roleBadge = "";
        if(u.ruolo === 'admin') roleBadge = " <span style='background:red;color:white;padding:2px 5px;border-radius:4px;font-size:10px;margin-left:5px;'>ADMIN</span>";
        if(u.ruolo === 'collaborator') roleBadge = " <span style='background:#6f42c1;color:white;padding:2px 5px;border-radius:4px;font-size:10px;margin-left:5px;'>COLLAB</span>";
        if(u.ruolo === 'collab-mappe') roleBadge = " <span style='background:#0d9488;color:white;padding:2px 5px;border-radius:4px;font-size:10px;margin-left:5px;'>COLLAB MAPPE</span>";
        if(u.ruolo === 'vip') roleBadge = " <span style='background:gold;color:black;padding:2px 5px;border-radius:4px;font-size:10px;margin-left:5px;'>VIP</span>";

        const incBadge = profiloCompleto(u) ? '' : " <span style='background:var(--danger);color:white;padding:2px 5px;border-radius:4px;font-size:10px;margin-left:5px;'>INCOMPLETO</span>";
        const dot = isOggi ? `<span style="display:inline-block; width:8px; height:8px; background:var(--success); border-radius:50%; margin-left:8px; box-shadow: 0 0 5px rgba(15,157,88,0.5);"></span>` : '';
        const clickableName = `<span style="font-weight:700; font-size:14px; cursor:pointer; color:var(--primary); text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'" onclick="window.apriDettaglioUtente('${u.uid}')">${fullName}${roleBadge}${incBadge}</span>`;
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
    
    if (window.filtraUtentiApp) window.filtraUtentiApp();
};

window.filtraUtentiApp = () => {
    let input = document.getElementById('search-utenti-app');
    if (!input) return;
    let filter = input.value.toUpperCase();
    let rows = document.getElementsByClassName('utente-row-app');
    for (let i = 0; i < rows.length; i++) {
        let txtValue = rows[i].getAttribute('data-search');
        if (txtValue.indexOf(filter) > -1) rows[i].style.display = "flex";
        else rows[i].style.display = "none";
    }
};

window.toggleAppBan = async (uid, status) => { 
    if(confirm("Confermi l'azione?")) { 
        await setDoc(doc(db, "utenti", uid), { app_banned: status }, { merge: true }); 
        window.apriGestioneAccessi(); 
    } 
};

window.apriDettaglioUtente = (uid) => {
    const u = window.utentiMap[uid]; if(!u) return;
    const isCollab = u.ruolo === 'collaborator';
    const isCollabMappe = u.ruolo === 'collab-mappe';
    const isVip = u.ruolo === 'vip';
    
    document.getElementById('dettaglio-utente-body').innerHTML = `
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-user" style="color:var(--primary); width:16px;"></i> <strong>Nome:</strong> ${u.nome || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-regular fa-user" style="color:var(--primary); width:16px;"></i> <strong>Cognome:</strong> ${u.cognome || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-hashtag" style="color:var(--primary); width:16px;"></i> <strong>Matricola:</strong> ${u.matricola || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-tag" style="color:var(--primary); width:16px;"></i> <strong>Omonimia:</strong> ${u.progressivo || '-'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-envelope" style="color:var(--primary); width:16px;"></i> <strong>Email:</strong> ${u.email || 'Non registrata'}</div>
        <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-phone" style="color:var(--primary); width:16px;"></i> <strong>Telefono:</strong> ${u.telefono || 'Non registrato'}</div>
        <div style="margin-bottom:5px; font-size:12px; color:var(--text-muted); word-break: break-all; margin-top:20px; border-top:1px solid var(--border-color); padding-top:10px;"><i class="fa-solid fa-fingerprint"></i> <strong>ID Account:</strong> ${u.uid || '-'}</div>`;
    
    const btnCollab = document.getElementById('btn-rendi-collab');
    if (btnCollab) {
        if (isCollab) { 
            btnCollab.innerHTML = "<i class='fa-solid fa-user-minus'></i> Revoca Collaboratore"; btnCollab.style.background = "transparent"; btnCollab.style.color = "var(--danger)"; btnCollab.style.border = "2px solid var(--danger)"; btnCollab.onclick = () => window.cambiaRuoloUtente(uid, 'user'); 
        } else { 
            btnCollab.innerHTML = "<i class='fa-solid fa-user-shield'></i> Rendi Collaboratore"; btnCollab.style.background = "#6f42c1"; btnCollab.style.color = "white"; btnCollab.style.border = "none"; btnCollab.onclick = () => window.cambiaRuoloUtente(uid, 'collaborator'); 
        }
    }

    const btnCollabMappe = document.getElementById('btn-rendi-collab-mappe');
    if (btnCollabMappe) {
        if (isCollabMappe) {
            btnCollabMappe.innerHTML = "<i class='fa-solid fa-user-minus'></i> Revoca Collaboratore Mappe"; btnCollabMappe.style.background = "transparent"; btnCollabMappe.style.color = "var(--danger)"; btnCollabMappe.style.border = "2px solid var(--danger)"; btnCollabMappe.onclick = () => window.cambiaRuoloUtente(uid, 'user');
        } else {
            btnCollabMappe.innerHTML = "<i class='fa-solid fa-map-location-dot'></i> Rendi Collaboratore Mappe"; btnCollabMappe.style.background = "#0d9488"; btnCollabMappe.style.color = "white"; btnCollabMappe.style.border = "none"; btnCollabMappe.onclick = () => window.cambiaRuoloUtente(uid, 'collab-mappe');
        }
    }

    document.getElementById('dettaglio-utente-body').insertAdjacentHTML('beforeend', `
        <button class="btn-modal" style="background:${isVip?'transparent':'gold'}; color:${isVip?'var(--danger)':'black'}; border:1px solid ${isVip?'var(--danger)':'gold'}; margin-top:15px; margin-bottom:5px; display:flex; align-items:center; justify-content:center; gap:6px; width: 100%;" onclick="window.cambiaRuoloUtente('${uid}', '${isVip?'user':'vip'}')"><i class="fa-solid fa-star"></i> ${isVip?'Revoca VIP':'Rendi VIP'}</button>
        <button class="btn-modal" style="background: #ff9800; color: white; margin-top:5px; margin-bottom:5px; display:flex; align-items:center; justify-content:center; gap:6px; width: 100%;" onclick="window.apriEditorAdminUtente('${uid}')"><i class="fa-solid fa-pen"></i> Correggi Dati Utente</button>
    `);
    
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

window.cambiaRuoloUtente = async (uid, nuovoRuolo) => { 
    if(!confirm("Confermi il cambio ruolo?")) return; 
    try { 
        await setDoc(doc(db, "utenti", uid), { ruolo: nuovoRuolo }, { merge: true }); 
        window.utentiMap[uid].ruolo = nuovoRuolo; 
        window.chiudiModal('modal-dettaglio-utente'); 
        alert("Ruolo aggiornato!"); 
        window.renderGestioneAccessi();
    } catch(e) { alert("Errore."); } 
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
                    <label style="font-size:11px;">Repo (utente/repo):</label><input type="text" id="dev-gh-repo" class="input-field" style="margin-bottom:10px;">
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
                        <label style="font-size:12px; font-weight:700; display:block; margin-bottom:5px;">Visibilità:</label>
                        <label style="display:block; font-size:13px; margin-bottom:4px;"><input type="checkbox" class="chk-cond" value="admin"> Solo Admin</label>
                        <label style="display:block; font-size:13px; margin-bottom:4px;"><input type="checkbox" class="chk-cond" value="vip"> VIP</label>
                        <label style="display:block; font-size:13px; margin-bottom:4px;"><input type="checkbox" class="chk-cond" value="collab"> Collaboratori</label>
                        <label style="display:block; font-size:13px;"><input type="checkbox" class="chk-cond" value="tutti"> Tutti (Pubblica)</label>
                    </div>

                    <div style="background:var(--surface-hover); padding:10px; border-radius:8px; margin-bottom:15px;">
                        <label style="font-size:12px; font-weight:700; display:block; margin-bottom:5px;">Nascondi comunque a (es. per evitare doppioni tra versione lite e completa):</label>
                        <label style="display:block; font-size:13px; margin-bottom:4px;"><input type="checkbox" class="chk-excl" value="vip"> Nascondi ai VIP</label>
                        <label style="display:block; font-size:13px; margin-bottom:4px;"><input type="checkbox" class="chk-excl" value="collab"> Nascondi ai Collaboratori</label>
                        <label style="display:block; font-size:13px;"><input type="checkbox" class="chk-excl" value="admin"> Nascondi agli Admin</label>
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
            </div>
            
            <div id="modal-sposta-cartella" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-sposta-cartella')">
                <div class="modal-content">
                    <h2 style="margin-top: 0; color: var(--primary);">Sposta in Raccolta</h2>
                    <input type="hidden" id="sposta-app-id">
                    <label style="font-size:12px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:8px;">Seleziona posizione:</label>
                    <select id="sposta-folder-select" class="input-field" style="margin-bottom:10px;" onchange="if(this.value==='new') document.getElementById('sposta-new-folder').style.display='block'; else document.getElementById('sposta-new-folder').style.display='none';">
                    </select>
                    <input type="text" id="sposta-new-folder" class="input-field" placeholder="Nome nuova raccolta" style="display:none; margin-bottom:10px;">
                    
                    <button class="btn-modal" style="background:var(--success); color:white;" onclick="window.salvaSpostamentoCartella()"><i class="fa-solid fa-check"></i> Conferma Spostamento</button>
                </div>
            </div>`);
        }
    }
    document.getElementById('gh-pat').value = localStorage.getItem('gh_pat') || '';
    document.getElementById('dev-gh-repo').value = localStorage.getItem('gh_repo') || '';
    document.getElementById('admin-settings-panel').style.display = 'block';
};

window.salvaGHCreds = () => {
    localStorage.setItem('gh_pat', document.getElementById('gh-pat').value);
    localStorage.setItem('gh_repo', document.getElementById('dev-gh-repo').value);
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
    document.querySelectorAll('.chk-excl').forEach(c => c.checked = false);
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
    
    const excls = app.excludeConditions || [];
    document.querySelectorAll('.chk-excl').forEach(c => { c.checked = excls.includes(c.value); });
    
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
    const checkedExcl = Array.from(document.querySelectorAll('.chk-excl:checked')).map(c => c.value);
    
    let appObj = {
        id: id,
        label: document.getElementById('add-label').value,
        icon: document.getElementById('add-icon').value,
        defaultColor: document.getElementById('add-color').value,
        conditions: checkedConds,
        excludeConditions: checkedExcl
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
        if(idx !== -1) {
            if (currentApps[idx].folder) appObj.folder = currentApps[idx].folder;
            currentApps[idx] = appObj;
        } else currentApps.push(appObj);
    } else {
        currentApps.push(appObj);
    }
    
    if(await window.pushToGitHub(currentApps)) window.chiudiModal('modal-add-app');
};

window.apriModalReorderApp = () => {
    const cont = document.getElementById('reorder-list');
    cont.innerHTML = window.DYNAMIC_APPS.map((a, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--surface-hover); border-radius:8px; margin-bottom:5px;">
            <span style="display:flex; align-items:center; flex-wrap:wrap; gap:8px;">
                <i class="${a.icon}" style="color:${a.defaultColor};"></i> 
                ${a.label}
                ${a.folder ? `<span style="font-size:10px; background:var(--primary); color:white; padding:2px 6px; border-radius:10px;"><i class="fa-solid fa-folder"></i> ${a.folder}</span>` : ''}
            </span>
            <div style="display:flex; gap:5px;">
                <button class="btn-modal" style="background:#17a2b8; color:white; padding:5px 10px; font-size:12px; margin:0; width:auto;" onclick="window.apriSpostaInCartella('${a.id}')" title="Gestisci Raccolta"><i class="fa-solid fa-folder-open"></i></button>
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
// GESTIONE SICUREZZA ACCOUNT
// ============================================================================
window.eliminaAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const conferma = confirm("ATTENZIONE: Questa azione è IRREVERSIBILE. Tutti i tuoi dati e il tuo account verranno eliminati definitivamente. Sei sicuro di voler procedere?");
    if (!conferma) return;

    const confermaDefinitiva = confirm("Sei veramente sicuro? Cliccando OK il tuo account verrà distrutto in modo permanente.");
    if (!confermaDefinitiva) return;

    try {
        // 1. Elimina il profilo da Firestore (con copia di sicurezza)
        const refUtente = doc(db, "utenti", user.uid);
        let backupProfilo = null;
        try { backupProfilo = (await getDoc(refUtente)).data() || null; } catch (e) {}
        await deleteDoc(refUtente);
        
        // 2. Elimina l'utente da Firebase Authentication
        try { await deleteUser(user); }
        catch (e) {
            // Se l'eliminazione dell'account fallisce (es. login non recente) il profilo viene ripristinato,
            // altrimenti resterebbe un account senza dati
            if (backupProfilo) { try { await setDoc(refUtente, backupProfilo); } catch (e2) {} }
            throw e;
        }
        
        alert("Account eliminato con successo. Arrivederci.");
        window.location.reload();
    } catch (error) {
        console.error("Errore durante l'eliminazione dell'account:", error);
        // Firebase richiede un login recente per operazioni sensibili come l'eliminazione dell'account
        if (error.code === 'auth/requires-recent-login') {
            alert("Per motivi di sicurezza, devi effettuare nuovamente l'accesso prima di poter eliminare il tuo account. Effettua il logout, accedi di nuovo e riprova.");
        } else {
            alert("Si è verificato un errore durante l'eliminazione dell'account: " + error.message);
        }
    }
};

window.resetPasswordUtenteAutenticato = async () => {
    const user = auth.currentUser;
    
    if (!user || !user.email) {
        alert("Errore: Impossibile trovare un'email associata a questo account.");
        return;
    }

    const conferma = confirm(`Vuoi ricevere un'email all'indirizzo ${user.email} per reimpostare la tua password?`);
    if (!conferma) return;

    try {
        await sendPasswordResetEmail(auth, user.email);
        alert(`Email inviata con successo a ${user.email}. Controlla la tua casella di posta (anche nella cartella Spam) e segui il link per cambiare password.`);
    } catch (error) {
        console.error("Errore durante l'invio dell'email di reset:", error);
        alert("Si è verificato un errore durante l'invio dell'email: " + error.message);
    }
};



// ============================================================================
// SCHERMO SEMPRE ACCESO (Wake Lock) - GPS, BateoLive, BateoLive Lite
// Si attiva da solo quando uno dei 3 modali è visibile e si rilascia alla chiusura,
// qualunque sia il pulsante usato per chiuderlo (nessuna modifica ai moduli).
// ============================================================================
const WakeLockModuli = {
    modaliIds: ['modal-gps-main', 'modal-bateolive-main', 'modal-navigatore-main'],
    sentinel: null,
    inRichiesta: false,
    osservati: new Set(),

    inUso() {
        return this.modaliIds.some(id => {
            const el = document.getElementById(id);
            return !!el && getComputedStyle(el).display !== 'none';
        });
    },

    async sync() {
        if (!('wakeLock' in navigator)) return;

        if (this.inUso()) {
            if (this.sentinel || this.inRichiesta || document.visibilityState !== 'visible') return;
            this.inRichiesta = true;
            try {
                const lock = await navigator.wakeLock.request('screen');
                lock.addEventListener('release', () => { if (this.sentinel === lock) this.sentinel = null; });
                this.sentinel = lock;
                // il modale potrebbe essere stato chiuso mentre aspettavamo
                if (!this.inUso()) await this.rilascia();
            } catch (e) {
                console.warn('Wake Lock non disponibile:', e);
            } finally {
                this.inRichiesta = false;
            }
        } else {
            await this.rilascia();
        }
    },

    async rilascia() {
        const lock = this.sentinel;
        this.sentinel = null;
        if (lock) { try { await lock.release(); } catch (e) {} }
    },

    osserva() {
        this.modaliIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el || this.osservati.has(id)) return;
            this.osservati.add(id);
            new MutationObserver(() => this.sync()).observe(el, { attributes: true, attributeFilter: ['style'] });
        });
        this.sync();
    },

    init() {
        // i modali vengono creati al primo avvio del modulo (lazy-load): li agganciamo appena compaiono nel body
        this.osserva();
        const bodyObs = new MutationObserver(() => {
            this.osserva();
            if (this.osservati.size === this.modaliIds.length) bodyObs.disconnect();
        });
        bodyObs.observe(document.body, { childList: true });

        // il browser rilascia il lock quando la pagina va in background: lo richiediamo al ritorno
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.sync();
        });
    }
};
WakeLockModuli.init();

// ============================================================================
// CONTROLLO PROFILO OBBLIGATORIO (Nome, Cognome, Matricola)
// ============================================================================
// La matricola è un numero di 4 cifre (si conserva come testo, per non perdere gli zeri iniziali).
// Regola: la finestra dei dati obbligatori compare SOLO se la lettura dal server
// è riuscita E mancano davvero dei campi. Se il server non è raggiungibile
// (rete debole, PWA appena risvegliata, offline) non si chiede nulla.
const profiloCompleto = (d) => !!(d && String(d.nome || '').trim() && String(d.cognome || '').trim() && /^\d{4}$/.test(String(d.matricola ?? '').trim()));
window.profiloCompleto = profiloCompleto;

async function caricaProfiloDalServer(uid) {
    for (let i = 1; i <= 3; i++) {
        try { return await getDocFromServer(doc(db, "utenti", uid)); }
        catch (e) { await new Promise(r => setTimeout(r, 1000 * i)); }
    }
    return null; // irraggiungibile ≠ profilo incompleto
}

window.apriDatiObbligatori = (dati = {}) => {
    const set = (id, v) => { const el = document.getElementById(id); if (el && !el.value) el.value = v || ''; };
    set('obbl-nome', dati.nome); set('obbl-cognome', dati.cognome);
    set('obbl-matricola', dati.matricola); set('obbl-prog', dati.progressivo);
    window.apriModal('modal-dati-obbligatori');
};

// Restituisce i dati letti dal server, oppure null se non raggiungibile.
// Apre la finestra obbligatoria solo se il profilo è davvero incompleto.
window.verificaProfilo = async (user) => {
    const snap = await caricaProfiloDalServer(user.uid);
    if (!snap) return null;
    const dati = snap.exists() ? snap.data() : {};
    // Durante la registrazione il profilo viene scritto subito dopo la creazione dell'account
    if (!window.profiloInRegistrazione && !profiloCompleto(dati)) window.apriDatiObbligatori(dati);
    return dati;
};

// ============================================================================
// AUTH E START
// ============================================================================
onAuthStateChanged(auth, async (user) => {
    const vLoad = document.getElementById('view-loading'); const vGuest = document.getElementById('view-guest'); const vApp = document.getElementById('view-app');
    
    if (user) {
        vLoad.style.display = 'none'; vGuest.style.display = 'none'; vApp.style.display = 'flex';
        document.getElementById('btnOpenLogin').style.display = 'none'; 
        document.getElementById('btnOpenProfile').style.display = 'flex';

        const cacheKey = `userDataCache_haze_${user.uid}`;
        try { localStorage.removeItem('userDataCache_haze'); } catch(e) {} // vecchia cache condivisa tra account
        let cachedData = {}; try { cachedData = JSON.parse(localStorage.getItem(cacheKey)) || {}; } catch(e) {}
        
        globalIsAdmin = (user.uid === ADMIN_UID); 
        globalIsCollab = cachedData.ruolo === 'collaborator';
        globalIsVip = cachedData.ruolo === 'vip';
        
        if(globalIsAdmin) { 
            const admBadge = document.getElementById('adminBadge');
            if (admBadge) admBadge.style.display = 'block'; 
            
            const menuAdm = document.getElementById('menu-admin');
            if (menuAdm) menuAdm.style.display = 'flex'; 
            
            window.injectAdminConfigTools();
        }

        window.LayoutEngine.init();

        try {
            const dati = await window.verificaProfilo(user); // null se il server non è raggiungibile
            let safeData = { ...cachedData, ...(dati || {}), ...(window.profiloInRegistrazione || {}) };
            window.currentUserData = safeData; 
            globalIsCollab = safeData.ruolo === 'collaborator';
            globalIsVip = safeData.ruolo === 'vip';

            localStorage.setItem(cacheKey, JSON.stringify(safeData));

            const oggiLog = new Date();
            const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
            const oggiLogStr = formatterDate.format(oggiLog);

            const profiloOk = !window.profiloInRegistrazione && profiloCompleto(safeData);
            if (profiloOk && (safeData.last_app_access !== oggiLogStr || !safeData.email)) {
                setDoc(doc(db, "utenti", user.uid), { last_app_access: oggiLogStr, last_access_full: oggiLog.toISOString(), email: user.email }, { merge: true }).catch(() => {});
            }

            if (profiloOk && window.inizializzaNotificheSeNativa) window.inizializzaNotificheSeNativa(safeData);
        } catch(e) {}
    } else { 
        vLoad.style.display = 'none'; window.LayoutEngine.init(); vGuest.style.display = 'flex'; vApp.style.display = 'none';
    }
});

// ============================================================================
// GESTIONE RACCOLTE (CARTELLE)
// ============================================================================
window.apriSpostaInCartella = (appId) => {
    const app = window.DYNAMIC_APPS.find(a => a.id === appId);
    if(!app) return;
    document.getElementById('sposta-app-id').value = appId;
    
    const folders = [...new Set(window.DYNAMIC_APPS.map(a => a.folder).filter(Boolean))];
    const select = document.getElementById('sposta-folder-select');
    select.innerHTML = '<option value="">Main (Pagina Principale)</option>';
    folders.forEach(f => {
        select.insertAdjacentHTML('beforeend', `<option value="${f}">${f}</option>`);
    });
    select.insertAdjacentHTML('beforeend', '<option value="new">+ Nuova Raccolta al momento...</option>');
    
    select.value = (app.folder && folders.includes(app.folder)) ? app.folder : "";
    document.getElementById('sposta-new-folder').style.display = 'none';
    document.getElementById('sposta-new-folder').value = '';
    
    window.apriModal('modal-sposta-cartella');
};

window.salvaSpostamentoCartella = async () => {
    const appId = document.getElementById('sposta-app-id').value;
    let folder = document.getElementById('sposta-folder-select').value;
    
    if (folder === 'new') {
        folder = document.getElementById('sposta-new-folder').value.trim();
        if (!folder) return alert("Inserisci il nome della nuova raccolta.");
    }
    
    const appIndex = window.DYNAMIC_APPS.findIndex(a => a.id === appId);
    if (appIndex > -1) {
        if (folder === "") delete window.DYNAMIC_APPS[appIndex].folder;
        else window.DYNAMIC_APPS[appIndex].folder = folder;
        
        if(await window.pushToGitHub(window.DYNAMIC_APPS)) {
            window.chiudiModal('modal-sposta-cartella');
            window.apriModalReorderApp();
            window.LayoutEngine.render();
        }
    }
};


window.apriCartella = (folderName) => {
    document.getElementById('folder-modal-title').innerText = folderName;
    const container = document.getElementById('folder-app-container');
    container.innerHTML = '';

    const apps = window.DYNAMIC_APPS.filter(a => a.folder === folderName);
    apps.forEach((app, index) => {
        const cond = app.conditions || [app.condition].filter(Boolean);
        const excl = app.excludeConditions || [];
        const isExcluded = (excl.includes('admin') && globalIsAdmin) ||
                          (!globalIsAdmin && (
                          (excl.includes('vip') && globalIsVip) ||
                          (excl.includes('collab') && globalIsCollab)));
        const isVisible = !isExcluded && (
                          (globalIsAdmin) || (!cond || cond.length === 0) || 
                          (cond.includes('vip') && (globalIsVip || globalIsCollab)) || 
                          (cond.includes('collab') && globalIsCollab) || 
                          (cond.includes('tutti')));

        if(!isVisible) return;

        const finalColor = app.defaultColor || "#0066cc";
        const btn = document.createElement('div');
        btn.className = 'app-btn';
        btn.dataset.id = app.id;
        btn.style.animationDelay = `${index * 0.04}s`;
        btn.style.cursor = 'pointer';
        btn.innerHTML = `
            <div class="app-icon" style="background-color: ${finalColor}; position: relative;">
                <i class="${app.icon || 'fa-solid fa-link'}"></i>
                <div class="app-notif-badge" data-badge-appid="${app.id}" style="display:none; position:absolute; top:-4px; right:-4px; background:#e53935; color:#fff; font-size:10px; font-weight:800; min-width:18px; height:18px; line-height:18px; padding:0 4px; border-radius:9px; text-align:center; box-shadow:0 0 0 2px var(--surface);"></div>
            </div>
            <div class="app-label" style="font-size: 13px;">${app.label.replace(/\n/g, '<br>')}</div>
        `;
        btn.onclick = () => { window.chiudiModal('modal-folder-view'); window.eseguiAzioneApp(app.id); };
        container.appendChild(btn);
    });
    window.apriModal('modal-folder-view');
    window.sincronizzaBadgeDOM();
};
