import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMessaging, getToken, deleteToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";

// Importiamo tutti i sottomoduli della SPA
import { avviaMotoreAuth } from './auth.js';
import { avviaMotoreSegnalazioni } from './report.js';
import { avviaMotoreTurni } from './turni.js';
import { avviaMotoreOrari } from './orari.js';
import { avviaMotoreLink } from './link.js';
import { avviaMotoreDocumenti } from './documenti.js';
import { avviaMotoreContatti } from './contatti.js';
import { avviaMotoreBachecaUtility } from './bacheca_utility.js';
import { avviaMotoreRubrica } from './rubrica.js';
import { avviaMotoreBachecaTurni } from './bacheca_turni.js';
import { avviaMotoreBarcadvisor } from './barcadvisor.js';
import { avviaMotoreBuoniPasto } from './buoni_pasto.js';

// Importiamo tutte le interfacce UI estratte
import { initUIBuoniPasto } from './ui_buoniPasto.js';
import { initUITurni } from './ui_turni.js';
import { initUIBachecaTurni } from './ui_bacheca_turni.js';
import { initUIBarcadvisor } from './ui_barcadvisor.js';
import { initUIBachecaUtility } from './ui_bacheca_utility.js';
import { initUIContatti } from './ui_contatti.js';
import { initUIDocumenti } from './ui_documenti.js';
import { initUILink } from './ui_link.js';
import { initUIOrari } from './ui_orari.js';
import { initUISegnalazioni } from './ui_report.js';
import { initUIRubrica } from './ui_rubrica.js';

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

// Inizializziamo le UI nel DOM
initUIBuoniPasto();
initUITurni();
initUIBachecaTurni();
initUIBarcadvisor();
initUIBachecaUtility();
initUIContatti();
initUIDocumenti();
initUILink();
initUIOrari();
initUISegnalazioni();
initUIRubrica();

// Inizializziamo il sottomodulo di Autenticazione e Profilo
avviaMotoreAuth(auth, db, provider);

const ADMIN_UID = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2"; 
const COLLABORATORE_UIDS = ["INSERISCI_QUI_UID_1", "INSERISCI_QUI_UID_2"]; 

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

const ICON_MAP = {
    oggi: "fa-solid fa-bullseye", calendario: "fa-solid fa-calendar-days", statistiche: "fa-solid fa-chart-simple",
    rotazioni: "fa-solid fa-users", turni: "fa-solid fa-rotate", bachecaturni: "fa-solid fa-handshake-angle",
    rubrica: "fa-solid fa-address-book", ferie: "fa-solid fa-umbrella-beach", orari: "fa-regular fa-clock",
    documenti: "fa-solid fa-file-lines", link: "fa-solid fa-link", contatti: "fa-solid fa-id-card",
    buoni: "fa-solid fa-utensils", promemoria: "fa-solid fa-stopwatch", dds: "fa-solid fa-box-archive",
    report: "fa-solid fa-headset", impostazioni: "fa-solid fa-gear", guida: "fa-solid fa-book", admin: "fa-solid fa-lock", accessi: "fa-solid fa-users-gear"
};

const EMOJI_MAP = {
    oggi: "🎯", calendario: "📅", statistiche: "📊", rotazioni: "👥", turni: "🔄",
    bachecaturni: "🤝", rubrica: "📒", ferie: "⛱️", orari: "🕒", documenti: "📄",
    link: "🔗", contatti: "🪪", buoni: "🍽️", promemoria: "⏱️", dds: "🗃️",
    report: "🎧", impostazioni: "⚙️", guida: "📖", admin: "🔒", accessi: "👨‍💻"
};

