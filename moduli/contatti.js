import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

let datiContattiCache = null; // Memorizza i dati strutturati per la ricerca
const MIO_ID_ADMIN = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2";

export async function avviaMotoreContatti() {
    const area = document.getElementById('contatti-content-area');
    if (!area) return;

    // Controllo ID per mostrare il tasto "+"
    const auth = getAuth();
    const btnAdd = document.getElementById('btn-add-contact');
    if (btnAdd) {
        if (auth.currentUser && auth.currentUser.uid === MIO_ID_ADMIN) {
            btnAdd.style.display = 'flex';
        } else {
            btnAdd.style.display = 'none';
        }
    }

    area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i> Caricamento contatti...</div>`;

    await caricaContattiDaFirebase();
}

async function caricaContattiDaFirebase() {
    const area = document.getElementById('contatti-content-area');
    const db = getFirestore();
    
    try {
        const querySnapshot = await getDocs(collection(db, "contatti"));
        const tempMap = {};
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const cat = data.categoria || "Altre Info";
            if (!tempMap[cat]) tempMap[cat] = [];
            tempMap[cat].push({ id: doc.id, ...data });
        });

        // Ristruttura in un array per mantenere la logica di renderizzazione intatta
        datiContattiCache = {
            contatti: Object.keys(tempMap).sort().map(cat => ({
                categoria: cat,
                elementi: tempMap[cat].sort((a,b) => a.nome.localeCompare(b.nome))
            }))
        };
        
        // Collega la barra di ricerca
        const searchInput = document.getElementById('ricerca-contatti');
        if (searchInput) {
            searchInput.value = ""; // Resetta la ricerca all'apertura
            searchInput.oninput = (e) => {
                renderizzaContatti(e.target.value);
            };
        }

        renderizzaContatti("");

    } catch (error) {
        console.error("Errore Firebase contatti:", error);
        area.innerHTML = `<div class="status-message"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger); font-size:24px;"></i> Errore nel caricamento dal database.</div>`;
    }
}

