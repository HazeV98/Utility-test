// Variabili globali del modulo
let numCartelle = 0;
let currentImgList = [];
let currentImgDir = "";
let currentCorseData = null; 
let mappaAlbero = [];

export async function avviaMotoreTurni() {
    

    const area = document.getElementById('content-area');
    if (!area) return; // Se la modale non è pronta, esce
    
    area.innerHTML = "<div class='status-message'><i class='fa-solid fa-spinner fa-spin' style='color:var(--primary); font-size:20px;'></i> Caricamento dati turni...</div>";
    
    try {
        const resMappa = await fetch('mappa_file.json?t=' + new Date().getTime());
        if (!resMappa.ok) throw new Error("Mappa file non trovata");
        
        const datiMappa = await resMappa.json();
        mappaAlbero = datiMappa.albero || [];

        const dirs = [...new Set(mappaAlbero.filter(p => p.startsWith("turni_pdf_") || p.startsWith("turni_varianti_")).map(p => p.split('/')[0]))];
        numCartelle = dirs.length;
        
        if (numCartelle === 1) { 
            window.caricaFiles(dirs[0]); 
        } else {
            area.innerHTML = ""; 
            dirs.sort((a,b) => b.localeCompare(a));
            
            dirs.forEach((d, index) => {
                const btn = document.createElement('button'); 
                btn.className = "folder-btn";
                btn.style.animation = `fadeInUp 0.4s ease forwards ${index * 0.05}s`;
                btn.style.opacity = "0";
                btn.onclick = () => window.caricaFiles(d); 
                area.appendChild(btn);
                
                if (d.includes("varianti")) {
                    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Caricamento...";
                    fetch(`${d}/nome.txt?t=${new Date().getTime()}`)
                        .then(response => { if (response.ok) return response.text(); throw new Error("File txt assente"); })
                        .then(testo => { btn.innerHTML = `<i class="fa-solid fa-code-merge"></i> ${testo.trim() || d.replace("turni_varianti_", "").replace(/_/g, " ")}`; })
                        .catch(() => { btn.innerHTML = `<i class="fa-solid fa-code-merge"></i> ${d.replace("turni_varianti_", "").replace(/_/g, " ")}`; });
                } else {
                    let label = d.replace("turni_pdf_", "").split("-").reverse().join("-");
                    btn.innerHTML = `<i class="fa-regular fa-folder-open"></i> Turni dal ${label}`;
                }
            });
        }
    } catch (e) { 
        area.innerHTML = "<div class='status-message'><i class='fa-solid fa-spinner fa-spin'></i> In attesa di caricamento dati...</div>"; 
    }
}

// --- FUNZIONI GLOBALI (Esportate a window per l'HTML) ---

window.downloadForzato = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    } catch (e) { window.open(url, '_blank'); }
};

