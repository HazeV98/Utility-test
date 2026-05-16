let pzInstance = null;
let currentImagePath = "";

export function initVisualizzatore() {
    // 1. Inietta l'HTML della modale se non è già presente nella pagina
    if (!document.getElementById('imageModal')) {
        const modalHtml = `
        <style>@keyframes fadeInVisualizzatore { from { opacity: 0; } to { opacity: 1; } }</style>
        <div id="imageModal" style="display: none; position: fixed; z-index: 20000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); overflow: hidden; animation: fadeInVisualizzatore 0.3s ease;" onclick="window.chiudiSeSfondoImg(event)">
            <i class="fa-solid fa-xmark" style="position: absolute; top: calc(20px + env(safe-area-inset-top, 0px)); right: 24px; font-size: 32px; color: white; cursor: pointer; text-shadow: 0 2px 10px rgba(0,0,0,0.5); z-index: 20001; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" onclick="window.chiudiImageModal()"></i>
            
            <div id="imageFlexContainer" style="display:flex; flex-direction: column; justify-content:center; align-items:center; height:100%; padding:20px; padding-bottom: 100px; position: relative;">
                <img id="turnoImage" src="" style="max-width: 100%; max-height: 75vh; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); object-fit: contain; background: white;">
                
                <div id="imageBanner" style="position: relative; z-index: 20001; margin-top: 24px; background: rgba(20,20,20,0.85); backdrop-filter: blur(10px); color: #fff; padding: 14px 24px; border-radius: 12px; font-size: 14px; text-align: center; max-width: 90%; box-shadow: 0 8px 20px rgba(0,0,0,0.4); font-weight: 500; border: 1px solid rgba(255,255,255,0.1); display:flex; align-items:center; gap:10px;">
                    ⚠️ Controllare sempre la presenza di eventuali varianti ai turni.
                </div>
            </div>
            
            <button onclick="window.scaricaImmagineTurno()" style="position: absolute; bottom: calc(40px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); background: var(--primary); color: white; border: none; padding: 16px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 25px var(--primary-glow); cursor: pointer; z-index: 20001; transition: all 0.2s; display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-download" style="font-size: 18px;"></i> Scarica Turno
            </button>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 2. Inizializza Panzoom per lo zoom dell'immagine
    const imgElem = document.getElementById('turnoImage');
    if (typeof Panzoom !== 'undefined') {
        pzInstance = Panzoom(imgElem, { maxScale: 5, minScale: 1 });
        document.getElementById('imageFlexContainer').addEventListener('wheel', pzInstance.zoomWithWheel);
        
        function eseguiZoomToggle(e) {
            if (!pzInstance) return;
            let currentScale = pzInstance.getScale();
            if (currentScale < 1.1) pzInstance.zoom(1.75, { animate: true });
            else pzInstance.reset({ animate: true });
        }

        let lastTap = 0; let isPinching = false;
        imgElem.addEventListener('touchstart', function(e) { if (e.touches.length > 1) { isPinching = true; } }, {passive: true});
        imgElem.addEventListener('touchend', function(e) {
            if (isPinching) { if (e.touches.length === 0) { setTimeout(() => isPinching = false, 300); } return; }
            let currentTime = new Date().getTime(); let tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) { eseguiZoomToggle(e); if (e.cancelable) e.preventDefault(); }
            lastTap = currentTime;
        });
        imgElem.addEventListener('dblclick', function(e) { eseguiZoomToggle(e); });
    }
}

// --- FUNZIONI GLOBALI PER IL COMPORTAMENTO MODALE E DOWNLOAD ---

window.chiudiSeSfondoImg = (event) => { 
    if (event.target.id === 'imageModal' || event.target.id === 'imageFlexContainer') window.chiudiImageModal(); 
};

window.chiudiImageModal = () => { 
    document.getElementById('imageModal').style.display = 'none'; 
    document.getElementById('turnoImage').removeAttribute('src'); 
    if (pzInstance) { pzInstance.reset(); } 
};

window.erroreImmagine = () => { 
    document.getElementById('turnoImage').onerror = null; 
    alert("Immagine non trovata."); 
    window.chiudiImageModal(); 
};

window.scaricaImmagineTurno = () => { 
    if (!currentImagePath) return; 
    const a = document.createElement('a'); 
    a.href = currentImagePath; 
    a.download = currentImagePath.split('/').pop(); 
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
};

// --- FUNZIONI DI RICERCA ED APERTURA ESPONIBILI ALLA PAGINA ---

window.apriImmagineTurno = (percorsoCompleto) => { 
    currentImagePath = percorsoCompleto; 
    let imgElement = document.getElementById('turnoImage'); 
    imgElement.onerror = window.erroreImmagine; 
    imgElement.src = currentImagePath; 
    if (pzInstance) { pzInstance.reset(); } 
    document.getElementById('imageModal').style.display = 'block'; 
};

window.cercaEApriTurno = (codiceTurno, listaFileImmagini, directoryBase) => {
    if (!listaFileImmagini || listaFileImmagini.length === 0) { 
        alert("Nessuna immagine disponibile per la ricerca."); 
        return; 
    }
    
    // Trova il file che contiene il codice cercato nel nome
    const match = listaFileImmagini.find(f => { 
        return f.name.replace(/\.[^/.]+$/, "").toUpperCase().includes(codiceTurno.toUpperCase()); 
    });
    
    if (match) { 
        window.apriImmagineTurno(`${directoryBase}/${match.name}`); 
    } else { 
        alert("Immagine turno " + codiceTurno + " non trovata in questa cartella."); 
    }
}; 
