const GH_OWNER = "HazeV98"; 
const GH_REPO = "Utility-test";

// Stili alleggeriti: la dimensione ora è gestita tramite classi genitore
const stiliEtichette = document.createElement('style');
stiliEtichette.innerHTML = `
    .etichetta-canale {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        color: #000;
        font-weight: 900;
        text-shadow: 1.5px 1.5px 0 #fff, -1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff;
        pointer-events: none;
        white-space: nowrap;
    }
    .zoom-15 .etichetta-canale { font-size: 10px; }
    .zoom-16 .etichetta-canale { font-size: 12px; }
    .zoom-17-plus .etichetta-canale { font-size: 14px; }
`;
document.head.appendChild(stiliEtichette);

let mappaAttiva = null;
let geoJsonLayer = null;
let datiGeoJsonCache = null;
let fileShaAttuale = null; 
let modalitaCorrente = 'velocita'; 
let sfondoCorrente = 'standard';
let layerStandard = null;
let layerSatellite = null;
let isEditMode = false;
let globalIsAdminCollab = false;

export async function inizializzaMappaCanali(containerId, databaseFirebaseIgnorato, isAdminOrCollab) {
    const token = localStorage.getItem('gh_admin_token');
    globalIsAdminCollab = isAdminOrCollab || (token ? true : false);
    isEditMode = false;
    
    const container = document.getElementById(containerId);
    if (!container) return;

    container.parentElement.style.padding = "0"; 

    container.innerHTML = `
        <div id="leaflet-map-container" style="width: 100%; height: 100%; z-index: 1;"></div>
        
        <!-- Legenda e Filtri -->
        <div id="mappa-legenda-panel" style="display: none; position: absolute; top: max(15px, env(safe-area-inset-top)); right: 70px; background: var(--surface); padding: 15px; border-radius: 12px; box-shadow: var(--shadow-md); z-index: 1000; font-size: 13px; min-width: 180px; border: 1px solid var(--border-color);">
            <div style="font-weight: 700; margin-bottom: 10px; color: var(--text-main); font-size: 14px;">Mostra in mappa:</div>
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-main);">
                    <input type="radio" name="layerDati" value="velocita" checked onchange="window.Mappa.cambiaLayerDati('velocita')"> Limiti ACTV
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-main);">
                    <input type="radio" name="layerDati" value="giurisdizione" onchange="window.Mappa.cambiaLayerDati('giurisdizione')"> Giurisdizione
                </label>
            </div>
            <div id="legenda-colori"></div>
        </div>

        <!-- Pulsanti Fluttuanti (FAB) -->
        <div style="position: absolute; top: max(15px, env(safe-area-inset-top)); right: 15px; z-index: 1000; display: flex; flex-direction: column; gap: 15px;">
            <button class="icon-btn fab-btn" title="Filtri e Legenda" onclick="window.Mappa.toggleLegend()" style="width: 45px; height: 45px; border-radius: 50%; background: var(--surface); color: var(--primary); box-shadow: var(--shadow-md); border: 2px solid var(--border-color);">
                <i class="fa-solid fa-filter"></i>
            </button>
            <button class="icon-btn fab-btn" title="Cambia Sfondo" onclick="window.Mappa.toggleSfondo()" style="width: 45px; height: 45px; border-radius: 50%; background: var(--surface); color: var(--text-main); box-shadow: var(--shadow-md); border: 2px solid var(--border-color);">
                <i class="fa-solid fa-layer-group"></i>
            </button>
            <button id="fab-edit-mappa" class="icon-btn fab-btn" title="Modifica Dati" onclick="window.Mappa.toggleEdit()" style="display: none; width: 45px; height: 45px; border-radius: 50%; background: var(--primary); color: white; box-shadow: var(--shadow-md); border: none;">
                <i class="fa-solid fa-pen" id="icon-edit-mappa"></i>
            </button>
        </div>
    `;

    window.Mappa = { 
        cambiaLayerDati, toggleLegend, toggleSfondo, toggleEdit, salvaFeatureModificata 
    };

    if (globalIsAdminCollab) {
        document.getElementById('fab-edit-mappa').style.display = 'flex';
    }

    if (mappaAttiva) mappaAttiva.remove(); 

    mappaAttiva = L.map('leaflet-map-container', { zoomControl: false }).setView([45.435, 12.325], 13);
    L.control.zoom({ position: 'topleft' }).addTo(mappaAttiva);
    
    // Aggiornamento etichette calcolato sia sul cambio zoom che sullo spostamento (pan)
    mappaAttiva.on('zoomend', gestisciEtichetteVisibili);
    mappaAttiva.on('moveend', gestisciEtichetteVisibili);

    layerStandard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19
    });
    
    layerSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri', maxZoom: 17
    });

    layerStandard.addTo(mappaAttiva);
    sfondoCorrente = 'standard';

    aggiornaUI_Legenda();

    setTimeout(() => { mappaAttiva.invalidateSize(); }, 450);
    await caricaDatiGeoJson();
}

