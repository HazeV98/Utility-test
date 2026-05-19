// dds.js - Modulo per la gestione dell'Archivio DDS con UI iniettata dinamicamente

import { doc, setDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let localDb;
let fpInstance;
let globalAuth;
let globalDb;
const dbName = "UtilityDB";
const storeName = "archivio_dds";

const ddsHTML = `
<style id="dds-specific-styles">
    .dds-card { background: var(--surface); padding: 20px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; border-left: 6px solid var(--primary); transition: transform 0.2s, box-shadow 0.2s; margin-bottom: 12px;}
    .dds-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .dds-title { font-weight: 700; font-size: 16px; color: var(--primary); display: flex; align-items: center; gap: 8px; line-height: 1.4; }
    .dds-date { font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; font-weight: 500;}
    .dds-btn-group { display: flex; gap: 10px; margin-top: 5px; }
    .btn-dds-open { background-color: var(--primary); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 600; font-size: 14px; flex: 1; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: all 0.2s; }
    .btn-dds-open:active { transform: scale(0.97); }
    .btn-dds-delete { background-color: var(--surface); color: var(--danger); border: 1px solid var(--danger); padding: 12px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: all 0.2s; }
    .btn-dds-delete:active { background-color: var(--danger-light); transform: scale(0.97); }
    .btn-dds-outline { background-color: var(--surface); color: var(--text-main); border: 1px solid var(--border-color); padding: 14px; font-size: 14px; font-weight: 600; border-radius: 12px; cursor: pointer; flex: 1; text-align: center; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: var(--shadow-sm); transition: all 0.2s; }
    .btn-dds-outline:active { background-color: var(--surface-hover); transform: scale(0.97); }
    .dds-empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 15px; font-weight: 500; background: var(--surface-hover); border-radius: var(--radius-md); border: 1px dashed var(--border-color); }
</style>

<div id="modal-dds-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-dds-main')">
    <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
        <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-dds-main')"></i>
        
        <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
            <i class="fa-solid fa-box-archive"></i> Archivio DDS
        </h3>

        <div style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 15px;">
            <button class="btn-action btn-success" style="margin-top:0;" onclick="window.apriModaleAggiungiDDS()"><i class="fa-solid fa-file-circle-plus"></i> Carica Nuova DDS</button>
            
            <div style="display: flex; gap: 12px; width: 100%;">
                <button class="btn-dds-outline" onclick="window.esportaDDS()"><i class="fa-solid fa-download"></i> Esporta</button>
                <button class="btn-dds-outline" onclick="document.getElementById('importa-dds-file').click()"><i class="fa-solid fa-upload"></i> Importa</button>
                <input type="file" id="importa-dds-file" style="display: none;" accept=".json" onchange="window.importaDDS(event)">
            </div>
            
            <hr style="border:0; border-top:1px solid var(--border-color); margin: 5px 0;">
            <div id="dds-list"></div>
        </div>
    </div>
</div>

<div id="modal-aggiungi-dds" class="modal-overlay" style="z-index: 7500;">
    <div class="modal-content" style="max-width:380px;">
        <i class="fa-solid fa-xmark" style="position: absolute; right: 24px; top: 24px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.chiudiModaleAggiungiDDS()"></i>
        <h3 style="margin-top: 0; margin-bottom: 24px; color: var(--text-main); text-align: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; font-weight: 800;"><i class="fa-solid fa-folder-plus" style="color:var(--primary);"></i> Nuova DDS</h3>
        
        <label class="editor-label">TITOLO</label>
        <input type="text" id="dds-titolo" class="input-field" placeholder="Inserisci il titolo della DDS...">

        <label class="editor-label">GIORNI DI VALIDITÀ</label>
        <div style="position: relative; margin-bottom: 16px;">
            <i class="fa-regular fa-calendar" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); z-index: 5;"></i>
            <input type="text" id="dds-date-picker" class="input-field" style="padding-left: 42px !important; margin-bottom:0;" placeholder="Seleziona le date..." readonly>
        </div>

        <label class="editor-label">FILE PDF</label>
        <input type="file" id="dds-file" class="input-field" accept="application/pdf" style="padding: 10px; background: var(--surface-hover);">

        <label class="editor-label">AVVISI SUL CALENDARIO (All'avvio):</label>
        <div style="display: flex; flex-direction: column; gap: 12px; background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom:16px;">
            <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: var(--text-main); cursor: pointer;"><input type="checkbox" value="day_before" class="rem-checkbox" style="width:18px; height:18px; accent-color:var(--primary);"> Il giorno prima</label>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: var(--text-main); cursor: pointer;"><input type="checkbox" value="first_day" class="rem-checkbox" style="width:18px; height:18px; accent-color:var(--primary);"> Il primo giorno</label>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: var(--text-main); cursor: pointer;"><input type="checkbox" value="all_days" class="rem-checkbox" checked style="width:18px; height:18px; accent-color:var(--primary);"> Tutti i giorni</label>
        </div>

        <div id="dds-time-picker-group" style="display: none; flex-direction:column; background: var(--surface-hover); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom:16px;">
            <label style="color: var(--primary); font-size:12px; font-weight:700;"><i class="fa-solid fa-bell"></i> ORARIO NOTIFICA PUSH APP</label>
            <input type="time" id="dds-orario" style="background: var(--surface); border: 2px solid var(--border-color); border-radius: 10px; padding: 12px; font-size: 15px; width: 100%; box-sizing: border-box; font-family: inherit; color: var(--text-main); margin-top:8px;">
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px; font-weight: 500;">Seleziona orario per ricevere notifica push.</div>
        </div>

        <div style="background: var(--danger-light); padding: 16px; border-radius: var(--radius-md); border: 1px dashed var(--danger-border); margin-bottom: 20px;">
            <label style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: var(--danger); cursor: pointer; font-size:14px;">
                <input type="checkbox" id="banner-attiva" style="accent-color: var(--danger); width:18px; height:18px;"> Mostra banner in Home Page
            </label>
            <div style="font-size: 12px; color: var(--text-main); margin-top: 8px;">Se attivo, vedrai un avviso rosso nella Home Page per tutta la durata.</div>
        </div>

        <button id="btn-salva-dds" class="btn-action btn-success" style="margin-top:0;" onclick="window.salvaDDS()"><i class="fa-solid fa-floppy-disk"></i> Salva DDS</button>
        <button class="btn-outline" style="width:100%; justify-content:center; margin-top:10px;" onclick="window.chiudiModaleAggiungiDDS()">Annulla</button>
    </div>
</div>
`;

export function avviaMotoreDDS(db, auth) {
    globalDb = db;
    globalAuth = auth;

    if (!document.getElementById('modal-dds-main')) {
        document.body.insertAdjacentHTML('beforeend', ddsHTML);
    }
    
    document.getElementById('modal-dds-main').style.display = 'flex';

    if (!localDb) {
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
            console.error("Errore IndexedDB per DDS", event);
        };
    } else {
        window.caricaListaDDS(); 
    }
}

