export async function avviaMotoreLink() {
    const area = document.getElementById('link-content-area');
    if (!area) return;
    
    area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px; color:var(--primary);"></i> Caricamento link...</div>`;
    
    try {
        const res = await fetch(`link.json?v=${new Date().getTime()}`);
        const dati = await res.json();
        
        area.innerHTML = "";
        
        dati.link.forEach((cat, index) => {
            const block = document.createElement('div');
            block.className = "category-block";
            block.style.animationDelay = `${index * 0.05}s`;
            block.innerHTML = `<div class="category-title"><i class="fa-solid fa-bookmark" style="color:var(--text-muted);"></i> ${cat.categoria}</div>`;
            
            cat.elementi.forEach(l => {
                const row = document.createElement('div');
                row.className = "link-row";
                row.innerHTML = `<a class="link-btn" href="${l.url}" target="_blank"><span>${l.nome}</span> <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                                 <div style="display: flex; gap: 8px;">
                                     <div class="copy-btn" title="Mostra QR Code" onclick="window.mostraQR('${l.url}')"><i class="fa-solid fa-qrcode"></i></div>
                                     <div class="copy-btn" title="Copia link" onclick="window.copiaLink('${l.url}', this)"><i class="fa-regular fa-copy"></i></div>
                                 </div>`;
                block.appendChild(row);
            });
            area.appendChild(block);
        });
    } catch (e) { 
        area.innerHTML = `<div class="status-message" style="color:var(--danger); border-color:var(--danger-border); background:var(--danger-light);"><i class="fa-solid fa-triangle-exclamation" style="font-size:24px;"></i> Errore caricamento file JSON.</div>`; 
    }
}

// Rendiamo la funzione di copia disponibile globalmente per poterla chiamare dall'HTML iniettato
window.copiaLink = (url, btn) => {
    navigator.clipboard.writeText(url).then(() => {
        const oldHTML = btn.innerHTML; 
        btn.innerHTML = "<i class='fa-solid fa-check'></i>"; 
        btn.style.color = "white";
        btn.style.backgroundColor = "var(--success)";
        btn.style.borderColor = "var(--success)";
        
        setTimeout(() => { 
            btn.innerHTML = oldHTML; 
            btn.style.color = ""; 
            btn.style.backgroundColor = "";
            btn.style.borderColor = "";
        }, 1500);
    });
};

// Nuova funzione per generare e mostrare il QR code
window.mostraQR = (url) => {
    const qrImg = document.getElementById('qr-code-img');
    const modalQR = document.getElementById('modal-qr-main');
    
    if (qrImg && modalQR) {
        // Generazione tramite API per evitare dipendenze esterne
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
        
        // Se nel tuo script gestisci l'apertura tramite apriModal, la invoca. 
        // Altrimenti gestisce il display manualmente per sicurezza.
        if (typeof window.apriModal === 'function') {
            window.apriModal('modal-qr-main');
        } else {
            modalQR.style.display = 'flex';
        }
    }
};
