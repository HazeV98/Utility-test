import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let datiLinkCache = null; 
let firestoreDB = null;
let isAdminSession = false;
const MIO_ID_ADMIN = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2";

export async function avviaMotoreLink(db, auth) {
    firestoreDB = db; 
    
    const area = document.getElementById('link-content-area');
    if (!area) return;

    const btnAdd = document.getElementById('btn-add-link');
    if (btnAdd) {
        if (auth && auth.currentUser && auth.currentUser.uid === MIO_ID_ADMIN) {
            isAdminSession = true;
            btnAdd.style.display = 'flex';
        } else {
            isAdminSession = false;
            btnAdd.style.display = 'none';
        }
    }

    area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px; color:var(--primary);"></i> Caricamento link...</div>`;

    await caricaLinkDaFirebase();
}

async function caricaLinkDaFirebase() {
    const area = document.getElementById('link-content-area');
    
    try {
        const querySnapshot = await getDocs(collection(firestoreDB, "link"));
        const tempMap = {};
        
        querySnapshot.forEach((documento) => {
            const data = documento.data();
            const cat = data.categoria || "Generale";
            if (!tempMap[cat]) tempMap[cat] = [];
            tempMap[cat].push({ id: documento.id, ...data });
        });

        datiLinkCache = {
            link: Object.keys(tempMap).sort().map(cat => ({
                categoria: cat,
                elementi: tempMap[cat].sort((a,b) => a.nome.localeCompare(b.nome))
            }))
        };
        
        const searchInput = document.getElementById('ricerca-link');
        if (searchInput) {
            searchInput.value = ""; 
            searchInput.oninput = (e) => {
                renderizzaLink(e.target.value);
            };
        }

        renderizzaLink("");

    } catch (error) {
        console.error("Errore Firebase link:", error);
        area.innerHTML = `<div class="status-message" style="color:var(--danger); border-color:var(--danger-border); background:var(--danger-light);"><i class="fa-solid fa-triangle-exclamation" style="font-size:24px;"></i> Errore caricamento dal database.</div>`;
    }
}

