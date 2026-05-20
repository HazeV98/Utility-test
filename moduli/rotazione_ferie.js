import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function avviaMotoreRotazioneFerie(db, auth) {
    
    // Variabili di stato interne (Closures)
    let currentUser = auth.currentUser;
    let userDataPrivate = {};
    let myFerieData = null;
    let myAnnunciAttivi = [];
    let jsonFerie = { estive: [], invernali: [] };
    let bachecaAdsCache = {}; 
    const isAdmin = localStorage.getItem('dev_mode_active') === 'true';

    const mesiEstivi = ["Giugno", "Luglio", "Agosto", "Settembre"];
    const mesiInvernali = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Ottobre", "Novembre", "Dicembre"];

    // ==========================================
    // FUNZIONI DI INIZIALIZZAZIONE E STATO
    // ==========================================
    
    const nascondiTuttoFerie = () => { 
        document.querySelectorAll('.ferie-view-container').forEach(e => e.style.display='none'); 
    };

    const loadJSONFerie = async () => {
        try {
            const res = await fetch('rotazione_ferie.json');
            jsonFerie = await res.json();
            const pop = (el, arr, sub = false) => {
                if(!el) return; el.innerHTML = sub ? '' : '<option value="">-- Seleziona --</option>';
                arr.forEach(i => { const o = document.createElement('option'); o.value = i.n; o.innerText = i.n; el.appendChild(o); });
            };
            const lists = [document.getElementById('ferie-regEstive'), document.getElementById('ferie-regInvernali'), document.getElementById('ferie-currEstive'), document.getElementById('ferie-currInvernali')];
            pop(lists[0], jsonFerie.estive); pop(lists[1], jsonFerie.invernali); pop(lists[2], jsonFerie.estive); pop(lists[3], jsonFerie.invernali);
            pop(document.getElementById('ferie-optgroup-estive-ricerca'), jsonFerie.estive, true); pop(document.getElementById('ferie-optgroup-invernali-ricerca'), jsonFerie.invernali, true);
        } catch (e) {
            console.error("Errore nel caricamento del JSON ferie:", e);
        }
    };

    window.checkStatoFerie = async () => {
        currentUser = auth.currentUser;
        if (!currentUser) {
            nascondiTuttoFerie(); 
            document.getElementById('ferie-view-no-auth').style.display = 'flex';
            return;
        }

        try {
            const utenteRef = doc(db, "utenti", currentUser.uid);
            const utenteSnap = await getDoc(utenteRef);
            userDataPrivate = utenteSnap.data() || {};
            
            if (userDataPrivate.revoche_ferie >= 3 && !isAdmin) {
                nascondiTuttoFerie(); 
                document.getElementById('ferie-view-blocked').style.display = 'flex'; 
                return;
            }
            if(isAdmin) document.getElementById('ferie-strike-warning').style.display = 'none';

            const ferieRef = doc(db, "ferie_condivise", currentUser.uid);
            const ferieSnap = await getDoc(ferieRef);
            
            if (ferieSnap.exists()) {
                myFerieData = ferieSnap.data();

                // AUTO-SYNC PROGRESSIVO DA UTENTI A FERIE
                let updateNeeded = false;
                let updates = {};
                if (userDataPrivate.progressivo !== undefined && myFerieData.progressivo !== userDataPrivate.progressivo) {
                    updates.progressivo = userDataPrivate.progressivo;
                    updateNeeded = true;
                }
                
                if (updateNeeded) {
                    await setDoc(ferieRef, updates, { merge: true });
                    myFerieData.progressivo = userDataPrivate.progressivo;
                }

                document.getElementById('ferie-searchAnno').value = new Date().getFullYear();
                document.getElementById('ferie-searchMansione').value = myFerieData.mansione;
                document.getElementById('ferie-filtroMansioneBacheca').value = myFerieData.mansione;
                document.getElementById('ferie-top-actions-bar').style.display = 'flex';

                // --- LOGICA PULIZIA AMMINISTRATIVA / PERSONALE ---
                let qCleanup = isAdmin ? collection(db, "bacheca_ferie") : query(collection(db, "bacheca_ferie"), where("uid", "==", currentUser.uid));
                const adsSnap = await getDocs(qCleanup);
                myAnnunciAttivi = [];
                const oggi = new Date();
                const mesiMap = { "gennaio":0, "febbraio":1, "marzo":2, "aprile":3, "maggio":4, "giugno":5, "luglio":6, "agosto":7, "settembre":8, "ottobre":9, "novembre":10, "dicembre":11 };

                adsSnap.forEach(d => {
                    const a = d.data(); let scaduto = false;
                    const dataPub = new Date(a.timestamp);
                    const mesePub = dataPub.getMonth();
                    
                    let baseAnnoT = a.anno_riferimento ? parseInt(a.anno_riferimento) : dataPub.getFullYear();

                    if (a.cerco_tipo === 'mesi' && a.cerco_valori?.length > 0) {
                        let maxIdx = -1;
                        a.cerco_valori.forEach(m => {
                            let idx = mesiMap[m.toLowerCase()];
                            if (idx !== undefined) {
                                let idxRel = (idx <= mesePub - 1) ? idx + 12 : idx;
                                if (idxRel > maxIdx) maxIdx = idxRel;
                            }
                        });
                        if (maxIdx !== -1) {
                            let aTarget = baseAnnoT; let mTarget = maxIdx;
                            if (mTarget >= 12) { aTarget++; mTarget -= 12; }
                            if (oggi > new Date(aTarget, mTarget + 1, 1)) scaduto = true;
                        }
                    } else {
                        let aTarget = baseAnnoT;
                        if (a.tipo_ferie === 'estive') { if (mesePub > 8) aTarget++; if (oggi > new Date(aTarget, 9, 1)) scaduto = true; }
                        else { if (mesePub > 4) aTarget++; if (oggi > new Date(aTarget, 5, 1)) scaduto = true; }
                    }

                    if (!scaduto) { if (a.uid === currentUser.uid) myAnnunciAttivi.push(a); }
                    else { deleteDoc(doc(db, "bacheca_ferie", d.id)).catch(e => {}); }
                });

                nascondiTuttoFerie(); 
                document.getElementById('ferie-view-main').style.display = 'flex';
                window.eseguiRicercaFerie(); 
                window.caricaBachecaFerie();
            } else {
                nascondiTuttoFerie(); 
                document.getElementById('ferie-top-actions-bar').style.display = 'none';
                document.getElementById('ferie-view-opt-in').style.display = 'flex';
            }
        } catch (error) { 
            console.error("Errore in checkStatoFerie:", error); 
        }
    };


    // ==========================================
    // FUNZIONI GLOBALI ESPOSIZIONE UI (PROFILO FERIE)
    // ==========================================

    window.apriModaleCondivisioneFerie = () => {
        document.getElementById('ferie-regNome').value = userDataPrivate.nome || "";
        document.getElementById('ferie-regCognome').value = userDataPrivate.cognome || "";
        document.getElementById('ferie-regProgressivo').value = userDataPrivate.progressivo || "";
        document.getElementById('ferie-regMatricola').value = userDataPrivate.matricola || "";
        document.getElementById('ferie-regTelefono').value = userDataPrivate.telefono || "";
        document.getElementById('ferie-regMansione').value = userDataPrivate.mansione || "";
        if(myFerieData) {
            document.getElementById('ferie-regAnno').value = myFerieData.anno_base;
            document.getElementById('ferie-regEstive').value = myFerieData.periodo_estivo;
            document.getElementById('ferie-regInvernali').value = myFerieData.periodo_invernale;
            document.getElementById('ferie-currEstive').value = myFerieData.est_attuale || myFerieData.periodo_estivo;
            document.getElementById('ferie-currInvernali').value = myFerieData.inv_attuale || myFerieData.periodo_invernale;
        } else {
            document.getElementById('ferie-regAnno').value = new Date().getFullYear();
        }
        window.apriModal('modal-condivisione-ferie');
    };

    window.salvaFerie = async () => {
        const btn = document.getElementById('ferie-btnSalvaFerie');
        const n = document.getElementById('ferie-regNome').value.trim();
        const c = document.getElementById('ferie-regCognome').value.trim();
        const p = document.getElementById('ferie-regProgressivo').value.trim();
        const mat = document.getElementById('ferie-regMatricola').value.trim();
        const tel = document.getElementById('ferie-regTelefono').value.trim();
        const man = document.getElementById('ferie-regMansione').value;
        const anno = parseInt(document.getElementById('ferie-regAnno').value);
        const est = document.getElementById('ferie-regEstive').value;
        const inv = document.getElementById('ferie-regInvernali').value;

        if(!n || !c || !mat || !tel || !anno || !man || !est || !inv) return alert("Compila tutti i campi obbligatori (*)");

        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio..."; 
        btn.disabled = true;

        const payloadFerie = { 
            uid: currentUser.uid, 
            nome: n, 
            cognome: c, 
            progressivo: p, 
            matricola: mat, 
            telefono: tel, 
            mansione: man, 
            anno_base: anno, 
            periodo_estivo: est, 
            periodo_invernale: inv, 
            est_attuale: document.getElementById('ferie-currEstive').value, 
            inv_attuale: document.getElementById('ferie-currInvernali').value 
        };
        const payloadUtente = { nome: n, cognome: c, progressivo: p, matricola: mat, telefono: tel, mansione: man };

        try {
            await setDoc(doc(db, "ferie_condivise", currentUser.uid), payloadFerie);
            await setDoc(doc(db, "utenti", currentUser.uid), payloadUtente, { merge: true });
            
            // SPA Upgrade: invece del reload, aggiorno lo stato UI
            btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Dati Profilo"; 
            btn.disabled = false;
            window.chiudiModal('modal-condivisione-ferie');
            window.checkStatoFerie(); 
            
        } catch (e) {
            alert("Errore durante il salvataggio.");
            btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Dati Profilo"; 
            btn.disabled = false;
        }
    };

    window.revocaCondivisioneFerie = async () => {
        if(isAdmin) { 
            await deleteDoc(doc(db, "ferie_condivise", currentUser.uid)); 
            window.checkStatoFerie(); // SPA Upgrade
            return; 
        }
        
        let r = userDataPrivate.revoche_ferie || 0;
        if(confirm(`Attenzione! Ti rimangono ${2-r} tentativi prima del blocco permanente dell'accesso.\nSei sicuro di voler annullare la condivisione?`)) {
            await deleteDoc(doc(db, "ferie_condivise", currentUser.uid));
            await setDoc(doc(db, "utenti", currentUser.uid), { revoche_ferie: r + 1 }, { merge: true });
            window.checkStatoFerie(); // SPA Upgrade
        }
    };


    // ==========================================
    // FUNZIONI GLOBALI (RICERCA E TABELLE)
    // ==========================================

    const calc_ferie = (u, type, ar) => {
        const arr = type === 'est' ? jsonFerie.estive : jsonFerie.invernali;
        const baseP = type === 'est' ? u.periodo_estivo : u.periodo_invernale;
        if (ar === new Date().getFullYear()) return type === 'est' ? (u.est_attuale || baseP) : (u.inv_attuale || baseP);
        const idx = arr.findIndex(o => o.n === baseP);
        if (idx === -1) return "N/D";
        const ni = (((idx + (ar - u.anno_base)) % arr.length) + arr.length) % arr.length;
        return arr[ni].n;
    };

    window.switchTabFerie = (t) => {
        document.querySelectorAll('.ferie-tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('ferie-tab-'+t).classList.add('active');
        document.getElementById('ferie-panel-cerca').style.display = t==='cerca'?'block':'none';
        document.getElementById('ferie-panel-bacheca').style.display = t==='bacheca'?'block':'none';
    };

    window.eseguiRicercaFerie = async () => {
        const resC = document.getElementById('ferie-risultati-ricerca');
        const sugC = document.getElementById('ferie-suggeriti-ricerca');
        const annoInput = document.getElementById('ferie-searchAnno').value;
        const ar = parseInt(annoInput) || new Date().getFullYear();
        
        document.getElementById('ferie-span-anno-ricerca').innerText = ar;

        const mf = document.getElementById('ferie-searchMansione').value;
        const pf = document.getElementById('ferie-searchPeriodo').value;
        
        resC.innerHTML = `<div class="status-message" style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin"></i> Ricerca in corso...</div>`;
        sugC.innerHTML = "";
        
        const snap = await getDocs(collection(db, "ferie_condivise"));
        resC.innerHTML = ""; let sCount = 0; let rCount = 0;

        snap.forEach(d => {
            const u = d.data(); if (mf !== "Tutte" && u.mansione !== mf) return;
            const ec = calc_ferie(u, 'est', ar); const ic = calc_ferie(u, 'inv', ar);
            if (pf && ec !== pf && ic !== pf) return;
            
            const match = (p, t) => myAnnunciAttivi.some(a => a.tipo_ferie === t && (a.cerco_tipo === 'periodo' ? a.cerco_valori[0] === p : a.cerco_valori.some(m => p.toLowerCase().includes(m.toLowerCase()))));
            const isS = u.uid !== currentUser.uid && (match(ec, 'estive') || match(ic, 'invernali'));
            const hasExchange = ar === new Date().getFullYear() && (u.est_attuale !== u.periodo_estivo || u.inv_attuale !== u.periodo_invernale);
            const progLabel = u.progressivo ? ` (${u.progressivo})` : "";
            
            const isMe = u.uid === currentUser.uid;

            const html = `<div class="${isS?'ferie-card-suggested':'ferie-card'}" style="padding:20px; animation: slideInUp 0.3s ease both;">
                <div style="display:flex; justify-content: space-between;">
                    <div style="flex:1;">
                        <div style="font-weight:800; font-size:16px; color:var(--primary); margin-bottom:4px;">${u.cognome} ${u.nome}${progLabel}${isMe?' <span style="font-size:12px; color:var(--text-muted); font-weight:normal;">(Tu)</span>':''}</div>
                        <div style="font-size:12px; color:var(--text-muted); font-weight:600; margin-bottom: 12px;"><i class="fa-solid fa-id-badge"></i> ${u.mansione} | Matr: ${u.matricola || 'N/D'}</div>
                        
                        <span class="badge-estivo"><i class="fa-solid fa-sun"></i> ${ec}${hasExchange && ec===u.est_attuale ? '<span class="badge-scambiato"><i class="fa-solid fa-right-left"></i> Scambiato</span>' : ''}</span><br>
                        <span class="badge-invernale"><i class="fa-solid fa-snowflake"></i> ${ic}${hasExchange && ic===u.inv_attuale ? '<span class="badge-scambiato"><i class="fa-solid fa-right-left"></i> Scambiato</span>' : ''}</span>
                    </div>
                    ${!isMe ? `<div class="ferie-contact-actions"><a href="https://wa.me/39${u.telefono.replace(/\s+/g,'')}" target="_blank" class="ferie-action-icon btn-wa" title="Contatta su WhatsApp"><i class="fa-brands fa-whatsapp"></i></a></div>` : ''}
                </div>
            </div>`;
            
            if(isS) { sCount++; sugC.innerHTML += html; } else { rCount++; resC.innerHTML += html; }
        });
        
        document.getElementById('ferie-suggeriti-ricerca-container').style.display = sCount>0?'block':'none';
        if(rCount === 0 && sCount === 0) {
            resC.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); background:var(--surface-hover); border-radius:var(--radius-md); border:1px dashed var(--border-color);"><i class="fa-solid fa-user-slash" style="font-size:32px; display:block; margin-bottom:10px;"></i> Nessun collega trovato per questi criteri.</div>`;
        }
    };


    // ==========================================
    // FUNZIONI GLOBALI (BACHECA E ANNUNCI)
    // ==========================================

    window.apriModaleAnnuncioFerie = () => { 
        document.getElementById('ferie-editAdId').value = "";
        document.getElementById('ferie-titoloModalAnnuncio').innerHTML = "<i class='fa-solid fa-bullhorn' style='color:var(--primary);'></i> Nuovo Annuncio";
        document.getElementById('ferie-adTipoFerie').value = 'estive'; 
        document.getElementById('ferie-adAnnoRiferimento').value = new Date().getFullYear();
        document.getElementById('ferie-btnSalvaAnnuncio').innerHTML = "<i class='fa-solid fa-paper-plane'></i> Pubblica Annuncio";
        window.aggiornaFormAnnuncioFerie(); 
        window.apriModal('modal-annuncio-ferie');
    };

    window.aggiornaFormAnnuncioFerie = () => {
        const t = document.getElementById('ferie-adTipoFerie').value; 
        const ct = document.getElementById('ferie-adCercoTipo').value;
        
        const pop = (el, arr) => { 
            el.innerHTML = '<option value="">-- Seleziona --</option>'; 
            arr.forEach(i => { const o = document.createElement('option'); o.value = i.n; o.innerText = i.n; el.appendChild(o); }); 
        };
        
        pop(document.getElementById('ferie-adPeriodoOfferto'), jsonFerie[t]);
        
        const idModifica = document.getElementById('ferie-editAdId').value;
        if(myFerieData && !idModifica) {
            const def = t === 'estive' ? (myFerieData.est_attuale || myFerieData.periodo_estivo) : (myFerieData.inv_attuale || myFerieData.periodo_invernale);
            document.getElementById('ferie-adPeriodoOfferto').value = def;
        }
        
        document.getElementById('ferie-cerco-mesi-container').style.display = ct==='mesi'?'block':'none';
        document.getElementById('ferie-cerco-periodo-container').style.display = ct==='periodo'?'block':'none';
        
        if(ct==='mesi') {
            const cm = document.getElementById('ferie-checkboxes-mesi'); 
            cm.innerHTML = "";
            (t==='estive'?mesiEstivi:mesiInvernali).forEach(m => cm.innerHTML += `<label class="ferie-checkbox-label"><input type="checkbox" value="${m}"> ${m}</label>`);
        } else {
            pop(document.getElementById('ferie-adPeriodoCercato'), jsonFerie[t]);
        }
    };

    window.modificaAnnuncioFerie = (id) => {
        const a = bachecaAdsCache[id];
        if(!a) return;
        
        document.getElementById('ferie-editAdId').value = id;
        document.getElementById('ferie-titoloModalAnnuncio').innerHTML = "<i class='fa-solid fa-pen-to-square' style='color:var(--primary);'></i> Modifica Annuncio";
        document.getElementById('ferie-adTipoFerie').value = a.tipo_ferie;
        document.getElementById('ferie-adAnnoRiferimento').value = a.anno_riferimento || new Date().getFullYear();
        
        window.aggiornaFormAnnuncioFerie();
        
        setTimeout(() => {
            document.getElementById('ferie-adPeriodoOfferto').value = a.periodo_offerto;
            document.getElementById('ferie-adCercoTipo').value = a.cerco_tipo;
            window.aggiornaFormAnnuncioFerie();
            
            setTimeout(() => {
                if(a.cerco_tipo === 'mesi') {
                    document.querySelectorAll('#ferie-checkboxes-mesi input').forEach(cb => {
                        cb.checked = a.cerco_valori.includes(cb.value);
                    });
                } else {
                    document.getElementById('ferie-adPeriodoCercato').value = a.cerco_valori[0] || '';
                }
                document.getElementById('ferie-btnSalvaAnnuncio').innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Modifiche";
                window.apriModal('modal-annuncio-ferie');
            }, 50);
        }, 50);
    };

    window.pubblicaAnnuncioFerie = async () => {
        const btn = document.getElementById('ferie-btnSalvaAnnuncio');
        const idModifica = document.getElementById('ferie-editAdId').value;
        const t = document.getElementById('ferie-adTipoFerie').value; 
        const ct = document.getElementById('ferie-adCercoTipo').value;
        const annoRif = document.getElementById('ferie-adAnnoRiferimento').value;
        const cv = ct === 'mesi' ? Array.from(document.querySelectorAll('#ferie-checkboxes-mesi input:checked')).map(b => b.value) : [document.getElementById('ferie-adPeriodoCercato').value];
        
        if(!annoRif) return alert("Inserisci l'anno di riferimento.");
        if(!document.getElementById('ferie-adPeriodoOfferto').value || cv.length === 0 || (ct === 'periodo' && !cv[0])) {
            return alert("Completa tutti i campi prima di procedere!");
        }
        
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio..."; 
        btn.disabled = true;
        
        try {
            if (idModifica) {
                await updateDoc(doc(db, "bacheca_ferie", idModifica), {
                    tipo_ferie: t, 
                    periodo_offerto: document.getElementById('ferie-adPeriodoOfferto').value, 
                    cerco_tipo: ct, 
                    cerco_valori: cv,
                    anno_riferimento: parseInt(annoRif),
                    timestamp_modifica: Date.now()
                });
            } else {
                await addDoc(collection(db, "bacheca_ferie"), { 
                    uid: currentUser.uid, 
                    nome: myFerieData.nome || "", 
                    cognome: myFerieData.cognome || "", 
                    progressivo: myFerieData.progressivo || userDataPrivate.progressivo || "",
                    telefono: myFerieData.telefono || "", 
                    mansione: myFerieData.mansione || "", 
                    matricola: myFerieData.matricola || userDataPrivate.matricola || "N/D", 
                    timestamp: Date.now(), 
                    tipo_ferie: t, 
                    periodo_offerto: document.getElementById('ferie-adPeriodoOfferto').value, 
                    cerco_tipo: ct, 
                    cerco_valori: cv,
                    anno_riferimento: parseInt(annoRif)
                });
            }
            
            // SPA Upgrade
            btn.disabled = false;
            window.chiudiModal('modal-annuncio-ferie');
            window.caricaBachecaFerie();

        } catch (error) {
            console.error("Errore Firebase:", error);
            alert("Errore durante l'operazione.");
            btn.innerHTML = idModifica ? "<i class='fa-solid fa-floppy-disk'></i> Salva Modifiche" : "<i class='fa-solid fa-paper-plane'></i> Pubblica";
            btn.disabled = false;
        }
    };

    window.caricaBachecaFerie = async () => {
        const sugC = document.getElementById('ferie-suggeriti-bacheca'); 
        const resC = document.getElementById('ferie-lista-annunci');
        const fMan = document.getElementById('ferie-filtroMansioneBacheca').value;
        
        resC.innerHTML = `<div class="status-message" style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin"></i> Caricamento bacheca...</div>`;
        
        let q = fMan === "Tutte" ? collection(db, "bacheca_ferie") : query(collection(db, "bacheca_ferie"), where("mansione", "==", fMan));
        const ads = await getDocs(q);
        
        bachecaAdsCache = {}; 
        sugC.innerHTML = ""; 
        resC.innerHTML = ""; 
        let sCount = 0; let rCount = 0;
        
        ads.forEach(d => {
            const a = d.data(); 
            bachecaAdsCache[d.id] = a; 
            
            const isMe = a.uid === currentUser.uid;
            const canDelete = isMe || isAdmin; 
            const progLabel = a.progressivo ? ` (${a.progressivo})` : "";
            
            const match = !isMe && myAnnunciAttivi.some(m => m.tipo_ferie === a.tipo_ferie && (m.cerco_tipo === 'periodo' ? m.cerco_valori[0] === a.periodo_offerto : m.cerco_valori.some(mes => a.periodo_offerto.toLowerCase().includes(mes.toLowerCase()))));
            
            let actionsHTML = "";
            if (!isMe && a.telefono) {
                actionsHTML += `<a href="https://wa.me/39${a.telefono.replace(/\s+/g,'')}" target="_blank" class="ferie-action-icon btn-wa" title="Contatta su WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>`;
            }
            if (isMe) {
                actionsHTML += `<button onclick="window.modificaAnnuncioFerie('${d.id}')" class="ferie-action-icon" style="color:var(--primary);"><i class="fa-solid fa-pen"></i></button>`;
            }
            if (canDelete) {
                actionsHTML += `<button onclick="window.cancellaAnnuncioFerie('${d.id}')" class="ferie-action-icon" style="color:var(--danger);"><i class="fa-solid fa-trash-can"></i></button>`;
            }

            const annoBadge = a.anno_riferimento ? `Anno: ${a.anno_riferimento}` : `<span style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> N/D</span>`;
            const tipoIcon = a.tipo_ferie === 'estive' ? '<i class="fa-solid fa-sun" style="color: #e65100;"></i>' : '<i class="fa-solid fa-snowflake" style="color: #0d47a1;"></i>';
            const borderColor = a.tipo_ferie === 'estive' ? 'var(--warning)' : 'var(--primary)';

            const h = `<div class="${match?'ferie-card-suggested':'ferie-card'}" style="border-left:5px solid ${borderColor}; padding:20px; animation: slideInUp 0.3s ease both;">
                <div style="display:flex; justify-content: space-between;">
                    <div style="flex:1;">
                        <div style="font-weight:800; font-size:16px; color:var(--text-main); margin-bottom:4px;">${a.cognome} ${a.nome}${progLabel}${isMe?' <span style="font-size:12px; color:var(--text-muted); font-weight:normal;">(Il tuo annuncio)</span>':''}</div>
                        <div style="font-size:12px; color:var(--text-muted); font-weight:600; margin-bottom: 15px;"><i class="fa-solid fa-id-badge"></i> ${a.mansione}</div>
                        
                        <div style="background:var(--surface-hover); border:1px solid var(--border-color); border-radius: 12px; padding:12px; margin-bottom: 10px;">
                            <div style="font-size:11px; font-weight:800; color:var(--text-muted); margin-bottom:6px;">CEDE (Scambio ${annoBadge})</div>
                            <span class="${a.tipo_ferie==='estive'?'badge-estivo':'badge-invernale'}" style="margin:0;">${tipoIcon} ${a.periodo_offerto}</span>
                        </div>
                        
                        <div style="background:var(--surface-hover); border:1px solid var(--border-color); border-radius: 12px; padding:12px;">
                            <div style="font-size:11px; font-weight:800; color:var(--text-muted); margin-bottom:6px;">CERCA</div>
                            <span class="badge-cerco" style="margin:0;">${a.cerco_valori.join(', ')}</span>
                        </div>
                    </div>
                    <div class="ferie-contact-actions">
                        ${actionsHTML}
                    </div>
                </div>
            </div>`;
            if(match) { sCount++; sugC.innerHTML += h; } else { rCount++; resC.innerHTML += h; }
        });
        
        document.getElementById('ferie-suggeriti-bacheca-container').style.display = sCount>0?'block':'none';
        if(rCount === 0 && sCount === 0) {
            resC.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); background:var(--surface-hover); border-radius:var(--radius-md); border:1px dashed var(--border-color);"><i class="fa-regular fa-clipboard" style="font-size:32px; display:block; margin-bottom:10px;"></i> Nessun annuncio presente.</div>`;
        }
    };

    window.cancellaAnnuncioFerie = async (id) => {
        if(!confirm("Sei sicuro di voler cancellare questo annuncio?")) return;
        await deleteDoc(doc(db, "bacheca_ferie", id));
        window.caricaBachecaFerie(); // SPA Upgrade
    };

    // ==========================================
    // ESECUZIONE AL LANCIO
    // ==========================================
    loadJSONFerie().then(() => {
        window.checkStatoFerie();
    });
}