window.apriModaleDDS = (db, auth) => avviaMotoreDDS(db, auth);

window.apriModaleAggiungiDDS = () => {
    document.getElementById('dds-titolo').value = '';
    document.getElementById('dds-file').value = '';
    document.getElementById('banner-attiva').checked = false;
    document.getElementById('dds-orario').value = '';

    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    const isWeb = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    
    if (isNative || isWeb) {
        document.getElementById('dds-time-picker-group').style.display = 'flex';
    } else {
        document.getElementById('dds-time-picker-group').style.display = 'none';
    }
    
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
                btnContainer.style.padding = "12px"; btnContainer.style.borderTop = "1px solid var(--border-color)"; btnContainer.style.backgroundColor = "var(--surface)";
                const btn = document.createElement("button");
                btn.innerHTML = "<i class='fa-solid fa-check'></i> Fatto";
                btn.style.backgroundColor = "var(--primary)"; btn.style.color = "white"; btn.style.border = "none"; btn.style.padding = "12px"; btn.style.borderRadius = "10px"; btn.style.fontWeight = "bold"; btn.style.cursor = "pointer"; btn.style.width = "100%"; btn.style.fontSize = "15px";
                btn.onclick = function() { instance.close(); };
                btnContainer.appendChild(btn); instance.calendarContainer.appendChild(btnContainer);
            }
        });
    }
    fpInstance.clear();
    document.querySelectorAll('.rem-checkbox').forEach(cb => cb.checked = (cb.value === 'all_days'));
    document.getElementById('modal-aggiungi-dds').style.display = 'flex';
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

    if (!titolo || selectedDates.length === 0 || fileInput.files.length === 0) { return alert("Compila Titolo, seleziona date e scegli un File PDF."); }

    const file = fileInput.files[0];
    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio..."; btn.disabled = true;

    const reader = new FileReader();
    reader.onload = function(e) {
        const nuovaDDS = { titolo: titolo, dateValidita: selectedDates, reminder: selectedReminders, fileData: e.target.result, fileName: file.name };
        const tx = localDb.transaction(storeName, "readwrite");
        const reqAdd = tx.objectStore(storeName).add(nuovaDDS);

        reqAdd.onsuccess = async function() {
            const bannerAttiva = document.getElementById('banner-attiva').checked;
            const orarioPush = document.getElementById('dds-orario').value;
            const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
            const isWeb = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

            if (globalAuth && globalAuth.currentUser && (bannerAttiva || (orarioPush && (isNative || isWeb)))) {
                try {
                    const noteRef = doc(collection(globalDb, "utenti", globalAuth.currentUser.uid, "notifiche_programmate"));
                    let payloadProgrammata = { titolo: "DDS: " + titolo, date: selectedDates, tipo: bannerAttiva ? "DDS_BANNER" : "DDS_PUSH", timestamp_creazione: Date.now() };
                    if (orarioPush) { payloadProgrammata.orario = orarioPush; }
                    await setDoc(noteRef, payloadProgrammata);
                } catch(err) { console.error("Errore salvataggio programmazione:", err); }
            }

            alert("✅ DDS salvata con successo!");
            window.chiudiModaleAggiungiDDS();
            window.caricaListaDDS();
            btn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salva DDS"; btn.disabled = false;
        };
    };
    reader.readAsDataURL(file);
};

