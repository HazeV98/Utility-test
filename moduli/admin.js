// admin.js - Modulo di amministrazione con UI iniettata dinamicamente

let calendarioSha = "";
let calendarioContent = "";
let resetKeysOrder = [];
let cacheFileAlbero = [];
let variantiFp = null;

const adminHTML = `
<style id="admin-specific-styles">
    .card-panel-admin { background-color: var(--surface); padding: 24px; border-radius: var(--radius-lg); width: 100%; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; }
    .card-panel-admin h3 { margin-top: 0; font-size: 18px; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 15px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
    .switch-cal { position: relative; display: inline-block; width: 44px; height: 24px; margin-left: auto; }
    .switch-cal input { opacity: 0; width: 0; height: 0; }
    .slider-cal { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-color); transition: .3s; border-radius: 24px; }
    .slider-cal:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: var(--shadow-sm); }
    .switch-cal input:checked + .slider-cal { background-color: var(--success); }
    .switch-cal input:checked + .slider-cal:before { transform: translateX(20px); }
    .reset-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; color: var(--text-main); font-weight: 500;}
    .reset-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .folder-group { margin-bottom: 10px; background: var(--surface-hover); border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); }
    .folder-header { display: flex; align-items: center; padding: 14px; cursor: pointer; background: var(--surface); font-weight: 600; font-size: 14px; color: var(--text-main); border-bottom: 1px solid var(--border-color); }
    .folder-header:hover { background: var(--surface-hover); }
    .folder-toggle-icon { width: 24px; text-align: center; margin-right: 5px; user-select: none; color: var(--primary); }
    .folder-checkbox { margin-right: 12px; width: 18px; height: 18px; cursor: pointer; accent-color: var(--danger); }
    .folder-content { padding: 10px 15px; background: var(--surface-hover); }
    .file-item { display: flex; align-items: center; margin-bottom: 10px; font-size: 13px; color: var(--text-muted); padding: 6px 0; border-bottom: 1px solid var(--border-color);}
    .file-item:last-child { margin-bottom: 0; border-bottom: none; }
    .file-checkbox { margin-right: 12px; width: 16px; height: 16px; cursor: pointer; accent-color: var(--danger); }
    .status-log { font-size: 14px; color: var(--text-muted); margin-top: 15px; text-align: center; min-height: 15px; font-weight: 600; background: var(--surface-hover); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); }
</style>

<div id="modal-admin-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-admin-main')">
    <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
        <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-admin-main')"></i>
        
        <h3 style="margin-top: 0; color: var(--danger); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
            <i class="fa-solid fa-lock"></i> Admin Panel
        </h3>

        <div style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 20px;">
            
            <div class="card-panel-admin">
                <h3><i class="fa-brands fa-github" style="color:var(--text-main);"></i> Credenziali Repository</h3>
                <input type="text" id="gh-owner" class="input-field" placeholder="Username GitHub" value="HazeV98" style="margin-bottom:0;">
                <input type="text" id="gh-repo" class="input-field" placeholder="Nome Repository" value="Utility" style="margin-bottom:0;">
                <input type="password" id="gh-token" class="input-field" placeholder="Token GitHub (PAT)" style="margin-bottom:0;">
                <label style="display:flex; align-items:center; font-size:14px; color:var(--text-muted); cursor:pointer; font-weight:500; gap:10px;">
                    <input type="checkbox" id="remember-token" style="width:18px; height:18px; accent-color:var(--primary);"> Ricorda Token
                </label>
            </div>

            <div class="card-panel-admin">
                <h3><i class="fa-solid fa-calendar-check" style="color:var(--primary);"></i> Gestione Calendario</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; line-height: 1.5;">Carica la configurazione base del calendario per aggiornare versione, date di transizione e impostazioni di reset.</p>
                <button class="btn-action" style="margin-top:0;" onclick="window.caricaDatiCalendarioAdmin()"><i class="fa-solid fa-cloud-arrow-down"></i> Scarica Config</button>
                
                <div id="calendario-editor" style="display: none; border-top: 1px dashed var(--border-color); padding-top: 20px; margin-top: 10px;">
                    <label class="editor-label">Versione App:</label>
                    <input type="text" id="cal-versione" class="input-field" placeholder="Es. 1.0.1">
                    <label class="editor-label">Data Inizio Nuovi Turni:</label>
                    <input type="date" id="cal-data" class="input-field">
                    <label class="editor-label" style="margin-top: 10px; margin-bottom: 10px;">Reset post Aggiornamento:</label>
                    <div id="cal-reset-switches" style="max-height: 250px; overflow-y: auto; background: var(--surface-hover); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 15px;"></div>
                    <button class="btn-action" style="background-color: var(--success);" onclick="window.salvaDatiCalendarioAdmin()"><i class="fa-solid fa-cloud-arrow-up"></i> Salva su GitHub</button>
                </div>
                <div id="status-log-cal" class="status-log">In attesa...</div>
            </div>

            <div class="card-panel-admin">
                <h3><i class="fa-solid fa-file-zipper" style="color:#6f42c1;"></i> Uploader ZIP</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; line-height: 1.5;">Comprimi in <b>.zip</b> per caricare turni e rotazioni in un unico passaggio.</p>
                <input type="file" id="zip-file" class="input-field" accept=".zip" style="padding:10px; background:var(--surface-hover);">
                <button class="btn-action" style="background-color: #6f42c1; margin-top:0;" onclick="window.caricaZipAdmin()"><i class="fa-solid fa-box-open"></i> Estrai e Sincronizza</button>
                <div id="status-log-zip" class="status-log">In attesa...</div>
            </div>
            
            <div class="card-panel-admin">
                <h3><i class="fa-solid fa-rotate" style="color:var(--warning);"></i> Sync Mappa</h3>
                <button class="btn-action" style="background-color: var(--warning); margin-top:0;" onclick="window.forzaMappaAdmin()"><i class="fa-solid fa-tower-broadcast"></i> Forza Creazione Mappa</button>
                <div id="status-log-map" class="status-log">In attesa...</div>
            </div>

            <div class="card-panel-admin">
                <h3><i class="fa-solid fa-trash-can" style="color:var(--danger);"></i> Pulizia Repository</h3>
                <button class="btn-action" style="background-color: #343a40; margin-top:0;" onclick="window.caricaElencoFileAdmin()"><i class="fa-solid fa-magnifying-glass"></i> Carica Elenco File</button>
                <div id="file-manager-container" style="display: none; margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 20px;">
                    <input type="text" id="ricerca-file" class="input-field" placeholder="🔍 Cerca per nome..." oninput="window.filtraElencoFileAdmin()">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-action" style="background-color: var(--surface-hover); color: var(--text-main); border: 1px solid var(--border-color); padding: 8px 12px; font-size: 12px; width: auto; box-shadow:none; margin:0;" onclick="window.selezionaTuttiFileAdmin(true)">Tutti</button>
                            <button class="btn-action" style="background-color: var(--surface-hover); color: var(--text-main); border: 1px solid var(--border-color); padding: 8px 12px; font-size: 12px; width: auto; box-shadow:none; margin:0;" onclick="window.selezionaTuttiFileAdmin(false)">Nessuno</button>
                        </div>
                        <div style="font-size: 13px; color: var(--text-muted);"><span id="contatore-selezione" style="font-weight: 700; color: var(--danger); font-size: 15px;">0</span> scelti</div>
                    </div>
                    <div id="file-list" style="max-height: 250px; overflow-y: auto; background: var(--bg-color); padding: 10px; border-radius: var(--radius-md); margin-bottom: 15px; border: 1px solid var(--border-color);"></div>
                    <button class="btn-action" style="background-color: var(--danger); margin:0;" onclick="window.preparaEliminazioneAdmin()"><i class="fa-solid fa-eraser"></i> Elimina Selezionati</button>
                </div>
                <div id="status-log-delete" class="status-log">In attesa...</div>
            </div>

            <div class="card-panel-admin">
                <h3><i class="fa-solid fa-code-merge" style="color:#0dcaf0;"></i> Varianti Servizio</h3>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button class="btn-action" id="btn-mode-singola" style="padding: 12px; font-size: 14px; margin:0;" onclick="window.setVariantiModeAdmin('multiple')">Singola/Multiple</button>
                    <button class="btn-action" id="btn-mode-multipla" style="background-color: var(--surface-hover); color: var(--text-main); border: 1px solid var(--border-color); box-shadow: none; padding: 12px; font-size: 14px; margin:0;" onclick="window.setVariantiModeAdmin('range')">Range Date</button>
                </div>
                <label class="editor-label">Date interessate:</label>
                <input type="text" id="var-date" class="input-field" placeholder="Clicca per selezionare..." readonly style="cursor: pointer; margin-bottom:10px;">
                <label class="editor-label">Linee (separa con virgola):</label>
                <input type="text" id="var-linee" class="input-field" placeholder="Es. Linea 1, Linea 12" style="margin-bottom: 15px;">
                <label style="display:flex; align-items:center; font-size:14px; color:var(--text-muted); cursor:pointer; font-weight:500; gap:10px; margin-bottom:15px;">
                    <input type="checkbox" id="var-pulisci" checked style="width:18px; height:18px; accent-color:var(--primary);"> Auto-pulisci date passate
                </label>
                <button class="btn-action" style="background-color: var(--success); margin:0;" onclick="window.salvaVariantiAdmin()"><i class="fa-solid fa-paper-plane"></i> Invia Varianti</button>
                <div id="status-log-var" class="status-log">In attesa...</div>
            </div>
            
            <div class="card-panel-admin">
                <h3><i class="fa-solid fa-toolbox" style="color:var(--text-muted);"></i> Strumenti Esterni</h3>
                <button class="btn-action" style="background-color: #ff4b4b; margin:0;" onclick="window.open('http://100.80.221.32:8501/', '_blank')"><i class="fa-solid fa-arrow-up-right-from-square"></i> Apri Toolbox Turni</button>
            </div>
        </div>
    </div>
</div>

<div id="modal-delete-confirm" class="modal-overlay" style="z-index: 8000;">
    <div class="modal-content" style="max-width:380px;">
        <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-delete-confirm').style.display='none'"></i>
        <h3 style="margin-top:0; color:var(--danger); border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-triangle-exclamation"></i> Conferma Azione</h3>
        <p style="font-size: 14px; color: var(--text-main); margin-bottom: 15px; line-height: 1.5;">Stai per eliminare definitivamente <b id="delete-count-display" style="color:var(--danger); font-size:16px;"></b> file. Questa operazione <b>non è reversibile</b>.</p>
        <ul id="delete-confirm-list" style="list-style: none; padding: 0; margin: 15px 0; max-height: 200px; overflow-y: auto; background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px; color: var(--text-muted);"></ul>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
            <button class="btn-action" style="background-color: var(--danger); margin:0;" onclick="window.confermaEliminazioneAdmin()"><i class="fa-solid fa-trash-can"></i> Conferma Eliminazione</button>
            <button class="btn-outline" style="width:100%; justify-content:center; margin:0;" onclick="document.getElementById('modal-delete-confirm').style.display='none'">Annulla</button>
        </div>
    </div>
</div>
`;

