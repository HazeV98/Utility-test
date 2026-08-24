const GH_OWNER = "HazeV98"; 
const GH_REPO = "Utility-test";

let mappaPlan = null;
let markersLayer = null;
let imageOverlay = null;

let planData = { schede: {}, livelli: [] };
let fileShaAttuale = null;
let idPlanAttivo = null;
let isEditMode = false;
let globalIsAdminCollab = false;
let livelloCorrenteIdx = 0;
let statoDropPin = null; // Memorizza se stiamo piazzando un pin

export async function inizializzaPlanimetria(containerId, planId, databaseIgnorato, isAdminOrCollab) {
    idPlanAttivo = planId;
    const token = localStorage.getItem('gh_admin_token');
    globalIsAdminCollab = isAdminOrCollab || (token ? true : false);
    isEditMode = false;
    statoDropPin = null;

    const container = document.getElementById(containerId);
    if (!container) return;

    container.parentElement.style.padding = "0"; 

    // Struttura Base: Contenitore Mappa, FABs e Modali
    container.innerHTML = `
        <div id="plan-map-container" style="width: 100%; height: 100%; z-index: 1; background: #e0e0e0;"></div>
        
        <!-- Legenda (Inventario) -->
        <div id="plan-legenda-panel" style="display: none; position: absolute; top: max(15px, env(safe-area-inset-top)); right: 70px; background: var(--surface); padding: 15px; border-radius: 12px; box-shadow: var(--shadow-md); z-index: 1000; font-size: 13px; min-width: 200px; max-height: 70vh; overflow-y: auto; border: 1px solid var(--border-color);">
            <div style="font-weight: 700; margin-bottom: 12px; color: var(--text-main); font-size: 14px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;"><i class="fa-solid fa-clipboard-list"></i> Inventario Unità</div>
            <div id="plan-legenda-content"></div>
        </div>

        <!-- FAB (Pulsanti in alto a destra) -->
        <div style="position: absolute; top: max(15px, env(safe-area-inset-top)); right: 15px; z-index: 1000; display: flex; flex-direction: column; gap: 15px;">
            <button class="icon-btn fab-btn" title="Inventario" onclick="window.Plan.toggleLegenda()" style="width: 45px; height: 45px; border-radius: 50%; background: var(--surface); color: var(--primary); box-shadow: var(--shadow-md); border: 2px solid var(--border-color);">
                <i class="fa-solid fa-list"></i>
            </button>
            <button id="fab-livelli" class="icon-btn fab-btn" title="Cambia Livello" onclick="window.Plan.apriModaleLivelli()" style="width: 45px; height: 45px; border-radius: 50%; background: var(--surface); color: var(--text-main); box-shadow: var(--shadow-md); border: 2px solid var(--border-color); display: none;">
                <i class="fa-solid fa-layer-group"></i>
            </button>
            <button id="fab-edit-plan" class="icon-btn fab-btn" title="Gestione Planimetria" onclick="window.Plan.toggleEditMode()" style="display: none; width: 45px; height: 45px; border-radius: 50%; background: var(--primary); color: white; box-shadow: var(--shadow-md); border: none;">
                <i class="fa-solid fa-pen" id="icon-edit-plan"></i>
            </button>
        </div>

        <!-- Indicatore Drop Pin -->
        <div id="plan-drop-indicator" style="display:none; position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: var(--warning); color: #000; padding: 10px 20px; border-radius: 20px; font-weight: bold; z-index: 2000; box-shadow: var(--shadow-md); pointer-events: none;">
            <i class="fa-solid fa-crosshairs"></i> Clicca sulla planimetria per piazzare l'elemento
        </div>
    `;

    // Esposizione funzioni globali
    window.Plan = { 
        toggleLegenda, apriModaleLivelli, toggleEditMode, cambiaLivello, 
        apriGestioneSchede, creaNuovaScheda, apriEditorScheda, salvaScheda, eliminaScheda,
        attivaDropPin, apriSchedaViewer, salvaPlanimetriaSuGitHub, gestisciUploadMediaPlan,
        eliminaMediaPlan, scaricaFilePlan, apriViewerPlan, aggiungiNuovoLivello, eliminaPin
    };

    if (globalIsAdminCollab) {
        document.getElementById('fab-edit-plan').style.display = 'flex';
    }

    if (mappaPlan) mappaPlan.remove(); 
    
    // Inizializza Leaflet con coordinate piane
    mappaPlan = L.map('plan-map-container', { crs: L.CRS.Simple, minZoom: -3, zoomControl: false });
    L.control.zoom({ position: 'topleft' }).addTo(mappaPlan);
    markersLayer = L.layerGroup().addTo(mappaPlan);

    // Gestione click per piazzare pin
    mappaPlan.on('click', (e) => {
        if (statoDropPin && isEditMode) {
            const { lat, lng } = e.latlng;
            planData.livelli[livelloCorrenteIdx].pins.push({
                id: 'pin_' + Date.now(),
                schedaId: statoDropPin,
                lat: lat,
                lng: lng
            });
            statoDropPin = null;
            document.getElementById('plan-drop-indicator').style.display = 'none';
            document.getElementById('plan-map-container').style.cursor = 'grab';
            salvaPlanimetriaSuGitHub();
        }
    });

    setTimeout(() => { mappaPlan.invalidateSize(); }, 450);
    
    creaContenitoreModali();
    await caricaDatiPlanimetria();
}

