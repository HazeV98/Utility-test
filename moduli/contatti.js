export async function avviaMotoreContatti() {
    const area = document.getElementById('contatti-content-area');
    if (!area) return;

    area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i> Caricamento contatti...</div>`;

    try {
        const noCache = new Date().getTime();
        const response = await fetch(`contatti.json?v=${noCache}`);
        
        if (!response.ok) {
            area.innerHTML = `<div class="status-message"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger); font-size:24px;"></i> File contatti.json non trovato.</div>`;
            return;
        }

        const dati = await response.json();
        area.innerHTML = "";

        if (!dati.contatti || dati.contatti.length === 0) {
            area.innerHTML = `<div class="status-message"><i class="fa-regular fa-folder-open" style="font-size:24px;"></i> Nessun contatto presente.</div>`;
            return;
        }

        dati.contatti.forEach(categoriaObj => {
            const block = document.createElement('div');
            block.className = "category-block";

            const titolo = document.createElement('div');
            titolo.className = "category-title";
            titolo.innerHTML = `<i class="fa-solid fa-folder-open" style="color:var(--primary); margin-right:8px; font-size:14px;"></i>${categoriaObj.categoria}`;
            block.appendChild(titolo);

            categoriaObj.elementi.forEach((contatto, index) => {
                const row = document.createElement('div');
                row.className = "contact-row";
                row.style.animationDelay = `${index * 0.05}s`;

                const btn = document.createElement('a');
                btn.className = "link-btn";
                
                if (contatto.tipo === "email") {
                    btn.href = `mailto:${contatto.valore}`;
                    btn.innerHTML = `<span style="display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-envelope" style="color:var(--text-muted); font-size:16px;"></i> ${contatto.nome}</span>`;
                } else {
                    const numeroPulito = contatto.valore.replace(/\s+/g, '');
                    btn.href = `tel:${numeroPulito}`;
                    btn.innerHTML = `<span style="display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-phone" style="color:var(--text-muted); font-size:16px;"></i> ${contatto.nome}</span>`;
                }
                
                const copyBtn = document.createElement('div');
                copyBtn.className = "copy-btn";
                copyBtn.innerHTML = "<i class='fa-regular fa-copy'></i>";
                copyBtn.title = "Copia";
                copyBtn.onclick = (e) => {
                    e.preventDefault(); 
                    window.copiaTestoContatto(contatto.valore, copyBtn);
                };

                row.appendChild(btn);
                row.appendChild(copyBtn);
                block.appendChild(row);
            });

            area.appendChild(block);
        });
    } catch (error) {
        area.innerHTML = `<div class="status-message"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger); font-size:24px;"></i> Errore nel caricamento dei dati.</div>`;
    }
}

// Funzione globale per il copia negli appunti specificamente per il modulo contatti
window.copiaTestoContatto = (testo, btn) => {
    navigator.clipboard.writeText(testo).then(() => {
        const iconaOriginale = btn.innerHTML;
        btn.innerHTML = "<i class='fa-solid fa-check'></i>"; 
        btn.classList.add('copied');
        
        // Applica stili temporanei di feedback visivo
        btn.style.backgroundColor = "var(--success)";
        btn.style.color = "white";
        btn.style.borderColor = "var(--success)";
        
        setTimeout(() => {
            btn.innerHTML = iconaOriginale;
            btn.classList.remove('copied');
            
            // Ripristina stili inline
            btn.style.backgroundColor = "";
            btn.style.color = "";
            btn.style.borderColor = "";
        }, 1500);
    }).catch(err => console.error('Errore nella copia: ', err));
};
