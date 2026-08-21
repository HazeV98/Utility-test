let mappaAttiva = null;
let geoJsonLayer = null;
let datiGeoJsonCache = null;
let modalitaCorrente = 'velocita'; // Può essere 'velocita' o 'giurisdizione'

export async function inizializzaMappaCanali(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Iniezione dell'HTML per i controlli e il div della mappa
    container.innerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button id="btn-layer-vel" class="btn-action" style="flex: 1; padding: 10px; font-size: 14px; background: var(--primary);">
                <i class="fa-solid fa-gauge-high"></i> Limiti ACTV
            </button>
            <button id="btn-layer-giu" class="btn-action" style="flex: 1; padding: 10px; font-size: 14px; background: var(--surface); color: var(--text-main); border: 1px solid var(--border-color);">
                <i class="fa-solid fa-building-columns"></i> Giurisdizione
            </button>
        </div>
        <div id="leaflet-map-container" style="width: 100%; height: calc(100% - 60px); border-radius: 14px; box-shadow: var(--shadow-sm); z-index: 1;"></div>
    `;

    // Gestione bottoni cambio layer
    document.getElementById('btn-layer-vel').onclick = (e) => cambiaLayer('velocita', e.currentTarget);
    document.getElementById('btn-layer-giu').onclick = (e) => cambiaLayer('giurisdizione', e.currentTarget);

    // 2. Inizializzazione Leaflet
    if (mappaAttiva) {
        mappaAttiva.remove(); // Pulisce l'istanza precedente se si esce e rientra
    }

    // Centrata su Venezia: [Latitudine, Longitudine], Zoom
    mappaAttiva = L.map('leaflet-map-container').setView([45.435, 12.325], 13);

    // Aggiunta mappa di base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(mappaAttiva);

    // 3. Hack per risolvere il bug di rendering delle mappe nei div animati o nascosti
    setTimeout(() => { mappaAttiva.invalidateSize(); }, 450);

    // 4. Caricamento Dati GeoJSON
    await caricaDatiGeoJson();
}

async function caricaDatiGeoJson() {
    try {
        // Se i dati sono già stati scaricati, li riusiamo
        if (!datiGeoJsonCache) {
            // Sostituisci questo percorso con l'URL reale del tuo repository GitHub per i test
            const response = await fetch('./assets/canali_venezia.geojson');
            if (!response.ok) throw new Error("File GeoJSON non trovato");
            datiGeoJsonCache = await response.json();
        }

        disegnaGeoJson();
    } catch (error) {
        console.error("Errore caricamento mappa:", error);
        document.getElementById('leaflet-map-container').innerHTML = `
            <div style="text-align: center; color: var(--danger); padding-top: 50px;">
                <i class="fa-solid fa-triangle-exclamation fa-2x"></i><br>Impossibile caricare i dati dei canali.
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

// Calcola il colore e lo spessore della linea in base alle proprietà e alla modalità attiva
function impostaStileLinea(feature) {
    let colore = '#3388ff'; // default

    if (modalitaCorrente === 'velocita') {
        const vel = feature.properties.velocita_actv;
        if (vel <= 5) colore = '#d93025';       // Rosso
        else if (vel <= 7) colore = '#ff9800';  // Arancione
        else if (vel <= 11) colore = '#fbbc05'; // Giallo
        else if (vel >= 20) colore = '#0f9d58'; // Verde
    } 
    else if (modalitaCorrente === 'giurisdizione') {
        const giu = feature.properties.giurisdizione;
        if (giu === 'Comune') colore = '#4285f4';           // Blu
        else if (giu === 'Capitaneria') colore = '#9c27b0'; // Viola
        else colore = '#5f6368';                            // Grigio (Provveditorato/Altro)
    }

    return {
        color: colore,
        weight: 5,
        opacity: 0.8
    };
}

// Inserisce il contenuto del popup quando si tocca un canale
function aggiungiPopup(feature, layer) {
    if (feature.properties && feature.properties.nome) {
        const p = feature.properties;
        const htmlPopup = `
            <div style="font-family: 'Inter', sans-serif;">
                <strong style="color: var(--primary); font-size: 15px; display:block; margin-bottom: 5px;">${p.nome}</strong>
                <div style="font-size: 13px; margin-bottom: 3px;"><b>Velocità ACTV:</b> ${p.velocita_actv || 'N/D'} km/h</div>
                <div style="font-size: 13px;"><b>Ente:</b> ${p.giurisdizione || 'N/D'}</div>
            </div>
        `;
        layer.bindPopup(htmlPopup);
    }
}

// Gestisce l'UI dei pulsanti e ridisegna la mappa
function cambiaLayer(nuovaModalita, btnElement) {
    modalitaCorrente = nuovaModalita;
    
    // Reset stile bottoni
    document.getElementById('btn-layer-vel').style.background = 'var(--surface)';
    document.getElementById('btn-layer-vel').style.color = 'var(--text-main)';
    document.getElementById('btn-layer-giu').style.background = 'var(--surface)';
    document.getElementById('btn-layer-giu').style.color = 'var(--text-main)';

    // Stile bottone attivo
    btnElement.style.background = 'var(--primary)';
    btnElement.style.color = 'white';

    // Ridisegna le linee con i nuovi colori
    if (datiGeoJsonCache) disegnaGeoJson();
}

