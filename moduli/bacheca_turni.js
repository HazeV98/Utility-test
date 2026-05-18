import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const LISTA_FILE_INFO = ["info_turni_2026-03-02.json", "info_turni_2026-03-28.json"];
let localDbCache = {};
let dbCachePrecaricata = false;

async function precaricaTuttiDB() {
    if (dbCachePrecaricata) return;
    for (let file of LISTA_FILE_INFO) {
        const match = file.match(/\d{4}-\d{2}-\d{2}/);
        const dataInizio = match ? match[0] : null;
        if (dataInizio && !localDbCache[dataInizio]) {
            try {
                const res = await fetch(file + "?v=" + new Date().getTime());
                if (res.ok) {
                    localDbCache[dataInizio] = await res.json();
                }
            } catch(e) { console.warn("Impossibile caricare " + file); }
        }
    }
    dbCachePrecaricata = true;
}

export async function avviaMotoreBachecaTurni(db, auth, userDataPrivate, isAdmin) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        nascondiTutto();
        document.getElementById('bt-view-no-auth').style.display = 'flex';
        return;
    }

    let myAnnunciAttivi = []; 
    let currentImagePath = "";
    let imgBaseFallback = "";
    let pzInstance = null;
    let dbInUso = null;
    let dataAttivaDb = "";
    let adTypeSelezionato = 'turno';

    // Inizializza Panzoom se non è già stato fatto per l'immagine
    const imgElem = document.getElementById('turnoImage');
    if (imgElem && typeof Panzoom !== 'undefined' && !imgElem.hasAttribute('data-panzoom-init')) {
        pzInstance = Panzoom(imgElem, { maxScale: 5, minScale: 1 });
        imgElem.setAttribute('data-panzoom-init', 'true');
        
        const flexContainer = document.getElementById('imageFlexContainer');
        if(flexContainer) {
            flexContainer.addEventListener('wheel', pzInstance.zoomWithWheel);
        }
        
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

    function nascondiTutto() { 
        if(document.getElementById('bt-view-no-auth')) document.getElementById('bt-view-no-auth').style.display = 'none';
        if(document.getElementById('bt-view-main')) document.getElementById('bt-view-main').style.display = 'none';
    }

    function getOggiLocale() {
        const d = new Date();
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

    function caricaDbCorrenteSincrono(dateStr) {
        const dateChiavi = Object.keys(localDbCache).sort();
        if (dateChiavi.length === 0) return null;
        
        const dSelezionata = stringToNum(dateStr);
        let dataTrovata = dateChiavi[0];
        let dbTrovato = localDbCache[dataTrovata];

        for (let i = dateChiavi.length - 1; i >= 0; i--) { 
            if (dSelezionata >= stringToNum(dateChiavi[i])) { 
                dataTrovata = dateChiavi[i];
                dbTrovato = localDbCache[dateChiavi[i]];
                break;
            } 
        }
        
        dbInUso = dbTrovato;
        dataAttivaDb = dataTrovata;
        return { db: dbTrovato, dataDb: dataTrovata };
    }

    function trovaChiaveEsatta(dbTarget, codiceBase, dateStr) {
        if (!dbTarget || !codiceBase) return codiceBase;
        let codiciDaCercare = [codiceBase];
        
        let matchB = codiceBase.match(/^([1-9])B(\d{2})$/);
        if (matchB) {
            let linea = matchB[1]; let finale = matchB[2];
            let letteraPilota = (linea === '1' || linea === '2') ? 'C' : 'P';
            let regex = new RegExp(`^${linea}[A-Z]${finale}$`);
            let trovati = Object.keys(dbTarget).filter(k => regex.test(k));
            if (trovati.length > 0) codiciDaCercare.push(...trovati);
            else codiciDaCercare.push(`${linea}${letteraPilota}${finale}`);
        } else {
            let match50 = codiceBase.match(/^([A-Z0-9]+?)(\d{2})$/);
            if (match50) {
                let pref = match50[1]; let num = parseInt(match50[2], 10);
                if (num >= 50) codiciDaCercare.push(pref + String(num - 50).padStart(2, '0'));
            }
        }

        let targetDay = creaDataSicura(dateStr).getDay(); 
        targetDay = targetDay === 0 ? 7 : targetDay; 
        const dayMap = { "LUN": 1, "MAR": 2, "MER": 3, "GIO": 4, "VEN": 5, "SAB": 6, "DOM": 7 };

        for (let codCercato of codiciDaCercare) {
            let keys = Object.keys(dbTarget).filter(k => k === codCercato || k.startsWith(codCercato + "_"));
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

    function formatTimeForInput(timeStr) {
        if (!timeStr) return "";
        let parts = timeStr.replace('.', ':').split(':');
        if (parts.length >= 2) {
            let h = parts[0].trim().padStart(2, '0');
            let m = parts[1].trim().padStart(2, '0');
            return `${h}:${m}`;
        }
        return timeStr;
    }

    function formattaData(isoStr) {
        if(!isoStr) return "";
        const d = new Date(isoStr);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    async function checkStato() {
        try {
            const ok = userDataPrivate.nome && userDataPrivate.cognome && userDataPrivate.matricola && userDataPrivate.mansione && userDataPrivate.telefono;
            
            nascondiTutto();
            document.getElementById('bt-view-main').style.display = 'flex';

            if (!ok) {
                window.apriModaleProfiloBT(); 
                const btnClose = document.getElementById('btnCloseProfileModalBT');
                if(btnClose) btnClose.style.display = 'none'; 
                return;
            }

            const fManElem = document.getElementById('bt-filtroMansione');
            if(fManElem && !fManElem.value) fManElem.value = userDataPrivate.mansione || "Tutte";
            
            const today = getOggiLocale(); 
            
            let qCleanup = isAdmin ? collection(db, "bacheca_turni") : query(collection(db, "bacheca_turni"), where("uid", "==", currentUser.uid));
            const adsSnap = await getDocs(qCleanup);
            myAnnunciAttivi = [];
            
            adsSnap.forEach(d => {
                const a = d.data();
                if(a.data_scambio > today) {
                    if (a.uid === currentUser.uid) myAnnunciAttivi.push(a);
                } else {
                    deleteDoc(doc(db, "bacheca_turni", d.id)).catch(e => {});
                }
            });

            window.caricaBachecaTurni();
        } catch (error) { console.error(error); }
    }

    // ==============================================================
    // FUNZIONI ESPOSTE GLOBALMENTE SULL'OGGETTO WINDOW
    // ==============================================================

    window.apriModaleProfiloBT = function() {
        document.getElementById('bt-regNome').value = userDataPrivate.nome || "";
        document.getElementById('bt-regCognome').value = userDataPrivate.cognome || "";
        document.getElementById('bt-regProgressivo').value = userDataPrivate.progressivo || "";
        document.getElementById('bt-regMatricola').value = userDataPrivate.matricola || "";
        document.getElementById('bt-regTelefono').value = userDataPrivate.telefono || "";
        document.getElementById('bt-regMansione').value = userDataPrivate.mansione || "";
        
        const ok = userDataPrivate.nome && userDataPrivate.cognome && userDataPrivate.matricola && userDataPrivate.mansione && userDataPrivate.telefono;
        const btnClose = document.getElementById('btnCloseProfileModalBT');
        if(btnClose) btnClose.style.display = ok ? 'block' : 'none';

        document.getElementById('bt-profileModal').style.display = 'flex';
    };

    window.chiudiModaleProfiloBT = function() {
        document.getElementById('bt-profileModal').style.display = 'none';
    };

    window.salvaProfiloBT = async function() {
        const n = document.getElementById('bt-regNome').value.trim();
        const c = document.getElementById('bt-regCognome').value.trim();
        const p = document.getElementById('bt-regProgressivo').value.trim();
        const mat = document.getElementById('bt-regMatricola').value.trim();
        const tel = document.getElementById('bt-regTelefono').value.trim();
        const man = document.getElementById('bt-regMansione').value;

        if(!n || !c || !mat || !tel || !man) return alert("Compila tutti i campi obbligatori per usare la bacheca.");
        
        const btnSalva = document.getElementById('btnSalvaProfiloBT');
        btnSalva.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio...";
        try {
            await setDoc(doc(db, "utenti", currentUser.uid), { nome: n, cognome: c, progressivo: p, matricola: mat, telefono: tel, mansione: man }, { merge: true });
            btnSalva.innerHTML = "<i class='fa-solid fa-check'></i> Salva Dati";
            
            // Aggiorna cache locale
            userDataPrivate.nome = n; userDataPrivate.cognome = c; userDataPrivate.progressivo = p;
            userDataPrivate.matricola = mat; userDataPrivate.telefono = tel; userDataPrivate.mansione = man;
            
            window.chiudiModaleProfiloBT();
            checkStato();
        } catch(e) { 
            alert("Errore"); 
            btnSalva.innerHTML = "<i class='fa-solid fa-check'></i> Salva Dati"; 
        }
    };

    window.apriModaleAnnuncioBT = async function() {
        document.getElementById('bt-adModal').style.display = 'flex';
        window.switchAdTabBT('turno');
        
        let todayStr = getOggiLocale();
        document.getElementById('bt-adDataTurno').value = todayStr;
        
        window.svuotaCampiTurnoBT();
        document.getElementById('bt-adCodiceTurno').value = "";
        document.getElementById('bt-adDataRiposo').value = "";
        document.getElementById('bt-adDataRestituzione1').value = ""; 
        document.getElementById('bt-adDataRestituzione2').value = "";
        document.getElementById('bt-adNote').value = "";

        window.verificaTurnoBT(); 
    };

    window.switchAdTabBT = function(type) {
        adTypeSelezionato = type;
        document.getElementById('bt-tab-ad-turno').classList.remove('active');
        document.getElementById('bt-tab-ad-riposo').classList.remove('active');
        document.getElementById('bt-tab-ad-'+type).classList.add('active');
        document.getElementById('bt-form-ad-turno').style.display = type === 'turno' ? 'block' : 'none';
        document.getElementById('bt-form-ad-riposo').style.display = type === 'riposo' ? 'block' : 'none';
    };

    window.svuotaCampiTurnoBT = function() {
        document.getElementById('bt-adOraInizio').value = ""; document.getElementById('bt-adOraFine').value = "";
        document.getElementById('bt-adLuogoInizio').value = ""; document.getElementById('bt-adLuogoFine').value = "";
        document.getElementById('bt-adChiaveEsatta').value = ""; document.getElementById('bt-adDataAttivaDb').value = "";
    };

    window.verificaTurnoBT = function() {
        let dateStr = document.getElementById('bt-adDataTurno').value;
        if(!dateStr) dateStr = getOggiLocale();
        
        caricaDbCorrenteSincrono(dateStr);

        const codiceBase = document.getElementById('bt-adCodiceTurno').value.trim().toUpperCase();
        
        if (!codiceBase || !dbInUso) {
            window.svuotaCampiTurnoBT();
            return;
        }

        let chiaveTrovata = trovaChiaveEsatta(dbInUso, codiceBase, dateStr); 
        let dettagli = dbInUso[chiaveTrovata];

        if (dettagli) {
            if(dettagli.inizio) document.getElementById('bt-adOraInizio').value = formatTimeForInput(dettagli.inizio);
            if(dettagli.fine) document.getElementById('bt-adOraFine').value = formatTimeForInput(dettagli.fine);
            
            if(dettagli.luogoInizio) document.getElementById('bt-adLuogoInizio').value = dettagli.luogoInizio;
            if(dettagli.luogoFine) document.getElementById('bt-adLuogoFine').value = dettagli.luogoFine;
            
            document.getElementById('bt-adChiaveEsatta').value = chiaveTrovata;
            document.getElementById('bt-adDataAttivaDb').value = dataAttivaDb;
        } else {
            window.svuotaCampiTurnoBT();
        }
    };

    window.pubblicaAnnuncioBT = async function() {
        const btn = document.getElementById('bt-btnPubblica');
        let payload = {
            uid: currentUser.uid,
            nome: userDataPrivate.nome, cognome: userDataPrivate.cognome, 
            progressivo: userDataPrivate.progressivo || "",
            mansione: userDataPrivate.mansione.trim(), 
            matricola: userDataPrivate.matricola, telefono: userDataPrivate.telefono,
            timestamp: new Date().getTime(), tipo_annuncio: adTypeSelezionato,
            note: document.getElementById('bt-adNote').value.trim()
        };

        if (adTypeSelezionato === 'turno') {
            const dataT = document.getElementById('bt-adDataTurno').value;
            if(!dataT) return alert("Inserisci la data del turno.");
            
            const codiceT = document.getElementById('bt-adCodiceTurno').value.trim().toUpperCase();
            if(!codiceT) return alert("Devi inserire il codice del turno che stai cedendo.");

            payload.data_scambio = dataT;
            payload.cerco = document.getElementById('bt-adCercoTurno').value;
            payload.cedo = document.getElementById('bt-adCedoTurno').value;
            payload.codice_turno = codiceT;
            payload.ora_inizio = document.getElementById('bt-adOraInizio').value;
            payload.ora_fine = document.getElementById('bt-adOraFine').value;
            payload.luogo_inizio = document.getElementById('bt-adLuogoInizio').value;
            payload.luogo_fine = document.getElementById('bt-adLuogoFine').value;
            
            payload.chiave_esatta = document.getElementById('bt-adChiaveEsatta').value;
            payload.data_attiva_db = document.getElementById('bt-adDataAttivaDb').value;
        } else {
            const dataR = document.getElementById('bt-adDataRiposo').value;
            if(!dataR) return alert("Inserisci la data.");
            payload.data_scambio = dataR; payload.cerco = 'riposo'; payload.cedo = 'riposo';
            let res = [];
            const d1 = document.getElementById('bt-adDataRestituzione1').value;
            const d2 = document.getElementById('bt-adDataRestituzione2').value;
            if(d1) res.push(d1); if(d2) res.push(d2);
            payload.restituzione = res;
        }

        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Pubblicazione...";
        try {
            await addDoc(collection(db, "bacheca_turni"), payload);
            document.getElementById('bt-adModal').style.display = 'none';
            btn.innerHTML = "<i class='fa-solid fa-paper-plane'></i> Pubblica Annuncio";
            checkStato();
        } catch(e) { alert("Errore"); btn.innerHTML = "<i class='fa-solid fa-paper-plane'></i> Pubblica Annuncio"; }
    };

    window.apriImmagineTurnoBT = function(codiceTurno, dataScambio) {
        if (!codiceTurno || !dataScambio) {
            alert("Dati mancanti per aprire l'immagine.");
            return;
        }
        
        let codicePulito = codiceTurno.toUpperCase().trim();
        caricaDbCorrenteSincrono(dataScambio); 

        let dataAttiva = dataAttivaDb || "2026-03-02"; 
        let chiaveTrovata = trovaChiaveEsatta(dbInUso, codicePulito, dataScambio);

        if (chiaveTrovata && chiaveTrovata !== codicePulito && dbInUso && dbInUso[chiaveTrovata]) { 
            currentImagePath = `turni_${dataAttiva}/${chiaveTrovata}.jpg`; 
            imgBaseFallback = `turni_${dataAttiva}/${codicePulito}.jpg`; 
        } else { 
            currentImagePath = `turni_${dataAttiva}/${codicePulito}.jpg`; 
            imgBaseFallback = ""; 
        }
        
        let imgElement = document.getElementById('turnoImage');
        if(imgElement) {
            imgElement.onerror = window.erroreImmagineBT; 
            imgElement.src = currentImagePath; 
            if (pzInstance) { pzInstance.reset(); } 
        }
        document.getElementById('imageModal').style.display = 'block'; 
    };

    window.erroreImmagineBT = function() { 
        let imgElement = document.getElementById('turnoImage'); 
        if (imgBaseFallback && imgElement) { 
            currentImagePath = imgBaseFallback; 
            imgElement.src = imgBaseFallback; 
            imgBaseFallback = ""; 
        } else { 
            if(imgElement) imgElement.onerror = null; 
            alert("L'immagine del turno non è stata trovata nel database."); 
            window.chiudiImageModalBT(); 
        } 
    };

    window.chiudiImageModalBT = function() {
        document.getElementById('imageModal').style.display = 'none';
        const imgElement = document.getElementById('turnoImage');
        if(imgElement) imgElement.removeAttribute('src');
        if (pzInstance) { pzInstance.reset(); }
    };

    window.chiudiImageModalSeSfondoBT = function(event) {
        if (event.target.id === 'imageModal' || event.target.id === 'imageFlexContainer') window.chiudiImageModalBT();
    };
    
    window.scaricaImmagineTurnoBT = function() { 
        if (!currentImagePath) return; 
        const a = document.createElement('a'); 
        a.href = currentImagePath; 
        a.download = currentImagePath.split('/').pop(); 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a); 
    };

    window.caricaBachecaTurni = async function() {
        const containerRes = document.getElementById('bt-lista-annunci');
        const containerSug = document.getElementById('bt-suggeriti-bacheca');
        const divSugContainer = document.getElementById('bt-suggeriti-bacheca-container');
        
        const fManElem = document.getElementById('bt-filtroMansione');
        const fDataElem = document.getElementById('bt-filtroData');
        const fMan = fManElem ? fManElem.value : "Tutte";
        const fData = fDataElem ? fDataElem.value : "";
        const today = getOggiLocale(); 

        if(containerRes) containerRes.innerHTML = "<div style='color:var(--text-muted); text-align:center; padding: 20px;'><i class='fa-solid fa-spinner fa-spin'></i> Caricamento annunci...</div>";
        if(containerSug) containerSug.innerHTML = "";

        try {
            let q = fMan === "Tutte" ? query(collection(db, "bacheca_turni")) : query(collection(db, "bacheca_turni"), where("mansione", "==", fMan));
            const snap = await getDocs(q);
            let annunci = [];
            snap.forEach(doc => {
                const a = doc.data(); a.id = doc.id;
                if(a.data_scambio > today) annunci.push(a);
            });

            if(fData) annunci = annunci.filter(a => a.data_scambio === fData);
            annunci.sort((a,b) => a.data_scambio.localeCompare(b.data_scambio));

            if(containerRes) containerRes.innerHTML = "";
            let suggeriti = 0;

            annunci.forEach(a => {
                const isMe = a.uid === currentUser.uid;
                const canDelete = isMe || isAdmin; 
                const progLabel = a.progressivo ? ` (${a.progressivo})` : "";
                
                let isSuggested = false;
                if (!isMe) {
                    isSuggested = myAnnunciAttivi.some(mio => {
                        if(mio.data_scambio === a.data_scambio && mio.cerco === a.cedo) return true;
                        return false;
                    });
                }
                if (isSuggested) suggeriti++;

                const showWa = !isMe && a.telefono; 
                const itemClass = isSuggested ? "card-suggested" : "card";
                const numClean = (a.telefono||"").replace(/\s+/g, '');
                const dateFormatted = formattaData(a.data_scambio);

                let corpoHTML = "";
                if (a.tipo_annuncio === 'turno') {
                    
                    let infoTurnoHTML = "";
                    if (a.ora_inizio || a.luogo_inizio) {
                        infoTurnoHTML = `
                            <div style="font-size: 12px; color: var(--text-muted); margin-top: 12px; padding: 12px; background: var(--bg-color); border-radius: 8px; border-left: 3px solid var(--primary);">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                    <span><b><i class="fa-regular fa-clock"></i> Inizio:</b> ${a.ora_inizio || '--:--'}</span>
                                    <span><b><i class="fa-regular fa-clock"></i> Fine:</b> ${a.ora_fine || '--:--'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span><b>Da:</b> ${a.luogo_inizio || '--'}</span>
                                    <span><b>A:</b> ${a.luogo_fine || '--'}</span>
                                </div>
                            </div>
                        `;
                    }

                    let btnImmagine = "";
                    if (a.codice_turno) {
                        let codBase = a.codice_turno.toUpperCase();
                        let isRiposo = (codBase === 'RI' || codBase === 'RIPOSO' || codBase === 'AL' || codBase === 'DISP' || codBase === 'NESSUN TURNO');
                        
                        if (!isRiposo) {
                            btnImmagine = `<div style="margin-top: 12px;"><button onclick="window.apriImmagineTurnoBT('${a.codice_turno}', '${a.data_scambio}')" style="background:transparent; border:2px solid var(--primary); color:var(--primary); padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:8px; width: 100%; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='var(--primary)'; this.style.color='white';" onmouseout="this.style.background='transparent'; this.style.color='var(--primary)';"><i class="fa-regular fa-image"></i> Mostra Immagine Turno</button></div>`;
                        }
                    }

                    corpoHTML = `
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text-main);"><i class="fa-regular fa-calendar" style="color:var(--primary);"></i> ${dateFormatted}</div>
                        <div><span class="badge badge-${a.cerco}">CERCA: ${a.cerco.toUpperCase()}</span></div>
                        <div style="margin-top: 4px;"><span class="badge badge-${a.cedo}">CEDE: ${a.cedo.toUpperCase()} ${a.codice_turno ? '('+a.codice_turno+')' : ''}</span></div>
                        ${infoTurnoHTML}
                        ${btnImmagine}
                    `;
                } else {
                    let restStr = a.restituzione && a.restituzione.length > 0 ? a.restituzione.map(formattaData).join(' o ') : "Da concordare";
                    corpoHTML = `
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text-main);"><i class="fa-solid fa-bed" style="color:var(--text-muted);"></i> CERCA RIPOSO IL: ${dateFormatted}</div>
                        <div style="margin-top: 4px;"><span class="badge badge-riposo">RESTITUISCE: ${restStr}</span></div>
                    `;
                }
                
                let noteHTML = "";
                if (a.note) {
                    noteHTML = `<div style="font-size: 13px; color: var(--text-main); background: var(--danger-light); padding: 10px; border-radius: 8px; margin-top: 12px; border-left: 3px solid var(--warning);"><b>Note:</b> ${a.note}</div>`;
                }

                let actionsHTML = "";
                
                if (showWa) {
                    actionsHTML += `<a href="https://wa.me/39${numClean}" target="_blank" class="action-icon wa-icon" title="Contatta su WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>`;
                }
                
                if (isMe) {
                    let shareText = "";
                    if (a.tipo_annuncio === 'turno') {
                        shareText = `Cedo per il giorno ${dateFormatted} il turno ${a.codice_turno || ''}`;
                        if (a.ora_inizio && a.luogo_inizio && a.ora_fine && a.luogo_fine) {
                            shareText += ` che monta alle ore ${a.ora_inizio} presso ${a.luogo_inizio} e termina alle ore ${a.ora_fine} presso ${a.luogo_fine}.`;
                        } else {
                            shareText += `.`;
                        }
                        shareText += ` Cerco ${a.cerco}.`;
                        if (a.note) shareText += ` Note: ${a.note}.`;
                        shareText += ` condiviso da Utility https://hazev98.github.io/Utility/bacheca_turni.html`;
                    } else {
                        shareText = `Cerco riposo per il giorno ${dateFormatted}`;
                        if (a.note) shareText += ` Note: ${a.note}.`;
                        shareText += ` condiviso da Utility https://hazev98.github.io/Utility/bacheca_turni.html`;
                    }
                    const encodedShare = encodeURIComponent(shareText);
                    
                    actionsHTML += `<a href="https://wa.me/?text=${encodedShare}" target="_blank" class="action-icon share-icon" title="Condividi su WhatsApp"><i class="fa-solid fa-share-nodes"></i></a>`;
                }
                
                if (canDelete) {
                    actionsHTML += `<button onclick="window.cancellaAnnuncioBT('${a.id}')" class="action-icon delete-icon"><i class="fa-solid fa-trash-can"></i></button>`;
                }

                const html = `
                    <div class="${itemClass}">
                        <div style="display:flex; justify-content: space-between;">
                            <div style="flex: 1;">
                                <div style="font-weight:700; font-size:15px; color:var(--text-main); margin-bottom: 4px;">${a.cognome} ${a.nome}${progLabel}</div>
                                <div style="font-size:12px; color:var(--text-muted); margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">${a.mansione} | Mat: ${a.matricola} | Tel: ${a.telefono}</div>
                                ${corpoHTML}
                                ${noteHTML}
                            </div>
                            <div class="contact-actions" style="flex-direction:column; justify-content:center; padding-left: 12px; border-left: 1px dashed var(--border-color); margin-left: 12px;">
                                ${actionsHTML}
                            </div>
                        </div>
                    </div>
                `;
                
                if (isSuggested && containerSug) containerSug.innerHTML += html;
                else if(containerRes) containerRes.innerHTML += html;
            });

            if(divSugContainer) divSugContainer.style.display = suggeriti > 0 ? 'block' : 'none';
            if (annunci.length === 0 && containerRes) containerRes.innerHTML = "<div style='color:var(--text-muted); text-align:center; padding: 20px;'><i class='fa-regular fa-face-frown-open'></i> Nessun annuncio in bacheca.</div>";

        } catch(e) { if(containerRes) containerRes.innerHTML = "<p>Errore caricamento bacheca: " + e.message + "</p>"; }
    };

    window.cancellaAnnuncioBT = async function(id) {
        if(!confirm("Vuoi cancellare questo annuncio?")) return;
        try {
            await deleteDoc(doc(db, "bacheca_turni", id));
            checkStato();
        } catch(e) { console.error("Errore cancellazione:", e); }
    };

    // --- Avvio Iniziale ---
    await precaricaTuttiDB();
    checkStato();
          } 