export function avviaMotoreAdmin() {
    // 1. Inietta l'HTML se non esiste
    if (!document.getElementById('modal-admin-main')) {
        document.body.insertAdjacentHTML('beforeend', adminHTML);
    }
    
    // 2. Mostra la modale
    document.getElementById('modal-admin-main').style.display = 'flex';

    // 3. Inizializza i dati
    const savedToken = localStorage.getItem('gh_admin_token');
    if (savedToken) {
        const ghTokenInput = document.getElementById('gh-token');
        const rememberTokenCheck = document.getElementById('remember-token');
        if (ghTokenInput) ghTokenInput.value = savedToken;
        if (rememberTokenCheck) rememberTokenCheck.checked = true;
    }
    
    // Inizializza flatpickr per le varianti
    if (document.getElementById('var-date') && window.flatpickr) {
        window.initVariantiAdmin('multiple');
    }
}

window.apriModaleAdmin = () => avviaMotoreAdmin();

window.gestisciMemoriaTokenAdmin = function(token, remember) {
    if (remember) localStorage.setItem('gh_admin_token', token);
    else localStorage.removeItem('gh_admin_token');
};

window.aggiornaMappaFilesAdmin = async function(owner, repo, token) {
    try {
        let listaRotazioni = [];
        try {
            const urlRot = `https://api.github.com/repos/${owner}/${repo}/contents/rotazioni`;
            const resRot = await fetch(urlRot, { headers: { "Authorization": `token ${token}` } });
            if (resRot.ok) {
                const filesRot = await resRot.json();
                listaRotazioni = filesRot.filter(f => f.type === "file").map(f => f.name);
            }
        } catch(e) {}

        let alberoCompleto = [];
        try {
            const resRepo = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { "Authorization": `token ${token}` } });
            if (resRepo.ok) {
                const repoData = await resRepo.json();
                const urlTree = `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`;
                const resTree = await fetch(urlTree, { headers: { "Authorization": `token ${token}` } });
                if (resTree.ok) {
                    const treeData = await resTree.json();
                    alberoCompleto = treeData.tree.map(f => f.path);
                }
            }
        } catch(e) {}

        const mappaGlobale = { rotazioni: listaRotazioni, albero: alberoCompleto };
        const urlMappa = `https://api.github.com/repos/${owner}/${repo}/contents/mappa_file.json`;
        
        let shaMappa = null;
        try {
            const rM = await fetch(urlMappa, { headers: { "Authorization": `token ${token}` } });
            if (rM.ok) { const dM = await rM.json(); shaMappa = dM.sha; }
        } catch(e) {}

        await fetch(urlMappa, {
            method: "PUT",
            headers: { "Authorization": `token ${token}` },
            body: JSON.stringify({
                message: "Update mappa globale per indicizzazione Firebase",
                content: btoa(unescape(encodeURIComponent(JSON.stringify(mappaGlobale)))),
                sha: shaMappa
            })
        });
    } catch (e) { console.error("Errore creazione mappa globale:", e); }
};

