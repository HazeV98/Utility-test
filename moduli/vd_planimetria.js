const GH_OWNER = "HazeV98"; 
const GH_REPO = "Utility-test";

let mappaPlan = null;
let markersLayer = null;
let imageOverlay = null;

let planData = { livelli: [], schedeNave: [] };
let inventarioGlobale = { 
    categorie: ['Sicurezza', 'Antincendio', 'Nautica', 'Primo Soccorso', 'Altro'], 
    schede: {},
    coloriCat: {} 
};

let fileShaAttuale = null;
let invShaAttuale = null;

let idPlanAttivo = null;
let isEditMode = false;
let globalIsAdminCollab = false;
let livelloCorrenteIdx = 0;
let statoDropPin = null; 

export async function inizializzaPlanimetria(containerId, planId, databaseIgnorato, isAdminOrCollab) {
    idPlanAttivo = planId;
    const token = localStorage.getItem('gh_admin_token');
    globalIsAdminCollab = isAdminOrCollab || (token ? true : false);
    isEditMode = false;
    statoDropPin = null;

    const container = document.getElementById(containerId);
    if (!container) return;
    container.parentElement.style.padding = "0"; 

    container.innerHTML = `
        <div id="plan-map-container" style="width: 100%; height: 100%; z-index: 1; background: #e0e0e0;"></div>
        
        <div id="plan-legenda-panel" style="display: none; position: absolute; top: max(15px, env(safe-area-inset-top)); right: 70px; background: var(--surface); padding: 15px; border-radius: 12px; box-shadow: var(--shadow-md); z-index: 1000; font-size: 13px; min-width: 230px; max-width: calc(100vw - 90px); box-sizing: border-box; max-height: 70vh; overflow-y: auto; border: 1px solid var(--border-color);">
            <div style="font-weight: 700; margin-bottom: 12px; color: var(--text-main); font-size: 14px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;"><i class="fa-solid fa-clipboard-list"></i> Inventario Unità</div>
            <div id="plan-legenda-content"></div>
        </div>

        <div style="position: absolute; top: max(15px, env(safe-area-inset-top)); right: 15px; z-index: 1000; display: flex; flex-direction: column; gap: 12px; align-items: center;">
            <button class="icon-btn fab-btn" title="Inventario" onclick="window.Plan.toggleLegenda()" style="width: 45px; height: 45px; border-radius: 50%; background: var(--surface); color: var(--primary); box-shadow: var(--shadow-md); border: 2px solid var(--border-color);">
                <i class="fa-solid fa-list"></i>
            </button>
            <button id="fab-livelli" class="icon-btn fab-btn" title="Cambia Livello" onclick="window.Plan.apriModaleLivelli()" style="width: 45px; height: 45px; border-radius: 50%; background: var(--surface); color: var(--text-main); box-shadow: var(--shadow-md); border: 2px solid var(--border-color); display: none;">
                <i class="fa-solid fa-layer-group"></i>
            </button>
            
            <button id="fab-edit-plan" class="icon-btn fab-btn" title="Attiva/Disattiva Modifica" onclick="window.Plan.toggleEditMode()" style="display: none; width: 45px; height: 45px; border-radius: 50%; background: var(--primary); color: white; box-shadow: var(--shadow-md); border: none;">
                <i class="fa-solid fa-pen" id="icon-edit-plan"></i>
            </button>

            <!-- Tasti visibili solo in modalità modifica -->
            <button id="fab-db-schede" class="icon-btn fab-btn" title="Database Schede" onclick="window.Plan.apriGestioneSchede()" style="display: none; width: 40px; height: 40px; border-radius: 50%; background: var(--surface); color: var(--primary); box-shadow: var(--shadow-md); border: 2px solid var(--border-color);">
                <i class="fa-solid fa-database"></i>
            </button>
            <button id="fab-add-pin" class="icon-btn fab-btn" title="Piazza Pin" onclick="window.Plan.apriSelezionePin()" style="display: none; width: 40px; height: 40px; border-radius: 50%; background: var(--warning); color: #000; box-shadow: var(--shadow-md); border: 2px solid var(--border-color);">
                <i class="fa-solid fa-map-pin"></i>
            </button>
        </div>

        <div id="plan-drop-indicator" style="display:none; position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: var(--warning); color: #000; padding: 10px 20px; border-radius: 20px; font-weight: bold; z-index: 2000; box-shadow: var(--shadow-md); pointer-events: none;">
            <i class="fa-solid fa-crosshairs"></i> Clicca sulla planimetria per piazzare l'elemento
        </div>
    `;

    window.Plan = { 
        toggleLegenda, apriModaleLivelli, toggleEditMode, cambiaLivello, eliminaLivello,
        apriGestioneSchede, apriSelezionePin, creaNuovaScheda, apriEditorScheda, salvaScheda, eliminaSchedaGlobale,
        toggleSchedaNave, chiediQuantitaPin, componiContenitore, salvaContenitore, apriVisualizzatorePin,
        apriSchedaViewer, salvaPlanimetriaSuGitHub, gestisciUploadMediaPlan,
        eliminaMediaPlan, scaricaFilePlan, apriViewerPlan, aggiungiNuovoLivello, eliminaPin, 
        aggiungiCategoria, salvaDimensionePin, cambiaColoreDaCategoria
    };

    if (globalIsAdminCollab) document.getElementById('fab-edit-plan').style.display = 'flex';

    if (mappaPlan) mappaPlan.remove(); 
    // zoomSnap: 0 è FONDAMENTALE affinchè l'immagine si adatti allo schermo senza "scatti" che la rendono minuscola
    mappaPlan = L.map('plan-map-container', { crs: L.CRS.Simple, minZoom: -4, zoomControl: false, zoomSnap: 0 });
    L.control.zoom({ position: 'topleft' }).addTo(mappaPlan);
    markersLayer = L.layerGroup().addTo(mappaPlan);

    mappaPlan.on('click', (e) => {
        if (statoDropPin && isEditMode) {
            const { lat, lng } = e.latlng;
            planData.livelli[livelloCorrenteIdx].pins.push({
                id: 'pin_' + Date.now(),
                lat: lat,
                lng: lng,
                tipo: statoDropPin.tipo,
                nomeContenitore: statoDropPin.nomeContenitore,
                elementi: statoDropPin.elementi,
                size: 20 
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
// CARICAMENTO DATI IN TEMPO REALE (API)
// ==========================================
async function caricaDatiPlanimetria() {
    const token = localStorage.getItem('gh_admin_token');
    
    // 1. CARICAMENTO INVENTARIO GLOBALE
    let invCaricatoViaApi = false;
    if (globalIsAdminCollab && token) {
        try {
            const resAPI = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/planimetrie/inventario_globale.json`, { headers: { 'Authorization': `token ${token}` } });
            if (resAPI.ok) {
                const data = await resAPI.json();
                invShaAttuale = data.sha;
                const parsed = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                if(parsed.categorie) inventarioGlobale.categorie = parsed.categorie;
                if(parsed.schede) inventarioGlobale.schede = parsed.schede;
                if(parsed.coloriCat) inventarioGlobale.coloriCat = parsed.coloriCat;
                invCaricatoViaApi = true;
            }
        } catch(e) {}
    }
    
    if (!invCaricatoViaApi) {
        try {
            let resInv = await fetch(`./assets/planimetrie/inventario_globale.json?t=${Date.now()}`);
            if (!resInv.ok) resInv = await fetch(`https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/assets/planimetrie/inventario_globale.json?t=${Date.now()}`);
            if (resInv.ok) {
                const invData = await resInv.json();
                if(invData.categorie) inventarioGlobale.categorie = invData.categorie;
                if(invData.schede) inventarioGlobale.schede = invData.schede;
                if(invData.coloriCat) inventarioGlobale.coloriCat = invData.coloriCat;
            }
        } catch(e) {}
    }

    // 2. CARICAMENTO PLANIMETRIA LOCALE NAVE
    let planCaricataViaApi = false;
    if (globalIsAdminCollab && token) {
        try {
            const resAPI = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/planimetrie/${idPlanAttivo}.json`, { headers: { 'Authorization': `token ${token}` } });
            if (resAPI.ok) {
                const data = await resAPI.json();
                fileShaAttuale = data.sha;
                planData = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                if (!planData.livelli) planData.livelli = [];
                if (!planData.schedeNave) planData.schedeNave = [];
                planCaricataViaApi = true;
            }
        } catch(e) {}
    }

    if (!planCaricataViaApi) {
        try {
            let response = await fetch(`./assets/planimetrie/${idPlanAttivo}.json?t=${Date.now()}`);
            if (!response.ok) response = await fetch(`https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/assets/planimetrie/${idPlanAttivo}.json?t=${Date.now()}`);

            if (response.ok) {
                planData = await response.json();
                if (!planData.livelli) planData.livelli = [];
                if (!planData.schedeNave) planData.schedeNave = [];
            }
        } catch (error) {
            planData = { livelli: [], schedeNave: [] };
        }
    }
        
    await migrazioneVecchiDati(token); 
    disegnaLivelloCorrente();
    aggiornaLegenda();
}

async function migrazioneVecchiDati(token) {
    let salvaGlo = false, salvaLoc = false;

    if (!planData.schedeNave) { planData.schedeNave = []; salvaLoc = true; }

    if (planData.schede) {
        for (const [id, sch] of Object.entries(planData.schede)) {
            if (!inventarioGlobale.schede[id]) {
                sch.categoria = 'Altro'; 
                inventarioGlobale.schede[id] = sch;
                salvaGlo = true;
            }
        }
        delete planData.schede;
        salvaLoc = true;
    }

    planData.livelli.forEach(liv => {
        if(liv.pins) {
            liv.pins.forEach(p => {
                if(p.schedaId && !p.tipo) {
                    p.tipo = 'singolo'; p.elementi = [{ schedaId: p.schedaId, qta: 1 }];
                    delete p.schedaId; salvaLoc = true;
                }
                if(!p.size) { p.size = 20; salvaLoc = true; } 
                p.elementi.forEach(el => {
                    if (!planData.schedeNave.includes(el.schedaId)) {
                        planData.schedeNave.push(el.schedaId);
                        salvaLoc = true;
                    }
                });
            });
        }
    });

    if (globalIsAdminCollab && token) {
        if (salvaGlo) await salvaInventarioGlobaleSuGitHub();
        if (salvaLoc) await salvaPlanimetriaSuGitHub();
    }
}

// ==========================================
// RENDER MAPPA E PIN
// ==========================================
function disegnaLivelloCorrente() {
    if (imageOverlay) mappaPlan.removeLayer(imageOverlay);
    markersLayer.clearLayers();

    const btnLivelli = document.getElementById('fab-livelli');
    if (planData.livelli.length > 0) {
        btnLivelli.style.display = 'flex';
        if(livelloCorrenteIdx >= planData.livelli.length) livelloCorrenteIdx = planData.livelli.length - 1;
        
        const livello = planData.livelli[livelloCorrenteIdx];
        const rawImgUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${livello.imgUrl}`;
        
        const img = new Image();
        img.onload = function() {
            const w = this.width, h = this.height;
            const bounds = [[0, 0], [h, w]];
            imageOverlay = L.imageOverlay(rawImgUrl, bounds).addTo(mappaPlan);
            
            // padding [0, 0] fa sì che la mappa copra l'area disponibile in modo ottimale
            mappaPlan.fitBounds(bounds, { padding: [0, 0], animate: false });
            mappaPlan._hasSetInitialView = true;

            if (livello.pins) {
                livello.pins.forEach(pin => {
                    let pinName = '';
                    let size = pin.size || 20;
                    let fontSize = size * 0.45; 
                    let baseIconHtml = '';

                    if (pin.tipo === 'contenitore') {
                        baseIconHtml = `<div style="background-color: #546e7a; width: ${size}px; height: ${size}px; border-radius: 8px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 8px rgba(0,0,0,0.5); font-size: ${fontSize}px;"><i class="fa-solid fa-box-open"></i></div>`;
                        pinName = pin.nomeContenitore;
                    } else {
                        const scheda = inventarioGlobale.schede[pin.elementi[0].schedaId];
                        if (!scheda) return;
                        const faClass = scheda.icona.includes('fa-') ? scheda.icona : `fa-solid ${scheda.icona}`;
                        baseIconHtml = `<div style="background-color: ${scheda.colore}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 8px rgba(0,0,0,0.5); font-size: ${fontSize}px;"><i class="${faClass}"></i></div>`;
                        pinName = scheda.nome;
                    }

                    let finalIconHtml = baseIconHtml;
                    let clickAreaSize = size;
                    
                    if (isEditMode) {
                        // Ridotto il cerchio di trascinamento: ora sporge di soli 8px per lato
                        clickAreaSize = size + 16; 
                        finalIconHtml = `
                            <div style="width: ${clickAreaSize}px; height: ${clickAreaSize}px; border-radius: 50%; border: 2px dashed var(--primary); background: rgba(0, 102, 204, 0.15); display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
                                ${baseIconHtml}
                            </div>
                        `;
                    }

                    const marker = L.marker([pin.lat, pin.lng], {
                        icon: L.divIcon({ 
                            html: finalIconHtml, 
                            className: '', 
                            iconSize: [clickAreaSize, clickAreaSize], 
                            iconAnchor: [clickAreaSize/2, clickAreaSize/2] 
                        }),
                        draggable: isEditMode
                    }).addTo(markersLayer);

                    if (isEditMode) {
                        marker.on('dragend', function(e) {
                            const newPos = marker.getLatLng();
                            pin.lat = newPos.lat; pin.lng = newPos.lng;
                            salvaPlanimetriaSuGitHub();
                        });
                        
                        marker.bindPopup(`
                            <div style="text-align:center; min-width: 170px; padding: 5px;">
                                <strong style="font-size:14px; color:var(--primary);">${pinName}</strong><br>
                                
                                <div style="margin: 12px 0; font-size:12px; color:var(--text-main); background: var(--surface); padding: 8px; border-radius: 6px; border: 1px dashed var(--border-color);">
                                    <i class="fa-solid fa-up-down-left-right" style="color:var(--primary); margin-right:5px;"></i> Trascina l'area tratteggiata per spostare
                                </div>
                                
                                <div style="margin: 15px 0 20px 0; text-align: left;">
                                    <label style="font-size:11px; font-weight:bold; color:var(--text-main);">Scala Icona: <span id="val-size-${pin.id}">${size}</span>px</label>
                                    <input type="range" min="10" max="60" value="${size}" oninput="document.getElementById('val-size-${pin.id}').innerText=this.value" onchange="window.Plan.salvaDimensionePin('${pin.id}', this.value)" style="width:100%; margin-top:5px;">
                                </div>
                                
                                <button onclick="window.Plan.eliminaPin('${pin.id}')" style="background:var(--danger); color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; width:100%; font-weight:bold;"><i class="fa-solid fa-trash"></i> Elimina</button>
                            </div>
                        `);
                    } else {
                        marker.on('click', () => apriVisualizzatorePin(pin));
                    }
                });
            }
        };
        img.src = rawImgUrl;
    } else {
        btnLivelli.style.display = 'none';
        if (isEditMode) apriModaleLivelli(); 
    }
}

// ==========================================
// SALVATAGGI
// ==========================================
async function salvaInventarioGlobaleSuGitHub() {
    const token = localStorage.getItem('gh_admin_token');
    if (!token) return;
    try {
        const urlAPI = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/planimetrie/inventario_globale.json`;
        const payload = { message: `Aggiornato Inventario Globale`, content: btoa(unescape(encodeURIComponent(JSON.stringify(inventarioGlobale, null, 2)))) };
        if (invShaAttuale) payload.sha = invShaAttuale;
        const res = await fetch(urlAPI, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) invShaAttuale = (await res.json()).content.sha; 
    } catch(e) {}
}

async function salvaPlanimetriaSuGitHub(mostraCaricamento = false) {
    const token = localStorage.getItem('gh_admin_token');
    if (!token) return alert("Manca il token PAT Admin!");
    
    const btnSalva = document.getElementById('btn-salva-scheda');
    if(mostraCaricamento && btnSalva) { btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...`; btnSalva.disabled = true; }

    try {
        const payload = { message: `Aggiornata planimetria ${idPlanAttivo}`, content: btoa(unescape(encodeURIComponent(JSON.stringify(planData, null, 2)))) };
        if (fileShaAttuale) payload.sha = fileShaAttuale;
        
        const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/planimetrie/${idPlanAttivo}.json`, {
            method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error("Errore salvataggio planimetria");
        
        fileShaAttuale = (await res.json()).content.sha; 
        aggiornaLegenda(); 
        disegnaLivelloCorrente();
    } catch(e) { console.error("Errore salvataggio", e); } 
    finally {
        if(mostraCaricamento && btnSalva) { btnSalva.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salva Modifiche`; btnSalva.disabled = false; }
    }
}

function salvaDimensionePin(idPin, newSize) {
    const pin = planData.livelli[livelloCorrenteIdx].pins.find(p => p.id === idPin);
    if (pin) {
        pin.size = parseInt(newSize);
        salvaPlanimetriaSuGitHub(); 
    }
}

// ==========================================
// LEGENDA E TOGGLE MODALITÀ
// ==========================================
function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('fab-edit-plan');
    const icon = document.getElementById('icon-edit-plan');
    const fabDb = document.getElementById('fab-db-schede');
    const fabAdd = document.getElementById('fab-add-pin');
    
    if (isEditMode) {
        btn.style.background = 'var(--success)'; 
        icon.className = "fa-solid fa-check";
        fabDb.style.display = 'flex';
        fabAdd.style.display = 'flex';
    } else {
        btn.style.background = 'var(--primary)'; 
        icon.className = "fa-solid fa-pen";
        fabDb.style.display = 'none';
        fabAdd.style.display = 'none';
        chiudiModaleGlobale(); 
        statoDropPin = null;
        document.getElementById('plan-drop-indicator').style.display = 'none';
        document.getElementById('plan-map-container').style.cursor = 'grab';
    }
    disegnaLivelloCorrente(); 
}

function toggleLegenda() {
    const panel = document.getElementById('plan-legenda-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function aggiornaLegenda() {
    const contenitore = document.getElementById('plan-legenda-content');
    if (!contenitore || !inventarioGlobale.schede || !planData.schedeNave) return;

    let conteggi = {};
    planData.livelli.forEach(liv => {
        if (liv.pins) {
            liv.pins.forEach(p => {
                p.elementi.forEach(el => { conteggi[el.schedaId] = (conteggi[el.schedaId] || 0) + parseInt(el.qta); });
            });
        }
    });

    let html = '';
    
    planData.schedeNave.forEach(id => {
        const scheda = inventarioGlobale.schede[id];
        if (scheda) {
            const count = conteggi[id] || 0;
            const opacita = count === 0 ? 'opacity: 0.6;' : ''; 
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 4px; ${opacita}">
                    <div style="display:flex; align-items:center; gap:10px; color:var(--text-main);">
                        <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; background:${scheda.colore}; color:white; border-radius:50%; font-size:10px;"><i class="${scheda.icona.includes('fa-') ? scheda.icona : 'fa-solid ' + scheda.icona}"></i></span>
                        <span style="font-weight: 500;">${scheda.nome}</span>
                    </div>
                    <strong style="color: var(--primary); font-size: 15px;">x${count}</strong>
                </div>
            `;
        }
    });

    if (planData.schedeNave.length === 0) html = `<div style="text-align:center; color:var(--text-muted); font-size:12px;">Nessuna dotazione associata a questa unità.</div>`;
    contenitore.innerHTML = html;
}

// ==========================================
// EDITOR INVENTARIO GLOBALE
// ==========================================
function apriGestioneSchede() {
    let html = `
        <h3 style="margin-bottom: 5px; color: var(--primary);"><i class="fa-solid fa-database"></i> Database Schede</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 15px;">Gestisci le dotazioni globali e aggiungile <b>(+)</b> alla nave corrente.</p>
        
        <button onclick="window.Plan.creaNuovaScheda()" style="width:100%; background:var(--primary); color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; margin-bottom: 20px;"><i class="fa-solid fa-file-circle-plus"></i> Crea Nuova Scheda</button>
        <div style="max-height: 50vh; overflow-y: auto; padding-right:5px;">
    `;

    inventarioGlobale.categorie.forEach(cat => {
        const schedeInCat = Object.entries(inventarioGlobale.schede).filter(([id, s]) => s.categoria === cat);
        if(schedeInCat.length > 0) {
            html += `<h4 style="margin-top:15px; margin-bottom:8px; color:var(--text-main); border-bottom:2px solid var(--border-color); padding-bottom:3px;">${cat}</h4>`;
            schedeInCat.forEach(([id, scheda]) => {
                const isAdded = planData.schedeNave.includes(id);
                
                let btnAggiungiRimuovi = isAdded 
                    ? `<button class="icon-btn" onclick="window.Plan.toggleSchedaNave('${id}')" style="background:var(--danger); color:white; border:none; padding:6px; border-radius:6px;" title="Rimuovi da questa nave"><i class="fa-solid fa-minus"></i></button>`
                    : `<button class="icon-btn" onclick="window.Plan.toggleSchedaNave('${id}')" style="background:var(--success); color:white; border:none; padding:6px; border-radius:6px;" title="Aggiungi all'inventario di questa nave"><i class="fa-solid fa-plus"></i></button>`;

                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background: var(--surface); border: 1px solid ${isAdded ? 'var(--primary)' : 'var(--border-color)'}; padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; background:${scheda.colore}; color:white; border-radius:50%; font-size:12px;"><i class="${scheda.icona.includes('fa-') ? scheda.icona : 'fa-solid ' + scheda.icona}"></i></span>
                            <span style="font-weight: 600; font-size: 14px; color:var(--text-main);">${scheda.nome}</span>
                        </div>
                        <div style="display:flex; gap: 5px;">
                            ${btnAggiungiRimuovi}
                            <div style="width: 1px; background: var(--border-color); margin: 0 5px;"></div>
                            <button class="icon-btn" onclick="window.Plan.apriEditorScheda('${id}')" style="background:var(--surface); color:var(--text-main); border:1px solid var(--border-color); padding:6px; border-radius:6px;" title="Modifica Scheda Globale"><i class="fa-solid fa-pen"></i></button>
                        </div>
                    </div>
                `;
            });
        }
    });

    html += `</div>`;
    mostraModale(html);
}

function toggleSchedaNave(id) {
    if (planData.schedeNave.includes(id)) {
        if (confirm("Vuoi rimuovere questo elemento dall'inventario della nave? Verranno eliminati automaticamente anche i relativi pin dalla planimetria.")) {
            planData.schedeNave = planData.schedeNave.filter(s => s !== id);
            planData.livelli.forEach(liv => {
                if (liv.pins) {
                    liv.pins.forEach(p => { p.elementi = p.elementi.filter(el => el.schedaId !== id); });
                    liv.pins = liv.pins.filter(p => p.elementi.length > 0);
                }
            });
            salvaPlanimetriaSuGitHub(); apriGestioneSchede();
        }
    } else {
        planData.schedeNave.push(id);
        salvaPlanimetriaSuGitHub(); apriGestioneSchede();
    }
}

// ==========================================
// AGGIUNTA PIN ALLA MAPPA
// ==========================================
function apriSelezionePin() {
    if(planData.schedeNave.length === 0) return alert("Aggiungi prima delle dotazioni dal Database Schede.");

    let html = `
        <h3 style="margin-bottom: 5px; color: var(--primary);"><i class="fa-solid fa-map-pin"></i> Posiziona Elemento</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 15px;">Scegli un elemento dall'inventario della nave da piazzare sulla mappa.</p>
        
        <button onclick="window.Plan.componiContenitore()" style="width:100%; background:#546e7a; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; margin-bottom: 20px;"><i class="fa-solid fa-box-open"></i> Crea Pin Multiplo (Contenitore)</button>
        
        <div style="max-height: 50vh; overflow-y: auto; padding-right:5px;">
    `;

    planData.schedeNave.forEach(id => {
        const scheda = inventarioGlobale.schede[id];
        if (scheda) {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background: var(--surface); border: 1px solid var(--border-color); padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; background:${scheda.colore}; color:white; border-radius:50%; font-size:12px;"><i class="${scheda.icona.includes('fa-') ? scheda.icona : 'fa-solid ' + scheda.icona}"></i></span>
                        <span style="font-weight: 600; font-size: 14px; color:var(--text-main);">${scheda.nome}</span>
                    </div>
                    <!-- Tasto Posiziona solo con l'icona mirino -->
                    <button class="icon-btn" onclick="window.Plan.chiediQuantitaPin('${id}')" style="background:var(--warning); color:#000; border:none; padding:8px 12px; border-radius:6px;" title="Posiziona Pin in Mappa"><i class="fa-solid fa-crosshairs"></i></button>
                </div>
            `;
        }
    });

    html += `</div>`;
    mostraModale(html);
}

function chiediQuantitaPin(idScheda) {
    const qta = prompt("Quanti pezzi di questo elemento ci sono in questo punto?", "1");
    if (qta && !isNaN(qta) && parseInt(qta) > 0) {
        chiudiModaleGlobale();
        statoDropPin = { tipo: 'singolo', nomeContenitore: null, elementi: [{ schedaId: idScheda, qta: parseInt(qta) }] };
        document.getElementById('plan-drop-indicator').style.display = 'block';
        document.getElementById('plan-map-container').style.cursor = 'crosshair';
    }
}

function componiContenitore() {
    let html = `
        <h3 style="margin-bottom: 15px; color: #546e7a;"><i class="fa-solid fa-box-open"></i> Crea Pin Contenitore</h3>
        <input type="text" id="cont-nome" placeholder="Es. Cassetta Sicurezza Prua" style="width:100%; padding:10px; margin-bottom:15px; border-radius:6px; border:1px solid #ccc; box-sizing:border-box; font-weight:bold;">
        <p style="font-size: 13px; font-weight:bold; margin-bottom:10px;">Quantità degli elementi nel contenitore:</p>
        <div style="max-height: 300px; overflow-y: auto; margin-bottom: 15px; padding-right:5px;">
    `;
    
    planData.schedeNave.forEach(id => {
        const scheda = inventarioGlobale.schede[id];
        if (scheda) {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface); border:1px solid var(--border-color); padding:8px; border-radius:6px; margin-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="${scheda.icona.includes('fa-') ? scheda.icona : 'fa-solid ' + scheda.icona}" style="color:${scheda.colore};"></i>
                        <span style="font-size:13px; font-weight:600; color:var(--text-main);">${scheda.nome}</span>
                    </div>
                    <input type="number" id="cont-qta-${id}" min="0" value="0" style="width:50px; padding:4px; text-align:center; border:1px solid #ccc; border-radius:4px;">
                </div>
            `;
        }
    });

    html += `
        </div>
        <div style="display:flex; gap:10px;">
            <button onclick="window.Plan.apriSelezionePin()" style="flex:1; background:var(--surface); color:var(--text-main); border:1px solid var(--border-color); padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;">Annulla</button>
            <button onclick="window.Plan.salvaContenitore()" style="flex:2; background:#546e7a; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-crosshairs"></i> Posiziona</button>
        </div>
    `;
    mostraModale(html);
}

function salvaContenitore() {
    const nome = document.getElementById('cont-nome').value.trim() || 'Contenitore Multiplo';
    let elementi = [];
    
    planData.schedeNave.forEach(id => {
        const input = document.getElementById(`cont-qta-${id}`);
        if(input) {
            const qta = parseInt(input.value);
            if (qta > 0) elementi.push({ schedaId: id, qta: qta });
        }
    });

    if (elementi.length === 0) return alert("Inserisci almeno un elemento nel contenitore.");

    chiudiModaleGlobale();
    statoDropPin = { tipo: 'contenitore', nomeContenitore: nome, elementi: elementi };
    document.getElementById('plan-drop-indicator').style.display = 'block';
    document.getElementById('plan-map-container').style.cursor = 'crosshair';
}

// ==========================================
// CREAZIONE E MODIFICA SINGOLA SCHEDA GLOBALE
// ==========================================
function creaNuovaScheda() {
    const id = 'sch_' + Date.now();
    const colDef = inventarioGlobale.coloriCat?.["Sicurezza"] || "#ff0000";
    
    inventarioGlobale.schede[id] = { 
        nome: "Nuovo Elemento", 
        icona: "fa-solid fa-location-dot", 
        colore: colDef, 
        categoria: "Sicurezza", 
        testo_html: "<p>Dettagli...</p>", 
        media: [] 
    };
    apriEditorScheda(id);
}

function aggiungiCategoria() {
    const nuova = prompt("Nome nuova categoria:");
    if(nuova && nuova.trim() !== '' && !inventarioGlobale.categorie.includes(nuova)) {
        inventarioGlobale.categorie.push(nuova.trim()); salvaInventarioGlobaleSuGitHub();
        const sel = document.getElementById('sch-categoria');
        sel.innerHTML += `<option value="${nuova}">${nuova}</option>`; sel.value = nuova;
    }
}

function cambiaColoreDaCategoria(catSelezionata) {
    if (inventarioGlobale.coloriCat && inventarioGlobale.coloriCat[catSelezionata]) {
        document.getElementById('sch-colore').value = inventarioGlobale.coloriCat[catSelezionata];
    }
}

function apriEditorScheda(id) {
    const s = inventarioGlobale.schede[id];
    let catOptions = inventarioGlobale.categorie.map(c => `<option value="${c}" ${s.categoria === c ? 'selected' : ''}>${c}</option>`).join('');

    let html = `
        <h3 style="margin-bottom: 15px; color: var(--primary);"><i class="fa-solid fa-pen-to-square"></i> Scheda: ${s.nome}</h3>
        
        <label style="font-size:11px; font-weight:600;">Nome Elemento</label>
        <input type="text" id="sch-nome" value="${s.nome}" style="width:100%; padding:8px; margin-bottom:10px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;">
        
        <div style="display:flex; gap:10px; margin-bottom:10px;">
            <div style="flex:2;">
                <label style="font-size:11px; font-weight:600;">Categoria</label>
                <div style="display:flex; gap:5px;">
                    <select id="sch-categoria" onchange="window.Plan.cambiaColoreDaCategoria(this.value)" style="flex:1; padding:8px; border-radius:4px; border:1px solid #ccc;">${catOptions}</select>
                    <button onclick="window.Plan.aggiungiCategoria()" style="background:var(--primary); color:white; border:none; border-radius:4px; padding:0 10px;" title="Nuova Categoria"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            <div style="flex:1;">
                <label style="font-size:11px; font-weight:600; color:var(--danger);">Colore del Pin</label>
                <input type="color" id="sch-colore" value="${s.colore}" style="width:100%; height:34px; padding:2px; border-radius:4px; border:2px solid var(--danger); box-sizing:border-box;">
            </div>
        </div>

        <label style="font-size:11px; font-weight:600;">Classe Icona (es. fa-solid fa-fire)</label>
        <input type="text" id="sch-icona" value="${s.icona}" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box; margin-bottom:15px;">

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
            <button onclick="window.Plan.eliminaSchedaGlobale('${id}')" style="background:var(--danger); color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            <button id="btn-salva-scheda" onclick="window.Plan.salvaScheda('${id}')" style="flex:2; background:var(--success); color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-floppy-disk"></i> Salva</button>
        </div>
    `;
    mostraModale(html);
}

async function salvaScheda(id) {
    const s = inventarioGlobale.schede[id];
    s.nome = document.getElementById('sch-nome').value.trim();
    s.icona = document.getElementById('sch-icona').value.trim();
    s.colore = document.getElementById('sch-colore').value;
    s.categoria = document.getElementById('sch-categoria').value;
    s.testo_html = document.getElementById('sch-testo').innerHTML;
    
    if (!inventarioGlobale.coloriCat) inventarioGlobale.coloriCat = {};
    inventarioGlobale.coloriCat[s.categoria] = s.colore;

    document.getElementById('btn-salva-scheda').innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    await salvaInventarioGlobaleSuGitHub();
    disegnaLivelloCorrente(); 
    apriGestioneSchede(); 
}

async function eliminaSchedaGlobale(id) {
    if(!confirm("ELIMINAZIONE GLOBALE: La scheda verrà rimossa dal database e sparirà da tutte le planimetrie di tutte le navi. Procedere?")) return;
    
    delete inventarioGlobale.schede[id];
    
    planData.schedeNave = planData.schedeNave.filter(s => s !== id);
    planData.livelli.forEach(liv => {
        if(liv.pins) {
            liv.pins.forEach(p => { p.elementi = p.elementi.filter(el => el.schedaId !== id); });
            liv.pins = liv.pins.filter(p => p.elementi.length > 0);
        }
    });

    await salvaInventarioGlobaleSuGitHub(); await salvaPlanimetriaSuGitHub(); apriGestioneSchede();
}

// ==========================================
// VIEWER (LETTURA MAPPA) E GALLERIA
// ==========================================
function apriVisualizzatorePin(pin) {
    if (pin.tipo === 'singolo') {
        apriSchedaViewer(pin.elementi[0].schedaId, pin.elementi[0].qta);
    } else {
        let html = `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom: 20px; border-bottom: 2px solid var(--border-color); padding-bottom:10px;">
                <span style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; background:#546e7a; color:white; border-radius:8px; font-size:20px;"><i class="fa-solid fa-box-open"></i></span>
                <h2 style="color: var(--text-main); margin:0;">${pin.nomeContenitore}</h2>
            </div>
            <p style="font-size:13px; font-weight:bold; color:var(--text-muted); margin-bottom:10px;">Contenuto:</p>
            <div style="display:flex; flex-direction:column; gap:10px; max-height: 50vh; overflow-y:auto; padding-right:5px;">
        `;
        
        pin.elementi.forEach(el => {
            const s = inventarioGlobale.schede[el.schedaId];
            if (s) {
                html += `
                    <div onclick="window.Plan.apriSchedaViewer('${el.schedaId}', ${el.qta})" style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--surface); border:1px solid var(--border-color); border-radius:8px; cursor:pointer; transition: 0.2s;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="width:28px; height:28px; background:${s.colore}; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px;"><i class="${s.icona.includes('fa-') ? s.icona : 'fa-solid ' + s.icona}"></i></span>
                            <span style="font-weight:600; font-size:14px; color:var(--text-main);">${s.nome}</span>
                        </div>
                        <span style="background:rgba(0,102,204,0.1); color:var(--primary); padding:4px 10px; border-radius:12px; font-weight:bold; font-size:13px;">N° ${el.qta}</span>
                    </div>
                `;
            }
        });

        html += `</div>`;
        mostraModale(html);
    }
}

function apriSchedaViewer(id, qta = null) {
    const s = inventarioGlobale.schede[id];
    if(!s) return;

    let formattato = s.testo_html || "";
    formattato = formattato.replace(/\((immagine|video|pdf)\s+(\d+)\)/gi, (match, tipo, num) => {
        const index = parseInt(num) - 1;
        return `<a href="#" onclick="window.Plan.apriViewerPlan('${id}', ${index}); return false;" style="color: var(--primary); font-weight: 700; text-decoration: underline; background: rgba(0,102,204,0.1); padding: 2px 6px; border-radius: 6px;">${match}</a>`;
    });
    formattato = formattato.replace(/link:([^\s<]+)/gi, (match, url) => {
        let href = url; if (!href.startsWith('http')) href = 'https://' + href;
        return `<a href="${href}" target="_blank" style="color: var(--primary); font-weight: 600; text-decoration: underline;"><i class="fa-solid fa-link" style="font-size: 13px;"></i> ${url}</a>`;
    });

    const badgeQta = qta ? `<span style="background:rgba(0,102,204,0.1); color:var(--primary); padding:4px 12px; border-radius:16px; font-weight:bold; font-size:14px; margin-left:auto;">Presenti: N° ${qta}</span>` : '';

    let html = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom: 20px; border-bottom: 2px solid var(--border-color); padding-bottom:10px; flex-wrap: wrap;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; background:${s.colore}; color:white; border-radius:50%; font-size:18px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="${s.icona.includes('fa-') ? s.icona : 'fa-solid ' + s.icona}"></i></span>
            <h2 style="color: var(--text-main); margin:0;">${s.nome}</h2>
            ${badgeQta}
        </div>
        
        <div style="font-size: 15px; line-height: 1.6; color: var(--text-main); margin-bottom: 25px;">
            ${formattato}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${generaHtmlGalleria(s.media, false, id)}
        </div>
    `;
    mostraModale(html);
}

// UPLOAD MEDIA E FUNZIONI GESTIONE FILE E MODALI
async function gestisciUploadMediaPlan(event, cartellaTarget, idScheda) {
    const file = event.target.files[0];
    if (!file) return;
    const token = localStorage.getItem('gh_admin_token');
    const btnSalva = document.getElementById('btn-salva-scheda');
    const txtOrig = btnSalva.innerHTML;
    btnSalva.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`; btnSalva.disabled = true;

    try {
        const ext = file.name.split('.').pop().toLowerCase();
        const path = `assets/${cartellaTarget === 'pdf' ? 'pdf_vademecum' : 'media_vademecum'}/plan_${Date.now()}.${ext}`;
        const reader = new FileReader();
        const b64 = await new Promise((res, rej) => { reader.readAsDataURL(file); reader.onload = () => res(reader.result.split(',')[1]); });
        await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`, {
            method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Media globale aggiunto`, content: b64 })
        });
        if (!inventarioGlobale.schede[idScheda].media) inventarioGlobale.schede[idScheda].media = [];
        inventarioGlobale.schede[idScheda].media.push(path);
        document.getElementById('sch-gallery').innerHTML = generaHtmlGalleria(inventarioGlobale.schede[idScheda].media, true, idScheda);
    } catch (e) { alert("Errore caricamento media."); }
    finally { btnSalva.innerHTML = txtOrig; btnSalva.disabled = false; event.target.value = ""; }
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
        const num = index + 1;

        html += `<div style="position: relative; border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); box-sizing: border-box; ${isPdf ? 'grid-column: 1 / -1;' : ''}">`;
        if (isPdf) {
            html += `
                <div style="display:flex; background:var(--surface);">
                    <a href="./${path}" target="_blank" style="flex:1; padding:14px; display:flex; align-items:center; gap:12px; text-decoration:none; color:var(--text-main);">
                        <i class="fa-solid fa-file-pdf" style="font-size: 24px; color: var(--danger);"></i><span style="font-size: 15px; font-weight: 600;">PDF ${num}</span>
                    </a>
                    <div style="border-left: 1px solid var(--border-color); display:flex;">
                        ${isEdit ? `<button onclick="window.Plan.eliminaMediaPlan('${idScheda}', ${index})" style="background:transparent; border:none; color:var(--danger); width:50px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>` : `<button onclick="window.Plan.scaricaFilePlan('./${path}', '${filename}')" style="background:transparent; border:none; color:var(--success); width:50px; cursor:pointer;"><i class="fa-solid fa-download"></i></button>`}
                    </div>
                </div>
            `;
        } else {
            const tag = isVideo ? `<video src="${rawUrl}" style="width: 100%; height: 120px; object-fit: cover; display: block;"></video><i class="fa-solid fa-play" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white; font-size:30px; pointer-events:none;"></i>` : `<img src="${rawUrl}" style="width: 100%; height: 120px; object-fit: cover; display: block;">`;
            html += `
                <div style="position:absolute; top:6px; left:6px; background:var(--primary); color:white; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; z-index:15;">${num}</div>
                <div onclick="window.Plan.apriViewerPlan('${idScheda}', ${index})" style="cursor: pointer; position: relative;">${tag}</div>
                ${isEdit ? `<button onclick="window.Plan.eliminaMediaPlan('${idScheda}', ${index})" style="position:absolute; top:5px; right:5px; background:var(--danger); color:white; border:2px solid white; border-radius:50%; width:30px; height:30px; cursor:pointer; z-index:10;"><i class="fa-solid fa-trash" style="font-size:11px;"></i></button>` : `<button onclick="window.Plan.scaricaFilePlan('./${path}', '${filename}')" style="position:absolute; top:5px; right:5px; background:var(--surface); color:var(--text-main); border:1px solid var(--border-color); border-radius:50%; width:30px; height:30px; cursor:pointer; z-index:10;"><i class="fa-solid fa-download" style="font-size:11px;"></i></button>`}
            `;
        }
        html += `</div>`;
    });
    return html;
}

window.scaricaFilePlan = async (url, filename) => { try { const response = await fetch(url); const blob = await response.blob(); const urlBlob = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = urlBlob; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(urlBlob); } catch(e) { window.open(url, '_blank'); } }
function eliminaMediaPlan(idScheda, index) { if(!confirm("Eliminare la foto dal server?")) return; inventarioGlobale.schede[idScheda].media.splice(index, 1); document.getElementById('sch-gallery').innerHTML = generaHtmlGalleria(inventarioGlobale.schede[idScheda].media, true, idScheda); }

// ==========================================
// GESTIONE LIVELLI (PONTI)
// ==========================================
function apriModaleLivelli() {
    let html = `<h3 style="margin-bottom: 15px; color: var(--primary);"><i class="fa-solid fa-layer-group"></i> Ponti / Livelli</h3><div style="display:flex; flex-direction:column; gap:10px; margin-bottom: 20px;">`;
    planData.livelli.forEach((liv, idx) => {
        const bg = idx === livelloCorrenteIdx ? 'var(--primary)' : 'var(--surface)';
        const color = idx === livelloCorrenteIdx ? 'white' : 'var(--text-main)';
        html += `
            <div style="display:flex; gap:5px;">
                <button onclick="window.Plan.cambiaLivello(${idx})" style="flex:1; background:${bg}; color:${color}; padding:12px; border:1px solid var(--border-color); border-radius:8px; text-align:left; font-weight:bold; font-size:15px; cursor:pointer;">${liv.nome}</button>
                ${isEditMode ? `<button onclick="window.Plan.eliminaLivello(${idx})" style="background:var(--danger); color:white; border:none; border-radius:8px; padding:0 15px; cursor:pointer;" title="Elimina Ponte"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        `;
    });
    html += `</div>`;
    if (isEditMode) {
        html += `<div style="border-top: 2px solid var(--border-color); padding-top: 15px;"><p style="font-size: 13px; font-weight: bold; margin-bottom:8px;">Aggiungi Nuovo Ponte (JPG/PNG)</p><input type="text" id="nuovo-livello-nome" placeholder="es. Ponte Coperta" style="width:100%; padding:8px; box-sizing:border-box; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 10px;"><button onclick="document.getElementById('upload-livello-base').click()" style="width:100%; background:var(--success); color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-upload"></i> Carica Planimetria JPG</button><input type="file" id="upload-livello-base" accept="image/jpeg, image/png" style="display:none;" onchange="window.Plan.aggiungiNuovoLivello(event)"></div>`;
    }
    mostraModale(html);
}
function cambiaLivello(idx) { livelloCorrenteIdx = idx; chiudiModaleGlobale(); disegnaLivelloCorrente(); }
function eliminaPin(idPin) { if(confirm("Rimuovere questo elemento dalla mappa?")) { planData.livelli[livelloCorrenteIdx].pins = planData.livelli[livelloCorrenteIdx].pins.filter(p => p.id !== idPin); salvaPlanimetriaSuGitHub(); mappaPlan.closePopup(); } }

async function aggiungiNuovoLivello(event) {
    const file = event.target.files[0]; const nomeLivello = document.getElementById('nuovo-livello-nome').value.trim();
    if (!file || !nomeLivello) return alert("Inserisci nome e file.");
    const token = localStorage.getItem('gh_admin_token'); const ext = file.name.split('.').pop().toLowerCase(); const githubPath = `assets/planimetrie/${idPlanAttivo}_L${Date.now()}.${ext}`;
    chiudiModaleGlobale(); document.getElementById('plan-map-container').innerHTML = `<div style="text-align:center; padding-top:100px; color:var(--primary); font-weight:bold;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>Caricamento...</div>`;
    try {
        const reader = new FileReader(); const base64Content = await new Promise((res, rej) => { reader.readAsDataURL(file); reader.onload = () => res(reader.result.split(',')[1]); });
        await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${githubPath}`, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Aggiunto livello ${nomeLivello}`, content: base64Content }) });
        planData.livelli.push({ nome: nomeLivello, imgUrl: githubPath, pins: [] }); livelloCorrenteIdx = planData.livelli.length - 1; 
        document.getElementById('plan-map-container').innerHTML = ''; setTimeout(() => { mappaPlan.invalidateSize(); salvaPlanimetriaSuGitHub(); }, 100);
    } catch(e) { alert("Errore upload livello."); disegnaLivelloCorrente(); }
}

async function eliminaLivello(idx) {
    if(!confirm("Vuoi davvero eliminare questo ponte e tutti i suoi pin? L'immagine verrà rimossa dal server.")) return;
    const liv = planData.livelli[idx];
    const token = localStorage.getItem('gh_admin_token');
    
    chiudiModaleGlobale();
    
    try {
        const resAPI = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${liv.imgUrl}`, { headers: { 'Authorization': `token ${token}` } });
        if (resAPI.ok) {
            const data = await resAPI.json();
            await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${liv.imgUrl}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "Eliminato livello planimetria", sha: data.sha })
            });
        }
    } catch(e) { console.warn("Impossibile eliminare immagine, continuo", e); }

    planData.livelli.splice(idx, 1);
    livelloCorrenteIdx = Math.max(0, livelloCorrenteIdx - 1);
    await salvaPlanimetriaSuGitHub();
    apriModaleLivelli(); 
}

function creaContenitoreModali() {
    if (!document.getElementById('plan-modal-overlay')) {
        const overlay = document.createElement('div'); overlay.id = 'plan-modal-overlay'; overlay.className = 'modal-overlay'; overlay.style.cssText = 'display:none; align-items:center; justify-content:center; padding: 20px; z-index: 2500; background: rgba(0,0,0,0.7); box-sizing: border-box;';
        overlay.innerHTML = `<div id="plan-modal-box" style="background: var(--surface); width: 95%; max-width: 500px; border-radius: 16px; padding: 25px; box-sizing: border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-height: 90vh; overflow-y: auto; position: relative; margin: 0 auto;"><button onclick="window.chiudiModaleGlobale()" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 24px; color: var(--text-muted); cursor: pointer;"><i class="fa-solid fa-xmark"></i></button><div id="plan-modal-content"></div></div>`;
        document.body.appendChild(overlay);
        window.chiudiModaleGlobale = () => { overlay.style.display = 'none'; document.getElementById('plan-modal-content').innerHTML = ''; };
    }
}
function mostraModale(html) { document.getElementById('plan-modal-content').innerHTML = html; document.getElementById('plan-modal-overlay').style.display = 'flex'; }
function apriViewerPlan(idScheda, index) {
    const s = inventarioGlobale.schede[idScheda]; const path = s.media[index]; const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${path}`; const ext = path.split('.').pop().toLowerCase();
    if (window.creaViewerSeMancante) {
        window.creaViewerSeMancante(); const contentDiv = document.getElementById('vd-media-viewer-content');
        if (['mp4', 'webm', 'mov'].includes(ext)) { contentDiv.innerHTML = `<video src="${rawUrl}" controls autoplay playsinline style="max-width: 100vw; max-height: 100vh; object-fit: contain;"></video>`; } 
        else { contentDiv.innerHTML = `<img id="vd-viewer-img" src="${rawUrl}" style="max-width: 100vw; max-height: 100vh; object-fit: contain; transform-origin: center center; transition: transform 0.2s ease-out;">`; if (window.inizializzaZoomImmagine) setTimeout(window.inizializzaZoomImmagine, 50); }
        document.getElementById('vd-media-viewer').style.display = 'flex';
    }
}