// ==========================================
// 1. CARICAMENTO DATI E RENDER 
// ==========================================

async function caricaDatiPlanimetria() {
    const token = localStorage.getItem('gh_admin_token');
    try {
        let response = await fetch(`./assets/planimetrie/${idPlanAttivo}.json?t=${Date.now()}`);
        if (!response.ok) {
            const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/assets/planimetrie/${idPlanAttivo}.json?t=${Date.now()}`;
            response = await fetch(rawUrl);
        }

        if (response.ok) {
            planData = await response.json();
            
            // Assicuriamoci che la struttura sia integra
            if (!planData.schede) planData.schede = {};
            if (!planData.livelli) planData.livelli = [];
        }

        // Recupera SHA per salvataggio
        if (globalIsAdminCollab && token) {
            try {
                const urlAPI = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/planimetrie/${idPlanAttivo}.json`;
                const resAPI = await fetch(urlAPI, { headers: { 'Authorization': `token ${token}` } });
                if (resAPI.ok) fileShaAttuale = (await resAPI.json()).sha;
            } catch(e) {}
        }
        
        disegnaLivelloCorrente();
        aggiornaLegenda();

    } catch (error) {
        // Nessuna planimetria trovata, crea struttura vuota
        planData = { schede: {}, livelli: [] };
        disegnaLivelloCorrente();
    }
}

function disegnaLivelloCorrente() {
    if (imageOverlay) mappaPlan.removeLayer(imageOverlay);
    markersLayer.clearLayers();

    const btnLivelli = document.getElementById('fab-livelli');
    if (planData.livelli.length > 0) {
        btnLivelli.style.display = 'flex';
        
        const livello = planData.livelli[livelloCorrenteIdx];
        const rawImgUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${livello.imgUrl}`;
        
        // Carica l'immagine per scoprirne le dimensioni
        const img = new Image();
        img.onload = function() {
            const w = this.width;
            const h = this.height;
            // Calcola i bordi per Leaflet (Y invertita rispetto allo schermo)
            const bounds = [[0, 0], [h, w]];
            imageOverlay = L.imageOverlay(rawImgUrl, bounds).addTo(mappaPlan);
            
            if (!mappaPlan._hasSetInitialView) {
                mappaPlan.fitBounds(bounds);
                mappaPlan._hasSetInitialView = true;
            }

            // Disegna i pin
            if (livello.pins) {
                livello.pins.forEach(pin => {
                    const scheda = planData.schede[pin.schedaId];
                    if (!scheda) return;

                    const iconHtml = `<div style="background-color: ${scheda.colore}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 3px 6px rgba(0,0,0,0.5); font-size: 14px;"><i class="fa-solid ${scheda.icona}"></i></div>`;
                    
                    const marker = L.marker([pin.lat, pin.lng], {
                        icon: L.divIcon({ html: iconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] }),
                        draggable: isEditMode
                    }).addTo(markersLayer);

                    if (isEditMode) {
                        // Modalità Modifica: Drag & Drop e tasto elimina rapido
                        marker.on('dragend', function(e) {
                            const newPos = marker.getLatLng();
                            pin.lat = newPos.lat;
                            pin.lng = newPos.lng;
                            salvaPlanimetriaSuGitHub();
                        });
                        
                        marker.bindPopup(`
                            <div style="text-align:center;">
                                <strong>${scheda.nome}</strong><br><br>
                                <button onclick="window.Plan.eliminaPin('${pin.id}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Rimuovi Pin</button>
                            </div>
                        `);
                    } else {
                        // Modalità Visualizzazione: Clicca per aprire la Scheda
                        marker.on('click', () => apriSchedaViewer(pin.schedaId));
                    }
                });
            }
        };
        img.src = rawImgUrl;
    } else {
        btnLivelli.style.display = 'none';
        if (isEditMode) {
            apriModaleLivelli(); // Forza l'aggiunta di un livello
        } else {
            document.getElementById('plan-map-container').innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding-top: 100px;">
                    <i class="fa-solid fa-map" style="font-size: 50px; margin-bottom:15px;"></i><br>
                    Nessuna planimetria presente per questa unità.
                </div>`;
        }
    }
}