const DEFAULT_APPS = [
    { id: "oggi", label: "Oggi", href: "calendario.html?oggi=true", defaultColor: "#28a745" },
    { id: "calendario", label: "Calendario", href: "calendario.html", defaultColor: "#0066cc" },
    { id: "statistiche", label: "Statistiche", href: "dati_calendario.html", defaultColor: "#6f42c1" },
    { id: "rotazioni", label: "Rotazioni", href: "rotazioni.html", defaultColor: "#fd7e14" },
    { id: "turni", label: "Turni", onclick: "window.apriModaleTurni()", defaultColor: "#20c997" },
    
    // Convertite a onclick per aprire le modali
    { id: "bachecaturni", label: "Bacheca\nTurni", onclick: "window.apriModaleBachecaTurni()", defaultColor: "#e83e8c" },
    { id: "barcadvisor", label: "BarcAdvisor", image: "icone_app/iconba.png", onclick: "window.apriModaleBarcadvisor()" },
    { id: "rubrica", label: "Rubrica", onclick: "window.apriModaleRubrica()", defaultColor: "#343a40" },
    
    { id: "ferie", label: "Rotazione\nFerie", href: "rotazione_ferie.html", defaultColor: "#ffc107" },
    { id: "orari", label: "Orari\nNavigaz.", onclick: "window.apriModaleOrari()", defaultColor: "#17a2b8" },
    { id: "chebateo", label: "CheBateo", image: "icone_app/iconcb.png", href: "https://m.chebateo.it/" },
    { id: "documenti", label: "Documenti", onclick: "window.apriModaleDocumenti()", defaultColor: "#6c757d" },
    { id: "link", label: "Link", onclick: "window.apriModaleLink()", defaultColor: "#495057" },
    { id: "contatti", label: "Contatti", onclick: "window.apriModaleContatti()", defaultColor: "#2c3e50" },
    
    // Convertito a onclick per aprire la modale
    { id: "buoni", label: "Buoni\nPasto", onclick: "window.apriModaleBuoniPasto()", defaultColor: "#d63384" },
    
    { id: "promemoria", label: "Promemoria", href: "promemoria.html", defaultColor: "#0dcaf0" },
    { id: "dds", label: "Archivio\nDDS", href: "dds.html", defaultColor: "#5856d6" },
    { id: "report", label: "Segnalazioni", onclick: "window.apriMainModaleSegnalazioni()", defaultColor: "#0088ff" },
    { id: "impostazioni", label: "Impostazioni", onclick: "window.apriModal('settingsModal')", defaultColor: "#8e8e93" },
    { id: "spriss", label: "Spriss", image: "icone_app/iconspriss.png", href: "https://spriss.avmspa.it/" },
    { id: "guida", label: "Guida", href: "guida.html", defaultColor: "#34c759" },
    { id: "admin", label: "Admin", href: "admin.html", condition: "admin", defaultColor: "#ff3b30" },
    { id: "accessi", label: "Accessi", onclick: "window.apriGestioneAccessi()", condition: "admin", defaultColor: "#1c1c1e" }
];

window.apriMenuLaterale = () => { 
    const s = document.getElementById('sidebar'); if(s) s.classList.add('open'); 
    const o = document.getElementById('sidebar-overlay'); if(o) o.style.display = 'block'; 
};
window.chiudiMenuLaterale = () => { 
    const s = document.getElementById('sidebar'); if(s) s.classList.remove('open'); 
    const o = document.getElementById('sidebar-overlay'); if(o) o.style.display = 'none'; 
};

window.apriMainModaleSegnalazioni = () => {
    window.apriModal('modal-segnalazioni-main');
    if (auth.currentUser) {
        avviaMotoreSegnalazioni(db, auth, auth.currentUser.uid, globalIsAdmin);
    }
};

window.avviaMotoreTurniDaIndex = () => {
    if (!auth.currentUser) { alert("Devi effettuare il login per accedere ai turni."); return; }
    if (window.currentUserData) {
        if (window.currentUserData.turni_banned === true) {
            alert("Il tuo accesso alla pagina Turni è stato temporaneamente revocato."); return;
        }
        if (!window.currentUserData.nome || !window.currentUserData.cognome || window.currentUserData.matricola === undefined || window.currentUserData.matricola === "") {
            alert("Devi prima completare il tuo profilo (Nome, Cognome e Matricola) per visualizzare i turni.");
            window.apriModal('profileModal'); return;
        }
    }
    avviaMotoreTurni();
    const oggiStr = new Date().toISOString().split('T')[0];
    if (window.currentUserData && (window.currentUserData.turni_access !== true || window.currentUserData.last_turni_access !== oggiStr)) {
        setDoc(doc(db, "utenti", auth.currentUser.uid), { turni_access: true, last_turni_access: oggiStr }, { merge: true });
        window.currentUserData.turni_access = true; window.currentUserData.last_turni_access = oggiStr;
    }
};

window.avviaMotoreOrariDaIndex = () => {
    avviaMotoreOrari();
};

