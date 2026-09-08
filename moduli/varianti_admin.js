import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. INIEZIONE UI (Gestita dal LazyLoader)
// ==========================================
export function initUIVariantiAdmin() {
    if (document.getElementById('modal-varianti-admin-main')) return;
    
    const uiHTML = `
    <style>
        .contact-item-admin { background: var(--surface); padding: 16px; border-radius: var(--radius-md); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm); border-left: 5px solid var(--danger); border: 1px solid var(--border-color); border-left-width: 5px; text-align: left;}
        .contact-item-admin.is-mate { border-left-color: var(--success); background: rgba(40, 167, 69, 0.05); }
        .contact-info-admin { text-align: left; flex: 1; }
        .contact-name-admin { font-weight: 700; font-size: 16px; color: var(--text-main); margin-bottom: 4px; text-transform: capitalize; }
        .contact-detail-admin { font-size: 13px; color: var(--text-muted); font-weight: 500; }
        .turno-badge-admin { font-size: 16px; font-weight: 800; color: var(--danger); display: flex; align-items: center; gap: 8px; justify-content: flex-end;}
        .turno-originale-admin { font-size: 12px; color: var(--text-muted); font-weight: normal; display: block; margin-top: 6px; text-align: right; background: var(--surface-hover); padding: 4px 8px; border-radius: 6px;}
        .clickable-turn-admin { cursor: pointer; color: var(--danger); text-decoration: underline; text-underline-offset: 3px; }
    </style>

    <div id="modal-varianti-admin-main" class="modal-overlay" onclick="if(event.target.id === 'modal-varianti-admin-main') this.style.display='none'">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            
            <i id="btn-migra-consensi" class="fa-solid fa-database" style="position: absolute; right: 100px; top: 20px; font-size: 24px; cursor: pointer; color: var(--success);" onclick="window.migraConsensiAdmin()" title="Migra Dati Consenso su Utenti"></i>
            <i class="fa-solid fa-users-slash" style="position: absolute; right: 60px; top: 20px; font-size: 24px; cursor: pointer; color: var(--warning);" onclick="window.apriListaRevocheAdmin()" title="Gestione Revoche e Ban"></i>
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-varianti-admin-main').style.display='none'"></i>
            
            <h3 style="margin-top: 0; color: var(--danger); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <i class="fa-solid fa-user-shield"></i> Varianti ADMIN
            </h3>

            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; width: 100%;">
                
                <div id="view-var-admin-no-auth" style="display: none; flex-direction: column; align-items: center; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--danger); margin-top: 0;">Accesso Richiesto</h3>
                </div>

                <div id="view-var-admin-main" style="display: none; flex-direction: column; width: 100%;">
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <input type="date" id="data-ricerca-varianti-admin" class="input-field" style="margin-bottom: 0; flex: 1;" onchange="window.cercaVariantiGiornoAdmin()">
                    </div>
                    
                    <div style="position: relative; width: 100%; margin-bottom: 15px;">
                        <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 16px; top: 13px; color: var(--text-muted);"></i>
                        <input type="text" id="search-varianti-admin" class="input-field" style="padding-left: 45px; margin-bottom: 0;" placeholder="Cerca nome o turno..." oninput="window.filtraVariantiAdmin()">
                    </div>

                    <div id="varianti-list-admin" style="width: 100%;"></div>
                </div>

                <div id="view-var-admin-loading" style="display: none; flex-direction: column; align-items: center; justify-content: center; margin-top: 40px;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--danger);"></i>
                </div>

            </div>
        </div>
    </div>

    <!-- Modale Revoche e Ban -->
    <div id="modal-revoche-admin" class="modal-overlay" style="z-index: 10000; display: none; background: rgba(0,0,0,0.8);" onclick="if(event.target.id === 'modal-revoche-admin') this.style.display='none'">
        <div class="modal-content" style="max-width: 440px; height: 75vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-revoche-admin').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--warning); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <i class="fa-solid fa-users-slash"></i> Gestione Blocchi
            </h3>
            <div id="revoche-list-admin" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; width: 100%; margin-top: 10px;">
            </div>
        </div>
    </div>

    <!-- Modale Visualizzatore Immagini Admin -->
    <div id="modal-image-variante-admin" class="modal-overlay" style="z-index: 9999; display: none; background: rgba(0,0,0,0.9);" onclick="window.chiudiImageModalVariantiSeSfondoAdmin(event)">
        <div id="imageFlexContainerVarianteAdmin" style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 30px; cursor: pointer; color: white; z-index: 10; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" onclick="window.chiudiImageModalVariantiAdmin()"></i>
            <img id="img-variante-turno-admin" style="max-width: 100%; max-height: 100vh; object-fit: contain; transition: transform 0.2s;" src="">
            <button onclick="window.scaricaImmagineVarianteAdmin()" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: var(--danger); color: white; border: none; padding: 12px 24px; border-radius: 20px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 10; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-download"></i> Scarica</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);

    function dateToLocalISOAdmin(d) { 
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'); 
    }

    // FUNZIONE GLOBALE PER APRIRE IL MODULO
    window.apriVariantiAdmin = function() {
        const modal = document.getElementById('modal-varianti-admin-main');
        if (modal) {
            modal.style.display = 'flex';
            const dataInput = document.getElementById('data-ricerca-varianti-admin');
            if (!dataInput.value) {
                dataInput.value = dateToLocalISOAdmin(new Date());
            }
            if (typeof window.cercaVariantiGiornoAdmin === 'function') {
                window.cercaVariantiGiornoAdmin();
            }
        }
    };
}

// ==========================================
// 2. MOTORE LOGICO E FILTRI ADMIN
// ==========================================
export function avviaMotoreVariantiAdmin(db, auth, userDataPrivate) {
    const currentUser = auth.currentUser;
    let globalRotCacheAdmin = null;
    let globalDbCacheAdmin = null;
    const DATA_INIZIO_NUOVI_TURNI = "2026-06-01"; 

    let pzVarianteAdmin = null;
    let currentImagePathVarAdmin = "";
    let imgBaseFallbackVarAdmin = "";

    if (!currentUser) {
        mostraVistaAdmin('view-var-admin-no-auth');
        return;
    }

    const imgElemAdmin = document.getElementById('img-variante-turno-admin');
    if (typeof Panzoom !== 'undefined' && !pzVarianteAdmin) {
        pzVarianteAdmin = Panzoom(imgElemAdmin, { maxScale: 5, minScale: 1 });
        document.getElementById('imageFlexContainerVarianteAdmin').addEventListener('wheel', pzVarianteAdmin.zoomWithWheel);
        
        function eseguiZoomToggleAdmin(e) {
            if (!pzVarianteAdmin) return;
            let currentScale = pzVarianteAdmin.getScale();
            if (currentScale < 1.1) { pzVarianteAdmin.zoom(1.75, { animate: true }); } 
            else { pzVarianteAdmin.reset({ animate: true }); }
        }
        
        let lastTapAdmin = 0; let isPinchingAdmin = false;
        imgElemAdmin.addEventListener('touchstart', function(e) { if (e.touches.length > 1) { isPinchingAdmin = true; } });
        imgElemAdmin.addEventListener('touchend', function(e) {
            if (isPinchingAdmin) { if (e.touches.length === 0) { setTimeout(() => isPinchingAdmin = false, 300); } return; }
            let currentTime = new Date().getTime(); let tapLength = currentTime - lastTapAdmin;
            if (tapLength < 300 && tapLength > 0) { eseguiZoomToggleAdmin(e); if (e.cancelable) e.preventDefault(); }
            lastTapAdmin = currentTime;
        });
        imgElemAdmin.addEventListener('dblclick', function(e) { eseguiZoomToggleAdmin(e); });
    }

    function stringToNum(s) { 
        if(!s) return 0; let p = s.split('-'); return Math.floor(Date.UTC(p[0], p[1]-1, p[2]) / 86400000); 
    }

    function creaDataSicura(dataStr) { 
        if(!dataStr) return new Date(); let p = dataStr.split('-'); return new Date(p[0], p[1] - 1, p[2], 12, 0, 0); 
    }

    function dateToLocalISOAdmin(d) { 
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'); 
    }

    // Helper: Converte il turno in base alla mansione
    function convertiTurnoPerMansione(turno, mansione) {
        if (!turno || !mansione) return turno;
        let t = String(turno).toUpperCase();
        let m = String(mansione).toLowerCase();

        let isMarinaio = m.includes('marinaio') || m.includes('timoniere');

        if (isMarinaio) {
            let matchP = t.match(/^([1-9])[CP](\d{2})$/);
            if (matchP) return `${matchP[1]}B${matchP[2]}`;
        } else {
            let matchB = t.match(/^([1-9])B(\d{2})$/);
            if (matchB) {
                let l = matchB[1]; let f = matchB[2];
                let letPilota = (l === '1' || l === '2') ? 'C' : 'P';
                return `${l}${letPilota}${f}`;
            }
        }
        return t;
    }

    function isGiornoRiposoBase(curr, cfg) { 
        if (!cfg.riposoStart) return false; 
        let ref = stringToNum(cfg.riposoStart); 
        if (cfg.depositoAttivo === 'disp_det') return (((curr - ref) % 6 + 6) % 6 === 0); 
        let pos = ((curr - ref + 6) % 15 + 15) % 15; 
        return (pos === 6 || pos === 13 || pos === 14); 
    }

    function trovaChiaveEsatta(dbLocal, codiceBase, dateStr) {
        if (!dbLocal || !codiceBase) return codiceBase;
        let codiciDaCercare = [codiceBase];
        let matchB = codiceBase.match(/^([1-9])B(\d{2})$/);
        if (matchB) {
            let linea = matchB[1]; let finale = matchB[2];
            let letteraPilota = (linea === '1' || linea === '2') ? 'C' : 'P';
            let regex = new RegExp(`^${linea}[A-Z]${finale}$`);
            let trovati = Object.keys(dbLocal).filter(k => regex.test(k));
            if (trovati.length > 0) codiciDaCercare.push(...trovati);
            else codiciDaCercare.push(`${linea}${letteraPilota}${finale}`);
        } else {
            let match50 = codiceBase.match(/^([A-Z0-9]+?)(\d{2})$/);
            if (match50) {
                let pref = match50[1]; let num = parseInt(match50[2], 10);
                if (num >= 50) codiciDaCercare.push(pref + String(num - 50).padStart(2, '0'));
            }
        }

        let giornoIdx = creaDataSicura(dateStr).getDay(); let targetDay = giornoIdx === 0 ? 7 : giornoIdx; 
        const dayMap = { "LUN": 1, "MAR": 2, "MER": 3, "GIO": 4, "VEN": 5, "SAB": 6, "DOM": 7 };

        for (let codCercato of codiciDaCercare) {
            let keys = Object.keys(dbLocal).filter(k => k === codCercato || k.startsWith(codCercato + "_"));
            let exactMatch = null; let genericMatch = null;
            for (let k of keys) {
                if (k === codCercato) { genericMatch = k; continue; }
                let suffix = k.substring(codCercato.length + 1); 
                if (suffix.includes("-")) {
                    let parts = suffix.split("-");
                    if (parts.length === 2 && dayMap[parts[0]] && dayMap[parts[1]]) {
                        let start = dayMap[parts[0]]; let end = dayMap[parts[1]];
                        if (start <= end) { if (targetDay >= start && targetDay <= end) exactMatch = k; } 
                        else { if (targetDay >= start || targetDay <= end) exactMatch = k; }
                    }
                } else { if (dayMap[suffix] && dayMap[suffix] === targetDay) exactMatch = k; }
            }
            if (exactMatch) return exactMatch;
            if (genericMatch) return genericMatch;
        }
        return codiceBase; 
    }

    function calcolaTurnoBase(dStr, cfgData) {
        if (!cfgData || !cfgData.depositoAttivo || !cfgData.riposoStart) return "N/D";
        let curr = stringToNum(dStr);
        let isPastUpdate = (cfgData.history && curr < stringToNum(DATA_INIZIO_NUOVI_TURNI)); 
        let cfgBase = isPastUpdate ? cfgData.history : cfgData;
        
        if (isGiornoRiposoBase(curr, cfgBase)) {
            let tituloRiposo = 'RI'; 
            if (cfgBase.riposoStart && cfgBase.depositoAttivo !== 'disp_det') { 
                let ref = stringToNum(cfgBase.riposoStart); 
                let pos = ((curr - ref + 6) % 15 + 15) % 15; 
                if (pos === 13) tituloRiposo = 'AL'; 
            }
            return tituloRiposo;
        }

        if (cfgBase.depositoAttivo.startsWith('disp_')) return "DISP";

        if (cfgBase.rotazioneStart) {
            let activeCfg = (cfgData.futureConfig && curr >= stringToNum(cfgData.futureConfig.dataInizio)) 
                ? { start: cfgData.futureConfig.dataInizio, idx: cfgData.futureConfig.turnoIndex, tcPattern: cfgData.futureConfig.tcPattern } 
                : { start: cfgBase.rotazioneStart, idx: cfgBase.turnoIndex, tcPattern: cfgBase.tcPattern };
            
            let refRot = stringToNum(activeCfg.start), w = 0; 
            if (curr >= refRot) { for (let j = refRot; j < curr; j++) { if (!isGiornoRiposoBase(j, cfgBase)) w++; } } 
            else { for (let j = refRot; j > curr; j--) { if (!isGiornoRiposoBase(j, cfgBase)) w--; } }
            
            let refRip = stringToNum(cfgBase.riposoStart); 
            let startPos = ((refRot - refRip + 6) % 15 + 15) % 15; 
            let offset = [1, 3, 5, 8, 10, 12].includes(startPos) ? 1 : 0;
            
            let rotList = [];
            if (globalRotCacheAdmin) {
                const dateChiavi = Object.keys(globalRotCacheAdmin).sort();
                let rotCorrente = dateChiavi.length > 0 ? globalRotCacheAdmin[dateChiavi[0]] : null; 
                for (let i = dateChiavi.length - 1; i >= 0; i--) { 
                    if (curr >= stringToNum(dateChiavi[i])) { rotCorrente = globalRotCacheAdmin[dateChiavi[i]]; break; } 
                }
                if (rotCorrente && rotCorrente[cfgBase.depositoAttivo]) { rotList = rotCorrente[cfgBase.depositoAttivo]; }
            }

            if (rotList.length > 0) {
                if (cfgBase.depositoAttivo.startsWith('tc_')) {
                    let currPos = ((curr - refRip + 6) % 15 + 15) % 15; 
                    let isBlock2 = (currPos >= 7 && currPos <= 12); 
                    let k = isBlock2 ? (currPos - 7) : currPos; 
                    let patternDopoSingolo = activeCfg.tcPattern || cfgBase.tcPattern || 'doppio'; 
                    let isAlternato = (patternDopoSingolo === 'disp') ? isBlock2 : !isBlock2;
                    let idx = Math.floor(k / 2); 
                    if (idx >= rotList.length) idx = rotList.length - 1; 
                    let t = rotList[idx].toUpperCase();
                    if (isAlternato) { 
                        let dispOnEven = (cfgBase.depositoAttivo === 'tc_spez_lido'); 
                        if (dispOnEven && k % 2 === 0) t = "DISP"; 
                        if (!dispOnEven && k % 2 !== 0) t = "DISP"; 
                    }
                    return t;
                } else {
                    let expandedRotList = []; let originalToExpanded = [];
                    for (let j = 0; j < rotList.length; j++) { 
                        originalToExpanded[j] = expandedRotList.length; 
                        let currentTurn = rotList[j].toUpperCase(); 
                        if (currentTurn.includes('+')) { 
                            let parts = currentTurn.split('+'); 
                            expandedRotList.push(parts[0].trim()); 
                            if (parts.length > 1) { expandedRotList.push(parts[1].trim()); } 
                        } else { expandedRotList.push(currentTurn); expandedRotList.push(currentTurn); } 
                    }
                    let L_exp = expandedRotList.length; 
                    let baseExpIdx = originalToExpanded[activeCfg.idx]; 
                    let blockStartIdx = baseExpIdx - (baseExpIdx % 2); 
                    let idxExp = (blockStartIdx + w + offset) % L_exp; 
                    if (idxExp < 0) idxExp += L_exp; 
                    return expandedRotList[idxExp];
                }
            }
        }
        return "N/D";
    }

    function calcolaCompagniPossibili(mioTurnoStr) {
        let mates = [];
        if (!mioTurnoStr) return mates;
        let tClean = mioTurnoStr.toUpperCase().replace(/\s+/g, '');
        
        let matchB = tClean.match(/^([1-9])B(\d{2})$/);
        if (matchB) {
            let l = matchB[1]; let f = matchB[2]; let letPilota = (l === '1' || l === '2') ? 'C' : 'P';
            mates.push(`${l}${letPilota}${f}`);
        } else {
            let matchP = tClean.match(/^([1-9])[CP](\d{2})$/);
            if (matchP) { mates.push(`${matchP[1]}B${matchP[2]}`); } 
            else {
                let match50 = tClean.match(/^([A-Z0-9]+?)(\d{2})$/);
                if (match50) {
                    let p = match50[1]; let n = parseInt(match50[2], 10);
                    if (n >= 50) mates.push(p + String(n - 50).padStart(2, '0'));
                    else mates.push(p + String(n + 50).padStart(2, '0'));
                }
            }
        }
        return mates;
    }

    async function initCachesAdmin() {
        if (globalRotCacheAdmin && globalDbCacheAdmin) return;
        globalRotCacheAdmin = {}; globalDbCacheAdmin = {};
        try {
            const resMap = await fetch("mappa_file.json?v=" + Date.now());
            if (resMap.ok) {
                const mappa = await resMap.json();
                const albero = mappa.albero || [];
                const fetchPromises = [];
                for (let file of albero) {
                    const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);
                    if (!dateMatch) continue;
                    if (file.startsWith("rotazioni_")) {
                        fetchPromises.push(fetch(file + "?v=" + Date.now()).then(r => r.json()).then(d => globalRotCacheAdmin[dateMatch[0]] = d).catch(()=>{}));
                    } else if (file.startsWith("info_turni_")) {
                        fetchPromises.push(fetch(file + "?v=" + Date.now()).then(r => r.json()).then(d => globalDbCacheAdmin[dateMatch[0]] = d).catch(()=>{}));
                    }
                }
                await Promise.all(fetchPromises);
            }
        } catch (e) { console.error("Errore download mappe admin", e); }
    }

    function mostraVistaAdmin(idVista) {
        ['view-var-admin-no-auth', 'view-var-admin-main'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = (id === idVista) ? 'flex' : 'none';
        });
    }

    // ADMIN PRIVILEGE: Nessun filtro NPL per le assenze
    function formattazioneSiglaAdmin(turnoStr) {
        return turnoStr ? turnoStr.toUpperCase().trim() : "";
    }

    async function caricaStatoVariantiAdmin() {
        mostraVistaAdmin('view-var-admin-loading');
        try {
            await initCachesAdmin(); 
            mostraVistaAdmin('view-var-admin-main');
            
            if (document.getElementById('modal-varianti-admin-main').style.display !== 'flex') {
                document.getElementById('modal-varianti-admin-main').style.display = 'flex';
            }

            const dataInput = document.getElementById('data-ricerca-varianti-admin');
            if (!dataInput.value) dataInput.value = dateToLocalISOAdmin(new Date());
            window.cercaVariantiGiornoAdmin();
        } catch (error) { 
            console.error("Errore caricamento admin", error); 
        }
    }

    // --- NUOVA FUNZIONE DI MIGRAZIONE ---
    window.migraConsensiAdmin = async function() {
        if (!confirm("Vuoi avviare la migrazione dei dati di consenso (Varianti) dalla raccolta 'calendario' alla raccolta 'utenti'?\n\nL'operazione è sicura e non eliminerà i turni degli utenti.")) return;
        
        const btn = document.getElementById('btn-migra-consensi');
        if(btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        try {
            const calSnap = await getDocs(collection(db, "calendario"));
            let count = 0;
            let promises = [];
            
            calSnap.forEach(calDoc => {
                const data = calDoc.data();
                let updates = {};
                let hasUpdates = false;
                
                // Rileva eventuali dati di consenso lasciati nella collezione calendario
                if (data.condivisioneVarianti !== undefined) { updates.condivisioneVarianti = data.condivisioneVarianti; hasUpdates = true; }
                if (data.revocheCondivisione !== undefined) { updates.revocheCondivisione = data.revocheCondivisione; hasUpdates = true; }
                if (data.bannatoVarianti !== undefined) { updates.bannatoVarianti = data.bannatoVarianti; hasUpdates = true; }
                
                if (hasUpdates) {
                    const userRef = doc(db, "utenti", calDoc.id);
                    promises.push(updateDoc(userRef, updates).then(() => count++).catch(e => {
                        console.warn("Documento utente non trovato per la migrazione: ", calDoc.id);
                    }));
                }
            });
            
            await Promise.all(promises);
            alert(`Migrazione completata con successo! Sono stati aggiornati ${count} profili.`);
            
        } catch (error) {
            console.error("Errore durante la migrazione:", error);
            alert("Errore durante la migrazione dei dati.");
        } finally {
            if(btn) btn.innerHTML = '<i class="fa-solid fa-database"></i>';
        }
    };

    // GESTIONE REVOCHE E BAN
    window.apriListaRevocheAdmin = async function() {
        document.getElementById('modal-revoche-admin').style.display = 'flex';
        const listDiv = document.getElementById('revoche-list-admin');
        listDiv.innerHTML = "<div style='text-align:center; margin-top:20px;'><i class='fa-solid fa-spinner fa-spin' style='color:var(--warning); font-size:24px;'></i></div>";

        try {
            const utentiSnapshot = await getDocs(collection(db, "utenti"));
            const utentiMap = {};
            utentiSnapshot.forEach(doc => { utentiMap[doc.id] = doc.data(); });

            const calSnapshot = await getDocs(collection(db, "calendario"));
            let revocati = [];
            let uidsProcessati = new Set();

            // Raccoglie i dati fondendo le due collezioni (nel caso ci siano utenti non migrati)
            const checkAndAdd = (uid, utenteData, calData) => {
                if (uidsProcessati.has(uid)) return;
                
                let revoche = (utenteData && utenteData.revocheCondivisione !== undefined) ? utenteData.revocheCondivisione : (calData && calData.revocheCondivisione) || 0;
                let bannato = (utenteData && utenteData.bannatoVarianti !== undefined) ? utenteData.bannatoVarianti : (calData && calData.bannatoVarianti) || false;
                
                if (revoche > 0 || bannato) {
                    revocati.push({
                        uid: uid,
                        nome: (utenteData && utenteData.nome) || (calData && calData.nomePubblico) || "Utente",
                        cognome: (utenteData && utenteData.cognome) || (calData && calData.cognomePubblico) || "Sconosciuto",
                        matricola: (utenteData && utenteData.matricola) || (calData && calData.matricolaPubblico) || "N/D",
                        revoche: revoche,
                        bannato: bannato
                    });
                    uidsProcessati.add(uid);
                }
            };

            utentiSnapshot.forEach(doc => checkAndAdd(doc.id, doc.data(), null));
            calSnapshot.forEach(doc => checkAndAdd(doc.id, utentiMap[doc.id], doc.data()));

            listDiv.innerHTML = "";
            if (revocati.length === 0) {
                listDiv.innerHTML = "<div style='text-align:center; color:var(--text-muted); padding:20px;'>Nessun utente ha blocchi o revoche attive.</div>";
                return;
            }

            revocati.forEach(u => {
                let badgeClass = u.bannato ? 'background: var(--danger);' : 'background: var(--warning); color: black;';
                let badgeText = u.bannato ? 'BANNATO' : `REVOCHE: ${u.revoche}`;
                let statusBadge = `<span style="${badgeClass} color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 8px;">${badgeText}</span>`;

                const item = document.createElement('div');
                item.className = "contact-item-admin";
                item.style.borderLeftColor = u.bannato ? 'var(--danger)' : 'var(--warning)';
                item.innerHTML = `
                    <div class="contact-info-admin">
                        <div class="contact-name-admin">${u.cognome} ${u.nome}</div>
                        <div class="contact-detail-admin">Mat: ${u.matricola} ${statusBadge}</div>
                    </div>
                    <div>
                        <button onclick="window.azzeraRevocheUtente('${u.uid}')" class="btn-action" style="background: var(--success); color: white; border: none; padding: 8px 12px; font-size: 12px; border-radius: var(--radius-sm); font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; margin: 0;">
                            <i class="fa-solid fa-unlock"></i> Sblocca
                        </button>
                    </div>
                `;
                listDiv.appendChild(item);
            });
        } catch (error) {
            console.error(error);
            listDiv.innerHTML = "<div style='color:var(--danger); text-align:center;'>Errore durante il caricamento della lista.</div>";
        }
    };

    window.azzeraRevocheUtente = async function(uid) {
        if (!confirm("Sei sicuro di voler azzerare le revoche e sbloccare questo utente?")) return;
        try {
            // Sblocca nella nuova collezione Utenti
            await updateDoc(doc(db, "utenti", uid), {
                revocheCondivisione: 0,
                bannatoVarianti: false
            });
            // Sblocca anche in Calendario per scrupolo (per chi non ha ancora subìto la migrazione)
            try {
                await updateDoc(doc(db, "calendario", uid), {
                    revocheCondivisione: 0,
                    bannatoVarianti: false
                });
            } catch(e) {}
            
            window.apriListaRevocheAdmin(); 
        } catch (error) {
            console.error(error);
            alert("Errore durante lo sblocco dell'utente.");
        }
    };

    window.cercaVariantiGiornoAdmin = async function() {
        const dataScelta = document.getElementById('data-ricerca-varianti-admin').value;
        const listDiv = document.getElementById('varianti-list-admin');
        listDiv.innerHTML = "<div style='text-align:center; margin-top:20px;'><i class='fa-solid fa-spinner fa-spin' style='color:var(--danger); font-size:24px;'></i></div>";
        document.getElementById('search-varianti-admin').value = ""; 
        
        try {
            let state = JSON.parse(localStorage.getItem('myTurniApp')) || {};
            
            // Calcolo e conversione turno admin
            let mioTurnoBase = calcolaTurnoBase(dataScelta, state);
            let mioTurnoConvertito = convertiTurnoPerMansione(mioTurnoBase, userDataPrivate.mansione);
            let mioTurnoOggi = state.variazioni && state.variazioni[dataScelta] ? state.variazioni[dataScelta] : mioTurnoConvertito;
            
            let mioTurnoClean = String(mioTurnoOggi).toUpperCase().replace(/\s+/g, '');
            let compagniPossibili = calcolaCompagniPossibili(mioTurnoOggi);
            
            let mStr = String(userDataPrivate.mansione || "").toLowerCase();
            let isMioMarinaio = mStr.includes('marinaio') || mStr.includes('timoniere');

            const utentiSnapshot = await getDocs(collection(db, "utenti"));
            const utentiMap = {};
            utentiSnapshot.forEach(doc => {
                utentiMap[doc.id] = doc.data();
            });

            const querySnapshot = await getDocs(collection(db, "calendario"));
            let turniCondivisi = [];
            
            querySnapshot.forEach((calDoc) => {
                const data = calDoc.data();
                
                if (data.deleted === true) return;
                
                const utenteData = utentiMap[calDoc.id] || {};
                
                let nomeMostrato = utenteData.nome || data.nomePubblico || "Utente";
                let cognomeMostrato = utenteData.cognome || data.cognomePubblico || `(${calDoc.id.substring(0,4)}) Sconosciuto`;
                let matricolaMostrata = utenteData.matricola || data.matricolaPubblico || "N/D";
                let omonimiaMostrata = utenteData.progressivo || data.omonimiaPubblico || "";
                
                let turnoManuale = data.variazioni && data.variazioni[dataScelta] ? String(data.variazioni[dataScelta]) : null;
                let turnoOriginaleBase = String(calcolaTurnoBase(dataScelta, data) || "N/D");
                
                turnoOriginaleBase = convertiTurnoPerMansione(turnoOriginaleBase, utenteData.mansione);
                
                let isModificato = turnoManuale !== null;
                let turnoDaMostrare = isModificato ? turnoManuale : turnoOriginaleBase;
                
                let stringaSicuraTurno = String(turnoDaMostrare || "").toUpperCase().replace(/\s+/g, '');
                
                let mTheir = String(utenteData.mansione || "").toLowerCase();
                let isTheirMarinaio = mTheir.includes('marinaio') || mTheir.includes('timoniere');
                
                let isMate = false;
                if (calDoc.id !== currentUser.uid) {
                    if (compagniPossibili.includes(stringaSicuraTurno)) {
                        isMate = true; 
                    } else if (stringaSicuraTurno === mioTurnoClean && (isMioMarinaio !== isTheirMarinaio)) {
                        if (!["NPL", "RI", "RIPOSO", "AL"].includes(stringaSicuraTurno)) {
                            isMate = true;
                        }
                    }
                }
                
                let turnoSchermato = formattazioneSiglaAdmin(turnoDaMostrare);
                let originaleSchermato = isModificato ? formattazioneSiglaAdmin(turnoOriginaleBase) : "";

                turniCondivisi.push({
                    nome: nomeMostrato,
                    cognome: cognomeMostrato,
                    omonimia: omonimiaMostrata,
                    matricola: matricolaMostrata,
                    turnoStr: turnoSchermato,
                    originaleStr: originaleSchermato,
                    modificato: isModificato,
                    isMate: isMate
                });
            });
            
            turniCondivisi.sort((a, b) => {
                if (a.isMate && !b.isMate) return -1;
                if (!a.isMate && b.isMate) return 1;
                return a.turnoStr.localeCompare(b.turnoStr, undefined, {numeric: true});
            });
            
            disegnaVariantiAdmin(turniCondivisi);
        } catch (error) { 
            console.error(error);
            listDiv.innerHTML = "<div style='color:var(--danger); text-align:center;'>Errore di caricamento.</div>"; 
        }
    };

    window.filtraVariantiAdmin = function() {
        let filter = document.getElementById('search-varianti-admin').value.toUpperCase();
        let items = document.querySelectorAll('#varianti-list-admin .contact-item-admin');
        items.forEach(item => {
            let text = item.innerText.toUpperCase();
            item.style.display = text.includes(filter) ? 'flex' : 'none';
        });
    };

    window.apriImmagineVarianteAdmin = function(turno, dateStr) {
        if (!turno || turno === "DISP" || turno === "RI" || turno === "RIPOSO" || turno === "AL") return;
        
        let dSelezionata = stringToNum(dateStr);
        let dateChiavi = Object.keys(globalDbCacheAdmin || {}).sort();
        let dbCorrente = {}; 
        let dataAttiva = dateChiavi.length > 0 ? dateChiavi[0] : "2026-03-02";
        
        for (let i = dateChiavi.length - 1; i >= 0; i--) { 
            if (dSelezionata >= stringToNum(dateChiavi[i])) { 
                dbCorrente = globalDbCacheAdmin[dateChiavi[i]]; dataAttiva = dateChiavi[i]; break; 
            } 
        }

        let chiaveTrovata = trovaChiaveEsatta(dbCorrente, turno, dateStr); 
        currentImagePathVarAdmin = `turni_${dataAttiva}/${chiaveTrovata}.jpg`; 
        imgBaseFallbackVarAdmin = `turni_${dataAttiva}/${turno}.jpg`; 
        
        let imgElement = document.getElementById('img-variante-turno-admin');
        
        imgElement.onerror = function() {
            if (imgBaseFallbackVarAdmin) {
                currentImagePathVarAdmin = imgBaseFallbackVarAdmin;
                imgElement.src = imgBaseFallbackVarAdmin;
                imgBaseFallbackVarAdmin = "";
            } else {
                imgElement.onerror = null;
                alert("L'immagine oraria per questo turno non è al momento disponibile sul server.");
                window.chiudiImageModalVariantiAdmin();
            }
        };

        imgElement.src = currentImagePathVarAdmin;
        document.getElementById('modal-image-variante-admin').style.display = 'flex';
        if (pzVarianteAdmin) { pzVarianteAdmin.reset(); }
    };

    window.chiudiImageModalVariantiAdmin = function() {
        document.getElementById('modal-image-variante-admin').style.display = 'none';
        document.getElementById('img-variante-turno-admin').removeAttribute('src');
        if (pzVarianteAdmin) { pzVarianteAdmin.reset(); }
    };

    window.chiudiImageModalVariantiSeSfondoAdmin = function(event) {
        if (event.target.id === 'modal-image-variante-admin' || event.target.id === 'imageFlexContainerVarianteAdmin') {
            window.chiudiImageModalVariantiAdmin();
        }
    };

    window.scaricaImmagineVarianteAdmin = function() {
        if (!currentImagePathVarAdmin) return; 
        const a = document.createElement('a'); 
        a.href = currentImagePathVarAdmin; 
        a.download = currentImagePathVarAdmin.split('/').pop(); 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a); 
    };

    function disegnaVariantiAdmin(array) {
        const listDiv = document.getElementById('varianti-list-admin');
        listDiv.innerHTML = "";
        
        if (array.length === 0) {
            listDiv.innerHTML = "<div style='text-align:center; color:var(--text-muted); padding:20px;'>Nessun dato trovato nel database.</div>";
            return;
        }
        
        const dataScelta = document.getElementById('data-ricerca-varianti-admin').value;

        array.forEach(c => {
            const item = document.createElement('div'); 
            item.className = "contact-item-admin" + (c.isMate ? " is-mate" : "");
            const prog = c.omonimia ? ` (${c.omonimia})` : "";
            
            let bloccoIcona = "";
            let textOriginale = "";
            let pinIcon = c.isMate ? `<i class="fa-solid fa-thumbtack" style="color:var(--success); margin-right:6px;" title="Tuo compagno di turno"></i>` : "";
            
            let canViewImg = (c.turnoStr !== "DISP" && c.turnoStr !== "RI" && c.turnoStr !== "RIPOSO" && c.turnoStr !== "AL" && !["MAL", "FER", "FEP", "FES", "PRT", "KINF"].includes(c.turnoStr));
            let spanClass = canViewImg ? `class="clickable-turn-admin" onclick="window.apriImmagineVarianteAdmin('${c.turnoStr}', '${dataScelta}')"` : "";

            if (c.modificato) {
                bloccoIcona = `<i class="fa-solid fa-pen-to-square" style="color:var(--warning); cursor:pointer;" onclick="this.parentElement.nextElementSibling.style.display = this.parentElement.nextElementSibling.style.display === 'none' ? 'block' : 'none'"></i>`;
                textOriginale = `<div class="turno-originale-admin" style="display:none;"><i class="fa-solid fa-clock-rotate-left"></i> Assegnato: <b>${c.originaleStr}</b></div>`;
            }
            
            item.innerHTML = `
                <div class="contact-info-admin">
                    <div class="contact-name-admin">${pinIcon}${c.cognome} ${c.nome}${prog}</div>
                    <div class="contact-detail-admin">Mat: ${c.matricola}</div>
                </div>
                <div>
                    <div class="turno-badge-admin">
                        <span ${spanClass}>${c.turnoStr}</span> ${bloccoIcona}
                    </div>
                    ${textOriginale}
                </div>
            `;
            listDiv.appendChild(item);
        });
    }

    caricaStatoVariantiAdmin();
}