window.forzaMappaAdmin = async function() {
    const owner = document.getElementById('gh-owner').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();
    const token = document.getElementById('gh-token').value.trim();
    const statusLog = document.getElementById('status-log-map');
    if (!owner || !repo || !token) {
        statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila Username, Repo e Token."; statusLog.style.color = "var(--danger)"; return;
    }
    statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Rigenerazione mappa globale..."; statusLog.style.color = "var(--text-main)";
    try {
        await window.aggiornaMappaFilesAdmin(owner, repo, token);
        statusLog.innerHTML = "<i class='fa-solid fa-circle-check'></i> Mappa rigenerata con successo!"; statusLog.style.color = "var(--success)";
    } catch (e) {
        statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore rigenerazione mappa."; statusLog.style.color = "var(--danger)";
    }
};

window.caricaDatiCalendarioAdmin = async function() {
    const owner = document.getElementById('gh-owner').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();
    const token = document.getElementById('gh-token').value.trim();
    const statusLog = document.getElementById('status-log-cal');
    if (!owner || !repo || !token) { statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila Username, Repo e Token."; statusLog.style.color = "var(--danger)"; return; }
    window.gestisciMemoriaTokenAdmin(token, document.getElementById('remember-token').checked);
    statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Download configurazione..."; statusLog.style.color = "var(--text-main)";
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/moduli/calendario.js?t=${new Date().getTime()}`;
    try {
        let response = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
        if (!response.ok) throw new Error("Errore: Impossibile scaricare calendario.js");
        const data = await response.json();
        calendarioSha = data.sha;
        calendarioContent = decodeURIComponent(escape(atob(data.content))); 
        const reVersion = /const VERSIONE_TURNI\s*=\s*"([^"]+)";/;
        const reDate = /const DATA_INIZIO_NUOVI_TURNI\s*=\s*"([^"]+)";/;
        const reReset = /const RESET_DOPO_AGGIORNAMENTO\s*=\s*(\{[\s\S]*?\});/;
        document.getElementById('cal-versione').value = (calendarioContent.match(reVersion) || [])[1] || "";
        document.getElementById('cal-data').value = (calendarioContent.match(reDate) || [])[1] || "";
        let resetMatch = calendarioContent.match(reReset);
        let switchesHtml = ""; resetKeysOrder = [];
        if(resetMatch && resetMatch[1]) {
            let pairs = resetMatch[1].match(/(\w+):\s*(true|false)/g);
            if(pairs) {
                pairs.forEach(p => {
                    let [k, v] = p.split(':'); k = k.trim(); v = v.trim() === 'true'; resetKeysOrder.push(k);
                    switchesHtml += `<div class="reset-row"><span>${k}</span><label class="switch-cal"><input type="checkbox" id="reset_${k}" ${v ? 'checked' : ''}><span class="slider-cal"></span></label></div>`;
                });
            }
        }
        document.getElementById('cal-reset-switches').innerHTML = switchesHtml;
        document.getElementById('calendario-editor').style.display = 'block';
        statusLog.innerHTML = "<i class='fa-solid fa-circle-check'></i> Editor pronto."; statusLog.style.color = "var(--success)";
    } catch (error) { statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${error.message}`; statusLog.style.color = "var(--danger)"; }
};

