import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { app } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"; // Assicurati di passare il db da vademecum.js

let dbScheda;
let schedaAttivaId = null;
let isEditMode = false;

// Configurazione GitHub
const GH_OWNER = "TUO_USERNAME"; // Sostituisci con il tuo username
const GH_REPO = "TUO_REPO";      // Sostituisci con il tuo repository

export function inizializzaScheda(containerId, idScheda, database, isAdminOrCollab) {
    dbScheda = database;
    schedaAttivaId = idScheda;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Struttura Base della Scheda
    container.innerHTML = `
        <div id="scheda-toolbar" style="display:none; gap: 8px; margin-bottom: 15px; background: var(--surface); padding: 10px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            <button class="icon-btn" onclick="document.execCommand('bold', false, null)" title="Grassetto"><i class="fa-solid fa-bold"></i></button>
            <button class="icon-btn" onclick="document.execCommand('formatBlock', false, 'H3')" title="Titolo"><i class="fa-solid fa-heading"></i></button>
            <button class="icon-btn" onclick="document.execCommand('insertUnorderedList', false, null)" title="Elenco Puntato"><i class="fa-solid fa-list-ul"></i></button>
            <div style="flex: 1;"></div>
            <button class="icon-btn" style="color: var(--success);" onclick="document.getElementById('upload-media-scheda').click()" title="Aggiungi Immagine">
                <i class="fa-regular fa-image"></i>
            </button>
            <input type="file" id="upload-media-scheda" accept="image/*, video/*" style="display:none;" onchange="window.Scheda.gestisciUploadMedia(event)">
        </div>

        <div id="scheda-contenuto" class="scheda-content-box" style="background: var(--surface); padding: 20px; border-radius: 14px; min-height: 200px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); font-size: 15px; line-height: 1.6;">
            <div style="text-align:center; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>
        </div>

        <div id="scheda-media-gallery" style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <!-- Qui verranno caricate le immagini della scheda -->
        </div>

        <div id="scheda-admin-actions" style="display:none; margin-top: 20px; gap: 10px;">
            <button id="btn-edit-scheda" class="btn-action" style="background: var(--primary); flex: 1;" onclick="window.Scheda.attivaEditor()"><i class="fa-solid fa-pen"></i> Modifica Scheda</button>
            <button id="btn-salva-scheda" class="btn-action" style="background: var(--success); flex: 1; display:none;" onclick="window.Scheda.salvaScheda()"><i class="fa-solid fa-floppy-disk"></i> Salva</button>
        </div>
    `;

    // Esposizione funzioni su Window per l'HTML interno
    window.Scheda = { attivaEditor, salvaScheda, gestisciUploadMedia, eliminaMedia };

    if (isAdminOrCollab) {
        document.getElementById('scheda-admin-actions').style.display = 'flex';
    }

    caricaDatiScheda(idScheda);
}

// --- CARICAMENTO DATI ---
async function caricaDatiScheda(id) {
    try {
        const snap = await getDoc(doc(dbScheda, "vademecum_schede", id));
        const contenutoDiv = document.getElementById('scheda-contenuto');
        
        if (snap.exists()) {
            const data = snap.data();
            contenutoDiv.innerHTML = data.testo_html || "<p>Nessun testo presente.</p>";
            renderizzaGalleria(data.media || []);
        } else {
            contenutoDiv.innerHTML = "<p>Scheda vuota. Premi Modifica per aggiungere contenuto.</p>";
            renderizzaGalleria([]);
        }
    } catch(e) {
        document.getElementById('scheda-contenuto').innerHTML = "<p style='color:var(--danger);'>Errore di caricamento.</p>";
    }
}

// --- GESTIONE EDITOR ---
function attivaEditor() {
    isEditMode = true;
    const contenutoDiv = document.getElementById('scheda-contenuto');
    
    // Rende il div un editor di testo
    contenutoDiv.contentEditable = "true";
    contenutoDiv.style.border = "2px dashed var(--primary)";
    contenutoDiv.focus();

    // Mostra la barra degli strumenti e il tasto Salva
    document.getElementById('scheda-toolbar').style.display = 'flex';
    document.getElementById('btn-edit-scheda').style.display = 'none';
    document.getElementById('btn-salva-scheda').style.display = 'flex';
    
    // Mostra i tastini per eliminare le immagini
    document.querySelectorAll('.btn-delete-media').forEach(btn => btn.style.display = 'flex');
}

