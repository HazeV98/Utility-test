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
            const row = document.createElement('div');
            row.className = "link-row";
            row.style.animationDelay = "0s";
            row.style.display = "flex";
            row.style.flexDirection = "column";
            row.style.flexShrink = "0";
            row.style.gap = "8px";
            row.style.padding = "14px 16px";
            row.style.borderBottom = (index < elementiFiltrati.length - 1) ? "1px solid var(--border-color)" : "none";

            let urlClean = l.url;
            if (!urlClean.startsWith('http')) urlClean = 'https://' + urlClean;
            
            // ESTRELA LA FAVICON DIRETTAMENTE DAL DOMINIO
            let domain = "";
            try { domain = new URL(urlClean).hostname; } catch(e) {}
            let faviconHtml = domain ? `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" style="width:20px; height:20px; border-radius:4px; margin-right:4px;">` : `<i class="fa-solid fa-globe" style="margin-right:4px; font-size:16px;"></i>`;

            const linkActionRow = document.createElement('div');
            linkActionRow.style.display = "flex";
            linkActionRow.style.justifyContent = "space-between";
            linkActionRow.style.alignItems = "center";

            const btnWrapper = document.createElement('div');
            btnWrapper.style.flex = "1";
            btnWrapper.style.marginRight = "10px";

            // Tasto principale per aprire il Link
            const linkBtn = document.createElement('a');
            linkBtn.className = "link-btn";
            linkBtn.href = urlClean;
            linkBtn.target = "_blank";
            linkBtn.style.display = "flex";
            linkBtn.style.alignItems = "center";
            linkBtn.style.padding = "8px 12px";
            linkBtn.style.margin = "0";
            linkBtn.style.boxShadow = "none";
            linkBtn.style.justifyContent = "flex-start";
            linkBtn.style.gap = "8px";
            
            linkBtn.innerHTML = `
                ${faviconHtml}
                <span style="font-weight:bold; font-size:14px; text-align:left; word-break:break-word;">${l.nome}</span>
                <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left:auto; font-size:12px; opacity:0.6;"></i>
            `;
            btnWrapper.appendChild(linkBtn);

            // Container Azioni Laterali
            const actionContainer = document.createElement('div');
            actionContainer.style.display = "flex";
            actionContainer.style.gap = "8px";

            // Tasto QR
            const qrBtn = document.createElement('div');
            qrBtn.className = "copy-btn";
            qrBtn.title = "Mostra QR Code";
            qrBtn.style.padding = "8px 12px";
            qrBtn.style.margin = "0";
            qrBtn.style.boxShadow = "none";
            qrBtn.innerHTML = "<i class='fa-solid fa-qrcode'></i>";
            qrBtn.onclick = () => window.mostraQR(urlClean);

            // Tasto Copia
            const copyBtn = document.createElement('div');
            copyBtn.className = "copy-btn";
            copyBtn.title = "Copia URL";
            copyBtn.style.padding = "8px 12px";
            copyBtn.style.margin = "0";
            copyBtn.style.boxShadow = "none";
            copyBtn.innerHTML = "<i class='fa-regular fa-copy'></i>";
            copyBtn.onclick = (e) => { e.preventDefault(); window.copiaLink(urlClean, copyBtn); };

            actionContainer.appendChild(qrBtn);
            actionContainer.appendChild(copyBtn);

            // Tasto Edit Admin
            if (isAdminSession) {
                const editBtn = document.createElement('div');
                editBtn.className = "copy-btn";
                editBtn.title = "Modifica Link";
                editBtn.style.padding = "8px 12px";
                editBtn.style.margin = "0";
                editBtn.style.boxShadow = "none";
                editBtn.innerHTML = "<i class='fa-solid fa-pen'></i>";
                editBtn.onclick = (e) => {
                    e.preventDefault();
                    window.apriFormModificaLink(l.id, l.nome, categoriaObj.categoria, urlClean);
                };
                actionContainer.appendChild(editBtn);
            }

            linkActionRow.appendChild(btnWrapper);
            linkActionRow.appendChild(actionContainer);
            row.appendChild(linkActionRow);
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
// FUNZIONI GLOBALI ESISTENTI (Copia e QR Code)
// ============================================================================
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
