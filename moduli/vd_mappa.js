let mappaAttiva = null;
let geoJsonLayer = null;
let datiGeoJsonCache = null;
let modalitaCorrente = 'velocita'; 

let layerStandard = null;
let layerSatellite = null;
let sfondoCorrente = 'standard';

export async function inizializzaMappaCanali(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
            <div style="display: flex; gap: 10px;">
                <button id="btn-layer-vel" class="btn-action" style="flex: 1; padding: 10px; font-size: 14px; background: var(--primary);">
                    <i class="fa-solid fa-gauge-high"></i> Limiti ACTV
                </button>
                <button id="btn-layer-giu" class="btn-action" style="flex: 1; padding: 10px; font-size: 14px; background: var(--surface); color: var(--text-main); border: 1px solid var(--border-color);">
                    <i class="fa-solid fa-building-columns"></i> Giurisdizione
                </button>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btn-mappa-std" class="btn-action" style="flex: 1; padding: 6px; font-size: 12px; background: #e0e0e0; color: #333; border: 1px solid #ccc; box-shadow: none;">
                    <i class="fa-solid fa-map"></i> Mappa
                </button>
                <button id="btn-mappa-sat" class="btn-action" style="flex: 1; padding: 6px; font-size: 12px; background: var(--surface); color: var(--text-main); border: 1px solid var(--border-color); box-shadow: none;">
                    <i class="fa-solid fa-satellite"></i> Satellite
                </button>
            </div>
        </div>
        <div id="leaflet-map-container" style="width: 100%; height: calc(100% - 95px); border-radius: 14px; box-shadow: var(--shadow-sm); z-index: 1;"></div>
    `;

    document.getElementById('btn-layer-vel').onclick = (e) => cambiaLayerDati('velocita', e.currentTarget);
    document.getElementById('btn-layer-giu').onclick = (e) => cambiaLayerDati('giurisdizione', e.currentTarget);
    document.getElementById('btn-mappa-std').onclick = (e) => cambiaSfondo('standard', e.currentTarget);
    document.getElementById('btn-mappa-sat').onclick = (e) => cambiaSfondo('satellite', e.currentTarget);

    if (mappaAttiva) mappaAttiva.remove(); 

    mappaAttiva = L.map('leaflet-map-container').setView([45.435, 12.325], 13);

    layerStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18
    });
    layerSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri', maxZoom: 18
    });

    layerStandard.addTo(mappaAttiva);
    sfondoCorrente = 'standard';

    setTimeout(() => { mappaAttiva.invalidateSize(); }, 450);
    await caricaDatiGeoJson();
}

async function caricaDatiGeoJson() {
    try {
        if (!datiGeoJsonCache) {
            const response = await fetch('./assets/canali_venezia.geojson');
            if (!response.ok) throw new Error("File GeoJSON non trovato");
            datiGeoJsonCache = await response.json();
        }
        disegnaGeoJson();
    } catch (error) {
        document.getElementById('leaflet-map-container').innerHTML = `
            <div style="text-align: center; color: var(--danger); padding-top: 50px;">
                <i class="fa-solid fa-triangle-exclamation fa-2x"></i><br>Nessun file canali_venezia.geojson trovato in assets/
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

// LOGICA COLORI BASATA SUI NOMI DEL TUO FILE
function impostaStileLinea(feature) {
    let colore = '#3388ff'; 

    if (modalitaCorrente === 'velocita') {
        const vel = feature.properties.velocita; // Usa "velocita"
        if (vel <= 5) colore = '#d93025';       
        else if (vel <= 7) colore = '#ff9800';  
        else if (vel <= 11) colore = '#fbbc05'; 
        else if (vel >= 20) colore = '#0f9d58'; 
    } 
    else if (modalitaCorrente === 'giurisdizione') {
        const giu = feature.properties.giurisdisz || ''; // Usa "giurisdisz" (in maiuscolo solitamente)
        
        // Verifica quale parola è contenuta nella stringa
        if (giu.includes('COMUNE')) colore = '#4285f4';           
        else if (giu.includes('CAPITANERIA')) colore = '#9c27b0'; 
        else if (giu.includes('MAGISTRATO')) colore = '#5f6368'; // Aggiunto grigio scuro per Magistrato alle Acque
        else colore = '#a0a0a0';                            
    }

    // Se è un MultiPolygon (aree invece di linee), lo riempiamo leggermente
    const isPolygon = feature.geometry.type.includes('Polygon');

    return {
        color: colore,
        weight: sfondoCorrente === 'satellite' ? 3 : 2,
        fillColor: colore,
        fillOpacity: isPolygon ? (sfondoCorrente === 'satellite' ? 0.4 : 0.3) : 1,
        opacity: sfondoCorrente === 'satellite' ? 0.9 : 0.8
    };
}

function aggiungiPopup(feature, layer) {
    if (feature.properties && feature.properties.Toponomast) {
        const p = feature.properties;
        const htmlPopup = `
            <div style="font-family: 'Inter', sans-serif;">
                <strong style="color: var(--primary); font-size: 15px; display:block; margin-bottom: 5px;">${p.Toponomast}</strong>
                <div style="font-size: 13px; margin-bottom: 3px;"><b>Velocità:</b> ${p.velocita || 'N/D'} km/h</div>
                <div style="font-size: 13px;"><b>Ente:</b> ${p.giurisdisz || 'N/D'}</div>
            </div>
        `;
        layer.bindPopup(htmlPopup);
    }
}

function cambiaLayerDati(nuovaModalita, btnElement) {
    modalitaCorrente = nuovaModalita;
    document.getElementById('btn-layer-vel').style.background = 'var(--surface)';
    document.getElementById('btn-layer-vel').style.color = 'var(--text-main)';
    document.getElementById('btn-layer-giu').style.background = 'var(--surface)';
    document.getElementById('btn-layer-giu').style.color = 'var(--text-main)';
    btnElement.style.background = 'var(--primary)';
    btnElement.style.color = 'white';
    if (datiGeoJsonCache) disegnaGeoJson();
}

function cambiaSfondo(nuovoSfondo, btnElement) {
    if (sfondoCorrente === nuovoSfondo) return;
    sfondoCorrente = nuovoSfondo;
    document.getElementById('btn-mappa-std').style.background = 'var(--surface)';
    document.getElementById('btn-mappa-std').style.color = 'var(--text-main)';
    document.getElementById('btn-mappa-std').style.borderColor = 'var(--border-color)';
    document.getElementById('btn-mappa-sat').style.background = 'var(--surface)';
    document.getElementById('btn-mappa-sat').style.color = 'var(--text-main)';
    document.getElementById('btn-mappa-sat').style.borderColor = 'var(--border-color)';
    btnElement.style.background = '#e0e0e0';
    btnElement.style.color = '#333';
    btnElement.style.borderColor = '#ccc';

    if (nuovoSfondo === 'satellite') {
        mappaAttiva.removeLayer(layerStandard);
        layerSatellite.addTo(mappaAttiva);
    } else {
        mappaAttiva.removeLayer(layerSatellite);
        layerStandard.addTo(mappaAttiva);
    }
    if (datiGeoJsonCache) disegnaGeoJson();
}