window.salvaDatiCalendarioAdmin = async function() {
    const owner = document.getElementById('gh-owner').value.trim(); const repo = document.getElementById('gh-repo').value.trim(); const token = document.getElementById('gh-token').value.trim();
    const statusLog = document.getElementById('status-log-cal');
    statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio modifiche..."; statusLog.style.color = "var(--text-main)";
    let vVersione = document.getElementById('cal-versione').value.trim(); let vData = document.getElementById('cal-data').value;
    let resetStrs = [];
    resetKeysOrder.forEach(k => { let isChecked = document.getElementById(`reset_${k}`).checked; resetStrs.push(`\n        ${k}: ${isChecked}`); });
    let vReset = `{${resetStrs.join(',')}\n    }`;
    let newContent = calendarioContent;
    newContent = newContent.replace(/const VERSIONE_TURNI\s*=\s*"([^"]*)";/, `const VERSIONE_TURNI = "${vVersione}";`);
    newContent = newContent.replace(/const DATA_INIZIO_NUOVI_TURNI\s*=\s*"([^"]*)";/, `const DATA_INIZIO_NUOVI_TURNI = "${vData}";`);
    newContent = newContent.replace(/const RESET_DOPO_AGGIORNAMENTO\s*=\s*(\{[\s\S]*?\});/, `const RESET_DOPO_AGGIORNAMENTO = ${vReset};`);
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/moduli/calendario.js`;
    try {
        const b64Content = btoa(unescape(encodeURIComponent(newContent)));
        const putRes = await fetch(url, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Aggiornamento config calendario via Admin a v${vVersione}`, content: b64Content, sha: calendarioSha }) });
        if (putRes.ok) {
            const updatedData = await putRes.json();
            calendarioSha = updatedData.content.sha; calendarioContent = newContent;
            statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Sincronizzazione Mappa...";
            await window.aggiornaMappaFilesAdmin(owner, repo, token);
            statusLog.innerHTML = "<i class='fa-solid fa-circle-check'></i> Configurazione aggiornata!"; statusLog.style.color = "var(--success)";
        } else { throw new Error("Impossibile caricare il file modificato."); }
    } catch (error) { statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${error.message}`; statusLog.style.color = "var(--danger)"; }
};

window.caricaZipAdmin = async function() {
    const owner = document.getElementById('gh-owner').value.trim(); const repo = document.getElementById('gh-repo').value.trim(); const token = document.getElementById('gh-token').value.trim();
    const fileInput = document.getElementById('zip-file'); const statusLog = document.getElementById('status-log-zip');
    if (!owner || !repo || !token) { statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila credenziali."; statusLog.style.color = "var(--danger)"; return; }
    if (fileInput.files.length === 0) { statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona un file .zip"; statusLog.style.color = "var(--danger)"; return; }
    window.gestisciMemoriaTokenAdmin(token, document.getElementById('remember-token').checked);
    statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Lettura struttura ZIP..."; statusLog.style.color = "var(--text-main)";
    try {
        const zip = await JSZip.loadAsync(fileInput.files[0]);
        const filesToUpload = []; const allPaths = [];
        zip.forEach((relPath, zipEntry) => { if (!zipEntry.dir && !relPath.includes('__MACOSX') && !relPath.includes('.DS_Store')) { filesToUpload.push(zipEntry); allPaths.push(relPath); } });
        if (filesToUpload.length === 0) { statusLog.innerHTML = "<i class='fa-solid fa-circle-info'></i> ZIP vuoto o non valido."; statusLog.style.color = "var(--warning)"; return; }
        let rootFolder = "";
        if (allPaths[0].split('/').length > 1) {
            let possibleRoot = allPaths[0].split('/')[0] + '/';
            if (allPaths.every(p => p.startsWith(possibleRoot))) rootFolder = possibleRoot;
        }
        let successCount = 0; let errorCount = 0;
        for (let i = 0; i < filesToUpload.length; i++) {
            const zipEntry = filesToUpload[i];
            let pathInRepo = zipEntry.name;
            if (rootFolder && pathInRepo.startsWith(rootFolder)) pathInRepo = pathInRepo.substring(rootFolder.length);
            statusLog.innerHTML = `<i class='fa-solid fa-spinner fa-spin'></i> Upload ${i + 1}/${filesToUpload.length}...`;
            const base64Data = await zipEntry.async("base64");
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${pathInRepo}`;
            let sha = undefined;
            try { const checkRes = await fetch(url, { headers: { 'Authorization': `token ${token}` } }); if (checkRes.ok) { sha = (await checkRes.json()).sha; } } catch(e) {} 
            const putRes = await fetch(url, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Admin: ${pathInRepo}`, content: base64Data, sha: sha }) });
            if (putRes.ok) successCount++; else errorCount++;
        }
        statusLog.innerHTML = `<i class='fa-solid fa-spinner fa-spin'></i> Aggiornamento Mappa...`;
        await window.aggiornaMappaFilesAdmin(owner, repo, token);
        if (errorCount === 0) { statusLog.innerHTML = `<i class='fa-solid fa-circle-check'></i> ${successCount} file caricati!`; statusLog.style.color = "var(--success)"; fileInput.value = ""; } 
        else { statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${successCount} ok, ${errorCount} errori.`; statusLog.style.color = "var(--warning)"; }
    } catch (error) { statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore ZIP."; statusLog.style.color = "var(--danger)"; }
};