// ==========================================
// 2. FUNZIONI INTERFACCIA E SALVATAGGIO
// ==========================================

async function salvaPlanimetriaSuGitHub(mostraCaricamento = false) {
    const token = localStorage.getItem('gh_admin_token');
    if (!token) return alert("Manca il token PAT Admin!");

    if(mostraCaricamento) {
        document.getElementById('btn-salva-scheda').innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...`;
        document.getElementById('btn-salva-scheda').disabled = true;
    }

    try {
        const jsonString = JSON.stringify(planData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));
        const urlAPI = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/planimetrie/${idPlanAttivo}.json`;
        
        const payload = { message: `Aggiornata planimetria ${idPlanAttivo}`, content: base64Content };
        if (fileShaAttuale) payload.sha = fileShaAttuale;

        const res = await fetch(urlAPI, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Errore salvataggio");
        fileShaAttuale = (await res.json()).content.sha; 
        
        aggiornaLegenda();
        disegnaLivelloCorrente();
    } catch(e) {
        alert("Errore di salvataggio. Riprovare.");
    } finally {
        if(mostraCaricamento) {
            document.getElementById('btn-salva-scheda').innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salva Modifiche`;
            document.getElementById('btn-salva-scheda').disabled = false;
        }
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('fab-edit-plan');
    const icon = document.getElementById('icon-edit-plan');
    
    if (isEditMode) {
        btn.style.background = 'var(--success)';
        icon.className = "fa-solid fa-check";
        apriGestioneSchede(); // Apre subito il pannello di gestione inventario
    } else {
        btn.style.background = 'var(--primary)';
        icon.className = "fa-solid fa-pen";
        chiudiModaleGlobale();
        statoDropPin = null;
        document.getElementById('plan-drop-indicator').style.display = 'none';
        document.getElementById('plan-map-container').style.cursor = 'grab';
    }
    disegnaLivelloCorrente(); 
}

function eliminaPin(idPin) {
    if(confirm("Rimuovere questo elemento dalla mappa? (La scheda inventario non verrà eliminata)")) {
        planData.livelli[livelloCorrenteIdx].pins = planData.livelli[livelloCorrenteIdx].pins.filter(p => p.id !== idPin);
        salvaPlanimetriaSuGitHub();
        mappaPlan.closePopup();
    }
}

// ==========================================
// 3. LEGENDA (INVENTARIO AUTOMATICO)
// ==========================================

function toggleLegenda() {
    const panel = document.getElementById('plan-legenda-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function aggiornaLegenda() {
    const contenitore = document.getElementById('plan-legenda-content');
    if (!contenitore || !planData.schede) return;

    // Calcola totale per ogni scheda su tutta la nave
    let conteggi = {};
    planData.livelli.forEach(liv => {
        if (liv.pins) {
            liv.pins.forEach(p => {
                conteggi[p.schedaId] = (conteggi[p.schedaId] || 0) + 1;
            });
        }
    });

    let html = '';
    let totaleOggetti = 0;

    for (const [id, scheda] of Object.entries(planData.schede)) {
        const count = conteggi[id] || 0;
        if (count > 0) {
            totaleOggetti += count;
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 4px;">
                    <div style="display:flex; align-items:center; gap:10px; color:var(--text-main);">
                        <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; background:${scheda.colore}; color:white; border-radius:50%; font-size:10px;"><i class="fa-solid ${scheda.icona}"></i></span>
                        <span style="font-weight: 500;">${scheda.nome}</span>
                    </div>
                    <strong style="color: var(--primary); font-size: 15px;">${count}</strong>
                </div>
            `;
        }
    }

    if (totaleOggetti === 0) {
        html = `<div style="text-align:center; color:var(--text-muted); font-size:12px;">Nessun elemento piazzato.</div>`;
    }

    contenitore.innerHTML = html;
}

// ==========================================
// 4. LIVELLI (PONTI)
// ==========================================

function apriModaleLivelli() {
    let html = `
        <h3 style="margin-bottom: 15px; color: var(--primary);"><i class="fa-solid fa-layer-group"></i> Ponti / Livelli</h3>
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom: 20px;">
    `;
    
    planData.livelli.forEach((liv, idx) => {
        const bg = idx === livelloCorrenteIdx ? 'var(--primary)' : 'var(--surface)';
        const color = idx === livelloCorrenteIdx ? 'white' : 'var(--text-main)';
        html += `
            <button onclick="window.Plan.cambiaLivello(${idx})" style="background:${bg}; color:${color}; padding:12px; border:1px solid var(--border-color); border-radius:8px; text-align:left; font-weight:bold; font-size:15px; cursor:pointer;">
                ${liv.nome}
            </button>
        `;
    });

    html += `</div>`;

    if (isEditMode) {
        html += `
            <div style="border-top: 2px solid var(--border-color); padding-top: 15px;">
                <p style="font-size: 13px; font-weight: bold; margin-bottom:8px;">Aggiungi Nuovo Ponte (Immagine JPG)</p>
                <input type="text" id="nuovo-livello-nome" placeholder="es. Ponte Coperta" style="width:100%; padding:8px; box-sizing:border-box; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 10px;">
                <button onclick="document.getElementById('upload-livello-base').click()" style="width:100%; background:var(--success); color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-upload"></i> Carica Planimetria JPG</button>
                <input type="file" id="upload-livello-base" accept="image/jpeg, image/png" style="display:none;" onchange="window.Plan.aggiungiNuovoLivello(event)">
            </div>
        `;
    }

    mostraModale(html);
}

function cambiaLivello(idx) {
    livelloCorrenteIdx = idx;
    chiudiModaleGlobale();
    disegnaLivelloCorrente();
}

async function aggiungiNuovoLivello(event) {
    const file = event.target.files[0];
    const nomeLivello = document.getElementById('nuovo-livello-nome').value.trim();
    
    if (!file || !nomeLivello) { alert("Inserisci un nome e seleziona un file."); return; }

    const token = localStorage.getItem('gh_admin_token');
    const ext = file.name.split('.').pop().toLowerCase();
    const githubPath = `assets/planimetrie/${idPlanAttivo}_L${Date.now()}.${ext}`;
    
    chiudiModaleGlobale();
    // Mostra loading
    document.getElementById('plan-map-container').innerHTML = `<div style="text-align:center; padding-top:100px; color:var(--primary); font-weight:bold;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>Caricamento immagine in corso...</div>`;
    
    try {
        const reader = new FileReader();
        const base64Content = await new Promise((res, rej) => {
            reader.readAsDataURL(file);
            reader.onload = () => res(reader.result.split(',')[1]);
            reader.onerror = e => rej(e);
        });

        await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${githubPath}`, {
            method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Aggiunto livello ${nomeLivello}`, content: base64Content })
        });

        planData.livelli.push({ nome: nomeLivello, imgUrl: githubPath, pins: [] });
        livelloCorrenteIdx = planData.livelli.length - 1; // Spostati sul nuovo
        
        // Ricrea mappa che avevamo distrutto col loading
        document.getElementById('plan-map-container').innerHTML = '';
        setTimeout(() => {
            mappaPlan.invalidateSize();
            await salvaPlanimetriaSuGitHub(); 
        }, 100);
        
    } catch(e) {
        alert("Errore upload livello.");
        disegnaLivelloCorrente();
    }
}


