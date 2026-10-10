// ==========================================
// NAVIGATORE - JS MODULE
// ==========================================

const API_URL = 'https://api.bateolive.stream';
let globalBoats = []; 
let globalStops = [];
let map = null;
let oms = null;
let boatMarkers = {};
let otherUsersMarkers = {};
let userMarker = null;
let currentFilterLines = [];
let fetchInterval = null;
let mapDepsLoaded = false;

// Livelli Mappa e Stile
let baseOSM, baseSat, nauticLayer;
let currentMapMode = 0; // 0: Base, 1: Satellitare

// Variabili GPS e Identità
let watchId = null;
let speedHistory = [];
const SMOOTHING_WINDOW_MS = 2000;
let lastValidHeading = null;
let currentUserId = null;
let currentUserName = "Collega";

// Variabili Controllo Vista Mappa
let followUser = false; 
let courseUp = false;

const ACTV_COLORS = {
    '1': { bg: '#ffffff', text: '#000000', border: '#000000' },
    '2': { bg: '#e3001b', text: '#ffffff', border: '#e3001b' },
    '2/': { bg: '#e3001b', text: '#ffffff', border: '#e3001b' },
    '3': { bg: '#ff8c00', text: '#000000', border: '#ff8c00' },
    '4.1': { bg: '#bd429b', text: '#ffffff', border: '#bd429b' },
    '4.2': { bg: '#bd429b', text: '#ffffff', border: '#bd429b' },
    '5.1': { bg: '#60b9a6', text: '#000000', border: '#60b9a6' },
    '5.2': { bg: '#60b9a6', text: '#000000', border: '#60b9a6' },
    '6': { bg: '#0070bc', text: '#ffffff', border: '#0070bc' },
    '7': { bg: '#008b54', text: '#ffffff', border: '#008b54' },
    '8': { bg: '#6d4c41', text: '#ffffff', border: '#6d4c41' },
    '9': { bg: '#797b3a', text: '#ffffff', border: '#797b3a' },
    '10': { bg: '#00c1d5', text: '#000000', border: '#00c1d5' },
    '11': { bg: '#f49ab4', text: '#000000', border: '#f49ab4' },
    '12': { bg: '#fced22', text: '#000000', border: '#fced22' },
    '13': { bg: '#583f99', text: '#ffffff', border: '#583f99' },
    '14': { bg: '#f36e21', text: '#000000', border: '#f36e21' },
    '15': { bg: '#fced22', text: '#e3001b', border: '#e3001b' },
    '17': { bg: '#8a8c8e', text: '#ffffff', border: '#8a8c8e' },
    '18': { bg: '#fced22', text: '#000000', border: '#e3001b' },
    '20': { bg: '#cbb3d5', text: '#000000', border: '#cbb3d5' },
    '22': { bg: '#c4d82d', text: '#006600', border: '#006600' },
    'N':  { bg: '#1c355e', text: '#ffffff', border: '#1c355e' }
};

function getLineColors(lineId) {
    return ACTV_COLORS[lineId] || { bg: '#888888', text: '#ffffff', border: '#888888' };
}

const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
});

async function loadMapDependencies() {
    if (mapDepsLoaded) return;
    if (!document.getElementById('leaflet-css')) {
        const css = document.createElement('link');
        css.id = 'leaflet-css';
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);
    }
    await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/OverlappingMarkerSpiderfier-Leaflet/0.2.6/oms.min.js');
    mapDepsLoaded = true;
}