window.avviaMotoreLinkDaIndex = () => {
    if (!auth.currentUser) { alert("Devi effettuare il login per accedere ai link aziendali."); return; }
    if (window.currentUserData) {
        if (window.currentUserData.link_banned === true) {
            alert("L'accesso ai Link ti è stato revocato da un Amministratore."); return;
        }
        if (!window.currentUserData.nome || !window.currentUserData.cognome || window.currentUserData.matricola === undefined) {
            alert("Devi prima completare il tuo profilo (Nome, Cognome e Matricola) per accedere.");
            window.apriModal('profileModal'); return;
        }
    }
    avviaMotoreLink();
    const oggiStr = new Date().toISOString().split('T')[0];
    if (window.currentUserData && (window.currentUserData.link_access !== true || window.currentUserData.last_link_access !== oggiStr)) {
        setDoc(doc(db, "utenti", auth.currentUser.uid), { link_access: true, last_link_access: oggiStr }, { merge: true });
        window.currentUserData.link_access = true; window.currentUserData.last_link_access = oggiStr;
    }
};

window.avviaMotoreDocumentiDaIndex = () => {
    if (!auth.currentUser) { alert("Devi effettuare il login per accedere ai documenti."); return; }
    if (window.currentUserData) {
        if (window.currentUserData.documenti_banned === true) {
            alert("L'accesso ai Documenti ti è stato revocato da un Amministratore."); return;
        }
        if (!window.currentUserData.nome || !window.currentUserData.cognome || window.currentUserData.matricola === undefined) {
            alert("Devi prima completare il tuo profilo (Nome, Cognome e Matricola) per accedere all'archivio.");
            window.apriModal('profileModal'); return;
        }
    }
    avviaMotoreDocumenti();
    const oggiStr = new Date().toISOString().split('T')[0];
    if (window.currentUserData && (window.currentUserData.documenti_access !== true || window.currentUserData.last_documenti_access !== oggiStr)) {
        setDoc(doc(db, "utenti", auth.currentUser.uid), { documenti_access: true, last_documenti_access: oggiStr }, { merge: true });
        window.currentUserData.documenti_access = true; window.currentUserData.last_documenti_access = oggiStr;
    }
};

window.avviaMotoreContattiDaIndex = () => {
    if (!auth.currentUser) { alert("Devi effettuare il login per accedere ai contatti aziendali."); return; }
    if (window.currentUserData) {
        if (window.currentUserData.contatti_banned === true) {
            alert("L'accesso ai Contatti ti è stato revocato da un Amministratore."); return;
        }
        if (!window.currentUserData.nome || !window.currentUserData.cognome || window.currentUserData.matricola === undefined) {
            alert("Devi prima completare il tuo profilo (Nome, Cognome e Matricola) per accedere ai contatti.");
            window.apriModal('profileModal'); return;
        }
    }
    avviaMotoreContatti();
    const oggiStr = new Date().toISOString().split('T')[0];
    if (window.currentUserData && (window.currentUserData.contatti_access !== true || window.currentUserData.last_contatti_access !== oggiStr)) {
        setDoc(doc(db, "utenti", auth.currentUser.uid), { contatti_access: true, last_contatti_access: oggiStr }, { merge: true });
        window.currentUserData.contatti_access = true; window.currentUserData.last_contatti_access = oggiStr;
    }
};

window.avviaMotoreBachecaUtilityDaIndex = () => {
    const fullName = `${window.currentUserData?.nome || ''} ${window.currentUserData?.cognome || ''}`.trim();
    avviaMotoreBachecaUtility(app, db, auth, globalIsAdmin || globalIsCollab, fullName);
};

window.avviaMotoreRubricaDaIndex = () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) {
        alert("L'accesso alle funzioni ti è stato revocato."); 
        return;
    }
    avviaMotoreRubrica(db, auth, window.currentUserData, globalIsAdmin);
};

// --- NUOVE FUNZIONI PONTE ---

window.avviaMotoreBachecaTurniDaIndex = () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) {
        alert("L'accesso alle funzioni ti è stato revocato."); 
        return;
    }
    avviaMotoreBachecaTurni(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreBarcadvisorDaIndex = () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) {
        alert("L'accesso alle funzioni ti è stato revocato."); 
        return;
    }
    avviaMotoreBarcadvisor(db, auth, window.currentUserData, globalIsAdmin);
};

window.avviaMotoreBuoniPastoDaIndex = () => {
    if (window.currentUserData && window.currentUserData.app_banned === true) {
        alert("L'accesso alle funzioni ti è stato revocato."); 
        return;
    }
    avviaMotoreBuoniPasto(db, auth, window.currentUserData, globalIsAdmin);
};


