export function avviaMotoreAdmin() {
    
    // Variabili di stato interne
    let calendarioSha = "";
    let calendarioContent = "";
    let resetKeysOrder = [];
    let cacheFileAlbero = [];
    let variantiFp = null;

    // ==========================================
    // FUNZIONI GLOBALI (esposte su window)
    // ==========================================

    window.gestisciMemoriaToken = (token, remember) => {
        if (remember) localStorage.setItem('gh_admin_token', token);
        else localStorage.removeItem('gh_admin_token');
    };

    window.aggiornaMappaFiles = async (owner, repo, token) => {
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

    window.forzaMappa = async () => {
        const owner = document.getElementById('gh-owner').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const token = document.getElementById('gh-token').value.trim();
        const statusLog = document.getElementById('status-log-map');

        if (!owner || !repo || !token) {
            statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila Username, Repo e Token.";
            statusLog.style.color = "var(--danger)";
            return;
        }

        statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Rigenerazione mappa globale...";
        statusLog.style.color = "var(--text-main)";
        
        try {
            await window.aggiornaMappaFiles(owner, repo, token);
            statusLog.innerHTML = "<i class='fa-solid fa-circle-check'></i> Mappa rigenerata con successo!";
            statusLog.style.color = "var(--success)";
        } catch (e) {
            statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore rigenerazione mappa.";
            statusLog.style.color = "var(--danger)";
        }
    };

    window.caricaDatiCalendario = async () => {
        const owner = document.getElementById('gh-owner').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const token = document.getElementById('gh-token').value.trim();
        const statusLog = document.getElementById('status-log-cal');

        if (!owner || !repo || !token) {
            statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila Username, Repo e Token.";
            statusLog.style.color = "var(--danger)";
            return;
        }
        
        window.gestisciMemoriaToken(token, document.getElementById('remember-token').checked);
        statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Download configurazione...";
        statusLog.style.color = "var(--text-main)";

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
            let switchesHtml = "";
            resetKeysOrder = [];
            if(resetMatch && resetMatch[1]) {
                let pairs = resetMatch[1].match(/(\w+):\s*(true|false)/g);
                if(pairs) {
                    pairs.forEach(p => {
                        let [k, v] = p.split(':');
                        k = k.trim();
                        v = v.trim() === 'true';
                        resetKeysOrder.push(k);
                        
                        switchesHtml += `
                            <div class="reset-row">
                                <span>${k}</span>
                                <label class="switch-cal">
                                    <input type="checkbox" id="reset_${k}" ${v ? 'checked' : ''}>
                                    <span class="slider-cal"></span>
                                </label>
                            </div>
                        `;
                    });
                }
            }
            document.getElementById('cal-reset-switches').innerHTML = switchesHtml;
            
            document.getElementById('calendario-editor').style.display = 'block';
            statusLog.innerHTML = "<i class='fa-solid fa-circle-check'></i> Editor pronto.";
            statusLog.style.color = "var(--success)";
            
        } catch (error) {
            statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${error.message}`;
            statusLog.style.color = "var(--danger)";
        }
    };

    window.salvaDatiCalendario = async () => {
        const owner = document.getElementById('gh-owner').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const token = document.getElementById('gh-token').value.trim();
        const statusLog = document.getElementById('status-log-cal');

        statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio modifiche...";
        statusLog.style.color = "var(--text-main)";

        let vVersione = document.getElementById('cal-versione').value.trim();
        let vData = document.getElementById('cal-data').value;
        
        let resetStrs = [];
        resetKeysOrder.forEach(k => {
            let isChecked = document.getElementById(`reset_${k}`).checked;
            resetStrs.push(`\n        ${k}: ${isChecked}`);
        });
        let vReset = `{${resetStrs.join(',')}\n    }`;

        let newContent = calendarioContent;
        newContent = newContent.replace(/const VERSIONE_TURNI\s*=\s*"([^"]*)";/, `const VERSIONE_TURNI = "${vVersione}";`);
        newContent = newContent.replace(/const DATA_INIZIO_NUOVI_TURNI\s*=\s*"([^"]*)";/, `const DATA_INIZIO_NUOVI_TURNI = "${vData}";`);
        newContent = newContent.replace(/const RESET_DOPO_AGGIORNAMENTO\s*=\s*(\{[\s\S]*?\});/, `const RESET_DOPO_AGGIORNAMENTO = ${vReset};`);

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/moduli/calendario.js`;
        try {
            const b64Content = btoa(unescape(encodeURIComponent(newContent)));
            
            const putRes = await fetch(url, {
                method: 'PUT',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Aggiornamento config calendario via Admin a v${vVersione}`,
                    content: b64Content,
                    sha: calendarioSha
                })
            });

            if (putRes.ok) {
                const updatedData = await putRes.json();
                calendarioSha = updatedData.content.sha; 
                calendarioContent = newContent;
                
                statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Sincronizzazione Mappa...";
                await window.aggiornaMappaFiles(owner, repo, token);
                
                statusLog.innerHTML = "<i class='fa-solid fa-circle-check'></i> Configurazione aggiornata!";
                statusLog.style.color = "var(--success)";
            } else {
                throw new Error("Impossibile caricare il file modificato.");
            }
        } catch (error) {
            statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${error.message}`;
            statusLog.style.color = "var(--danger)";
        }
    };

    window.caricaZip = async () => {
        const owner = document.getElementById('gh-owner').value.trim(); 
        const repo = document.getElementById('gh-repo').value.trim(); 
        const token = document.getElementById('gh-token').value.trim();
        const fileInput = document.getElementById('zip-file'); 
        const statusLog = document.getElementById('status-log-zip');

        if (!owner || !repo || !token) { 
            statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila credenziali."; 
            statusLog.style.color = "var(--danger)"; return; 
        }
        if (fileInput.files.length === 0) { 
            statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona un file .zip"; 
            statusLog.style.color = "var(--danger)"; return; 
        }

        window.gestisciMemoriaToken(token, document.getElementById('remember-token').checked);
        statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Lettura struttura ZIP..."; 
        statusLog.style.color = "var(--text-main)";

        try {
            const zip = await window.JSZip.loadAsync(fileInput.files[0]);
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
            await window.aggiornaMappaFiles(owner, repo, token);
            
            if (errorCount === 0) { 
                statusLog.innerHTML = `<i class='fa-solid fa-circle-check'></i> ${successCount} file caricati!`; 
                statusLog.style.color = "var(--success)"; 
                fileInput.value = ""; 
            } else { 
                statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${successCount} ok, ${errorCount} errori.`; 
                statusLog.style.color = "var(--warning)"; 
            }

        } catch (error) { statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Errore ZIP."; statusLog.style.color = "var(--danger)"; }
    };

    window.caricaElencoFile = async () => {
        const owner = document.getElementById('gh-owner').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const token = document.getElementById('gh-token').value.trim();
        const statusLog = document.getElementById('status-log-delete');

        if (!owner || !repo || !token) {
            statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila Username, Repo e Token."; 
            statusLog.style.color = "var(--danger)"; return;
        }

        window.gestisciMemoriaToken(token, document.getElementById('remember-token').checked);
        statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Lettura repository..."; 
        statusLog.style.color = "var(--text-main)";
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
            
            window.disegnaElencoFile(cacheFileAlbero);
            document.getElementById('file-manager-container').style.display = 'block';
            statusLog.innerHTML = `<i class='fa-solid fa-circle-check'></i> Trovati ${cacheFileAlbero.length} file.`;
            statusLog.style.color = "var(--success)";
        } catch(e) {
            statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${e.message}`; 
            statusLog.style.color = "var(--danger)";
        }
    };

    window.disegnaElencoFile = (lista, isSearch = false) => {
        const container = document.getElementById('file-list');
        container.innerHTML = "";
        
        if (lista.length === 0) {
            container.innerHTML = "<div style='text-align:center; color:var(--text-muted); font-size:13px; padding: 20px;'><i class='fa-regular fa-folder-open'></i> Nessun file trovato.</div>";
            window.aggiornaContatoreSelezione();
            return;
        }

        if (isSearch) {
            lista.forEach((file, index) => {
                let icona = "<i class='fa-regular fa-file-lines'></i>";
                if (file.path.endsWith('.json')) icona = "<i class='fa-solid fa-file-code' style='color:#f57c00;'></i>";
                if (file.path.endsWith('.png') || file.path.endsWith('.jpg')) icona = "<i class='fa-regular fa-image' style='color:#0dcaf0;'></i>";
                if (file.path.endsWith('.html')) icona = "<i class='fa-brands fa-html5' style='color:#e34f26;'></i>";

                const row = document.createElement('div');
                row.className = "file-item";

                row.innerHTML = `
                    <input type="checkbox" id="chk_s_${index}" class="chk-file-delete file-checkbox" data-path="${file.path}" data-sha="${file.sha}" onchange="window.aggiornaContatoreSelezione()">
                    <label for="chk_s_${index}" style="word-break: break-all; cursor:pointer; flex: 1; display:flex; gap:8px; align-items:center;">${icona} ${file.path}</label>
                `;
                container.appendChild(row);
            });
        } else {
            let folders = {};
            lista.forEach(file => {
                let parts = file.path.split('/');
                let fileName = parts.pop();
                let dirName = parts.join('/') || '/ (Root)';
                if(!folders[dirName]) folders[dirName] = [];
                folders[dirName].push({name: fileName, path: file.path, sha: file.sha});
            });

            Object.keys(folders).sort().forEach((dir, dirIndex) => {
                const group = document.createElement('div');
                group.className = "folder-group";
                
                const header = document.createElement('div');
                header.className = "folder-header";
                header.innerHTML = `
                    <span class="folder-toggle-icon" id="icon_folder_${dirIndex}" onclick="window.toggleFolderVisibility('folder_${dirIndex}')"><i class="fa-solid fa-folder"></i></span>
                    <input type="checkbox" class="folder-checkbox" onchange="window.toggleFolderCheck('folder_${dirIndex}', this.checked)">
                    <span onclick="window.toggleFolderVisibility('folder_${dirIndex}')" style="flex: 1;">${dir}</span>
                `;
                
                const content = document.createElement('div');
                content.className = "folder-content";
                content.id = `folder_${dirIndex}`;
                content.style.display = "none";

                folders[dir].forEach((file, fileIndex) => {
                    let icona = "<i class='fa-regular fa-file-lines'></i>";
                    if (file.name.endsWith('.json')) icona = "<i class='fa-solid fa-file-code' style='color:#f57c00;'></i>";
                    if (file.name.endsWith('.png') || file.name.endsWith('.jpg')) icona = "<i class='fa-regular fa-image' style='color:#0dcaf0;'></i>";
                    if (file.name.endsWith('.html')) icona = "<i class='fa-brands fa-html5' style='color:#e34f26;'></i>";

                    const row = document.createElement('div');
                    row.className = "file-item";
                    row.innerHTML = `
                        <input type="checkbox" id="chk_f_${dirIndex}_${fileIndex}" class="chk-file-delete file-checkbox" data-path="${file.path}" data-sha="${file.sha}" onchange="window.aggiornaContatoreSelezione()">
                        <label for="chk_f_${dirIndex}_${fileIndex}" style="word-break: break-all; cursor:pointer; flex: 1; display:flex; gap:8px; align-items:center;">${icona} ${file.name}</label>
                    `;
                    content.appendChild(row);
                });

                group.appendChild(header);
                group.appendChild(content);
                container.appendChild(group);
            });
        }
        
        window.aggiornaContatoreSelezione();
    };

    window.toggleFolderVisibility = (folderId) => {
        const el = document.getElementById(folderId);
        const icon = document.getElementById('icon_' + folderId);
        if(el.style.display === 'none') {
            el.style.display = 'block';
            icon.innerHTML = '<i class="fa-regular fa-folder-open"></i>';
        } else {
            el.style.display = 'none';
            icon.innerHTML = '<i class="fa-solid fa-folder"></i>';
        }
    };

    window.toggleFolderCheck = (folderId, isChecked) => {
        const content = document.getElementById(folderId);
        const checkboxes = content.querySelectorAll('.chk-file-delete');
        checkboxes.forEach(chk => { chk.checked = isChecked; });
        window.aggiornaContatoreSelezione();
    };

    window.filtraElencoFile = () => {
        const query = document.getElementById('ricerca-file').value.toLowerCase().trim();
        if (query === "") {
            window.disegnaElencoFile(cacheFileAlbero, false); 
        } else {
            const filtrati = cacheFileAlbero.filter(f => f.path.toLowerCase().includes(query));
            window.disegnaElencoFile(filtrati, true); 
        }
    };

    window.selezionaTuttiFile = (seleziona) => {
        const checkboxes = document.querySelectorAll('.chk-file-delete');
        checkboxes.forEach(chk => chk.checked = seleziona);
        
        const folderCheckboxes = document.querySelectorAll('.folder-checkbox');
        folderCheckboxes.forEach(chk => chk.checked = seleziona);
        
        window.aggiornaContatoreSelezione();
    };

    window.aggiornaContatoreSelezione = () => {
        const count = document.querySelectorAll('.chk-file-delete:checked').length;
        document.getElementById('contatore-selezione').innerText = count;
    };

    window.preparaEliminazione = () => {
        const checkboxes = document.querySelectorAll('.chk-file-delete:checked');
        if (checkboxes.length === 0) { alert("Nessun file selezionato per l'eliminazione!"); return; }

        document.getElementById('delete-count-display').innerText = checkboxes.length;
        
        const listC = document.getElementById('delete-confirm-list');
        listC.innerHTML = "";
        checkboxes.forEach(chk => {
            const li = document.createElement('li');
            li.innerText = chk.getAttribute('data-path');
            listC.appendChild(li);
        });

        document.getElementById('modal-delete-confirm').style.display = 'flex';
    };

    window.chiudiModalElimina = () => {
        document.getElementById('modal-delete-confirm').style.display = 'none';
    };

    window.confermaEliminazione = async () => {
        window.chiudiModalElimina();
        const checkboxes = document.querySelectorAll('.chk-file-delete:checked');
        
        const owner = document.getElementById('gh-owner').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const token = document.getElementById('gh-token').value.trim();
        const statusLog = document.getElementById('status-log-delete');

        statusLog.innerHTML = `<i class='fa-solid fa-spinner fa-spin'></i> Eliminazione di ${checkboxes.length} file in corso...`;
        statusLog.style.color = "var(--text-main)";

        let success = 0; let errori = 0;

        for (let i = 0; i < checkboxes.length; i++) {
            const path = checkboxes[i].getAttribute('data-path');
            const sha = checkboxes[i].getAttribute('data-sha');
            
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
            try {
                const res = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `Admin: Bulk delete ${path}`,
                        sha: sha
                    })
                });
                if (res.ok) success++;
                else errori++;
            } catch(e) { errori++; }
        }

        statusLog.innerHTML = `<i class='fa-solid fa-spinner fa-spin'></i> Aggiornamento Mappa...`;
        await window.aggiornaMappaFiles(owner, repo, token);

        if (errori === 0) {
            statusLog.innerHTML = `<i class='fa-solid fa-circle-check'></i> ${success} file eliminati!`;
            statusLog.style.color = "var(--success)";
        } else {
            statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${success} eliminati, ${errori} errori.`;
            statusLog.style.color = "var(--warning)";
        }

        document.getElementById('ricerca-file').value = "";
        await window.caricaElencoFile();
    };

    window.initVarianti = (mode = 'multiple') => {
        if(variantiFp) variantiFp.destroy();
        // Fallback per sicurezza nel caso non sia ancora caricato il flatpickr
        if (window.flatpickr) {
            variantiFp = window.flatpickr("#var-date", {
                mode: mode,
                dateFormat: "Y-m-d",
                locale: "it"
            });
        } else {
            setTimeout(() => window.initVarianti(mode), 300);
        }
    };

    window.setVariantiMode = (mode) => {
        const btnSingola = document.getElementById('btn-mode-singola');
        const btnMultipla = document.getElementById('btn-mode-multipla');
        
        if (mode === 'multiple') {
            btnSingola.style.backgroundColor = 'var(--primary)';
            btnSingola.style.color = 'white';
            btnSingola.style.border = 'none';
            
            btnMultipla.style.backgroundColor = 'var(--surface-hover)';
            btnMultipla.style.color = 'var(--text-main)';
            btnMultipla.style.border = '1px solid var(--border-color)';
        } else {
            btnMultipla.style.backgroundColor = 'var(--primary)';
            btnMultipla.style.color = 'white';
            btnMultipla.style.border = 'none';
            
            btnSingola.style.backgroundColor = 'var(--surface-hover)';
            btnSingola.style.color = 'var(--text-main)';
            btnSingola.style.border = '1px solid var(--border-color)';
        }
        
        window.initVarianti(mode);
        document.getElementById('var-date').value = "";
    };

    window.salvaVarianti = async () => {
        const owner = document.getElementById('gh-owner').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const token = document.getElementById('gh-token').value.trim();
        const statusLog = document.getElementById('status-log-var');

        if (!owner || !repo || !token) {
            statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Compila Username, Repo e Token.";
            statusLog.style.color = "var(--danger)"; return;
        }

        if (!variantiFp || variantiFp.selectedDates.length === 0) {
            statusLog.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Seleziona le date.";
            statusLog.style.color = "var(--danger)"; return;
        }

        window.gestisciMemoriaToken(token, document.getElementById('remember-token').checked);
        statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Recupero json varianti...";
        statusLog.style.color = "var(--text-main)";

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/presenza_varianti.json`;
        let sha = "";
        let jsonAttuale = {};

        try {
            let response = await fetch(url + `?t=${new Date().getTime()}`, { headers: { 'Authorization': `token ${token}` } });
            if (response.ok) {
                const data = await response.json();
                sha = data.sha;
                jsonAttuale = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            } else if (response.status !== 404) {
                throw new Error("Errore nel recupero del file su GitHub.");
            }

            let dates = [];
            if (variantiFp.config.mode === 'multiple') {
                dates = variantiFp.selectedDates;
            } else if (variantiFp.config.mode === 'range') {
                let start = variantiFp.selectedDates[0];
                let end = variantiFp.selectedDates[1] || start;
                if (start) {
                    let curr = new Date(start);
                    curr.setHours(12, 0, 0, 0); 
                    let endG = new Date(end);
                    endG.setHours(12, 0, 0, 0);
                    while (curr <= endG) {
                        dates.push(new Date(curr));
                        curr.setDate(curr.getDate() + 1);
                    }
                }
            }

            let dateStrs = dates.map(d => {
                let t = new Date(d);
                return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, '0') + "-" + String(t.getDate()).padStart(2, '0');
            });

            let lineeInput = document.getElementById('var-linee').value.trim();
            let lineeArr = lineeInput ? lineeInput.split(',').map(s => s.trim()).filter(s => s) : [];

            if (document.getElementById('var-pulisci').checked) {
                let dOggi = new Date();
                let oggiStr = dOggi.getFullYear() + "-" + String(dOggi.getMonth() + 1).padStart(2, '0') + "-" + String(dOggi.getDate()).padStart(2, '0');
                for (let key in jsonAttuale) {
                    if (key < oggiStr) {
                        delete jsonAttuale[key];
                    }
                }
            }

            dateStrs.forEach(dStr => {
                jsonAttuale[dStr] = lineeArr;
            });

            statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Salvataggio...";
            const nuovoContenuto = btoa(unescape(encodeURIComponent(JSON.stringify(jsonAttuale, null, 2))));

            const putResponse = await fetch(url, {
                method: 'PUT',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Aggiornate varianti di servizio via Admin Panel`,
                    content: nuovoContenuto,
                    sha: sha || undefined
                })
            });

            if (putResponse.ok) {
                statusLog.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Aggiornamento Mappa...";
                await window.aggiornaMappaFiles(owner, repo, token);
                statusLog.innerHTML = "<i class='fa-solid fa-circle-check'></i> Modifiche salvate!";
                statusLog.style.color = "var(--success)";
                variantiFp.clear();
                document.getElementById('var-linee').value = "";
            } else {
                throw new Error("Impossibile salvare il file.");
            }

        } catch (error) {
            statusLog.innerHTML = `<i class='fa-solid fa-triangle-exclamation'></i> ${error.message}`;
            statusLog.style.color = "var(--danger)";
        }
    };

    // ==========================================
    // AZIONI DI AVVIO DEL MOTORE ADMIN
    // ==========================================
    setTimeout(() => {
        const savedToken = localStorage.getItem('gh_admin_token');
        if (savedToken && document.getElementById('gh-token')) {
            document.getElementById('gh-token').value = savedToken;
            document.getElementById('remember-token').checked = true;
        }
        window.initVarianti('multiple');
    }, 500);
      } 