// ==========================================
// INIEZIONE UI
// ==========================================
export function initUINavigatore() {
    if (document.getElementById('modal-navigatore-main')) return;

    const uiHTML = `
    <style>
        #modal-navigatore-main { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; background: #e0e0e0; display: none; flex-direction: column; overflow: hidden; }
        
        #nav-map-wrapper { flex-grow: 1; position: relative; overflow: hidden; background: #aad3df; z-index: 1; }
        #nav-map { width: 200%; height: 200%; position: absolute; top: -50%; left: -50%; z-index: 1; transition: transform 0.2s linear; }
        
        .nav-boat-icon { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); cursor: pointer; transform: rotate(var(--marker-rotation, 0deg)); transition: transform 0.2s linear; }
        .nav-stop-icon { background: #ffffff; border: 2.5px solid #00529b; border-radius: 50%; width: 14px; height: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); cursor: pointer; }
        .nav-line-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border: 2px solid; flex-shrink: 0; box-sizing: border-box; }
        .other-user-icon { background: #28a745; border: 2.5px solid #ffffff; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); transform: rotate(var(--marker-rotation, 0deg)); transition: transform 0.2s linear; }

        .nav-back-btn { position: absolute; top: calc(20px + env(safe-area-inset-top)); left: 20px; z-index: 1000; width: 45px; height: 45px; border-radius: 50%; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; color: #00529b; }
        .nav-fab-container { position: absolute; bottom: 30px; left: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 15px; }
        .nav-fab { width: 45px; height: 45px; border-radius: 50%; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; color: #00529b; transition: all 0.2s; }
        .nav-fab.active { background: #00529b; color: white; }

        .hud-compass-container { position: absolute; top: calc(15px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); width: 250px; height: 60px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 4px 15px rgba(0,0,0,0.2); overflow: hidden; z-index: 1000; display: flex; align-items: center; justify-content: center; display: none; }
        .compass-tape { position: absolute; top: 10px; left: 0; height: 100%; display: flex; transition: transform 0.15s linear; }
        .compass-mark { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 60px; flex-shrink: 0; }
        .tick { width: 2px; height: 8px; background: #666; margin-bottom: 4px; border-radius: 2px; }
        .tick.major { height: 16px; background: #00529b; width: 3px; }
        .compass-label { color: #666; font-size: 12px; font-weight: 600; }
        .compass-label.major { color: #333; font-size: 14px; font-weight: 900; }
        .compass-center-line { position: absolute; left: 50%; top: 0; width: 3px; height: 30px; background: #e3001b; transform: translateX(-50%); z-index: 10; border-radius: 2px; }
        
        .hud-speed-container { position: absolute; bottom: 30px; right: 20px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); padding: 12px 18px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 1000; display: none; }
        .speed-wrapper { display: flex; align-items: baseline; justify-content: center; gap: 5px; }
        .speed-val { font-size: 42px; font-weight: 900; color: #00529b; line-height: 0.9; }
        .speed-unit { font-size: 16px; font-weight: bold; color: #666; }

        .hud-status { position: absolute; top: calc(85px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); z-index: 1500; background: rgba(0,0,0,0.6); color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; display: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        
        .nav-submodal-overlay { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(3px); }
        .nav-submodal-overlay.active { display: flex; }
        .nav-submodal { background: white; padding: 20px; border-radius: 16px; width: 90%; max-width: 320px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; }
        .nav-search-container { position: relative; flex-shrink: 0; }
        .nav-submodal input[type="text"] { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; box-sizing: border-box; outline: none; font-size: 14px; }
        .nav-btn { background: #00529b; color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 15px; }
        .nav-btn.error { background: #e53935; }
        .nav-suggestions-dropdown { position: absolute; top: 48px; left: 0; right: 0; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); max-height: 220px; overflow-y: auto; z-index: 10; display: none; border: 1px solid #ddd; }
        .nav-suggestions-dropdown.active { display: block; }
        .nav-suggestion-item { padding: 12px 15px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; }
    </style>

    <div id="modal-navigatore-main">
        <div class="nav-back-btn" onclick="chiudiNavigatore()" title="Torna al menu"><i class="fa-solid fa-arrow-left"></i></div>

        <div id="nav-map-wrapper">
            <div id="nav-map"></div>
        </div>
        
        <div id="hud-compass" class="hud-compass-container">
            <div class="compass-center-line"></div>
            <div id="compass-tape" class="compass-tape"></div>
        </div>
        
        <div id="hud-status" class="hud-status">Acquisizione GPS...</div>

        <div id="hud-speed" class="hud-speed-container">
            <div class="speed-wrapper">
                <span id="speed-val" class="speed-val">0.0</span>
                <span class="speed-unit">km/h</span>
            </div>
        </div>

        <div class="nav-fab-container">
            <div id="fab-gps" class="nav-fab" onclick="toggleGPS()" title="Attiva/Disattiva GPS">
                <i class="fa-solid fa-satellite-dish"></i>
            </div>
            <div id="fab-center" class="nav-fab" onclick="toggleCenterMap()" title="Centra sulla Posizione" style="display: none;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2L4 20L12 17L20 20L12 2Z"/></svg>
            </div>
            <div id="fab-rotate" class="nav-fab" onclick="toggleMapRotation()" title="Rotazione Mappa (Rotta in alto)" style="display: none;">
                <i class="fa-regular fa-compass"></i>
            </div>
            <div id="fab-layers" class="nav-fab" onclick="cambiaStileMappa()" title="Cambia Stile Cartografico">
                <i class="fa-solid fa-layer-group"></i>
            </div>
            <div class="nav-fab" onclick="apriNavigatoreSearchModal()" title="Cerca Mezzo o Fermata"><i class="fa-solid fa-magnifying-glass"></i></div>
            <div class="nav-fab" onclick="apriNavigatoreFilterModal()" title="Filtra Linee"><i class="fa-solid fa-filter"></i></div>
        </div>

        <div id="nav-search-modal" class="nav-submodal-overlay" onclick="chiudiNavigatoreModals(event)">
            <div class="nav-submodal" onclick="event.stopPropagation()">
                <h3 style="margin-top:0; color:#00529b;">Cerca Mezzo / Fermata</h3>
                <div class="nav-search-container">
                    <input type="text" id="nav-search-input" placeholder="Es. Rialto, 4.2..." autocomplete="off">
                    <div id="nav-search-suggestions" class="nav-suggestions-dropdown"></div>
                </div>
                <button id="nav-search-btn" class="nav-btn" onclick="eseguiNavigatoreSearch()">Cerca</button>
            </div>
        </div>
        
        <div id="nav-filter-modal" class="nav-submodal-overlay" onclick="chiudiNavigatoreModals(event)">
            <div class="nav-submodal" onclick="event.stopPropagation()">
                <h3 style="margin-top:0; color:#00529b;">Filtra Linee</h3>
                <div id="nav-filter-list" style="overflow-y:auto; flex-grow:1; max-height:50vh;"></div>
                <button class="nav-btn" onclick="applicaNavigatoreFilter()">Applica Filtro</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);

    const tape = document.getElementById('compass-tape');
    let tapeHTML = '';
    const directions = {0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO'};
    for (let cycle = -1; cycle <= 1; cycle++) {
        for (let deg = 0; deg < 360; deg += 10) {
            let isMajor = (deg % 90 === 0);
            let tickClass = 'tick' + (isMajor ? ' major' : '');
            let labelClass = 'compass-label' + (isMajor ? ' major' : '');
            let labelText = directions[deg] !== undefined ? directions[deg] : deg;
            tapeHTML += `<div class="compass-mark"><div class="${tickClass}"></div><div class="${labelClass}">${labelText}</div></div>`;
        }
    }
    tape.innerHTML = tapeHTML;

    // Suggerimenti di Ricerca
    document.getElementById('nav-search-input').addEventListener('input', async function(e) {
        const q = e.target.value.toLowerCase().trim();
        const suggBox = document.getElementById('nav-search-suggestions');
        
        if(q.length < 2) { 
            suggBox.classList.remove('active'); 
            return; 
        }
        
        const mStops = globalStops.filter(s => s.name.toLowerCase().includes(q));
        const mBoats = globalBoats.filter(b => b.line.toLowerCase() === q || b.label.toLowerCase().includes(q));
        
        let html = '';
        
        mBoats.slice(0, 4).forEach(b => {
            const c = getLineColors(b.line);
            const dotHtml = `<div class="nav-line-dot" style="background-color: ${c.bg}; color: ${c.text}; border-color: ${c.border}; width: 18px; height: 18px; font-size: 8px;">${b.line}</div>`;
            html += `<div class="nav-suggestion-item" onclick="selezionaNavigatoreSuggestion('boat', '${b.id}')">
                        ${dotHtml} <span>${b.label}</span>
                     </div>`;
        });
        
        mStops.slice(0, 4).forEach(s => {
            html += `<div class="nav-suggestion-item" onclick="selezionaNavigatoreSuggestion('stop', '${s.id}')">
                        ⚓ <span>${s.name}</span>
                     </div>`;
        });
        
        if(!html) html = `<div class="nav-suggestion-item" style="color:#999; justify-content: center;">Nessun risultato trovato</div>`;
        
        suggBox.innerHTML = html;
        suggBox.classList.add('active');
    });

    window.chiudiNavigatore = chiudiNavigatore;
    window.toggleGPS = toggleGPS;
    window.toggleCenterMap = toggleCenterMap;
    window.toggleMapRotation = toggleMapRotation;
    window.cambiaStileMappa = cambiaStileMappa;
    window.chiudiNavigatoreModals = chiudiNavigatoreModals;
    window.apriNavigatoreSearchModal = apriNavigatoreSearchModal;
    window.apriNavigatoreFilterModal = apriNavigatoreFilterModal;
    window.eseguiNavigatoreSearch = eseguiNavigatoreSearch;
    window.applicaNavigatoreFilter = applicaNavigatoreFilter;
    window.selezionaNavigatoreSuggestion = selezionaNavigatoreSuggestion;
}

// ==========================================
// INIZIALIZZAZIONE E MOTORE
// ==========================================
export async function avviaMotoreNavigatore(db, auth, userData) {
    currentUserId = (auth && auth.currentUser) ? auth.currentUser.uid : 'user_' + Math.random().toString(36).substr(2, 9);
    currentUserName = (userData && userData.nome) ? userData.nome : "Collega";

    initUINavigatore();
    document.getElementById('modal-navigatore-main').style.display = 'flex';
    
    await loadMapDependencies();
    
    if (!map) {
        baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
        baseSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
        nauticLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { maxZoom: 18 });

        map = L.map('nav-map', { 
            attributionControl: false, 
            zoomControl: false,
            layers: [baseOSM, nauticLayer]
        }).setView([45.4371, 12.3326], 13);

        oms = new OverlappingMarkerSpiderfier(map, { keepSpiderfied: true, legWeight: 2, nearbyDistance: 35 });

        map.on('dragstart', () => {
            if (followUser && !courseUp) {
                toggleCenterMap(false);
            }
        });

        loadStops();
        fetchAndUpdateBoats();
        
        fetchInterval = setInterval(() => {
            fetchAndUpdateBoats();
            sincronizzaPosizioneAltriUtenti();
        }, 1500);
    } else {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

function chiudiNavigatore() {
    document.getElementById('modal-navigatore-main').style.display = 'none';
    if (watchId) navigator.geolocation.clearWatch(watchId);
    document.getElementById('hud-compass').style.display = 'none';
    document.getElementById('hud-speed').style.display = 'none';
    document.getElementById('fab-center').style.display = 'none';
    document.getElementById('fab-rotate').style.display = 'none';
    document.getElementById('fab-gps').classList.remove('active');
    
    courseUp = false;
    followUser = false;
    const mapEl = document.getElementById('nav-map');
    mapEl.style.transform = `rotate(0deg)`;
    mapEl.style.setProperty('--marker-rotation', `0deg`);
    if (map) map.dragging.enable();
}

// ==========================================
// LOGICA CONTROLLI VISTA MAPPA E STILI
// ==========================================
function cambiaStileMappa() {
    if (!map) return;
    
    currentMapMode = (currentMapMode + 1) % 2;
    const hudStatus = document.getElementById('hud-status');
    
    if (map.hasLayer(baseOSM)) map.removeLayer(baseOSM);
    if (map.hasLayer(baseSat)) map.removeLayer(baseSat);
    
    if (!map.hasLayer(nauticLayer)) map.addLayer(nauticLayer);

    if (currentMapMode === 0) {
        map.addLayer(baseOSM);
        hudStatus.innerText = "Mappa Base Nautica";
    } else if (currentMapMode === 1) {
        map.addLayer(baseSat);
        hudStatus.innerText = "Mappa Satellitare";
    }
    
    if (map.hasLayer(nauticLayer)) nauticLayer.bringToFront();

    hudStatus.style.background = "rgba(0, 82, 155, 0.9)";
    hudStatus.style.display = 'block';
    setTimeout(() => {
        if (watchId && !lastValidHeading && document.getElementById('speed-val').textContent === "0.0") {
            hudStatus.innerText = "Acquisizione GPS...";
            hudStatus.style.background = "rgba(0,0,0,0.6)";
        } else {
            hudStatus.style.display = 'none';
        }
    }, 2000);
}

function toggleCenterMap(forceState = null) {
    followUser = forceState !== null ? forceState : !followUser;
    document.getElementById('fab-center').classList.toggle('active', followUser);
    
    if (followUser && userMarker && map) {
        map.setView(userMarker.getLatLng());
    }
    
    if (!followUser && courseUp) {
        toggleMapRotation(false);
    }
}

function toggleMapRotation(forceState = null) {
    courseUp = forceState !== null ? forceState : !courseUp;
    const fabRot = document.getElementById('fab-rotate');
    fabRot.classList.toggle('active', courseUp);
    
    const mapEl = document.getElementById('nav-map');

    if (courseUp) {
        if (map) map.dragging.disable();
        if (!followUser) toggleCenterMap(true);
        
        let h = lastValidHeading || 0;
        let normalizedHeading = h % 360;
        if (normalizedHeading < 0) normalizedHeading += 360;
        
        mapEl.style.transform = `rotate(-${normalizedHeading}deg)`;
        mapEl.style.setProperty('--marker-rotation', `${normalizedHeading}deg`);
    } else {
        if (map) map.dragging.enable();
        mapEl.style.transform = `rotate(0deg)`;
        mapEl.style.setProperty('--marker-rotation', `0deg`);
    }
}

// ==========================================
// LOGICA GPS E MULTIPLAYER
// ==========================================
function toggleGPS() {
    const fab = document.getElementById('fab-gps');
    const hudCompass = document.getElementById('hud-compass');
    const hudSpeed = document.getElementById('hud-speed');
    const hudStatus = document.getElementById('hud-status');
    const fabCenter = document.getElementById('fab-center');
    const fabRotate = document.getElementById('fab-rotate');

    if (fab.classList.contains('active')) {
        fab.classList.remove('active');
        hudCompass.style.display = 'none';
        hudSpeed.style.display = 'none';
        hudStatus.style.display = 'none';
        fabCenter.style.display = 'none';
        fabRotate.style.display = 'none';
        
        toggleCenterMap(false);
        toggleMapRotation(false);
        
        if (watchId) navigator.geolocation.clearWatch(watchId);
        if (userMarker) {
            map.removeLayer(userMarker);
            userMarker = null;
        }
    } else {
        fab.classList.add('active');
        hudCompass.style.display = 'flex';
        hudSpeed.style.display = 'block';
        hudStatus.style.display = 'block';
        hudStatus.innerText = "Acquisizione GPS...";
        hudStatus.style.background = "rgba(0,0,0,0.6)";
        fabCenter.style.display = 'flex';
        fabRotate.style.display = 'flex';
        
        toggleCenterMap(true); 
        speedHistory = [];
        
        watchId = navigator.geolocation.watchPosition(elaboraPosizioneGPS, (err) => {
            hudStatus.innerText = "Errore GPS: " + err.message;
            hudStatus.style.background = "rgba(227, 0, 27, 0.8)";
            hudStatus.style.display = 'block';
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    }
}

function elaboraPosizioneGPS(position) {
    const coords = position.coords;
    const now = Date.now();
    
    const hudStatus = document.getElementById('hud-status');
    if (hudStatus.innerText === "Acquisizione GPS...") hudStatus.style.display = 'none'; 
    
    let rawSpeedMs = coords.speed || 0;
    speedHistory.push({ speed: rawSpeedMs, time: now });
    speedHistory = speedHistory.filter(entry => now - entry.time <= SMOOTHING_WINDOW_MS);
    let avgSpeedMs = speedHistory.reduce((sum, entry) => sum + entry.speed, 0) / speedHistory.length;

    let speedKmh = avgSpeedMs * 3.6;
    
    document.getElementById('speed-val').textContent = speedKmh.toFixed(1);

    if (coords.heading !== null && (rawSpeedMs >= 0.5 || lastValidHeading === null)) {
        lastValidHeading = coords.heading;
    }
    
    let validHeading = lastValidHeading || 0;

    const svgArrow = `
    <div style="transform: rotate(${validHeading}deg); width:32px; height:32px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5)); transition: transform 0.2s linear;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#00529b" stroke="white" stroke-width="1.5" stroke-linejoin="round">
            <path d="M12 2L4 20L12 17L20 20L12 2Z"/>
        </svg>
    </div>`;
    
    const userIcon = L.divIcon({ html: svgArrow, className: '', iconSize: [32,32], iconAnchor: [16,16] });

    if (!userMarker) {
        userMarker = L.marker([coords.latitude, coords.longitude], {
            icon: userIcon, zIndexOffset: 2000
        }).addTo(map);
    } else {
        userMarker.setLatLng([coords.latitude, coords.longitude]);
        userMarker.setIcon(userIcon);
    }
    
    if (followUser) map.setView([coords.latitude, coords.longitude]);

    let normalizedHeading = validHeading % 360;
    if (normalizedHeading < 0) normalizedHeading += 360;
    
    if (courseUp) {
        const mapEl = document.getElementById('nav-map');
        mapEl.style.transform = `rotate(-${normalizedHeading}deg)`;
        mapEl.style.setProperty('--marker-rotation', `${normalizedHeading}deg`);
    }

    const tape = document.getElementById('compass-tape');
    const widthPerMark = 60; 
    const pxPerDegree = widthPerMark / 10; 
    const baseOffset = 36 * widthPerMark; 
    const targetX = - (baseOffset + (normalizedHeading * pxPerDegree)) + 125 - 30; 
    tape.style.transform = `translateX(${targetX}px)`;

    inviaPosizionePersonale(coords.latitude, coords.longitude, speedKmh, validHeading);
}

function inviaPosizionePersonale(lat, lon, speed, heading) {
    if (!currentUserId) return;

    fetch(`${API_URL}/api/users/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: currentUserId,
            lat: lat,
            lon: lon,
            speed: speed,
            heading: heading,
            nome: currentUserName
        })
    }).catch(err => console.error("Errore invio posizione:", err));
}