window.controllaBacheca = async () => {
    if (!auth.currentUser) return;
    try {
        let ultimoAccesso = window.currentUserData?.ultimo_accesso_bacheca || localStorage.getItem('ultimo_accesso_bacheca') || 0;
        ultimoAccesso = parseInt(ultimoAccesso);

        const stateApp = JSON.parse(localStorage.getItem('myTurniApp')) || {};
        const pid = stateApp.profiloAttivoId || 'default';
        const profileObj = stateApp.profiliSalvati ? stateApp.profiliSalvati[pid] : stateApp;
        const rotazioneUtente = profileObj ? profileObj.depositoAttivo : null;
        
        const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
        const oggiStr = formatterDate.format(new Date());

        const q = query(collection(db, "bacheca_utility"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);

        let avvisiNormali = 0;
        let avvisiDDS = [];

        snap.forEach(d => {
            let m = d.data();
            if (m.scadenza && m.scadenza < oggiStr) return; 
            
            if (!globalIsAdmin && !globalIsCollab && m.target && m.target !== "tutti") {
                if (!rotazioneUtente || !m.target.includes(rotazioneUtente)) return;
            }

            if (m.timestamp > ultimoAccesso) {
                if (m.tipo === "dds") avvisiDDS.push(m.titolo_dds);
                else avvisiNormali++;
            }
        });

        let totali = avvisiNormali + avvisiDDS.length;

        if (totali > 0) {
            const badge = document.getElementById('badge-messaggi');
            if (badge) { badge.innerText = totali; badge.style.display = 'flex'; }

            if (avvisiNormali > 0) {
                const bannerNormal = document.getElementById('banner-nuovo-messaggio');
                if (bannerNormal) bannerNormal.style.display = 'flex';
            }
            
            if (avvisiDDS.length > 0) {
                const bannerDDS = document.getElementById('banner-dds-alert');
                const textDDS = document.getElementById('titolo-dds-text');
                if (bannerDDS && textDDS) {
                    textDDS.innerText = avvisiDDS[0] + (avvisiDDS.length > 1 ? ` (+${avvisiDDS.length - 1})` : '');
                    bannerDDS.style.display = 'flex';
                }
            }
        }
    } catch(e) { console.error("Errore check bacheca:", e); }
};

window.controllaRichiesteSospese = async () => {
    if (!globalIsAdmin && !globalIsCollab) return;
    try {
        const q = query(collection(db, "utenti"), where("stato_richiesta", "==", "pending"));
        const snap = await getDocs(q);
        let count = 0;
        snap.forEach(d => {
            const u = d.data();
            if (globalIsAdmin) count++;
            else if (globalIsCollab && (window.currentUserData?.permessi_gestione || []).includes(u.rotazione_richiesta)) count++;
        });
        const btnRot = document.getElementById('btn-rotazioni');
        if (btnRot) {
            let b = btnRot.querySelector('.badge-notif');
            if (b) b.remove();
            if (count > 0) btnRot.insertAdjacentHTML('beforeend', `<div class="badge-notif">${count}</div>`);
        }
    } catch(e) {}
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
                let b = btn.querySelector('.badge-notif');
                if (b) b.remove();
                btn.insertAdjacentHTML('beforeend', `<div class="badge-notif" style="background:#17a2b8; border-color:var(--bg-color);">${activeCount}</div>`);
            }
        }
    } catch(e) { console.error("Errore check promemoria:", e); }
};