// ==========================================
// 5. GESTORE INVENTARIO (SCHEDE MASTER)
// ==========================================

function apriGestioneSchede() {
    let html = `
        <h3 style="margin-bottom: 15px; color: var(--primary);"><i class="fa-solid fa-boxes-stacked"></i> Inventario Elementi</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 15px;">Gli elementi creati qui possono essere posizionati più volte sulla mappa.</p>
        
        <button onclick="window.Plan.creaNuovaScheda()" style="width:100%; background:var(--success); color:white; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; margin-bottom: 20px;">
            <i class="fa-solid fa-plus"></i> Crea Nuovo Elemento
        </button>

        <div style="display:flex; flex-direction:column; gap:10px; max-height: 400px; overflow-y: auto;">
    `;

    for (const [id, scheda] of Object.entries(planData.schede)) {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background: var(--surface); border: 1px solid var(--border-color); padding: 10px; border-radius: 8px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; background:${scheda.colore}; color:white; border-radius:50%; font-size:12px;"><i class="fa-solid ${scheda.icona}"></i></span>
                    <span style="font-weight: 600; font-size: 14px;">${scheda.nome}</span>
                </div>
                <div style="display:flex; gap: 5px;">
                    <button class="icon-btn" onclick="window.Plan.attivaDropPin('${id}')" style="background:var(--warning); color:#000; border:none; padding:6px; border-radius:6px;" title="Posiziona sulla mappa"><i class="fa-solid fa-crosshairs"></i> Piatta</button>
                    <button class="icon-btn" onclick="window.Plan.apriEditorScheda('${id}')" style="background:var(--primary); color:white; border:none; padding:6px; border-radius:6px;" title="Modifica Scheda"><i class="fa-solid fa-pen"></i></button>
                </div>
            </div>
        `;
    }
    html += `</div>`;
    mostraModale(html);
}

function creaNuovaScheda() {
    const id = 'sch_' + Date.now();
    planData.schede[id] = {
        nome: "Nuovo Elemento",
        icona: "fa-circle-info",
        colore: "#3388ff",
        testo_html: "<p>Dettagli...</p>",
        media: []
    };
    apriEditorScheda(id);
}

function apriEditorScheda(id) {
    const s = planData.schede[id];
    let html = `
        <h3 style="margin-bottom: 15px; color: var(--primary);"><i class="fa-solid fa-pen-to-square"></i> Modifica: ${s.nome}</h3>
        
        <label style="font-size:11px; font-weight:600;">Nome Elemento</label>
        <input type="text" id="sch-nome" value="${s.nome}" style="width:100%; padding:8px; margin-bottom:10px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">
        
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <div style="flex:1;">
                <label style="font-size:11px; font-weight:600;">Classe Icona (es. fa-fire)</label>
                <input type="text" id="sch-icona" value="${s.icona}" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">
            </div>
            <div style="flex:1;">
                <label style="font-size:11px; font-weight:600;">Colore Esadecimale</label>
                <input type="color" id="sch-colore" value="${s.colore}" style="width:100%; height:34px; padding:2px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">
            </div>
        </div>

        <label style="font-size:11px; font-weight:600;">Testo Descrittivo</label>
        <div style="display:flex; gap: 5px; margin-bottom: 5px; background: #f0f0f0; padding: 5px; border-radius: 4px;">
            <button onclick="document.execCommand('bold', false, null)" style="background:transparent; border:none; padding:5px; cursor:pointer;"><i class="fa-solid fa-bold"></i></button>
            <button onclick="document.execCommand('formatBlock', false, 'H3')" style="background:transparent; border:none; padding:5px; cursor:pointer;"><i class="fa-solid fa-heading"></i></button>
            <button onclick="document.execCommand('insertUnorderedList', false, null)" style="background:transparent; border:none; padding:5px; cursor:pointer;"><i class="fa-solid fa-list-ul"></i></button>
        </div>
        <div id="sch-testo" contenteditable="true" style="width:100%; min-height: 120px; padding:10px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box; margin-bottom:15px; background: white; font-size:14px;">${s.testo_html}</div>

        <div style="display:flex; justify-content:space-between; margin-bottom: 20px;">
            <button onclick="document.getElementById('upload-media-plan').click()" style="background:var(--primary); color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-photo-film"></i> Immagine/Video</button>
            <button onclick="document.getElementById('upload-pdf-plan').click()" style="background:var(--danger); color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-file-pdf"></i> PDF</button>
            
            <input type="file" id="upload-media-plan" accept="image/*, video/*" style="display:none;" onchange="window.Plan.gestisciUploadMediaPlan(event, 'media', '${id}')">
            <input type="file" id="upload-pdf-plan" accept="application/pdf" style="display:none;" onchange="window.Plan.gestisciUploadMediaPlan(event, 'pdf', '${id}')">
        </div>

        <div id="sch-gallery" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
            ${generaHtmlGalleria(s.media, true, id)}
        </div>

        <div style="display:flex; gap:10px; margin-top: 20px;">
            <button onclick="window.Plan.apriGestioneSchede()" style="flex:1; background:var(--surface); color:var(--text-main); border:1px solid var(--border-color); padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;">Annulla</button>
            <button onclick="window.Plan.eliminaScheda('${id}')" style="background:var(--danger); color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            <button id="btn-salva-scheda" onclick="window.Plan.salvaScheda('${id}')" style="flex:2; background:var(--success); color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-floppy-disk"></i> Salva Modifiche</button>
        </div>
    `;
    mostraModale(html);
}

async function salvaScheda(id) {
    const s = planData.schede[id];
    s.nome = document.getElementById('sch-nome').value.trim();
    s.icona = document.getElementById('sch-icona').value.trim();
    s.colore = document.getElementById('sch-colore').value;
    s.testo_html = document.getElementById('sch-testo').innerHTML;

    await salvaPlanimetriaSuGitHub(true);
    apriGestioneSchede(); 
}

function attivaDropPin(idScheda) {
    chiudiModaleGlobale();
    statoDropPin = idScheda;
    document.getElementById('plan-drop-indicator').style.display = 'block';
    document.getElementById('plan-map-container').style.cursor = 'crosshair';
}

async function eliminaScheda(id) {
    if(!confirm("Sicuro? La scheda verrà eliminata insieme a TUTTI i pin collegati su tutti i ponti.")) return;
    
    delete planData.schede[id];
    // Pulisce anche i pin orfani
    planData.livelli.forEach(liv => {
        if(liv.pins) liv.pins = liv.pins.filter(p => p.schedaId !== id);
    });

    await salvaPlanimetriaSuGitHub(true);
    apriGestioneSchede();
}

// ==========================================
// 6. SCHEDA VIEWER (LETTURA)
// ==========================================

function apriSchedaViewer(id) {
    const s = planData.schede[id];
    if(!s) return;

    // Converte Magic Links e Numeri Media
    let formattato = s.testo_html || "";
    formattato = formattato.replace(/\((immagine|video|pdf)\s+(\d+)\)/gi, (match, tipo, num) => {
        const index = parseInt(num) - 1;
        return `<a href="#" onclick="window.Plan.apriViewerPlan('${id}', ${index}); return false;" style="color: var(--primary); font-weight: 700; text-decoration: underline; background: rgba(0,102,204,0.1); padding: 2px 6px; border-radius: 6px;">${match}</a>`;
    });
    formattato = formattato.replace(/link:([^\s<]+)/gi, (match, url) => {
        let href = url;
        if (!href.startsWith('http')) href = 'https://' + href;
        return `<a href="${href}" target="_blank" style="color: var(--primary); font-weight: 600; text-decoration: underline;"><i class="fa-solid fa-link" style="font-size: 13px;"></i> ${url}</a>`;
    });

    let html = `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom: 20px; border-bottom: 2px solid var(--border-color); padding-bottom:10px;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; background:${s.colore}; color:white; border-radius:50%; font-size:16px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fa-solid ${s.icona}"></i></span>
            <h2 style="color: var(--primary); margin:0;">${s.nome}</h2>
        </div>
        
        <div style="font-size: 15px; line-height: 1.6; color: var(--text-main); margin-bottom: 25px;">
            ${formattato}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${generaHtmlGalleria(s.media, false, id)}
        </div>
        
        <button onclick="window.chiudiModaleGlobale()" style="width:100%; margin-top:20px; background:var(--surface); color:var(--text-main); border:1px solid var(--border-color); padding:12px; border-radius:8px; font-weight:bold; cursor:pointer;">Chiudi</button>
    `;

    mostraModale(html);
}

// ==========================================
// 7. GESTIONE UPLOAD MEDIA E GALLERIA
// ==========================================

async function gestisciUploadMediaPlan(event, cartellaTarget, idScheda) {
    const file = event.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('gh_admin_token');
    if (!token) return;

    const btnSalva = document.getElementById('btn-salva-scheda');
    const txtOriginale = btnSalva.innerHTML;
    btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Upload in corso...`;
    btnSalva.disabled = true;

    try {
        const extension = file.name.split('.').pop().toLowerCase();
        const newFilename = `plan_${idPlanAttivo}_${Date.now()}.${extension}`;
        const subfolder = cartellaTarget === 'pdf' ? 'pdf_vademecum' : 'media_vademecum';
        const githubPath = `assets/${subfolder}/${newFilename}`;

        const reader = new FileReader();
        const base64Content = await new Promise((res, rej) => {
            reader.readAsDataURL(file);
            reader.onload = () => res(reader.result.split(',')[1]);
            reader.onerror = e => rej(e);
        });

        await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${githubPath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Media planimetria ${idPlanAttivo}`, content: base64Content })
        });

        if (!planData.schede[idScheda].media) planData.schede[idScheda].media = [];
        planData.schede[idScheda].media.push(githubPath);
        
        // Aggiorna l'HTML della galleria visivamente per chi sta editando
        document.getElementById('sch-gallery').innerHTML = generaHtmlGalleria(planData.schede[idScheda].media, true, idScheda);

    } catch (e) { alert("Errore caricamento media."); }
    finally {
        btnSalva.innerHTML = txtOriginale;
        btnSalva.disabled = false;
        event.target.value = ""; 
    }
}

function generaHtmlGalleria(mediaArray, isEdit, idScheda) {
    if(!mediaArray) return '';
    let html = '';
    
    mediaArray.forEach((path, index) => {
        const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${path}`;
        const filename = path.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        
        const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
        const isPdf = ext === 'pdf';
        const numeroVisuale = index + 1;

        html += `<div style="position: relative; border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); ${isPdf ? 'grid-column: 1 / -1;' : ''}">`;
        
        if (isPdf) {
            html += `
                <div style="display:flex; background:var(--surface);">
                    <a href="./${path}" target="_blank" style="flex:1; padding:14px; display:flex; align-items:center; gap:12px; text-decoration:none; color:var(--text-main);">
                        <i class="fa-solid fa-file-pdf" style="font-size: 24px; color: var(--danger);"></i>
                        <span style="font-size: 15px; font-weight: 600;">PDF ${numeroVisuale}</span>
                    </a>
                    <div style="border-left: 1px solid var(--border-color); display:flex;">
                        ${isEdit 
                            ? `<button onclick="window.Plan.eliminaMediaPlan('${idScheda}', ${index})" style="background:transparent; border:none; color:var(--danger); width:50px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>`
                            : `<button onclick="window.Plan.scaricaFilePlan('./${path}', '${filename}')" style="background:transparent; border:none; color:var(--success); width:50px; cursor:pointer;"><i class="fa-solid fa-download"></i></button>`
                        }
                    </div>
                </div>
            `;
        } else {
            const mediaTag = isVideo 
                ? `<video src="${rawUrl}" style="width: 100%; height: 120px; object-fit: cover; display: block;"></video><i class="fa-solid fa-play" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white; font-size:30px; text-shadow: 0 2px 4px rgba(0,0,0,0.6); pointer-events:none;"></i>`
                : `<img src="${rawUrl}" style="width: 100%; height: 120px; object-fit: cover; display: block;">`;

            html += `
                <div style="position: absolute; top: 6px; left: 6px; background: var(--primary); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; z-index: 15;">${numeroVisuale}</div>
                <div onclick="window.Plan.apriViewerPlan('${idScheda}', ${index})" style="cursor: pointer; position: relative;">${mediaTag}</div>
                ${isEdit 
                    ? `<button onclick="window.Plan.eliminaMediaPlan('${idScheda}', ${index})" style="position:absolute; top:5px; right:5px; background:var(--danger); color:white; border:2px solid white; border-radius:50%; width:30px; height:30px; cursor:pointer; z-index:10;"><i class="fa-solid fa-trash" style="font-size:11px;"></i></button>`
                    : `<button onclick="window.Plan.scaricaFilePlan('./${path}', '${filename}')" style="position:absolute; top:5px; right:5px; background:var(--surface); color:var(--text-main); border:1px solid var(--border-color); border-radius:50%; width:30px; height:30px; cursor:pointer; z-index:10;"><i class="fa-solid fa-download" style="font-size:11px;"></i></button>`
                }
            `;
        }
        html += `</div>`;
    });
    
    return html;
}