async function sincronizzaPosizioneAltriUtenti() {
    if (!map || !currentUserId) return;
    try {
        const response = await fetch(`${API_URL}/api/users/live`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const users = await response.json();
        const activeIds = Object.keys(users);

        activeIds.forEach(uid => {
            if (uid === currentUserId) return; 

            const u = users[uid];
            if (otherUsersMarkers[uid]) {
                otherUsersMarkers[uid].setLatLng([u.lat, u.lon]);
                if (otherUsersMarkers[uid].getPopup()) {
                    otherUsersMarkers[uid].getPopup().setContent(`<div style="text-align:center;"><b>${u.nome}</b><br>Velocità: ${parseFloat(u.speed).toFixed(1)} km/h</div>`);
                }
            } else {
                const iconHtml = `<div class="other-user-icon"></div>`;
                const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [20,20], iconAnchor: [10,10] });
                const marker = L.marker([u.lat, u.lon], { icon: icon }).addTo(map);
                marker.bindPopup(`<div style="text-align:center;"><b>${u.nome}</b><br>Velocità: ${parseFloat(u.speed).toFixed(1)} km/h</div>`);
                otherUsersMarkers[uid] = marker;
            }
        });

        Object.keys(otherUsersMarkers).forEach(uid => {
            if (!activeIds.includes(uid)) {
                map.removeLayer(otherUsersMarkers[uid]);
                delete otherUsersMarkers[uid];
            }
        });
    } catch (error) { console.error("Errore ricezione altri utenti:", error); }
}

