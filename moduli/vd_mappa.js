const GH_OWNER = "HazeV98"; 
const GH_REPO = "Utility-test";

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
    globalIsAdminCollab = isAdminOrCollab;
    isEditMode = false;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Rimuove padding e margini dal contenitore padre per effetto "A Tutto Schermo" sotto l'header
    container.parentElement.style.padding = "0"; 

    // HTML Struttura: Mappa a tutto schermo + Pulsanti Fluttuanti (FABs) + Legenda
    container.innerHTML = `
        <div id="leaflet-map-container" style="width: 100%; height: 100%; z-index: 1;"></div>
        
        <!-- Legenda e Filtri (Inizialmente Nascosta) -->
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

        <!-- Pulsanti Fluttuanti (FAB) a destra -->
        <div style="position: absolute; bottom: 30px; right: 15px; z-index: 1000; display: flex; flex-direction: column; gap: 15px;">
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

    // Esposizione globale per eventi inline HTML
    window.Mappa = { 
        cambiaLayerDati, toggleLegend, toggleSfondo, toggleEdit, salvaFeatureModificata 
    };

    if (isAdminOrCollab) {
        document.getElementById('fab-edit-mappa').style.display = 'flex';
    }

    if (mappaAttiva) mappaAttiva.remove(); 

    mappaAttiva = L.map('leaflet-map-container', { zoomControl: false }).setView([45.435, 12.325], 13);

    // Riposiziona lo zoom nativo in alto a sinistra
    L.control.zoom({ position: 'topleft' }).addTo(mappaAttiva);

    layerStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18
    });
    layerSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri', maxZoom: 18
    });

    layerStandard.addTo(mappaAttiva);
    sfondoCorrente = 'standard';

    aggiornaUI_Legenda();

    // Ricalcolo dimensione per evitare bug di render a div nascosto
    setTimeout(() => { mappaAttiva.invalidateSize(); }, 450);
    await caricaDatiGeoJson();
}

async function caricaDatiGeoJson() {
    const token = localStorage.getItem('gh_admin_token');
    try {
        if (!datiGeoJsonCache) {
            // Se sei admin, scarica tramite API per ottenere anche il codice "sha" utile per sovrascrivere il file
            if (globalIsAdminCollab && token) {
                const urlAPI = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets/canali_venezia.geojson?t=${Date.now()}`;
                const response = await fetch(urlAPI, { headers: { 'Authorization': `token ${token}` } });
                if (response.ok) {
                    const data = await response.json();
                    fileShaAttuale = data.sha;
                    datiGeoJsonCache = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                }
            } 
            
            // Fallback: se fallisce o utente standard, usa la rete normale per sola lettura
            if (!datiGeoJsonCache) {
                const response = await fetch('./assets/canali_venezia.geojson?t=' + Date.now());
                if (!response.ok) throw new Error("File GeoJSON non trovato");
                datiGeoJsonCache = await response.json();
            }

            // Inietta un ID interno per rintracciare i poligoni durante la modifica
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
}

// ------------------------------------
// GESTIONE COLORI E STILI
// ------------------------------------
function impostaStileLinea(feature) {
    let colore = '#3388ff'; 

    if (modalitaCorrente === 'velocita') {
        const vel = parseFloat(feature.properties.velocita) || 0;
        if (vel <= 5) colore = '#d93025';       // Rosso
        else if (vel <= 7) colore = '#ff9800';  // Arancione
        else if (vel <= 11) colore = '#fbbc05'; // Giallo
        else colore = '#0f9d58';                // Verde (>= 20)
    } 
    else if (modalitaCorrente === 'giurisdizione') {
        const giu = (feature.properties.giurisdisz || '').toUpperCase();
        if (giu.includes('COMUNE')) colore = '#4285f4';             // Blu 
        else if (giu.includes('CAPITANERIA')) colore = '#9c27b0';   // Viola
        else if (giu.includes('MAGISTRATO')) colore = '#009688';    // Verde Acqua/Teal 
        else colore = '#e91e63';                                    // Rosa (Altro)
    }

    const isPolygon = feature.geometry.type.includes('Polygon');

    return {
        color: colore,
        weight: sfondoCorrente === 'satellite' ? 3 : 2,
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
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#d93025; border-radius:3px;"></span> &le; 5 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#ff9800; border-radius:3px;"></span> &le; 7 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#fbbc05; border-radius:3px;"></span> &le; 11 km/h</div>
            <div style="display:flex; align-items:center; gap:8px; color:var(--text-main);"><span style="width:14px; height:14px; background:#0f9d58; border-radius:3px;"></span> &ge; 20 km/h</div>
        `;
    } else {
        html = `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#4285f4; border-radius:3px;"></span> Comune</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color:var(--text-main);"><span style="width:14px; height:14px; background:#9c27b0; border-radius:3px;"></span> Capitaneria</div>
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
    // Genera il popup dinamicamente al click in base alla modalità (Lettura vs Modifica)
    layer.bindPopup(() => {
        const p = feature.properties;
        
        if (isEditMode) {
            return `
                <div style="font-family: 'Inter', sans-serif; min-width: 180px;">
                    <div style="font-weight:bold; margin-bottom: 8px; color:var(--primary);"><i class="fa-solid fa-pen-to-square"></i> Modifica Dati</div>
                    <label style="font-size:11px; font-weight:600;">Nome Canale</label>
                    <input type="text" id="edit-nome-${p._internal_id}" value="${p.Toponomast || ''}" style="width:100%; box-sizing:border-box; margin-bottom:8px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    
                    <label style="font-size:11px; font-weight:600;">Velocità (km/h)</label>
                    <input type="number" id="edit-vel-${p._internal_id}" value="${p.velocita || ''}" style="width:100%; box-sizing:border-box; margin-bottom:8px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    
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

async function salvaFeatureModificata(index) {
    const token = localStorage.getItem('gh_admin_token');
    if (!token) return alert("Manca il token PAT Admin!");
    if (!fileShaAttuale) return alert("Errore di sincronizzazione col server, ricaricare la pagina.");

    const btn = document.querySelector(`button[onclick="window.Mappa.salvaFeatureModificata(${index})"]`);
    const testoOriginale = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...`;
    btn.disabled = true;

    try {
        // Recupera i nuovi valori inseriti
        const nuovoNome = document.getElementById(`edit-nome-${index}`).value;
        const nuovaVel = document.getElementById(`edit-vel-${index}`).value;
        const nuovaGiu = document.getElementById(`edit-giu-${index}`).value;

        // Aggiorna l'oggetto in RAM
        datiGeoJsonCache.features[index].properties.Toponomast = nuovoNome;
        datiGeoJsonCache.features[index].properties.velocita = parseInt(nuovaVel) || null;
        datiGeoJsonCache.features[index].properties.giurisdisz = nuovaGiu;

        // Prepara il JSON per GitHub rimuovendo l'ID interno per pulizia
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
        
        // Ridisegna immediatamente il livello per mostrare i nuovi colori
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
    if (datiGeoJsonCache) disegnaGeoJson(); // Aggiorna l'opacità dei colori in base allo sfondo
}

function toggleEdit() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('fab-edit-mappa');
    const icon = document.getElementById('icon-edit-mappa');
    
    if (isEditMode) {
        btn.style.background = 'var(--success)';
        icon.className = "fa-solid fa-check";
        mappaAttiva.closePopup(); // Chiude eventuali popup aperti in mod. lettura
    } else {
        btn.style.background = 'var(--primary)';
        icon.className = "fa-solid fa-pen";
        mappaAttiva.closePopup(); 
    }
}
