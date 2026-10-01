// ==========================================
// GPS / NAVIGAZIONE — modulo indipendente dalla dashboard
//
// Calcola da solo il turno del giorno, scarica i dati dal backend (/turno, /corsa, /percorso) e,
// con la posizione GPS, mostra velocità, ritardo/anticipo e prossime fermate della corsa in corso.
//
// Uso (come gli altri moduli):
//     import { initUIGPS, avviaMotoreGPS } from './gps.js';
//     initUIGPS();
//     avviaMotoreGPS(db, auth, userDataPrivate);   // db e auth non servono, userDataPrivate.mansione sì
//     window.apriModaleGPS();
// ==========================================

import {
    API_URL, TURNI_SENZA_CORSE, dateToLocalISO, stringToNum, esc, getLineStyle,
    turnoEffettivo, unisciRebecchini, ferieDelGiorno, haVarianti, caricaDatiTurni
} from "./turni-core.js"; // logica turni condivisa con calendario e dashboard: va importato sempre con questo stesso percorso

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


// ==========================================
// 1. FUNZIONI DI SUPPORTO (date, testo)
// ==========================================
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
        let best = null;
        for (let i = i0; i <= i1; i++) {
            const c = valuta(i);
            if (c.scarto > FUORI_PERCORSO_M) continue;
            c.costo = c.scarto + PESO_CONTINUITA * Math.abs(c.along - previsto);
            if (!best || c.costo < best.costo) best = c;
        }
        if (best) return best;
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

export const _test = { costruisciPercorso, proietta, orarioProgrammato, trovaProssima, trovaProssimaDaOrario, alongDaOrario, aPiano, formattaRitardo, hhmm };

