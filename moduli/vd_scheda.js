const GH_OWNER = "HazeV98"; 
const GH_REPO = "Utility-test";

let schedaAttivaId = null;
let isEditMode = false;
let datiSchedaCache = { testo_html: "", media: [] };
let fileShaAttuale = null;
let mappaFileGlobale = null;

export function inizializzaScheda(containerId, idScheda, databaseFirebaseIgnorato, isAdminOrCollab) {
    schedaAttivaId = idScheda;
    const container = document.getElementById(containerId);
    if (!container) return;

    creaViewerSeMancante();

    container.innerHTML = `
        <div id="scheda-toolbar" style="display:none; gap: 8px; margin-bottom: 15px; background: var(--surface); padding: 10px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); overflow-x: auto;">
            <button class="icon-btn" onclick="document.execCommand('bold', false, null)" title="Grassetto"><i class="fa-solid fa-bold"></i></button>
            <button class="icon-btn" onclick="document.execCommand('formatBlock', false, 'H3')" title="Titolo"><i class="fa-solid fa-heading"></i></button>
            <button class="icon-btn" onclick="document.execCommand('insertUnorderedList', false, null)" title="Elenco Puntato"><i class="fa-solid fa-list-ul"></i></button>
            <div style="flex: 1;"></div>
            
            <!-- Tasto Foto/Video -->
            <button class="icon-btn" style="color: var(--success);" onclick="document.getElementById('upload-media-scheda').click()" title="Aggiungi Immagine o Video">
                <i class="fa-solid fa-photo-film"></i>
            </button>
            
            <!-- Tasto PDF -->
            <button class="icon-btn" style="color: var(--danger);" onclick="document.getElementById('upload-pdf-scheda').click()" title="Aggiungi Documento PDF">
                <i class="fa-solid fa-file-pdf"></i>
            </button>
            
            <input type="file" id="upload-media-scheda" accept="image/*, video/*" style="display:none;" onchange="window.Scheda.gestisciUploadMedia(event, 'media')">
            <input type="file" id="upload-pdf-scheda" accept="application/pdf" style="display:none;" onchange="window.Scheda.gestisciUploadMedia(event, 'pdf')">
        </div>

        <div id="scheda-contenuto" class="scheda-content-box" style="background: var(--surface); padding: 20px; border-radius: 14px; min-height: 200px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); font-size: 15px; line-height: 1.6;">
            <div style="text-align:center; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Sincronizzazione Dati...</div>
        </div>

        <div id="scheda-media-gallery" style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"></div>

        <div id="scheda-admin-actions" style="display:none; margin-top: 20px; gap: 10px;">
            <button id="btn-edit-scheda" class="btn-action" style="background: var(--primary); flex: 1;" onclick="window.Scheda.attivaEditor()"><i class="fa-solid fa-pen"></i> Modifica Scheda</button>
            <button id="btn-salva-scheda" class="btn-action" style="background: var(--success); flex: 1; display:none;" onclick="window.Scheda.salvaSchedaSuGitHub()"><i class="fa-solid fa-floppy-disk"></i> Salva</button>
        </div>
    `;

    // Esposizione funzioni per l'HTML
    window.Scheda = { 
        attivaEditor, salvaSchedaSuGitHub, gestisciUploadMedia, 
        eliminaMedia, apriViewer, scaricaFile 
    };

    if (isAdminOrCollab) {
        document.getElementById('scheda-admin-actions').style.display = 'flex';
    }

    avviaLetturaConMappa(idScheda);
}

// ==========================================
// 1. LOGICA TESTO & SMART LINKS
// ==========================================

function formattaTestoLettura(html) {
    if (!html) return "";
    // Regex aggiornata per trovare anche (pdf X)
    return html.replace(/\((immagine|video|pdf)\s+(\d+)\)/gi, (match, tipo, num) => {
        const index = parseInt(num) - 1;
        return `<a href="#" onclick="window.Scheda.apriViewer(${index}); return false;" style="color: var(--primary); font-weight: 700; text-decoration: underline; background: rgba(0,102,204,0.1); padding: 2px 6px; border-radius: 6px;">${match}</a>`;
    });
}

// ==========================================
// 2. LETTURA ATTRAVERSO LA MAPPA
// ==========================================

