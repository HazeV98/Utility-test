import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function avviaMotoreRubrica(db, auth, userDataPrivate, isAdmin) {
    let listaContatti = [];
    const currentUser = auth.currentUser;

    if (!currentUser) {
        nascondiTutto();
        document.getElementById('view-no-auth').style.display = 'flex';
        return;
    }

    function nascondiTutto() {
        document.getElementById('view-no-auth').style.display = 'none';
        document.getElementById('view-opt-in').style.display = 'none';
        document.getElementById('view-directory').style.display = 'none';
        document.getElementById('view-blocked').style.display = 'none';
        document.getElementById('view-loading-rubrica').style.display = 'none';
    }

    async function caricaStatoUtente() {
        document.getElementById('view-loading-rubrica').style.display = 'flex';
        try {
            if (userDataPrivate.revoche_rubrica >= 3 && !isAdmin) {
                nascondiTutto();
                document.getElementById('view-blocked').style.display = 'flex';
                try { await deleteDoc(doc(db, "rubrica", currentUser.uid)); } catch(e){}
                return;
            }

            if(isAdmin) {
                const strikeWarning = document.getElementById('strike-warning');
                if(strikeWarning) strikeWarning.style.display = 'none';
            }

            const rubricaRef = doc(db, "rubrica", currentUser.uid);
            const rubricaSnap = await getDoc(rubricaRef);
            
            if (rubricaSnap.exists()) {
                const datiRub = rubricaSnap.data();
                
                // CONTROLLO RIGIDO: Il file esiste, ma ha tutti i dati essenziali compilati?
                if (!datiRub.telefono || !datiRub.mansione || !datiRub.matricola) {
                    console.log("Profilo rubrica incompleto, forzo la compilazione.");
                    nascondiTutto();
                    document.getElementById('view-opt-in').style.display = 'flex';
                    return; // Ferma il caricamento della rubrica qui!
                }

                let updateNeeded = false;
                let updates = {};

                if (userDataPrivate.soprannome !== undefined && datiRub.soprannome !== userDataPrivate.soprannome) {
                    updates.soprannome = userDataPrivate.soprannome;
                    updateNeeded = true;
                }
                if (userDataPrivate.progressivo !== undefined && datiRub.progressivo !== userDataPrivate.progressivo) {
                    updates.progressivo = userDataPrivate.progressivo;
                    updateNeeded = true;
                }

                if (updateNeeded) {
                    await setDoc(rubricaRef, updates, { merge: true });
                }

                nascondiTutto();
                document.getElementById('view-directory').style.display = 'flex';
                caricaRubricaGenerale();
            } else {
                nascondiTutto();
                document.getElementById('view-opt-in').style.display = 'flex';
            }
        } catch (error) { 
            console.error(error);
            nascondiTutto(); 
        }
    }

    async function caricaRubricaGenerale() {
        const listDiv = document.getElementById('contacts-list');
        listDiv.innerHTML = "<div class='status-message'><i class='fa-solid fa-circle-notch fa-spin' style='font-size: 24px; color: var(--primary);'></i> Caricamento rubrica...</div>";
        try {
            const querySnapshot = await getDocs(collection(db, "rubrica"));
            listaContatti = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // SCUDO: Aggiunge alla lista SOLO chi ha un telefono e una mansione
                if(data.nome && data.cognome && data.telefono && data.mansione) {
                    listaContatti.push(data);
                }
            });
            listaContatti.sort((a, b) => (a.cognome + " " + a.nome).toLowerCase().localeCompare((b.cognome + " " + b.nome).toLowerCase()));
            disegnaContatti(listaContatti);
        } catch (error) { 
            console.error("Errore Rubrica:", error); 
            listDiv.innerHTML = "<div class='status-message' style='color:var(--danger);'>Errore durante la lettura dei contatti.</div>"; 
        }
    }

    function disegnaContatti(arrayContatti) {
        const listDiv = document.getElementById('contacts-list');
        const contatore = document.getElementById('contatore-contatti');
        
        if (contatore) {
            contatore.innerText = arrayContatti.length;
        }

        listDiv.innerHTML = "";
        if (arrayContatti.length === 0) return listDiv.innerHTML = "<div class='status-message'><i class='fa-solid fa-users-slash' style='font-size: 32px; color: var(--text-muted);'></i> Nessun contatto trovato.</div>";
        
        arrayContatti.forEach((c, index) => {
            const item = document.createElement('div'); item.className = "contact-item";
            item.style.animationDelay = `${index * 0.02}s`;
            const progLabel = c.progressivo ? ` (${c.progressivo})` : "";
            
            const safeNome = String(c.nome || "");
            const safeCognome = String(c.cognome || "");
            const nomeCap = safeNome.charAt(0).toUpperCase() + safeNome.slice(1).toLowerCase();
            const cognomeCap = safeCognome.charAt(0).toUpperCase() + safeCognome.slice(1).toLowerCase();
            
            const soprannomeLabel = c.soprannome ? ` <span style="font-style:italic; font-size:13px; color:var(--text-muted);">"${c.soprannome}"</span>` : "";
            
            const safeTelefono = String(c.telefono || "");
            const numDisplay = safeTelefono || "N/D";
            const numClean = safeTelefono.replace(/\s+/g, '');

            const actionStyle = numClean ? '' : 'display:none;';

            item.innerHTML = `
                <div class="contact-info">
                    <div class="contact-name">${cognomeCap} ${nomeCap}${progLabel}${soprannomeLabel}</div>
                    <div class="contact-detail"><i class="fa-solid fa-user-tag" style="width:16px;"></i> ${c.mansione || 'N/D'} &nbsp;|&nbsp; <i class="fa-regular fa-id-badge" style="width:14px;"></i> Mat: ${c.matricola || 'N/D'}</div>
                    <div class="contact-phone"><i class="fa-solid fa-mobile-screen"></i> ${numDisplay}</div>
                </div>
                <div class="contact-actions" style="${actionStyle}">
                    <a href="tel:${numClean}" class="action-icon phone-icon"><i class="fa-solid fa-phone"></i></a>
                    <a href="https://wa.me/39${numClean}" target="_blank" class="action-icon wa-icon"><i class="fa-brands fa-whatsapp"></i></a>
                </div>
            `;
            listDiv.appendChild(item);
        });
    }

    async function salvaCondivisione(n, c, ms, m, t, s, p) {
        try {
            await setDoc(doc(db, "rubrica", currentUser.uid), { nome: n, cognome: c, soprannome: s || "", progressivo: p || "", mansione: ms, matricola: m, telefono: t });
            document.getElementById('modal-profilo-rubrica').style.display = 'none';
            nascondiTutto();
            document.getElementById('view-directory').style.display = 'flex';
            caricaRubricaGenerale();
        } catch (error) { alert("Errore durante il salvataggio."); }
    }

    // --- FUNZIONI GLOBALI (esposte su window per l'HTML) ---

    window.avviaCondivisioneRubrica = function() {
        const haTuttiIDati = userDataPrivate.nome && userDataPrivate.cognome && userDataPrivate.matricola && userDataPrivate.mansione && userDataPrivate.telefono;
        if (haTuttiIDati) {
            salvaCondivisione(userDataPrivate.nome, userDataPrivate.cognome, userDataPrivate.mansione, userDataPrivate.matricola, userDataPrivate.telefono, userDataPrivate.soprannome, userDataPrivate.progressivo);
        } else {
            document.getElementById('regNomeRub').value = userDataPrivate.nome || "";
            document.getElementById('regCognomeRub').value = userDataPrivate.cognome || "";
            document.getElementById('regProgressivoRub').value = userDataPrivate.progressivo || "";
            document.getElementById('regSoprannomeRub').value = userDataPrivate.soprannome || "";
            document.getElementById('regMansioneRub').value = userDataPrivate.mansione || "";
            document.getElementById('regMatricolaRub').value = userDataPrivate.matricola || "";
            document.getElementById('regTelefonoRub').value = userDataPrivate.telefono || "";
            document.getElementById('modal-profilo-rubrica').style.display = 'flex';
        }
    };

    window.salvaECondividiRubrica = async function() {
        const n = document.getElementById('regNomeRub').value.trim();
        const c = document.getElementById('regCognomeRub').value.trim();
        const s = document.getElementById('regSoprannomeRub').value.trim();
        const p = document.getElementById('regProgressivoRub').value.trim();
        const ms = document.getElementById('regMansioneRub').value;
        const m = document.getElementById('regMatricolaRub').value.trim();
        const t = document.getElementById('regTelefonoRub').value.trim();
        
        if (!n || !c || !m || !ms || !t) return alert("Dati obbligatori mancanti! Assicurati di inserire Nome, Cognome, Matricola, Mansione e Telefono.");
        
        const btnSalva = document.getElementById('btnSalvaRubrica');
        const testoOriginale = btnSalva.innerHTML;
        btnSalva.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio...";
        
        try { 
            await setDoc(doc(db, "utenti", currentUser.uid), { nome: n, cognome: c, soprannome: s, progressivo: p, mansione: ms, matricola: m, telefono: t }, { merge: true }); 
            // Aggiorna la cache locale per evitare disallineamenti
            userDataPrivate.nome = n; userDataPrivate.cognome = c; userDataPrivate.mansione = ms; userDataPrivate.matricola = m; userDataPrivate.telefono = t; userDataPrivate.soprannome = s; userDataPrivate.progressivo = p;
        } catch(e) {
            console.error(e);
            btnSalva.innerHTML = testoOriginale;
            return;
        }
        
        salvaCondivisione(n, c, ms, m, t, s, p);
    };

    window.revocaCondivisioneRubrica = async function() {
        if(isAdmin) {
            if(confirm("🛠️ Sei Admin: Revoca senza strike?")) { 
                await deleteDoc(doc(db, "rubrica", currentUser.uid)); 
                nascondiTutto();
                document.getElementById('view-opt-in').style.display = 'flex';
            }
            return;
        }
        let revocheAttuali = userDataPrivate.revoche_rubrica || 0;
        if(!confirm(`Attenzione! Ti rimangono ${2-revocheAttuali} tentativi prima del blocco. Continuare?`)) return;
        
        try {
            await deleteDoc(doc(db, "rubrica", currentUser.uid)); 
            await setDoc(doc(db, "utenti", currentUser.uid), { revoche_rubrica: revocheAttuali + 1 }, { merge: true });
            userDataPrivate.revoche_rubrica = revocheAttuali + 1; // Aggiorna la cache
            caricaStatoUtente(); // Ricarica la vista
        } catch (error) { alert("Errore."); }
    };

    window.filtraRubrica = function() {
        const t = document.getElementById('search-bar-rubrica').value.toLowerCase().trim();
        if (!t) return disegnaContatti(listaContatti);
        const filtrati = listaContatti.filter(c => {
            const full = (c.nome + " " + c.cognome + " " + (c.progressivo||"") + " " + (c.soprannome||"") + " " + (c.matricola||"") + " " + (c.telefono||"") + " " + (c.mansione||"")).toLowerCase();
            return full.includes(t);
        });
        disegnaContatti(filtrati);
    };

    // Partenza motore
    caricaStatoUtente();
              } 