window.caricaElencoFileAdmin = async function() {
    const owner = document.getElementById('gh-owner').value.trim(); const repo = document.getElementById('gh-repo').value.trim(); const token = document.getElementById('gh-token').value.trim();
    const statusLog = document.getElementById('status-log-delete');
    if (!owner || !repo || !token) { statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila Username, Repo e Token."; statusLog.style.color = "var(--danger)"; return; }
    window.gestisciMemoriaTokenAdmin(token, document.getElementById('remember-token').checked);
    statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Lettura repository..."; statusLog.style.color = "var(--text-main)";
    document.getElementById('file-manager-container').style.display = 'none';
    try {
        const resRepo = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { "Authorization": `token ${token}` } });
        if (!resRepo.ok) throw new Error("Errore lettura repository");
        const repoData = await resRepo.json();
        const urlTree = `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`;
        const resTree = await fetch(urlTree, { headers: { "Authorization": `token ${token}` } });
        if (!resTree.ok) throw new Error("Errore lettura albero file");
        const treeData = await resTree.json();
        cacheFileAlbero = treeData.tree.filter(f => f.type === 'blob');
        window.disegnaElencoFileAdmin(cacheFileAlbero);
        document.getElementById('file-manager-container').style.display = 'block';
        statusLog.innerHTML = `<i class='fa-solid fa-circle-check'></i> Trovati ${cacheFileAlbero.length} file.`; statusLog.style.color = "var(--success)";
    } catch(e) { statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${e.message}`; statusLog.style.color = "var(--danger)"; }
};

window.disegnaElencoFileAdmin = function(lista, isSearch = false) {
    const container = document.getElementById('file-list'); container.innerHTML = "";
    if (lista.length === 0) { container.innerHTML = "<div style='text-align:center; color:var(--text-muted); font-size:13px; padding: 20px;'><i class='fa-regular fa-folder-open'></i> Nessun file trovato.</div>"; window.aggiornaContatoreSelezioneAdmin(); return; }
    if (isSearch) {
        lista.forEach((file, index) => {
            let icona = "<i class='fa-regular fa-file-lines'></i>";
            if (file.path.endsWith('.json')) icona = "<i class='fa-solid fa-file-code' style='color:#f57c00;'></i>";
            if (file.path.endsWith('.png') || file.path.endsWith('.jpg')) icona = "<i class='fa-regular fa-image' style='color:#0dcaf0;'></i>";
            if (file.path.endsWith('.html') || file.path.endsWith('.js')) icona = "<i class='fa-brands fa-html5' style='color:#e34f26;'></i>";
            const row = document.createElement('div'); row.className = "file-item";
            row.innerHTML = `<input type="checkbox" id="chk_s_${index}" class="chk-file-delete file-checkbox" data-path="${file.path}" data-sha="${file.sha}" onchange="window.aggiornaContatoreSelezioneAdmin()"><label for="chk_s_${index}" style="word-break: break-all; cursor:pointer; flex: 1; display:flex; gap:8px; align-items:center;">${icona} ${file.path}</label>`;
            container.appendChild(row);
        });
    } else {
        let folders = {};
        lista.forEach(file => {
            let parts = file.path.split('/'); let fileName = parts.pop(); let dirName = parts.join('/') || '/ (Root)';
            if(!folders[dirName]) folders[dirName] = []; folders[dirName].push({name: fileName, path: file.path, sha: file.sha});
        });
        Object.keys(folders).sort().forEach((dir, dirIndex) => {
            const group = document.createElement('div'); group.className = "folder-group";
            const header = document.createElement('div'); header.className = "folder-header";
            header.innerHTML = `<span class="folder-toggle-icon" id="icon_folder_${dirIndex}" onclick="window.toggleFolderVisibilityAdmin('folder_${dirIndex}')"><i class="fa-solid fa-folder"></i></span><input type="checkbox" class="folder-checkbox" onchange="window.toggleFolderCheckAdmin('folder_${dirIndex}', this.checked)"><span onclick="window.toggleFolderVisibilityAdmin('folder_${dirIndex}')" style="flex: 1;">${dir}</span>`;
            const content = document.createElement('div'); content.className = "folder-content"; content.id = `folder_${dirIndex}`; content.style.display = "none";
            folders[dir].forEach((file, fileIndex) => {
                let icona = "<i class='fa-regular fa-file-lines'></i>";
                if (file.name.endsWith('.json')) icona = "<i class='fa-solid fa-file-code' style='color:#f57c00;'></i>";
                if (file.name.endsWith('.png') || file.name.endsWith('.jpg')) icona = "<i class='fa-regular fa-image' style='color:#0dcaf0;'></i>";
                if (file.name.endsWith('.html') || file.name.endsWith('.js')) icona = "<i class='fa-brands fa-html5' style='color:#e34f26;'></i>";
                const row = document.createElement('div'); row.className = "file-item";
                row.innerHTML = `<input type="checkbox" id="chk_f_${dirIndex}_${fileIndex}" class="chk-file-delete file-checkbox" data-path="${file.path}" data-sha="${file.sha}" onchange="window.aggiornaContatoreSelezioneAdmin()"><label for="chk_f_${dirIndex}_${fileIndex}" style="word-break: break-all; cursor:pointer; flex: 1; display:flex; gap:8px; align-items:center;">${icona} ${file.name}</label>`;
                content.appendChild(row);
            });
            group.appendChild(header); group.appendChild(content); container.appendChild(group);
        });
    }
    window.aggiornaContatoreSelezioneAdmin();
};

window.toggleFolderVisibilityAdmin = function(folderId) {
    const el = document.getElementById(folderId); const icon = document.getElementById('icon_' + folderId);
    if(el.style.display === 'none') { el.style.display = 'block'; icon.innerHTML = '<i class="fa-regular fa-folder-open"></i>'; } 
    else { el.style.display = 'none'; icon.innerHTML = '<i class="fa-solid fa-folder"></i>'; }
};

window.toggleFolderCheckAdmin = function(folderId, isChecked) {
    const content = document.getElementById(folderId); const checkboxes = content.querySelectorAll('.chk-file-delete');
    checkboxes.forEach(chk => { chk.checked = isChecked; }); window.aggiornaContatoreSelezioneAdmin();
};

window.filtraElencoFileAdmin = function() {
    const query = document.getElementById('ricerca-file').value.toLowerCase().trim();
    if (query === "") { window.disegnaElencoFileAdmin(cacheFileAlbero, false); } 
    else { const filtrati = cacheFileAlbero.filter(f => f.path.toLowerCase().includes(query)); window.disegnaElencoFileAdmin(filtrati, true); }
};

window.selezionaTuttiFileAdmin = function(seleziona) {
    document.querySelectorAll('.chk-file-delete').forEach(chk => chk.checked = seleziona);
    document.querySelectorAll('.folder-checkbox').forEach(chk => chk.checked = seleziona);
    window.aggiornaContatoreSelezioneAdmin();
};

window.aggiornaContatoreSelezioneAdmin = function() {
    document.getElementById('contatore-selezione').innerText = document.querySelectorAll('.chk-file-delete:checked').length;
};

window.preparaEliminazioneAdmin = function() {
    const checkboxes = document.querySelectorAll('.chk-file-delete:checked');
    if (checkboxes.length === 0) { alert("Nessun file selezionato per l'eliminazione!"); return; }
    document.getElementById('delete-count-display').innerText = checkboxes.length;
    const listC = document.getElementById('delete-confirm-list'); listC.innerHTML = "";
    checkboxes.forEach(chk => { const li = document.createElement('li'); li.innerText = chk.getAttribute('data-path'); li.style.padding="10px"; li.style.borderBottom="1px solid var(--border-color)"; li.style.wordBreak="break-all"; listC.appendChild(li); });
    document.getElementById('modal-delete-confirm').style.display = 'flex';
};

window.confermaEliminazioneAdmin = async function() {
    document.getElementById('modal-delete-confirm').style.display = 'none';
    const checkboxes = document.querySelectorAll('.chk-file-delete:checked');
    const owner = document.getElementById('gh-owner').value.trim(); const repo = document.getElementById('gh-repo').value.trim(); const token = document.getElementById('gh-token').value.trim();
    const statusLog = document.getElementById('status-log-delete');
    statusLog.innerHTML = `<i class='fa-solid fa-spinner fa-spin'></i> Eliminazione di ${checkboxes.length} file in corso...`; statusLog.style.color = "var(--text-main)";
    let success = 0; let errori = 0;
    for (let i = 0; i < checkboxes.length; i++) {
        const path = checkboxes[i].getAttribute('data-path'); const sha = checkboxes[i].getAttribute('data-sha');
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        try {
            const res = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Admin: Bulk delete ${path}`, sha: sha }) });
            if (res.ok) success++; else errori++;
        } catch(e) { errori++; }
    }
    statusLog.innerHTML = `<i class='fa-solid fa-spinner fa-spin'></i> Aggiornamento Mappa...`;
    await window.aggiornaMappaFilesAdmin(owner, repo, token);
    if (errori === 0) { statusLog.innerHTML = `<i class='fa-solid fa-circle-check'></i> ${success} file eliminati!`; statusLog.style.color = "var(--success)"; } 
    else { statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${success} eliminati, ${errori} errori.`; statusLog.style.color = "var(--warning)"; }
    document.getElementById('ricerca-file').value = ""; await window.caricaElencoFileAdmin();
};

window.initVariantiAdmin = function(mode = 'multiple') {
    if(variantiFp) variantiFp.destroy();
    variantiFp = flatpickr("#var-date", { mode: mode, dateFormat: "Y-m-d", locale: "it" });
};

window.setVariantiModeAdmin = function(mode) {
    const btnSingola = document.getElementById('btn-mode-singola'); const btnMultipla = document.getElementById('btn-mode-multipla');
    if (mode === 'multiple') {
        btnSingola.style.backgroundColor = 'var(--primary)'; btnSingola.style.color = 'white'; btnSingola.style.border = 'none';
        btnMultipla.style.backgroundColor = 'var(--surface-hover)'; btnMultipla.style.color = 'var(--text-main)'; btnMultipla.style.border = '1px solid var(--border-color)';
    } else {
        btnMultipla.style.backgroundColor = 'var(--primary)'; btnMultipla.style.color = 'white'; btnMultipla.style.border = 'none';
        btnSingola.style.backgroundColor = 'var(--surface-hover)'; btnSingola.style.color = 'var(--text-main)'; btnSingola.style.border = '1px solid var(--border-color)';
    }
    window.initVariantiAdmin(mode); document.getElementById('var-date').value = "";
};

window.salvaVariantiAdmin = async function() {
    const owner = document.getElementById('gh-owner').value.trim(); const repo = document.getElementById('gh-repo').value.trim(); const token = document.getElementById('gh-token').value.trim();
    const statusLog = document.getElementById('status-log-var');
    if (!owner || !repo || !token) { statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila Username, Repo e Token."; statusLog.style.color = "var(--danger)"; return; }
    if (!variantiFp || variantiFp.selectedDates.length === 0) { statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona le date."; statusLog.style.color = "var(--danger)"; return; }
    window.gestisciMemoriaTokenAdmin(token, document.getElementById('remember-token').checked);
    statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Recupero json varianti..."; statusLog.style.color = "var(--text-main)";
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/presenza_varianti.json`;
    let sha = ""; let jsonAttuale = {};
    try {
        let response = await fetch(url + `?t=${new Date().getTime()}`, { headers: { 'Authorization': `token ${token}` } });
        if (response.ok) { const data = await response.json(); sha = data.sha; jsonAttuale = JSON.parse(decodeURIComponent(escape(atob(data.content)))); } 
        else if (response.status !== 404) { throw new Error("Errore nel recupero del file su GitHub."); }
        let dates = [];
        if (variantiFp.config.mode === 'multiple') { dates = variantiFp.selectedDates; } 
        else if (variantiFp.config.mode === 'range') {
            let start = variantiFp.selectedDates[0]; let end = variantiFp.selectedDates[1] || start;
            if (start) {
                let curr = new Date(start); curr.setHours(12, 0, 0, 0); 
                let endG = new Date(end); endG.setHours(12, 0, 0, 0);
                while (curr <= endG) { dates.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
            }
        }
        let dateStrs = dates.map(d => { let t = new Date(d); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, '0') + "-" + String(t.getDate()).padStart(2, '0'); });
        let lineeInput = document.getElementById('var-linee').value.trim();
        let lineeArr = lineeInput ? lineeInput.split(',').map(s => s.trim()).filter(s => s) : [];
        if (document.getElementById('var-pulisci').checked) {
            let dOggi = new Date(); let oggiStr = dOggi.getFullYear() + "-" + String(dOggi.getMonth() + 1).padStart(2, '0') + "-" + String(dOggi.getDate()).padStart(2, '0');
            for (let key in jsonAttuale) { if (key < oggiStr) { delete jsonAttuale[key]; } }
        }
        dateStrs.forEach(dStr => { jsonAttuale[dStr] = lineeArr; });
        statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio...";
        const nuovoContenuto = btoa(unescape(encodeURIComponent(JSON.stringify(jsonAttuale, null, 2))));
        const putResponse = await fetch(url, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Aggiornate varianti via Admin Panel`, content: nuovoContenuto, sha: sha || undefined }) });
        if (putResponse.ok) {
            statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Aggiornamento Mappa...";
            await window.aggiornaMappaFilesAdmin(owner, repo, token);
            statusLog.innerHTML = "<i class='fa-solid fa-circle-check'></i> Modifiche salvate!"; statusLog.style.color = "var(--success)";
            variantiFp.clear(); document.getElementById('var-linee').value = "";
        } else { throw new Error("Impossibile salvare il file."); }
    } catch (error) { statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${error.message}`; statusLog.style.color = "var(--danger)"; }
};