// ==========================================
// 3. INIEZIONE UI GPS
// ==========================================
export function initUIGPS() {
    if (document.getElementById('modal-gps-main')) return;

    const uiHTML = `
    <style>
        .gps-body { flex: 1; overflow-y: auto; overflow-x: hidden; width: 100%; display: flex; flex-direction: column; gap: 14px; }

        .gps-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .gps-metric { text-align: center; padding: 14px 6px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md, 12px); background: rgba(128, 128, 128, 0.05); min-width: 0; }
        .gps-metric-val { font-size: 54px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -1px; color: var(--primary); }
        .gps-metric-sub { font-size: 13px; font-weight: 700; color: var(--text-muted); margin-top: 8px; }
        #gps-delay-val.tardi { color: var(--danger, #dc3545); }
        #gps-delay-val.presto { color: #d97706; }
        #gps-delay-val.puntuale { color: var(--success, #10b981); }
        #gps-delay-val.spento { color: var(--text-muted); opacity: 0.5; }

        .gps-act { border: 1px solid var(--border-color); border-radius: var(--radius-md, 12px); padding: 14px; background: rgba(128, 128, 128, 0.05); }
        .gps-act-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; font-weight: 700; color: var(--text-muted); flex-wrap: wrap; }
        .gps-act-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: center; }
        .gps-act-blocco { flex: 1; min-width: 0; }
        .gps-act-ora { font-size: 24px; font-weight: 800; color: var(--text-main); font-variant-numeric: tabular-nums; }
        .gps-act-luogo { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-top: 3px; overflow-wrap: anywhere; }
        .gps-act-freccia { color: var(--text-muted); font-size: 18px; opacity: 0.5; }
        .gps-linea { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 26px; padding: 0 4px; box-sizing: border-box; border-radius: 13px; border: 2px solid; font-size: 12px; font-weight: 800; }
        .gps-pill { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; background: rgba(100, 116, 139, 0.15); color: var(--text-muted); }
        .gps-pill.rebecchino { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid #8b5cf6; }

        .gps-next { border: 1px solid var(--border-color); border-radius: var(--radius-md, 12px); background: var(--surface); overflow: hidden; }
        .gps-next-main { padding: 14px; }
        .gps-next-label { font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; }
        .gps-next-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .gps-next-nome { font-size: 22px; font-weight: 800; color: var(--text-main); line-height: 1.2; overflow-wrap: anywhere; }
        .gps-next-ora { font-size: 26px; font-weight: 900; color: var(--primary); font-variant-numeric: tabular-nums; flex: none; }
        .gps-next-dist { font-size: 13px; color: var(--text-muted); margin-top: 6px; font-weight: 600; min-height: 16px; }
        .gps-next-toggle { width: 100%; border: none; border-top: 1px solid var(--border-color); background: transparent; color: var(--text-muted); font-size: 20px; padding: 8px 0; cursor: pointer; }
        .gps-next-toggle i { transition: transform 0.25s; }
        .gps-next-toggle.aperto i { transform: rotate(180deg); }
        .gps-next-lista { display: none; padding: 4px 14px 10px; border-top: 1px solid var(--border-color); }
        .gps-next-lista.aperto { display: block; }
        .gps-fermata { display: flex; align-items: center; gap: 12px; padding: 9px 0; position: relative; }
        .gps-fermata::before { content: ''; position: absolute; left: 5px; top: 0; bottom: 0; width: 2px; background: var(--border-color); }
        .gps-fermata:first-child::before { top: 50%; }
        .gps-fermata:last-child::before { bottom: 50%; }
        .gps-fermata-punto { width: 12px; height: 12px; border-radius: 50%; background: var(--surface); border: 2px solid var(--primary); flex: none; position: relative; z-index: 1; }
        .gps-fermata-nome { flex: 1; font-size: 14px; color: var(--text-main); font-weight: 600; overflow-wrap: anywhere; }
        .gps-fermata-ora { font-size: 14px; font-weight: 700; color: var(--text-main); font-variant-numeric: tabular-nums; }
        .gps-fermata-ora.fine { color: var(--primary); }

        .gps-msg { text-align: center; padding: 26px 14px; border: 1px dashed var(--border-color); border-radius: var(--radius-md, 12px); color: var(--text-muted); font-size: 14px; font-weight: 600; line-height: 1.4; }
        .gps-msg.avviso { border-style: solid; border-color: #ffc107; background: rgba(255, 193, 7, 0.1); color: #856404; }

        .gps-status-box { font-size: 14px; font-weight: bold; text-align: center; padding: 10px; border-radius: var(--radius-sm); min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .btn-attiva-gps { background: var(--primary); color: white; border: none; padding: 12px 28px; font-size: 16px; font-weight: bold; border-radius: 30px; cursor: pointer; box-shadow: var(--shadow-sm); transition: transform 0.2s; display: flex; align-items: center; gap: 8px; margin: 0 auto; }
        .btn-attiva-gps:active { transform: scale(0.95); }
    </style>

    <div id="modal-gps-main" class="modal-overlay" style="display:none;" onclick="window.chiudiSuSfondo(event, 'modal-gps-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); z-index: 20;" onclick="document.getElementById('modal-gps-main').style.display='none'"></i>

            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; margin-bottom: 16px; padding-bottom: 15px; padding-right: 36px; border-bottom: 1px solid var(--border-color);">
                <i class="fa-solid fa-location-crosshairs"></i> Turno: <span id="gps-turno-val">--</span>
            </h3>

            <div class="gps-body">
                <div class="gps-metrics">
                    <div class="gps-metric">
                        <div id="gps-speed-val" class="gps-metric-val">0.0</div>
                        <div class="gps-metric-sub">km/h · <span id="gps-speed-knots">0.0 nodi</span></div>
                    </div>
                    <div class="gps-metric">
                        <div id="gps-delay-val" class="gps-metric-val spento">--</div>
                        <div id="gps-delay-label" class="gps-metric-sub">Ritardo / anticipo</div>
                    </div>
                </div>

                <div id="gps-act-box"></div>
                <div id="gps-next-box"></div>

                <div id="gps-status" class="gps-status-box" style="background: transparent;">
                    <button id="btn-attiva-gps" class="btn-attiva-gps"><i class="fa-solid fa-location-arrow"></i> Attiva GPS</button>
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================
// 4. MOTORE GPS
// ==========================================
export function avviaMotoreGPS(db, auth, userDataPrivate) {
    // ---------------------------------------------------------------- elementi
    const modal = document.getElementById('modal-gps-main');
    const turnoVal = document.getElementById('gps-turno-val');
    const speedVal = document.getElementById('gps-speed-val');
    const speedKnots = document.getElementById('gps-speed-knots');
    const delayVal = document.getElementById('gps-delay-val');
    const delayLabel = document.getElementById('gps-delay-label');
    const actBox = document.getElementById('gps-act-box');
    const nextBox = document.getElementById('gps-next-box');
    const statusDiv = document.getElementById('gps-status');
    const btnAttiva = document.getElementById('btn-attiva-gps');

    // ---------------------------------------------------------------- stato
    let watchId = null;
    let speedHistory = [];
    const SMOOTHING_WINDOW_MS = 2000;

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
    let tokenPercorso = 0;
    let minimoFermata = 0;                 // le fermate sotto questo indice sono già passate

    let gps = { lat: null, lon: null, acc: null, vel: null, along: null, scarto: null, ts: 0, fuori: false, ritardoIstantaneo: 0 };
    let ritardoSmussato = null;
    let firmaLista = '';
    let listaAperta = false;

    // ---------------------------------------------------------------- turno del giorno (copiato dalla dashboard)




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
        let codice = turnoEffettivo(dStr, state, datiTurni, userDataPrivate && userDataPrivate.mansione);
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
        render();
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
        attKey = chiave; percorso = null; percorsoStato = 'caricamento'; minimoFermata = 0; firmaLista = '';
        gps.along = null; ritardoSmussato = null;
        costruisciPercorsoAttivita(act, turnoCorrente.data).then(({ rt, direzione }) => {
            if (mio !== tokenPercorso) return;
            percorso = rt; direzioneCorsa = direzione; percorsoStato = 'ok'; firmaLista = '';
            render();
            precaricaSuccessiva(act);
        }).catch((e) => {
            if (mio !== tokenPercorso) return;
            console.warn("GPS: fermate non disponibili", e);
            percorsoStato = 'errore'; percorsoErroreTs = Date.now();
            render();
        });
    }

    // scarica in anticipo la corsa dopo quella in corso, così funziona anche se la linea dati cade
    function precaricaSuccessiva(act) {
        const lista = turnoCorrente ? turnoCorrente.attivita : [];
        const dopo = lista.find((a) => a._p >= act._a && eCorsa(a));
        if (dopo) costruisciPercorsoAttivita(dopo, turnoCorrente.data).catch(() => { });
    }

    // ---------------------------------------------------------------- disegno
    let htmlAttPrecedente = '';
    function impostaAttivita(html) {
        if (html === htmlAttPrecedente) return;
        htmlAttPrecedente = html;
        actBox.innerHTML = html;
    }

    function mostraMessaggio(testo, avviso) {
        impostaAttivita(`<div class="gps-msg${avviso ? ' avviso' : ''}">${testo}</div>`);
        nextBox.innerHTML = '';
        firmaLista = '';
    }

    function htmlAttivita(act, tipo, direzione) {
        const titoli = { 'in corso': 'Attività in corso', 'prossima': 'Prossima attività' };
        let etichetta;
        if (eCorsa(act)) {
            etichetta = `<span class="gps-linea" style="${getLineStyle(act.linea)}">${esc(act.linea)}</span>`;
            if (act.tipo_attivita === "rebecchino") etichetta += `<span class="gps-pill rebecchino">Rebecchino</span>`;
            if (direzione) etichetta += `<span>verso ${esc(direzione)}</span>`;
        } else {
            etichetta = `<span class="gps-pill">${esc(act.tipo || 'Attività')}</span>`;
        }
        return `
            <div class="gps-act">
                <div class="gps-act-head"><span>${titoli[tipo] || ''}</span>${etichetta}</div>
                <div class="gps-act-row">
                    <div class="gps-act-blocco"><div class="gps-act-ora">${esc(act.partenza)}</div><div class="gps-act-luogo">${esc(act.da || '')}</div></div>
                    <div class="gps-act-freccia"><i class="fa-solid fa-arrow-right-long"></i></div>
                    <div class="gps-act-blocco"><div class="gps-act-ora">${esc(act.arrivo)}</div><div class="gps-act-luogo">${esc(act.a || '')}</div></div>
                </div>
            </div>`;
    }

    function oraFermata(rt, i) {
        const f = rt.fermate[i];
        return hhmm(i === rt.fermate.length - 1 ? f.arr : f.dep);
    }

    function disegnaProssima(nav) {
        const rt = percorso;
        const f = rt.fermate[nav.idx];
        const etichette = { 'in arrivo': 'Prossima fermata', 'in fermata': 'In fermata', 'arrivato': 'Arrivato a' };
        let dist = '';
        if (nav.stato === 'in arrivo' && nav.distM != null) {
            dist = nav.distM >= 1000 ? `a ${(nav.distM / 1000).toFixed(1)} km` : `a ${Math.max(10, Math.round(nav.distM / 10) * 10)} m`;
        }

        // la lista si ricostruisce solo quando cambia la fermata, non a ogni secondo
        const firma = `${nav.idx}|${nav.stato}`;
        if (firma !== firmaLista || !document.getElementById('gps-next-nome')) {
            firmaLista = firma;
            const successive = rt.fermate.slice(nav.idx + 1).map((s, k) => {
                const i = nav.idx + 1 + k;
                return `<div class="gps-fermata"><span class="gps-fermata-punto"></span><span class="gps-fermata-nome">${esc(s.nome)}</span><span class="gps-fermata-ora${i === rt.fermate.length - 1 ? ' fine' : ''}">${oraFermata(rt, i)}</span></div>`;
            }).join('');
            const haSuccessive = nav.idx < rt.fermate.length - 1;
            nextBox.innerHTML = `
                <div class="gps-next">
                    <div class="gps-next-main">
                        <div class="gps-next-label" id="gps-next-label"></div>
                        <div class="gps-next-row"><div class="gps-next-nome" id="gps-next-nome"></div><div class="gps-next-ora" id="gps-next-ora"></div></div>
                        <div class="gps-next-dist" id="gps-next-dist"></div>
                    </div>
                    ${haSuccessive ? `<button class="gps-next-toggle${listaAperta ? ' aperto' : ''}" id="gps-next-toggle" aria-label="Mostra le fermate successive"><i class="fa-solid fa-chevron-down"></i></button>
                    <div class="gps-next-lista${listaAperta ? ' aperto' : ''}" id="gps-next-lista">${successive}</div>` : ''}
                </div>`;
            const toggle = document.getElementById('gps-next-toggle');
            if (toggle) toggle.addEventListener('click', () => {
                listaAperta = !listaAperta;
                toggle.classList.toggle('aperto', listaAperta);
                document.getElementById('gps-next-lista').classList.toggle('aperto', listaAperta);
            });
        }
        document.getElementById('gps-next-label').textContent = etichette[nav.stato];
        document.getElementById('gps-next-nome').textContent = f.nome;
        document.getElementById('gps-next-ora').textContent = oraFermata(rt, nav.idx);
        document.getElementById('gps-next-dist').textContent = dist;
    }

    function disegnaRitardo(sec) {
        delayVal.classList.remove('tardi', 'presto', 'puntuale', 'spento');
        if (sec == null) {
            delayVal.textContent = '--'; delayVal.classList.add('spento'); delayLabel.textContent = 'Ritardo / anticipo';
            return;
        }
        const m = Math.round(sec / 60);
        delayVal.textContent = formattaRitardo(sec);
        delayVal.classList.add(m > 0 ? 'tardi' : m < 0 ? 'presto' : 'puntuale');
        delayLabel.textContent = m > 0 ? 'In ritardo' : m < 0 ? 'In anticipo' : 'In orario';
    }

    // Un giro completo: sceglie l'attività, carica il percorso se serve, calcola ritardo e prossima fermata.
    function render() {
        if (!modal || modal.style.display === 'none') return;
        if (!turnoCorrente) { turnoVal.textContent = '--'; mostraMessaggio('<i class="fa-solid fa-spinner fa-spin"></i> Carico il turno…'); disegnaRitardo(null); return; }

        turnoVal.textContent = turnoCorrente.codice;
        if (turnoCorrente.stato === 'riposo') { mostraMessaggio(`Oggi non hai corse in programma (${esc(turnoCorrente.codice)}).`); disegnaRitardo(null); return; }
        if (turnoCorrente.stato === 'varianti') { mostraMessaggio('<i class="fa-solid fa-triangle-exclamation"></i> Variante in corso: per gli orari vedi il turno nella sezione turni.', true); disegnaRitardo(null); return; }
        if (turnoCorrente.stato === 'nd') { mostraMessaggio('Turno non calcolabile: completa la configurazione nel calendario.', true); disegnaRitardo(null); return; }
        if (turnoCorrente.stato === 'errore') { mostraMessaggio('Turno non disponibile: controlla la connessione.', true); disegnaRitardo(null); return; }

        const adesso = new Date();
        const nowSec = secondiDalGiorno(turnoCorrente.data, adesso);
        const { act, tipo } = scegliAttivita(nowSec / 60);

        if (!act) {
            mostraMessaggio(tipo === 'finito' ? 'Turno terminato.' : 'Nessuna attività nel turno.');
            disegnaRitardo(null);
            return;
        }

        // percorso: serve per la corsa in corso e, poco prima, per la successiva
        const serve = eCorsa(act) && (tipo === 'in corso' || act._p - nowSec / 60 <= PRECARICA_MIN);
        const chiave = chiaveAttivita(act);
        if (serve && chiave !== attKey) caricaPercorso(act);
        else if (serve && percorsoStato === 'errore' && Date.now() - percorsoErroreTs > 30000) caricaPercorso(act);
        else if (!serve && attKey) { attKey = null; percorso = null; percorsoStato = 'nessuno'; tokenPercorso++; }

        impostaAttivita(htmlAttivita(act, tipo, serve && percorsoStato === 'ok' ? direzioneCorsa : ''));

        // ritardo e prossima fermata
        let ritardo = null;
        if (serve && percorsoStato === 'ok') {
            let nav;
            const fixFresco = gps.along != null && (Date.now() - gps.ts) < FIX_SCADUTO_MS && !gps.fuori;
            if (percorso.geometria && fixFresco) {
                nav = trovaProssima(percorso, gps.along, nowSec, minimoFermata, gps.vel);
                minimoFermata = Math.max(minimoFermata, nav.idx);
                // media mobile dei fix, aggiornata con quanto il ritardo è cambiato dall'ultimo fix
                const istantaneo = nowSec - orarioProgrammato(percorso, gps.along, nowSec);
                ritardo = ritardoSmussato == null ? istantaneo : ritardoSmussato + (istantaneo - gps.ritardoIstantaneo);
                if (nav.stato === 'arrivato' && ritardoSmussato != null) ritardo = ritardoSmussato; // a fine corsa il ritardo non cresce più
            } else {
                nav = trovaProssimaDaOrario(percorso, nowSec);
            }
            disegnaProssima(nav);
        } else if (serve && percorsoStato === 'errore') {
            nextBox.innerHTML = `<div class="gps-msg">Fermate della corsa non disponibili.</div>`; firmaLista = '';
        } else if (serve) {
            nextBox.innerHTML = `<div class="gps-msg"><i class="fa-solid fa-spinner fa-spin"></i> Carico le fermate…</div>`; firmaLista = '';
        } else {
            nextBox.innerHTML = ''; firmaLista = '';
        }
        disegnaRitardo(ritardo);
        aggiornaStato(serve && percorsoStato === 'ok' ? percorso : null, tipo);
    }

    // riga di stato sotto il riquadro: errori GPS, segnale, fuori percorso
    let messaggioErrore = null;
    function aggiornaStato(rt, tipo) {
        if (watchId == null) return; // prima dell'attivazione c'è il pulsante
        if (messaggioErrore) return;
        if (gps.acc == null) return;
        let testo = `<i class="fa-solid fa-satellite-dish"></i> Segnale GPS (±${Math.round(gps.acc)} m)`;
        let colore = "var(--success, #10b981)";
        if (rt && tipo === 'in corso' && gps.fuori) { testo = `<i class="fa-solid fa-route"></i> Non sei sul percorso della corsa`; colore = "#d97706"; }
        else if (rt && !rt.geometria) { testo += ` · percorso non disponibile`; colore = "var(--text-muted)"; }
        statusDiv.innerHTML = testo;
        statusDiv.style.color = colore;
        statusDiv.style.background = "transparent";
    }

    // ---------------------------------------------------------------- GPS
    function elaboraPosizione(position) {
        const coords = position.coords;
        const now = Date.now();
        messaggioErrore = null;

        // velocità: media mobile degli ultimi 2 secondi
        const rawSpeedMs = coords.speed || 0;
        speedHistory.push({ speed: rawSpeedMs, time: now });
        speedHistory = speedHistory.filter(e => now - e.time <= SMOOTHING_WINDOW_MS);
        const avgSpeedMs = speedHistory.reduce((s, e) => s + e.speed, 0) / speedHistory.length;
        speedVal.textContent = (avgSpeedMs * 3.6).toFixed(1);
        speedKnots.textContent = `${(avgSpeedMs * 1.94384).toFixed(1)} nodi`;

        gps.lat = coords.latitude; gps.lon = coords.longitude; gps.acc = coords.accuracy; gps.vel = avgSpeedMs;

        // posizione sul percorso
        if (percorso && percorso.geometria && turnoCorrente && coords.accuracy <= ACCURATEZZA_MAX_M) {
            const nowSec = secondiDalGiorno(turnoCorrente.data);
            const p = aPiano(percorso, coords.latitude, coords.longitude);
            let atteso = null;
            if (gps.along != null) atteso = gps.along + (gps.vel || 0) * Math.min(10, (now - gps.ts) / 1000);
            const pr = proietta(percorso, p.x, p.y, gps.along, nowSec, atteso);
            if (pr) {
                gps.fuori = pr.scarto > FUORI_PERCORSO_M;
                if (!gps.fuori) {
                    // un salto indietro di molto (nuovo passaggio) azzera le fermate già passate
                    if (gps.along != null && pr.along < gps.along - 300) minimoFermata = 0;
                    gps.along = pr.along; gps.scarto = pr.scarto; gps.ts = now;
                    const inst = nowSec - orarioProgrammato(percorso, pr.along, nowSec);
                    gps.ritardoIstantaneo = inst;
                    const arrivato = pr.along >= percorso.lunghezza - SOGLIA_FERMATA_M;
                    const inAttesa = pr.along <= percorso.fermate[0].dist + SOGLIA_FERMATA_M && nowSec < percorso.fermate[0].dep; // fermo al primo attracco, non è ancora partito
                    if (!arrivato && !inAttesa) ritardoSmussato = ritardoSmussato == null ? inst : ritardoSmussato + SMORZA_RITARDO * (inst - ritardoSmussato);
                }
            }
        }
        render();
    }

    function gestisciErrore(error) {
        console.warn('Errore GPS:', error.message);
        let msg = "Errore GPS sconosciuto.";
        if (error.code === error.PERMISSION_DENIED) msg = "Permesso GPS negato.";
        if (error.code === error.POSITION_UNAVAILABLE) msg = "Posizione non disponibile.";
        if (error.code === error.TIMEOUT) msg = "Timeout richiesta GPS.";
        messaggioErrore = msg;

        statusDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
        statusDiv.style.color = "var(--danger, #ef4444)";
        statusDiv.style.background = "rgba(239, 68, 68, 0.1)";

        if (error.code === error.PERMISSION_DENIED) {
            if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
            setTimeout(() => {
                messaggioErrore = null;
                statusDiv.innerHTML = '';
                statusDiv.style.background = "transparent";
                statusDiv.appendChild(btnAttiva);
            }, 4000);
        } else {
            setTimeout(() => { if (messaggioErrore === msg) { messaggioErrore = null; statusDiv.style.background = "transparent"; } }, 4000);
        }
    }

    function inizializzaGPS() {
        if (!("geolocation" in navigator)) {
            statusDiv.innerHTML = "Il tuo browser non supporta il GPS.";
            return;
        }
        if (watchId != null) return;
        statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> In attesa di segnale GPS...`;
        statusDiv.style.color = "var(--text-main)";
        statusDiv.style.background = "transparent";
        speedHistory = [];
        watchId = navigator.geolocation.watchPosition(
            elaboraPosizione,
            gestisciErrore,
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    }

    if (btnAttiva) btnAttiva.addEventListener('click', inizializzaGPS);

    // ---------------------------------------------------------------- apertura e aggiornamento periodico
    function serveRicaricare() {
        if (!turnoCorrente || !oraRif) return true;
        const ora = new Date();
        if (dateToLocalISO(ora) !== oraRif.giorno || (ora.getHours() < 6) !== oraRif.presto) return true;
        if (turnoCorrente.stato === 'errore' && Date.now() - ultimoTentativoTurno > 30000) return true;
        return false;
    }

    setInterval(() => {
        if (!modal || modal.style.display === 'none') return;
        if (serveRicaricare() && Date.now() - ultimoTentativoTurno > 5000) caricaTurno();
        else render();
    }, 1000);

    window.apriModaleGPS = function () {
        modal.style.display = 'flex';
        render();
        caricaTurno(); // riparte da localStorage: se hai cambiato il turno nel calendario lo trova aggiornato

        // se il permesso c'è già non serve premere il pulsante
        if (watchId == null && navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then((r) => { if (r.state === 'granted') inizializzaGPS(); }).catch(() => { });
        }
    };
}
