// ==========================================
// BateoLive lite - JS MODULE
// Include il navigatore di turno (ex gps.js): ritardo/anticipo, attività in corso, prossima fermata,
// tendina fermate e rotta della linea sulla mappa.
// Grafica: stessa di bateolive.js (variabili tema dell'app, chiaro/scuro, tasto + e tasto sole/luna).
// ==========================================

import {
    TURNI_SENZA_CORSE, dateToLocalISO, stringToNum, esc,
    turnoEffettivo, unisciRebecchini, ferieDelGiorno, haVarianti, caricaDatiTurni
} from "./turni-core.js"; // va importato sempre con questo stesso percorso (vedi turni-core.js)

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
// Nomi unità (normalizzati) inseriti manualmente da altri utenti: le unità ACTV corrispondenti vengono nascoste
let hiddenActvUnitNames = new Set();

// Livelli Mappa e Stile
let baseOSM, baseSat, nauticLayer;
let currentMapMode = 0; // 0: Base, 1: Satellitare

// Variabili GPS, Identità e Unità Personalizzata
let watchId = null;
let speedHistory = [];
const SMOOTHING_WINDOW_MS = 2000;
let lastValidHeading = null;
let currentUserId = null;
let currentUserName = "Collega";
let customUnitName = '';
let customLine = '';

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

// ---- Statistiche Umami: il tracker parte solo quando si apre questo modulo ----
// auto-track disattivato: non si conta la pagina contenitore (/utility/index.html),
// ogni apertura viene registrata come pagina virtuale con un URL proprio del modulo.
const UMAMI_SRC = 'https://api.bateolive.stream/stats/script.js';
const UMAMI_ID = '2b1a80cf-f9e6-4173-9ff3-0c1adefe19e3';
const UMAMI_HOST = 'https://api.bateolive.stream/stats';

