import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let datiContattiCache = null; 
let firestoreDB = null;
const MIO_ID_ADMIN = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2";

export async function avviaMotoreContatti(db, auth) {
    firestoreDB = db; 
    
    const area = document.getElementById('contatti-content-area');
    if (!area) return;

    const btnAdd = document.getElementById('btn-add-contact');
    if (btnAdd) {
        if (auth && auth.currentUser && auth.currentUser.uid === MIO_ID_ADMIN) {
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
    
    try {
        const querySnapshot = await getDocs(collection(firestoreDB, "contatti"));
        const tempMap = {};
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const cat = data.categoria || "Altre Info";
            if (!tempMap[cat]) tempMap[cat] = [];
            tempMap[cat].push({ id: doc.id, ...data });
        });

        // Ristruttura i dati e in ordine alfabetico
        datiContattiCache = {
            contatti: Object.keys(tempMap).sort().map(cat => ({
                categoria: cat,
                elementi: tempMap[cat].sort((a,b) => a.nome.localeCompare(b.nome))
            }))
        };
        
        const searchInput = document.getElementById('ricerca-contatti');
        if (searchInput) {
            searchInput.value = ""; 
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
            
            // Gestione retrocompatibilità vecchi record (con .tipo e .valore) e nuovi record (con .telefono e .email)
            let tel = contatto.telefono || (contatto.tipo === 'telefono' ? contatto.valore : "");
            let email = contatto.email || (contatto.tipo === 'email' ? contatto.valore : "");
            
            const matchTel = tel.replace(/\s+/g, '').includes(termineSenzaSpazi);
            const matchEmail = email.toLowerCase().includes(termineRicerca);
            
            return matchNome || matchTel || matchEmail;
        });

        if (elementiFiltrati.length === 0) return; 
        contattiTrovati += elementiFiltrati.length;

        // Blocco Categoria
        const block = document.createElement('div');
        block.className = "category-block";
        block.style.background = "var(--surface)";
        block.style.border = "1px solid var(--border-color)";
        block.style.borderRadius = "var(--radius-md)";
        block.style.overflow = "hidden";
        block.style.boxShadow = "var(--shadow-sm)";

        // Intestazione Categoria
        const titolo = document.createElement('div');
        titolo.className = "category-title";
        titolo.style.margin = "0";
        titolo.style.padding = "14px 16px";
        titolo.style.cursor = "pointer";
        titolo.style.background = "var(--surface-hover)";
        titolo.style.justifyContent = "space-between";
        titolo.style.userSelect = "none";
        
        const isOpenDefault = termineRicerca !== "";
        
        titolo.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-folder" style="color:var(--primary); font-size:16px;"></i>
                <span style="font-size:14px; color:var(--text-main); font-weight:700; letter-spacing:0;">${categoriaObj.categoria}</span>
            </div>
            <i class="fa-solid ${isOpenDefault ? 'fa-chevron-down' : 'fa-chevron-right'} chevron-icon" style="color:var(--text-muted); transition: transform 0.2s;"></i>
        `;
        
        const elementsContainer = document.createElement('div');
        elementsContainer.style.display = isOpenDefault ? "flex" : "none";
        elementsContainer.style.flexDirection = "column";
        
        titolo.onclick = () => {
            const isClosed = elementsContainer.style.display === "none";
            elementsContainer.style.display = isClosed ? "flex" : "none";
            const icon = titolo.querySelector('.chevron-icon');
            if (icon) {
                icon.className = isClosed ? "fa-solid fa-chevron-down chevron-icon" : "fa-solid fa-chevron-right chevron-icon";
            }
            titolo.style.borderBottom = isClosed ? "1px solid var(--border-color)" : "none";
        };

        if(isOpenDefault) titolo.style.borderBottom = "1px solid var(--border-color)";
        block.appendChild(titolo);

        elementiFiltrati.forEach((contatto, index) => {
            const row = document.createElement('div');
            row.className = "contact-row";
            row.style.animationDelay = "0s";
            row.style.display = "flex";
            row.style.flexDirection = "column";
            row.style.gap = "8px";
            row.style.padding = "14px 16px";
            row.style.borderBottom = (index < elementiFiltrati.length - 1) ? "1px solid var(--border-color)" : "none";

            const nomeEl = document.createElement('div');
            nomeEl.style.fontWeight = "bold";
            nomeEl.style.color = "var(--text-main)";
            nomeEl.style.fontSize = "15px";
            nomeEl.textContent = contatto.nome;
            row.appendChild(nomeEl);
            
            // Gestione flessibile per vecchi e nuovi dati
            let tel = contatto.telefono || (contatto.tipo === 'telefono' ? contatto.valore : "");
            let email = contatto.email || (contatto.tipo === 'email' ? contatto.valore : "");

            // Se esiste un telefono, crea la riga
            if (tel) {
                const rowTel = buildDetailRow(tel, 'tel');
                row.appendChild(rowTel);
            }
            
            // Se esiste un'email, crea la riga
            if (email) {
                const rowEmail = buildDetailRow(email, 'email');
                row.appendChild(rowEmail);
            }

            elementsContainer.appendChild(row);
        });

        block.appendChild(elementsContainer);
        area.appendChild(block);
    });

    if (contattiTrovati === 0) {
        area.innerHTML = `<div class="status-message" style="text-align:center; padding:20px; color:var(--text-muted);">Nessun risultato per "<b>${filtroTestuale}</b>"</div>`;
    }
}

// Funzione Helper per creare le singole righe Tel/Email dentro a un contatto
function buildDetailRow(valore, tipoRecapito) {
    const wrapper = document.createElement('div');
    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "space-between";
    wrapper.style.alignItems = "center";

    const textEl = document.createElement('div');
    textEl.style.color = "var(--text-muted)";
    textEl.style.fontSize = "14px";
    textEl.textContent = valore;

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
    
    if (tipoRecapito === 'email') {
        btn.title = "Invia Email";
        btn.href = `mailto:${valore}`;
        btn.innerHTML = `<i class="fa-solid fa-envelope" style="font-size:16px;"></i>`;
    } else {
        btn.title = "Chiama";
        const numeroPulito = valore.replace(/\s+/g, '');
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
        window.copiaTestoContatto(valore, copyBtn);
    };

    actionContainer.appendChild(btn);
    actionContainer.appendChild(copyBtn);
    wrapper.appendChild(textEl);
    wrapper.appendChild(actionContainer);
    
    return wrapper;
}

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
    }).catch(err => console.error('Errore copia: ', err));
};

// ============================================================================
// FUNZIONI FORM ADMIN
// ============================================================================
window.apriFormNuovoContatto = () => {
    const select = document.getElementById('nuovo-contatto-categoria-select');
    select.innerHTML = '<option value="">-- Seleziona Categoria --</option>';
    
    if (datiContattiCache && datiContattiCache.contatti) {
        datiContattiCache.contatti.forEach(c => {
            select.innerHTML += `<option value="${c.categoria}">${c.categoria}</option>`;
        });
    }
    select.innerHTML += '<option value="_nuova_">+ Aggiungi Nuova Categoria...</option>';
    
    document.getElementById('nuovo-contatto-nome').value = "";
    document.getElementById('nuovo-contatto-telefono').value = "";
    document.getElementById('nuovo-contatto-email').value = "";
    document.getElementById('nuovo-contatto-categoria-nuova').value = "";
    document.getElementById('nuovo-contatto-categoria-nuova').style.display = "none";
    
    window.apriModal('modal-aggiungi-contatto');
};

window.toggleNuovaCategoria = (val) => {
    const inputNuova = document.getElementById('nuovo-contatto-categoria-nuova');
    inputNuova.style.display = (val === '_nuova_') ? "block" : "none";
};

window.salvaNuovoContatto = async () => {
    if (!firestoreDB) {
        alert("Errore di connessione al database.");
        return;
    }
    
    const nome = document.getElementById('nuovo-contatto-nome').value.trim();
    const selectCat = document.getElementById('nuovo-contatto-categoria-select').value;
    const catNuova = document.getElementById('nuovo-contatto-categoria-nuova').value.trim();
    
    const telefono = document.getElementById('nuovo-contatto-telefono').value.trim();
    const email = document.getElementById('nuovo-contatto-email').value.trim();
    
    if (!nome || !selectCat) {
        alert("Devi compilare il Nome e selezionare una Categoria!");
        return;
    }
    
    if (!telefono && !email) {
        alert("Devi inserire almeno un recapito (Telefono o Email)!");
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
        await addDoc(collection(firestoreDB, "contatti"), {
            nome: nome,
            categoria: categoriaFinale,
            telefono: telefono,
            email: email
        });
        
        window.chiudiModal('modal-aggiungi-contatto');
        await caricaContattiDaFirebase(); 
        
    } catch (error) {
        console.error("Errore salvataggio:", error);
        alert("Errore nel salvataggio.");
    } finally {
        btnSalva.innerHTML = originalText;
        btnSalva.disabled = false;
    }
};