window.caricaFiles = async (dir) => {
    const area = document.getElementById('content-area'); 
    area.innerHTML = "<div class='status-message'><i class='fa-solid fa-spinner fa-spin'></i> Caricamento file in corso...</div>";
    
    let imgDir = "";
    if (dir.startsWith("turni_pdf_")) imgDir = dir.replace("turni_pdf_", "turni_");
    else if (dir.startsWith("turni_varianti_")) imgDir = dir.replace("turni_varianti_", "turni_jpg_varianti_");
    
    currentImgDir = imgDir;
    
    currentImgList = mappaAlbero
        .filter(p => p.startsWith(imgDir + "/") && (p.toLowerCase().endsWith(".jpg") || p.toLowerCase().endsWith(".png")))
        .map(p => ({ name: p.split('/')[1] }));
    
    try {
        let filesInDir = mappaAlbero.filter(p => p.startsWith(dir + "/") && p.split('/').length === 2).map(p => p.split('/')[1]);
        let pdfs = filesInDir.filter(f => f.toLowerCase().endsWith(".pdf")).map(name => ({ name }));
        let jsons = filesInDir.filter(f => f.toLowerCase().endsWith(".json")).map(name => ({ name }));
        
        pdfs.sort((a, b) => {
            if (a.name.includes("libro_turni_completo")) return -1;
            if (b.name.includes("libro_turni_completo")) return 1;
            return a.name.localeCompare(b.name, undefined, {numeric: true});
        });
        
        area.innerHTML = "";
        
        if (numCartelle > 1) { 
            const b = document.createElement('button'); 
            b.className = "back-btn"; b.innerHTML = "<i class='fa-solid fa-arrow-left'></i> Indietro alle cartelle"; 
            b.onclick = avviaMotoreTurni; area.appendChild(b); 
        }
        
        if (currentImgList.length > 0) {
            const searchDiv = document.createElement('div'); searchDiv.className = "search-container";
            searchDiv.style.animation = "fadeInUp 0.4s ease";
            searchDiv.innerHTML = `<div class="search-wrapper"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="shiftSearch" placeholder="Cerca codice turno (es. 1B01)" autocomplete="off" oninput="window.filtraTurni()" onfocus="window.filtraTurni()"></div><div id="suggestionsBox" class="suggestions-box"></div>`;
            area.appendChild(searchDiv);
        }
        
        pdfs.forEach((f, index) => {
            let nomeOrig = f.name; let nomeVis = "";
            if (nomeOrig.includes("libro_turni_completo")) {
                nomeVis = "Libro turni completo";
            } else {
                let n = nomeOrig.replace(/\.pdf$/i, "").replace(/_/g, " ");
                n = n.split(/\s+dal\s+/i)[0]; n = n.replace(/\s+pdf$/i, "").trim(); n = n.replace(/\blinea\b/gi, "linea");
                nomeVis = n.charAt(0).toUpperCase() + n.slice(1);
            }

            const row = document.createElement('div'); row.className = "file-row";
            row.style.animation = `fadeInUp 0.4s ease forwards ${index * 0.05}s`;
            row.style.opacity = "0";
            if (nomeOrig.includes("libro")) row.style.marginBottom = "16px";

            const aOpen = document.createElement('a'); aOpen.className = "file-btn"; aOpen.innerHTML = `<i class="fa-solid fa-file-pdf"></i> <span>${nomeVis}</span>`; aOpen.href = `${dir}/${nomeOrig}`; aOpen.target = "_blank";
            const aDown = document.createElement('div'); aDown.className = "icon-btn"; aDown.innerHTML = '<i class="fa-solid fa-download"></i>'; aDown.onclick = () => window.downloadForzato(`${dir}/${nomeOrig}`, nomeOrig);

            row.appendChild(aOpen); row.appendChild(aDown);

            const baseName = nomeOrig.substring(0, nomeOrig.lastIndexOf('.'));
            const hasJson = jsons.some(j => j.name.substring(0, j.name.lastIndexOf('.')) === baseName);

            if (hasJson) {
                const btnSearch = document.createElement('button');
                btnSearch.className = "icon-btn btn-search-spec"; 
                btnSearch.innerHTML = '<i class="fa-solid fa-route"></i>';
                btnSearch.onclick = () => window.apriRicercaCorse(nomeOrig, dir);
                row.appendChild(btnSearch);
            }
            area.appendChild(row);
        });
    } catch (e) { area.innerHTML = "<div class='status-message' style='color:var(--danger);'><i class='fa-solid fa-triangle-exclamation'></i> Errore caricamento PDF.</div>"; }
};