async function salvaScheda() {
    const contenutoDiv = document.getElementById('scheda-contenuto');
    const testoHTML = contenutoDiv.innerHTML;
    
    try {
        // Salva il testo su Firebase
        await setDoc(doc(dbScheda, "vademecum_schede", schedaAttivaId), { testo_html: testoHTML }, { merge: true });
        
        // Disattiva la modalità editor
        isEditMode = false;
        contenutoDiv.contentEditable = "false";
        contenutoDiv.style.border = "1px solid var(--border-color)";
        
        document.getElementById('scheda-toolbar').style.display = 'none';
        document.getElementById('btn-edit-scheda').style.display = 'flex';
        document.getElementById('btn-salva-scheda').style.display = 'none';
        document.querySelectorAll('.btn-delete-media').forEach(btn => btn.style.display = 'none');
        
        alert("Scheda salvata con successo!");
    } catch(e) {
        alert("Errore durante il salvataggio.");
    }
}

// --- GESTIONE MULTIMEDIA (GITHUB) ---
async function gestisciUploadMedia(event) {
    const file = event.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('gh_admin_token');
    if (!token) { alert("Token GitHub mancante nel profilo."); return; }

    const extension = file.name.split('.').pop().toLowerCase();
    const newFilename = `${schedaAttivaId}_${new Date().getTime()}.${extension}`;
    const githubPath = `assets/media_vademecum/${newFilename}`;

    // Mostra indicatore di caricamento
    const btnSalva = document.getElementById('btn-salva-scheda');
    const txtOriginale = btnSalva.innerHTML;
    btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Upload...`;
    btnSalva.disabled = true;

    try {
        // Converte in Base64
        const base64Data = await getBase64(file);
        const base64Content = base64Data.split(',')[1];

        // Carica su GitHub
        const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${githubPath}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Aggiunto media a scheda ${schedaAttivaId}`, content: base64Content })
        });

        if (!res.ok) throw new Error("Errore upload GitHub");

        // Aggiorna array media su Firebase
        const snap = await getDoc(doc(dbScheda, "vademecum_schede", schedaAttivaId));
        let mediaArray = snap.exists() ? (snap.data().media || []) : [];
        mediaArray.push(githubPath);
        
        await setDoc(doc(dbScheda, "vademecum_schede", schedaAttivaId), { media: mediaArray }, { merge: true });
        
        // Ridisegna Galleria
        renderizzaGalleria(mediaArray);

    } catch (e) {
        alert("Errore caricamento immagine.");
        console.error(e);
    } finally {
        btnSalva.innerHTML = txtOriginale;
        btnSalva.disabled = false;
        event.target.value = ""; // Resetta l'input
    }
}

function renderizzaGalleria(mediaArray) {
    const gallery = document.getElementById('scheda-media-gallery');
    gallery.innerHTML = '';

    mediaArray.forEach((path, index) => {
        // Percorso per caricare l'immagine cruda dal branch main di github (usando raw.githubusercontent)
        const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${path}`;
        
        const mediaDiv = document.createElement('div');
        mediaDiv.style = "position: relative; border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-sm);";
        mediaDiv.innerHTML = `
            <img src="${rawUrl}" style="width: 100%; height: 150px; object-fit: cover; display: block;" onclick="window.open('${rawUrl}', '_blank')">
            <button class="btn-delete-media icon-btn" style="display: ${isEditMode ? 'flex' : 'none'}; position: absolute; top: 5px; right: 5px; background: var(--danger); color: white; width: 30px; height: 30px; border-radius: 50%; justify-content: center; align-items: center;" onclick="window.Scheda.eliminaMedia('${path}')">
                <i class="fa-solid fa-trash" style="font-size: 12px;"></i>
            </button>
        `;
        gallery.appendChild(mediaDiv);
    });
}

async function eliminaMedia(path) {
    if(!confirm("Vuoi rimuovere questa immagine dalla scheda? (Rimarrà su GitHub)")) return;
    
    try {
        const snap = await getDoc(doc(dbScheda, "vademecum_schede", schedaAttivaId));
        if(snap.exists()) {
            let mediaArray = snap.data().media || [];
            mediaArray = mediaArray.filter(p => p !== path);
            await setDoc(doc(dbScheda, "vademecum_schede", schedaAttivaId), { media: mediaArray }, { merge: true });
            renderizzaGalleria(mediaArray);
        }
    } catch(e) { alert("Errore durante l'eliminazione."); }
}

// Utility Base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
