let mappaAlbero = [];
let numCartelle = 0;

async function downloadForzato(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob; a.download = filename;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(urlBlob);
    } catch (e) { window.open(url, '_blank'); }
}

function caricaFiles(dir) {
    const area = document.getElementById('orari-content-area');
    if (!area) return;

    const pdfs = mappaAlbero
        .filter(p => p.startsWith(dir + "/") && p.toLowerCase().endsWith(".pdf"))
        .map(p => p.split('/')[1]);

    area.innerHTML = "";
    if (numCartelle > 1) {
        const b = document.createElement('button');
        b.className = "back-btn"; 
        b.innerHTML = "<i class='fa-solid fa-arrow-left'></i> Torna alle cartelle";
        b.onclick = initOrari; 
        area.appendChild(b);
    }

    if (pdfs.length === 0) {
        const msg = document.createElement('div');
        msg.className = "status-message";
        msg.innerHTML = `<i class="fa-regular fa-folder-open" style="font-size:32px; color:var(--text-muted);"></i> Questa cartella è vuota.`;
        area.appendChild(msg);
        return;
    }

    pdfs.sort((a, b) => {
        if (a.includes("completo")) return -1;
        return a.localeCompare(b, undefined, {numeric: true});
    });

    pdfs.forEach((nomeOrig, index) => {
        let nomeVis = nomeOrig.replace(/\.pdf$/i, "").replace(/_/g, " ");
        let isCompleto = nomeOrig.includes("completo");
        
        if (isCompleto) {
            nomeVis = "PDF Orari Completo";
        } else {
            nomeVis = nomeVis.split(/\s+dal\s+/i)[0];
            nomeVis = nomeVis.replace(/actv nav/i, "Orari").replace(/(\d+)b\b/gi, "$1/").trim();
            nomeVis = nomeVis.charAt(0).toUpperCase() + nomeVis.slice(1);
        }
        
        const row = document.createElement('div'); 
        row.className = "file-row";
        row.style.animationDelay = `${index * 0.05}s`;

        const aOpen = document.createElement('a');
        aOpen.className = "file-btn"; 
        aOpen.innerHTML = `<i class="fa-solid ${isCompleto ? 'fa-file-pdf' : 'fa-clock'}" style="color: ${isCompleto ? 'var(--danger)' : 'var(--primary)'}; font-size: 20px;"></i> ${nomeVis}`;
        aOpen.href = `${dir}/${nomeOrig}`;
        aOpen.target = "_blank";
        
        const aDown = document.createElement('button');
        aDown.className = "download-btn"; 
        aDown.innerHTML = "<i class='fa-solid fa-download'></i>";
        aDown.title = "Scarica Orario";
        aDown.onclick = () => downloadForzato(`${dir}/${nomeOrig}`, nomeOrig);
        
        row.appendChild(aOpen); row.appendChild(aDown); area.appendChild(row);
    });
}

async function initOrari() {
    const area = document.getElementById('orari-content-area');
    if (!area) return;
    
    area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i> Caricamento indice file...</div>`;

    try {
        const res = await fetch('mappa_file.json?t=' + new Date().getTime());
        if (!res.ok) throw new Error();
        const datiMappa = await res.json();
        mappaAlbero = datiMappa.albero || [];

        const dirs = [...new Set(mappaAlbero
            .filter(p => p.startsWith("orari_") && p.includes('/'))
            .map(p => p.split('/')[0])
        )];

        numCartelle = dirs.length;
        if (numCartelle === 0) {
            area.innerHTML = `<div class='status-message'><i class="fa-regular fa-folder-open" style="font-size:32px; color:var(--text-muted);"></i> Nessuna cartella orari trovata nell'archivio.</div>`;
        } else if (numCartelle === 1) {
            caricaFiles(dirs[0]);
        } else {
            area.innerHTML = "";
            dirs.sort((a,b) => b.localeCompare(a)); // Ordina dalla più recente
            dirs.forEach((d, index) => {
                const btn = document.createElement('button');
                btn.className = "folder-btn";
                btn.style.animationDelay = `${index * 0.1}s`;
                let label = d.replace("orari_", "").split("-").join("/");
                btn.innerHTML = `<i class="fa-solid fa-folder" style="font-size: 20px;"></i> Orari dal ${label}`;
                btn.onclick = () => caricaFiles(d);
                area.appendChild(btn);
            });
        }
    } catch (e) {
        area.innerHTML = `<div class='status-message' style="color:var(--danger); border-color:var(--danger-border); background:var(--danger-light);"><i class="fa-solid fa-triangle-exclamation" style="font-size:28px;"></i> Errore: mappa file non trovata.</div>`;
    }
}

export function avviaMotoreOrari() {
    initOrari();
}
