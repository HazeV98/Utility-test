import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. INIEZIONE UI (Gestita dal LazyLoader)
// ==========================================
export function initUIVarianti() {
    if (document.getElementById('modal-varianti-main')) return;
    
    const uiHTML = `
    <style>
        .contact-item { background: var(--surface); padding: 16px; border-radius: var(--radius-md); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm); border-left: 5px solid var(--primary); border: 1px solid var(--border-color); border-left-width: 5px; text-align: left;}
        .contact-item.is-mate { border-left-color: var(--success); background: rgba(40, 167, 69, 0.05); }
        .contact-info { text-align: left; flex: 1; }
        .contact-name { font-weight: 700; font-size: 16px; color: var(--text-main); margin-bottom: 4px; text-transform: capitalize; }
        .contact-detail { font-size: 13px; color: var(--text-muted); font-weight: 500; }
        .turno-badge { font-size: 16px; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 8px; justify-content: flex-end;}
        .turno-badge.npl { color: var(--danger); }
        .turno-originale { font-size: 12px; color: var(--text-muted); font-weight: normal; display: block; margin-top: 6px; text-align: right; background: var(--surface-hover); padding: 4px 8px; border-radius: 6px;}
        .clickable-turn { cursor: pointer; color: var(--primary); text-decoration: underline; text-underline-offset: 3px; }
    </style>

    <div id="modal-varianti-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-varianti-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            <i id="btn-var-menu" class="fa-solid fa-ellipsis-vertical" style="position: absolute; right: 60px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); display: none; padding: 0 10px;" onclick="document.getElementById('var-dropdown-menu').style.display = document.getElementById('var-dropdown-menu').style.display === 'block' ? 'none' : 'block'"></i>
            <div id="var-dropdown-menu" style="display: none; position: absolute; right: 50px; top: 50px; background: var(--surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 100; min-width: 200px;">
                <div style="padding: 12px; color: var(--danger); cursor: pointer; font-weight: bold; font-size: 14px; text-align: center;" onclick="window.annullaCondivisioneVarianti()">
                    <i class="fa-solid fa-user-slash"></i> Annulla Condivisione
                </div>
            </div>
            
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-varianti-main').style.display='none'; if(document.getElementById('var-dropdown-menu')) document.getElementById('var-dropdown-menu').style.display='none';"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <i class="fa-solid fa-calendar-users"></i> Varianti Servizio
            </h3>

            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; width: 100%;">
                
                <div id="view-var-no-auth" style="display: none; flex-direction: column; align-items: center; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--danger); margin-top: 0;">Accesso Richiesto</h3>
                </div>

                <div id="view-var-no-setup" style="display: none; flex-direction: column; align-items: center; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 48px; color: var(--warning); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--warning); margin-top: 0;">Calendario non configurato</h3>
                    <p style="color: var(--text-muted);">Configura la rotazione nel calendario prima di condividere i turni.</p>
                </div>

                <div id="view-var-opt-in" style="display: none; flex-direction: column; align-items: center; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-handshake-simple" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--primary); margin-top: 0;">Condividi i Turni</h3>
                    <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 13.5px; line-height: 1.5; text-align: justify;">In questa sezione puoi trovare un calendario in cui giorno per giorno puoi vedere la lista di colleghi che hanno accettato di condividere i propri turni e il turno che fanno, si potranno vedere anche i cambi turno salvati sul calendario. Le sigle di assenza (KMAL, KNOP, AVIS, KINF, FER, FEP, FES, PRT) non verranno visualizzate, saranno sostituite da NPL. Entrando accetti di condividere i tuoi turni con gli altri. A chi entra si chiede di tenere aggiornato il calendario con assenze e cambi per avere sempre dati accurati.</p>
                    <button class="btn-action" onclick="window.attivaCondivisioneVarianti()"><i class="fa-solid fa-share-nodes"></i> Accetta e Condividi</button>
                </div>
                
                <div id="view-var-banned" style="display: none; flex-direction: column; align-items: center; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-ban" style="font-size: 48px; color: var(--danger); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--danger); margin-top: 0;">Accesso Bloccato</h3>
                    <p style="color: var(--text-muted); font-size: 14px; text-align: center;">Hai annullato la condivisione per due volte. Per evitare l'abuso di questa funzionalità il tuo accesso alla pagina è stato bloccato.</p>
                </div>

                <div id="view-var-main" style="display: none; flex-direction: column; width: 100%;">
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <input type="date" id="data-ricerca-varianti" class="input-field" style="margin-bottom: 0; flex: 1;" onchange="window.cercaVariantiGiorno()">
                    </div>
                    
                    <div style="display: flex; gap: 10px; position: relative; width: 100%; margin-bottom: 15px;">
                        <div style="position: relative; flex: 1;">
                            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 16px; top: 13px; color: var(--text-muted);"></i>
                            <input type="text" id="search-varianti" class="input-field" style="padding-left: 45px; margin-bottom: 0; width: 100%; box-sizing: border-box;" placeholder="Cerca nome o turno..." oninput="window.filtraVarianti()">
                        </div>
                        <div style="position: relative;">
                            <button style="height: 100%; padding: 0 15px; border-radius: 8px; background: var(--surface); color: var(--text-main); border: 1px solid var(--border-color); cursor: pointer;" onclick="document.getElementById('var-filter-menu').style.display = document.getElementById('var-filter-menu').style.display === 'block' ? 'none' : 'block'">
                                <i class="fa-solid fa-filter"></i>
                            </button>
                            
                            <div id="var-filter-menu" style="display: none; position: absolute; right: 0; top: 110%; background: var(--surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 100; min-width: 150px; padding: 10px;">
                                <div style="font-size: 12px; font-weight: bold; color: var(--text-muted); margin-bottom: 8px;">Ordina per:</div>
                                <div style="padding: 8px; cursor: pointer; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;" onclick="window.impostaOrdinamentoVarianti('turni')">
                                    <span>Turni</span>
                                    <i id="check-sort-turni" class="fa-solid fa-check" style="color: var(--primary);"></i>
                                </div>
                                <div style="padding: 8px; cursor: pointer; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;" onclick="window.impostaOrdinamentoVarianti('nomi')">
                                    <span>Nomi</span>
                                    <i id="check-sort-nomi" class="fa-solid fa-check" style="color: var(--primary); display: none;"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="varianti-list" style="width: 100%;"></div>
                </div>

                <div id="view-var-loading" style="display: none; flex-direction: column; align-items: center; justify-content: center; margin-top: 40px;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i>
                </div>

            </div>
        </div>
    </div>

    <!-- Modale Visualizzatore Immagini (Stile Calendario) -->
    <div id="modal-image-variante" class="modal-overlay" style="z-index: 9999; display: none; background: rgba(0,0,0,0.9);" onclick="window.chiudiImageModalVariantiSeSfondo(event)">
        <div id="imageFlexContainerVariante" style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 30px; cursor: pointer; color: white; z-index: 10; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" onclick="window.chiudiImageModalVarianti()"></i>
            <img id="img-variante-turno" style="max-width: 100%; max-height: 100vh; object-fit: contain; transition: transform 0.2s;" src="">
            <button onclick="window.scaricaImmagineVariante()" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: 20px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 10; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-download"></i> Scarica</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================
// 2. MOTORE LOGICO E FILTRI
// ==========================================
export function avviaMotoreVarianti(db, auth, userDataPrivate) {
    const currentUser = auth.currentUser;
    let globalRotCache = null;
    let globalDbCache = null;
    const DATA_INIZIO_NUOVI_TURNI = "2026-06-01"; 
    
    // Variabili per ordinamento e cache
    window.ordineVariantiAttuale = 'turni';
    window.variantiCondiviseCache = [];

    // Variabili per visualizzatore immagini
    let pzVariante = null;
    let currentImagePathVar = "";
    let imgBaseFallbackVar = "";

    if (!currentUser) {
        mostraVista('view-var-no-auth');
        return;
    }

    // --- SETUP PANZOOM IDENTICO AL CALENDARIO ---
    const imgElem = document.getElementById('img-variante-turno');
    if (typeof Panzoom !== 'undefined' && !pzVariante) {
        pzVariante = Panzoom(imgElem, { maxScale: 5, minScale: 1 });
        document.getElementById('imageFlexContainerVariante').addEventListener('wheel', pzVariante.zoomWithWheel);
        
        function eseguiZoomToggle(e) {
            if (!pzVariante) return;
            let currentScale = pzVariante.getScale();
            if (currentScale < 1.1) { 
                pzVariante.zoom(1.75, { animate: true }); 
            } else { 
                pzVariante.reset({ animate: true }); 
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

    // --- HELPER MATEMATICI & CONVERSIONI ---
    function dateToLocalISO(d) { 
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'); 
    }

    function stringToNum(s) { 
        if(!s) return 0; 
        let p = s.split('-'); 
        return Math.floor(Date.UTC(p[0], p[1]-1, p[2]) / 86400000); 
    }

    function creaDataSicura(dataStr) { 
        if(!dataStr) return new Date(); 
        let p = dataStr.split('-'); 
        return new Date(p[0], p[1] - 1, p[2], 12, 0, 0); 
    }
    
    // Converte il codice turno in base alla mansione specificata
    function convertiTurnoPerMansione(turno, mansione) {
        if (!turno || !mansione) return turno;
        let t = String(turno).toUpperCase();
        let m = String(mansione).toLowerCase();

        let isMarinaio = m.includes('marinaio') || m.includes('timoniere');

        if (isMarinaio) {
            let matchP = t.match(/^([1-9])[CP](\d{2})$/);
            if (matchP) return `${matchP[1]}B${matchP[2]}`;
        } else {
            // Se non è marinaio/timoniere, il resto viene gestito come pilota
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

    // Ricerca della chiave turno specifica per le immagini
    function trovaChiaveEsatta(db, codiceBase, dateStr) {
        if (!db || !codiceBase) return codiceBase;
        let codiciDaCercare = [codiceBase];
        
        let matchB = codiceBase.match(/^([1-9])B(\d{2})$/);
        if (matchB) {
            let linea = matchB[1]; let finale = matchB[2];
            let letteraPilota = (linea === '1' || linea === '2') ? 'C' : 'P';
            let regex = new RegExp(`^${linea}[A-Z]${finale}$`);
            let trovati = Object.keys(db).filter(k => regex.test(k));
            if (trovati.length > 0) codiciDaCercare.push(...trovati);
            else codiciDaCercare.push(`${linea}${letteraPilota}${finale}`);
        } else {
            let match50 = codiceBase.match(/^([A-Z0-9]+?)(\d{2})$/);
            if (match50) {
                let pref = match50[1]; let num = parseInt(match50[2], 10);
                if (num >= 50) codiciDaCercare.push(pref + String(num - 50).padStart(2, '0'));
            }
        }

        let giornoIdx = creaDataSicura(dateStr).getDay(); 
        let targetDay = giornoIdx === 0 ? 7 : giornoIdx; 
        const dayMap = { "LUN": 1, "MAR": 2, "MER": 3, "GIO": 4, "VEN": 5, "SAB": 6, "DOM": 7 };

        for (let codCercato of codiciDaCercare) {
            let keys = Object.keys(db).filter(k => k === codCercato || k.startsWith(codCercato + "_"));
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
                } else {
                    if (dayMap[suffix] && dayMap[suffix] === targetDay) exactMatch = k;
                }
            }
            if (exactMatch) return exactMatch;
            if (genericMatch) return genericMatch;
        }
        return codiceBase; 
    }

    // Ricostruisce il turno originale per qualsiasi utente
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
            if (globalRotCache) {
                const dateChiavi = Object.keys(globalRotCache).sort();
                let rotCorrente = dateChiavi.length > 0 ? globalRotCache[dateChiavi[0]] : null; 
                for (let i = dateChiavi.length - 1; i >= 0; i--) { 
                    if (curr >= stringToNum(dateChiavi[i])) { rotCorrente = globalRotCache[dateChiavi[i]]; break; } 
                }
                if (rotCorrente && rotCorrente[cfgBase.depositoAttivo]) {
                    rotList = rotCorrente[cfgBase.depositoAttivo];
                }
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
                    let expandedRotList = []; 
                    let originalToExpanded = [];
                    for (let j = 0; j < rotList.length; j++) { 
                        originalToExpanded[j] = expandedRotList.length; 
                        let currentTurn = rotList[j].toUpperCase(); 
                        if (currentTurn.includes('+')) { 
                            let parts = currentTurn.split('+'); 
                            expandedRotList.push(parts[0].trim()); 
                            if (parts.length > 1) { expandedRotList.push(parts[1].trim()); } 
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
                    return expandedRotList[idxExp];
                }
            }
        }
        return "N/D";
    }

    // Identifica le sigle complementari per accoppiare gli equipaggi
    function calcolaCompagniPossibili(mioTurnoStr) {
        let mates = [];
        if (!mioTurnoStr) return mates;
        let tClean = String(mioTurnoStr).toUpperCase().replace(/\s+/g, '');
        
        let matchB = tClean.match(/^([1-9])B(\d{2})$/);
        if (matchB) {
            let l = matchB[1]; let f = matchB[2];
            let letPilota = (l === '1' || l === '2') ? 'C' : 'P';
            mates.push(`${l}${letPilota}${f}`);
        } else {
            let matchP = tClean.match(/^([1-9])[CP](\d{2})$/);
            if (matchP) {
                mates.push(`${matchP[1]}B${matchP[2]}`);
            } else {
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

    // --- CARICAMENTO DATI STRUTTURALI (CACHE) ---
    async function initCaches() {
        if (globalRotCache && globalDbCache) return;
        globalRotCache = {}; globalDbCache = {};
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
                        fetchPromises.push(fetch(file + "?v=" + Date.now()).then(r => r.json()).then(d => globalRotCache[dateMatch[0]] = d).catch(()=>{}));
                    } else if (file.startsWith("info_turni_")) {
                        fetchPromises.push(fetch(file + "?v=" + Date.now()).then(r => r.json()).then(d => globalDbCache[dateMatch[0]] = d).catch(()=>{}));
                    }
                }
                await Promise.all(fetchPromises);
            }
        } catch (e) { console.error("Errore download mappe", e); }
    }

    function mostraVista(idVista) {
        ['view-var-no-auth', 'view-var-no-setup', 'view-var-opt-in', 'view-var-loading', 'view-var-main', 'view-var-banned'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = (id === idVista) ? 'flex' : 'none';
        });
    }

    function applicaFiltroPrivacy(turnoStr) {
        if (!turnoStr) return "";
        let t = String(turnoStr).toUpperCase().trim();
        const codiciSensibili = ["KMAL", "KNOP", "AVIS", "KINF", "FER", "FEP", "FES", "PRT"];
        let isSensibile = codiciSensibili.some(codice => {
            let regex = new RegExp(`\\b${codice}\\b`);
            return regex.test(t);
        });
        return isSensibile ? "NPL" : t;
    }

    // Funzione per impostare e gestire l'ordinamento
    window.impostaOrdinamentoVarianti = function(tipo) {
        window.ordineVariantiAttuale = tipo;
        document.getElementById('var-filter-menu').style.display = 'none';
        document.getElementById('check-sort-turni').style.display = tipo === 'turni' ? 'block' : 'none';
        document.getElementById('check-sort-nomi').style.display = tipo === 'nomi' ? 'block' : 'none';
        if (window.variantiCondiviseCache && window.variantiCondiviseCache.length > 0) {
            window.ordinaEDisegnaVarianti();
        }
    };

    window.ordinaEDisegnaVarianti = function() {
        let array = window.variantiCondiviseCache;
        array.sort((a, b) => {
            if (a.isMate && !b.isMate) return -1;
            if (!a.isMate && b.isMate) return 1;
            
            if (window.ordineVariantiAttuale === 'nomi') {
                let cmpCognome = a.cognome.localeCompare(b.cognome);
                if (cmpCognome !== 0) return cmpCognome;
                return a.nome.localeCompare(b.nome);
            } else {
                return a.turnoStr.localeCompare(b.turnoStr, undefined, {numeric: true});
            }
        });
        disegnaVarianti(array);
        window.filtraVarianti(); 
    };

    async function caricaStatoVarianti() {
        mostraVista('view-var-loading');
        let state = JSON.parse(localStorage.getItem('myTurniApp')) || {};
        if (!state.depositoAttivo) { mostraVista('view-var-no-setup'); return; }

        try {
            await initCaches(); 
            const userRef = doc(db, "utenti", currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const data = userSnap.data();
                
                if (data.bannatoVarianti) {
                    mostraVista('view-var-banned');
                    if (document.getElementById('btn-var-menu')) document.getElementById('btn-var-menu').style.display = 'none';
                    return;
                }
                
                if (data.condivisioneVarianti === true) {
                    if (document.getElementById('btn-var-menu')) document.getElementById('btn-var-menu').style.display = 'block';
                    mostraVista('view-var-main');
                    const dataInput = document.getElementById('data-ricerca-varianti');
                    if (!dataInput.value) dataInput.value = dateToLocalISO(new Date()); 
                    window.cercaVariantiGiorno();
                } else {
                    if (document.getElementById('btn-var-menu')) document.getElementById('btn-var-menu').style.display = 'none';
                    mostraVista('view-var-opt-in');
                }
            } else {
                mostraVista('view-var-opt-in');
            }
        } catch (error) { 
            console.error("Errore lettura varianti", error); 
            mostraVista('view-var-opt-in');
        }
    }

    window.attivaCondivisioneVarianti = async function() {
        mostraVista('view-var-loading');
        try {
            const userRef = doc(db, "utenti", currentUser.uid);
            await updateDoc(userRef, {
                condivisioneVarianti: true
            });
            caricaStatoVarianti(); 
        } catch (e) { 
            alert("Errore durante l'attivazione della condivisione."); 
            mostraVista('view-var-opt-in');
        }
    };
    
    window.annullaCondivisioneVarianti = async function() {
        if(document.getElementById('var-dropdown-menu')) document.getElementById('var-dropdown-menu').style.display = 'none';
        
        const msg = "ATTENZIONE: Per evitare che qualcuno approfitti della funzione dando la condivisione solo per spiare i turni altrui e poi toglierla, puoi annullare la condivisione al massimo una volta.\n\nSe annulli per la seconda volta, l'accesso alla pagina ti sarà BLOCCATO definitivamente.\n\nSei sicuro di voler annullare la condivisione?";
        if (!confirm(msg)) return;
        
        mostraVista('view-var-loading');
        if (document.getElementById('btn-var-menu')) document.getElementById('btn-var-menu').style.display = 'none';
        
        try {
            const userRef = doc(db, "utenti", currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            let revoche = 0;
            if (userSnap.exists() && userSnap.data().revocheCondivisione) {
                revoche = userSnap.data().revocheCondivisione;
            }
            
            revoche++;
            let payload = {
                condivisioneVarianti: false,
                revocheCondivisione: revoche
            };
            
            if (revoche >= 2) {
                payload.bannatoVarianti = true;
            }
            
            await updateDoc(userRef, payload);
            caricaStatoVarianti();
            
        } catch (error) {
            console.error("Errore disattivazione:", error);
            alert("Si è verificato un errore.");
            caricaStatoVarianti();
        }
    };

    window.cercaVariantiGiorno = async function() {
        const dataScelta = document.getElementById('data-ricerca-varianti').value;
        const listDiv = document.getElementById('varianti-list');
        listDiv.innerHTML = "<div style='text-align:center; margin-top:20px;'><i class='fa-solid fa-spinner fa-spin' style='color:var(--primary); font-size:24px;'></i></div>";
        document.getElementById('search-varianti').value = ""; 
        
        try {
            let state = JSON.parse(localStorage.getItem('myTurniApp')) || {};
            
            let mioTurnoBase = calcolaTurnoBase(dataScelta, state);
            let mioTurnoConvertito = convertiTurnoPerMansione(mioTurnoBase, userDataPrivate.mansione);
            let mioTurnoOggi = state.variazioni && state.variazioni[dataScelta] ? state.variazioni[dataScelta] : mioTurnoConvertito;
            
            let mioTurnoClean = String(mioTurnoOggi).toUpperCase().replace(/\s+/g, '');
            let compagniPossibili = calcolaCompagniPossibili(mioTurnoOggi);
            
            let isMioMarinaio = false;
            let mStr = String(userDataPrivate.mansione || "").toLowerCase();
            if (mStr.includes('marinaio') || mStr.includes('timoniere')) {
                isMioMarinaio = true;
            }

            const q = query(collection(db, "utenti"), where("condivisioneVarianti", "==", true));
            const querySnapshot = await getDocs(q);
            
            let turniCondivisi = [];
            let promises = [];
            
            querySnapshot.forEach((userDoc) => {
                const userData = userDoc.data();
                if (userData.cognome) { 
                    const calRef = doc(db, "calendario", userDoc.id);
                    promises.push(getDoc(calRef).then(calSnap => {
                        return { 
                            id: userDoc.id, 
                            userData: userData, 
                            calData: calSnap.exists() ? calSnap.data() : {} 
                        };
                    }));
                }
            });

            const risultati = await Promise.all(promises);

            risultati.forEach((res) => {
                const userData = res.userData;
                const calData = res.calData;
                
                let turnoManuale = calData.variazioni && calData.variazioni[dataScelta] ? String(calData.variazioni[dataScelta]) : null;
                let turnoOriginaleBase = String(calcolaTurnoBase(dataScelta, calData) || "N/D");
                
                turnoOriginaleBase = convertiTurnoPerMansione(turnoOriginaleBase, userData.mansione);
                
                let isModificato = turnoManuale !== null;
                let turnoDaMostrare = isModificato ? turnoManuale : turnoOriginaleBase;
                
                let stringaSicuraTurno = String(turnoDaMostrare || "").toUpperCase().replace(/\s+/g, '');
                
                let mTheir = String(userData.mansione || "").toLowerCase();
                let isTheirMarinaio = mTheir.includes('marinaio') || mTheir.includes('timoniere');
                
                let isMate = false;
                if (res.id !== currentUser.uid) {
                    if (compagniPossibili.includes(stringaSicuraTurno)) {
                        isMate = true; 
                    } else if (stringaSicuraTurno === mioTurnoClean && (isMioMarinaio !== isTheirMarinaio)) {
                        if (!["NPL", "RI", "RIPOSO", "AL"].includes(stringaSicuraTurno)) {
                            isMate = true;
                        }
                    }
                }
                
                let turnoSchermato = applicaFiltroPrivacy(turnoDaMostrare);
                let originaleSchermato = isModificato ? applicaFiltroPrivacy(turnoOriginaleBase) : "";

                turniCondivisi.push({
                    nome: userData.nome,
                    cognome: userData.cognome,
                    omonimia: userData.progressivo || "",
                    matricola: userData.matricola || "",
                    turnoStr: turnoSchermato,
                    originaleStr: originaleSchermato,
                    modificato: isModificato,
                    isMate: isMate
                });
            });
            
            window.variantiCondiviseCache = turniCondivisi;
            window.ordinaEDisegnaVarianti();
            
        } catch (error) { 
            console.error(error);
            listDiv.innerHTML = "<div style='color:var(--danger); text-align:center;'>Errore di caricamento.</div>"; 
        }
    };

    window.filtraVarianti = function() {
        let filter = document.getElementById('search-varianti').value.toUpperCase();
        let items = document.querySelectorAll('#varianti-list .contact-item');
        items.forEach(item => {
            let text = item.innerText.toUpperCase();
            item.style.display = text.includes(filter) ? 'flex' : 'none';
        });
    };

    // --- LOGICA INTERATTIVA IMMAGINI ---
    window.apriImmagineVariante = function(turno, dateStr) {
        if (!turno || turno === "NPL" || turno === "DISP" || turno === "RI" || turno === "RIPOSO" || turno === "AL") return;
        
        let dSelezionata = stringToNum(dateStr);
        let dateChiavi = Object.keys(globalDbCache || {}).sort();
        let dbCorrente = {}; 
        let dataAttiva = dateChiavi.length > 0 ? dateChiavi[0] : "2026-03-02";
        
        for (let i = dateChiavi.length - 1; i >= 0; i--) { 
            if (dSelezionata >= stringToNum(dateChiavi[i])) { 
                dbCorrente = globalDbCache[dateChiavi[i]]; dataAttiva = dateChiavi[i]; break; 
            } 
        }

        let chiaveTrovata = trovaChiaveEsatta(dbCorrente, turno, dateStr); 
        currentImagePathVar = `turni_${dataAttiva}/${chiaveTrovata}.jpg`; 
        imgBaseFallbackVar = `turni_${dataAttiva}/${turno}.jpg`; 
        
        let imgElement = document.getElementById('img-variante-turno');
        
        imgElement.onerror = function() {
            if (imgBaseFallbackVar) {
                currentImagePathVar = imgBaseFallbackVar;
                imgElement.src = imgBaseFallbackVar;
                imgBaseFallbackVar = "";
            } else {
                imgElement.onerror = null;
                alert("L'immagine oraria per questo turno non è al momento disponibile sul server.");
                window.chiudiImageModalVarianti();
            }
        };

        imgElement.src = currentImagePathVar;
        document.getElementById('modal-image-variante').style.display = 'flex';
        if (pzVariante) { pzVariante.reset(); }
    };

    window.chiudiImageModalVarianti = function() {
        document.getElementById('modal-image-variante').style.display = 'none';
        document.getElementById('img-variante-turno').removeAttribute('src');
        if (pzVariante) { pzVariante.reset(); }
    };

    window.chiudiImageModalVariantiSeSfondo = function(event) {
        if (event.target.id === 'modal-image-variante' || event.target.id === 'imageFlexContainerVariante') {
            window.chiudiImageModalVarianti();
        }
    };

    window.scaricaImmagineVariante = function() {
        if (!currentImagePathVar) return; 
        const a = document.createElement('a'); 
        a.href = currentImagePathVar; 
        a.download = currentImagePathVar.split('/').pop(); 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a); 
    };

    function disegnaVarianti(array) {
        const listDiv = document.getElementById('varianti-list');
        listDiv.innerHTML = "";
        
        if (array.length === 0) {
            listDiv.innerHTML = "<div style='text-align:center; color:var(--text-muted); padding:20px;'>Nessun collega ha condiviso i turni per questa data.</div>";
            return;
        }
        
        const dataScelta = document.getElementById('data-ricerca-varianti').value;

        array.forEach(c => {
            const item = document.createElement('div'); 
            item.className = "contact-item" + (c.isMate ? " is-mate" : "");
            const prog = c.omonimia ? ` (${c.omonimia})` : "";
            
            let classeNpl = c.turnoStr === "NPL" ? "npl" : "";
            let bloccoIcona = "";
            let textOriginale = "";
            let pinIcon = c.isMate ? `<i class="fa-solid fa-thumbtack" style="color:var(--success); margin-right:6px;" title="Tuo compagno di turno"></i>` : "";
            
            let canViewImg = (c.turnoStr !== "NPL" && c.turnoStr !== "DISP" && c.turnoStr !== "RI" && c.turnoStr !== "RIPOSO" && c.turnoStr !== "AL");
            let spanClass = canViewImg ? `class="clickable-turn" onclick="window.apriImmagineVariante('${c.turnoStr}', '${dataScelta}')"` : "";

            if (c.modificato) {
                bloccoIcona = `<i class="fa-solid fa-pen-to-square" style="color:var(--warning); cursor:pointer;" onclick="this.parentElement.nextElementSibling.style.display = this.parentElement.nextElementSibling.style.display === 'none' ? 'block' : 'none'"></i>`;
                textOriginale = `<div class="turno-originale" style="display:none;"><i class="fa-solid fa-clock-rotate-left"></i> Assegnato: <b>${c.originaleStr}</b></div>`;
            }
            
            item.innerHTML = `
                <div class="contact-info">
                    <div class="contact-name">${pinIcon}${c.cognome} ${c.nome}${prog}</div>
                    <div class="contact-detail">Mat: ${c.matricola}</div>
                </div>
                <div>
                    <div class="turno-badge ${classeNpl}">
                        <span ${spanClass}>${c.turnoStr}</span> ${bloccoIcona}
                    </div>
                    ${textOriginale}
                </div>
            `;
            listDiv.appendChild(item);
        });
    }

    caricaStatoVarianti();
}