function tracciaApertura(urlVirtuale, titolo) {
    const invia = () => window.umami && window.umami.track((p) => ({ ...p, url: urlVirtuale, title: titolo }));
    try {
        if (window.umami) { invia(); return; }
        const esistente = document.querySelector(`script[src="${UMAMI_SRC}"]`);
        if (esistente) { esistente.addEventListener('load', invia); return; }
        const s = document.createElement('script');
        s.defer = true;
        s.src = UMAMI_SRC;
        s.dataset.websiteId = UMAMI_ID;
        s.dataset.hostUrl = UMAMI_HOST;
        s.dataset.autoTrack = 'false';
        s.onload = invia;
        document.head.appendChild(s);
    } catch (e) { /* il tracciamento non deve mai rompere l'app */ }
}


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
        #modal-navigatore-main {
            --bv-surface: var(--surface, #ffffff);
            --bv-glass: var(--bv-surface);
            --bv-text: var(--text-main, #1e293b);
            --bv-muted: var(--text-muted, #64748b);
            --bv-border: var(--border-color, #e2e8f0);
            --bv-primary: var(--primary, #00529b);
            --bv-danger: var(--danger, #dc3545);
            --bv-ok: var(--success, #28a745);
            --bv-ok-t: #15803d;
            --bv-bad-t: #b42318;
            --bv-warn-t: #b45309;
            --bv-fill: rgba(128, 128, 128, 0.08);
            --bv-fill-2: rgba(128, 128, 128, 0.16);
            --bv-tint: rgba(0, 82, 155, 0.1);
            --bv-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            --bv-radius: var(--radius-md, 14px);
            --bv-sea: #aad3df;
        }
        @supports (color: color-mix(in srgb, red, blue)) {
            #modal-navigatore-main {
                --bv-glass: color-mix(in srgb, var(--bv-surface) 92%, transparent);
                --bv-tint: color-mix(in srgb, var(--bv-primary) 12%, transparent);
            }
        }
        #modal-navigatore-main.nav-dark {
            color-scheme: dark;
            --bv-ok-t: #4ade80;
            --bv-bad-t: #ff7b72;
            --bv-warn-t: #fbbf24;
            --bv-shadow: 0 4px 18px rgba(0, 0, 0, 0.55);
            --bv-sea: #1b2733;
        }
        #modal-navigatore-main.nav-forza-chiaro { color-scheme: light; --bv-surface: #ffffff; --bv-text: #1e293b; --bv-muted: #64748b; --bv-border: #e2e8f0; --bv-primary: #00529b; --bv-danger: #dc3545; --bv-ok: #28a745; }
        #modal-navigatore-main.nav-forza-scuro { color-scheme: dark; --bv-surface: #1c2430; --bv-text: #e8edf3; --bv-muted: #9aa7b8; --bv-border: #334155; --bv-primary: #3b82f6; --bv-danger: #ef4444; --bv-ok: #22c55e; }
        .nav-fab-tema i.swap { animation: nav-tema-swap 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
        @keyframes nav-tema-swap {
            0% { transform: rotate(-90deg) scale(0.3); opacity: 0; }
            100% { transform: none; opacity: 1; }
        }
        #modal-navigatore-main { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; background: var(--bv-surface); color: var(--bv-text); display: none; flex-direction: column; font-family: inherit; overflow: hidden; }
        #modal-navigatore-main button, #modal-navigatore-main input { font-family: inherit; }
        #modal-navigatore-main button:focus-visible { outline: 2px solid var(--bv-primary); outline-offset: 2px; }
        #nav-map-wrapper { flex-grow: 1; position: relative; overflow: hidden; background: var(--bv-sea); z-index: 1; }
        #nav-map { width: 200%; height: 200%; position: absolute; top: -50%; left: -50%; z-index: 1; transition: transform 0.2s linear; background: var(--bv-sea); font-family: inherit; }
        .nav-tiles-osm { transition: filter 0.4s ease; }
        #modal-navigatore-main.nav-dark .nav-tiles-osm { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9) saturate(0.75); }
        #modal-navigatore-main .leaflet-popup-content-wrapper, #modal-navigatore-main .leaflet-popup-tip { background: var(--bv-surface); color: var(--bv-text); box-shadow: var(--bv-shadow); }
        #modal-navigatore-main .leaflet-popup-content { margin: 10px 14px; font-size: 13px; line-height: 1.4; }
        #modal-navigatore-main .leaflet-container a.leaflet-popup-close-button { color: var(--bv-muted); }
        .nav-boat-icon { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.45); cursor: pointer; transform: rotate(var(--marker-rotation, 0deg)); transition: transform 0.2s linear, scale 0.2s ease; }
        .nav-boat-icon:hover { scale: 1.15; }
        .nav-stop-icon { background: var(--bv-surface); border: 2.5px solid var(--bv-primary); border-radius: 50%; width: 14px; height: 14px; box-sizing: border-box; box-shadow: 0 1px 5px rgba(0,0,0,0.4); cursor: pointer; transition: scale 0.2s ease; }
        .nav-stop-icon:hover { scale: 1.4; }
        .nav-line-dot { min-width: 24px; height: 24px; padding: 0 4px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; border: 2px solid; flex-shrink: 0; box-sizing: border-box; line-height: 1; }
        .nav-back-btn, .nav-fab { width: 45px; height: 45px; border-radius: 50%; background: var(--bv-glass); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--bv-border); box-shadow: var(--bv-shadow); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--bv-primary); transition: transform 0.2s, background 0.2s, color 0.2s; }
        .nav-back-btn { position: absolute; top: calc(20px + env(safe-area-inset-top, 0px)); left: 20px; z-index: 1000; font-size: 20px; }
        .nav-fab { font-size: 18px; }
        .nav-fab.active { background: var(--bv-primary); border-color: var(--bv-primary); color: #fff; }
        .nav-fab:hover { transform: scale(1.05); }
        .nav-fab-container { position: absolute; bottom: calc(90px + env(safe-area-inset-bottom, 0px)); left: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 15px; pointer-events: none; }
        .nav-fab-container .nav-fab { pointer-events: auto; opacity: 1; transform: none; transition: transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.15), opacity 0.22s ease, background 0.2s, color 0.2s; }
        .nav-fab-container.chiuso .nav-fab { opacity: 0; transform: translateY(26px) scale(0.5); pointer-events: none; transition: transform 0.22s ease-in, opacity 0.18s ease, background 0.2s, color 0.2s; }
        .nav-fab-container:not(.chiuso) .nav-fab:hover { transform: scale(1.05); }
        .nav-fab-menu { position: absolute; bottom: calc(30px + env(safe-area-inset-bottom, 0px)); left: 20px; z-index: 1000; font-size: 18px; }
        .nav-fab-menu i { transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
        .nav-fab-menu.active i { transform: rotate(135deg); }
        .hud-compass-container { position: absolute; top: calc(15px + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%); width: 250px; height: 60px; background: var(--bv-glass); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid var(--bv-border); box-shadow: var(--bv-shadow); overflow: hidden; z-index: 1000; align-items: center; justify-content: center; display: none; }
        .compass-tape { position: absolute; top: 10px; left: 0; height: 100%; display: flex; transition: transform 0.15s linear; }
        .compass-mark { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 60px; flex-shrink: 0; }
        .tick { width: 2px; height: 8px; background: var(--bv-muted); opacity: 0.7; margin-bottom: 4px; border-radius: 2px; }
        .tick.major { height: 16px; background: var(--bv-primary); opacity: 1; width: 3px; }
        .compass-label { color: var(--bv-muted); font-size: 12px; font-weight: 600; }
        .compass-label.major { color: var(--bv-text); font-size: 14px; font-weight: 900; }
        .compass-center-line { position: absolute; left: 50%; top: 0; width: 3px; height: 30px; background: var(--bv-danger); transform: translateX(-50%); z-index: 10; border-radius: 2px; }
        .hud-speed-container { position: absolute; bottom: calc(30px + env(safe-area-inset-bottom, 0px)); right: 20px; background: var(--bv-glass); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); padding: 12px 18px; border-radius: 16px; border: 1px solid var(--bv-border); box-shadow: var(--bv-shadow); z-index: 1000; display: none; }
        .speed-wrapper { display: flex; align-items: baseline; justify-content: center; gap: 5px; }
        .speed-val { font-size: 42px; font-weight: 900; color: var(--bv-primary); line-height: 0.9; font-variant-numeric: tabular-nums; }
        .speed-unit { font-size: 16px; font-weight: bold; color: var(--bv-muted); }
        .hud-speed-container [hidden] { display: none !important; }
        .hud-speed-container.nav-on { width: min(290px, calc(100vw - 110px)); box-sizing: border-box; padding: 8px 12px 10px; }
        .hud-speed-container.nav-on .speed-wrapper { justify-content: flex-start; }
        .hud-speed-container.nav-on .speed-val { font-size: 36px; }
        .nvg-extra { display: none; flex-direction: column; gap: 6px; margin-bottom: 6px; }
        .hud-speed-container.nav-on .nvg-extra { display: flex; }
        .nvg-delay { display: none; margin-left: auto; font-size: 30px; font-weight: 900; line-height: 0.9; font-variant-numeric: tabular-nums; padding-left: 10px; border-left: 1px solid var(--bv-border); }
        .hud-speed-container.nav-on .nvg-delay { display: inline-block; }
        .nvg-delay.tardi { color: var(--bv-bad-t); }
        .nvg-delay.presto { color: var(--bv-warn-t); }
        .nvg-delay.puntuale { color: var(--bv-ok-t); }
        .nvg-delay.spento { color: var(--bv-muted); opacity: 0.7; }
        .nvg-lista { display: none; position: relative; max-height: 34vh; overflow-y: auto; border-bottom: 1px solid var(--bv-border); padding-bottom: 4px; }
        .nvg-lista.aperta { display: block; }
        .nvg-toggle { width: 100%; border: none; background: transparent; color: var(--bv-primary); font-size: 15px; line-height: 1; padding: 2px 0; cursor: pointer; }
        .nvg-toggle i { transition: transform 0.25s; }
        .nvg-toggle.aperto i { transform: rotate(180deg); }
        .nvg-next { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .nvg-next-txt { flex: 1; min-width: 0; }
        .nvg-next-label { font-size: 11px; font-weight: 600; color: var(--bv-muted); }
        .nvg-next-nome { font-size: 15px; font-weight: 800; color: var(--bv-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nvg-next-ora { flex: none; font-size: 20px; font-weight: 900; color: var(--bv-primary); font-variant-numeric: tabular-nums; }
        .nvg-act-row { display: flex; align-items: flex-start; gap: 6px; min-width: 0; }
        .nvg-turno { flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 36px; height: 26px; padding: 0 4px; box-sizing: border-box; border-radius: 6px; background: var(--bv-primary); color: #fff; font-size: 12px; font-weight: 800; line-height: 1; }
        .nvg-turno small { font-size: 8px; font-weight: 700; letter-spacing: 0.3px; opacity: 0.85; }
        .nvg-linea { flex: none; min-width: 26px; height: 26px; padding: 0 4px; box-sizing: border-box; border-radius: 13px; border: 2px solid; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
        .nvg-id { flex: none; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .nvg-blocco { flex: 1; min-width: 0; }
        .nvg-ora { font-size: 16px; font-weight: 800; color: var(--bv-text); line-height: 1.1; font-variant-numeric: tabular-nums; }
        .nvg-luogo { font-size: 11px; font-weight: 600; color: var(--bv-muted); line-height: 1.15; margin-top: 1px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
        .nvg-freccia { flex: none; display: flex; flex-direction: column; align-items: center; gap: 2px; padding-top: 3px; color: var(--bv-muted); font-size: 13px; }
        .nvg-reb { font-size: 8px; font-weight: 800; color: #8b5cf6; }
        .nvg-tag { font-size: 11px; font-weight: 600; color: var(--bv-muted); margin-bottom: 3px; }
        .nvg-dest { flex: 1; min-width: 0; font-size: 13px; font-weight: 700; color: var(--bv-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nvg-msg { white-space: normal; font-size: 12px; font-weight: 600; color: var(--bv-muted); }
        .nvg-pre { flex: none; font-size: 12px; font-weight: 800; color: var(--bv-primary); }
        .nvg-pill { flex: none; font-size: 10px; font-weight: 800; padding: 3px 6px; border-radius: 6px; background: var(--bv-fill-2); color: var(--bv-muted); }
        .nvg-warn { color: var(--bv-warn-t); }
        .nvg-fermata { display: flex; align-items: center; gap: 8px; padding: 5px 4px; margin: 0 -4px; font-size: 13px; color: var(--bv-text); }
        .nvg-fermata.passata { opacity: 0.45; }
        .nvg-fermata.prossima { font-weight: 800; background: var(--bv-tint); border-radius: 6px; }
        .nvg-punto { flex: none; width: 8px; height: 8px; box-sizing: border-box; border-radius: 50%; border: 2px solid var(--bv-primary); background: var(--bv-surface); }
        .nvg-fnome { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nvg-fora { flex: none; font-weight: 700; font-variant-numeric: tabular-nums; }
        .nvg-fora.fine { color: var(--bv-primary); }
        .hud-status { position: absolute; top: calc(85px + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%); z-index: 1500; background: rgba(0,0,0,0.6); color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; display: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .nav-submodal-overlay { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); opacity: 0; transition: opacity 0.2s ease; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box; }
        .nav-submodal-overlay.active { display: flex; opacity: 1; }
        .nav-submodal { background: var(--bv-surface); color: var(--bv-text); padding: 20px; border-radius: 18px; border: 1px solid var(--bv-border); width: 90%; max-width: 320px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 10px 34px rgba(0,0,0,0.35); position: relative; }
        .nav-submodal h3 { margin: 0 0 15px; color: var(--bv-text); font-size: 17px; font-weight: 800; flex-shrink: 0; }
        .nav-search-container { position: relative; flex-shrink: 0; }
        .nav-submodal input[type="text"] { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--bv-border); background: var(--bv-fill); color: var(--bv-text); margin-bottom: 15px; box-sizing: border-box; outline: none; font-size: 14px; }
        .nav-submodal input[type="text"]::placeholder { color: var(--bv-muted); opacity: 0.8; }
        .nav-submodal input[type="text"]:focus { border-color: var(--bv-primary); box-shadow: 0 0 0 3px var(--bv-tint); }
        .nav-btn { background: var(--bv-primary); color: #fff; border: none; padding: 12px; width: 100%; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 14px; transition: filter 0.2s; flex-shrink: 0; margin-top: 15px; }
        .nav-btn:hover { filter: brightness(0.92); }
        .nav-btn.error { background: var(--bv-danger); }
        .nav-suggestions-dropdown { position: absolute; top: 48px; left: 0; right: 0; background: var(--bv-surface); border-radius: 12px; box-shadow: var(--bv-shadow); max-height: 220px; overflow-y: auto; z-index: 10; display: none; border: 1px solid var(--bv-border); }
        .nav-suggestions-dropdown.active { display: block; }
        .nav-suggestion-item { padding: 12px 15px; border-bottom: 1px solid var(--bv-border); cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; color: var(--bv-text); }
        .nav-suggestion-item:last-child { border-bottom: none; }
        .nav-suggestion-item:hover { background: var(--bv-tint); color: var(--bv-primary); }
        .nav-sugg-ico { width: 18px; text-align: center; color: var(--bv-primary); font-size: 14px; }
        .nav-suggestion-item.vuoto { justify-content: center; color: var(--bv-muted); cursor: default; }
        .nav-suggestion-item.vuoto:hover { background: transparent; color: var(--bv-muted); }
        .nav-filter-list { display: flex; flex-direction: column; overflow-y: auto; padding-right: 5px; flex-grow: 1; }
        .nav-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bv-border); }
        .nav-toggle-row:last-child { border-bottom: none; }
        .nav-toggle-info { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 14px; color: var(--bv-text); }
        .nav-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .nav-switch input { opacity: 0; width: 0; height: 0; }
        .nav-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(128, 128, 128, 0.4); transition: .3s; border-radius: 34px; }
        .nav-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.25); }
        .nav-switch input:checked + .nav-slider { background-color: var(--bv-ok); }
        .nav-switch input:checked + .nav-slider:before { transform: translateX(20px); }
        .nav-switch input:focus-visible + .nav-slider { outline: 2px solid var(--bv-primary); outline-offset: 2px; }
        #modal-navigatore-main ::-webkit-scrollbar { width: 6px; }
        #modal-navigatore-main ::-webkit-scrollbar-track { background: transparent; }
        #modal-navigatore-main ::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.4); border-radius: 10px; }

        /* Popup unità / fermate */
        .nav-pop { display: flex; align-items: center; gap: 10px; min-width: 130px; }
        .nav-pop .nav-line-dot { min-width: 36px; height: 36px; border-radius: 18px; font-size: 13px; }
        .nav-pop-ico { flex: none; width: 36px; height: 36px; border-radius: 12px; background: var(--bv-tint); color: var(--bv-primary); display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .nav-pop-txt { min-width: 0; }
        .nav-pop-title { font-size: 14px; font-weight: 800; line-height: 1.25; color: var(--bv-text); overflow-wrap: anywhere; }
        .nav-pop-sub { margin-top: 1px; font-size: 12px; font-weight: 500; color: var(--bv-muted); }
        .nav-pop-user { text-align: center; font-size: 13px; line-height: 1.4; color: var(--bv-text); }
        .nav-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: var(--bv-muted); }

        @media (prefers-reduced-motion: reduce) {
            .nav-fab-container .nav-fab, .nav-fab-container.chiuso .nav-fab, .nav-fab-menu i, .nav-tiles-osm { transition: none; }
            .nav-fab-tema i.swap { animation: none; }
        }
        </style>

    <div id="modal-navigatore-main">
        <!-- serve solo a leggere il colore di superficie del tema e capire se è scuro -->
        <div id="nav-theme-probe" style="display:none; background: var(--bv-surface);" aria-hidden="true"></div>
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
            <div class="nvg-extra">
                <div id="nvg-lista" class="nvg-lista"></div>
                <button id="nvg-toggle" class="nvg-toggle" type="button" aria-label="Mostra tutte le fermate" hidden><i class="fa-solid fa-chevron-up"></i></button>
                <div id="nvg-next" class="nvg-next" hidden>
                    <div class="nvg-next-txt">
                        <div id="nvg-next-label" class="nvg-next-label"></div>
                        <div id="nvg-next-nome" class="nvg-next-nome"></div>
                    </div>
                    <div id="nvg-next-ora" class="nvg-next-ora"></div>
                </div>
                <div id="nvg-act"></div>
            </div>
            <div class="speed-wrapper">
                <span id="speed-val" class="speed-val">0.0</span>
                <span class="speed-unit">km/h</span>
                <span id="nvg-delay" class="nvg-delay spento" title="Ritardo / anticipo">--</span>
            </div>
        </div>

        <div class="nav-fab-container chiuso">
            <div id="fab-gps" class="nav-fab" onclick="toggleGPS()" title="Attiva/Disattiva GPS">
                <i class="fa-solid fa-satellite-dish"></i>
            </div>
            <div id="fab-center" class="nav-fab" onclick="toggleCenterMap()" title="Centra sulla posizione" style="display: none;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2L4 20L12 17L20 20L12 2Z"/></svg>
            </div>
            <div id="fab-rotate" class="nav-fab" onclick="toggleMapRotation()" title="Rotazione mappa (rotta in alto)" style="display: none;">
                <i class="fa-regular fa-compass"></i>
            </div>
            <div id="fab-nav" class="nav-fab active" onclick="toggleNavigatoreRotta()" title="Navigatore turno" style="display: none;">
                <i class="fa-solid fa-route"></i>
            </div>
            <div id="fab-layers" class="nav-fab" onclick="cambiaStileMappa()" title="Cambia stile cartografico">
                <i class="fa-solid fa-layer-group"></i>
            </div>
            <div id="fab-tema" class="nav-fab nav-fab-tema" onclick="toggleNavTema()" role="button" title="Passa al tema scuro" aria-label="Passa al tema scuro">
                <i class="fa-solid fa-moon"></i>
            </div>
            <div id="fab-unit" class="nav-fab" onclick="apriNavigatoreUnitModal()" title="Configura unità" style="display: none;">
                <i class="fa-solid fa-ship"></i>
            </div>
            <div class="nav-fab" onclick="apriNavigatoreSearchModal()" title="Cerca mezzo o fermata"><i class="fa-solid fa-magnifying-glass"></i></div>
            <div class="nav-fab" onclick="apriNavigatoreFilterModal()" title="Filtra linee"><i class="fa-solid fa-filter"></i></div>
        </div>

        <!-- Apre/chiude la colonna dei tasti (chiusa di base) -->
        <div id="fab-menu" class="nav-fab nav-fab-menu" onclick="toggleNavMenu()" role="button" aria-expanded="false" aria-label="Mostra i tasti" title="Mostra i tasti">
            <i class="fa-solid fa-plus"></i>
        </div>

        <!-- Sottomodale Configurazione Unità -->
        <div id="nav-unit-modal" class="nav-submodal-overlay" onclick="chiudiNavigatoreModals(event)">
            <div class="nav-submodal" onclick="event.stopPropagation()">
                <h3>Configurazione unità</h3>
                <div style="margin-bottom: 12px;">
                    <label class="nav-label" for="nav-unit-name-input">Nome unità / mezzo</label>
                    <input type="text" id="nav-unit-name-input" placeholder="Es. M/B 1, M/S 200" autocomplete="off">
                </div>
                <button class="nav-btn" onclick="salvaNavigatoreConfigUnita()">Salva</button>
            </div>
        </div>

        <div id="nav-search-modal" class="nav-submodal-overlay" onclick="chiudiNavigatoreModals(event)">
            <div class="nav-submodal" onclick="event.stopPropagation()">
                <h3>Cerca mezzo o fermata</h3>
                <div class="nav-search-container">
                    <input type="text" id="nav-search-input" placeholder="Es. Rialto, 4.2..." autocomplete="off">
                    <div id="nav-search-suggestions" class="nav-suggestions-dropdown"></div>
                </div>
                <button id="nav-search-btn" class="nav-btn" onclick="eseguiNavigatoreSearch()">Cerca</button>
            </div>
        </div>
        
        <div id="nav-filter-modal" class="nav-submodal-overlay" onclick="chiudiNavigatoreModals(event)">
            <div class="nav-submodal" onclick="event.stopPropagation()">
                <h3>Filtra linee</h3>
                <div id="nav-filter-list" class="nav-filter-list" style="max-height:50vh;"></div>
                <button class="nav-btn" onclick="applicaNavigatoreFilter()">Applica filtro</button>
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
            const dotHtml = `<div class="nav-line-dot" style="background-color: ${c.bg}; color: ${c.text}; border-color: ${c.border};">${esc(b.line)}</div>`;
            html += `<div class="nav-suggestion-item" onclick="selezionaNavigatoreSuggestion('boat', '${b.id}')">
                        ${dotHtml} <span>${esc(b.label)}</span>
                     </div>`;
        });
        
        mStops.slice(0, 4).forEach(s => {
            html += `<div class="nav-suggestion-item" onclick="selezionaNavigatoreSuggestion('stop', '${s.id}')">
                        <i class="fa-solid fa-anchor nav-sugg-ico"></i> <span>${esc(s.name)}</span>
                     </div>`;
        });
        
        if(!html) html = `<div class="nav-suggestion-item vuoto">Nessun risultato trovato</div>`;
        
        suggBox.innerHTML = html;
        suggBox.classList.add('active');
    });

    window.chiudiNavigatore = chiudiNavigatore;
    window.toggleGPS = toggleGPS;
    window.toggleCenterMap = toggleCenterMap;
    window.toggleMapRotation = toggleMapRotation;
    window.cambiaStileMappa = cambiaStileMappa;
    window.apriNavigatoreUnitModal = apriNavigatoreUnitModal;
    window.salvaNavigatoreConfigUnita = salvaNavigatoreConfigUnita;
    window.chiudiNavigatoreModals = chiudiNavigatoreModals;
    window.apriNavigatoreSearchModal = apriNavigatoreSearchModal;
    window.apriNavigatoreFilterModal = apriNavigatoreFilterModal;
    window.eseguiNavigatoreSearch = eseguiNavigatoreSearch;
    window.applicaNavigatoreFilter = applicaNavigatoreFilter;
    window.selezionaNavigatoreSuggestion = selezionaNavigatoreSuggestion;
    window.toggleNavigatoreRotta = toggleNavigatoreRotta;
    window.toggleNavTema = toggleNavTema;
    window.toggleNavMenu = toggleNavMenu;

    document.getElementById('nvg-toggle').addEventListener('click', toggleListaFermate);
}

// ==========================================
// INIZIALIZZAZIONE E MOTORE
// ==========================================
// ---- Tema chiaro/scuro: segue le variabili dell'app (come dashboard.js) ----
// Legge il colore reale di --surface e, se è scuro, accende la classe nav-dark (mappa scura, colori testo adatti).
let navTemaObserver = null;
// Tema forzato col tasto sole/luna: vale solo finché la pagina resta aperta, non viene salvato (null = segue l'app)
let navTemaForzato = null;

function navAggiornaIconaTema(scuro, anima) {
    const btn = document.getElementById('fab-tema');
    const ico = btn && btn.querySelector('i');
    if (!ico) return;
    ico.className = scuro ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    const testo = scuro ? 'Passa al tema chiaro' : 'Passa al tema scuro';
    btn.title = testo;
    btn.setAttribute('aria-label', testo);
    if (anima) { void ico.offsetWidth; ico.classList.add('swap'); }
}

function navAggiornaTema(anima) {
    const root = document.getElementById('modal-navigatore-main');
    const probe = document.getElementById('nav-theme-probe');
    if (!root || !probe) return;
    let scuro;
    if (navTemaForzato) {
        scuro = navTemaForzato === 'dark';
    } else {
        const m = getComputedStyle(probe).backgroundColor.match(/[\d.]+/g);
        if (!m || m.length < 3) return;
        const [r, g, b] = m.map(Number);
        scuro = (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
    }
    root.classList.toggle('nav-forza-scuro', navTemaForzato === 'dark');
    root.classList.toggle('nav-forza-chiaro', navTemaForzato === 'light');
    root.classList.toggle('nav-dark', scuro);
    navAggiornaIconaTema(scuro, anima === true);
}

function toggleNavTema() {
    const root = document.getElementById('modal-navigatore-main');
    if (!root) return;
    navTemaForzato = root.classList.contains('nav-dark') ? 'light' : 'dark';
    navAggiornaTema(true);
}

function avviaOsservatoreTema() {
    navAggiornaTema();
    if (navTemaObserver) return;
    try {
        navTemaObserver = new MutationObserver(navAggiornaTema);
        const opz = { attributes: true, attributeFilter: ['class', 'data-theme', 'data-bs-theme', 'style'] };
        navTemaObserver.observe(document.documentElement, opz);
        navTemaObserver.observe(document.body, opz);
        if (window.matchMedia) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            if (mq.addEventListener) mq.addEventListener('change', navAggiornaTema);
        }
    } catch (e) { /* il tema non deve mai rompere la mappa */ }
}

// Apre/chiude la colonna dei tasti. Delay a cascata: in apertura parte il tasto più vicino al fondo, in chiusura quello in alto.
let menuFabAperto = false;
let menuFabTimer = null;
function toggleNavMenu(forza = null) {
    const cont = document.querySelector('#modal-navigatore-main .nav-fab-container');
    const btn = document.getElementById('fab-menu');
    if (!cont || !btn) return;
    const apri = forza !== null ? !!forza : !menuFabAperto;
    menuFabAperto = apri;
    const visibili = [...cont.children].filter(el => el.style.display !== 'none');
    visibili.forEach((el, i) => {
        const dalBasso = visibili.length - 1 - i;
        el.style.transitionDelay = ((apri ? dalBasso : i) * 40) + 'ms';
    });
    cont.classList.toggle('chiuso', !apri);
    btn.classList.toggle('active', apri);
    btn.setAttribute('aria-expanded', String(apri));
    const testo = apri ? 'Nascondi i tasti' : 'Mostra i tasti';
    btn.setAttribute('aria-label', testo);
    btn.title = testo;
    clearTimeout(menuFabTimer);
    menuFabTimer = setTimeout(() => visibili.forEach(el => { el.style.transitionDelay = ''; }), 700);
}

export async function avviaMotoreNavigatore(db, auth, userData) {
    tracciaApertura('/navigatore-lite', 'BateoLive Lite');
    currentUserId = (auth && auth.currentUser) ? auth.currentUser.uid : 'user_' + Math.random().toString(36).substr(2, 9);
    currentUserName = (userData && userData.nome) ? userData.nome : "Collega";
    userMansione = (userData && userData.mansione) || null;

    initUINavigatore();
    document.getElementById('modal-navigatore-main').style.display = 'flex';
    avviaOsservatoreTema();
    
    await loadMapDependencies();
    
    if (!map) {
        baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'nav-tiles-osm' });
        baseSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
        nauticLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { maxZoom: 18 });

        map = L.map('nav-map', { 
            attributionControl: false, 
            zoomControl: false,
            layers: [baseOSM, nauticLayer]
        }).setView([45.4371, 12.3326], 13);

        // rotta della linea: sopra le tile, sotto marker di unità e fermate, non intercetta i click
        map.createPane('nav-rotta');
        map.getPane('nav-rotta').style.zIndex = 430;
        map.getPane('nav-rotta').style.pointerEvents = 'none';

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

function apriNavigatoreUnitModal() {
    document.getElementById('nav-unit-modal').classList.add('active');
    document.getElementById('nav-unit-name-input').value = customUnitName;
}

function salvaNavigatoreConfigUnita() {
    customUnitName = document.getElementById('nav-unit-name-input').value.trim();
    chiudiNavigatoreModals({ target: { classList: { contains: () => true } } });
}

function chiudiNavigatore() {
    document.getElementById('modal-navigatore-main').style.display = 'none';
    if (watchId) navigator.geolocation.clearWatch(watchId);
    document.getElementById('hud-compass').style.display = 'none';
    document.getElementById('hud-speed').style.display = 'none';
    document.getElementById('fab-center').style.display = 'none';
    document.getElementById('fab-rotate').style.display = 'none';
    document.getElementById('fab-gps').classList.remove('active');
    document.getElementById('fab-unit').style.display = 'none';
    document.getElementById('fab-nav').style.display = 'none';
    fermaNavigatore();
    toggleNavMenu(false);
    
    courseUp = false;
    followUser = false;
    const mapEl = document.getElementById('nav-map');
    mapEl.style.transform = `rotate(0deg)`;
    mapEl.style.setProperty('--marker-rotation', `0deg`);

    customUnitName = '';
    customLine = '';
    localStorage.removeItem('bv_custom_unit');

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
        hudStatus.innerText = "Mappa base nautica";
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
        document.getElementById('fab-unit').style.display = 'none';
        document.getElementById('fab-nav').style.display = 'none';
        fermaNavigatore();
        
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
        document.getElementById('fab-unit').style.display = 'flex';
        document.getElementById('fab-nav').style.display = 'flex';
        avviaNavigatore();
        
        toggleCenterMap(true);
        toggleMapRotation(true);   // col GPS acceso la mappa ruota subito con la rotta
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
    aggiornaPosizioneNavigatore(coords, now, avgSpeedMs);

    if (coords.heading !== null && (rawSpeedMs >= 0.5 || lastValidHeading === null)) {
        lastValidHeading = coords.heading;
    }
    
    let validHeading = lastValidHeading || 0;

    const svgArrow = `
    <div style="transform: rotate(${validHeading}deg); width:32px; height:32px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5)); transition: transform 0.2s linear;">
        <svg width="28" height="28" viewBox="0 0 24 24" style="fill:var(--bv-primary)" stroke="white" stroke-width="1.5" stroke-linejoin="round">
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

    renderNavigatore(); // aggiorna anche la linea (da turno) che viene inviata agli altri utenti
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
            nome: customUnitName || currentUserName,
            line: customLine || ''
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

        const nextHiddenActvUnitNames = new Set();

        activeIds.forEach(uid => {
            if (uid === currentUserId) return; 

            const u = users[uid];
            const uHeading = u.heading || 0;
            const uLine = u.line ? u.line.trim() : '';

            const normalizedUnitName = normalizzaNomeUnita(u.nome);
            if (normalizedUnitName) nextHiddenActvUnitNames.add(normalizedUnitName);

            let iconHtml = '';
            let iconSize = [32, 32];
            let iconAnchor = [16, 16];

            if (uLine) {
                const c = getLineColors(uLine.toUpperCase());
                iconHtml = `<div class="nav-boat-icon" style="background-color: ${c.bg}; color: ${c.text}; border: 3px solid var(--bv-ok); width: 26px; height: 26px; box-sizing: border-box;">${uLine}</div>`;
                iconSize = [26, 26];
                iconAnchor = [13, 13];
            } else {
                iconHtml = `
                <div style="transform: rotate(${uHeading}deg); width:32px; height:32px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5)); transition: transform 0.2s linear;">
                    <svg width="28" height="28" viewBox="0 0 24 24" style="fill:var(--bv-ok)" stroke="white" stroke-width="1.5" stroke-linejoin="round">
                        <path d="M12 2L4 20L12 17L20 20L12 2Z"/>
                    </svg>
                </div>`;
            }

            const icon = L.divIcon({ html: iconHtml, className: '', iconSize: iconSize, iconAnchor: iconAnchor });

            let popupContent = `<div class="nav-pop-user">Velocità: ${parseFloat(u.speed || 0).toFixed(1)} km/h</div>`;
            if (u.nome && u.nome !== currentUserName) {
                popupContent = `<div class="nav-pop-user"><b>${esc(u.nome)}</b><br>Velocità: ${parseFloat(u.speed || 0).toFixed(1)} km/h</div>`;
            }

            if (otherUsersMarkers[uid]) {
                otherUsersMarkers[uid].setLatLng([u.lat, u.lon]);
                otherUsersMarkers[uid].setIcon(icon);
                if (otherUsersMarkers[uid].getPopup()) {
                    otherUsersMarkers[uid].getPopup().setContent(popupContent);
                }
            } else {
                const marker = L.marker([u.lat, u.lon], { icon: icon }).addTo(map);
                marker.bindPopup(popupContent);
                otherUsersMarkers[uid] = marker;
            }
        });

        Object.keys(otherUsersMarkers).forEach(uid => {
            if (!activeIds.includes(uid)) {
                map.removeLayer(otherUsersMarkers[uid]);
                delete otherUsersMarkers[uid];
            }
        });

        hiddenActvUnitNames = nextHiddenActvUnitNames;
        aggiornaVisibilitaBarcheActv();
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
            marker.bindPopup(`<div class="nav-pop"><span class="nav-pop-ico"><i class="fa-solid fa-anchor"></i></span><div class="nav-pop-txt"><div class="nav-pop-title">${esc(stop.name)}</div><div class="nav-pop-sub">Fermata</div></div></div>`);
            oms.addMarker(marker); 
        });
    } catch(e) { console.error("Errore fermate:", e); }
}

// Normalizza un nome unità per il confronto: maiuscolo, senza prefisso M/S M/B M/N M/Z
// (con o senza slash/spazio, es. "M/S 200", "MS200", "M/S200" -> "200"), e senza spazi/simboli superflui.
function normalizzaNomeUnita(nome) {
    if (!nome) return '';
    return nome
        .toUpperCase()
        .replace(/\bM\s*\/?\s*[SBNZ]\b\.?\s*/g, '')
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim();
}

// Crea/aggiorna/rimuove il marker di una singola unità ACTV, nascondendola se un altro
// utente ha inserito manualmente lo stesso nome unità (i suoi dati GPS sono più precisi).
function renderOrHideBoatMarker(boat) {
    if (!boat.lat || !boat.lon) return;

    if (currentFilterLines.length > 0 && !currentFilterLines.includes(boat.line.toUpperCase())) {
        if (boatMarkers[boat.id]) { oms.removeMarker(boatMarkers[boat.id]); map.removeLayer(boatMarkers[boat.id]); delete boatMarkers[boat.id]; }
        return;
    }

    const normalizedLabel = normalizzaNomeUnita(boat.label);
    if (normalizedLabel && hiddenActvUnitNames.has(normalizedLabel)) {
        if (boatMarkers[boat.id]) { oms.removeMarker(boatMarkers[boat.id]); map.removeLayer(boatMarkers[boat.id]); delete boatMarkers[boat.id]; }
        return;
    }

    const c = boat.line === '-' ? { bg: '#000000', text: '#ffffff', border: '#ffffff' } : getLineColors(boat.line.toUpperCase());

    const iconHtml = `<div class="nav-boat-icon" style="background-color: ${c.bg}; color: ${c.text}; border: 2.5px solid ${c.border}; width: 26px; height: 26px; box-sizing: border-box;">${boat.line}</div>`;
    const customBoatIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });

    const popupContent = `<div class="nav-pop"><span class="nav-line-dot" style="background-color:${c.bg};color:${c.text};border-color:${c.border};">${esc(boat.line)}</span><div class="nav-pop-txt"><div class="nav-pop-title">${esc(boat.label)}</div><div class="nav-pop-sub">${boat.line === '-' ? 'Unità' : 'Linea ' + esc(boat.line)}</div></div></div>`;

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

// Riapplica la logica di visibilità (usata quando cambia l'elenco degli altri utenti)
// senza dover rifare la fetch delle unità ACTV.
function aggiornaVisibilitaBarcheActv() {
    if (!map) return;
    globalBoats.forEach(boat => renderOrHideBoatMarker(boat));
}

async function fetchAndUpdateBoats() {
    if (!map) return;
    try {
        const response = await fetch(`${API_URL}/api/vaporetti/live`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const boats = await response.json();
        globalBoats = boats;

        boats.forEach(boat => renderOrHideBoatMarker(boat));
    } catch (error) { console.error("Errore Vaporetti:", error); }
}

function chiudiNavigatoreModals(e) { 
    if (e && e.target && e.target.classList && !e.target.classList.contains('nav-submodal-overlay')) return;
    document.getElementById('nav-search-modal').classList.remove('active'); 
    document.getElementById('nav-filter-modal').classList.remove('active'); 
    document.getElementById('nav-unit-modal').classList.remove('active');
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
            const c = getLineColors(line);
            html += `
            <div class="nav-toggle-row">
                <div class="nav-toggle-info">
                    <div class="nav-line-dot" style="background-color: ${c.bg}; color: ${c.text}; border-color: ${c.border};">${esc(line)}</div>
                    <span>Linea ${esc(line)}</span>
                </div>
                <label class="nav-switch">
                    <input type="checkbox" value="${esc(line)}" class="nav-line-filter-cb" ${isChecked}>
                    <span class="nav-slider"></span>
                </label>
            </div>`;
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
        if (stop) { map.setView([stop.lat, stop.lon], 16); L.popup().setLatLng([stop.lat, stop.lon]).setContent(`<div class="nav-pop"><span class="nav-pop-ico"><i class="fa-solid fa-anchor"></i></span><div class="nav-pop-txt"><div class="nav-pop-title">${esc(stop.name)}</div><div class="nav-pop-sub">Fermata</div></div></div>`).openOn(map); }
    } else if (type === 'boat') {
        const boat = globalBoats.find(b => b.id === id);
        if(boat) { map.setView([boat.lat, boat.lon], 16); if (boatMarkers[boat.id]) boatMarkers[boat.id].openPopup(); }
    }
}

// ==========================================
// NAVIGATORE DI TURNO (ex gps.js)
// Calcola da solo il turno del giorno, scarica fermate e percorso dal backend e, con la posizione GPS,
// ricava ritardo/anticipo, prossima fermata e rotta della corsa in corso.
// ==========================================

// Nei giorni con varianti di servizio gli orari dei turni possono non valere: come la dashboard,
// in quei giorni non si carica il turno. Metti false per usare comunque gli orari del libro turni.
const BLOCCA_SE_VARIANTI = true;


// --- parametri della navigazione
const SOGLIA_FERMATA_M = 30;      // entro questa distanza dalla fermata il mezzo è "in fermata"
const ACCURATEZZA_MAX_M = 80;     // fix GPS meno precisi di così non servono per la posizione sul percorso
const FUORI_PERCORSO_M = 120;     // oltre questa distanza dalla linea non si è più sul percorso
const FINESTRA_INDIETRO_M = 150;  // dove cercare il mezzo rispetto all'ultima posizione nota
const FINESTRA_AVANTI_M = 800;
const FIX_SCADUTO_MS = 15000;     // senza fix da più di così il ritardo non si mostra
const SMORZA_RITARDO = 0.2;       // peso di ogni nuovo fix nella media mobile del ritardo
const PESO_CONTINUITA = 0.25;      // metri di "costo" per ogni metro di scostamento dalla posizione prevista
const SOGLIA_MOVIMENTO_MS = 1.5;    // sopra questa velocità (m/s) il mezzo si considera in movimento
const PRECARICA_MIN = 15;         // quanti minuti prima si caricano le fermate della corsa successiva

const pad2 = (n) => String(n).padStart(2, '0');

// secondi dall'inizio di un giorno -> "HH:MM" (oltre le 24 riparte da 00:00)
function hhmm(sec) {
    const min = Math.floor(sec / 60);
    return `${pad2(((Math.floor(min / 60) % 24) + 24) % 24)}:${pad2(((min % 60) + 60) % 60)}`;
}
function parseHHMM(s) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(s || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// secondi trascorsi dalla mezzanotte del giorno del turno (anche oltre 86400 se il turno è iniziato "ieri")
function secondiDalGiorno(dataTurnoISO, d = new Date()) {
    const giorni = stringToNum(dateToLocalISO(d)) - stringToNum(dataTurnoISO);
    return giorni * 86400 + d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
}

// "+3'" ritardo, "-2'" anticipo, "0'" in orario
function formattaRitardo(sec) {
    const m = Math.round(sec / 60);
    return (m > 0 ? '+' : m < 0 ? '-' : '') + Math.abs(m) + "'";
}

// ==========================================
// 2. GEOMETRIA DEL PERCORSO (funzioni pure)
// ==========================================
const R_TERRA = 6371008.8;
const RAD = Math.PI / 180;

function interpola(xs, ys, v) {
    // ys in funzione di xs (xs crescente), con estremi bloccati
    if (v <= xs[0]) return ys[0];
    const n = xs.length - 1;
    if (v >= xs[n]) return ys[n];
    let lo = 0, hi = n;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= v) lo = mid; else hi = mid; }
    const span = xs[hi] - xs[lo];
    const t = span > 0 ? (v - xs[lo]) / span : 0;
    return ys[lo] + t * (ys[hi] - ys[lo]);
}

// Indice del segmento che contiene la distanza d (cum crescente)
function cercaSegmento(cum, d) {
    const n = cum.length - 1;
    if (d <= cum[0]) return 0;
    if (d >= cum[n]) return n - 1;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
    return lo;
}

// Il percorso dal server (intero shape) viene ritagliato tra la prima e l'ultima fermata del tratto del turno.
function ritaglia(p, d0, d1) {
    const pts = [{ lat: interpola(p.dist, p.lat, d0), lon: interpola(p.dist, p.lon, d0), d: 0 }];
    for (let i = 0; i < p.dist.length; i++) {
        if (p.dist[i] > d0 + 0.5 && p.dist[i] < d1 - 0.5) pts.push({ lat: p.lat[i], lon: p.lon[i], d: p.dist[i] - d0 });
    }
    pts.push({ lat: interpola(p.dist, p.lat, d1), lon: interpola(p.dist, p.lon, d1), d: d1 - d0 });
    return pts;
}

// Orari di una corsa in secondi dal giorno del turno. Usa arrivo_sec/partenza_sec del backend;
// se mancano ripiega su "HH:MM", aggiungendo 24 ore ogni volta che l'orario "torna indietro".
function orariCorsa(dati, dataTurno) {
    const sfasa = (stringToNum(dati.corsa && dati.corsa.data_servizio) - stringToNum(dataTurno)) * 86400 || 0;
    const fc = dati.fermate;
    let giorno = 0, prec = -1;
    const fallback = (s, oltre) => {
        let v = parseHHMM(s) * 60;
        if (prec < 0 && oltre && v < 12 * 3600) giorno = 86400;
        while (v + giorno < prec) giorno += 86400;
        prec = v + giorno;
        return v + giorno;
    };
    return fc.map((f) => ({
        arr: (Number.isFinite(f.arrivo_sec) ? f.arrivo_sec : fallback(f.arrivo, f.oltre_mezzanotte)) + sfasa,
        dep: (Number.isFinite(f.partenza_sec) ? f.partenza_sec : fallback(f.partenza, f.oltre_mezzanotte)) + sfasa,
    }));
}

// Mette insieme una o più corse (più di una solo nei rebecchini) in un unico percorso:
//   { lat[], lon[], x[], y[], cum[], lunghezza, geometria, fermate: [{ id, nome, dist, arr, dep }] }
// tratte = [{ corsa: risposta di /corsa, percorso: risposta di /percorso | null }]
function costruisciPercorso(tratte, dataTurno) {
    const punti = [];
    const fermate = [];
    let offset = 0;
    let geometria = true;

    tratte.forEach((t, n) => {
        const { fermate: fc, tratta } = t.corsa;
        const orari = orariCorsa(t.corsa, dataTurno);
        const p = t.percorso;
        const conGeometria = !!(p && p.fermate && p.fermate.length === fc.length && p.fermate[tratta.a].dist > p.fermate[tratta.da].dist);
        let d0 = 0;
        if (conGeometria) {
            d0 = p.fermate[tratta.da].dist;
            const pts = ritaglia(p, d0, p.fermate[tratta.a].dist);
            pts.forEach((pt, k) => { if (n === 0 || k > 0) punti.push({ lat: pt.lat, lon: pt.lon, d: offset + pt.d }); });
        } else geometria = false;

        for (let i = tratta.da; i <= tratta.a; i++) {
            const dist = conGeometria ? offset + p.fermate[i].dist - d0 : 0;
            if (n > 0 && i === tratta.da) {
                // fermata di passaggio tra due corse (rebecchino): arriva con la prima corsa, riparte con la seconda
                const ultima = fermate[fermate.length - 1];
                if (ultima) ultima.dep = orari[i].dep;
                continue;
            }
            fermate.push({ id: fc[i].id, nome: fc[i].nome, dist, arr: orari[i].arr, dep: orari[i].dep });
        }
        if (conGeometria) offset = punti[punti.length - 1].d;
    });

    const percorso = { fermate, geometria, lunghezza: geometria ? offset : 0, lat: [], lon: [], x: [], y: [], cum: [] };
    if (geometria) {
        const lat0 = punti.reduce((s, q) => s + q.lat, 0) / punti.length;
        const lon0 = punti.reduce((s, q) => s + q.lon, 0) / punti.length;
        const kx = RAD * R_TERRA * Math.cos(lat0 * RAD);
        const ky = RAD * R_TERRA;
        percorso.origine = { lat0, lon0, kx, ky };
        for (const q of punti) {
            percorso.lat.push(q.lat); percorso.lon.push(q.lon); percorso.cum.push(q.d);
            percorso.x.push((q.lon - lon0) * kx); percorso.y.push((q.lat - lat0) * ky);
        }
    }
    return percorso;
}

// Posizione (x, y in metri nel riferimento del percorso) di un punto GPS
function aPiano(rt, lat, lon) {
    const o = rt.origine;
    return { x: (lon - o.lon0) * o.kx, y: (lat - o.lat0) * o.ky };
}

// Dove si trova, in base all'orario, il mezzo se fosse perfettamente in orario (usato per scegliere tra due passaggi)
function alongDaOrario(rt, nowSec) {
    const F = rt.fermate;
    if (nowSec <= F[0].dep) return F[0].dist;
    for (let k = 0; k < F.length - 1; k++) {
        if (nowSec <= F[k + 1].arr) {
            const span = F[k + 1].arr - F[k].dep;
            const t = span > 0 ? Math.max(0, Math.min(1, (nowSec - F[k].dep) / span)) : 1;
            return F[k].dist + t * (F[k + 1].dist - F[k].dist);
        }
        if (nowSec <= F[k + 1].dep) return F[k + 1].dist;
    }
    return F[F.length - 1].dist;
}

// Proietta la posizione sul percorso. Con una posizione precedente cerca solo nei dintorni, preferendo il punto
// coerente con il moto ("atteso" = ultima posizione + velocità × tempo): così le andate e ritorno a pochi metri
// di distanza (canali senza uscita) e i ripassi dallo stesso punto non fanno saltare la posizione.
// Se non trova nulla cerca su tutto il percorso. Restituisce { along, scarto } oppure null.
function proietta(rt, x, y, ultimaAlong, nowSec, atteso) {
    const nSeg = rt.x.length - 1;
    if (nSeg < 1) return null;

    const valuta = (i) => {
        const ax = rt.x[i], ay = rt.y[i], dx = rt.x[i + 1] - ax, dy = rt.y[i + 1] - ay;
        const l2 = dx * dx + dy * dy;
        let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        return { along: rt.cum[i] + t * (rt.cum[i + 1] - rt.cum[i]), scarto: Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) };
    };

    if (ultimaAlong != null) {
        const i0 = cercaSegmento(rt.cum, ultimaAlong - FINESTRA_INDIETRO_M);
        const i1 = cercaSegmento(rt.cum, ultimaAlong + FINESTRA_AVANTI_M);
        const previsto = atteso != null ? atteso : ultimaAlong;
        const candidatiLocali = [];
        let migliorScarto = Infinity;
        for (let i = i0; i <= i1; i++) {
            const c = valuta(i);
            if (c.scarto > FUORI_PERCORSO_M) continue;
            candidatiLocali.push(c);
            if (c.scarto < migliorScarto) migliorScarto = c.scarto;
        }
        if (candidatiLocali.length) {
            // Nei punti in cui andata e ritorno si sovrappongono (es. Colonna a Murano)
            // la sola distanza geometrica non basta: i due passaggi possono essere a pochi
            // metri ma molto distanti lungo il giro. In questi casi usiamo anche la posizione
            // prevista dall'orario per evitare di saltare direttamente al passaggio successivo.
            const ambigui = candidatiLocali.filter(c => c.scarto <= migliorScarto + 25);
            if (ambigui.length > 1) {
                const attesa = alongDaOrario(rt, nowSec);
                ambigui.forEach(c => {
                    c.costo = c.scarto
                        + PESO_CONTINUITA * Math.abs(c.along - previsto)
                        + 0.80 * Math.abs(c.along - attesa);
                });
                ambigui.sort((a, b) => a.costo - b.costo);
                return ambigui[0];
            }
            candidatiLocali.sort((a, b) =>
                (a.scarto + PESO_CONTINUITA * Math.abs(a.along - previsto)) -
                (b.scarto + PESO_CONTINUITA * Math.abs(b.along - previsto))
            );
            return candidatiLocali[0];
        }
    }

    // ricerca su tutto il percorso: un candidato per ogni passaggio della linea vicino al punto
    const candidati = [];
    let corrente = null;
    let migliore = null;
    for (let i = 0; i < nSeg; i++) {
        const c = valuta(i);
        if (!migliore || c.scarto < migliore.scarto) migliore = c;
        if (c.scarto <= FUORI_PERCORSO_M) { if (!corrente || c.scarto < corrente.scarto) corrente = c; }
        else if (corrente) { candidati.push(corrente); corrente = null; }
    }
    if (corrente) candidati.push(corrente);
    if (!candidati.length) return migliore; // fuori percorso: si riporta comunque il punto più vicino
    const attesa = alongDaOrario(rt, nowSec);
    const vicini = candidati.filter((c) => c.scarto <= migliore.scarto + 40);
    vicini.sort((a, b) => Math.abs(a.along - attesa) - Math.abs(b.along - attesa));
    return vicini[0];
}

// Orario che il mezzo dovrebbe avere in questo punto del percorso (interpolando tra le fermate in base alla distanza)
function orarioProgrammato(rt, along, nowSec) {
    const F = rt.fermate;
    const k0 = F.findIndex((f) => Math.abs(along - f.dist) <= SOGLIA_FERMATA_M);
    if (k0 >= 0) {
        // in fermata: finché si è dentro l'orario di sosta non c'è scostamento
        if (k0 === 0 && nowSec < F[0].dep) return nowSec; // in attesa di partire
        return Math.max(F[k0].arr, Math.min(F[k0].dep, nowSec));
    }
    if (along <= F[0].dist) return F[0].dep;
    for (let k = 0; k < F.length - 1; k++) {
        if (along < F[k + 1].dist) {
            const span = F[k + 1].dist - F[k].dist;
            const t = span > 0 ? (along - F[k].dist) / span : 0;
            return F[k].dep + t * (F[k + 1].arr - F[k].dep);
        }
    }
    return F[F.length - 1].arr;
}

// Prossima fermata in base alla posizione. "minimo" è l'indice sotto il quale le fermate sono già passate,
// "velocita" (m/s) serve a distinguere un mezzo che arriva alla fermata da uno che la sta lasciando.
function trovaProssima(rt, along, nowSec, minimo, velocita) {
    const F = rt.fermate;
    const inMovimento = velocita != null && velocita > SOGLIA_MOVIMENTO_MS;
    for (let k = Math.max(0, minimo); k < F.length; k++) {
        const d = F[k].dist - along; // > 0: la fermata è ancora avanti
        if (d > SOGLIA_FERMATA_M) return { idx: k, stato: 'in arrivo', distM: d };
        if (d >= -SOGLIA_FERMATA_M) {
            if (k === F.length - 1) return inMovimento && d > 10 ? { idx: k, stato: 'in arrivo', distM: d } : { idx: k, stato: 'arrivato', distM: 0 };
            if (d > 0 && inMovimento) return { idx: k, stato: 'in arrivo', distM: d };
            if (d <= 0 && inMovimento) continue; // la sta lasciando
            return { idx: k, stato: 'in fermata', distM: 0 };
        }
    }
    return { idx: F.length - 1, stato: 'arrivato', distM: 0 };
}

// Senza GPS: prossima fermata secondo l'orario
function trovaProssimaDaOrario(rt, nowSec) {
    const F = rt.fermate;
    for (let k = 0; k < F.length; k++) {
        const t = k === F.length - 1 ? F[k].arr : F[k].dep;
        if (nowSec <= t) return { idx: k, stato: 'in arrivo', distM: null };
    }
    return { idx: F.length - 1, stato: 'arrivato', distM: null };
}

// ---------------------------------------------------------------- stato del navigatore
let gpsAttivo = false;                 // GPS di BateoLive acceso
let navVisibile = true;                // tasto fa-route: false = solo velocità
let navTimer = null;
let userMansione = null;

let datiTurni = null;                  // rotazioni, disponibilità, varianti, ferie (turni-core.js, scaricati una volta sola)
const cacheFetch = new Map();          // url -> json
let inCaricamento = false;
let turnoCorrente = null;              // { data, codice, stato, attivita, turno }
let ultimoTentativoTurno = 0;
let oraRif = null;                     // { giorno, presto } usato per capire quando ricaricare il turno

let attKey = null;                     // attività di cui si sta caricando/mostrando il percorso
let percorso = null;                   // percorso costruito per l'attività, null finché non arriva
let percorsoStato = 'nessuno';         // nessuno | caricamento | ok | errore
let percorsoErroreTs = 0;
let direzioneCorsa = '';
let lineaCorsa = '';
let tokenPercorso = 0;
let minimoFermata = 0;                 // le fermate sotto questo indice sono già passate

let gpsPos = { lat: null, lon: null, acc: null, vel: null, along: null, scarto: null, ts: 0, fuori: false, ritardoIstantaneo: 0 };
let ritardoSmussato = null;
let firmaLista = '';
let listaAperta = false;
let htmlAttPrecedente = '';

let rottaLayer = null;                 // rotta della linea sulla mappa
let rottaKey = null;

const navEl = (id) => document.getElementById(id);


// ---------------------------------------------------------------- turno del giorno e percorso
async function initCaches() {
    if (datiTurni && !datiTurni.incompleto) return;
    try { datiTurni = await caricaDatiTurni(); }
    catch (e) { console.error("GPS: errore cache turni", e); }
}

async function fetchJson(url) {
    if (cacheFetch.has(url)) return cacheFetch.get(url);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const dati = await resp.json();
    cacheFetch.set(url, dati);
    return dati;
}

// Turno di un giorno: { data, codice, stato: 'ok' | 'riposo' | 'varianti' | 'errore', attivita[], turno }
async function turnoDelGiorno(dStr) {
    let state = {};
    try { state = JSON.parse(localStorage.getItem('myTurniApp')) || {}; } catch (e) { }
    const manuale = !!(state.variazioni && state.variazioni[dStr]);
    let codice = turnoEffettivo(dStr, state, datiTurni, userMansione);
    // ferie previste dalla rotazione ferie (come nel calendario): senza variazione manuale il turno diventa FEP
    if (!manuale && datiTurni && !["RI", "AL"].includes(String(codice).toUpperCase())) {
        const ferie = ferieDelGiorno(state, dStr, datiTurni.ferie);
        if (ferie) codice = ferie;
    }
    const senzaCorse = !codice || TURNI_SENZA_CORSE.includes(String(codice).toUpperCase().trim());
    const esito = { data: dStr, codice: codice || "N/D", stato: 'ok', attivita: [], turno: null };

    if (senzaCorse) { esito.stato = 'riposo'; return esito; }
    if (esito.codice === "N/D") { esito.stato = 'nd'; return esito; }
    if (BLOCCA_SE_VARIANTI && haVarianti(datiTurni, dStr)) { esito.stato = 'varianti'; return esito; }

    try {
        const dati = await fetchJson(`${API_URL}/api/v1/turno?codice=${encodeURIComponent(codice)}&data=${encodeURIComponent(dStr)}`);
        esito.turno = dati.turno;
        esito.attivita = preparaAttivita(dati.turno);
    } catch (e) {
        console.warn("GPS: turno non disponibile", e);
        esito.stato = 'errore';
    }
    return esito;
}

// Attività in ordine, con partenza/arrivo in minuti dalla mezzanotte del giorno del turno (_p, _a)
function preparaAttivita(turno) {
    const tutte = [...unisciRebecchini(turno.corse_linea || []), ...(turno.altre_attivita || [])]
        .sort((a, b) => a.ordine - b.ordine)
        .map((a) => ({ ...a }));
    let prec = 0;
    for (const act of tutte) {
        const conMin = Number.isFinite(act.partenza_min);
        let p = conMin ? act.partenza_min : parseHHMM(act.partenza);
        if (p == null) p = prec;
        if (!conMin) while (p < prec) p += 1440;
        const aConMin = Number.isFinite(act.arrivo_min);
        let a = aConMin ? act.arrivo_min : parseHHMM(act.arrivo);
        if (a == null) a = p;
        if (!aConMin) while (a < p) a += 1440;
        act._p = p; act._a = a; prec = p;
    }
    return tutte;
}

async function caricaTurno() {
    if (inCaricamento) return;
    inCaricamento = true;
    ultimoTentativoTurno = Date.now();
    try {
        await initCaches();

        const ora = new Date();
        const oggi = dateToLocalISO(ora);
        const presto = ora.getHours() < 6;
        let scelto = null;

        // di notte il turno in corso può essere quello iniziato ieri sera
        if (presto) {
            const ieriData = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate() - 1, 12);
            const ieri = await turnoDelGiorno(dateToLocalISO(ieriData));
            if (ieri.stato === 'ok' && ieri.attivita.length) {
                const fine = Math.max(...ieri.attivita.map((a) => a._a));
                if (secondiDalGiorno(ieri.data, ora) / 60 <= fine + 30) scelto = ieri;
            }
        }
        if (!scelto) scelto = await turnoDelGiorno(oggi);

        // stesso turno di prima: si tengono percorso e fermate già caricati
        const uguale = turnoCorrente && scelto.data === turnoCorrente.data && scelto.codice === turnoCorrente.codice && scelto.stato === turnoCorrente.stato;
        turnoCorrente = scelto;
        oraRif = { giorno: oggi, presto };
        if (!uguale) { attKey = null; percorso = null; percorsoStato = 'nessuno'; minimoFermata = 0; firmaLista = ''; tokenPercorso++; }
    } catch (e) {
        console.error("GPS: errore nel caricamento del turno", e);
    } finally {
        inCaricamento = false;
    }
    renderNavigatore();
}

// ---------------------------------------------------------------- attività e percorso
function scegliAttivita(nowMin) {
    const lista = turnoCorrente ? turnoCorrente.attivita : [];
    if (!lista.length) return { act: null, tipo: null };
    const inCorso = lista.find((a) => a._p <= nowMin && nowMin < a._a);
    if (inCorso) return { act: inCorso, tipo: 'in corso' };
    const prossima = lista.find((a) => a._p > nowMin);
    if (prossima) return { act: prossima, tipo: 'prossima' };
    return { act: null, tipo: 'finito' };
}

const eCorsa = (act) => !!(act && Object.prototype.hasOwnProperty.call(act, 'linea'));
const chiaveAttivita = (act) => act ? `${turnoCorrente.data}|${act.ordine}|${act.partenza}|${act.linea || ''}` : null;

async function datiCorsa(act, data) {
    const params = new URLSearchParams({
        linea: act.linea, data: data,
        partenza_min: act.partenza_min, arrivo_min: act.arrivo_min, da: act.da, a: act.a
    });
    return fetchJson(`${API_URL}/api/v1/corsa?${params}`);
}

async function datiPercorso(corsa) {
    const shapeId = corsa.corsa && corsa.corsa.shapeId;
    if (!shapeId) return null; // backend non aggiornato: si va avanti solo con gli orari
    try {
        const ids = corsa.fermate.map((f) => f.id).join(',');
        return await fetchJson(`${API_URL}/api/v1/percorso?shape_id=${encodeURIComponent(shapeId)}&fermate=${encodeURIComponent(ids)}`);
    } catch (e) {
        console.warn("GPS: percorso non disponibile", e);
        return null;
    }
}

async function costruisciPercorsoAttivita(act, data) {
    const corse = act.tipo_attivita === "rebecchino" && act.rebecchino_prima_corsa && act.rebecchino_seconda_corsa
        ? [act.rebecchino_prima_corsa, act.rebecchino_seconda_corsa] : [act];
    const tratte = [];
    for (const c of corse) {
        const corsa = await datiCorsa(c, data);
        tratte.push({ corsa, percorso: await datiPercorso(corsa) });
    }
    return { rt: costruisciPercorso(tratte, data), direzione: (tratte[tratte.length - 1].corsa.corsa || {}).direzione || '' };
}

function caricaPercorso(act) {
    const chiave = chiaveAttivita(act);
    const mio = ++tokenPercorso;
    attKey = chiave; lineaCorsa = String(act.linea || ''); percorso = null; percorsoStato = 'caricamento'; minimoFermata = 0; firmaLista = '';
    gpsPos.along = null; ritardoSmussato = null;
    costruisciPercorsoAttivita(act, turnoCorrente.data).then(({ rt, direzione }) => {
        if (mio !== tokenPercorso) return;
        percorso = rt; direzioneCorsa = direzione; percorsoStato = 'ok'; firmaLista = '';
        renderNavigatore();
        precaricaSuccessiva(act);
    }).catch((e) => {
        if (mio !== tokenPercorso) return;
        console.warn("GPS: fermate non disponibili", e);
        percorsoStato = 'errore'; percorsoErroreTs = Date.now();
        renderNavigatore();
    });
}

// scarica in anticipo la corsa dopo quella in corso, così funziona anche se la linea dati cade
function precaricaSuccessiva(act) {
    const lista = turnoCorrente ? turnoCorrente.attivita : [];
    const dopo = lista.find((a) => a._p >= act._a && eCorsa(a));
    if (dopo) costruisciPercorsoAttivita(dopo, turnoCorrente.data).catch(() => { });
}

function serveRicaricare() {
    if (!turnoCorrente || !oraRif) return true;
    const ora = new Date();
    if (dateToLocalISO(ora) !== oraRif.giorno || (ora.getHours() < 6) !== oraRif.presto) return true;
    if (turnoCorrente.stato === 'errore' && Date.now() - ultimoTentativoTurno > 30000) return true;
    return false;
}

// ---------------------------------------------------------------- linea e attività
// La linea si prende dal turno. Nei rebecchini cambia a metà: dopo la prima corsa vale quella della seconda.
function lineaDellAttivita(act, nowMin) {
    if (act.tipo_attivita === 'rebecchino' && act.rebecchino_prima_corsa && act.rebecchino_seconda_corsa) {
        const prima = act.rebecchino_prima_corsa;
        if (Number.isFinite(prima.arrivo_min) && nowMin >= prima.arrivo_min) {
            return String(act.rebecchino_seconda_corsa.linea || act.linea || '');
        }
    }
    return String(act.linea || '');
}

function badgeLineaNav(linea) {
    const c = getLineColors(String(linea).toUpperCase());
    return `<span class="nvg-linea" style="background:${c.bg};color:${c.text};border-color:${c.border};">${esc(linea)}</span>`;
}

function pillTurnoNav() {
    if (!turnoCorrente) return '';
    return `<span class="nvg-turno" title="Turno"><small>TURNO</small>${esc(turnoCorrente.codice)}</span>`;
}

function htmlMessaggioNav(testo) {
    return `<div class="nvg-act-row">${pillTurnoNav()}<span class="nvg-dest nvg-msg">${testo}</span></div>`;
}

function htmlAttivitaNav(act, tipo, direzione, nowMin) {
    // a sinistra turno e linea impilati; a destra orario e luogo di partenza → arrivo (il luogo va a capo, non si taglia)
    let sinistra;
    if (eCorsa(act)) sinistra = badgeLineaNav(lineaDellAttivita(act, nowMin));
    else sinistra = `<span class="nvg-pill">${esc(act.tipo || 'Attività')}</span>`;
    const reb = act.tipo_attivita === 'rebecchino' ? '<span class="nvg-reb">REB</span>' : '';
    const blocco = (ora, luogo) => `<div class="nvg-blocco"><div class="nvg-ora">${esc(ora)}</div><div class="nvg-luogo">${esc(luogo || '')}</div></div>`;
    const tag = tipo === 'prossima' ? '<div class="nvg-tag">Prossima attività</div>' : '';
    return `${tag}<div class="nvg-act-row">
        <div class="nvg-id">${pillTurnoNav()}${sinistra}</div>
        ${blocco(act.partenza, act.da)}
        <div class="nvg-freccia"><i class="fa-solid fa-arrow-right-long"></i>${reb}</div>
        ${blocco(act.arrivo, act.a)}
    </div>`;
}

function impostaAttivitaNav(html) {
    if (html === htmlAttPrecedente) return;
    htmlAttPrecedente = html;
    navEl('nvg-act').innerHTML = html;
}

// ---------------------------------------------------------------- prossima fermata e tendina
function oraFermata(rt, i) {
    const f = rt.fermate[i];
    return hhmm(i === rt.fermate.length - 1 ? f.arr : f.dep);
}

function chiudiListaFermate() {
    listaAperta = false;
    navEl('nvg-lista').classList.remove('aperta');
    navEl('nvg-toggle').classList.remove('aperto');
}

function scrollaSuProssima() {
    const lista = navEl('nvg-lista');
    const p = lista.querySelector('.prossima');
    if (p) lista.scrollTop = Math.max(0, p.offsetTop - lista.clientHeight / 2 + p.offsetHeight / 2);
}

function toggleListaFermate() {
    listaAperta = !listaAperta;
    navEl('nvg-lista').classList.toggle('aperta', listaAperta);
    navEl('nvg-toggle').classList.toggle('aperto', listaAperta);
    if (listaAperta) scrollaSuProssima();
}

// visibile=false nasconde blocco e freccetta; con "testo" mostra solo un messaggio al posto della fermata
function mostraProssima(visibile, testo) {
    navEl('nvg-next').hidden = !visibile;
    navEl('nvg-toggle').hidden = !(visibile && !testo);
    if (!visibile || testo) {
        chiudiListaFermate();
        firmaLista = '';
        navEl('nvg-lista').innerHTML = '';
    }
    if (visibile && testo) {
        navEl('nvg-next-label').innerHTML = testo;
        navEl('nvg-next-nome').textContent = '';
        navEl('nvg-next-ora').textContent = '';
    }
}

function disegnaProssimaNav(nav, fuori) {
    const rt = percorso;
    const f = rt.fermate[nav.idx];
    const etichette = { 'in arrivo': 'Prossima', 'in fermata': 'In fermata', 'arrivato': 'Arrivato a' };
    let info = '';
    if (fuori) info = ` · <span class="nvg-warn">fuori percorso</span>`;
    else if (nav.stato === 'in arrivo' && nav.distM != null) {
        info = nav.distM >= 1000 ? ` · ${(nav.distM / 1000).toFixed(1)} km` : ` · ${Math.max(10, Math.round(nav.distM / 10) * 10)} m`;
    }
    mostraProssima(true);
    navEl('nvg-next-label').innerHTML = etichette[nav.stato] + info;
    navEl('nvg-next-nome').textContent = f.nome;
    navEl('nvg-next-ora').textContent = oraFermata(rt, nav.idx);

    // la tendina (tutte le fermate) si ricostruisce solo quando cambia la fermata, non a ogni secondo
    const firma = `${attKey}|${nav.idx}`;
    if (firma !== firmaLista) {
        firmaLista = firma;
        const ultima = rt.fermate.length - 1;
        navEl('nvg-lista').innerHTML = rt.fermate.map((s, i) => {
            const cls = i < nav.idx ? ' passata' : i === nav.idx ? ' prossima' : '';
            return `<div class="nvg-fermata${cls}"><span class="nvg-punto"></span><span class="nvg-fnome">${esc(s.nome)}</span><span class="nvg-fora${i === ultima ? ' fine' : ''}">${oraFermata(rt, i)}</span></div>`;
        }).join('');
        if (listaAperta) scrollaSuProssima();
    }
}

function disegnaRitardoNav(sec) {
    const d = navEl('nvg-delay');
    d.classList.remove('tardi', 'presto', 'puntuale', 'spento');
    if (sec == null) { d.textContent = '--'; d.classList.add('spento'); d.title = 'Ritardo / anticipo'; return; }
    const m = Math.round(sec / 60);
    d.textContent = formattaRitardo(sec);
    d.classList.add(m > 0 ? 'tardi' : m < 0 ? 'presto' : 'puntuale');
    d.title = m > 0 ? 'In ritardo' : m < 0 ? 'In anticipo' : 'In orario';
}

// ---------------------------------------------------------------- rotta sulla mappa
// Disegnata in un pane proprio (sotto marker di unità e fermate, sopra le tile) e senza intercettare i click.
function coloreRotta(linea) {
    const c = getLineColors(String(linea).toUpperCase());
    return c.bg.toLowerCase() === '#ffffff' ? c.border : c.bg;
}

function aggiornaRottaMappa() {
    const voluta = (map && gpsAttivo && navVisibile && percorso && percorso.geometria && percorsoStato === 'ok') ? attKey : null;
    if (voluta === rottaKey) return;
    if (rottaLayer && map) { map.removeLayer(rottaLayer); }
    rottaLayer = null;
    rottaKey = voluta;
    if (!voluta) return;
    const punti = percorso.lat.map((la, i) => [la, percorso.lon[i]]);
    const comune = { pane: 'nav-rotta', interactive: false, lineCap: 'round', lineJoin: 'round' };
    rottaLayer = L.layerGroup([
        L.polyline(punti, { ...comune, color: '#0b1b2b', weight: 8, opacity: 0.45 }),
        L.polyline(punti, { ...comune, color: coloreRotta(lineaCorsa), weight: 5, opacity: 0.95 })
    ]).addTo(map);
}

// ---------------------------------------------------------------- posizione sul percorso
function aggiornaPosizioneNavigatore(coords, now, avgSpeedMs) {
    gpsPos.lat = coords.latitude; gpsPos.lon = coords.longitude; gpsPos.acc = coords.accuracy; gpsPos.vel = avgSpeedMs;

    if (percorso && percorso.geometria && turnoCorrente && coords.accuracy <= ACCURATEZZA_MAX_M) {
        const nowSec = secondiDalGiorno(turnoCorrente.data);
        const p = aPiano(percorso, coords.latitude, coords.longitude);
        let atteso = null;
        if (gpsPos.along != null) atteso = gpsPos.along + (gpsPos.vel || 0) * Math.min(10, (now - gpsPos.ts) / 1000);
        const pr = proietta(percorso, p.x, p.y, gpsPos.along, nowSec, atteso);
        if (pr) {
            gpsPos.fuori = pr.scarto > FUORI_PERCORSO_M;
            if (!gpsPos.fuori) {
                // un salto indietro di molto (nuovo passaggio) azzera le fermate già passate
                if (gpsPos.along != null && pr.along < gpsPos.along - 300) minimoFermata = 0;
                gpsPos.along = pr.along; gpsPos.scarto = pr.scarto; gpsPos.ts = now;
                const inst = nowSec - orarioProgrammato(percorso, pr.along, nowSec);
                gpsPos.ritardoIstantaneo = inst;
                const arrivato = pr.along >= percorso.lunghezza - SOGLIA_FERMATA_M;
                const inAttesa = pr.along <= percorso.fermate[0].dist + SOGLIA_FERMATA_M && nowSec < percorso.fermate[0].dep; // fermo al primo attracco, non è ancora partito
                if (!arrivato && !inAttesa) ritardoSmussato = ritardoSmussato == null ? inst : ritardoSmussato + SMORZA_RITARDO * (inst - ritardoSmussato);
            }
        }
    }
}

// ---------------------------------------------------------------- disegno
// Un giro completo: sceglie l'attività, carica il percorso se serve, calcola ritardo e prossima fermata,
// aggiorna la linea che BateoLive comunica agli altri utenti (customLine).
function renderNavigatore() {
    if (!gpsAttivo) return;

    const messaggio = (testo) => {
        customLine = '';
        impostaAttivitaNav(htmlMessaggioNav(testo));
        mostraProssima(false);
        disegnaRitardoNav(null);
        aggiornaRottaMappa();
    };

    if (!turnoCorrente) return messaggio('<i class="fa-solid fa-spinner fa-spin"></i> Carico il turno…');
    const st = turnoCorrente.stato;
    if (st === 'riposo') return messaggio('Nessuna corsa in programma oggi');
    if (st === 'varianti') return messaggio('<i class="fa-solid fa-triangle-exclamation"></i> Variante in corso: orari del turno non validi');
    if (st === 'nd') return messaggio('Turno non calcolabile: completa il calendario');
    if (st === 'errore') return messaggio('<i class="fa-solid fa-triangle-exclamation"></i> Turno non disponibile');

    const adesso = new Date();
    const nowSec = secondiDalGiorno(turnoCorrente.data, adesso);
    const nowMin = nowSec / 60;
    const { act, tipo } = scegliAttivita(nowMin);
    if (!act) return messaggio(tipo === 'finito' ? 'Turno terminato' : 'Nessuna attività nel turno');

    // percorso: serve per la corsa in corso e, poco prima, per la successiva
    const serve = eCorsa(act) && (tipo === 'in corso' || act._p - nowMin <= PRECARICA_MIN);
    const chiave = chiaveAttivita(act);
    if (serve && chiave !== attKey) caricaPercorso(act);
    else if (serve && percorsoStato === 'errore' && Date.now() - percorsoErroreTs > 30000) caricaPercorso(act);
    else if (!serve && attKey) { attKey = null; percorso = null; percorsoStato = 'nessuno'; tokenPercorso++; }

    // linea comunicata agli altri: solo durante la corsa
    customLine = (tipo === 'in corso' && eCorsa(act)) ? lineaDellAttivita(act, nowMin) : '';

    impostaAttivitaNav(htmlAttivitaNav(act, tipo, serve && percorsoStato === 'ok' ? direzioneCorsa : '', nowMin));

    // ritardo e prossima fermata
    let ritardo = null;
    if (serve && percorsoStato === 'ok') {
        let nav;
        const fixFresco = gpsPos.along != null && (Date.now() - gpsPos.ts) < FIX_SCADUTO_MS && !gpsPos.fuori;
        if (percorso.geometria && fixFresco) {
            nav = trovaProssima(percorso, gpsPos.along, nowSec, minimoFermata, gpsPos.vel);
            minimoFermata = Math.max(minimoFermata, nav.idx);
            // media mobile dei fix, aggiornata con quanto il ritardo è cambiato dall'ultimo fix
            const istantaneo = nowSec - orarioProgrammato(percorso, gpsPos.along, nowSec);
            ritardo = ritardoSmussato == null ? istantaneo : ritardoSmussato + (istantaneo - gpsPos.ritardoIstantaneo);
            if (nav.stato === 'arrivato' && ritardoSmussato != null) ritardo = ritardoSmussato; // a fine corsa il ritardo non cresce più
        } else {
            nav = trovaProssimaDaOrario(percorso, nowSec);
        }
        disegnaProssimaNav(nav, tipo === 'in corso' && gpsPos.fuori);
    } else if (serve && percorsoStato === 'errore') {
        mostraProssima(true, 'Fermate non disponibili');
    } else if (serve) {
        mostraProssima(true, '<i class="fa-solid fa-spinner fa-spin"></i> Carico le fermate…');
    } else {
        mostraProssima(false);
    }
    disegnaRitardoNav(ritardo);
    aggiornaRottaMappa();
}

// ---------------------------------------------------------------- ciclo di vita
function tickNavigatore() {
    if (!gpsAttivo) return;
    if (serveRicaricare() && Date.now() - ultimoTentativoTurno > 5000) caricaTurno();
    else renderNavigatore();
}

function azzeraStatoNavigatore() {
    turnoCorrente = null; oraRif = null;
    attKey = null; percorso = null; percorsoStato = 'nessuno'; direzioneCorsa = ''; lineaCorsa = '';
    tokenPercorso++;
    minimoFermata = 0; ritardoSmussato = null; firmaLista = ''; htmlAttPrecedente = '';
    gpsPos = { lat: null, lon: null, acc: null, vel: null, along: null, scarto: null, ts: 0, fuori: false, ritardoIstantaneo: 0 };
}

// chiamata quando si accende il GPS: il tasto fa-route parte attivo
function avviaNavigatore() {
    gpsAttivo = true;
    navVisibile = true;
    azzeraStatoNavigatore();
    navEl('hud-speed').classList.add('nav-on');
    navEl('fab-nav').classList.add('active');
    mostraProssima(false);
    disegnaRitardoNav(null);
    impostaAttivitaNav(htmlMessaggioNav('<i class="fa-solid fa-spinner fa-spin"></i> Carico il turno…'));
    if (!navTimer) navTimer = setInterval(tickNavigatore, 1000);
    caricaTurno();
}

// chiamata quando si spegne il GPS o si chiude BateoLive
function fermaNavigatore() {
    gpsAttivo = false;
    if (navTimer) { clearInterval(navTimer); navTimer = null; }
    azzeraStatoNavigatore();
    customLine = '';
    aggiornaRottaMappa();
}

// tasto fa-route: mostra/nasconde dati del navigatore e rotta, lasciando solo la velocità
function toggleNavigatoreRotta(forceState = null) {
    navVisibile = forceState !== null ? forceState : !navVisibile;
    navEl('fab-nav').classList.toggle('active', navVisibile);
    navEl('hud-speed').classList.toggle('nav-on', navVisibile);
    if (!navVisibile) chiudiListaFermate();
    aggiornaRottaMappa();
    if (navVisibile) renderNavigatore();
}

export const _test = { costruisciPercorso, proietta, orarioProgrammato, trovaProssima, trovaProssimaDaOrario, alongDaOrario, aPiano, formattaRitardo, hhmm };