function renderizzaContatti(filtroTestuale) {
    const area = document.getElementById('contatti-content-area');
    if (!area || !datiContattiCache) return;

    area.innerHTML = "";

    if (!datiContattiCache.contatti || datiContattiCache.contatti.length === 0) {
        area.innerHTML = `<div class="status-message"><i class="fa-regular fa-folder-open" style="font-size:24px;"></i> Nessun contatto presente.</div>`;
        return;
    }

    const termineRicerca = filtroTestuale.toLowerCase().trim();
    const termineSenzaSpazi = termineRicerca.replace(/\s+/g, '');
    let contattiTrovati = 0;

    datiContattiCache.contatti.forEach(categoriaObj => {
        const elementiFiltrati = categoriaObj.elementi.filter(contatto => {
            if (!termineRicerca) return true;
            const matchNome = (contatto.nome || "").toLowerCase().includes(termineRicerca);
            const valoreSenzaSpazi = (contatto.valore || "").toLowerCase().replace(/\s+/g, '');
            const matchValore = valoreSenzaSpazi.includes(termineSenzaSpazi);
            return matchNome || matchValore;
        });

        if (elementiFiltrati.length === 0) return; 
        contattiTrovati += elementiFiltrati.length;

        // --- CREAZIONE DEL BLOCCO CATEGORIA COLLASSABILE ---
        const block = document.createElement('div');
        block.className = "category-block";
        block.style.background = "var(--surface)";
        block.style.border = "1px solid var(--border-color)";
        block.style.borderRadius = "var(--radius-md)";
        block.style.overflow = "hidden";
        block.style.boxShadow = "var(--shadow-sm)";

        // Header della categoria (Cliccabile)
        const titolo = document.createElement('div');
        titolo.className = "category-title";
        titolo.style.margin = "0";
        titolo.style.padding = "14px 16px";
        titolo.style.cursor = "pointer";
        titolo.style.background = "var(--surface-hover)";
        titolo.style.justifyContent = "space-between";
        titolo.style.userSelect = "none";
        titolo.style.borderBottom = "none"; // Rimuove il bordo default del CSS precedente
        
        // Se l'utente sta cercando qualcosa, apriamo la tendina di default. Altrimenti chiusa.
        const isOpenDefault = termineRicerca !== "";
        
        titolo.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-folder" style="color:var(--primary); font-size:16px;"></i>
                <span style="font-size:14px; color:var(--text-main); font-weight:700; letter-spacing: 0;">${categoriaObj.categoria}</span>
            </div>
            <i class="fa-solid ${isOpenDefault ? 'fa-chevron-down' : 'fa-chevron-right'} chevron-icon" style="color:var(--text-muted); transition: transform 0.2s;"></i>
        `;
        
        // Contenitore degli elementi
        const elementsContainer = document.createElement('div');
        elementsContainer.style.display = isOpenDefault ? "flex" : "none";
        elementsContainer.style.flexDirection = "column";
        elementsContainer.style.gap = "0px"; // Gap rimosso, usiamo padding interno
        
        // Logica di Collassabilità
        titolo.onclick = () => {
            const isClosed = elementsContainer.style.display === "none";
            elementsContainer.style.display = isClosed ? "flex" : "none";
            const icon = titolo.querySelector('.chevron-icon');
            if (icon) {
                icon.className = isClosed ? "fa-solid fa-chevron-down chevron-icon" : "fa-solid fa-chevron-right chevron-icon";
            }
            if (isClosed) {
                titolo.style.borderBottom = "1px solid var(--border-color)";
            } else {
                titolo.style.borderBottom = "none";
            }
        };

        if(isOpenDefault) titolo.style.borderBottom = "1px solid var(--border-color)";

        block.appendChild(titolo);

        // --- POPOLAMENTO DEGLI ELEMENTI ---
        elementiFiltrati.forEach((contatto, index) => {
            const row = document.createElement('div');
            row.className = "contact-row";
            row.style.animationDelay = "0s"; // Niente animazione per evitare sfarfallii nell'apertura
            row.style.display = "flex";
            row.style.flexDirection = "column";
            row.style.gap = "6px";
            row.style.padding = "14px 16px";
            row.style.borderBottom = (index < elementiFiltrati.length - 1) ? "1px solid var(--border-color)" : "none";

            const nomeEl = document.createElement('div');
            nomeEl.style.fontWeight = "bold";
            nomeEl.style.color = "var(--text-main)";
            nomeEl.style.fontSize = "15px";
            nomeEl.textContent = contatto.nome;

            const bottomRow = document.createElement('div');
            bottomRow.style.display = "flex";
            bottomRow.style.justifyContent = "space-between";
            bottomRow.style.alignItems = "center";

            const valoreEl = document.createElement('div');
            valoreEl.style.color = "var(--text-muted)";
            valoreEl.style.fontSize = "14px";
            valoreEl.textContent = contatto.valore;

            const actionContainer = document.createElement('div');
            actionContainer.style.display = "flex";
            actionContainer.style.gap = "8px";

            const btn = document.createElement('a');
            btn.className = "link-btn";
            btn.style.padding = "8px 12px";
            btn.style.margin = "0";
            btn.style.display = "flex";
            btn.style.alignItems = "center";
            btn.style.justifyContent = "center";
            btn.style.width = "auto";
            btn.style.boxShadow = "none";
            btn.title = contatto.tipo === "email" ? "Invia Email" : "Chiama";
            
            if (contatto.tipo === "email") {
                btn.href = `mailto:${contatto.valore}`;
                btn.innerHTML = `<i class="fa-solid fa-envelope" style="font-size:16px;"></i>`;
            } else {
                const numeroPulito = (contatto.valore || "").replace(/\s+/g, '');
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
            copyBtn.style.width = "auto";
            copyBtn.style.boxShadow = "none";
            copyBtn.innerHTML = "<i class='fa-regular fa-copy'></i>";
            copyBtn.title = "Copia";
            copyBtn.onclick = (e) => {
                e.preventDefault(); 
                window.copiaTestoContatto(contatto.valore, copyBtn);
            };

            actionContainer.appendChild(btn);
            actionContainer.appendChild(copyBtn);
            bottomRow.appendChild(valoreEl);
            bottomRow.appendChild(actionContainer);
            row.appendChild(nomeEl);
            row.appendChild(bottomRow);

            elementsContainer.appendChild(row);
        });

        block.appendChild(elementsContainer);
        area.appendChild(block);
    });

    if (contattiTrovati === 0) {
        area.innerHTML = `<div class="status-message" style="text-align:center; padding:20px; color:var(--text-muted);">Nessun risultato per "<b>${filtroTestuale}</b>"</div>`;
    }
}

// Funzione globale per il copia negli appunti
window.copiaTestoContatto = (testo, btn) => {
    navigator.clipboard.writeText(testo).then(() => {
        const iconaOriginale = btn.innerHTML;
        btn.innerHTML = "<i class='fa-solid fa-check'></i>"; 
        btn.classList.add('copied');
        
        btn.style.backgroundColor = "var(--success)";
        btn.style.color = "white";
        btn.style.borderColor = "var(--success)";
        
        setTimeout(() => {
            btn.innerHTML = iconaOriginale;
            btn.classList.remove('copied');
            btn.style.backgroundColor = "";
            btn.style.color = "";
            btn.style.borderColor = "";
        }, 1500);
    }).catch(err => console.error('Errore nella copia: ', err));
};

// ============================================================================
// FUNZIONI GLOBALI GESTIONE FORM (SOLO ADMIN)
// ============================================================================
window.apriFormNuovoContatto = () => {
    const select = document.getElementById('nuovo-contatto-categoria-select');
    select.innerHTML = '<option value="">-- Seleziona Categoria --</option>';
    
    // Popola le categorie esistenti leggendo dalla cache creata
    if (datiContattiCache && datiContattiCache.contatti) {
        datiContattiCache.contatti.forEach(c => {
            select.innerHTML += `<option value="${c.categoria}">${c.categoria}</option>`;
        });
    }
    select.innerHTML += '<option value="_nuova_">+ Aggiungi Nuova Categoria...</option>';
    
    // Svuota i form
    document.getElementById('nuovo-contatto-nome').value = "";
    document.getElementById('nuovo-contatto-valore').value = "";
    document.getElementById('nuovo-contatto-categoria-nuova').value = "";
    document.getElementById('nuovo-contatto-categoria-nuova').style.display = "none";
    
    window.apriModal('modal-aggiungi-contatto');
};

window.toggleNuovaCategoria = (val) => {
    const inputNuova = document.getElementById('nuovo-contatto-categoria-nuova');
    inputNuova.style.display = (val === '_nuova_') ? "block" : "none";
};

window.salvaNuovoContatto = async () => {
    const db = getFirestore();
    
    const nome = document.getElementById('nuovo-contatto-nome').value.trim();
    const selectCat = document.getElementById('nuovo-contatto-categoria-select').value;
    const catNuova = document.getElementById('nuovo-contatto-categoria-nuova').value.trim();
    const tipo = document.getElementById('nuovo-contatto-tipo').value;
    const valore = document.getElementById('nuovo-contatto-valore').value.trim();
    
    if (!nome || !valore || !selectCat) {
        alert("Compila tutti i campi obbligatori (Nome, Categoria e Valore)!");
        return;
    }

    const categoriaFinale = (selectCat === '_nuova_') ? catNuova : selectCat;
    if (!categoriaFinale) {
        alert("Inserisci il nome della nuova categoria!");
        return;
    }
    
    const btnSalva = event.currentTarget;
    const originalText = btnSalva.innerHTML;
    btnSalva.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btnSalva.disabled = true;

    try {
        await addDoc(collection(db, "contatti"), {
            nome: nome,
            categoria: categoriaFinale,
            tipo: tipo,
            valore: valore
        });
        
        window.chiudiModal('modal-aggiungi-contatto');
        // Ricarica la lista attingendo a Firestore con il nuovo dato
        await caricaContattiDaFirebase(); 
        
    } catch (error) {
        console.error("Errore salvataggio contatto:", error);
        alert("Errore nel salvataggio del contatto sul database.");
    } finally {
        btnSalva.innerHTML = originalText;
        btnSalva.disabled = false;
    }
};
