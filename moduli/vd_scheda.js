// Non serve più importare Firebase per salvare il testo!
const GH_OWNER = "HazeV98"; // Preso in automatico dal tuo link
const GH_REPO = "Utility";

let schedaAttivaId = null;
let isEditMode = false;
let datiSchedaCache = { testo_html: "", media: [] };
let fileShaAttuale = null; // Serve per dire a GitHub quale versione stiamo sovrascrivendo

export function inizializzaScheda(containerId, idScheda, databaseFirebaseIgnorato, isAdminOrCollab) {
    schedaAttivaId = idScheda;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Struttura Base della Scheda (con l'editor integrato)
    container.innerHTML = `
        <div id="scheda-toolbar" style="display:none; gap: 8px; margin-bottom: 15px; background: var(--surface); padding: 10px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); overflow-x: auto;">
            <button class="icon-btn" onclick="document.execCommand('bold', false, null)" title="Grassetto"><i class="fa-solid fa-bold"></i></button>
            <button class="icon-btn" onclick="document.execCommand('formatBlock', false, 'H3')" title="Titolo"><i class="fa-solid fa-heading"></i></button>
            <button class="icon-btn" onclick="document.execCommand('insertUnorderedList', false, null)" title="Elenco Puntato"><i class="fa-solid fa-list-ul"></i></button>
            <button class="icon-btn" onclick="document.execCommand('undo', false, null)" title="Annulla"><i class="fa-solid fa-rotate-left"></i></button>
            <div style="flex: 1;"></div>
            <button class="icon-btn" style="color: var(--success);" onclick="document.getElementById('upload-media-scheda').click()" title="Aggiungi Immagine">
                <i class="fa-regular fa-image"></i>
            </button>
            <input type="file" id="upload-media-scheda" accept="image/*" style="display:none;" onchange="window.Scheda.gestisciUploadMedia(event)">
        </div>

        <div id="scheda-contenuto" class="scheda-content-box" style="background: var(--surface); padding: 20px; border-radius: 14px; min-height: 200px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); font-size: 15px; line-height: 1.6;">
            <div style="text-align:center; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento in corso...</div>
        </div>

        <div id="scheda-media-gallery" style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <!-- Galleria -->
        </div>

        <div id="scheda-admin-actions" style="display:none; margin-top: 20px; gap: 10px;">
            <button id="btn-edit-scheda" class="btn-action" style="background: var(--primary); flex: 1;" onclick="window.Scheda.attivaEditor()"><i class="fa-solid fa-pen"></i> Modifica Scheda</button>
            <button id="btn-salva-scheda" class="btn-action" style="background: var(--success); flex: 1; display:none;" onclick="window.Scheda.salvaSchedaSuGitHub()"><i class="fa-solid fa-floppy-disk"></i> Salva</button>
        </div>
    `;

    window.Scheda = { attivaEditor, salvaSchedaSuGitHub, gestisciUploadMedia, eliminaMedia };

    if (isAdminOrCollab) {
        document.getElementById('scheda-admin-actions').style.display = 'flex';
    }

    caricaDatiDaGitHub(idScheda);
}

// --- CARICAMENTO DA GITHUB ---
async function caricaDatiDaGitHub(id) {
    const token = localStorage.getItem('gh_admin_token');
    const urlAPI = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/schede/${id}.json?t=${Date.now()}`;
    const contenutoDiv = document.getElementById('scheda-contenuto');
    
    try {
        // Usiamo l'API di GitHub per bypassare la cache e avere sempre il file fresco
        const headers = token ? { 'Authorization': `token ${token}` } : {};
        const response = await fetch(urlAPI, { headers });

        if (response.ok) {
            const fileData = await response.json();
            fileShaAttuale = fileData.sha; // Salviamo il SHA per poterlo sovrascrivere poi
            
            // Decodifica Base64 sicura per i caratteri speciali/accentati
            const jsonStr = decodeURIComponent(escape(atob(fileData.content)));
            datiSchedaCache = JSON.parse(jsonStr);
            
            contenutoDiv.innerHTML = datiSchedaCache.testo_html || "<p>Scrivi qui le istruzioni...</p>";
            renderizzaGalleria(datiSchedaCache.media || []);
        } else if (response.status === 404) {
            // La scheda è nuova, il file non esiste ancora
            fileShaAttuale = null;
            datiSchedaCache = { testo_html: "<p>Nuova scheda operativa. Premi Modifica per iniziare.</p>", media: [] };
            contenutoDiv.innerHTML = datiSchedaCache.testo_html;
            renderizzaGalleria([]);
        } else {
            throw new Error("Errore API GitHub");
        }
    } catch(e) {
        console.error("Errore caricamento scheda:", e);
        contenutoDiv.innerHTML = "<p style='color:var(--danger);'>Errore di caricamento o limite API raggiunto.</p>";
    }
}

// --- GESTIONE EDITOR ---
function attivaEditor() {
    isEditMode = true;
    const contenutoDiv = document.getElementById('scheda-contenuto');
    
    // Se c'era il testo di default, puliscilo al primo clic
    if(contenutoDiv.innerText.includes("Nuova scheda operativa")) contenutoDiv.innerHTML = "";

    contenutoDiv.contentEditable = "true";
    contenutoDiv.style.border = "2px dashed var(--primary)";
    contenutoDiv.focus();

    document.getElementById('scheda-toolbar').style.display = 'flex';
    document.getElementById('btn-edit-scheda').style.display = 'none';
    document.getElementById('btn-salva-scheda').style.display = 'flex';
    document.querySelectorAll('.btn-delete-media').forEach(btn => btn.style.display = 'flex');
}

async function salvaSchedaSuGitHub() {
    const token = localStorage.getItem('gh_admin_token');
    if (!token) { alert("Manca il token PAT Admin!"); return; }

    const contenutoDiv = document.getElementById('scheda-contenuto');
    datiSchedaCache.testo_html = contenutoDiv.innerHTML;
    
    const btnSalva = document.getElementById('btn-salva-scheda');
    btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...`;
    btnSalva.disabled = true;

    try {
        const urlAPI = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/schede/${schedaAttivaId}.json`;
        
        // Codifica Base64 sicura per caratteri accentati (UTF-8)
        const jsonString = JSON.stringify(datiSchedaCache, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

        const payload = {
            message: `Aggiornata scheda: ${schedaAttivaId}`,
            content: base64Content
        };
        // Se il file esiste già, GitHub richiede il suo SHA per autorizzare la sovrascrittura
        if (fileShaAttuale) payload.sha = fileShaAttuale;

        const res = await fetch(urlAPI, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Errore salvataggio JSON su GitHub");
        
        const responseData = await res.json();
        fileShaAttuale = responseData.content.sha; // Aggiorna il SHA al nuovo file creato

        isEditMode = false;
        contenutoDiv.contentEditable = "false";
        contenutoDiv.style.border = "1px solid var(--border-color)";
        
        document.getElementById('scheda-toolbar').style.display = 'none';
        document.getElementById('btn-edit-scheda').style.display = 'flex';
        document.getElementById('btn-salva-scheda').style.display = 'none';
        document.querySelectorAll('.btn-delete-media').forEach(btn => btn.style.display = 'none');
        
        alert("Scheda salvata con successo!");
    } catch(e) {
        alert("Errore durante il salvataggio. Controlla la console.");
        console.error(e);
    } finally {
        btnSalva.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salva`;
        btnSalva.disabled = false;
    }
}

// --- UPLOAD MULTIMEDIA (FOTO/MEDIA_VADEMECUM) ---
async function gestisciUploadMedia(event) {
    const file = event.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('gh_admin_token');
    if (!token) { alert("Manca il token PAT Admin!"); return; }

    const extension = file.name.split('.').pop().toLowerCase();
    const newFilename = `${schedaAttivaId}_${new Date().getTime()}.${extension}`;
    const githubPath = `assets/media_vademecum/${newFilename}`;

    const btnSalva = document.getElementById('btn-salva-scheda');
    const txtOriginale = btnSalva.innerHTML;
    btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Upload Foto...`;
    btnSalva.disabled = true;

    try {
        const base64Data = await getBase64(file);
        const base64Content = base64Data.split(',')[1];

        const urlAPI = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${githubPath}`;
        const res = await fetch(urlAPI, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Aggiunta foto a ${schedaAttivaId}`, content: base64Content })
        });

        if (!res.ok) throw new Error("Errore upload immagine su GitHub");

        // Aggiunge la foto all'array locale e salva subito il JSON
        if (!datiSchedaCache.media) datiSchedaCache.media = [];
        datiSchedaCache.media.push(githubPath);
        
        await salvaSchedaSuGitHub(); // Salva automaticamente anche la foto appena messa
        renderizzaGalleria(datiSchedaCache.media);

    } catch (e) {
        alert("Errore caricamento immagine.");
        console.error(e);
    } finally {
        btnSalva.innerHTML = txtOriginale;
        btnSalva.disabled = false;
        event.target.value = ""; 
    }
}

function renderizzaGalleria(mediaArray) {
    const gallery = document.getElementById('scheda-media-gallery');
    gallery.innerHTML = '';

    mediaArray.forEach(path => {
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
    if(!confirm("Vuoi scollegare questa immagine dalla scheda?")) return;
    
    // Rimuove la foto dall'array del JSON, ma NON elimina il file fisico su GitHub per sicurezza (si può fare da admin globale)
    datiSchedaCache.media = datiSchedaCache.media.filter(p => p !== path);
    await salvaSchedaSuGitHub();
    renderizzaGalleria(datiSchedaCache.media);
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
