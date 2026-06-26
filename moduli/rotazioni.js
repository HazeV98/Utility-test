import { doc, getDoc, collection, getDocs, updateDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function avviaMotoreRotazioni(db, auth) {
    const ADMIN_UID = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2";
    const CARTELLA_BASE = "rotazioni";
    
    const ROTAZIONI_MAP = {
        "disp_5_1": "Disponibile 5-1",
        "disp_6_2_6_1": "Disponibile 6-2-6-1",
        "rot_fnove": "Rotazione F.Nove", "spez_fnove": "Spezzati F.Nove", "tc_spez_fnove": "T.C. Spezzati F.Nove",
        "rot_proma": "Rotazione P.Roma", "spez_proma": "Spezzati P.Roma", "ris_proma": "Riserva P.Roma",
        "rot_szaccaria": "Rotazione S.Zaccaria", "spez_szaccaria": "Spezzati S.Zaccaria", "tc_spez_szaccaria": "T.C. Spezzati S.Zaccaria",
        "rot_lido": "Rotazione Lido", "spez_lido": "Spezzati Lido", "tc_spez_lido": "T.C. Spezzati Lido",
        "rot_linea12": "Rotazione Linea 12", "rot_linea13": "Rotazione Linea 13", "rot_linea14": "Rotazione Linea 14 M/N",
        "rot_linea14_mb": "Rotazione Linea 14 M/B", "rot_17sn": "Rotazione Linea 17 S. Nicolò", "tc_rot_17sn": "T.C. Rotazione 17 S. Nicolò",
        "rot_17tr": "Rotazione Linea 17 Tron.", "tc_rot_17tr": "T.C. Rotazione Linea 17 Tronc."
    };

    const paroleDaSaltare = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE", "MESE", "AGENTI"];

    // Globals per UI
    window.globalNomiRotazioni = [];
    window.utentiMap = {}; 
    window.currentUtentePdf = null; 

    // Stato Interno
    let databaseTurni = []; 
    let activePredictors = []; 
    let globalShiftData = {};
    let globalImgDir = "";
    let pzInstance = null;
    let currentImagePath = "";

    let currentUserDoc = null; 
    let isCollab = false; 
    let isAdmin = false; 
    let currentUserId = null;

    // Popola le select rotazioni (Request e Edit)
    const selRot = document.getElementById('rot-req-rotazione');
    const selRotEdit = document.getElementById('rot-edit-rotazione');
    if (selRot && selRot.options.length <= 1) {
        for(let key in ROTAZIONI_MAP) {
            let opt = document.createElement('option'); opt.value = key; opt.innerText = ROTAZIONI_MAP[key]; selRot.appendChild(opt);
            if(selRotEdit) {
                let opt2 = document.createElement('option'); opt2.value = key; opt2.innerText = ROTAZIONI_MAP[key]; selRotEdit.appendChild(opt2);
            }
        }
    }

    // ==========================================
    // FUNZIONI DI GESTIONE MODALI SPECIFICHE
    // ==========================================
    window.chiudiModalRotazioni = (modalId) => {
        document.getElementById(modalId).style.display = 'none';
        if(modalId === 'rot-search-modal') {
            document.getElementById('rot-risultato-turno').innerHTML = '';
            document.getElementById('rot-risultato-turno').style.display = 'none';
            document.getElementById('rot-risultato-cambi').innerHTML = '';
            document.getElementById('rot-risultato-cambi').style.display = 'none';
            document.getElementById('rot-input-codice-turno').value = '';
            document.getElementById('rot-input-giorno-turno').value = '';
            document.getElementById('rot-input-giorno-cambio').value = '';
        } else if (modalId === 'rot-future-search-modal') {
            document.getElementById('rot-risultato-futuro').innerHTML = '';
            document.getElementById('rot-risultato-futuro').style.display = 'none';
            document.getElementById('rot-input-date-futura').value = '';
        }
    };
    
    window.chiudiSeSfondoRotazioni = (event, modalId) => {
        if (event.target.id === modalId) window.chiudiModalRotazioni(modalId);
    };

    window.chiudiSeSfondoModalImgRot = (event) => {
        if (event.target.id === 'rot-imageModal' || event.target.id === 'rot-imageFlexContainer') window.chiudiImageModalRot();
    };

    // ==========================================
    // INIT STATO E ROTAZIONI (SPA UPGRADE)
    // ==========================================
    window.initRotazioniState = async () => {
        const user = auth.currentUser;
        const authSect = document.getElementById('rot-auth-section'); 
        const warnLog = document.getElementById('rot-login-warning');
        const reqSect = document.getElementById('rot-request-section'); 
        const pendSect = document.getElementById('rot-pending-section');
        const contSect = document.getElementById('rot-content-section');
        
        // Pulizia iniziale: nascondiamo i sottomenù
        if(warnLog) warnLog.style.display = 'none';
        if(reqSect) reqSect.style.display = 'none';
        if(pendSect) pendSect.style.display = 'none';
        if(contSect) contSect.style.display = 'none';

        if (user) {
            currentUserId = user.uid; 
            isAdmin = (user.uid === ADMIN_UID);
            
            // Lettura parallela da utenti e permessi_rotazioni
            const docRef = doc(db, "utenti", user.uid); 
            const permRef = doc(db, "permessi_rotazioni", user.uid);
            
            const [docSnap, permSnap] = await Promise.all([getDoc(docRef), getDoc(permRef)]);
            
            const uData = docSnap.exists() ? docSnap.data() : {};
            const pData = permSnap.exists() ? permSnap.data() : {};
            
            // Merge in memoria per compatibilità con il resto dell'interfaccia
            currentUserDoc = { ...uData, ...pData }; 
            isCollab = (uData.ruolo === 'collaborator');
            
            // BYPASS ADMIN O UTENTE APPROVATO
            if (isAdmin || pData.abilitato_rotazioni === true || pData.stato_richiesta === 'approved') {
                if (isAdmin) currentUserDoc.abilitato_rotazioni = true; 
                
                // Se ha accesso, nascondiamo tutto il blocco auth e mostriamo i contenuti
                if(authSect) authSect.style.display = 'none'; 
                if(contSect) contSect.style.display = 'flex';
                
                let btnMieiDati = document.getElementById('rot-btn-miei-dati');
                if (btnMieiDati) btnMieiDati.style.display = 'flex';
                
                let btnGestAccessi = document.getElementById('rot-btn-gestione-accessi');
                if (isAdmin || isCollab) {
                    if (btnGestAccessi) btnGestAccessi.style.display = 'flex';
                    window.aggiornaBadgeRichiesteRotazioni();
                }
                
                window.initPanzoomRotazioni(); 
                window.caricaDatiTurniSilenziosoRot(); 
                window.caricaRotazioniMain();
                
            } else if (pData.stato_richiesta === 'pending') {
                // In attesa di approvazione: mostra contenitore auth e messaggio
                if(authSect) authSect.style.display = 'block';
                if(pendSect) pendSect.style.display = 'block';
            } else {
                // Nessun accesso: mostra contenitore auth e modulo di richiesta
                if(authSect) authSect.style.display = 'block';
                if(reqSect) reqSect.style.display = 'block';
                
                if(document.getElementById('rot-req-nome')) document.getElementById('rot-req-nome').value = uData.nome || '';
                if(document.getElementById('rot-req-cognome')) document.getElementById('rot-req-cognome').value = uData.cognome || '';
                if(document.getElementById('rot-req-matricola')) document.getElementById('rot-req-matricola').value = uData.matricola || '';
                if(document.getElementById('rot-req-omonimia')) document.getElementById('rot-req-omonimia').value = uData.progressivo || '';
            }
        } else { 
            // Non loggato: mostra avviso
            if(authSect) authSect.style.display = 'block';
            if(warnLog) warnLog.style.display = 'block'; 
        }
    };

    window.mostraFormRichiestaRot = () => {
        document.getElementById('rot-intro-request').style.display = 'none';
        document.getElementById('rot-form-request').style.display = 'block';
    };

    // Event listeners per le select rotazioni
    document.getElementById('rot-req-rotazione').addEventListener('change', function() {
        let isDisp = this.value.startsWith('disp_');
        document.getElementById('rot-div-data-riposo-req').style.display = isDisp ? 'block' : 'none';
        document.getElementById('rot-div-mansione-req').style.display = isDisp ? 'block' : 'none';
    });
    document.getElementById('rot-edit-rotazione').addEventListener('change', function() {
        let isDisp = this.value.startsWith('disp_');
        document.getElementById('rot-div-data-riposo-edit').style.display = isDisp ? 'block' : 'none';
        document.getElementById('rot-div-mansione-edit').style.display = isDisp ? 'block' : 'none';
    });

    // ==========================================
    // LOGICA DI CARICAMENTO DATI
    // ==========================================
    
    window.caricaDatiTurniSilenziosoRot = async () => {
        try {
            const resMappa = await fetch('mappa_file.json?t=' + new Date().getTime());
            if (!resMappa.ok) return;
            
            const mappa = await resMappa.json();
            const rootFiles = mappa.albero || mappa.root || [];
            
            let imgDirs = rootFiles.filter(f => f.match(/^turni_\d{4}-\d{2}-\d{2}\/?$/));
            if (imgDirs.length > 0) {
                imgDirs.sort((a, b) => b.localeCompare(a));
                globalImgDir = imgDirs[0].replace("/", "");
            }
            
            let jsonFiles = rootFiles.filter(f => f.match(/^info_turni_\d{4}-\d{2}-\d{2}\.json$/));
            for (let jf of jsonFiles) {
                fetch(jf + `?t=${new Date().getTime()}`)
                    .then(r => r.json())
                    .then(jData => { globalShiftData = { ...globalShiftData, ...jData }; })
                    .catch(e => console.error("Errore info turni"));
            }
        } catch (e) { console.error("Errore mappa"); }
    };

    function stringToNum(s) { 
        if(!s) return 0; 
        let p = s.split('-'); 
        return Math.floor(new Date(p[0], p[1]-1, p[2], 12, 0, 0).getTime() / 86400000); 
    }

    function pulisciNomeRotazione(nome) {
        let pulito = nome.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        return pulito.charAt(0).toUpperCase() + pulito.slice(1);
    }

    // Aggiornata per leggere da permessi_rotazioni e unire i dati utente
    window.getUtentiAbilitatiFirebaseRot = async () => {
        const q = query(collection(db, "permessi_rotazioni"), where("abilitato_rotazioni", "==", true));
        const permSnap = await getDocs(q);
        
        const utentiSnap = await getDocs(collection(db, "utenti"));
        let utentiBase = {};
        utentiSnap.forEach(d => utentiBase[d.id] = d.data());

        let arr = [];
        permSnap.forEach(d => {
            let pData = d.data();
            let uData = utentiBase[d.id] || {};
            arr.push({ ...uData, ...pData });
        });
        return arr;
    };

    window.caricaRotazioniMain = async () => {
        const area = document.getElementById('rot-rotazioni-list');
        area.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 32px; color: var(--primary);"></i><br><br>Scansione documenti in corso...</div>`;

        try {
            const timestamp = new Date().getTime();
            const resMappa = await fetch('mappa_file.json?t=' + timestamp);
            if (!resMappa.ok) throw new Error("Mappa non trovata");
            
            const datiMappa = await resMappa.json();
            const files = datiMappa.rotazioni || []; 
            let groups = {};

            files.forEach(nomeFile => {
                let ext = nomeFile.substring(nomeFile.lastIndexOf('.')).toLowerCase();
                let baseName = nomeFile.substring(0, nomeFile.lastIndexOf('.'));
                
                if(['.pdf', '.xlsx', '.xls', '.json'].includes(ext)) {
                    if(!groups[baseName]) groups[baseName] = { pdf: null, excel: null, json: null, base: baseName };
                    if(ext === '.pdf') groups[baseName].pdf = nomeFile;
                    if(ext === '.xlsx' || ext === '.xls') groups[baseName].excel = nomeFile;
                    if(ext === '.json') groups[baseName].json = nomeFile;
                }
            });

            area.innerHTML = "";

            if (Object.keys(groups).length === 0) {
                area.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-regular fa-folder-open" style="font-size:32px;"></i><br><br>Nessun documento trovato.</div>`;
                return;
            }

            let indexRot = 0;
            for (let base in groups) {
                let g = groups[base];
                let monthCard = document.createElement('div');
                monthCard.className = "rot-month-card";
                monthCard.style.animationDelay = `${indexRot * 0.1}s`;
                monthCard.innerHTML = `<h3><i class="fa-regular fa-calendar" style="color: var(--text-muted); font-size: 16px;"></i> ${pulisciNomeRotazione(g.base)}</h3>`;

                let btnGrid = document.createElement('div');
                btnGrid.className = "rot-btn-grid";

                if (g.json) {
                    try {
                        let dataRes = await fetch(`${CARTELLA_BASE}/${g.json}?t=${timestamp}`);
                        let jsonData = await dataRes.json();

                        let allU = await window.getUtentiAbilitatiFirebaseRot();
                        let dispGroups = { "disp_5_1": {}, "disp_6_2_6_1": {} };
                        let parts = g.base.split('_');
                        
                        if (parts.length >= 3) {
                            const mesiMap = { "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12 };
                            let m = mesiMap[parts[1].toLowerCase()];
                            let y = parseInt(parts[2]);

                            if (m && y) {
                                let cNum_1st = stringToNum(`${y}-${m}-1`);

                                allU.forEach(u => {
                                    if (u.data_riposo_singolo && (u.rotazione_richiesta === "disp_5_1" || u.rotazione_richiesta === "disp_6_2_6_1")) {
                                        let nomeCompl = (u.cognome + " " + u.nome + " " + (u.progressivo || "")).trim().toUpperCase();
                                        let turni = {};
                                        let dRiposoNum = stringToNum(u.data_riposo_singolo);
                                        let manKey = u.mansione || "Mansione non specificata"; 
                                        
                                        for(let i=1; i<=31; i++) {
                                            let dCheck = new Date(y, m-1, i);
                                            if (dCheck.getMonth() !== m-1) break; 
                                            let cNum = stringToNum(`${y}-${m}-${i}`);
                                            
                                            if (u.rotazione_richiesta === "disp_5_1") {
                                                let diff = (cNum - dRiposoNum) % 6;
                                                if (diff < 0) diff += 6;
                                                turni[i.toString()] = (diff === 0) ? "RI" : "DISP";
                                            } else if (u.rotazione_richiesta === "disp_6_2_6_1") {
                                                let diff = (cNum - dRiposoNum) % 15;
                                                if (diff < 0) diff += 15;
                                                if (diff === 0 || diff === 7 || diff === 8) { turni[i.toString()] = "RI"; } 
                                                else { turni[i.toString()] = "DISP"; }
                                            }
                                        }

                                        let rotKey = u.rotazione_richiesta;
                                        let sortKey = 0;

                                        if (rotKey === "disp_5_1") {
                                            let offset = (cNum_1st - dRiposoNum) % 6;
                                            if (offset < 0) offset += 6;
                                            sortKey = (6 - offset) % 6; 
                                        } else if (rotKey === "disp_6_2_6_1") {
                                            let offset = (cNum_1st - dRiposoNum) % 15;
                                            if (offset < 0) offset += 15;
                                            sortKey = (15 + 7 - offset) % 15; 
                                        }

                                        if (!dispGroups[rotKey][manKey]) dispGroups[rotKey][manKey] = [];
                                        dispGroups[rotKey][manKey].push({ nome: nomeCompl, turni: turni, sortKey: sortKey });
                                    }
                                });

                                const mapNomiRotDisp = { "disp_5_1": "Disponibili 5-1", "disp_6_2_6_1": "Disponibili 6-2-6-1" };
                                for (let rotKey in dispGroups) {
                                    for (let manKey in dispGroups[rotKey]) {
                                        dispGroups[rotKey][manKey].sort((a, b) => a.sortKey - b.sortKey);
                                        let finalObj = {};
                                        dispGroups[rotKey][manKey].forEach(x => finalObj[x.nome] = x.turni);
                                        let tabName = `${mapNomiRotDisp[rotKey]} - ${manKey}`;
                                        jsonData[tabName] = finalObj;
                                    }
                                }
                            }
                        }

                        Object.values(jsonData).forEach(rot => {
                            Object.keys(rot).forEach(nome => {
                                if (!window.globalNomiRotazioni.includes(nome.toUpperCase())) {
                                    window.globalNomiRotazioni.push(nome.toUpperCase());
                                }
                            });
                        });

                        Object.keys(jsonData).forEach(rotName => {
                            let rotContainer = document.createElement('div');
                            rotContainer.className = "rot-container-box";

                            let rotTitle = document.createElement('h4');
                            rotTitle.className = "rot-title-box";
                            rotTitle.innerHTML = `<i class="fa-solid fa-folder-tree" style="color: var(--text-muted); font-size: 14px;"></i> ${rotName}`;
                            rotContainer.appendChild(rotTitle);

                            let btnTab = document.createElement('button');
                            btnTab.className = "rot-file-btn rot-btn-table";
                            btnTab.innerHTML = `<i class="fa-solid fa-table"></i> Visualizza Tabella`;
                            btnTab.onclick = () => window.apriTabellaRot(rotName, jsonData);
                            rotContainer.appendChild(btnTab);

                            let btnSearch = document.createElement('button');
                            btnSearch.className = "rot-file-btn rot-btn-search";
                            btnSearch.style.marginTop = "10px";
                            btnSearch.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Cerca Colleghi e Cambi`;
                            btnSearch.onclick = () => window.apriRicercaJsonRot(rotName, jsonData);
                            rotContainer.appendChild(btnSearch);

                            let btnFuturo = document.createElement('button');
                            btnFuturo.className = "rot-file-btn rot-btn-search";
                            btnFuturo.style.marginTop = "10px";
                            btnFuturo.style.backgroundColor = "var(--warning)";
                            btnFuturo.style.color = "#fff";
                            btnFuturo.innerHTML = `<i class="fa-solid fa-crystal-ball"></i> Ricerca mesi successivi`;
                            btnFuturo.onclick = () => window.apriRicercaFuturaRot(g.base, rotName, jsonData);
                            rotContainer.appendChild(btnFuturo);

                            btnGrid.appendChild(rotContainer);
                        });
                    } catch(e) { console.error("Errore lettura JSON", e); }
                } else if (g.excel) {
                    let btnSearch = document.createElement('button');
                    btnSearch.className = "rot-file-btn rot-btn-search";
                    btnSearch.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Cerca (Modalità Lenta)`;
                    btnSearch.onclick = () => window.apriFinestraRicercaExcelRot(g.pdf ? g.pdf : g.excel, files);
                    btnGrid.appendChild(btnSearch);
                }

                if (g.pdf) {
                    let btnPdf = document.createElement('a');
                    btnPdf.className = "rot-file-btn rot-btn-pdf";
                    btnPdf.innerHTML = `<i class="fa-regular fa-file-pdf"></i> Apri PDF Originale`;
                    btnPdf.href = `${CARTELLA_BASE}/${g.pdf}?t=${timestamp}`; 
                    btnPdf.target = "_blank";
                    btnGrid.appendChild(btnPdf);
                }

                monthCard.appendChild(btnGrid);
                area.appendChild(monthCard);
                indexRot++;
            }

        } catch (e) { 
            area.innerHTML = `<div style="color:var(--danger); text-align:center; padding:20px; background:var(--danger-light); border-radius:12px;"><i class="fa-solid fa-triangle-exclamation" style="font-size:28px;"></i><br>Errore di connessione.</div>`; 
        }
    };

    function getClassForTurno(turno) {
        let t = turno.toUpperCase().replace(/\s+/g, '');
        if (t === 'AL') return 'cell-al';
        if (t === 'RI') return 'cell-ri';
        if (t === 'DISP' || t === 'DI') return 'cell-disp';
        if (t === 'ESPE') return 'cell-espe';
        if (t === 'FER' || t === 'FEP' || t === 'FES') return 'cell-fer';
        return '';
    }

    window.apriTabellaRot = (rotName, data) => {
        const modal = document.getElementById('rot-table-modal');
        const title = document.getElementById('rot-table-modal-title');
        const container = document.getElementById('rot-table-container');

        title.innerHTML = `<i class="fa-solid fa-table" style="color:var(--text-muted); font-size:18px;"></i> ${rotName}`;
        
        let html = `<div class="rot-table-responsive"><table class="rot-rotazioni-table">`;
        html += `<thead><tr><th>Colleghi</th>`;
        for(let i=1; i<=31; i++) html += `<th>${i}</th>`;
        html += `</tr></thead><tbody>`;

        const dipendenti = data[rotName];
        for (let nome in dipendenti) {
            let nomeUpper = nome.toUpperCase();
            if (paroleDaSaltare.some(parola => nomeUpper.includes(parola)) || nome.trim() === "") continue;

            let nomeFormattato = nome.split(" - ").join("<br>");
            html += `<tr><td>${nomeFormattato}</td>`;
            
            for(let i=1; i<=31; i++) {
                let turno = dipendenti[nome][i.toString()] || "";
                let classCss = getClassForTurno(turno);
                html += `<td class="${classCss}">${turno}</td>`;
            }
            html += `</tr>`;
        }
        html += `</tbody></table></div>`;
        
        container.innerHTML = html;
        modal.style.display = 'flex';
    };

    window.apriRicercaJsonRot = (rotName, jsonData) => {
        databaseTurni = []; 
        let dipendenti = jsonData[rotName];
        for (let nome in dipendenti) {
            let nomeUpper = nome.toUpperCase();
            if (paroleDaSaltare.some(parola => nomeUpper.includes(parola)) || nome.trim() === "") continue;

            let turniArr = [];
            for (let i = 1; i <= 31; i++) {
                let val = dipendenti[nome][i.toString()] || "";
                if (val.toUpperCase().replace(/\s+/g, '') === "DI") val = "DISP";
                turniArr.push(val.toUpperCase().replace(/\s+/g, ''));
            }
            databaseTurni.push({
                nome: nome.split(" - ").join(" e "), 
                turni: turniArr,
                rotazione: rotName 
            });
        }

        document.getElementById('rot-modal-title').innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> ${rotName}`;
        document.getElementById('rot-search-modal').style.display = 'flex';
        document.getElementById('rot-modal-status').style.display = 'none';
        document.getElementById('rot-modal-search-sections').style.display = 'block';
        document.getElementById('rot-risultato-turno').innerHTML = "";
        document.getElementById('rot-risultato-turno').style.display = 'none';
        document.getElementById('rot-risultato-cambi').innerHTML = "";
        document.getElementById('rot-risultato-cambi').style.display = 'none';
    };

    window.cercaTurnoRot = () => {
        const giorno = parseInt(document.getElementById('rot-input-giorno-turno').value);
        const codice = document.getElementById('rot-input-codice-turno').value.trim().toUpperCase();
        const boxRisultato = document.getElementById('rot-risultato-turno');

        boxRisultato.style.display = 'block';

        if (!giorno || !codice) {
            boxRisultato.innerHTML = "<i class='fa-solid fa-triangle-exclamation' style='color:var(--warning);'></i> Compila sia il Giorno che il Turno.";
            return;
        }

        const indiceGiorno = giorno - 1;
        let trovati = [];

        databaseTurni.forEach(dipendente => {
            if (dipendente.turni[indiceGiorno] === codice) trovati.push(dipendente.nome);
        });

        if (trovati.length > 0) {
            let detailsHtml = "";
            if (globalShiftData && globalShiftData[codice]) {
                let info = globalShiftData[codice];
                detailsHtml = `
                    <div class="rot-turn-details-box">
                        <div style="margin-bottom:6px;"><i class="fa-solid fa-play" style="color:var(--success); font-size:10px;"></i> Inizio: <strong style="color:var(--text-main);">${info.luogoInizio} (${info.inizio})</strong></div>
                        <div><i class="fa-solid fa-stop" style="color:var(--danger); font-size:10px;"></i> Fine: <strong style="color:var(--text-main);">${info.luogoFine} (${info.fine})</strong></div>
                        <button class="rot-file-btn" style="padding: 10px; margin-top: 12px; font-size: 13px; width: 100%; box-sizing:border-box; background-color: var(--info);" onclick="window.apriImmagineDaRotazioniRot('${codice}')"><i class="fa-regular fa-image"></i> Mostra Immagine Turno</button>
                    </div>
                `;
            } else {
                detailsHtml = `
                    <div style="margin-top: 12px;">
                        <button class="rot-file-btn" style="padding: 10px; font-size: 13px; width: 100%; box-sizing:border-box; background-color: var(--info);" onclick="window.apriImmagineDaRotazioniRot('${codice}')"><i class="fa-regular fa-image"></i> Mostra Immagine Turno</button>
                    </div>
                `;
            }
            boxRisultato.innerHTML = `<div style="font-weight:700; color:var(--primary); margin-bottom:12px;">Trovati il giorno ${giorno} a fare ${codice}:</div><ul style="margin-bottom:15px;"><li>` + trovati.join("</li><li>") + "</li></ul>" + detailsHtml;
        } else {
            boxRisultato.innerHTML = "<i class='fa-solid fa-user-slash' style='color:var(--text-muted);'></i> Nessuno fa questo turno nel giorno indicato.";
        }
    };

    function analizzaCicloLavorativo(turniMese, indiceGiorno, rotazione) {
        const turnoAttuale = turniMese[indiceGiorno];
        
        if (turnoAttuale === "AL" || turnoAttuale === "RI" || turnoAttuale === "") {
            let tipoRiposo = "Vuoto";
            if (turnoAttuale === "AL") {
                let domani = (indiceGiorno + 1 < turniMese.length) ? turniMese[indiceGiorno + 1] : "";
                tipoRiposo = (domani === "RI" || domani === "AL") ? "Doppio (Oggi AL)" : "Singolo (AL)";
            } else if (turnoAttuale === "RI") {
                let ieri = (indiceGiorno - 1 >= 0) ? turniMese[indiceGiorno - 1] : "";
                let domani = (indiceGiorno + 1 < turniMese.length) ? turniMese[indiceGiorno + 1] : "";
                tipoRiposo = (ieri === "AL" || ieri === "RI" || domani === "AL" || domani === "RI") ? "Doppio (Oggi RI)" : "Singolo (RI)";
            }
            return { fase: "Riposo", giornoEsatto: 0, tipoRiposo: tipoRiposo };
        }

        let giorniLavorati = 1; 
        let trovatoRiposoPassato = false;
        for (let i = indiceGiorno - 1; i >= 0; i--) {
            if (turniMese[i] === "AL" || turniMese[i] === "RI" || turniMese[i] === "") {
                trovatoRiposoPassato = true; break;
            }
            giorniLavorati++;
        }

        if (trovatoRiposoPassato) return determinaFaseDaGiorno(giorniLavorati, rotazione);

        let giorniAlProssimoRiposo = 0;
        for (let i = indiceGiorno + 1; i < turniMese.length; i++) {
            if (turniMese[i] === "AL" || turniMese[i] === "RI" || turniMese[i] === "") break;
            giorniAlProssimoRiposo++;
        }

        let stima = 6 - giorniAlProssimoRiposo;
        if (rotazione && rotazione.includes("5-1")) {
            stima = 5 - giorniAlProssimoRiposo;
        }
        return determinaFaseDaGiorno(stima > 0 ? stima : giorniLavorati, rotazione);
    }

    function determinaFaseDaGiorno(n, rotazione) {
        if (rotazione && rotazione.includes("5-1")) {
            if (n === 1 || n === 2) return { fase: "Terzo", giornoEsatto: n };
            if (n === 3) return { fase: "Mezzo", giornoEsatto: n };
            if (n === 4 || n === 5) return { fase: "Primo", giornoEsatto: n };
            return { fase: "Oltre 5 giorni", giornoEsatto: n };
        }
        if (n === 1 || n === 2) return { fase: "Terzo", giornoEsatto: n };
        if (n === 3 || n === 4) return { fase: "Mezzo", giornoEsatto: n };
        if (n === 5 || n === 6) return { fase: "Primo", giornoEsatto: n };
        return { fase: "Oltre 6 giorni", giornoEsatto: n };
    }

    window.cercaCambiRot = () => {
        const giorno = parseInt(document.getElementById('rot-input-giorno-cambio').value);
        const faseDesiderata = document.getElementById('rot-select-fase-cambio').value;
        const boxRisultato = document.getElementById('rot-risultato-cambi');

        boxRisultato.style.display = 'block';

        if (!giorno) {
            boxRisultato.innerHTML = "<i class='fa-solid fa-triangle-exclamation' style='color:var(--warning);'></i> Inserisci il giorno del mese.";
            return;
        }

        const indiceGiorno = giorno - 1;
        let risultatiHtml = [];

        databaseTurni.forEach(dipendente => {
            const analisi = analizzaCicloLavorativo(dipendente.turni, indiceGiorno, dipendente.rotazione);
            if (analisi.fase === faseDesiderata) {
                if (faseDesiderata === "Riposo") {
                    if (analisi.tipoRiposo !== "Vuoto") {
                        risultatiHtml.push(`<strong>${dipendente.nome}</strong> <span style="float:right; color:var(--danger); font-size:12px; font-weight:700;">[Riposo ${analisi.tipoRiposo}]</span>`);
                    }
                } else {
                    let turnoCod = dipendente.turni[indiceGiorno];
                    let isRiposoOrDisp = ["AL", "RI", "DISP", "ESPE", "DI", ""].includes(turnoCod);
                    
                    if (!isRiposoOrDisp) {
                        let infoExtra = "";
                        if (globalShiftData && globalShiftData[turnoCod]) {
                            let info = globalShiftData[turnoCod];
                            infoExtra = `<div style="margin-top:6px; font-size:12px;"><i class="fa-solid fa-play" style="color:var(--success); font-size:10px;"></i> In: <strong style="color:var(--text-main);">${info.luogoInizio} (${info.inizio})</strong> <span style="margin:0 4px; color:var(--border-color);">|</span> <i class="fa-solid fa-stop" style="color:var(--danger); font-size:10px;"></i> Out: <strong style="color:var(--text-main);">${info.luogoFine} (${info.fine})</strong></div>`;
                        }
                        
                        let detailsHtml = `
                            <div class="rot-turn-details-box">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <strong style="color:var(--primary); font-size:14px;"><i class="fa-solid fa-clock"></i> Turno: ${turnoCod}</strong>
                                    <button class="rot-btn" style="padding: 6px 10px; margin: 0; font-size: 11px; width: auto; background-color: var(--info); box-shadow:none;" onclick="window.apriImmagineDaRotazioniRot('${turnoCod}')"><i class="fa-regular fa-image"></i> Img</button>
                                </div>
                                ${infoExtra}
                            </div>
                        `;
                        risultatiHtml.push(`<strong>${dipendente.nome}</strong> <span style="color:var(--text-muted); font-size:12px;">(Giorno lav. ${analisi.giornoEsatto})</span> ${detailsHtml}`);
                    } else {
                        risultatiHtml.push(`<strong>${dipendente.nome}</strong> <span style="color:var(--text-muted); font-size:12px;">(Giorno lav. ${analisi.giornoEsatto})</span> - <span style="color:var(--warning); font-weight:700;">[${turnoCod}]</span>`);
                    }
                }
            }
        });

        if (risultatiHtml.length > 0) {
            boxRisultato.innerHTML = `<div style="margin-bottom:12px; font-weight:700; color:var(--success);">Colleghi in fase "Di ${faseDesiderata}" il giorno ${giorno}:</div><ul style="padding-left:0; list-style:none; margin:0;"><li style='margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;'>` + risultatiHtml.join("</li><li style='margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;'>") + "</li></ul>";
        } else {
            boxRisultato.innerHTML = "<i class='fa-solid fa-user-slash' style='color:var(--text-muted);'></i> Nessun collega in questa fase.";
        }
    };

    function buildColleaguePredictor(nome, turniMese, m, y, rotazione) {
        let refNum = null;
        let is51 = rotazione && rotazione.includes("5-1");

        if (is51) {
            let riIndex = turniMese.findIndex(t => t === "RI" || t === "AL");
            if (riIndex !== -1) {
                let dNum = stringToNum(`${y}-${m}-${riIndex + 1}`);
                refNum = dNum - 5; 
            }
        } else {
            let alIndex = turniMese.findIndex(t => t === "AL");
            if (alIndex !== -1) {
                refNum = stringToNum(`${y}-${m}-${alIndex + 1}`) - 7;
            } else {
                for (let i = 0; i < turniMese.length; i++) {
                    if (turniMese[i] === "RI") {
                        let prevAL = (i - 1 >= 0 && turniMese[i-1] === "AL");
                        let prevRI = (i - 1 >= 0 && turniMese[i-1] === "RI");
                        let nextRI = (i + 1 < turniMese.length && turniMese[i+1] === "RI");
                        
                        let dNum = stringToNum(`${y}-${m}-${i + 1}`);
                        if (prevAL || prevRI) { refNum = dNum - 8; } 
                        else if (nextRI) { refNum = dNum - 7; } 
                        else { refNum = dNum; }
                        break;
                    }
                }
            }
        }
        if (refNum === null) return null; 
        return { nome, refNum, rotazione };
    }

    window.apriRicercaFuturaRot = (baseName, rotName, jsonData) => {
        document.getElementById('rot-future-modal-title').innerHTML = `<i class="fa-solid fa-crystal-ball"></i> ${rotName}`;
        
        let parts = baseName.split('_'); 
        let meseStr = parts[1];
        let annoStr = parts[2];
        const mesiMap = { "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12 };
        let m = mesiMap[meseStr.toLowerCase()];
        let y = parseInt(annoStr);

        activePredictors = [];
        
        let dipendenti = jsonData[rotName];
        for (let nome in dipendenti) {
            if (paroleDaSaltare.some(p => nome.toUpperCase().includes(p)) || nome.trim() === "") continue;

            let turniMese = [];
            for (let i = 1; i <= 31; i++) {
                let t = dipendenti[nome][i.toString()] || "";
                turniMese.push(t.toUpperCase().replace(/\s+/g, ''));
            }

            let p = buildColleaguePredictor(nome.split(" - ").join(" e "), turniMese, m, y, rotName);
            if (p) activePredictors.push(p);
        }

        document.getElementById('rot-future-search-modal').style.display = 'flex';
        document.getElementById('rot-risultato-futuro').innerHTML = "";
        document.getElementById('rot-risultato-futuro').style.display = 'none';
    };

    window.eseguiRicercaFuturaRot = () => {
        const dateStr = document.getElementById('rot-input-date-futura').value;
        const faseDesiderata = document.getElementById('rot-select-fase-futura').value;
        const boxRisultato = document.getElementById('rot-risultato-futuro');

        boxRisultato.style.display = 'block';

        if (!dateStr) {
            boxRisultato.innerHTML = "<i class='fa-solid fa-triangle-exclamation' style='color:var(--warning);'></i> Seleziona una data.";
            return;
        }

        let targetNum = stringToNum(dateStr);
        let trovati = [];

        activePredictors.forEach(p => {
            let faseCalcolata = "";
            let infoExtra = "";
            let giornoLav = 0;

            if (p.rotazione && p.rotazione.includes("5-1")) {
                let pos = ((targetNum - p.refNum) % 6 + 6) % 6;
                if (pos === 5) { 
                    faseCalcolata = "Riposo"; infoExtra = "Singolo (RI)"; 
                } else {
                    giornoLav = pos + 1;
                    if (giornoLav === 1 || giornoLav === 2) faseCalcolata = "Terzo";
                    else if (giornoLav === 3) faseCalcolata = "Mezzo";
                    else if (giornoLav === 4 || giornoLav === 5) faseCalcolata = "Primo";
                }
            } 
            else {
                let pos = ((targetNum - p.refNum + 6) % 15 + 15) % 15;
                if (pos === 6) { faseCalcolata = "Riposo"; infoExtra = "Singolo (RI)"; }
                else if (pos === 13) { faseCalcolata = "Riposo"; infoExtra = "Doppio (1° g. AL)"; }
                else if (pos === 14) { faseCalcolata = "Riposo"; infoExtra = "Doppio (2° g. RI)"; }
                else {
                    if (pos >= 0 && pos <= 5) giornoLav = pos + 1; 
                    else if (pos >= 7 && pos <= 12) giornoLav = pos - 6; 
                    
                    if (giornoLav === 1 || giornoLav === 2) faseCalcolata = "Terzo";
                    else if (giornoLav === 3 || giornoLav === 4) faseCalcolata = "Mezzo";
                    else if (giornoLav === 5 || giornoLav === 6) faseCalcolata = "Primo";
                }
            }

            if (faseCalcolata === faseDesiderata) {
                if (faseCalcolata === "Riposo") {
                    trovati.push(`<strong>${p.nome}</strong> <span style="float:right; color:var(--danger); font-size:12px; font-weight:700;">[Riposo ${infoExtra}]</span>`);
                } else {
                    trovati.push(`<strong>${p.nome}</strong> <span style="color:var(--text-muted); font-size:12px; margin-left:6px;">(Giorno lav. ${giornoLav})</span>`);
                }
            }
        });

        if (trovati.length > 0) {
            let p = dateStr.split('-');
            let f = `${p[2]}/${p[1]}/${p[0]}`;
            let msg = `Colleghi in fase di <strong style="color:var(--success); text-transform:uppercase;">${faseDesiderata}</strong> il ${f}:`;
            boxRisultato.innerHTML = `<div style="margin-bottom:12px;">${msg}</div><ul style="padding-left:0; list-style:none; margin:0;"><li style='margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:8px;'>` + trovati.join("</li><li style='margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:8px;'>") + "</li></ul>";
        } else {
            boxRisultato.innerHTML = "<i class='fa-solid fa-user-slash' style='color:var(--text-muted);'></i> Nessun collega in questa fase per la data indicata.";
        }
    };

    window.apriFinestraRicercaExcelRot = async (pdfName, tuttiIFileNomi) => {
        const modal = document.getElementById('rot-search-modal');
        const statusEl = document.getElementById('rot-modal-status');
        const sezioniRicerca = document.getElementById('rot-modal-search-sections');
        const title = document.getElementById('rot-modal-title');
        
        title.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Ricerca Globale`;
        modal.style.display = 'flex';
        sezioniRicerca.style.display = 'none';
        statusEl.style.display = 'flex';
        statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i><span>Apertura e scansione documento Excel... <br><span style="font-size:12px;">(L'operazione richiede qualche secondo)</span></span>`;
        
        document.getElementById('rot-risultato-turno').innerHTML = "";
        document.getElementById('rot-risultato-cambi').innerHTML = "";
        databaseTurni = [];

        if (typeof XLSX === 'undefined') {
            statusEl.innerHTML = "Errore: Libreria Excel non caricata."; return;
        }

        const timestamp = new Date().getTime();
        const baseName = pdfName.substring(0, pdfName.lastIndexOf('.'));
        
        let targetUrl = `${CARTELLA_BASE}/${encodeURIComponent(baseName)}.xlsx?t=${timestamp}`;
        let res;

        try {
            res = await fetch(targetUrl);
            
            if (!res.ok && tuttiIFileNomi) {
                const baseNameLower = baseName.toLowerCase().trim();
                const excelFileName = tuttiIFileNomi.find(nome => {
                    const itemNameLower = nome.toLowerCase();
                    return itemNameLower === baseNameLower + ".xlsx" || itemNameLower === baseNameLower + ".xls";
                });
                if (excelFileName) res = await fetch(`${CARTELLA_BASE}/${excelFileName}?t=${timestamp}`);
            }

            if (!res || !res.ok) throw new Error("File Excel non trovato.");

            const arrayBuffer = await res.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, {type: 'array'});
            
            let foundAnyTurns = false;

            for (let sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                let headerRowIndex = -1;
                let dayColIndices = new Array(31).fill(-1);

                for (let r = 0; r < rows.length; r++) {
                    let row = rows[r];
                    if (!row) continue;
                    for (let c = 0; c < row.length - 2; c++) {
                        let cell1 = String(row[c]).trim(); let cell2 = String(row[c+1]).trim(); let cell3 = String(row[c+2]).trim();
                        if (cell1 === "1" && cell2 === "2" && cell3 === "3") {
                            headerRowIndex = r;
                            for (let d = 1; d <= 31; d++) {
                                for (let look = c; look < row.length; look++) {
                                    if (String(row[look]).trim() === String(d)) { dayColIndices[d - 1] = look; break; }
                                }
                            }
                            break;
                        }
                    }
                    if (headerRowIndex !== -1) break;
                }

                if (headerRowIndex !== -1) {
                    let currentPos = 0;
                    for (let r = headerRowIndex + 1; r < rows.length; r++) {
                        let row = rows[r];
                        if (!row || row.length === 0) continue;

                        let bloccoGiorni = new Array(31).fill("");
                        let conteggioValidi = 0;

                        for (let d = 0; d < 31; d++) {
                            let colIdx = dayColIndices[d];
                            if (colIdx !== -1 && colIdx < row.length) {
                                let cella = row[colIdx];
                                if (cella) {
                                    let val = String(cella).replace(/[\s]+/g, '').toUpperCase();
                                    if (["AL", "RI", "DISP", "DI", "FER", "MAL", "PRT", "ESPE"].includes(val) || val.match(/^[0-9]+[A-Z]+[0-9]*$/) || val.match(/^[A-Z]+[0-9]+$/)) {
                                        if (val === "DI") val = "DISP";
                                        bloccoGiorni[d] = val;
                                        conteggioValidi++;
                                    }
                                }
                            }
                        }

                        if (conteggioValidi >= 15) {
                            currentPos++;
                            let firstDayCol = dayColIndices[0];
                            
                            let nameParts1 = [];
                            for (let c = 0; c < firstDayCol; c++) {
                                if (row[c]) {
                                    let txt = String(row[c]).replace(/[0-9]/g, '').trim();
                                    if (txt.length >= 2 && !paroleDaSaltare.includes(txt.toUpperCase())) nameParts1.push(txt);
                                }
                            }
                            let nome1 = nameParts1.join(" ");

                            let nomeFinale = nome1;
                            if (!nomeFinale) nomeFinale = `Collega (Posizione ${currentPos})`;

                            databaseTurni.push({ pos: currentPos, nome: nomeFinale, turni: bloccoGiorni });
                        }
                    }
                    if (databaseTurni.length > 0) { foundAnyTurns = true; break; }
                }
            }

            if (foundAnyTurns) {
                statusEl.style.display = 'none';
                sezioniRicerca.style.display = 'block';
            } else {
                statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Formato tabella non supportato.`;
            }

        } catch (error) {
            statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> ${error.message}`;
        }
    };

    // ==========================================
    // ZOOM IMMAGINI
    // ==========================================

    window.initPanzoomRotazioni = () => {
        const imgElem = document.getElementById('rot-turnoImage');
        if (typeof Panzoom !== 'undefined' && !pzInstance && imgElem) {
            pzInstance = Panzoom(imgElem, { maxScale: 5, minScale: 1 });
            document.getElementById('rot-imageFlexContainer').addEventListener('wheel', pzInstance.zoomWithWheel);
            
            function eseguiZoomToggle(e) {
                if (!pzInstance) return;
                let currentScale = pzInstance.getScale();
                if (currentScale < 1.1) pzInstance.zoom(1.75, { animate: true });
                else pzInstance.reset({ animate: true });
            }

            let lastTap = 0;
            let isPinching = false;
            imgElem.addEventListener('touchstart', function(e) { if (e.touches.length > 1) { isPinching = true; } });
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
    };

    window.apriImmagineDaRotazioniRot = (turnoPilota) => {
        if (!globalImgDir) {
            alert("Cartella immagini non trovata."); return;
        }

        let imgElement = document.getElementById('rot-turnoImage');
        currentImagePath = `${globalImgDir}/${turnoPilota}.jpg`;
        
        imgElement.onload = function() {
            if (pzInstance) { pzInstance.reset(); }
            document.getElementById('rot-imageModal').style.display = 'block';
            imgElement.onload = null; imgElement.onerror = null;
        };

        imgElement.onerror = function() {
            currentImagePath = `${globalImgDir}/${turnoPilota}.png`;
            imgElement.onload = function() {
                if (pzInstance) { pzInstance.reset(); }
                document.getElementById('rot-imageModal').style.display = 'block';
                imgElement.onload = null; imgElement.onerror = null;
            };
            imgElement.onerror = function() {
                alert("L'immagine per il turno " + turnoPilota + " non è presente.");
                window.chiudiImageModalRot();
            };
            imgElement.src = currentImagePath;
        };

        imgElement.src = currentImagePath;
    };

    window.chiudiImageModalRot = () => {
        document.getElementById('rot-imageModal').style.display = 'none';
        document.getElementById('rot-turnoImage').removeAttribute('src');
        if (pzInstance) { pzInstance.reset(); }
    };

    window.scaricaImmagineTurnoRot = () => {
        if (!currentImagePath) return;
        const a = document.createElement('a');
        a.href = currentImagePath;
        a.download = currentImagePath.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };


    // ==========================================
    // LOGICA DI GESTIONE ACCESSI E COLLABORATORI
    // ==========================================

    window.inviaRichiestaAccessoRot = async () => {
        const rot = document.getElementById('rot-req-rotazione').value;
        const n = document.getElementById('rot-req-nome').value.trim();
        const c = document.getElementById('rot-req-cognome').value.trim();
        const m = document.getElementById('rot-req-matricola').value.trim();
        const omo = document.getElementById('rot-req-omonimia').value.trim();
        const cons = document.getElementById('rot-req-consenso').checked;
        const dRip = document.getElementById('rot-req-data-riposo').value;
        const man = document.getElementById('rot-req-mansione').value;
        const err = document.getElementById('rot-req-error-msg');
        const btn = document.getElementById('rot-btn-invia-req');
        
        if (!n || !c || !m) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Nome, Cognome e Matricola sono obbligatori."; return; }
        if (!rot) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona la tua rotazione di appartenenza."; return; }
        if (rot.startsWith('disp_')) {
            if (!dRip) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Inserisci la data di un tuo riposo singolo."; return; }
            if (!man) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona la tua mansione."; return; }
        }
        if (!cons) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Devi accettare di condividere i dati per continuare."; return; }
        if (!currentUserId) return;
        
        err.innerHTML = ""; 
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Invio in corso..."; 
        btn.disabled = true;
        
        try {
            // Profilo in UTENTI (manteniamo updateDoc come richiesto, l'utente esiste già per l'app base)
            let pUtenti = { nome: n, cognome: c, matricola: m, progressivo: omo };
            await updateDoc(doc(db, "utenti", currentUserId), pUtenti);
            
            // Permessi in PERMESSI_ROTAZIONI
            let pRotazioni = {
                stato_richiesta: 'pending', rotazione_richiesta: rot, 
                data_riposo_singolo: dRip || null, mansione: rot.startsWith('disp_') ? man : null
            };
            await setDoc(doc(db, "permessi_rotazioni", currentUserId), pRotazioni, { merge: true });
            
            window.initRotazioniState();
        } catch(e) { 
            err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore durante l'invio. Riprova."; 
            btn.innerHTML = "<i class='fa-solid fa-paper-plane'></i> Invia Richiesta";
            btn.disabled = false;
        }
    };

    window.apriMieiDatiModalRotazioni = () => {
        if (!currentUserDoc) return;
        document.getElementById('rot-edit-nome').value = currentUserDoc.nome || '';
        document.getElementById('rot-edit-cognome').value = currentUserDoc.cognome || '';
        document.getElementById('rot-edit-matricola').value = currentUserDoc.matricola || '';
        document.getElementById('rot-edit-omonimia').value = currentUserDoc.progressivo || '';
        
        let rReq = currentUserDoc.rotazione_richiesta;
        if (ROTAZIONI_MAP[rReq]) {
            document.getElementById('rot-edit-rotazione').value = rReq;
        } else {
            document.getElementById('rot-edit-rotazione').value = '';
        }
        
        let isDisp = rReq && rReq.startsWith('disp_');
        document.getElementById('rot-edit-data-riposo').value = currentUserDoc.data_riposo_singolo || '';
        document.getElementById('rot-edit-mansione').value = currentUserDoc.mansione || '';
        
        document.getElementById('rot-div-data-riposo-edit').style.display = isDisp ? 'block' : 'none';
        document.getElementById('rot-div-mansione-edit').style.display = isDisp ? 'block' : 'none';
        
        document.getElementById('rot-edit-error-msg').innerText = '';
        document.getElementById('rot-btn-salva-dati').innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Modifiche";
        document.getElementById('rot-btn-salva-dati').disabled = false;
        document.getElementById('rot-modal-miei-dati').style.display = 'flex';
    };

    window.salvaMieiDatiRot = async () => {
        const rot = document.getElementById('rot-edit-rotazione').value;
        const n = document.getElementById('rot-edit-nome').value.trim();
        const c = document.getElementById('rot-edit-cognome').value.trim();
        const m = document.getElementById('rot-edit-matricola').value.trim();
        const omo = document.getElementById('rot-edit-omonimia').value.trim();
        const dRip = document.getElementById('rot-edit-data-riposo').value;
        const man = document.getElementById('rot-edit-mansione').value;
        const err = document.getElementById('rot-edit-error-msg');
        const btn = document.getElementById('rot-btn-salva-dati');
        
        if (!n || !c || !m) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Nome, Cognome e Matricola sono obbligatori."; return; }
        if (!rot) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona rotazione."; return; }
        if (rot.startsWith('disp_')) {
            if (!dRip) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Inserisci riposo singolo."; return; }
            if (!man) { err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona mansione."; return; }
        }
        
        err.innerHTML = "";
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio..."; 
        btn.disabled = true;
        
        try {
            // Aggiorna profilo in utenti
            let pUtenti = { nome: n, cognome: c, matricola: m, progressivo: omo };
            await updateDoc(doc(db, "utenti", currentUserId), pUtenti);
            
            // Aggiorna permessi in permessi_rotazioni
            let pRotazioni = { 
                rotazione_richiesta: rot, data_riposo_singolo: dRip || null,
                mansione: rot.startsWith('disp_') ? man : null
            };
            await setDoc(doc(db, "permessi_rotazioni", currentUserId), pRotazioni, { merge: true });
            
            currentUserDoc.nome = n; currentUserDoc.cognome = c; currentUserDoc.matricola = m; 
            currentUserDoc.progressivo = omo; currentUserDoc.rotazione_richiesta = rot;
            currentUserDoc.data_riposo_singolo = pRotazioni.data_riposo_singolo;
            currentUserDoc.mansione = pRotazioni.mansione;
            
            alert("Dati aggiornati con successo!");
            window.chiudiModalRotazioni('rot-modal-miei-dati');
        } catch(e) { 
            err.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore durante il salvataggio."; 
            btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Modifiche";
            btn.disabled = false;
        }
    };

    window.apriDettaglioUtenteRot = (uid) => {
        const u = window.utentiMap[uid];
        if (!u) return;
        window.currentUtentePdf = u;
        const omo = u.progressivo ? ` ${u.progressivo}` : '';
        const htmlData = `
            <div style="margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;"><strong><i class="fa-solid fa-user"></i> Nome:</strong> ${u.nome || '-'}</div>
            <div style="margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;"><strong><i class="fa-regular fa-user"></i> Cognome:</strong> ${u.cognome || '-'}${omo}</div>
            <div style="margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;"><strong><i class="fa-regular fa-id-badge"></i> Matricola:</strong> <span style="font-family:monospace; font-size:15px; color:var(--primary); font-weight:700;">${u.matricola || '-'}</span></div>
            <div style="margin-bottom:4px;"><strong><i class="fa-solid fa-folder-tree"></i> Rotazione:</strong> <span style="color:var(--success); font-weight:700;">${ROTAZIONI_MAP[u.rotazione_richiesta] || u.rotazione_richiesta || '-'}</span></div>
        `;
        document.getElementById('rot-dettaglio-utente-body').innerHTML = htmlData;
        document.getElementById('rot-modal-dettaglio-utente').style.display = 'flex';
    };

    window.scaricaPDFConsensoRot = () => {
        const u = window.currentUtentePdf;
        if(!u) return;
        if (typeof window.jspdf === 'undefined') { alert("Libreria PDF non ancora caricata. Riprova."); return; }
        const { jsPDF } = window.jspdf;
        const docObj = new jsPDF();
        
        const omo = u.progressivo ? ` ${u.progressivo}` : '';
        const email = u.email || 'Email non registrata nel database';
        
        docObj.setFontSize(16);
        docObj.text("Modulo di Consenso Rotazioni", 10, 20);
        
        docObj.setFontSize(12);
        docObj.text(`Nome: ${u.nome || '-'}`, 10, 40);
        docObj.text(`Cognome: ${u.cognome || '-'}${omo}`, 10, 50);
        docObj.text(`Matricola: ${u.matricola || '-'}`, 10, 60);
        docObj.text(`Email: ${email}`, 10, 70);
        docObj.text(`Codice ID utility: ${u.uid}`, 10, 80);
        
        docObj.setFontSize(11);
        const text = "Richiedendo l'accesso alla pagina rotazioni do il mio consenso ad inserire i miei dati nei documenti di programmazione turni mensile \"rotazioni\".";
        const splitText = docObj.splitTextToSize(text, 180);
        docObj.text(splitText, 10, 100);
        
        const safeNome = (u.nome || 'nome').replace(/[^a-zA-Z0-9]/g, '');
        const safeCognome = (u.cognome || 'cognome').replace(/[^a-zA-Z0-9]/g, '');
        docObj.save(`${safeCognome}_${safeNome}_consenso_rotazioni.pdf`);
    };

    window.aggiornaBadgeRichiesteRotazioni = async () => {
        if (!isAdmin && !isCollab) return;
        try {
            const q = query(collection(db, "permessi_rotazioni"), where("stato_richiesta", "==", "pending"));
            const snap = await getDocs(q);
            let count = 0;
            snap.forEach(d => {
                const u = d.data();
                if (isAdmin) { count++; }
                else if (isCollab && (currentUserDoc.permessi_gestione || []).includes(u.rotazione_richiesta)) { count++; }
            });
            
            const bHead = document.getElementById('rot-badge-header');
            const bMod = document.getElementById('rot-badge-modal');
            if (count > 0) {
                bHead.innerText = count; bHead.style.display = 'block';
                bMod.innerText = count; bMod.style.display = 'inline-block';
            } else {
                bHead.style.display = 'none';
                bMod.style.display = 'none';
            }
        } catch(e) { console.error("Errore conteggio richieste", e); }
    };

    window.apriGestioneAccessiModalRot = async () => {
        document.getElementById('rot-modal-gestione-accessi').style.display = 'flex';
        if (isAdmin) document.getElementById('rot-btn-collab-admin').style.display = 'flex';
        const cont = document.getElementById('rot-lista-utenti-abilitati');
        cont.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px;"></i> Caricamento...</div>`;
        
        // Fetch combinato (utenti + permessi_rotazioni)
        const permSnap = await getDocs(collection(db, "permessi_rotazioni")); 
        const utentiSnap = await getDocs(collection(db, "utenti")); 
        
        let utentiBase = {};
        utentiSnap.forEach(d => utentiBase[d.id] = d.data());

        window.utentiMap = {}; 
        let utentiArr = [];
        
        permSnap.forEach(d => {
            const pData = d.data();
            if (pData.abilitato_rotazioni === true) {
                const uData = utentiBase[d.id] || {};
                const u = { ...uData, ...pData, uid: d.id }; // Merge
                
                let isLegacy = (u.rotazione_richiesta === 'legacy_code' || (u.rotazione_richiesta && u.rotazione_richiesta.length > 50));
                if (isCollab && !isAdmin && !isLegacy && !(currentUserDoc.permessi_gestione || []).includes(u.rotazione_richiesta)) return;
                
                window.utentiMap[d.id] = u;
                utentiArr.push(u);
            }
        });

        utentiArr.sort((a, b) => {
            let cognomeA = (a.cognome || '').trim().toUpperCase();
            let cognomeB = (b.cognome || '').trim().toUpperCase();
            if (cognomeA < cognomeB) return -1;
            if (cognomeA > cognomeB) return 1;
            let nomeA = (a.nome || '').trim().toUpperCase();
            let nomeB = (b.nome || '').trim().toUpperCase();
            if (nomeA < nomeB) return -1;
            if (nomeA > nomeB) return 1;
            return 0;
        });

        let html = "";
        utentiArr.forEach(u => {
            let isLegacy = (u.rotazione_richiesta === 'legacy_code' || (u.rotazione_richiesta && u.rotazione_richiesta.length > 50));
            let rotNome = ROTAZIONI_MAP[u.rotazione_richiesta];
            if (!rotNome) { rotNome = isLegacy ? 'Accesso con Codice' : (u.rotazione_richiesta || 'Assegnazione Manuale'); }
            
            const checkC = (u.cognome || '').trim().toUpperCase();
            const checkN = (u.nome || '').trim().toUpperCase();
            const presente = checkC && checkN && (window.globalNomiRotazioni || []).some(n => n.includes(checkC) && n.includes(checkN));
            const pallino = presente ? '<i class="fa-solid fa-circle-check" style="color:var(--success); font-size:12px; margin-left:6px;" title="Presente nei tabulati"></i>' : '';

            let btnBloccaHTML = (u.uid === ADMIN_UID) ? 
                `<span style="font-size:12px; color:var(--info); font-weight:800; text-transform:uppercase; letter-spacing:0.5px; border:1px solid var(--info-border); background:var(--info-light); padding:4px 8px; border-radius:8px;">Admin</span>` : 
                `<button class="rot-btn" style="width:auto; padding:8px 12px; font-size:13px; background:var(--danger); margin:0;" onclick="window.revocaAccessoRot('${u.uid}')"><i class="fa-solid fa-ban"></i> Blocca</button>`;

            html += `<div class="rot-utente-row" data-search="${checkC} ${checkN} ${u.matricola||''}">
                <div>
                    <div style="font-weight:700; font-size:15px; cursor:pointer; color:var(--text-main); display:flex; align-items:center;" onclick="window.apriDettaglioUtenteRot('${u.uid}')">${u.cognome||''} ${u.nome||''} ${u.progressivo||''} ${pallino}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:4px; font-weight:500;"><i class="fa-solid fa-id-badge"></i> Matr: ${u.matricola||''} <span style="margin:0 4px;">|</span> <i class="fa-solid fa-folder-tree"></i> ${rotNome}</div>
                </div>
                ${btnBloccaHTML}
            </div>`;
        });
        cont.innerHTML = html || `<div style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-user-slash" style="font-size:24px;"></i> Nessun utente trovato nella tua area.</div>`;
        
        let searchInput = document.getElementById('rot-search-utenti-abilitati');
        if (searchInput) searchInput.value = '';
    };

    window.revocaAccessoRot = async (uid) => {
        if(confirm("Vuoi revocare l'accesso a questo utente? Dovrà rifare la richiesta.")) { 
            await setDoc(doc(db, "permessi_rotazioni", uid), { abilitato_rotazioni: false, stato_richiesta: 'rejected' }, { merge: true }); 
            window.apriGestioneAccessiModalRot(); 
        }
    };

    window.filtraUtentiAbilitatiRot = () => {
        let input = document.getElementById('rot-search-utenti-abilitati');
        let filter = input.value.toUpperCase();
        let rows = document.getElementsByClassName('rot-utente-row');
        for (let i = 0; i < rows.length; i++) {
            let txtValue = rows[i].getAttribute('data-search');
            if (txtValue.indexOf(filter) > -1) rows[i].style.display = "flex";
            else rows[i].style.display = "none";
        }
    };

    window.apriGestioneRichiesteRot = async () => {
        window.chiudiModalRotazioni('rot-modal-gestione-accessi'); 
        document.getElementById('rot-modal-gestione-richieste').style.display = 'flex';
        const cont = document.getElementById('rot-lista-richieste'); 
        cont.innerHTML = `<div style="text-align:center; padding:20px; color:var(--info);"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px;"></i> Ricerca richieste...</div>`;
        
        // Fetch combinato
        const permSnap = await getDocs(collection(db, "permessi_rotazioni"));
        const utentiSnap = await getDocs(collection(db, "utenti")); 
        
        let utentiBase = {};
        utentiSnap.forEach(d => utentiBase[d.id] = d.data());

        let groupedRequests = {}; let count = 0;
        window.utentiMap = {}; 
        
        permSnap.forEach(d => {
            const pData = d.data();
            
            if (pData.stato_richiesta === 'pending') {
                const uData = utentiBase[d.id] || {};
                const u = { ...uData, ...pData, uid: d.id }; // Merge
                
                window.utentiMap[d.id] = u;
                
                if (isCollab && !isAdmin && !(currentUserDoc.permessi_gestione || []).includes(u.rotazione_richiesta)) return;
                let rotKey = u.rotazione_richiesta || 'Sconosciuta';
                if (!groupedRequests[rotKey]) groupedRequests[rotKey] = [];
                groupedRequests[rotKey].push(u);
                count++;
            }
        });

        if (count === 0) {
            cont.innerHTML = `<div style="text-align:center; padding:20px; color:var(--success);"><i class="fa-solid fa-check-double" style="font-size:32px;"></i><br><br>Nessuna richiesta in sospeso.</div>`;
            return;
        }

        let html = "";
        for (let k in groupedRequests) {
            let rotNome = ROTAZIONI_MAP[k] || k;
            let reqs = groupedRequests[k];
            html += `<details style="margin-bottom:16px; border:1px solid var(--border-color); border-radius:var(--radius-md); background:var(--surface);" open>
                <summary style="padding:16px; font-weight:700; cursor:pointer; background:var(--surface-hover); border-radius:var(--radius-md); color:var(--text-main); outline:none; display:flex; justify-content:space-between; align-items:center;">
                    <span><i class="fa-regular fa-folder-open" style="color:var(--info); margin-right:8px;"></i> ${rotNome}</span>
                    <span style="background:var(--danger); color:#fff; border-radius:12px; padding:2px 10px; font-size:12px; box-shadow:0 2px 4px rgba(217, 48, 37, 0.3);">${reqs.length}</span>
                </summary>
                <div style="padding:16px; border-top:1px solid var(--border-color);">`;
            
            reqs.forEach(u => {
                const checkC = (u.cognome || '').trim().toUpperCase();
                const checkN = (u.nome || '').trim().toUpperCase();
                const presente = checkC && checkN && (window.globalNomiRotazioni || []).some(n => n.includes(checkC) && n.includes(checkN));
                const pallino = presente ? '<i class="fa-solid fa-circle-check" style="color:var(--success); font-size:12px; margin-left:6px;" title="Presente nei tabulati"></i>' : '';

                html += `<div style="background:var(--warning-light); border:1px dashed var(--warning-border); padding:16px; margin-bottom:12px; border-radius:12px;">
                    <div style="font-weight:800; font-size:15px; color:var(--warning); cursor:pointer; display:flex; align-items:center;" onclick="window.apriDettaglioUtenteRot('${u.uid}')">${u.cognome||''} ${u.nome||''} ${u.progressivo||''} ${pallino}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:4px; font-weight:600;"><i class="fa-solid fa-id-badge"></i> Matr: ${u.matricola||''}</div>
                    <div style="display:flex; gap:10px; margin-top:16px;">
                        <button class="rot-btn" style="background:var(--success); padding:10px; font-size:13px; margin:0; box-shadow:none;" onclick="window.gestisciRichiestaRot('${u.uid}', true, this)"><i class="fa-solid fa-check"></i> Consenti</button>
                        <button class="rot-btn-outline" style="color:var(--danger); border-color:var(--danger); padding:10px; font-size:13px; margin:0;" onclick="window.gestisciRichiestaRot('${u.uid}', false, this)"><i class="fa-solid fa-xmark"></i> Rifiuta</button>
                    </div>
                </div>`;
            });
            html += `</div></details>`;
        }
        cont.innerHTML = html;
    };

    window.gestisciRichiestaRot = async (uid, ok, btnElem) => {
        try {
            if (btnElem) { btnElem.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>"; btnElem.disabled = true; }
            await setDoc(doc(db, "permessi_rotazioni", uid), { 
                abilitato_rotazioni: ok, 
                stato_richiesta: ok ? 'approved' : 'rejected' 
            }, { merge: true });
            window.aggiornaBadgeRichiesteRotazioni();
            window.apriGestioneRichiesteRot();
        } catch(e) {
            alert("Errore di connessione.");
            window.apriGestioneRichiesteRot();
        }
    };

    window.apriGestioneCollaboratoriRot = async () => {
        if(!isAdmin) return;
        window.chiudiModalRotazioni('rot-modal-gestione-accessi'); 
        document.getElementById('rot-modal-gestione-collaboratori').style.display = 'flex';
        const cont = document.getElementById('rot-lista-collaboratori'); 
        cont.innerHTML = `<div style="text-align:center; padding:20px; color:#9c27b0;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px;"></i> Caricamento...</div>`;
        
        const utentiSnap = await getDocs(collection(db, "utenti")); 
        const permSnap = await getDocs(collection(db, "permessi_rotazioni"));
        
        let permBase = {};
        permSnap.forEach(d => permBase[d.id] = d.data());
        
        let html = "";
        utentiSnap.forEach(d => {
            const u = d.data();
            if (u.ruolo === 'collaborator') {
                const p = permBase[d.id] || {};
                const permGestione = p.permessi_gestione || [];
                
                html += `<div class="rot-utente-row" style="border-left: 4px solid #9c27b0;">
                    <div>
                        <strong style="font-size:15px; color:var(--text-main);">${u.cognome||''} ${u.nome||''}</strong><br>
                        <span style="font-size:12px; color:var(--text-muted); font-weight:600;"><i class="fa-solid fa-key"></i> Permessi: ${permGestione.length} aree</span>
                    </div>
                    <button class="rot-btn" style="width:auto; padding:8px 12px; background:#9c27b0; margin:0; box-shadow:none;" onclick='window.apriPermessiCollabRot("${d.id}", "${u.nome}", ${JSON.stringify(permGestione)})'><i class="fa-solid fa-pen-to-square"></i> Modifica</button>
                </div>`;
            }
        });
        cont.innerHTML = html || `<div style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-user-slash" style="font-size:24px;"></i> Nessun collaboratore trovato.</div>`;
    };

    window.apriPermessiCollabRot = (uid, nome, perms) => {
        window.chiudiModalRotazioni('rot-modal-gestione-collaboratori'); 
        document.getElementById('rot-modal-permessi-collaboratore').style.display = 'flex';
        document.getElementById('rot-nome-collab-titolo').innerText = nome || '';
        document.getElementById('rot-uid-collab-edit').value = uid;
        const cont = document.getElementById('rot-lista-checkbox-rotazioni'); let html = "";
        for(let k in ROTAZIONI_MAP) {
            html += `<label style="display: flex; align-items: center; gap: 10px; font-size: 14px; background:var(--surface); border:1px solid var(--border-color); padding:12px; border-radius:10px; margin-bottom:8px;">
                <input type="checkbox" class="rot-collab-perm-check" value="${k}" ${perms.includes(k)?"checked":""} style="width: 18px; height: 18px; margin: 0; accent-color:#9c27b0; cursor: pointer;"> 
                ${ROTAZIONI_MAP[k]}
            </label>`;
        }
        cont.innerHTML = html;
    };

    window.salvaPermessiCollabRot = async () => {
        const uid = document.getElementById('rot-uid-collab-edit').value;
        const btn = document.querySelector('#rot-modal-permessi-collaboratore .rot-btn');
        if(btn) { btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>"; btn.disabled = true; }
        
        const nP = Array.from(document.querySelectorAll('.rot-collab-perm-check:checked')).map(c => c.value);
        try {
            await setDoc(doc(db, "permessi_rotazioni", uid), { permessi_gestione: nP }, { merge: true });
            alert("Permessi aggiornati con successo.");
            window.chiudiModalRotazioni('rot-modal-permessi-collaboratore'); 
            window.apriGestioneCollaboratoriRot();
        } catch(e) { 
            alert("Errore nel salvataggio dei permessi."); 
            if(btn) { btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Permessi"; btn.disabled = false; }
        }
    };

    // INIZIO ESECUZIONE 
    window.initRotazioniState();
}
