let datiContattiCache = null; // Memorizza i dati per la ricerca senza rifare la chiamata di rete

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

        datiContattiCache = await response.json();
        
        // Collega la barra di ricerca
        const searchInput = document.getElementById('ricerca-contatti');
        if (searchInput) {
            searchInput.value = ""; // Resetta la ricerca all'apertura
            searchInput.oninput = (e) => {
                renderizzaContatti(e.target.value);
            };
        }

        // Render iniziale di tutti i contatti
        renderizzaContatti("");

    } catch (error) {
        area.innerHTML = `<div class="status-message"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger); font-size:24px;"></i> Errore nel caricamento dei dati.</div>`;
    }
}

// Nuova funzione per gestire il render in base al testo cercato
function renderizzaContatti(filtroTestuale) {
    const area = document.getElementById('contatti-content-area');
    if (!area || !datiContattiCache) return;

    area.innerHTML = "";

    if (!datiContattiCache.contatti || datiContattiCache.contatti.length === 0) {
        area.innerHTML = `<div class="status-message"><i class="fa-regular fa-folder-open" style="font-size:24px;"></i> Nessun contatto presente.</div>`;
        return;
    }

    const termineRicerca = filtroTestuale.toLowerCase().trim();
    let contattiTrovati = 0;

    datiContattiCache.contatti.forEach(categoriaObj => {
        // Filtra in base al nome o al valore (numero/email)
        const elementiFiltrati = categoriaObj.elementi.filter(contatto => {
            if (!termineRicerca) return true;
            return contatto.nome.toLowerCase().includes(termineRicerca) || 
                   contatto.valore.toLowerCase().includes(termineRicerca);
        });

        if (elementiFiltrati.length === 0) return; // Salta la categoria se vuota dopo il filtro
        
        contattiTrovati += elementiFiltrati.length;

        const block = document.createElement('div');
        block.className = "category-block";

        const titolo = document.createElement('div');
        titolo.className = "category-title";
        titolo.innerHTML = `<i class="fa-solid fa-folder-open" style="color:var(--primary); margin-right:8px; font-size:14px;"></i>${categoriaObj.categoria}`;
        block.appendChild(titolo);

        elementiFiltrati.forEach((contatto, index) => {
            const row = document.createElement('div');
            row.className = "contact-row";
            row.style.animationDelay = `${index * 0.05}s`;
            
            // Impostiamo stili inline per garantire la disposizione a rubrica (senza toccare il tuo CSS)
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.gap = "10px";

            // --- Blocco Informazioni (Nome sopra, Valore sotto) ---
            const infoContainer = document.createElement('div');
            infoContainer.style.display = "flex";
            infoContainer.style.flexDirection = "column";
            infoContainer.style.flex = "1";
            infoContainer.style.overflow = "hidden"; // Previene sfasamenti per testi lunghi

            const nomeEl = document.createElement('div');
            nomeEl.style.fontWeight = "bold";
            nomeEl.style.color = "var(--text-color)";
            nomeEl.style.fontSize = "15px";
            nomeEl.style.whiteSpace = "nowrap";
            nomeEl.style.overflow = "hidden";
            nomeEl.style.textOverflow = "ellipsis";
            nomeEl.textContent = contatto.nome;

            const valoreEl = document.createElement('div');
            valoreEl.style.color = "var(--text-muted)";
            valoreEl.style.fontSize = "13px";
            valoreEl.style.marginTop = "2px";
            valoreEl.textContent = contatto.valore;

            infoContainer.appendChild(nomeEl);
            infoContainer.appendChild(valoreEl);

            // --- Blocco Azioni (Bottoni a destra) ---
            const actionContainer = document.createElement('div');
            actionContainer.style.display = "flex";
            actionContainer.style.gap = "8px";

            const btn = document.createElement('a');
            btn.className = "link-btn";
            // Rendiamo compatti i bottoni rispetto allo stile precedente
            btn.style.padding = "8px 12px";
            btn.style.margin = "0";
            btn.style.display = "flex";
            btn.style.alignItems = "center";
            btn.style.justifyContent = "center";
            btn.title = contatto.tipo === "email" ? "Invia Email" : "Chiama";
            
            if (contatto.tipo === "email") {
                btn.href = `mailto:${contatto.valore}`;
                btn.innerHTML = `<i class="fa-solid fa-envelope" style="font-size:16px;"></i>`;
            } else {
                const numeroPulito = contatto.valore.replace(/\s+/g, '');
                btn.href = `tel:${numeroPulito}`;
                btn.innerHTML = `<i class="fa-solid fa-phone" style="font-size:16px;"></i>`;
            }
            
            const copyBtn = document.createElement('div');
            copyBtn.className = "copy-btn";
            copyBtn.style.padding = "8px 12px";
            copyBtn.style.margin = "0";
            copyBtn.style.display = "flex";
            copyBtn.style.alignItems = "center";
            copyBtn.style.justifyContent = "center";
            copyBtn.innerHTML = "<i class='fa-regular fa-copy'></i>";
            copyBtn.title = "Copia";
            copyBtn.onclick = (e) => {
                e.preventDefault(); 
                window.copiaTestoContatto(contatto.valore, copyBtn);
            };

            actionContainer.appendChild(btn);
            actionContainer.appendChild(copyBtn);

            // Aggiunta alla riga
            row.appendChild(infoContainer);
            row.appendChild(actionContainer);
            block.appendChild(row);
        });

        area.appendChild(block);
    });

    // Mostra messaggio se non ci sono risultati per la ricerca
    if (contattiTrovati === 0) {
        area.innerHTML = `<div class="status-message" style="text-align:center; padding:20px; color:var(--text-muted);">Nessun risultato per "<b>${filtroTestuale}</b>"</div>`;
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