async function avviaLetturaConMappa(id) {
    const token = localStorage.getItem('gh_admin_token');
    const pathSchedaTarget = `assets/schede/${id}.json`;
    const contenutoDiv = document.getElementById('scheda-contenuto');

    try {
        const urlMappa = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/mappa_file.json?t=${Date.now()}`;
        const headers = token ? { 'Authorization': `token ${token}` } : {};
        
        const responseMappa = await fetch(urlMappa, { headers });
        if (responseMappa.ok) {
            const dataMappa = await responseMappa.json();
            mappaFileGlobale = JSON.parse(decodeURIComponent(escape(atob(dataMappa.content))));
        }

        const fileEsiste = mappaFileGlobale && mappaFileGlobale.albero && mappaFileGlobale.albero.includes(pathSchedaTarget);

        if (fileEsiste) {
            const responseFile = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${pathSchedaTarget}?t=${Date.now()}`, { headers });
            if (responseFile.ok) {
                const fileData = await responseFile.json();
                fileShaAttuale = fileData.sha; 
                
                const jsonStr = decodeURIComponent(escape(atob(fileData.content)));
                datiSchedaCache = JSON.parse(jsonStr);
                
                contenutoDiv.innerHTML = formattaTestoLettura(datiSchedaCache.testo_html) || "<p>Scrivi qui le istruzioni...</p>";
                renderizzaGalleria(datiSchedaCache.media || []);
            }
        } else {
            fileShaAttuale = null;
            datiSchedaCache = { testo_html: "<p>Nuova scheda operativa. Premi Modifica per iniziare.</p>", media: [] };
            contenutoDiv.innerHTML = datiSchedaCache.testo_html;
            renderizzaGalleria([]);
        }
    } catch (e) {
        console.error(e);
        contenutoDiv.innerHTML = "<p style='color:var(--danger);'>Errore di sincronizzazione con GitHub.</p>";
    }
}

// ==========================================
// 3. AGGIORNAMENTO DELLA MAPPA E SALVATAGGIO
// ==========================================