window.filtraTurni = () => {
    const input = document.getElementById('shiftSearch'); const box = document.getElementById('suggestionsBox');
    if (!input || !box) return;

    input.value = input.value.toUpperCase(); const query = input.value.trim();
    if (query.length === 0) { box.style.display = 'none'; return; }

    const matches = currentImgList.filter(f => {
        const nomeSenzaExt = f.name.replace(/\.[^/.]+$/, "").toUpperCase();
        return nomeSenzaExt.includes(query);
    });

    if (matches.length > 0) {
        box.innerHTML = '';
        matches.forEach(m => {
            const nomeSenzaExt = m.name.replace(/\.[^/.]+$/, "").toUpperCase();
            const item = document.createElement('div'); item.className = 'suggestion-item';
            item.innerHTML = `<span>Turno <strong>${nomeSenzaExt}</strong></span> <i class="fa-regular fa-image"></i>`;
            
            // Lancia la visualizzazione immagine
            item.onclick = () => { 
                if(window.apriImmagineTurno) window.apriImmagineTurno(`${currentImgDir}/${m.name}`); 
                box.style.display = 'none'; input.value = ''; 
            };
            
            box.appendChild(item);
        });
        box.style.display = 'block';
    } else {
        box.innerHTML = '<div style="padding: 16px 20px; color: var(--text-muted);"><i class="fa-regular fa-face-frown-open"></i> Nessun turno trovato.</div>'; box.style.display = 'block';
    }
};

window.cercaEApriDaRisultato = (codiceTurno) => {
    if(window.cercaEApriTurno) window.cercaEApriTurno(codiceTurno, currentImgList, currentImgDir);
};

// --- LOGICA RICERCA CORSE ---
window.chiudiSeSfondoSearch = (event) => { if (event.target.id === 'modal-cerca-corse') { window.chiudiSearchCorseModal(); } };
window.chiudiSearchCorseModal = () => { document.getElementById('modal-cerca-corse').style.display = 'none'; };

