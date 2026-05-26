import { doc, setDoc, updateDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function avviaMotorePromemoria(db, auth) {
    let fpPromemoriaInstance;
    const dbName = "UtilityDB";
    const storeName = "archivio_dds"; // Stesso storage delle DDS per mantenere i dati locali già salvati
    let localDb;

    // ==========================================
    // INIZIALIZZAZIONE INDEXED DB
    // ==========================================
    const request = indexedDB.open(dbName, 3);
    request.onupgradeneeded = function(event) { 
        localDb = event.target.result; 
        if (!localDb.objectStoreNames.contains(storeName)) { 
            localDb.createObjectStore(storeName, { keyPath: "id", autoIncrement: true }); 
        } 
    };
    request.onsuccess = function(event) { 
        localDb = event.target.result; 
        window.caricaListaPromemoria(); 
    };

    // ==========================================
    // FUNZIONI GLOBALI ESPOSIZIONE UI
    // ==========================================

    window.apriModaleAggiungiPromemoria = () => {
        document.getElementById('prom-titolo').value = '';
        document.getElementById('prom-note').value = '';
        document.getElementById('prom-banner-attiva').checked = false;
        document.getElementById('prom-orario').value = ''; 
        
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        const isWeb = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
        
        if (isNative || isWeb) {
            document.getElementById('prom-time-picker-group').style.display = 'flex';
        } else {
            document.getElementById('prom-time-picker-group').style.display = 'none';
        }

        if (!fpPromemoriaInstance && window.flatpickr) { 
            fpPromemoriaInstance = window.flatpickr("#prom-date-picker", { 
                mode: "multiple", 
                dateFormat: "Y-m-d", 
                locale: "it", 
                altInput: true, 
                altFormat: "d/m/Y", 
                conjunction: ", ",
                onReady: function(selectedDates, dateStr, instance) {
                    const btnContainer = document.createElement("div");
                    btnContainer.style.padding = "12px";
                    btnContainer.style.borderTop = "1px solid var(--border-color)";
                    btnContainer.style.backgroundColor = "var(--surface)";
                    
                    const btn = document.createElement("button");
                    btn.innerHTML = "<i class='fa-solid fa-check'></i> Fatto";
                    btn.style.backgroundColor = "var(--warning)";
                    btn.style.color = "#1a1a1a";
                    btn.style.border = "none";
                    btn.style.padding = "12px";
                    btn.style.borderRadius = "10px";
                    btn.style.fontWeight = "bold";
                    btn.style.cursor = "pointer";
                    btn.style.width = "100%";
                    btn.style.fontSize = "15px";
                    
                    btn.onclick = function() {
                        instance.close();
                    };
                    
                    btnContainer.appendChild(btn);
                    instance.calendarContainer.appendChild(btnContainer);
                }
            }); 
        }
        
        if(fpPromemoriaInstance) fpPromemoriaInstance.clear();
        document.querySelectorAll('.rem-prom-checkbox').forEach(cb => cb.checked = (cb.value === 'all_days'));
        window.apriModal('modal-aggiungi-promemoria');
    };

    window.salvaPromemoria = () => {
        if (!localDb) return;
        const btn = document.getElementById('btn-salva-prom');
        const titolo = document.getElementById('prom-titolo').value.trim();
        const note = document.getElementById('prom-note').value.trim();
        
        if (!fpPromemoriaInstance || !fpPromemoriaInstance.selectedDates) {
            return alert("Errore nel caricamento del calendario.");
        }

        const selectedDates = fpPromemoriaInstance.selectedDates.map(d => {
            const offset = d.getTimezoneOffset() * 60000; 
            return new Date(d.getTime() - offset).toISOString().split('T')[0];
        }).sort();
        
        const selectedReminders = Array.from(document.querySelectorAll('.rem-prom-checkbox:checked')).map(cb => cb.value);

        if (!titolo || selectedDates.length === 0) return alert("Compila Titolo e seleziona almeno una data.");

        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio..."; 
        btn.disabled = true;

        const uniqueId = "prom_" + Date.now();
        const nuovoPromemoria = { 
            id_sync: uniqueId, 
            titolo: titolo, 
            dateValidita: selectedDates, 
            reminder: selectedReminders, 
            note: note, 
            isPromemoria: true 
        };

        const tx = localDb.transaction(storeName, "readwrite");
        const reqAdd = tx.objectStore(storeName).add(nuovoPromemoria);

        reqAdd.onsuccess = async function(event) {
            if (auth.currentUser) {
                try {
                    const syncRef = doc(db, "utenti", auth.currentUser.uid, "promemoria_sync", uniqueId);
                    await setDoc(syncRef, {
                        titolo: titolo,
                        date: selectedDates,
                        completato: false,
                        timestamp: Date.now()
                    });

                    const bannerAttivo = document.getElementById('prom-banner-attiva').checked;
                    const orarioPush = document.getElementById('prom-orario').value;
                    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
                    const isWeb = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

                    if (bannerAttivo || (orarioPush && (isNative || isWeb))) {
                        const noteRef = doc(collection(db, "utenti", auth.currentUser.uid, "notifiche_programmate"));
                        let payloadProgrammata = {
                            titolo: "🔔 " + titolo,
                            date: selectedDates,
                            tipo: bannerAttivo ? "PROMEMORIA_BANNER" : "PROMEMORIA_PUSH",
                            note: note,
                            timestamp_creazione: Date.now()
                        };

                        if (orarioPush) {
                            payloadProgrammata.orario = orarioPush;
                        }

                        await setDoc(noteRef, payloadProgrammata);
                    }

                } catch(err) { console.error("Sync error:", err); }
            }

            alert("✅ Promemoria salvato!");
            window.chiudiModal('modal-aggiungi-promemoria');
            window.caricaListaPromemoria();
            btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva Promemoria"; 
            btn.disabled = false;
        };
        
        tx.onerror = () => { 
            alert("Errore database locale."); 
            btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva"; 
            btn.disabled = false; 
        };
    };

    window.caricaListaPromemoria = () => {
        if (!localDb) return;
        const listContainer = document.getElementById('promemoria-list-container');
        listContainer.innerHTML = '';

        const tx = localDb.transaction(storeName, "readonly");
        tx.objectStore(storeName).getAll().onsuccess = function(e) {
            let ddsArray = e.target.result.filter(dds => dds.isPromemoria);
            const oggiStr = new Date().toISOString().split('T')[0];

            ddsArray = ddsArray.filter(dds => {
                if (dds.dateValidita && dds.dateValidita.length > 0) {
                    if (dds.dateValidita[dds.dateValidita.length - 1] < oggiStr) {
                        eliminaPromemoria_Silenzioso(dds.id, dds.id_sync);
                        return false;
                    }
                }
                return true;
            });

            if (ddsArray.length === 0) { 
                listContainer.innerHTML = '<div class="prom-empty-state"><i class="fa-regular fa-bell-slash" style="font-size:32px; color:var(--border-color); display:block; margin-bottom:10px;"></i> Nessun Promemoria attivo.</div>'; 
                return; 
            }

            ddsArray.sort((a, b) => new Date(b.dateValidita[0]) - new Date(a.dateValidita[0]));

            ddsArray.forEach(dds => {
                let validitaTesto = dds.dateValidita.length <= 3 ? dds.dateValidita.map(d => d.split('-').reverse().join('/')).join(', ') : `<b>${dds.dateValidita.length} giorni totali</b>`;
                const card = document.createElement('div'); 
                card.className = 'promemoria-card';
                card.innerHTML = `
                    <div class="prom-title"><i class="fa-solid fa-bell" style="color:var(--warning);"></i> ${dds.titolo}</div>
                    <div class="prom-date"><i class="fa-regular fa-calendar-check"></i> Validità: ${validitaTesto}</div>
                    ${dds.note ? `<div class="prom-note-text"><i class="fa-solid fa-pencil" style="color:var(--text-muted);"></i> ${dds.note}</div>` : ''}
                    <button class="prom-btn-delete" onclick="window.eliminaPromemoria(${dds.id}, '${dds.id_sync}')"><i class="fa-solid fa-trash-can"></i> Elimina</button>
                `;
                listContainer.appendChild(card);
            });
        };
    };

    window.eliminaPromemoria = async (id, idSync) => {
        if (confirm("Vuoi davvero eliminare questo promemoria?")) {
            const tx = localDb.transaction(storeName, "readwrite");
            tx.objectStore(storeName).delete(id).onsuccess = async () => {
                if (auth.currentUser && idSync) {
                    try {
                        await updateDoc(doc(db, "utenti", auth.currentUser.uid, "promemoria_sync", idSync), { completato: true });
                    } catch(e) { console.error("Firebase update error", e); }
                }
                window.caricaListaPromemoria();
            };
        }
    };

    function eliminaPromemoria_Silenzioso(id, idSync) {
        const tx = localDb.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(id);
        if (auth.currentUser && idSync) {
            updateDoc(doc(db, "utenti", auth.currentUser.uid, "promemoria_sync", idSync), { completato: true }).catch(()=>{});
        }
    }
} 
