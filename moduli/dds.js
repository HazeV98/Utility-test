// dds.js - Modulo per la gestione dell'Archivio DDS (IndexedDB e Notifiche Firebase)

import { doc, setDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let localDb;
let fpInstance;
let globalAuth;
let globalDb;
const dbName = "UtilityDB";
const storeName = "archivio_dds";

export function avviaMotoreDDS(db, auth) {
    globalDb = db;
    globalAuth = auth;

    // Inizializza IndexedDB
    const request = indexedDB.open(dbName, 3);
    
    request.onupgradeneeded = function(event) {
        localDb = event.target.result;
        if (!localDb.objectStoreNames.contains(storeName)) { 
            localDb.createObjectStore(storeName, { keyPath: "id", autoIncrement: true }); 
        }
    };
    
    request.onsuccess = function(event) { 
        localDb = event.target.result; 
        window.caricaListaDDS(); 
    };
    
    request.onerror = function(event) {
        console.error("Errore nell'apertura di IndexedDB per DDS", event);
    };
}

window.apriModaleAggiungiDDS = () => {
    document.getElementById('dds-titolo').value = '';
    document.getElementById('dds-file').value = '';
    document.getElementById('banner-attiva').checked = false;
    document.getElementById('dds-orario').value = '';

    // Logica per mostrare l'input orario solo su app nativa o PWA supportata
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    const isWeb = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    
    if (isNative || isWeb) {
        document.getElementById('dds-time-picker-group').style.display = 'flex';
    } else {
        document.getElementById('dds-time-picker-group').style.display = 'none';
    }
    
    // Inizializza Flatpickr se non esiste
    if (!fpInstance) {
        fpInstance = flatpickr("#dds-date-picker", { 
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
                btn.style.backgroundColor = "var(--primary)";
                btn.style.color = "white";
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
    
    fpInstance.clear();
    document.querySelectorAll('.rem-checkbox').forEach(cb => cb.checked = (cb.value === 'all_days'));
    document.getElementById('modal-aggiungi-dds').style.display = 'flex'; // NOTA: Assicurati che l'ID in index.html sia aggiornato a 'modal-aggiungi-dds'
};

window.chiudiModaleAggiungiDDS = () => {
    document.getElementById('modal-aggiungi-dds').style.display = 'none';
};

window.salvaDDS = () => {
    if (!localDb) return;
    const btn = document.getElementById('btn-salva-dds');
    const titolo = document.getElementById('dds-titolo').value.trim();
    const fileInput = document.getElementById('dds-file');
    
    const selectedDates = fpInstance.selectedDates.map(d => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    }).sort();

    const selectedReminders = Array.from(document.querySelectorAll('.rem-checkbox:checked')).map(cb => cb.value);

    if (!titolo || selectedDates.length === 0 || fileInput.files.length === 0) {
        return alert("Compila Titolo, seleziona date e scegli un File PDF.");
    }

    const file = fileInput.files[0];
    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio..."; 
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = function(e) {
        const nuovaDDS = { 
            titolo: titolo, 
            dateValidita: selectedDates, 
            reminder: selectedReminders, 
            fileData: e.target.result, 
            fileName: file.name 
        };
        
        const tx = localDb.transaction(storeName, "readwrite");
        const reqAdd = tx.objectStore(storeName).add(nuovaDDS);

        reqAdd.onsuccess = async function() {
            const bannerAttiva = document.getElementById('banner-attiva').checked;
            const orarioPush = document.getElementById('dds-orario').value;
            
            const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
            const isWeb = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

            // Se l'utente è loggato e ha attivato banner o notifiche, salva su Firebase
            if (globalAuth && globalAuth.currentUser && (bannerAttiva || (orarioPush && (isNative || isWeb)))) {
                try {
                    const noteRef = doc(collection(globalDb, "utenti", globalAuth.currentUser.uid, "notifiche_programmate"));
                    let payloadProgrammata = {
                        titolo: "DDS: " + titolo,
                        date: selectedDates,
                        tipo: bannerAttiva ? "DDS_BANNER" : "DDS_PUSH",
                        timestamp_creazione: Date.now()
                    };

                    if (orarioPush) {
                        payloadProgrammata.orario = orarioPush;
                    }

                    await setDoc(noteRef, payloadProgrammata);
                } catch(err) { 
                    console.error("Errore salvataggio programmazione:", err); 
                }
            }

            alert("✅ DDS salvata con successo!");
            window.chiudiModaleAggiungiDDS();
            window.caricaListaDDS();
            btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva DDS"; 
            btn.disabled = false;
        };
    };
    reader.readAsDataURL(file);
};

window.caricaListaDDS = function() {
    if (!localDb) return;
    const listContainer = document.getElementById('dds-list');
    if (!listContainer) return; // Sicurezza
    
    listContainer.innerHTML = '';
    const tx = localDb.transaction(storeName, "readonly");
    const reqGetAll = tx.objectStore(storeName).getAll();

    reqGetAll.onsuccess = function() {
        let ddsArray = reqGetAll.result.filter(dds => !dds.isPromemoria);
        ddsArray.sort((a, b) => new Date(b.dateValidita[0]) - new Date(a.dateValidita[0]));

        if (ddsArray.length === 0) { 
            listContainer.innerHTML = '<div class="empty-state"><i class="fa-solid fa-folder-open" style="font-size:32px; color:var(--border-color); display:block; margin-bottom:10px;"></i> Nessuna DDS archiviata.</div>'; 
            return; 
        }

        ddsArray.forEach(dds => {
            const card = document.createElement('div'); 
            card.className = 'dds-card';
            card.innerHTML = `
                <div class="dds-title"><i class="fa-solid fa-file-pdf" style="color:var(--danger);"></i> ${dds.titolo}</div>
                <div class="dds-date"><i class="fa-regular fa-calendar-check"></i> Validità: ${dds.dateValidita.length} giorni</div>
                <div class="btn-group">
                    <button class="btn-open" onclick="window.apriPDF_DDS(${dds.id})"><i class="fa-solid fa-eye"></i> Apri PDF</button>
                    <button class="btn-delete" onclick="window.eliminaDDS(${dds.id})"><i class="fa-solid fa-trash-can"></i> Elimina</button>
                </div>`;
            listContainer.appendChild(card);
        });
    };
};

window.apriPDF_DDS = (id) => {
    if (!localDb) return;
    localDb.transaction(storeName, "readonly").objectStore(storeName).get(id).onsuccess = function(e) {
        const dds = e.target.result;
        if (dds && dds.fileData) {
            const a = document.createElement('a'); 
            a.href = dds.fileData; 
            a.target = "_blank";
            document.body.appendChild(a); 
            a.click(); 
            document.body.removeChild(a);
        }
    };
};

window.eliminaDDS = (id) => { 
    if (!localDb) return;
    if (confirm("Sei sicuro di voler eliminare questa DDS?")) { 
        localDb.transaction(storeName, "readwrite").objectStore(storeName).delete(id).onsuccess = window.caricaListaDDS; 
    } 
};

window.esportaDDS = () => {
    if (!localDb) return;
    localDb.transaction(storeName, "readonly").objectStore(storeName).getAll().onsuccess = function(e) {
        const blob = new Blob([JSON.stringify(e.target.result)], { type: "application/json" });
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob);
        a.download = `backup_dds_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };
};

window.importaDDS = (event) => {
    if (!localDb) return;
    const file = event.target.files[0]; 
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const tx = localDb.transaction(storeName, "readwrite");
            data.forEach(item => { 
                delete item.id; 
                tx.objectStore(storeName).add(item); 
            });
            tx.oncomplete = () => { 
                alert("Backup importato con successo!"); 
                window.caricaListaDDS(); 
            };
        } catch(error) {
            alert("Errore durante l'importazione. Il file potrebbe essere corrotto o in un formato non valido.");
            console.error(error);
        }
    };
    reader.readAsText(file);
    // Resetta l'input per permettere re-importazioni dello stesso file
    event.target.value = '';
};