// ==========================================
// LOGICA ACTV
// ==========================================
async function loadStops() {
    try {
        const res = await fetch(`${API_URL}/api/stops`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        globalStops = await res.json();
        const stopIcon = L.divIcon({ className: 'nav-stop-icon', iconSize: [14, 14], iconAnchor: [7, 7] });
        globalStops.forEach(stop => {
            const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon }).addTo(map);
            marker.bindPopup(`<div style="font-family:'Inter', sans-serif; font-weight:600; text-align:center; font-size:13px;">⚓ ${stop.name}</div>`);
            oms.addMarker(marker); 
        });
    } catch(e) { console.error("Errore fermate:", e); }
}

async function fetchAndUpdateBoats() {
    if (!map) return;
    try {
        const response = await fetch(`${API_URL}/api/vaporetti/live`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const boats = await response.json();
        globalBoats = boats;

        boats.forEach(boat => {
            if (boat.lat && boat.lon) {
                if (currentFilterLines.length > 0 && !currentFilterLines.includes(boat.line.toUpperCase())) {
                    if (boatMarkers[boat.id]) { oms.removeMarker(boatMarkers[boat.id]); map.removeLayer(boatMarkers[boat.id]); delete boatMarkers[boat.id]; }
                    return; 
                }
                const c = boat.line === '-' ? { bg: '#000000', text: '#ffffff', border: '#ffffff' } : getLineColors(boat.line.toUpperCase());
                
                const iconHtml = `<div class="nav-boat-icon" style="background-color: ${c.bg}; color: ${c.text}; border: 2.5px solid ${c.border}; width: 26px; height: 26px; box-sizing: border-box;">${boat.line}</div>`;
                const customBoatIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });
                
                const popupContent = `<div style="text-align:center; padding:2px;"><div style="font-size:11px; color:#666;">Linea <strong style="font-size:14px;">${boat.line}</strong></div><div style="font-weight:600; font-size:14px; margin-top:6px;">${boat.label}</div></div>`;
                
                if (boatMarkers[boat.id]) {
                    boatMarkers[boat.id].setLatLng([boat.lat, boat.lon]);
                    boatMarkers[boat.id].setIcon(customBoatIcon);
                    boatMarkers[boat.id].getPopup() ? boatMarkers[boat.id].getPopup().setContent(popupContent) : boatMarkers[boat.id].bindPopup(popupContent);
                } else {
                    const marker = L.marker([boat.lat, boat.lon], { icon: customBoatIcon, zIndexOffset: 1000 }).addTo(map);
                    marker.bindPopup(popupContent);
                    oms.addMarker(marker); 
                    boatMarkers[boat.id] = marker;
                }
            }
        });
    } catch (error) { console.error("Errore Vaporetti:", error); }
}