window.controllaSegnalazioni = async () => {
    if (!auth.currentUser) return;
    try {
        let count = 0;
        let messaggioBanner = "";
        
        if (globalIsAdmin) {
            const q = query(collection(db, "segnalazioni"), where("stato", "==", "in_attesa"), where("letta_da_admin", "==", false));
            const snap = await getDocs(q);
            count = snap.size;
            if (count > 0) messaggioBanner = count === 1 ? "Hai 1 nuova segnalazione in attesa!" : `Hai ${count} nuove segnalazioni in attesa!`;
        } else {
            const q = query(collection(db, "segnalazioni"), where("mittente_uid", "==", auth.currentUser.uid), where("stato", "==", "risposto"), where("letta_da_utente", "==", false));
            const snap = await getDocs(q);
            count = snap.size;
            if (count > 0) messaggioBanner = count === 1 ? "L'Admin ha risposto alla tua segnalazione!" : `L'Admin ha risposto a ${count} tue segnalazioni!`;
        }

        if (count > 0) {
            const banner = document.getElementById('banner-segnalazioni-alert');
            if (banner) {
                document.getElementById('testo-segnalazione-banner').innerText = messaggioBanner;
                banner.style.display = 'flex';
            }
            const btn = document.getElementById('btn-report');
            if (btn) {
                let b = btn.querySelector('.badge-notif');
                if (b) b.remove();
                btn.insertAdjacentHTML('beforeend', `<div class="badge-notif" style="background:var(--danger);">${count}</div>`);
            }
        }
    } catch(e) { console.error("Errore check segnalazioni:", e); }
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
                    await setDoc(doc(db, "utenti", auth.currentUser.uid), {
                        fcm_token: token.value,
                        device_type: 'android_app'
                    }, { merge: true });
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
                        await setDoc(doc(db, "utenti", auth.currentUser.uid), {
                            fcm_token: token,
                            device_type: 'pwa_web'
                        }, { merge: true });
                    }
                } catch (e) { console.warn("Nessun token web ottenuto:", e); }
            } else {
                aggiornaGraficaPermessi(false);
            }
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
                        await setDoc(doc(db, "utenti", auth.currentUser.uid), {
                            fcm_token: token,
                            device_type: 'pwa_web'
                        }, { merge: true });
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
        if (auth.currentUser) {
            await setDoc(doc(db, "utenti", auth.currentUser.uid), { fcm_token: null, device_type: null }, { merge: true });
        }
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