function renderizzaLink(filtroTestuale) {
    const area = document.getElementById('link-content-area');
    if (!area || !datiLinkCache) return;

    area.innerHTML = "";

    if (!datiLinkCache.link || datiLinkCache.link.length === 0) {
        area.innerHTML = `<div class="status-message"><i class="fa-regular fa-folder-open" style="font-size:24px;"></i> Nessun link presente.</div>`;
        return;
    }

    const termineRicerca = filtroTestuale.toLowerCase().trim();
    let linkTrovati = 0;

    datiLinkCache.link.forEach(categoriaObj => {
        const elementiFiltrati = categoriaObj.elementi.filter(l => {
            if (!termineRicerca) return true;
            const matchNome = (l.nome || "").toLowerCase().includes(termineRicerca);
            const matchUrl = (l.url || "").toLowerCase().includes(termineRicerca);
            return matchNome || matchUrl;
        });

        if (elementiFiltrati.length === 0) return; 
        linkTrovati += elementiFiltrati.length;

        // Blocco Categoria Collassabile
        const block = document.createElement('div');
        block.className = "category-block";
        block.style.flexShrink = "0"; 
        block.style.background = "var(--surface)";
        block.style.border = "1px solid var(--border-color)";
        block.style.borderRadius = "var(--radius-md)";
        block.style.overflow = "hidden";
        block.style.boxShadow = "var(--shadow-sm)";

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
                <i class="fa-solid fa-bookmark" style="color:var(--primary); font-size:16px;"></i>
                <span style="font-size:14px; color:var(--text-main); font-weight:700;">${categoriaObj.categoria}</span>
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

        elementiFiltrati.forEach((l, index) => {
            
            // NUOVO STILE MINIMALE ED ELEGANTE PER LA LISTA
            const row = document.createElement('div');
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.gap = "14px";
            row.style.padding = "12px 16px";
            row.style.cursor = "pointer";
            row.style.transition = "background 0.2s";
            row.style.borderBottom = (index < elementiFiltrati.length - 1) ? "1px solid var(--border-color)" : "none";
            row.onmouseover = () => row.style.background = "var(--surface-hover)";
            row.onmouseout = () => row.style.background = "transparent";

            let urlClean = l.url;
            if (!urlClean.startsWith('http')) urlClean = 'https://' + urlClean;
            
            let domain = "";
            try { domain = new URL(urlClean).hostname; } catch(e) {}
            let faviconHtml = domain ? `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" style="width:24px; height:24px; border-radius:6px; background:white;">` : `<i class="fa-solid fa-globe" style="font-size:20px; color:var(--text-muted);"></i>`;

            row.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; background:var(--surface); border-radius:8px; box-shadow:var(--shadow-sm); border:1px solid var(--border-color);">
                    ${faviconHtml}
                </div>
                <div style="font-weight:700; font-size:14px; color:var(--text-main); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.nome}</div>
                <i class="fa-solid fa-chevron-right" style="color:var(--text-muted); font-size:12px; opacity:0.5;"></i>
            `;

            // CLICCANDO APRE LA SCHEDA INVECE DEL LINK DIRETTO
            row.onclick = () => window.apriSchedaLink(l.id, l.nome, categoriaObj.categoria, urlClean);
            
            elementsContainer.appendChild(row);
        });

        block.appendChild(elementsContainer);
        area.appendChild(block);
    });

    if (linkTrovati === 0) {
        area.innerHTML = `<div class="status-message" style="text-align:center; padding:20px; color:var(--text-muted);">Nessun risultato per "<b>${filtroTestuale}</b>"</div>`;
    }
}

// ============================================================================
// LOGICA SCHEDA LINK E FUNZIONI GLOBALI ESISTENTI
// ============================================================================

window.apriSchedaLink = (id, nome, categoria, url) => {
    let domain = "";
    try { domain = new URL(url).hostname; } catch(e) {}
    
    // Generiamo l'icona più grande per la scheda modale
    let faviconHtml = domain ? `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=128" style="width:40px; height:40px; border-radius:8px;">` : `<i class="fa-solid fa-globe" style="font-size:32px; color:var(--primary);"></i>`;

    document.getElementById('scheda-link-icona').innerHTML = faviconHtml;
    document.getElementById('scheda-link-nome').textContent = nome;
    document.getElementById('scheda-link-url').textContent = url;

    // Assegna il link al bottone "Apri"
    document.getElementById('btn-scheda-apri').href = url;

    // Gestione Copia
    const btnCopia = document.getElementById('btn-scheda-copia');
    btnCopia.onclick = (e) => { 
        e.preventDefault(); 
        window.copiaTestoPulsante(url, btnCopia, "<i class='fa-regular fa-copy'></i> Copia"); 
    };

    // Gestione QR
    document.getElementById('btn-scheda-qr').onclick = () => window.mostraQR(url);

    // Gestione Edit per Admin
    const btnModifica = document.getElementById('btn-scheda-modifica');
    if (isAdminSession) {
        btnModifica.style.display = "flex";
        btnModifica.onclick = () => {
            window.chiudiModal('modal-scheda-link');
            window.apriFormModificaLink(id, nome, categoria, url);
        };
    } else {
        btnModifica.style.display = "none";
    }

    window.apriModal('modal-scheda-link');
};

// Funzione helper per il tasto copia della scheda
window.copiaTestoPulsante = (testo, btn, htmlOriginale) => {
    navigator.clipboard.writeText(testo).then(() => {
        btn.innerHTML = "<i class='fa-solid fa-check'></i> Copiato!"; 
        btn.style.color = "white";
        btn.style.backgroundColor = "var(--success)";
        btn.style.borderColor = "var(--success)";
        
        setTimeout(() => { 
            btn.innerHTML = htmlOriginale; 
            btn.style.color = ""; 
            btn.style.backgroundColor = "";
            btn.style.borderColor = "";
        }, 1500);
    });
};

window.mostraQR = (url) => {
    const qrImg = document.getElementById('qr-code-img');
    const modalQR = document.getElementById('modal-qr-main');
    
    if (qrImg && modalQR) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
        
        if (typeof window.apriModal === 'function') {
            window.apriModal('modal-qr-main');
        } else {
            modalQR.style.display = 'flex';
        }
    }
};

// ============================================================================
// FUNZIONI FORM ADMIN (AGGIUNGI, MODIFICA, ELIMINA)
// ============================================================================
window.apriFormNuovoLink = () => {
    document.getElementById('titolo-modal-link').innerHTML = '<i class="fa-solid fa-plus"></i> Nuovo Link';
    
    const select = document.getElementById('nuovo-link-categoria-select');
    select.innerHTML = '<option value="">-- Seleziona Categoria --</option>';
    if (datiLinkCache && datiLinkCache.link) {
        datiLinkCache.link.forEach(c => { select.innerHTML += `<option value="${c.categoria}">${c.categoria}</option>`; });
    }
    select.innerHTML += '<option value="_nuova_">+ Aggiungi Nuova Categoria...</option>';
    
    document.getElementById('edit-link-id').value = ""; 
    document.getElementById('nuovo-link-nome').value = "";
    document.getElementById('nuovo-link-url').value = "";
    document.getElementById('nuovo-link-categoria-nuova').value = "";
    document.getElementById('nuovo-link-categoria-nuova').style.display = "none";
    
    document.getElementById('btn-elimina-link').style.display = "none"; 
    
    window.apriModal('modal-aggiungi-link');
};

window.apriFormModificaLink = (id, nome, categoria, url) => {
    document.getElementById('titolo-modal-link').innerHTML = '<i class="fa-solid fa-pen"></i> Modifica Link';
    
    const select = document.getElementById('nuovo-link-categoria-select');
    select.innerHTML = '<option value="">-- Seleziona Categoria --</option>';
    if (datiLinkCache && datiLinkCache.link) {
        datiLinkCache.link.forEach(c => { select.innerHTML += `<option value="${c.categoria}">${c.categoria}</option>`; });
    }
    select.innerHTML += '<option value="_nuova_">+ Aggiungi Nuova Categoria...</option>';
    
    document.getElementById('edit-link-id').value = id;
    document.getElementById('nuovo-link-nome').value = nome;
    document.getElementById('nuovo-link-categoria-select').value = categoria;
    document.getElementById('nuovo-link-url').value = url;
    document.getElementById('nuovo-link-categoria-nuova').style.display = "none";
    
    document.getElementById('btn-elimina-link').style.display = "block"; 
    
    window.apriModal('modal-aggiungi-link');
};

window.toggleNuovaCategoriaLink = (val) => {
    const inputNuova = document.getElementById('nuovo-link-categoria-nuova');
    inputNuova.style.display = (val === '_nuova_') ? "block" : "none";
};

window.salvaNuovoLink = async () => {
    if (!firestoreDB) { alert("Errore database."); return; }
    
    const id = document.getElementById('edit-link-id').value;
    const nome = document.getElementById('nuovo-link-nome').value.trim();
    const selectCat = document.getElementById('nuovo-link-categoria-select').value;
    const catNuova = document.getElementById('nuovo-link-categoria-nuova').value.trim();
    const url = document.getElementById('nuovo-link-url').value.trim();
    
    if (!nome || !url || !selectCat) { alert("Compila tutti i campi obbligatori!"); return; }

    const categoriaFinale = (selectCat === '_nuova_') ? catNuova : selectCat;
    if (!categoriaFinale) { alert("Inserisci il nome della categoria!"); return; }
    
    const btnSalva = event.currentTarget;
    const originalText = btnSalva.innerHTML;
    btnSalva.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btnSalva.disabled = true;

    try {
        if (id) {
            await updateDoc(doc(firestoreDB, "link", id), {
                nome: nome,
                categoria: categoriaFinale,
                url: url
            });
        } else {
            await addDoc(collection(firestoreDB, "link"), {
                nome: nome,
                categoria: categoriaFinale,
                url: url
            });
        }
        
        window.chiudiModal('modal-aggiungi-link');
        await caricaLinkDaFirebase(); 
        
    } catch (error) {
        console.error("Errore salvataggio:", error);
        alert("Errore nel salvataggio.");
    } finally {
        btnSalva.innerHTML = originalText;
        btnSalva.disabled = false;
    }
};

window.eliminaLink = async () => {
    const id = document.getElementById('edit-link-id').value;
    if (!id || !firestoreDB) return;
    
    if (!confirm("Sei sicuro di voler eliminare definitivamente questo link?")) return;
    
    const btn = document.getElementById('btn-elimina-link');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        await deleteDoc(doc(firestoreDB, "link", id));
        window.chiudiModal('modal-aggiungi-link');
        await caricaLinkDaFirebase();
    } catch(e) {
        alert("Errore durante l'eliminazione.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};
