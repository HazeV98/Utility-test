// ==========================================================================
// turno-view.js — visualizzazione dati del turno (modulo condiviso di Utility)
//
// Uso da un altro modulo:
//     import { apriTurno } from "./turno-view.js";
//     apriTurno({ codice: "4P03", data: "2026-10-09" });
//
// Uso incorporato in una card (come fa la dashboard):
//     import { creaVistaTurno } from "./turno-view.js";
//     const vista = creaVistaTurno(document.getElementById("mio-contenitore"));
//     vista.carica({ codice: "4P03", data: "2026-10-09" });
//
// Contiene: riepilogo (parti, luoghi, durata), timeline delle attività con
// evidenza di quella in corso, finestra fermate/orari delle corse (API),
// pulsante e visualizzatore dell'immagine del turno (con Panzoom).
// ==========================================================================
import {
    API_URL, TURNI_SENZA_CORSE, stringToNum, esc, getLineStyle,
    trovaChiaveEsatta, unisciRebecchini, caricaDatiTurni
} from "./turni-core.js"; // sempre con questo stesso percorso, come calendario/dashboard/gps

const e = v => esc(String(v ?? ''));

// ==========================================
// 1. UI (iniettata una sola volta)
// ==========================================
const CSS = `
.tv-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: none; align-items: center; justify-content: center; }
.tv-overlay.aperto { display: flex; }
#tv-turno-overlay { z-index: var(--tv-z-turno, 9000); }
#tv-img-overlay { z-index: 9999; background: rgba(0,0,0,0.9); }
#tv-corsa-overlay { z-index: 10000; align-items: flex-end; }
@media (min-width: 600px) { #tv-corsa-overlay { align-items: center; } }

.tv-sheet { background: var(--surface); width: calc(100% - 24px); max-width: 440px; height: 85vh; border-radius: var(--radius-md, 16px); display: flex; flex-direction: column; box-shadow: 0 8px 30px rgba(0,0,0,0.5); text-align: left; }
.tv-sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border-color); }
.tv-sheet-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--primary); }
.tv-sheet-sub { font-size: 13px; color: var(--text-muted); text-transform: capitalize; margin-top: 2px; }
.tv-sheet-body { flex: 1; overflow-y: auto; padding: 16px 18px 22px; }
.tv-close { border: none; background: rgba(128,128,128,0.1); color: var(--text-main, var(--text)); width: 34px; height: 34px; border-radius: 50%; font-size: 16px; cursor: pointer; flex: none; }

.tv-head-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.tv-val { font-size: 36px; font-weight: 900; color: var(--primary); margin: 0; line-height: 1; }
.tv-btn-img { background: rgba(128,128,128,0.1); color: var(--primary); border: none; width: 42px; height: 42px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
.tv-btn-img:hover { background: var(--primary); color: white; }
.tv-avviso { background: rgba(255,193,7,0.1); border: 1px solid #ffc107; padding: 10px; border-radius: var(--radius-sm, 12px); color: #856404; font-size: 13px; font-weight: bold; text-align: left; margin-bottom: 15px; }

.tv-locations { display: flex; justify-content: space-between; align-items: center; background: rgba(128,128,128,0.05); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 10px; text-align: center; }
.tv-loc-time { font-size: 20px; font-weight: 800; color: var(--text-main, var(--text)); }
.tv-loc-name { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-top: 4px; }
.tv-loc-arrow { color: var(--text-muted); font-size: 20px; opacity: 0.5; }
.tv-duration { font-size: 14px; font-weight: 600; color: var(--text-muted); text-align: center; margin-bottom: 10px; }
.tv-part-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(128,128,128,0.05); padding: 12px 15px; border-radius: 8px; margin-bottom: 7px; text-align: left; border: 1px solid var(--border-color); }
.tv-part-label { font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; min-width: 55px; }
.tv-part-loc { text-align: center; flex: 1; }
.tv-part-time { font-size: 18px; font-weight: 800; color: var(--text-main, var(--text)); }
.tv-part-place { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 3px; }

.tv-expand { text-align: center; color: var(--text-muted); cursor: pointer; padding: 10px 0 0 0; margin-top: 10px; border-top: 1px solid var(--border-color); font-size: 20px; }
.tv-expand i { transition: transform 0.3s; }
.tv-expand.expanded i { transform: rotate(180deg); }

.tv-timeline { position: relative; padding-left: 20px; text-align: left; margin-top: 15px; }
.tv-timeline::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 2px; background: var(--border-color); }
.tv-parte { font-size: 14px; font-weight: 800; color: var(--primary); margin: 20px 0 15px 0; text-transform: uppercase; background: rgba(128,128,128,0.1); display: inline-block; padding: 5px 12px; border-radius: 6px; }
.tv-act { background: transparent; border-radius: 10px; padding: 15px; margin-bottom: 15px; position: relative; border: 1px solid var(--border-color); transition: all 0.3s ease; }
.tv-act::before { content: ''; position: absolute; left: -25px; top: 20px; width: 12px; height: 12px; border-radius: 50%; background: var(--primary); border: 3px solid var(--surface); }
.tv-act.cliccabile { cursor: pointer; }
.tv-act.cliccabile:active { background: rgba(128,128,128,0.05); }
.tv-past { opacity: 0.5; filter: grayscale(80%); }
.tv-current { border-left: 4px solid var(--primary); box-shadow: 0 4px 15px rgba(0,82,155,0.15); background: rgba(0,82,155,0.03); }
.tv-current::before { background: #ff4757; border-color: var(--surface); animation: tv-pulse 1.5s infinite; }
@keyframes tv-pulse { 0% { box-shadow: 0 0 0 0 rgba(255,71,87,0.4); } 70% { box-shadow: 0 0 0 8px rgba(255,71,87,0); } 100% { box-shadow: 0 0 0 0 rgba(255,71,87,0); } }
.tv-act-header { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center; }
.tv-act-time { font-weight: 800; font-size: 15px; color: var(--text-main, var(--text)); }
.tv-act-duration { font-size: 12px; color: var(--text-muted); background: rgba(128,128,128,0.15); padding: 3px 8px; border-radius: 12px; }
.tv-act-route { font-size: 14px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.tv-type { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
.tv-type-linea { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; border: 2px solid; font-size: 12px; padding: 0; }
.tv-type-vuoto { background: rgba(71,85,105,0.15); color: var(--text-muted); }
.tv-type-pausa { background: rgba(217,119,6,0.15); color: #d97706; }
.tv-type-altro { background: rgba(100,116,139,0.15); color: var(--text-muted); }
.tv-type-rebecchino { background: rgba(139,92,246,0.15); color: #8b5cf6; border: 1px solid #8b5cf6; }
.tv-notes { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-color); font-size: 12px; color: #d97706; font-weight: 600; }
.tv-handoff { font-size: 12px; color: var(--primary); font-weight: 600; }
.tv-hint { font-size: 12px; color: var(--primary); font-weight: 600; margin-top: 8px; }

.tv-corsa-modal { background: var(--surface); width: 100%; max-width: 560px; max-height: 88vh; border-radius: 18px 18px 0 0; display: flex; flex-direction: column; box-shadow: 0 -8px 30px rgba(0,0,0,0.5); text-align: left; }
@media (min-width: 600px) { .tv-corsa-modal { border-radius: 18px; max-height: 80vh; } }
.tv-corsa-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px 12px; border-bottom: 1px solid var(--border-color); }
.tv-corsa-titolo { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-weight: 700; font-size: 16px; color: var(--text-main, var(--text)); }
.tv-corsa-sotto { font-size: 12px; color: var(--text-muted); margin-top: 4px; font-weight: 400; }
.tv-corsa-corpo { overflow-y: auto; padding: 14px 18px 22px; position: relative; }
.tv-corsa-stato { text-align: center; color: var(--text-muted); padding: 30px 10px; font-size: 14px; }
.tv-corsa-stato.errore { color: #b42318; }
.tv-fermata { display: flex; align-items: center; gap: 12px; padding: 9px 0; position: relative; }
.tv-fermata::before { content: ''; position: absolute; left: 5px; top: 0; bottom: 0; width: 2px; background: var(--border-color); }
.tv-fermata:first-child::before { top: 50%; }
.tv-fermata:last-child::before { bottom: 50%; }
.tv-fermata-punto { width: 12px; height: 12px; border-radius: 50%; background: var(--surface); border: 2px solid var(--text-muted); flex: none; position: relative; z-index: 1; }
.tv-fermata.nel-turno .tv-fermata-punto { background: var(--primary); border-color: var(--primary); }
.tv-fermata-nome { flex: 1; font-size: 14px; color: var(--text-muted); }
.tv-fermata.nel-turno .tv-fermata-nome { color: var(--text-main, var(--text)); font-weight: 600; }
.tv-fermata-ora { font-variant-numeric: tabular-nums; font-size: 14px; color: var(--text-muted); text-align: right; }
.tv-fermata.nel-turno .tv-fermata-ora { color: var(--text-main, var(--text)); font-weight: 700; }
.tv-fermata-ora small { display: block; font-size: 11px; font-weight: 400; color: var(--text-muted); }
.tv-giorno-dopo { font-size: 10px; color: #b42318; font-weight: 700; margin-left: 3px; }
.tv-fermata-estremo { font-size: 11px; color: var(--primary); font-weight: 700; text-transform: uppercase; }
.tv-corsa-legenda { font-size: 12px; color: var(--text-muted); margin-top: 10px; }
`;

