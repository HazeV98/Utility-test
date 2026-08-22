const GH_OWNER = "HazeV98"; 
const GH_REPO = "Utility";

let schedaAttivaId = null;
let isEditMode = false;
let datiSchedaCache = { testo_html: "", media: [] };
let fileShaAttuale = null;
let mappaFileGlobale = null; // Cache locale della mappa

export function inizializzaScheda(containerId, idScheda, databaseFirebaseIgnorato, isAdminOrCollab) {
    schedaAttivaId = idScheda;
    const container = document.getElementById(containerId);
    if (!container) return;

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
            <div style="text-align:center; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Sincronizzazione Mappa e Dati...</div>
        </div>

        <div id="scheda-media-gallery" style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"></div>

        <div id="scheda-admin-actions" style="display:none; margin-top: 20px; gap: 10px;">
            <button id="btn-edit-scheda" class="btn-action" style="background: var(--primary); flex: 1;" onclick="window.Scheda.attivaEditor()"><i class="fa-solid fa-pen"></i> Modifica Scheda</button>
            <button id="btn-salva-scheda" class="btn-action" style="background: var(--success); flex: 1; display:none;" onclick="window.Scheda.salvaSchedaSuGitHub()"><i class="fa-solid fa-floppy-disk"></i> Salva</button>
        </div>
    `;

    window.Scheda = { attivaEditor, salvaSchedaSuGitHub, gestisciUploadMedia, eliminaMedia };

    if (isAdminOrCollab) {
        document.getElementById('scheda-admin-actions').style.display = 'flex';
    }

    avviaLetturaConMappa(idScheda);
}

// ==========================================
// 1. LETTURA ATTRAVERSO LA MAPPA
// ==========================================

async function avviaLetturaConMappa(id) {
    const token = localStorage.getItem('gh_admin_token');
    const pathSchedaTarget = `assets/schede/${id}.json`;
    const contenutoDiv = document.getElementById('scheda-contenuto');

    try {
        // Scarichiamo la mappa globale per verificare l'esistenza dei file
        const urlMappa = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/mappa_file.json?t=${Date.now()}`;
        const headers = token ? { 'Authorization': `token ${token}` } : {};
        
        const responseMappa = await fetch(urlMappa, { headers });
        if (responseMappa.ok) {
            const dataMappa = await responseMappa.json();
            mappaFileGlobale = JSON.parse(decodeURIComponent(escape(atob(dataMappa.content))));
        }

        // Verifichiamo se il file della scheda esiste nell'albero della mappa
        const fileEsiste = mappaFileGlobale && mappaFileGlobale.albero && mappaFileGlobale.albero.includes(pathSchedaTarget);

        if (fileEsiste) {
            // Se esiste nella mappa, procediamo a scaricare il contenuto
            const responseFile = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${pathSchedaTarget}?t=${Date.now()}`, { headers });
            if (responseFile.ok) {
                const fileData = await responseFile.json();
                fileShaAttuale = fileData.sha; 
                
                const jsonStr = decodeURIComponent(escape(atob(fileData.content)));
                datiSchedaCache = JSON.parse(jsonStr);
                
                contenutoDiv.innerHTML = datiSchedaCache.testo_html || "<p>Scrivi qui le istruzioni...</p>";
                renderizzaGalleria(datiSchedaCache.media || []);
            }
        } else {
            // Non è presente nella mappa, quindi è una scheda vergine
            fileShaAttuale = null;
            datiSchedaCache = { testo_html: "<p>Nuova scheda operativa. Premi Modifica per iniziare.</p>", media: [] };
            contenutoDiv.innerHTML = datiSchedaCache.testo_html;
            renderizzaGalleria([]);
        }

    } catch (e) {
        console.error("Errore lettura con mappa:", e);
        contenutoDiv.innerHTML = "<p style='color:var(--danger);'>Errore di sincronizzazione con GitHub.</p>";
    }
}

// ==========================================
// 2. AGGIORNAMENTO DELLA MAPPA (STILE ADMIN)
// ==========================================

async function rigeneraMappaGlobale(token) {
    try {
        let listaRotazioni = [];
        try {
            const urlRot = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/rotazioni`;
            const resRot = await fetch(urlRot, { headers: { "Authorization": `token ${token}` } });
            if (resRot.ok) {
                const filesRot = await resRot.json();
                listaRotazioni = filesRot.filter(f => f.type === "file").map(f => f.name);
            }
        } catch(e) {}

        let alberoCompleto = [];
        try {
            const resRepo = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`, { headers: { "Authorization": `token ${token}` } });
            if (resRepo.ok) {
                const repoData = await resRepo.json();
                const urlTree = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/git/trees/${repoData.default_branch}?recursive=1`;
                const resTree = await fetch(urlTree, { headers: { "Authorization": `token ${token}` } });
                if (resTree.ok) {
                    const treeData = await resTree.json();
                    alberoCompleto = treeData.tree.map(f => f.path);
                }
            }
        } catch(e) {}

        const mappaGlobale = { rotazioni: listaRotazioni, albero: alberoCompleto };
        const urlMappa = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/mappa_file.json`;
        
        let shaMappa = null;
        try {
            const rM = await fetch(urlMappa, { headers: { "Authorization": `token ${token}` } });
            if (rM.ok) { const dM = await rM.json(); shaMappa = dM.sha; }
        } catch(e) {}

        await fetch(urlMappa, {
            method: "PUT",
            headers: { "Authorization": `token ${token}` },
            body: JSON.stringify({
                message: "Update mappa globale per indicizzazione Vademecum",
                content: btoa(unescape(encodeURIComponent(JSON.stringify(mappaGlobale)))),
                sha: shaMappa
            })
        });
        
        // Aggiorna la cache locale
        mappaFileGlobale = mappaGlobale;

    } catch (e) { console.error("Errore rigenerazione mappa globale:", e); }
}

// ==========================================
// 3. EDITOR E SALVATAGGIO
// ==========================================

function attivaEditor() {
    isEditMode = true;
    const contenutoDiv = document.getElementById('scheda-contenuto');
    
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
        
        const jsonString = JSON.stringify(datiSchedaCache, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

        const payload = {
            message: `Aggiornata scheda: ${schedaAttivaId}`,
            content: base64Content
        };
        if (fileShaAttuale) payload.sha = fileShaAttuale;

        const res = await fetch(urlAPI, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Errore salvataggio JSON su GitHub");
        
        const responseData = await res.json();
        fileShaAttuale = responseData.content.sha; 

        // Ricalcola la mappa globale solo se abbiamo creato un nuovo file
        if (!mappaFileGlobale || !mappaFileGlobale.albero || !mappaFileGlobale.albero.includes(`assets/schede/${schedaAttivaId}.json`)) {
            btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Indice...`;
            await rigeneraMappaGlobale(token);
        }

        isEditMode = false;
        contenutoDiv.contentEditable = "false";
        contenutoDiv.style.border = "1px solid var(--border-color)";
        
        document.getElementById('scheda-toolbar').style.display = 'none';
        document.getElementById('btn-edit-scheda').style.display = 'flex';
        document.getElementById('btn-salva-scheda').style.display = 'none';
        document.querySelectorAll('.btn-delete-media').forEach(btn => btn.style.display = 'none');
        
    } catch(e) {
        alert("Errore durante il salvataggio.");
        console.error(e);
    } finally {
        btnSalva.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salva`;
        btnSalva.disabled = false;
    }
}

// ==========================================
// 4. UPLOAD MULTIMEDIA
// ==========================================

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

        // Aggiorniamo la mappa globale dopo il caricamento della foto
        btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sincronizzazione...`;
        await rigeneraMappaGlobale(token);

        if (!datiSchedaCache.media) datiSchedaCache.media = [];
        datiSchedaCache.media.push(githubPath);
        
        await salvaSchedaSuGitHub(); 
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
            <img src="${rawUrl}" style="width: 100%; height: 150px; object-fit: cover; display: block; cursor: pointer;" onclick="window.open('${rawUrl}', '_blank')">
            <button class="btn-delete-media icon-btn" style="display: ${isEditMode ? 'flex' : 'none'}; position: absolute; top: 5px; right: 5px; background: var(--danger); color: white; width: 30px; height: 30px; border-radius: 50%; justify-content: center; align-items: center;" onclick="window.Scheda.eliminaMedia('${path}')">
                <i class="fa-solid fa-trash" style="font-size: 12px;"></i>
            </button>
        `;
        gallery.appendChild(mediaDiv);
    });
}

async function eliminaMedia(path) {
    if(!confirm("Vuoi scollegare questa immagine dalla scheda?")) return;
    datiSchedaCache.media = datiSchedaCache.media.filter(p => p !== path);
    await salvaSchedaSuGitHub();
    renderizzaGalleria(datiSchedaCache.media);
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
