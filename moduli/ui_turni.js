// Variabili per il visualizzatore nativo di Turni
let pzInstanceTurni = null;
let currentImagePathTurni = "";

export function initUITurni() {
    if (document.getElementById('modal-turni-main')) return;

    // Iniezione dinamica di Panzoom se non presente nella pagina
    if (!document.querySelector(`script[src*="panzoom.min.js"]`)) {
        const s = document.createElement('script');
        s.src = "https://cdn.jsdelivr.net/npm/@panzoom/panzoom@4.5.0/dist/panzoom.min.js";
        document.head.appendChild(s);
    }

    const uiHTML = `
    <!-- MODALE TURNI MAIN -->
    <div id="modal-turni-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-turni-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-turni-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-rotate"></i> Consultazione Turni
            </h3>

            <div id="content-area" style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 16px;">
            </div>
        </div>
    </div>

    <!-- MODALE CERCA CORSE -->
    <div id="modal-cerca-corse" class="modal-overlay-search" onclick="window.chiudiSuSfondo(event, 'modal-cerca-corse')">
        <div class="modal-content-search" style="padding: 0; overflow: hidden; max-height: 95vh; background: var(--bg-color); max-width: 420px; display: flex; flex-direction: column;">
            
            <div style="padding: 20px 24px; background: var(--surface); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10;">
                <h3 style="margin: 0; color: var(--success); font-weight: 800; font-size: 20px; display:flex; align-items:center; gap:10px;">
                    <i class="fa-solid fa-route"></i> Cerca Corsa
                </h3>
                <i class="fa-solid fa-xmark close-modal" style="font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onclick="window.chiudiModal('modal-cerca-corse')"></i>
            </div>

            <div style="padding: 24px; overflow-y: auto; flex: 1;">
                <div class="tipo-toggle-container">
                    <button id="btn-partenza" class="btn-tipo active" onclick="window.selezionaTipo('partenza')"><i class="fa-solid fa-plane-departure"></i> Partenza</button>
                    <button id="btn-arrivo" class="btn-tipo" onclick="window.selezionaTipo('arrivo')"><i class="fa-solid fa-plane-arrival"></i> Arrivo</button>
                </div>
                <input type="hidden" id="sc-tipo" value="partenza">

                <div id="sc-status" style="display:none; margin-top: 18px; color: var(--text-main); font-size: 14px;"></div>
                <div id="sc-form" style="display:none;">
                    <div id="sc-rest-form">
                        <div class="sc-form-group">
                            <label id="label-luogo">Luogo:</label>
                            <select id="sc-luogo" onchange="window.aggiornaSuggerimentiOrario()"></select>
                        </div>
                        <div class="sc-form-group">
                            <label>Giorno (Opz. per rotazioni):</label>
                            <input type="date" id="sc-giorno">
                        </div>
                        <div class="sc-form-group" style="position: relative;">
                            <label id="label-orario">Orario:</label>
                            <input type="text" id="sc-orario" inputmode="numeric" placeholder="es. 07.30" oninput="window.formattaOrario(event)" autocomplete="off">
                            <div id="sc-suggestions"></div>
                        </div>
                        <button class="btn-action" style="margin-top: 10px;" onclick="window.eseguiRicercaCorsa()"><i class="fa-solid fa-magnifying-glass"></i> Trova Turno</button>
                    </div>
                </div>

                <div id="sc-risultato" class="risultato-box" style="display:none;"></div>
            </div>
        </div>
    </div>

    <!-- MODALE VISUALIZZATORE IMMAGINI NATIVO -->
    <style>@keyframes fadeInVisualizzatoreTurni { from { opacity: 0; } to { opacity: 1; } }</style>
    <div id="turni-imageModal" style="display: none; position: fixed; z-index: 20000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); overflow: hidden; animation: fadeInVisualizzatoreTurni 0.3s ease;" onclick="window.chiudiSeSfondoImgTurni(event)">
        <i class="fa-solid fa-xmark" style="position: absolute; top: calc(20px + env(safe-area-inset-top, 0px)); right: 24px; font-size: 32px; color: white; cursor: pointer; text-shadow: 0 2px 10px rgba(0,0,0,0.5); z-index: 20001; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" onclick="window.chiudiImageModalTurni()"></i>
        
        <div id="turni-imageFlexContainer" style="display:flex; flex-direction: column; justify-content:center; align-items:center; height:100%; padding:20px; padding-bottom: 90px; position: relative;">
            <img id="turni-turnoImage" src="" style="max-width: 100%; max-height: 70vh; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); object-fit: contain; background: white;">
            
            <div style="position: relative; z-index: 20001; margin-top: 20px; background: rgba(242,166,0,0.9); color: #fff; padding: 12px 20px; border-radius: var(--radius-md); font-size: 13px; font-weight: 600; text-align: center; max-width: 90%; box-shadow: 0 4px 15px rgba(242,166,0,0.3); display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 16px;"></i> Controllare sempre la presenza di eventuali varianti.
            </div>
        </div>
        
        <button onclick="window.scaricaImmagineTurnoCore()" style="position: absolute; bottom: calc(30px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); background: var(--primary); color: white; border: none; padding: 14px 28px; border-radius: 30px; font-weight: 700; font-size: 15px; box-shadow: 0 8px 25px var(--primary-glow); cursor: pointer; z-index: 20001; transition: all 0.2s; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-download" style="font-size: 18px;"></i> Scarica Turno
        </button>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// =========================================================================
// LOGICA DEL VISUALIZZATORE IMMAGINI PANZOOM (NATIVO PER TURNI)
// =========================================================================

// Esponiamo la funzione globale che il motore turni.js già chiama
window.apriImmagineTurno = (percorsoCompleto) => {
    currentImagePathTurni = percorsoCompleto;
    let imgElement = document.getElementById('turni-turnoImage');
    
    imgElement.onerror = window.erroreImmagineTurni;
    imgElement.src = currentImagePathTurni;
    
    document.getElementById('turni-imageModal').style.display = 'block';

    if (typeof Panzoom !== 'undefined') {
        if (pzInstanceTurni) {
            pzInstanceTurni.destroy(); // Distruggi l'istanza vecchia per sicurezza
        }
        
        pzInstanceTurni = Panzoom(imgElement, { maxScale: 5, minScale: 1 });
        
        const flexContainer = document.getElementById('turni-imageFlexContainer');
        flexContainer.removeEventListener('wheel', pzInstanceTurni.zoomWithWheel);
        flexContainer.addEventListener('wheel', pzInstanceTurni.zoomWithWheel);
        
        function eseguiZoomToggle() {
            if (!pzInstanceTurni) return;
            let currentScale = pzInstanceTurni.getScale();
            if (currentScale < 1.1) pzInstanceTurni.zoom(1.75, { animate: true });
            else pzInstanceTurni.reset({ animate: true });
        }

        imgElement.ondblclick = eseguiZoomToggle;

        let lastTap = 0; let isPinching = false;
        imgElement.ontouchstart = (e) => { if (e.touches.length > 1) { isPinching = true; } };
        imgElement.ontouchend = (e) => {
            if (isPinching) { if (e.touches.length === 0) { setTimeout(() => isPinching = false, 300); } return; }
            let currentTime = new Date().getTime(); let tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) { eseguiZoomToggle(); if (e.cancelable) e.preventDefault(); }
            lastTap = currentTime;
        };
    }
};

window.chiudiSeSfondoImgTurni = (event) => {
    if (event.target.id === 'turni-imageModal' || event.target.id === 'turni-imageFlexContainer') {
        window.chiudiImageModalTurni();
    }
};

window.chiudiImageModalTurni = () => {
    document.getElementById('turni-imageModal').style.display = 'none';
    document.getElementById('turni-turnoImage').removeAttribute('src');
    if (pzInstanceTurni) { pzInstanceTurni.reset(); }
};

window.erroreImmagineTurni = () => {
    document.getElementById('turni-turnoImage').onerror = null;
    alert("Immagine non trovata.");
    window.chiudiImageModalTurni();
};

window.scaricaImmagineTurnoCore = () => {
    if (!currentImagePathTurni) return;
    const a = document.createElement('a');
    a.href = currentImagePathTurni;
    a.download = currentImagePathTurni.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// Funzione richiamata dalla modale Cerca Corse in turni.js
window.cercaEApriTurno = (codiceTurno, listaFileImmagini, directoryBase) => {
    if (!listaFileImmagini || listaFileImmagini.length === 0) { 
        alert("Nessuna immagine disponibile per la ricerca."); 
        return; 
    }
    
    const match = listaFileImmagini.find(f => { 
        return f.name.replace(/\.[^/.]+$/, "").toUpperCase().includes(codiceTurno.toUpperCase()); 
    });
    
    if (match) { 
        window.apriImmagineTurno(`${directoryBase}/${match.name}`); 
    } else { 
        alert("Immagine turno " + codiceTurno + " non trovata in questa cartella."); 
    }
};