async function caricaDatiGeoJson() {
    const token = localStorage.getItem('gh_admin_token');
    try {
        if (!datiGeoJsonCache) {
            const response = await fetch('./assets/canali_venezia.geojson?t=' + Date.now());
            if (!response.ok) throw new Error("File GeoJSON non trovato");
            datiGeoJsonCache = await response.json();

            if (globalIsAdminCollab && token) {
                try {
                    const urlAPI = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/canali_venezia.geojson`;
                    const resAPI = await fetch(urlAPI, { headers: { 'Authorization': `token ${token}` } });
                    if (resAPI.ok) {
                        const data = await resAPI.json();
                        fileShaAttuale = data.sha;
                    }
                } catch(e) {
                    console.warn("Impossibile recuperare SHA in background", e);
                }
            } 

            datiGeoJsonCache.features.forEach((f, idx) => f.properties._internal_id = idx);
        }
        disegnaGeoJson();
    } catch (error) {
        console.error(error);
        document.getElementById('leaflet-map-container').innerHTML = `
            <div style="text-align: center; color: var(--danger); padding-top: 100px;">
                <i class="fa-solid fa-triangle-exclamation fa-2x"></i><br><br>Impossibile caricare <b>canali_venezia.geojson</b>
            </div>`;
    }
}

function disegnaGeoJson() {
    if (geoJsonLayer) mappaAttiva.removeLayer(geoJsonLayer);

    geoJsonLayer = L.geoJSON(datiGeoJsonCache, {
        style: impostaStileLinea,
        onEachFeature: aggiungiPopup
    }).addTo(mappaAttiva);
    
    setTimeout(gestisciEtichetteVisibili, 100);
}

// ------------------------------------
// GESTIONE COLORI E STILI
// ------------------------------------
function impostaStileLinea(feature) {
    let colore = '#a9a9a9'; 

    if (modalitaCorrente === 'velocita') {
        const velStr = feature.properties.velocita;
        const vel = parseFloat(velStr);
        
        if (isNaN(vel)) colore = '#a9a9a9';         
        else if (vel <= 5) colore = '#ff0000';      
        else if (vel <= 7) colore = '#ff8c00';      
        else if (vel <= 9) colore = '#ffd700';      
        else if (vel <= 11) colore = '#32cd32';     
        else if (vel <= 14) colore = '#00ced1';     
        else if (vel <= 15) colore = '#1e90ff';     
        else if (vel >= 20) colore = '#8a2be2';     
    } 
    else if (modalitaCorrente === 'giurisdizione') {
        const giu = (feature.properties.giurisdisz || '').toUpperCase();
        if (giu.includes('COMUNE')) colore = '#4285f4';                                      
        else if (giu.includes('AUTORITÀ MARITTIMA') || giu.includes('AUTORITA MARITTIMA')) colore = '#9c27b0'; 
        else if (giu.includes('MAGISTRATO')) colore = '#009688';                             
        else colore = '#e91e63';                                                             
    }

    const isPolygon = feature.geometry.type.includes('Polygon');

    return {
        color: colore,
        weight: sfondoCorrente === 'satellite' ? 4 : 3,
        fillColor: colore,
        fillOpacity: isPolygon ? (sfondoCorrente === 'satellite' ? 0.5 : 0.4) : 1,
        opacity: sfondoCorrente === 'satellite' ? 0.9 : 0.8
    };
}

function aggiornaUI_Legenda() {
    const contenitore = document.getElementById('legenda-colori');
    if (!contenitore) return;

    let html = '';
    if (modalitaCorrente === 'velocita') {
        html = `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#ff0000; border-radius:3px;"></span> &le; 5 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#ff8c00; border-radius:3px;"></span> &le; 7 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#ffd700; border-radius:3px;"></span> &le; 9 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#32cd32; border-radius:3px;"></span> &le; 11 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#00ced1; border-radius:3px;"></span> &le; 14 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#1e90ff; border-radius:3px;"></span> &le; 15 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#8a2be2; border-radius:3px;"></span> &ge; 20 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; color:var(--text-main);"><span style="width:14px; height:14px; background:#a9a9a9; border-radius:3px;"></span> Altro</div>
        `;
    } else {
        html = `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#4285f4; border-radius:3px;"></span> Comune</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#9c27b0; border-radius:3px;"></span> Aut. Marittima</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#009688; border-radius:3px;"></span> Magistrato/Reg.</div>
            <div style="display:flex; align-items:center; gap:8px; color:var(--text-main);"><span style="width:14px; height:14px; background:#e91e63; border-radius:3px;"></span> Altro</div>
        `;
    }
    contenitore.innerHTML = html;
}

// ------------------------------------
// POPUP E MODALITÀ MODIFICA
// ------------------------------------
function aggiungiPopup(feature, layer) {
    layer.bindPopup(() => {
        const p = feature.properties;
        
        if (isEditMode) {
            return `
                <div style="font-family: 'Inter', sans-serif; min-width: 180px;">
                    <div style="font-weight:bold; margin-bottom: 8px; color:var(--primary);"><i class="fa-solid fa-pen-to-square"></i> Modifica Dati</div>
                    <label style="font-size:11px; font-weight:600;">Nome Canale</label>
                    <input type="text" id="edit-nome-${p._internal_id}" value="${p.Toponomast || ''}" style="width:100%; box-sizing:border-box; margin-bottom:8px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    
                    <label style="font-size:11px; font-weight:600;">Velocità (km/h)</label>
                    <input type="text" id="edit-vel-${p._internal_id}" value="${p.velocita || ''}" style="width:100%; box-sizing:border-box; margin-bottom:8px; padding:6px; border:1px solid #ccc; border-radius:4px;" placeholder="es: 11">
                    
                    <label style="font-size:11px; font-weight:600;">Giurisdizione / Ente</label>
                    <input type="text" id="edit-giu-${p._internal_id}" value="${p.giurisdisz || ''}" style="width:100%; box-sizing:border-box; margin-bottom:12px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    
                    <button onclick="window.Mappa.salvaFeatureModificata(${p._internal_id})" style="width:100%; background:var(--success); color:white; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-cloud-arrow-up"></i> Salva Modifica</button>
                </div>
            `;
        } else {
            return `
                <div style="font-family: 'Inter', sans-serif;">
                    <strong style="color: var(--primary); font-size: 15px; display:block; margin-bottom: 5px;">${p.Toponomast || 'Canale Sconosciuto'}</strong>
                    <div style="font-size: 13px; margin-bottom: 3px;"><b>Velocità:</b> ${p.velocita || 'N/D'} km/h</div>
                    <div style="font-size: 13px;"><b>Ente:</b> ${p.giurisdisz || 'N/D'}</div>
                </div>
            `;
        }
    });
}

// ------------------------------------
// GESTIONE OTTIMIZZATA ETICHETTE
// ------------------------------------
function gestisciEtichetteVisibili() {
    if (!mappaAttiva || !geoJsonLayer) return;
    
    const zoom = mappaAttiva.getZoom();
    const bounds = mappaAttiva.getBounds();
    
    // Gestione della dimensione CSS ancorata al contenitore mappa
    const container = document.getElementById('leaflet-map-container');
    container.classList.remove('zoom-15', 'zoom-16', 'zoom-17-plus');
    if (zoom === 15) container.classList.add('zoom-15');
    else if (zoom === 16) container.classList.add('zoom-16');
    else if (zoom >= 17) container.classList.add('zoom-17-plus');
    
    // Carica etichette SOLO per i canali visibili a schermo (culling)
    geoJsonLayer.eachLayer(layer => {
        if (!layer.getBounds || !layer.feature || !layer.feature.properties || !layer.feature.properties.Toponomast) return;

        if (zoom >= 15 && bounds.intersects(layer.getBounds())) {
            if (!layer.getTooltip()) {
                layer.bindTooltip(layer.feature.properties.Toponomast, {
                    permanent: true,
                    direction: 'center',
                    className: 'etichetta-canale'
                });
            }
        } else {
            if (layer.getTooltip()) {
                layer.unbindTooltip();
            }
        }
    });
}

async function salvaFeatureModificata(index) {
    const token = localStorage.getItem('gh_admin_token');
    if (!token) return alert("Manca il token PAT Admin!");
    if (!fileShaAttuale) return alert("Errore di sincronizzazione col server, ricaricare la pagina.");

    const btn = document.querySelector(`button[onclick="window.Mappa.salvaFeatureModificata(${index})"]`);
    const testoOriginale = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...`;
    btn.disabled = true;

    try {
        const nuovoNome = document.getElementById(`edit-nome-${index}`).value;
        const nuovaVel = document.getElementById(`edit-vel-${index}`).value;
        const nuovaGiu = document.getElementById(`edit-giu-${index}`).value;

        datiGeoJsonCache.features[index].properties.Toponomast = nuovoNome;
        
        const velParse = parseFloat(nuovaVel);
        datiGeoJsonCache.features[index].properties.velocita = isNaN(velParse) ? nuovaVel : velParse;
        
        datiGeoJsonCache.features[index].properties.giurisdisz = nuovaGiu;

        const jsonPerGitHub = JSON.parse(JSON.stringify(datiGeoJsonCache));
        jsonPerGitHub.features.forEach(f => delete f.properties._internal_id);

        const jsonString = JSON.stringify(jsonPerGitHub, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

        const urlAPI = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/canali_venezia.geojson`;
        
        const res = await fetch(urlAPI, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: `Aggiornati dati mappa (Canale: ${nuovoNome})`, 
                content: base64Content,
                sha: fileShaAttuale
            })
        });

        if (!res.ok) throw new Error("Errore salvataggio file GeoJSON");
        
        fileShaAttuale = (await res.json()).content.sha; 
        
        disegnaGeoJson();
        mappaAttiva.closePopup();

    } catch (e) {
        alert("Errore durante il salvataggio dei dati mappa.");
        btn.innerHTML = testoOriginale;
        btn.disabled = false;
    }
}

// ------------------------------------
// FUNZIONI FAB (PULSANTI FLUTTUANTI)
// ------------------------------------
function toggleLegend() {
    const panel = document.getElementById('mappa-legenda-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function cambiaLayerDati(nuovaModalita) {
    modalitaCorrente = nuovaModalita;
    aggiornaUI_Legenda();
    if (datiGeoJsonCache) disegnaGeoJson();
}

function toggleSfondo() {
    if (sfondoCorrente === 'standard') {
        sfondoCorrente = 'satellite';
        mappaAttiva.removeLayer(layerStandard);
        layerSatellite.addTo(mappaAttiva);
    } else {
        sfondoCorrente = 'standard';
        mappaAttiva.removeLayer(layerSatellite);
        layerStandard.addTo(mappaAttiva);
    }
    if (datiGeoJsonCache) disegnaGeoJson(); 
}

function toggleEdit() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('fab-edit-mappa');
    const icon = document.getElementById('icon-edit-mappa');
    
    if (isEditMode) {
        btn.style.background = 'var(--success)';
        icon.className = "fa-solid fa-check";
        mappaAttiva.closePopup(); 
    } else {
        btn.style.background = 'var(--primary)';
        icon.className = "fa-solid fa-pen";
        mappaAttiva.closePopup(); 
    }
}