window.apriRicercaCorse = async (pdfName, dirName) => {
    document.getElementById('modal-cerca-corse').style.display = 'flex';
    document.getElementById('sc-form').style.display = 'none'; document.getElementById('sc-risultato').style.display = 'none';
    const statusEl = document.getElementById('sc-status');
    
    document.getElementById('sc-tipo').value = ""; document.getElementById('btn-partenza').classList.remove('active'); document.getElementById('btn-arrivo').classList.remove('active'); document.getElementById('sc-rest-form').classList.remove('unlocked');
    document.getElementById('label-luogo').innerText = "Luogo:"; document.getElementById('label-orario').innerText = "Orario:"; document.getElementById('sc-orario').value = ""; document.getElementById('sc-giorno').valueAsDate = new Date(); 

    statusEl.style.display = 'block'; statusEl.innerHTML = "<i class='fa-solid fa-spinner fa-spin' style='color:var(--primary);'></i> Caricamento dati corse...";

    const jsonName = pdfName.substring(0, pdfName.lastIndexOf('.')) + ".json";
    
    try {
        const url = `${dirName}/${encodeURIComponent(jsonName)}?t=${new Date().getTime()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("File dati (JSON) non trovato.");
        currentCorseData = await res.json();
        statusEl.style.display = 'none'; document.getElementById('sc-form').style.display = 'block';
    } catch(e) { statusEl.innerHTML = `<span style='color:var(--danger); font-weight: 600;'><i class='fa-solid fa-triangle-exclamation'></i> Errore: ${e.message}</span>`; }
};

window.selezionaTipo = (tipo) => {
    document.getElementById('sc-tipo').value = tipo;
    if (tipo === 'partenza') { document.getElementById('btn-partenza').classList.add('active'); document.getElementById('btn-arrivo').classList.remove('active'); document.getElementById('label-luogo').innerText = "Luogo di partenza:"; document.getElementById('label-orario').innerText = "Orario di partenza:"; } 
    else { document.getElementById('btn-arrivo').classList.add('active'); document.getElementById('btn-partenza').classList.remove('active'); document.getElementById('label-luogo').innerText = "Luogo di arrivo:"; document.getElementById('label-orario').innerText = "Orario di arrivo:"; }
    
    document.getElementById('sc-rest-form').classList.add('unlocked');
    document.getElementById('sc-orario').value = ""; document.getElementById('sc-suggestions').style.display = 'none'; document.getElementById('sc-risultato').style.display = 'none';
    window.popolaLuoghi();
};

window.popolaLuoghi = () => {
    if (!currentCorseData) return;
    const tipo = document.getElementById('sc-tipo').value;
    let luoghi = new Set();
    for (let turno in currentCorseData) { currentCorseData[turno].forEach(corsa => { let luogoCorretto = tipo === 'partenza' ? corsa.partenza_luogo : corsa.arrivo_luogo; if (luogoCorretto) luoghi.add(luogoCorretto.trim()); }); }
    let select = document.getElementById('sc-luogo');
    select.innerHTML = '<option value="">-- Seleziona Luogo --</option>';
    Array.from(luoghi).sort().forEach(l => { select.innerHTML += `<option value="${l}">${l}</option>`; });
};

window.formattaOrario = (e) => {
    let val = e.target.value.replace(/\D/g, ''); if (val.length > 4) val = val.substring(0, 4); 
    if (val.length > 2) val = val.substring(0, 2) + '.' + val.substring(2);
    e.target.value = val; window.mostraSuggerimentiOrario(val);
};

window.aggiornaSuggerimentiOrario = () => { window.mostraSuggerimentiOrario(document.getElementById('sc-orario').value); };

window.mostraSuggerimentiOrario = (typedVal) => {
    const luogo = document.getElementById('sc-luogo').value; const tipo = document.getElementById('sc-tipo').value; const suggBox = document.getElementById('sc-suggestions');
    if (!luogo || typedVal.length === 0) { suggBox.style.display = 'none'; return; }

    let orari = new Set();
    for (let turno in currentCorseData) {
        currentCorseData[turno].forEach(corsa => {
            let targetLuogo = tipo === 'partenza' ? corsa.partenza_luogo : corsa.arrivo_luogo;
            let targetOra = tipo === 'partenza' ? corsa.partenza_ora : corsa.arrivo_ora;
            if (targetLuogo && targetLuogo.trim() === luogo && targetOra) orari.add(targetOra.trim());
        });
    }

    let filtrati = Array.from(orari).map(o => {
        let p = o.replace('.', ':').split(':'); if (p.length < 2) return "";
        return `${p[0].padStart(2, '0')}.${p[1].padStart(2, '0')}`;
    }).filter(o => o !== "" && o.startsWith(typedVal)).sort();

    if (filtrati.length > 0) {
        suggBox.innerHTML = '';
        filtrati.forEach(o => {
            let div = document.createElement('div'); div.className = 'sc-suggestion-item'; div.innerText = o;
            div.onclick = function() { document.getElementById('sc-orario').value = o; suggBox.style.display = 'none'; };
            suggBox.appendChild(div);
        });
        suggBox.style.display = 'block';
    } else { suggBox.style.display = 'none'; }
};

window.eseguiRicercaCorsa = async () => {
    const tipo = document.getElementById('sc-tipo').value; const luogo = document.getElementById('sc-luogo').value; const giorno = document.getElementById('sc-giorno').value; const orarioInput = document.getElementById('sc-orario').value; const box = document.getElementById('sc-risultato');
    if (!luogo || !orarioInput || orarioInput.length < 5) { box.style.display = 'block'; box.innerHTML = "<span style='color:var(--danger); font-weight:600;'><i class='fa-solid fa-circle-exclamation'></i> Seleziona un luogo e inserisci un orario completo.</span>"; return; }

    box.style.display = 'block'; box.innerHTML = "<i class='fa-solid fa-spinner fa-spin' style='color:var(--primary);'></i> Ricerca in corso...";

    let p = orarioInput.split('.'); let targetFormat1 = `${parseInt(p[0], 10)}:${p[1]}`; let targetFormat2 = `${parseInt(p[0], 10)}.${p[1]}`; let targetFormat3 = `${p[0]}:${p[1]}`; 
    let turniTrovati = [];

    for (let turno in currentCorseData) {
        currentCorseData[turno].forEach(corsa => {
            let targetLuogo = tipo === 'partenza' ? corsa.partenza_luogo : corsa.arrivo_luogo; let targetOra = tipo === 'partenza' ? corsa.partenza_ora : corsa.arrivo_ora;
            if (targetLuogo && targetLuogo.trim() === luogo) {
                let o = targetOra ? targetOra.trim() : "";
                if (o === targetFormat1 || o === targetFormat2 || o === targetFormat3) {
                    let matchPilota = turno.match(/\d[A-Z0-9]{3}/i); let nomePilota = matchPilota ? matchPilota[0].toUpperCase() : turno.toUpperCase();
                    if (!turniTrovati.includes(nomePilota)) turniTrovati.push(nomePilota);
                }
            }
        });
    }

    if (turniTrovati.length > 0) {
        let rotazioniHtml = "";
        if (localStorage.getItem('auth_rotazioni')) {
            try {
                let dateObj = giorno ? new Date(giorno.split('-')[0], giorno.split('-')[1] - 1, giorno.split('-')[2]) : new Date();
                let rotUrl = `rotazioni/rotazioni_${["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"][dateObj.getMonth()]}_${dateObj.getFullYear()}.json?t=${new Date().getTime()}`;
                let resRot = await fetch(rotUrl);
                if (resRot.ok) {
                    let rotData = await resRot.json(); let colleghiTrovati = [];
                    for (let rotName in rotData) {
                        for (let nome in rotData[rotName]) {
                            let tAssegnato = rotData[rotName][nome][dateObj.getDate().toString()];
                            if (tAssegnato) {
                                let tClean = tAssegnato.toUpperCase().replace(/\s+/g, '');
                                turniTrovati.forEach(tReq => { if (tReq.toUpperCase() === tClean) colleghiTrovati.push(`<strong>${tReq}:</strong> ${nome.split(" - ").join(" e ")}`); });
                            }
                        }
                    }
                    if (colleghiTrovati.length > 0) rotazioniHtml = `<div style="margin-top:20px; padding-top:16px; border-top: 1px solid var(--border-color); font-size:15px; color:var(--text-main);"><div style="color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-users"></i> <strong>Assegnazioni in Rotazione:</strong></div>${colleghiTrovati.join('<br>')}</div>`;
                }
            } catch(e) {}
        }

        box.innerHTML = `<div style="margin-bottom:8px;"><i class="fa-regular fa-calendar" style="color:var(--primary); width:20px;"></i> <strong>Data:</strong> ${giorno ? giorno.split('-').reverse().join('/') : "Oggi"}</div><div style="margin-bottom:16px;"><i class="fa-solid fa-location-dot" style="color:var(--primary); width:20px;"></i> <strong>${tipo === 'partenza' ? 'Partenza da' : 'Arrivo a'}:</strong> ${luogo} alle ${orarioInput}</div><strong style="display:block; margin-bottom:12px; color:var(--text-muted); font-size:13px; text-transform:uppercase;">Turni che effettuano la corsa:</strong><div style="display:flex; flex-wrap:wrap; gap:10px;">${turniTrovati.map(t => `<button class="file-btn" style="flex-grow:0; width:auto; padding: 10px 16px; font-size: 14px; margin:0;" onclick="window.cercaEApriDaRisultato('${t}')"><i class="fa-regular fa-image" style="color:var(--primary);"></i> ${t}</button>`).join('')}</div>${rotazioniHtml}`;
    } else { box.innerHTML = "<i class='fa-solid fa-circle-info' style='color:var(--primary);'></i> Nessun turno trovato nel database per questa selezione."; }
};

// Chiudi tendine risultati se si clicca fuori
document.addEventListener('click', function(e) {
    const boxImg = document.getElementById('suggestionsBox'); const inputImg = document.getElementById('shiftSearch');
    if (boxImg && inputImg && e.target !== inputImg && !boxImg.contains(e.target)) boxImg.style.display = 'none';
    const scSuggBox = document.getElementById('sc-suggestions'); const scInputOrario = document.getElementById('sc-orario');
    if (scSuggBox && scInputOrario && e.target !== scInputOrario && !scSuggBox.contains(e.target)) scSuggBox.style.display = 'none';
});