window.LayoutEngine = {
    prefs: { c1: "#a9dfcd", c2: "#ffffff", c3: "#a4c5e3", appBg: "#0066cc", view: "grid", iconStyle: "box", iconType: "minimal", fontSize: 14, theme: "system", apps: [] },
    isEditMode: false,
    sortableInstance: null,
    init: function(firebasePrefsStr) {
        let localStr = localStorage.getItem('preferenze_layout_haze');
        let targetStr = firebasePrefsStr || localStr;
        if (targetStr) {
            try { 
                let parsed = JSON.parse(targetStr);
                this.prefs = { ...this.prefs, ...parsed };
                this.mergeWithDefaults();
            } catch(e) {}
        } else { this.prefs.apps = JSON.parse(JSON.stringify(DEFAULT_APPS)); }
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if(this.prefs.theme === 'system') this.applicaGrafica();
        });

        this.applicaGrafica();
        this.popolaModaleImpostazioni();
        this.render();
    },
    mergeWithDefaults: function() {
        const defaultIds = DEFAULT_APPS.map(a => a.id);
        this.prefs.apps = this.prefs.apps.filter(app => app.id.startsWith('custom_') || defaultIds.includes(app.id));
        this.prefs.apps.forEach(app => {
            if (!app.id.startsWith('custom_')) {
                const def = DEFAULT_APPS.find(d => d.id === app.id);
                if (def) {
                    if (def.href) app.href = def.href; else delete app.href;
                    if (def.onclick) app.onclick = def.onclick; else delete app.onclick;
                    if (def.condition) app.condition = def.condition; else delete app.condition;
                }
            }
        });
        DEFAULT_APPS.forEach((defApp, defaultIndex) => {
            let currentIds = this.prefs.apps.map(a => a.id);
            if(!currentIds.includes(defApp.id)) {
                let insertIndex = this.prefs.apps.length; 
                if (defaultIndex > 0) {
                    let prevAppId = DEFAULT_APPS[defaultIndex - 1].id;
                    let userIndex = this.prefs.apps.findIndex(a => a.id === prevAppId);
                    if (userIndex !== -1) insertIndex = userIndex + 1;
                } else if (defaultIndex === 0) { insertIndex = 0; }
                this.prefs.apps.splice(insertIndex, 0, JSON.parse(JSON.stringify(defApp)));
            }
        });
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
        document.documentElement.style.setProperty('--label-size', this.prefs.fontSize + 'px');
        let baseClass = this.prefs.view === 'list' ? 'app-list' : 'app-grid';
        if (this.prefs.iconStyle === 'transparent') baseClass += ' transparent-icons';
        document.getElementById('app-container').className = baseClass;
    },
    popolaModaleImpostazioni: function() {
        document.getElementById('set-col1').value = this.prefs.c1 || "#a9dfcd";
        document.getElementById('set-col2').value = this.prefs.c2 || "#ffffff";
        document.getElementById('set-col3').value = this.prefs.c3 || "#a4c5e3";
        document.getElementById('set-appbg').value = this.prefs.appBg || "#0066cc";
        document.getElementById('set-viewmode').value = this.prefs.view || "grid";
        document.getElementById('set-iconstyle').value = this.prefs.iconStyle || "box";
        document.getElementById('set-icontype').value = this.prefs.iconType || "minimal";
        document.getElementById('set-labelsize').value = this.prefs.fontSize || 14;
        document.getElementById('set-theme').value = this.prefs.theme || 'system';
    },
    render: function() {
        const container = document.getElementById('app-container');
        container.innerHTML = '';
        if(this.isEditMode) container.classList.add('wiggle-mode'); else container.classList.remove('wiggle-mode');
        
        this.prefs.apps.forEach((app, index) => {
            if (app.condition === 'admin' && !globalIsAdmin) return;
            if (app.condition === 'collab' && !(globalIsAdmin || globalIsCollab)) return;
            
            const finalColor = app.color || app.defaultColor || this.prefs.appBg;
            const isLink = app.href ? `href="${app.href}"` : `onclick="${app.onclick}"`;
            const editHandler = this.isEditMode ? `onclick="event.preventDefault(); window.LayoutEngine.apriEditorApp('${app.id}');"` : isLink;
            const badgeHtml = this.isEditMode ? `<div class="edit-badge"><i class="fa-solid fa-pen"></i></div>` : '';
            
            let iconStyle = `background-color: ${finalColor};`;
            let iconContent = "";
            let isImagePath = false;
            let imagePath = "";
            
            let currentImage = app.image;
            let currentIcon = app.icon;
            let useEmoji = (this.prefs.iconType === "emoji");

            if (app.id === 'barcadvisor') {
                if (!useEmoji) { currentIcon = "fa-solid fa-sailboat"; currentImage = null; }
                else { currentImage = "icone_app/iconba.png"; currentIcon = null; }
            }
            if (app.id === 'spriss') {
                if (!useEmoji) { currentIcon = "fa-solid fa-martini-glass"; currentImage = null; }
                else { currentImage = "icone_app/iconspriss.png"; currentIcon = null; }
            }
            if (app.id === 'chebateo') {
                if (!useEmoji) { currentIcon = "fa-solid fa-water"; currentImage = null; }
                else { currentImage = "icone_app/iconcb.png"; currentIcon = null; }
            }

            if (currentImage) {
                isImagePath = true;
                imagePath = currentImage;
            } else if (currentIcon && (currentIcon.includes('.png') || currentIcon.includes('.jpg') || currentIcon.includes('.svg') || currentIcon.includes('icone_app/'))) {
                isImagePath = true;
                imagePath = currentIcon;
            }

            if (isImagePath) { 
                iconStyle += ` background-image: url('${imagePath}'); background-size: cover; background-position: center; background-repeat: no-repeat;`; 
                iconContent = ""; 
            } else if (currentIcon) {
                if (currentIcon.includes('fa-')) iconContent = `<i class="${currentIcon}"></i>`;
                else iconContent = currentIcon;
            } else {
                if (useEmoji && EMOJI_MAP[app.id]) iconContent = EMOJI_MAP[app.id];
                else if (!useEmoji && ICON_MAP[app.id]) iconContent = `<i class="${ICON_MAP[app.id]}"></i>`;
                else iconContent = "🔗"; 
            }

            let animDelay = this.isEditMode ? "0s" : `${index * 0.04}s`;
            
            container.innerHTML += `
                <a ${editHandler} class="app-btn" id="btn-${app.id}" style="animation-delay: ${animDelay}">
                    ${badgeHtml}
                    <div class="app-icon" style="${iconStyle}">${iconContent}</div>
                    <div class="app-label">${app.label.replace('\n', '<br>')}</div>
                </a>`;
        });

        setTimeout(() => {
            if(window.controllaRichiesteSospese) window.controllaRichiesteSospese();
            if(window.controllaPromemoria) window.controllaPromemoria();
            if(window.controllaSegnalazioni) window.controllaSegnalazioni();
            if(window.controllaBacheca) window.controllaBacheca();
        }, 200);
    },
    handleImageUpload: function(event, modalType) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = function(e) {
            const img = new Image(); img.onload = function() {
                const canvas = document.createElement('canvas'); const MAX = 120; let w = img.width; let h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                document.getElementById(modalType + '-app-img-data').value = dataUrl;
                document.getElementById(modalType + '-app-img-preview-src').src = dataUrl;
                document.getElementById(modalType + '-app-img-preview').style.display = 'block';
                document.getElementById(modalType + '-app-icon').value = ""; 
            }; img.src = e.target.result;
        }; reader.readAsDataURL(file);
    },
    rimuoviImmagine: function(modalType) { document.getElementById(modalType + '-app-img-data').value = ""; document.getElementById(modalType + '-app-img-preview').style.display = 'none'; },
    toggleEditMode: function() {
        this.isEditMode = !this.isEditMode;
        document.getElementById('btn-salva-layout').style.display = this.isEditMode ? 'flex' : 'none';
        this.render(); 
        if(this.isEditMode) {
            this.sortableInstance = new Sortable(document.getElementById('app-container'), { animation: 250, delay: 150, delayOnTouchOnly: true, ghostClass: "sortable-ghost", onEnd: () => { this.aggiornaOrdineDaDOM(); } });
        } else { if(this.sortableInstance) this.sortableInstance.destroy(); this.sincronizzaConFirebase(); }
    },
    aggiornaOrdineDaDOM: function() {
        const nuovoOrdine = []; 
        document.querySelectorAll('#app-container .app-btn').forEach(nodo => {
            const id = nodo.id.replace('btn-', ''); 
            const app = this.prefs.apps.find(a => a.id === id); 
            if (app) { nuovoOrdine.push(app); }
        });
        this.prefs.apps.forEach(app => { 
            if (!nuovoOrdine.find(a => a.id === app.id)) { nuovoOrdine.push(app); }
        });
        this.prefs.apps = nuovoOrdine;
    },
    apriEditorApp: function(appId) {
        const app = this.prefs.apps.find(a => a.id === appId); if(!app) return;
        document.getElementById('edit-app-id').value = app.id;
        document.getElementById('edit-app-label').value = app.label.replace('\n', ' ');
        document.getElementById('edit-app-icon').value = app.icon || "";
        document.getElementById('edit-app-color').value = app.color || app.defaultColor || this.prefs.appBg || "#0066cc";
        
        if (app.image) { 
            document.getElementById('edit-app-img-data').value = app.image; 
            document.getElementById('edit-app-img-preview-src').src = app.image; 
            document.getElementById('edit-app-img-preview').style.display = 'block'; 
        } else { 
            this.rimuoviImmagine('edit'); 
        }
        document.getElementById('btn-elimina-custom').style.display = app.id.startsWith('custom_') ? 'flex' : 'none';
        window.apriModal('editAppModal');
    },
    salvaModificaSingolaApp: function() {
        const id = document.getElementById('edit-app-id').value; const index = this.prefs.apps.findIndex(a => a.id === id);
        if(index > -1) {
            this.prefs.apps[index].label = document.getElementById('edit-app-label').value;
            this.prefs.apps[index].color = document.getElementById('edit-app-color').value;
            const imgData = document.getElementById('edit-app-img-data').value;
            if (imgData) { 
                this.prefs.apps[index].image = imgData; 
                this.prefs.apps[index].icon = ""; 
            } else { 
                delete this.prefs.apps[index].image; 
                this.prefs.apps[index].icon = document.getElementById('edit-app-icon').value || "🔗"; 
            }
        } 
        window.chiudiModal('editAppModal'); this.render(); this.sincronizzaConFirebase();
    },
    creaAppPersonalizzata: function() {
        const label = document.getElementById('new-app-label').value.trim(); let url = document.getElementById('new-app-url').value.trim();
        if(!label || !url) { alert("Dati mancanti"); return; }
        if(!url.startsWith('http')) url = 'https://' + url;
        const imgData = document.getElementById('new-app-img-data').value;
        const newApp = { id: "custom_" + Date.now(), label: label, href: url, color: this.prefs.appBg };
        if (imgData) newApp.image = imgData; else newApp.icon = document.getElementById('new-app-icon').value || "🔗";
        this.prefs.apps.push(newApp); window.chiudiModal('customAppModal'); 
        document.getElementById('new-app-label').value = ""; document.getElementById('new-app-url').value = "";
        document.getElementById('new-app-icon').value = ""; this.rimuoviImmagine('new');
        this.sincronizzaConFirebase(); this.render();
    },
    eliminaAppCorrente: function() { const id = document.getElementById('edit-app-id').value; this.prefs.apps = this.prefs.apps.filter(a => a.id !== id); window.chiudiModal('editAppModal'); this.render(); this.sincronizzaConFirebase(); },
    salvaPreferenzeGlobali: function() {
        this.prefs.c1 = document.getElementById('set-col1').value; this.prefs.c2 = document.getElementById('set-col2').value; this.prefs.c3 = document.getElementById('set-col3').value;
        this.prefs.appBg = document.getElementById('set-appbg').value; this.prefs.view = document.getElementById('set-viewmode').value;
        this.prefs.iconStyle = document.getElementById('set-iconstyle').value; this.prefs.fontSize = parseInt(document.getElementById('set-labelsize').value);
        this.prefs.iconType = document.getElementById('set-icontype').value;
        this.prefs.theme = document.getElementById('set-theme').value;
        this.applicaGrafica(); this.render(); window.chiudiModal('settingsModal'); this.sincronizzaConFirebase();
    },
    sincronizzaConFirebase: async function() {
        const str = JSON.stringify(this.prefs); localStorage.setItem('preferenze_layout_haze', str);
        if (auth.currentUser) await setDoc(doc(db, "utenti", auth.currentUser.uid), { preferenze_layout: str }, { merge: true });
    },
    ripristinaPredefiniti: async function() { if(!confirm("Ripristinare tutto?")) return; localStorage.removeItem('preferenze_layout_haze'); if (auth.currentUser) await setDoc(doc(db, "utenti", auth.currentUser.uid), { preferenze_layout: null }, { merge: true }); location.reload(); }
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
    window.apriModal('modal-dettaglio-utente');
};