async function rigeneraMappaGlobale(token) {
    try {
        let listaRotazioni = [];
        try {
            const resRot = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/rotazioni`, { headers: { "Authorization": `token ${token}` } });
            if (resRot.ok) listaRotazioni = (await resRot.json()).filter(f => f.type === "file").map(f => f.name);
        } catch(e) {}

        let alberoCompleto = [];
        try {
            const resRepo = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`, { headers: { "Authorization": `token ${token}` } });
            if (resRepo.ok) {
                const repoData = await resRepo.json();
                const resTree = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/git/trees/${repoData.default_branch}?recursive=1`, { headers: { "Authorization": `token ${token}` } });
                if (resTree.ok) alberoCompleto = (await resTree.json()).tree.map(f => f.path);
            }
        } catch(e) {}

        const mappaGlobale = { rotazioni: listaRotazioni, albero: alberoCompleto };
        const urlMappa = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/mappa_file.json`;
        
        let shaMappa = null;
        try {
            const rM = await fetch(urlMappa, { headers: { "Authorization": `token ${token}` } });
            if (rM.ok) shaMappa = (await rM.json()).sha;
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
        
        mappaFileGlobale = mappaGlobale;
    } catch (e) {}
}

function attivaEditor() {
    isEditMode = true;
    const contenutoDiv = document.getElementById('scheda-contenuto');
    
    contenutoDiv.innerHTML = datiSchedaCache.testo_html;
    if(contenutoDiv.innerText.includes("Nuova scheda operativa")) contenutoDiv.innerHTML = "";

    contenutoDiv.contentEditable = "true";
    contenutoDiv.style.border = "2px dashed var(--primary)";
    contenutoDiv.focus();

    document.getElementById('scheda-toolbar').style.display = 'flex';
    document.getElementById('btn-edit-scheda').style.display = 'none';
    document.getElementById('btn-salva-scheda').style.display = 'flex';
    document.querySelectorAll('.btn-delete-media').forEach(btn => btn.style.display = 'flex');
    document.querySelectorAll('.btn-download-media').forEach(btn => btn.style.display = 'none'); // Nasconde download in edit
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

        const payload = { message: `Aggiornata scheda: ${schedaAttivaId}`, content: base64Content };
        if (fileShaAttuale) payload.sha = fileShaAttuale;

        const res = await fetch(urlAPI, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Errore salvataggio JSON");
        fileShaAttuale = (await res.json()).content.sha; 

        if (!mappaFileGlobale || !mappaFileGlobale.albero || !mappaFileGlobale.albero.includes(`assets/schede/${schedaAttivaId}.json`)) {
            btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Indice...`;
            await rigeneraMappaGlobale(token);
        }

        isEditMode = false;
        contenutoDiv.contentEditable = "false";
        contenutoDiv.style.border = "1px solid var(--border-color)";
        contenutoDiv.innerHTML = formattaTestoLettura(datiSchedaCache.testo_html);
        
        document.getElementById('scheda-toolbar').style.display = 'none';
        document.getElementById('btn-edit-scheda').style.display = 'flex';
        document.getElementById('btn-salva-scheda').style.display = 'none';
        
        renderizzaGalleria(datiSchedaCache.media); // Ridisegna per sistemare i tasti
    } catch(e) {
        alert("Errore durante il salvataggio.");
    } finally {
        btnSalva.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salva`;
        btnSalva.disabled = false;
    }
}

// ==========================================
// 4. UPLOAD MULTIMEDIA E GALLERIA
// ==========================================

async function gestisciUploadMedia(event, cartellaTarget) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
        alert("File troppo grande. Il limite massimo per caricamenti diretti è 25MB.");
        event.target.value = ""; return;
    }

    const token = localStorage.getItem('gh_admin_token');
    if (!token) return alert("Manca il token PAT Admin!");

    const extension = file.name.split('.').pop().toLowerCase();
    const newFilename = `${schedaAttivaId}_${new Date().getTime()}.${extension}`;
    
    // Indirizzamento cartella in base al tipo di file
    const subfolder = cartellaTarget === 'pdf' ? 'pdf_vademecum' : 'media_vademecum';
    const githubPath = `assets/${subfolder}/${newFilename}`;

    const btnSalva = document.getElementById('btn-salva-scheda');
    const txtOriginale = btnSalva.innerHTML;
    btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Upload...`;
    btnSalva.disabled = true;

    try {
        const base64Data = await getBase64(file);
        const base64Content = base64Data.split(',')[1];

        const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${githubPath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Media aggiunto a ${schedaAttivaId}`, content: base64Content })
        });

        if (!res.ok) throw new Error("Errore upload GitHub");

        btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Indice...`;
        await rigeneraMappaGlobale(token);

        if (!datiSchedaCache.media) datiSchedaCache.media = [];
        datiSchedaCache.media.push(githubPath);
        
        await salvaSchedaSuGitHub(); 
        renderizzaGalleria(datiSchedaCache.media);

    } catch (e) {
        alert("Errore caricamento media.");
    } finally {
        btnSalva.innerHTML = txtOriginale;
        btnSalva.disabled = false;
        event.target.value = ""; 
    }
}

function renderizzaGalleria(mediaArray) {
    const gallery = document.getElementById('scheda-media-gallery');
    gallery.innerHTML = '';

    mediaArray.forEach((path, index) => {
        const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${path}`;
        const filename = path.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        
        const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
        const isPdf = ext === 'pdf';
        const numeroVisuale = index + 1;

        const mediaDiv = document.createElement('div');
        mediaDiv.style = "position: relative; border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-sm); background: var(--surface-hover); border: 1px solid var(--border-color); display: flex; flex-direction: column;";
        
        let contenutoMedia = '';
        let tastoDownload = '';
        
        if (isPdf) {
            // Struttura specifica per i PDF
            contenutoMedia = `
                <div style="padding: 20px 10px; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; background: var(--surface);">
                    <i class="fa-solid fa-file-pdf" style="font-size: 34px; color: var(--danger); margin-bottom: 8px;"></i>
                    <span style="font-size: 11px; font-weight: 600; color: var(--text-main); word-break: break-all;">${filename}</span>
                </div>
                <div style="display: flex; border-top: 1px solid var(--border-color); background: var(--surface-hover);">
                    <button style="flex: 1; padding: 10px; background: transparent; border: none; color: var(--primary); font-weight: 600; cursor: pointer; border-right: 1px solid var(--border-color); font-size: 12px;" onclick="window.open('${rawUrl}', '_blank')"><i class="fa-solid fa-arrow-up-right-from-square"></i> Apri</button>
                    <button class="btn-download-media" style="display: ${isEditMode ? 'none' : 'block'}; flex: 1; padding: 10px; background: transparent; border: none; color: var(--success); font-weight: 600; cursor: pointer; font-size: 12px;" onclick="window.Scheda.scaricaFile('${rawUrl}', '${filename}')"><i class="fa-solid fa-download"></i> Scarica</button>
                </div>
            `;
        } else {
            // Struttura per Immagini e Video
            const mediaTag = isVideo 
                ? `<video src="${rawUrl}" style="width: 100%; height: 150px; object-fit: cover; display: block;"></video>
                   <i class="fa-solid fa-play" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white; font-size:30px; text-shadow: 0 2px 4px rgba(0,0,0,0.6); pointer-events:none;"></i>`
                : `<img src="${rawUrl}" style="width: 100%; height: 150px; object-fit: cover; display: block;">`;

            contenutoMedia = `
                <div onclick="window.Scheda.apriViewer(${index})" style="cursor: pointer; flex: 1; position: relative;">
                    ${mediaTag}
                </div>
            `;
            
            tastoDownload = `
                <button class="btn-download-media icon-btn" style="display: ${isEditMode ? 'none' : 'flex'}; position: absolute; top: 5px; right: 5px; background: var(--surface); color: var(--text-main); width: 30px; height: 30px; border-radius: 50%; justify-content: center; align-items: center; border: 2px solid var(--border-color); z-index: 10;" onclick="window.Scheda.scaricaFile('${rawUrl}', '${filename}')" title="Scarica">
                    <i class="fa-solid fa-download" style="font-size: 12px;"></i>
                </button>
            `;
        }

        const tastoElimina = `
            <button class="btn-delete-media icon-btn" style="display: ${isEditMode ? 'flex' : 'none'}; position: absolute; top: 5px; right: 5px; background: var(--danger); color: white; width: 30px; height: 30px; border-radius: 50%; justify-content: center; align-items: center; border: 2px solid white; z-index: 15;" onclick="window.Scheda.eliminaMedia('${path}')" title="Elimina">
                <i class="fa-solid fa-trash" style="font-size: 12px;"></i>
            </button>
        `;

        mediaDiv.innerHTML = `
            <!-- Bollino Numerico -->
            <div style="position: absolute; top: 8px; left: 8px; background: var(--primary); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; z-index: 15; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                ${numeroVisuale}
            </div>
            ${contenutoMedia}
            ${tastoDownload}
            ${tastoElimina}
        `;
        gallery.appendChild(mediaDiv);
    });
}