window.caricaListaDDS = function() {
    if (!localDb) return;
    const listContainer = document.getElementById('dds-list');
    if (!listContainer) return; 
    
    listContainer.innerHTML = '';
    const tx = localDb.transaction(storeName, "readonly");
    const reqGetAll = tx.objectStore(storeName).getAll();

    reqGetAll.onsuccess = function() {
        let ddsArray = reqGetAll.result.filter(dds => !dds.isPromemoria);
        ddsArray.sort((a, b) => new Date(b.dateValidita[0]) - new Date(a.dateValidita[0]));

        if (ddsArray.length === 0) { listContainer.innerHTML = '<div class="dds-empty-state"><i class="fa-solid fa-folder-open" style="font-size:32px; color:var(--border-color); display:block; margin-bottom:10px;"></i> Nessuna DDS archiviata.</div>'; return; }

        ddsArray.forEach(dds => {
            const card = document.createElement('div'); card.className = 'dds-card';
            card.innerHTML = `
                <div class="dds-title"><i class="fa-solid fa-file-pdf" style="color:var(--danger);"></i> ${dds.titolo}</div>
                <div class="dds-date"><i class="fa-regular fa-calendar-check"></i> Validità: ${dds.dateValidita.length} giorni</div>
                <div class="dds-btn-group">
                    <button class="btn-dds-open" onclick="window.apriPDF_DDS(${dds.id})"><i class="fa-solid fa-eye"></i> Apri PDF</button>
                    <button class="btn-dds-delete" onclick="window.eliminaDDS(${dds.id})"><i class="fa-solid fa-trash-can"></i> Elimina</button>
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
            const a = document.createElement('a'); a.href = dds.fileData; a.target = "_blank";
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
    };
};

window.eliminaDDS = (id) => { 
    if (!localDb) return;
    if (confirm("Sei sicuro di voler eliminare questa DDS?")) { localDb.transaction(storeName, "readwrite").objectStore(storeName).delete(id).onsuccess = window.caricaListaDDS; } 
};

window.esportaDDS = () => {
    if (!localDb) return;
    localDb.transaction(storeName, "readonly").objectStore(storeName).getAll().onsuccess = function(e) {
        const blob = new Blob([JSON.stringify(e.target.result)], { type: "application/json" });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `backup_dds_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };
};

window.importaDDS = (event) => {
    if (!localDb) return;
    const file = event.target.files[0]; if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const tx = localDb.transaction(storeName, "readwrite");
            data.forEach(item => { delete item.id; tx.objectStore(storeName).add(item); });
            tx.oncomplete = () => { alert("Backup importato con successo!"); window.caricaListaDDS(); };
        } catch(error) { alert("Errore importazione. File non valido."); }
    };
    reader.readAsText(file);
    event.target.value = '';
};