window.cambiaRuoloUtente = async (uid, nuovoRuolo) => { if(!confirm("Sei sicuro?")) return; try { await setDoc(doc(db, "utenti", uid), { ruolo: nuovoRuolo }, { merge: true }); window.utentiMap[uid].ruolo = nuovoRuolo; window.chiudiModal('modal-dettaglio-utente'); alert("Ruolo aggiornato!"); } catch(e) { alert("Errore."); } };

onAuthStateChanged(auth, async (user) => {
    const vLoad = document.getElementById('view-loading'); const vGuest = document.getElementById('view-guest'); const vApp = document.getElementById('view-app'); const vBanned = document.getElementById('view-banned');
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "utenti", user.uid)); let data = docSnap.exists() ? docSnap.data() : {};
            window.currentUserData = data; vLoad.style.display = 'none';
            if (data.app_banned === true) { document.body.style.backgroundImage = 'none'; document.body.style.backgroundColor = "var(--bg-color)"; vGuest.style.display = 'none'; vApp.style.display = 'none'; vBanned.style.display = 'flex'; return; }
            if (!data.nome || !data.cognome || !data.matricola) document.getElementById('modal-dati-obbligatori').style.display = 'flex';
            
            globalIsAdmin = (user.uid === ADMIN_UID); globalIsCollab = data.ruolo === 'collaborator';
            if(globalIsAdmin) { document.getElementById('adminBadge').style.display = 'block'; document.getElementById('menu-admin').style.display = 'flex'; }
            
            vGuest.style.display = 'none'; vApp.style.display = 'flex'; vBanned.style.display = 'none';
            document.getElementById('btnOpenLogin').style.display = 'none'; document.getElementById('btnOpenProfile').style.display = 'flex';
            document.getElementById('profileEmail').value = user.email;
            
            const oggiLog = new Date();
            const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
            const oggiLogStr = formatterDate.format(oggiLog);
            if (data.last_app_access !== oggiLogStr || !data.email) { 
                setDoc(doc(db, "utenti", user.uid), { last_app_access: oggiLogStr, last_access_full: oggiLog.toISOString(), email: user.email }, { merge: true }); 
            }
            
            window.LayoutEngine.init(data.preferenze_layout);
            if(window.inizializzaNotificheSeNativa) window.inizializzaNotificheSeNativa(data);

            document.getElementById('profileNome').value = data.nome || ''; 
            document.getElementById('profileCognome').value = data.cognome || '';
            document.getElementById('profileMatricola').value = data.matricola || ''; 
            document.getElementById('profileProgressivo').value = data.progressivo || '';
            document.getElementById('profileSoprannome').value = data.soprannome || '';
            document.getElementById('profileTelefono').value = data.telefono || '';
            document.getElementById('profileMansione').value = data.mansione || '';
            
        } catch(e) { vLoad.style.display = 'none'; }
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