// 5. FUNZIONE UNIVERSALE PER IL DOWNLOAD
async function scaricaFile(url, filename) {
    try {
        const toast = document.createElement('div');
        toast.innerText = "Preparazione file...";
        toast.style = "position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px; z-index: 3000; font-size: 13px; box-shadow: var(--shadow-sm);";
        document.body.appendChild(toast);
        
        // Fetch bypassa le restrizioni di apertura in altra finestra sui dispositivi mobili forzando il download
        const response = await fetch(url);
        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = urlBlob;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(urlBlob);
        a.remove();
        setTimeout(() => toast.remove(), 2500);
    } catch(e) {
        // Fallback standard se il fetch fallisce
        window.open(url, '_blank');
    }
}

async function eliminaMedia(path) {
    if(!confirm("Attenzione: Vuoi eliminare DEFINITIVAMENTE questo file anche dal server?")) return;
    
    const token = localStorage.getItem('gh_admin_token');
    if (!token) return alert("Manca il token PAT Admin!");

    const btn = document.querySelector(`button[onclick="window.Scheda.eliminaMedia('${path}')"]`);
    if(btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size: 12px;"></i>';
    
    try {
        const resSha = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`, { headers: { 'Authorization': `token ${token}` }});
        if (resSha.ok) {
            const fileData = await resSha.json();
            await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Eliminato media dalla scheda ${schedaAttivaId}`, sha: fileData.sha })
            });
        }
    } catch(e) {}
    
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

// ==========================================
// 6. VISUALIZZATORE INTERNO (VIEWER)
// ==========================================

function creaViewerSeMancante() {
    if (!document.getElementById('vd-media-viewer')) {
        const viewer = document.createElement('div');
        viewer.id = 'vd-media-viewer';
        viewer.className = 'modal-overlay';
        viewer.style.zIndex = '2000';
        viewer.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.92);">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: max(20px, env(safe-area-inset-top)); font-size: 32px; color: white; cursor: pointer; z-index: 10;" onclick="chiudiViewer()"></i>
                <div id="vd-media-viewer-content" style="max-width: 100%; max-height: 100%; display:flex; justify-content:center; align-items:center;"></div>
            </div>
        `;
        document.body.appendChild(viewer);

        window.chiudiViewer = () => {
            const vp = document.getElementById('vd-media-viewer');
            vp.style.display = 'none';
            const vid = vp.querySelector('video');
            if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); }
        };
    }
}

function apriViewer(index) {
    if (index < 0 || !datiSchedaCache.media || !datiSchedaCache.media[index]) {
        alert("File non trovato."); return;
    }
    
    const path = datiSchedaCache.media[index];
    const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${path}`;
    const ext = path.split('.').pop().toLowerCase();
    
    // Se è un PDF e viene cliccato da uno Smart Link nel testo, lo apre in una nuova scheda
    if (ext === 'pdf') {
        window.open(rawUrl, '_blank');
        return;
    }
    
    const contentDiv = document.getElementById('vd-media-viewer-content');
    if (['mp4', 'webm', 'mov'].includes(ext)) {
        contentDiv.innerHTML = `<video src="${rawUrl}" controls autoplay playsinline style="max-width: 100vw; max-height: 100vh; object-fit: contain;"></video>`;
    } else {
        contentDiv.innerHTML = `<img src="${rawUrl}" style="max-width: 100vw; max-height: 100vh; object-fit: contain;">`;
    }
    
    document.getElementById('vd-media-viewer').style.display = 'flex';
}