function chiudiNavigatoreModals(e) { 
    if (e && e.target && e.target.classList && !e.target.classList.contains('nav-submodal-overlay')) return;
    document.getElementById('nav-search-modal').classList.remove('active'); 
    document.getElementById('nav-filter-modal').classList.remove('active'); 
    document.getElementById('nav-search-suggestions').classList.remove('active');
}
function apriNavigatoreSearchModal() { document.getElementById('nav-search-modal').classList.add('active'); }
function apriNavigatoreFilterModal() { 
    document.getElementById('nav-filter-modal').classList.add('active'); 
    try {
        const lines = [...new Set(globalBoats.map(b => b.line).filter(l => l !== '-'))].sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
        let html = '';
        lines.forEach(line => {
            const isChecked = currentFilterLines.length === 0 || currentFilterLines.includes(line) ? 'checked' : '';
            html += `<div><label><input type="checkbox" value="${line}" class="nav-line-filter-cb" ${isChecked}> Linea ${line}</label></div><hr style="border:0; border-top:1px solid #eee; margin:8px 0;">`;
        });
        document.getElementById('nav-filter-list').innerHTML = html;
    } catch(e) {}
}
function applicaNavigatoreFilter() {
    const checkboxes = document.querySelectorAll('.nav-line-filter-cb');
    const allChecked = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    currentFilterLines = (allChecked.length === checkboxes.length || allChecked.length === 0) ? [] : allChecked;
    chiudiNavigatoreModals({target: {classList: {contains: ()=>true}}});
    Object.keys(boatMarkers).forEach(id => { oms.removeMarker(boatMarkers[id]); map.removeLayer(boatMarkers[id]); delete boatMarkers[id]; });
    fetchAndUpdateBoats(); 
}

