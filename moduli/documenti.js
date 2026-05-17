export async function avviaMotoreDocumenti() {
    const CARTELLA_DOCS = "documenti";
    const area = document.getElementById('documenti-content-area');
    if (!area) return;

    area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i> Caricamento documenti...</div>`;

    try {
        const resMappa = await fetch('mappa_file.json?t=' + new Date().getTime());
        if (!resMappa.ok) throw new Error("Mappa non trovata");
        const datiMappa = await resMappa.json();

        // Filtra solo i file che sono direttamente nella cartella "documenti"
        const files = datiMappa.albero
            .filter(p => p.startsWith(CARTELLA_DOCS + "/") && p.split('/').length === 2)
            .map(p => p.split('/')[1]);

        area.innerHTML = "";
        
        if (files.length === 0) {
            area.innerHTML = `<div class="status-message"><i class="fa-regular fa-folder-open" style="font-size:32px; color:var(--text-muted);"></i> Nessun documento presente in archivio.</div>`;
            return;
        }

        // Ordine alfabetico
        files.sort((a, b) => a.localeCompare(b));

        files.forEach((nomeOriginale, index) => {
            let nomeVis = nomeOriginale.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
            nomeVis = nomeVis.charAt(0).toUpperCase() + nomeVis.slice(1);

            let iconaFile = "fa-solid fa-file-lines";
            let coloreIcona = "var(--primary)";

            if (nomeOriginale.toLowerCase().endsWith('.pdf')) {
                iconaFile = "fa-solid fa-file-pdf";
                coloreIcona = "var(--danger)";
            } else if (nomeOriginale.toLowerCase().endsWith('.doc') || nomeOriginale.toLowerCase().endsWith('.docx')) {
                iconaFile = "fa-solid fa-file-word";
                coloreIcona = "#2b579a";
            } else if (nomeOriginale.toLowerCase().endsWith('.xls') || nomeOriginale.toLowerCase().endsWith('.xlsx')) {
                iconaFile = "fa-solid fa-file-excel";
                coloreIcona = "var(--success)";
            }

            const row = document.createElement('div');
            row.className = "file-row";
            row.style.animationDelay = `${index * 0.05}s`;

            // Utilizziamo le classi CSS (file-btn, download-btn) già presenti in index.html
            row.innerHTML = `
                <a class="file-btn" href="${CARTELLA_DOCS}/${nomeOriginale}" target="_blank" style="justify-content: flex-start; gap: 12px;">
                    <i class="${iconaFile}" style="color: ${coloreIcona}; font-size: 20px;"></i> 
                    <span style="flex: 1; word-break: break-word;">${nomeVis}</span>
                </a>
                <button class="download-btn" title="Scarica Documento" onclick="window.downloadForzato('${CARTELLA_DOCS}/${nomeOriginale}', '${nomeOriginale}')">
                    <i class="fa-solid fa-download"></i>
                </button>
            `;
            
            area.appendChild(row);
        });
    } catch (e) {
        area.innerHTML = `<div class="status-message" style="color:var(--danger); border-color:var(--danger-border); background:var(--danger-light);"><i class="fa-solid fa-triangle-exclamation" style="font-size:28px;"></i> Mappa file non trovata. Attendi un aggiornamento o contatta l'amministratore.</div>`;
    }
}

// Funzione globale per forzare il download del file invece di aprirlo nel browser
window.downloadForzato = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob; 
        a.download = filename;
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);
    } catch (e) { 
        // Fallback: se la policy CORS blocca il download forzato, aprilo in una nuova tab
        window.open(url, '_blank'); 
    }
};