let pz = null;                 // istanza Panzoom
let imgFallback = "";
let richiestaCorsa = 0;
let vistaModale = null;
const cacheCorse = new Map();

function ensureUI() {
    if (document.getElementById('tv-root')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="tv-root">
        <style>${CSS}</style>

        <div id="tv-turno-overlay" class="tv-overlay">
            <div class="tv-sheet" role="dialog" aria-modal="true">
                <div class="tv-sheet-head">
                    <div>
                        <h3 class="tv-sheet-title"><i class="fa-solid fa-clipboard-list"></i> Dettaglio turno</h3>
                        <div class="tv-sheet-sub" id="tv-turno-data"></div>
                    </div>
                    <button class="tv-close" data-tv-chiudi="turno" aria-label="Chiudi"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="tv-sheet-body" id="tv-turno-body"></div>
            </div>
        </div>

        <div id="tv-img-overlay" class="tv-overlay">
            <div id="tv-img-box" style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; overflow:hidden; position:relative;">
                <i class="fa-solid fa-xmark" data-tv-chiudi="img" style="position:absolute; right:20px; top:20px; font-size:30px; cursor:pointer; color:white; z-index:10; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>
                <img id="tv-img" style="max-width:100%; max-height:100vh; object-fit:contain; transition:transform 0.2s;" src="">
            </div>
        </div>

        <div id="tv-corsa-overlay" class="tv-overlay">
            <div class="tv-corsa-modal" role="dialog" aria-modal="true" aria-labelledby="tv-corsa-titolo">
                <div class="tv-corsa-head">
                    <div>
                        <div class="tv-corsa-titolo" id="tv-corsa-titolo"></div>
                        <div class="tv-corsa-sotto" id="tv-corsa-sotto"></div>
                    </div>
                    <button class="tv-close" data-tv-chiudi="corsa" aria-label="Chiudi"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="tv-corsa-corpo" id="tv-corsa-corpo"></div>
            </div>
        </div>
    </div>`);

    const root = document.getElementById('tv-root');
    root.addEventListener('click', ev => {
        const btn = ev.target.closest('[data-tv-chiudi]');
        if (btn) { chiudi(btn.dataset.tvChiudi); return; }
        // click sullo sfondo
        if (ev.target.id === 'tv-turno-overlay') chiudi('turno');
        else if (ev.target.id === 'tv-corsa-overlay') chiudi('corsa');
        else if (ev.target.id === 'tv-img-overlay' || ev.target.id === 'tv-img-box') chiudi('img');
    });

    document.addEventListener('keydown', ev => {
        if (ev.key !== 'Escape') return;
        for (const [id, nome] of [['tv-corsa-overlay', 'corsa'], ['tv-img-overlay', 'img'], ['tv-turno-overlay', 'turno']]) {
            const el = document.getElementById(id);
            if (el && el.classList.contains('aperto')) { chiudi(nome); return; }
        }
    });

    initPanzoom();
}

function chiudi(cosa) {
    if (cosa === 'turno') document.getElementById('tv-turno-overlay').classList.remove('aperto');
    else if (cosa === 'corsa') { richiestaCorsa++; document.getElementById('tv-corsa-overlay').classList.remove('aperto'); }
    else if (cosa === 'img') {
        document.getElementById('tv-img-overlay').classList.remove('aperto');
        document.getElementById('tv-img').removeAttribute('src');
        if (pz) pz.reset();
    }
}

function initPanzoom() {
    if (pz || typeof Panzoom === 'undefined') return;
    const img = document.getElementById('tv-img');
    if (!img) return;
    pz = Panzoom(img, { maxScale: 5, minScale: 1 });
    document.getElementById('tv-img-box').addEventListener('wheel', pz.zoomWithWheel);

    const zoomToggle = () => {
        if (pz.getScale() < 1.1) pz.zoom(1.75, { animate: true });
        else pz.reset({ animate: true });
    };
    let lastTap = 0, isPinching = false;
    img.addEventListener('touchstart', ev => { if (ev.touches.length > 1) isPinching = true; });
    img.addEventListener('touchend', ev => {
        if (isPinching) { if (ev.touches.length === 0) setTimeout(() => isPinching = false, 300); return; }
        const now = Date.now(), delta = now - lastTap;
        if (delta < 300 && delta > 0) { zoomToggle(); if (ev.cancelable) ev.preventDefault(); }
        lastTap = now;
    });
    img.addEventListener('dblclick', zoomToggle);
}

// ==========================================
// 2. HELPER
// ==========================================
function dataIt(iso) { return iso.split('-').reverse().join('/'); }

function verificaSeMarinaio(codiceInput) {
    if (!codiceInput) return false;
    const cod = String(codiceInput).trim().toUpperCase();
    if (/^[1-9]B\d{2}$/.test(cod)) return true;
    const match = cod.match(/^([A-Z0-9]+?)(\d{2})$/);
    if (match) {
        const prefisso = match[1];
        const num = parseInt(match[2], 10);
        if (/^[1-9][CP]$/.test(prefisso)) return false;
        if (prefisso === "PO") return true;
        if (num >= 50) return true;
    }
    return false;
}

function formattaCodiceTurno(linea, numero, isMarinaio) {
    if (!linea || numero === undefined || numero === null) return "";
    const lineaBase = String(linea).trim().toUpperCase();
    let num = parseInt(numero, 10);
    if (isNaN(num)) return `${lineaBase}${numero}`;
    const matchSingola = lineaBase.match(/^([1-9])(?:\.\d+)?$/);
    if (matchSingola) {
        const numLinea = matchSingola[1];
        const lettera = isMarinaio ? "B" : ((numLinea === "1" || numLinea === "2") ? "C" : "P");
        return `${numLinea}${lettera}${String(num).padStart(2, "0")}`;
    }
    if (isMarinaio && lineaBase !== "PO") { if (num < 50) num += 50; }
    return `${lineaBase}${String(num).padStart(2, "0")}`;
}

// ==========================================
// 3. IMMAGINE DEL TURNO
// ==========================================
export async function apriImmagineTurno(codice, dateStr) {
    ensureUI();
    let dati;
    try { dati = await caricaDatiTurni(); }
    catch (err) { console.error("Errore dati turni", err); alert("Immagine non disponibile."); return; }

    const db = dati.db || {};
    const dSelezionata = stringToNum(dateStr);
    const dateChiavi = Object.keys(db).sort();
    let dbCorrente = {};
    let dataAttiva = dateChiavi.length > 0 ? dateChiavi[0] : "2026-03-02";
    for (let i = dateChiavi.length - 1; i >= 0; i--) {
        if (dSelezionata >= stringToNum(dateChiavi[i])) { dbCorrente = db[dateChiavi[i]]; dataAttiva = dateChiavi[i]; break; }
    }

    const chiave = trovaChiaveEsatta(dbCorrente, codice, dateStr);
    let percorso = `turni_${dataAttiva}/${chiave}.jpg`;
    imgFallback = `turni_${dataAttiva}/${codice}.jpg`;

    const img = document.getElementById('tv-img');
    img.onerror = function () {
        if (imgFallback) {
            img.src = imgFallback;
            imgFallback = "";
        } else {
            img.onerror = null;
            alert("Immagine non disponibile sul server.");
            chiudi('img');
        }
    };
    img.src = percorso;
    document.getElementById('tv-img-overlay').classList.add('aperto');
    initPanzoom();
    if (pz) pz.reset();
}

// ==========================================
// 4. FINESTRA FERMATE E ORARI DELLA CORSA
// ==========================================
async function fetchCorsaSingola(act, data) {
    const params = new URLSearchParams({
        linea: act.linea, data,
        partenza_min: act.partenza_min, arrivo_min: act.arrivo_min, da: act.da, a: act.a
    });
    const url = `${API_URL}/api/v1/corsa?${params}`;
    let dati = cacheCorse.get(url);
    if (!dati) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Errore recupero fermate.");
        dati = await resp.json();
        cacheCorse.set(url, dati);
    }
    return dati;
}

async function apriCorsa(act, data) {
    if (!act || !act.linea) return;
    ensureUI();
    const mio = ++richiestaCorsa;

    let titoloHtml = `<span class="tv-type tv-type-linea" style="${getLineStyle(act.linea)}">${e(act.linea)}</span>`;
    if (act.tipo_attivita === "rebecchino") titoloHtml += `<span class="tv-type tv-type-rebecchino" style="margin-left:6px;">Rebecchino</span>`;
    titoloHtml += `<span style="margin-left:8px;">${e(act.da)} <i class="fa-solid fa-caret-right" style="color:#cbd5e1; margin:0 5px;"></i> ${e(act.a)}</span>`;

    document.getElementById('tv-corsa-titolo').innerHTML = titoloHtml;
    document.getElementById('tv-corsa-sotto').textContent = `${act.partenza} - ${act.arrivo} · ${dataIt(data)}`;
    const corpo = document.getElementById('tv-corsa-corpo');
    corpo.innerHTML = '<div class="tv-corsa-stato"><i class="fa-solid fa-spinner fa-spin"></i> Carico le fermate…</div>';
    document.getElementById('tv-corsa-overlay').classList.add('aperto');

    try {
        let dati;
        if (act.tipo_attivita === "rebecchino" && act.rebecchino_prima_corsa && act.rebecchino_seconda_corsa) {
            const dati1 = await fetchCorsaSingola(act.rebecchino_prima_corsa, data);
            if (mio !== richiestaCorsa) return;
            const dati2 = await fetchCorsaSingola(act.rebecchino_seconda_corsa, data);
            if (mio !== richiestaCorsa) return;
            const f1 = dati1.fermate.slice(0, dati1.tratta.a + 1);
            const f2 = dati2.fermate.slice(dati2.tratta.da + 1);
            dati = { ...dati1, fermate: f1.concat(f2), tratta: { da: dati1.tratta.da, a: (f1.length - 1) + (dati2.tratta.a - dati2.tratta.da) } };
        } else {
            dati = await fetchCorsaSingola(act, data);
            if (mio !== richiestaCorsa) return;
        }

        const { fermate, tratta, corsa } = dati;
        document.getElementById('tv-corsa-sotto').textContent =
            `${act.partenza} - ${act.arrivo} · ${dataIt(data)} ${corsa && corsa.direzione ? '· verso ' + corsa.direzione : ''}`;

        const righe = fermate.map((f, i) => {
            const nel = i >= tratta.da && i <= tratta.a;
            const ultima = i === fermate.length - 1;
            const ora = ultima ? f.arrivo : f.partenza;
            const sosta = !ultima && f.arrivo !== f.partenza ? `<small>arr. ${e(f.arrivo)}</small>` : '';
            const estremo = i === tratta.da ? 'Inizio' : (i === tratta.a ? 'Fine' : '');
            const idInizio = i === tratta.da ? ' id="tv-fermata-inizio"' : '';
            return `<div class="tv-fermata${nel ? ' nel-turno' : ''}"${idInizio}>
                <span class="tv-fermata-punto"></span>
                <span class="tv-fermata-nome">${e(f.nome)}${estremo ? ` <span class="tv-fermata-estremo">· ${estremo}</span>` : ''}</span>
                <span class="tv-fermata-ora">${e(ora)}${f.oltre_mezzanotte ? '<span class="tv-giorno-dopo">+1</span>' : ''}${sosta}</span>
            </div>`;
        }).join('');

        const parziale = tratta.da > 0 || tratta.a < fermate.length - 1;
        corpo.innerHTML = righe + `<div class="tv-corsa-legenda">${parziale ? 'In blu il tratto della tua corsa; le altre fermate sono del resto del percorso.' : 'Tutte le fermate della corsa.'}</div>`;

        setTimeout(() => {
            const start = document.getElementById('tv-fermata-inizio');
            if (start) corpo.scrollTo({ top: start.offsetTop - 14, behavior: 'smooth' });
        }, 50);
    } catch (err) {
        if (mio !== richiestaCorsa) return;
        corpo.innerHTML = `<div class="tv-corsa-stato errore"><i class="fa-solid fa-circle-exclamation"></i> ${e(err.message)}</div>`;
    }
}

// ==========================================
// 5. VISTA TURNO (incorporabile in qualsiasi contenitore)
// ==========================================
export function creaVistaTurno(container, { espansa = false } = {}) {
    ensureUI();
    container.innerHTML = `
        <div class="tv-loading" style="display:none; padding:20px 0; text-align:center;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:24px; color:var(--primary);"></i>
        </div>
        <div class="tv-content">
            <div class="tv-head-row">
                <div class="tv-val">--</div>
                <button class="tv-btn-img" style="display:none;" aria-label="Immagine del turno"><i class="fa-solid fa-image"></i></button>
            </div>
            <div class="tv-avviso" style="display:none;">
                <i class="fa-solid fa-circle-exclamation"></i> Variante in corso: vedi il turno corretto nella sezione turni.
            </div>
            <div class="tv-riepilogo"></div>
            <div class="tv-expand" style="display:none;"><i class="fa-solid fa-chevron-down"></i></div>
            <div class="tv-timeline" style="display:none;"></div>
        </div>`;

    const q = s => container.querySelector(s);
    const el = {
        loading: q('.tv-loading'), content: q('.tv-content'), val: q('.tv-val'), btnImg: q('.tv-btn-img'),
        avviso: q('.tv-avviso'), riepilogo: q('.tv-riepilogo'), expand: q('.tv-expand'), timeline: q('.tv-timeline')
    };

    let attivita = [];
    let richiesta = 0;
    let ctx = { codice: '', data: '', apriImmagine: null };

    el.btnImg.addEventListener('click', () => ctx.apriImmagine ? ctx.apriImmagine() : apriImmagineTurno(ctx.codice, ctx.data));
    el.expand.addEventListener('click', () => {
        const aperta = el.expand.classList.toggle('expanded');
        el.timeline.style.display = aperta ? 'block' : 'none';
    });

    const apriDaCard = card => {
        const act = attivita.find(a => a.ordine === Number(card.dataset.ordine));
        if (act) apriCorsa(act, ctx.data);
    };
    el.timeline.addEventListener('click', ev => {
        const card = ev.target.closest('.tv-act.cliccabile');
        if (card) apriDaCard(card);
    });
    el.timeline.addEventListener('keydown', ev => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const card = ev.target.closest('.tv-act.cliccabile');
        if (card) { ev.preventDefault(); apriDaCard(card); }
    });

    const TESTO_VARIANTE = '<i class="fa-solid fa-circle-exclamation"></i> Variante in corso: vedi il turno corretto nella sezione turni.';
    const TESTO_OFFLINE = '<i class="fa-solid fa-triangle-exclamation"></i> Dettagli del turno non disponibili al momento: puoi aprire l\'immagine con il pulsante in alto.';
    function mostraAvviso(html) { el.avviso.innerHTML = html; el.avviso.style.display = 'block'; }

    function mostraCaricamento(on) {
        el.loading.style.display = on ? 'block' : 'none';
        el.content.style.display = on ? 'none' : 'block';
    }

    function renderizza(turno, codice, dataGiorno) {
        const isMarinaio = verificaSeMarinaio(codice);
        const tutte = [...unisciRebecchini(turno.corse_linea || []), ...(turno.altre_attivita || [])];
        tutte.sort((a, b) => a.ordine - b.ordine);
        attivita = tutte;

        // --- riepilogo: parti, luoghi, durata ---
        const parti = Array.isArray(turno.parti) && turno.parti.length > 0 ? turno.parti : [{ inizio: turno.inizio_turno, fine: turno.fine_turno }];
        let partiHtml;
        if (parti.length === 1) {
            const p = parti[0];
            partiHtml = `
                <div class="tv-locations">
                    <div><div class="tv-loc-time">${e(p.inizio.ora)}</div><div class="tv-loc-name">${e(p.inizio.luogo)}</div></div>
                    <div class="tv-loc-arrow"><i class="fa-solid fa-arrow-right-long"></i></div>
                    <div><div class="tv-loc-time">${e(p.fine.ora)}</div><div class="tv-loc-name">${e(p.fine.luogo)}</div></div>
                </div>`;
        } else {
            partiHtml = `<div style="margin-bottom:10px;">` + parti.map((p, i) => `
                <div class="tv-part-row">
                    <div class="tv-part-label">Parte ${i + 1}</div>
                    <div class="tv-part-loc"><div class="tv-part-time">${e(p.inizio.ora)}</div><div class="tv-part-place">${e(p.inizio.luogo)}</div></div>
                    <div><i class="fa-solid fa-arrow-right-long"></i></div>
                    <div class="tv-part-loc"><div class="tv-part-time">${e(p.fine.ora)}</div><div class="tv-part-place">${e(p.fine.luogo)}</div></div>
                </div>`).join("") + `</div>`;
        }
        el.riepilogo.innerHTML = `${partiHtml}<div class="tv-duration">Durata turno: ${e(turno.durata)} h</div>`;

        // --- timeline con evidenza dell'attività in corso ---
        let html = "";
        let currentParte = null;
        const now = new Date();
        const [annoG, meseG, giornoG] = dataGiorno.split('-').map(Number);
        let evidenzaTrovata = false, previousRawStart = -1, dayOffset = 0;

        tutte.forEach(act => {
            const isRebecchino = act.tipo_attivita === "rebecchino";
            const isCorsa = Object.prototype.hasOwnProperty.call(act, 'linea');

            if (parti.length > 1 && act.parte && act.parte !== currentParte) {
                currentParte = act.parte;
                html += `<div class="tv-parte">Parte ${e(currentParte)}</div>`;
            }

            let statusClass = "";
            if (act.partenza && act.arrivo) {
                const [hP, mP] = act.partenza.split(':').map(Number);
                const [hA, mA] = act.arrivo.split(':').map(Number);
                const rawStart = hP * 60 + mP, rawEnd = hA * 60 + mA;

                // salto all'indietro dell'orario di inizio (23:30 -> 00:15) = giorno logico successivo
                if (previousRawStart !== -1 && rawStart < previousRawStart - 12 * 60) dayOffset += 1;
                previousRawStart = rawStart;

                // attività che scavalca la mezzanotte (23:45 -> 00:30)
                const endOffset = rawEnd < rawStart ? dayOffset + 1 : dayOffset;
                const actEnd = new Date(annoG, meseG - 1, giornoG + endOffset, hA, mA);

                if (now > actEnd) statusClass = "tv-past";
                else if (!evidenzaTrovata) { statusClass = "tv-current"; evidenzaTrovata = true; }
            }

            let topLabel = "", bottomLabel = "";
            if (isCorsa) topLabel = `<span class="tv-type tv-type-linea" style="${getLineStyle(act.linea)}">${e(act.linea)}</span>`;

            if (isRebecchino) {
                bottomLabel = `<span class="tv-type tv-type-rebecchino">Rebecchino</span>`;
            } else if (!isCorsa) {
                let cls = "tv-type-altro", label = act.tipo || "Attività";
                if (act.categoria === "spostamento_a_vuoto" || (act.tipo && act.tipo.includes("TRASFERIMENTO"))) { cls = "tv-type-vuoto"; label = act.tipo; }
                else if (act.categoria === "altra_attivita" && act.tipo && act.tipo.includes("PASTO")) { cls = "tv-type-pausa"; label = act.tipo; }
                bottomLabel = `<span class="tv-type ${cls}">${e(label)}</span>`;
            }

            let noteHtml = '';
            if (act.note && act.note.length > 0) {
                noteHtml = `<div class="tv-notes"><i class="fa-solid fa-triangle-exclamation"></i> ${e(act.note.map(n => n.testo).join(" - "))}</div>`;
            }

            let handoff = '';
            if (act.imbarca) handoff += `<div><i class="fa-solid fa-arrow-right-to-bracket"></i> Consegnata da: ${e(formattaCodiceTurno(act.imbarca.linea, act.imbarca.turno, isMarinaio))}</div>`;
            if (act.consegna) handoff += `<div><i class="fa-solid fa-arrow-right-from-bracket"></i> Consegna a: ${e(formattaCodiceTurno(act.consegna.linea, act.consegna.turno, isMarinaio))}</div>`;

            const attrCorsa = isCorsa ? ` data-ordine="${e(act.ordine)}" role="button" tabindex="0"` : '';
            html += `
                <div class="tv-act ${statusClass}${isCorsa ? ' cliccabile' : ''}"${attrCorsa}>
                    <div class="tv-act-header">
                        <span class="tv-act-time">${e(act.partenza)} - ${e(act.arrivo)}</span>
                        <span class="tv-act-duration">${e(act.durata_min)} min</span>
                    </div>
                    <div class="tv-act-route">
                        ${topLabel}
                        <span>${e(act.da)} <i class="fa-solid fa-caret-right" style="color:#cbd5e1; margin:0 5px;"></i> ${e(act.a)}</span>
                    </div>
                    ${noteHtml}
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:${(handoff || bottomLabel) ? '10px' : '0'};">
                        <div class="tv-handoff">${handoff}</div>
                        <div>${bottomLabel}</div>
                    </div>
                    ${isCorsa ? '<div class="tv-hint"><i class="fa-solid fa-list-ul"></i> Fermate e orari</div>' : ''}
                </div>`;
        });
        el.timeline.innerHTML = html;
    }

    /**
     * Carica e mostra il turno.
     * @param {string}  opts.codice    codice turno (es. "4P03")
     * @param {string}  opts.data      data ISO "YYYY-MM-DD"
     * @param {boolean} opts.variante  true = giorno con varianti: niente dettagli né immagine, solo avviso
     * @param {Function} opts.apriImmagine  opzionale: funzione chiamata dal pulsante immagine al posto di quella
     *                                      predefinita (es. il visualizzatore del modulo Turni)
     */
    async function carica({ codice, data, variante = false, apriImmagine = null }) {
        const mio = ++richiesta;
        const cod = String(codice || '').trim();
        ctx = { codice: cod, data, apriImmagine };
        attivita = [];

        el.riepilogo.innerHTML = '';
        el.timeline.innerHTML = '';
        el.timeline.style.display = espansa ? 'block' : 'none';
        el.expand.style.display = 'none';
        el.expand.classList.remove('expanded');
        el.avviso.style.display = 'none';
        el.btnImg.style.display = 'none';
        el.val.textContent = cod || 'N/D';

        // riposo / turni senza corse: solo il codice
        if (!cod || TURNI_SENZA_CORSE.includes(cod.toUpperCase())) { mostraCaricamento(false); return; }
        if (variante) { mostraAvviso(TESTO_VARIANTE); mostraCaricamento(false); return; }

        mostraCaricamento(true);
        try {
            const resp = await fetch(`${API_URL}/api/v1/turno?codice=${encodeURIComponent(cod)}&data=${encodeURIComponent(data)}`);
            if (!resp.ok) throw new Error("Errore API");
            const json = await resp.json();
            if (mio !== richiesta) return;
            renderizza(json.turno, cod, data);
            if (!espansa) el.expand.style.display = 'block';
        } catch (err) {
            if (mio !== richiesta) return;
            // fallback: codice + pulsante immagine anche se l'API fallisce
            console.error("Fetch API turno fallita, fallback solo immagine", err);
            mostraAvviso(TESTO_OFFLINE);
        }
        mostraCaricamento(false);
        el.btnImg.style.display = 'flex';
    }

    return { carica };
}

// ==========================================
// 6. FINESTRA DEL TURNO (punto d'ingresso per gli altri moduli)
// ==========================================
export function apriTurno({ codice, data, variante = false, apriImmagine = null }) {
    ensureUI();
    if (!vistaModale) vistaModale = creaVistaTurno(document.getElementById('tv-turno-body'), { espansa: true });

    const [a, m, g] = String(data).split('-').map(Number);
    document.getElementById('tv-turno-data').textContent =
        new Date(a, m - 1, g).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    document.getElementById('tv-turno-body').scrollTop = 0;
    document.getElementById('tv-turno-overlay').classList.add('aperto');
    return vistaModale.carica({ codice, data, variante, apriImmagine });
}

export function chiudiTurno() { if (document.getElementById('tv-root')) chiudi('turno'); }

// comodo per i moduli che usano onclick inline
window.apriTurnoView = apriTurno;