function eseguiNavigatoreSearch() {
    const query = document.getElementById('nav-search-input').value.toLowerCase().trim();
    const btn = document.getElementById('nav-search-btn');
    
    if(!query) return;
    
    const suggBox = document.getElementById('nav-search-suggestions');
    const items = suggBox.querySelectorAll('.nav-suggestion-item');
    
    if (items.length > 0 && items[0].innerText !== 'Nessun risultato trovato') {
        items[0].click();
        return;
    }
    
    btn.innerText = "Nessun Risultato";
    btn.classList.add("error");
    setTimeout(() => {
        btn.innerText = "Cerca";
        btn.classList.remove("error");
    }, 2000);
}

function selezionaNavigatoreSuggestion(type, id) {
    chiudiNavigatoreModals({target: {classList: {contains: ()=>true}}});
    
    toggleCenterMap(false);

    if (type === 'stop') {
        const stop = globalStops.find(s => s.id === id);
        if (stop) { map.setView([stop.lat, stop.lon], 16); L.popup().setLatLng([stop.lat, stop.lon]).setContent(`⚓ ${stop.name}`).openOn(map); }
    } else if (type === 'boat') {
        const boat = globalBoats.find(b => b.id === id);
        if(boat) { map.setView([boat.lat, boat.lon], 16); if (boatMarkers[boat.id]) boatMarkers[boat.id].openPopup(); }
    }
}