window.scaricaFilePlan = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); window.URL.revokeObjectURL(urlBlob);
    } catch(e) { window.open(url, '_blank'); }
}

function eliminaMediaPlan(idScheda, mediaIndex) {
    if(!confirm("Eliminare il file dal server?")) return;
    planData.schede[idScheda].media.splice(mediaIndex, 1);
    document.getElementById('sch-gallery').innerHTML = generaHtmlGalleria(planData.schede[idScheda].media, true, idScheda);
}

// ==========================================
// 8. VIEWER INTERNO E SISTEMA MODALI GLOBALI
// ==========================================

function creaContenitoreModali() {
    if (!document.getElementById('plan-modal-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'plan-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'display:none; align-items:center; justify-content:center; padding: 20px; z-index: 2500; background: rgba(0,0,0,0.7);';
        
        overlay.innerHTML = `
            <div id="plan-modal-box" style="background: var(--surface); width: 100%; max-width: 500px; border-radius: 16px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-height: 90vh; overflow-y: auto; position: relative;">
                <button onclick="window.chiudiModaleGlobale()" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 24px; color: var(--text-muted); cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                <div id="plan-modal-content"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        window.chiudiModaleGlobale = () => {
            document.getElementById('plan-modal-overlay').style.display = 'none';
            document.getElementById('plan-modal-content').innerHTML = '';
        };
    }
}

function mostraModale(html) {
    document.getElementById('plan-modal-content').innerHTML = html;
    document.getElementById('plan-modal-overlay').style.display = 'flex';
}

function apriViewerPlan(idScheda, index) {
    const s = planData.schede[idScheda];
    const path = s.media[index];
    const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${path}`;
    const ext = path.split('.').pop().toLowerCase();
    
    // Riusa il viewer dello script vd_scheda.js (che supporta pinch-to-zoom)
    if (window.creaViewerSeMancante) {
        window.creaViewerSeMancante();
        const contentDiv = document.getElementById('vd-media-viewer-content');
        if (['mp4', 'webm', 'mov'].includes(ext)) {
            contentDiv.innerHTML = `<video src="${rawUrl}" controls autoplay playsinline style="max-width: 100vw; max-height: 100vh; object-fit: contain;"></video>`;
        } else {
            contentDiv.innerHTML = `<img id="vd-viewer-img" src="${rawUrl}" style="max-width: 100vw; max-height: 100vh; object-fit: contain; transform-origin: center center; transition: transform 0.2s ease-out;">`;
            if (window.inizializzaZoomImmagine) setTimeout(window.inizializzaZoomImmagine, 50);
        }
        document.getElementById('vd-media-viewer').style.display = 'flex';
    }
}
