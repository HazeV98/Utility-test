import { doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, orderBy, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. INIEZIONE UI BACHECA
// ==========================================
export function initUIBacheca() {
    if (document.getElementById('modal-bacheca-main')) return;
    
    const uiHTML = `
    <style>
        .bacheca-header { display: flex; flex-direction: column; gap: 15px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; }
        .bacheca-top-bar { display: flex; gap: 10px; align-items: center; width: 100%; }
        
        .search-wrapper { flex: 1; position: relative; display: flex; align-items: center; }
        .search-wrapper i { position: absolute; left: 15px; color: var(--text-muted); font-size: 14px; }
        .bacheca-search { width: 100%; padding: 12px 15px 12px 40px; border-radius: 25px; border: 1px solid var(--border-color); background: var(--surface); color: var(--text-main); outline: none; font-size: 14px; transition: all 0.2s ease-in-out; }
        .bacheca-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2); }
        
        .btn-icon-only { width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--surface); color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.2s; flex-shrink: 0; font-size: 16px; }
        .btn-icon-only:hover { background: rgba(0,0,0,0.05); transform: translateY(-1px); }
        .btn-filter-icon { color: var(--primary); }
        .btn-admin-icon { color: var(--danger); border-color: rgba(220, 53, 69, 0.3); background: rgba(220, 53, 69, 0.05); }
        
        .input-bacheca { width: 100%; padding: 12px 15px; margin-bottom: 15px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--surface); color: var(--text-main); outline: none; font-family: inherit; font-size: 14px; transition: all 0.2s ease-in-out; box-sizing: border-box; }
        .input-bacheca:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2); }
        .input-error { border: 2px solid var(--danger) !important; background: rgba(220, 53, 69, 0.05); box-shadow: none !important; }
        
        .filter-list { display: flex; flex-direction: column; }
        .filter-item { padding: 12px 15px; border-bottom: 1px solid var(--border-color); cursor: pointer; font-weight: 600; text-transform: capitalize; color: var(--text-main); display: flex; align-items: center; justify-content: space-between; transition: background 0.2s; }
        .filter-item:last-child { border-bottom: none; }
        .filter-item:hover { background: rgba(0,0,0,0.03); }
        .filter-item.active { color: var(--primary); background: rgba(52, 152, 219, 0.08); }
        .filter-item.active::after { content: '\\f00c'; font-family: "Font Awesome 6 Free"; font-weight: 900; }

        .bacheca-post { background: var(--surface); padding: 18px; border-radius: 16px; margin-bottom: 15px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); }
        .bacheca-post-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .bacheca-post-author { font-size: 13px; font-weight: 800; color: var(--text-muted); }
        .bacheca-post-date { font-size: 11px; color: var(--text-muted); }
        .bacheca-post-title { font-size: 17px; font-weight: 900; color: var(--primary); margin: 0 0 10px 0; }
        .bacheca-post-body { font-size: 14px; line-height: 1.5; white-space: pre-wrap; color: var(--text-main); margin-bottom: 12px; }
        .bacheca-post-body a { color: #3498db; text-decoration: underline; }
        .bacheca-tag { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; background: rgba(52, 152, 219, 0.1); color: #3498db; letter-spacing: 0.5px; }
        
        .bacheca-actions { display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px; position: relative; }
        
        .btn-bacheca { padding: 8px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: bold; transition: opacity 0.2s; position: static !important; }
        .btn-bacheca:hover { opacity: 0.8; }
        .btn-bacheca-ed { background: rgba(243, 156, 18, 0.15); color: #f39c12; }
        .btn-bacheca-del { background: rgba(220, 53, 69, 0.15); color: var(--danger); }
        
        .profile-collapsible { display: none; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px dashed var(--border-color); }
        .profile-collapsible.open { display: block; }
        .bacheca-alert { padding: 15px; border-radius: 12px; margin-bottom: 15px; font-weight: bold; font-size: 14px; text-align: center; display: none; line-height: 1.4; }
    </style>

    <div id="modal-bacheca-main" class="modal-overlay" style="display:none;" onclick="window.bachecaAPI.chiudiSfondo(event, 'modal-bacheca-main')">
        <div class="modal-content" style="max-width: 550px; height: 90vh; display: flex; flex-direction: column; padding: 25px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-bacheca-main').style.display='none'"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 900; margin-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-clipboard-list"></i> Bacheca
            </h3>
            
            <div id="bacheca-warn-alert" class="bacheca-alert" style="background: rgba(255, 193, 7, 0.15); border-left: 5px solid #ffc107; color: #856404;">
                <i class="fa-solid fa-triangle-exclamation"></i> Hai ricevuto un avviso (Warn) da un Amministratore per un post non adeguato. Al prossimo richiamo potresti essere bannato.
            </div>

            <div class="bacheca-header">
                <div class="bacheca-top-bar">
                    <div class="search-wrapper">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input type="text" id="bacheca-search-input" class="bacheca-search" placeholder="Cerca" oninput="window.bachecaAPI.filtraPost()">
                    </div>
                    <button class="btn-icon-only btn-filter-icon" onclick="window.bachecaAPI.apriFiltro()"><i class="fa-solid fa-filter"></i></button>
                    <button id="btn-bacheca-admin" class="btn-icon-only btn-admin-icon" style="display: none;" onclick="window.bachecaAPI.apriAdmin()"><i class="fa-solid fa-shield-halved"></i></button>
                </div>
                <button class="btn-action" style="width: 100%; border-radius: 12px; padding: 12px; font-size: 15px;" onclick="window.bachecaAPI.apriPubblica()"><i class="fa-solid fa-pen"></i> Pubblica un Annuncio</button>
            </div>

            <div id="bacheca-feed" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; width: 100%; padding-right: 5px;">
                <div style="text-align:center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin" style="color: var(--primary); font-size: 30px;"></i></div>
            </div>
        </div>
    </div>

    <div id="modal-bacheca-filter" class="modal-overlay" style="display:none; z-index: 10000; align-items: center; justify-content: center;" onclick="window.bachecaAPI.chiudiSfondo(event, 'modal-bacheca-filter')">
        <div class="modal-content" style="width: 280px; padding: 0; overflow: hidden; border-radius: 16px;">
            <div style="padding: 20px 20px 15px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; color: var(--primary); font-weight: 800;"><i class="fa-solid fa-filter"></i> Filtra per Categoria</h4>
                <i class="fa-solid fa-xmark" style="cursor: pointer; color: var(--text-muted); font-size: 18px;" onclick="document.getElementById('modal-bacheca-filter').style.display='none'"></i>
            </div>
            <div id="bacheca-filter-list" class="filter-list" style="max-height: 50vh; overflow-y: auto;"></div>
        </div>
    </div>

    <div id="modal-bacheca-welcome" class="modal-overlay" style="display:none; z-index: 10001; background: rgba(0,0,0,0.85);">
        <div class="modal-content" style="max-width: 420px; text-align: center; padding: 40px 30px;">
            <i class="fa-solid fa-handshake-angle" style="font-size: 55px; color: var(--primary); margin-bottom: 25px;"></i>
            <h2 style="margin-top:0; font-weight: 900;">Benvenuto in Bacheca!</h2>
            <p style="margin-bottom: 25px; color: var(--text-main); line-height: 1.6; font-size: 15px;">
                In questa sezione troverai gli annunci pubblicati dai colleghi riguardanti qualsiasi cosa si voglia condividere.<br><br>
                <strong>L'unica regola è il rispetto reciproco.</strong> Annunci non adeguati verranno rimossi e comporteranno provvedimenti.
            </p>
            <button class="btn-action" style="width: 100%; font-size: 16px; border-radius: 12px; padding: 14px;" onclick="window.bachecaAPI.accettaBenvenuto()">Entra e Scopri</button>
        </div>
    </div>

    <div id="modal-bacheca-publish" class="modal-overlay" style="display:none; z-index: 9999;">
        <div class="modal-content" style="max-width: 460px; max-height: 90vh; overflow-y: auto; padding: 25px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-bacheca-publish').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; margin-bottom: 20px;"><span id="bacheca-pub-title">Nuovo Annuncio</span></h3>
            
            <button class="btn-action" style="width:100%; margin-bottom: 15px; background: transparent; color: var(--text-main); border: 2px dashed var(--border-color); border-radius: 12px;" onclick="document.getElementById('bacheca-profile-sec').classList.toggle('open')">
                <i class="fa-solid fa-user-pen"></i> Dati Profilo Contatto
            </button>
            
            <div id="bacheca-profile-sec" class="profile-collapsible">
                <input type="text" id="bacheca-p-nome" class="input-bacheca" placeholder="Nome *">
                <input type="text" id="bacheca-p-cognome" class="input-bacheca" placeholder="Cognome *">
                <input type="text" id="bacheca-p-matricola" class="input-bacheca" placeholder="Matricola *">
                <input type="text" id="bacheca-p-omonimia" class="input-bacheca" placeholder="Numero Omonimia (Facoltativo)">
                <input type="tel" id="bacheca-p-tel" class="input-bacheca" placeholder="Numero di Telefono *">
                <p style="font-size: 12px; color: var(--text-muted); margin:0; text-align: center;"><i class="fa-solid fa-circle-info"></i> Questi dati saranno salvati nel tuo profilo.</p>
            </div>

            <select id="bacheca-in-categoria" class="input-bacheca" onchange="window.bachecaAPI.checkCategoriaPersonalizzata()">
                <option value="" disabled selected>Seleziona Categoria...</option>
                <option value="offro">Offro</option>
                <option value="vendo">Vendo</option>
                <option value="regalo">Regalo</option>
                <option value="cerco">Cerco</option>
                <option value="personalizzata">Altra Categoria (Personalizzata)</option>
            </select>
            <input type="text" id="bacheca-in-cat-pers" class="input-bacheca" placeholder="Scrivi la categoria..." style="display:none;">

            <input type="text" id="bacheca-in-titolo" class="input-bacheca" placeholder="Titolo dell'annuncio *">
            <textarea id="bacheca-in-testo" class="input-bacheca" placeholder="Testo dell'annuncio... (I link saranno cliccabili)" rows="6" style="resize: vertical;"></textarea>
            
            <input type="hidden" id="bacheca-edit-id">
            <button class="btn-action" style="width: 100%; margin-top: 5px; border-radius: 12px; padding: 14px; font-size: 15px;" onclick="window.bachecaAPI.salvaAnnuncio()">Pubblica Annuncio</button>
        </div>
    </div>

    <div id="modal-bacheca-admin" class="modal-overlay" style="display:none; z-index: 9999;">
        <div class="modal-content" style="max-width: 500px; height: 80vh; overflow-y: auto; padding: 25px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-bacheca-admin').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--danger); font-weight: 900;"><i class="fa-solid fa-shield-halved"></i> Pannello Moderazione</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Gestione degli utenti segnalati e bannati dalla bacheca.</p>
            <div id="bacheca-admin-list"></div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================
// 2. MOTORE LOGICO BACHECA
// ==========================================
export function avviaMotoreBacheca(db, auth, userDataPrivate) {
    let posts = [];
    let currentCategoryFilter = "tutte"; 
    let isAdmin = userDataPrivate?.ruolo === "admin";
    let currentUserUid = auth.currentUser.uid;
    let unsubscribePosts = null;

    if (userDataPrivate?.bachecaBanned) {
        alert("Sei stato bannato dalla bacheca per violazione delle regole.");
        return; 
    }

    window.bachecaAPI = {
        chiudiSfondo: function(event, id) {
            if (event.target.id === id) document.getElementById(id).style.display = 'none';
        },
        
        accettaBenvenuto: async function() {
            try {
                await updateDoc(doc(db, "utenti", currentUserUid), { bachecaWelcomeSeen: true });
                document.getElementById('modal-bacheca-welcome').style.display = 'none';
                userDataPrivate.bachecaWelcomeSeen = true;
            } catch (e) { console.error("Errore salvataggio benvenuto", e); }
        },

        apriFiltro: function() {
            const listDiv = document.getElementById('bacheca-filter-list');
            let catSet = new Set(["offro", "vendo", "regalo", "cerco"]);
            posts.forEach(p => { if (p.categoria) catSet.add(p.categoria.toLowerCase()); });
            
            let uniqueCats = Array.from(catSet).sort();
            
            let html = `<div class="filter-item ${currentCategoryFilter === 'tutte' ? 'active' : ''}" onclick="window.bachecaAPI.setFiltro('tutte')">Tutte le Categorie</div>`;
            uniqueCats.forEach(c => {
                html += `<div class="filter-item ${currentCategoryFilter === c ? 'active' : ''}" onclick="window.bachecaAPI.setFiltro('${c}')">${c}</div>`;
            });
            
            listDiv.innerHTML = html;
            document.getElementById('modal-bacheca-filter').style.display = 'flex';
        },

        setFiltro: function(cat) {
            currentCategoryFilter = cat;
            document.getElementById('modal-bacheca-filter').style.display = 'none';
            this.filtraPost();
        },

        checkCategoriaPersonalizzata: function() {
            const sel = document.getElementById('bacheca-in-categoria').value;
            const inputPers = document.getElementById('bacheca-in-cat-pers');
            if (sel === 'personalizzata') {
                inputPers.style.display = 'block';
                inputPers.focus();
            } else {
                inputPers.style.display = 'none';
            }
        },

        apriPubblica: function(postToEdit = null) {
            document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
            
            const pNome = document.getElementById('bacheca-p-nome');
            const pCogn = document.getElementById('bacheca-p-cognome');
            const pMatr = document.getElementById('bacheca-p-matricola');
            const pOmo = document.getElementById('bacheca-p-omonimia');
            const pTel = document.getElementById('bacheca-p-tel');
            const collaps = document.getElementById('bacheca-profile-sec');

            pNome.value = userDataPrivate.nome || "";
            pCogn.value = userDataPrivate.cognome || "";
            pMatr.value = userDataPrivate.matricola || "";
            pOmo.value = userDataPrivate.progressivo || ""; // Corretto: legge progressivo
            pTel.value = userDataPrivate.telefono || "";

            let mancanoDati = (!pNome.value || !pCogn.value || !pMatr.value || !pTel.value);
            
            if (mancanoDati) {
                collaps.classList.add('open');
                if(!pNome.value) pNome.classList.add('input-error');
                if(!pCogn.value) pCogn.classList.add('input-error');
                if(!pMatr.value) pMatr.classList.add('input-error');
                if(!pTel.value) pTel.classList.add('input-error');
            } else {
                collaps.classList.remove('open');
            }

            if (postToEdit) {
                document.getElementById('bacheca-pub-title').innerText = "Modifica Annuncio";
                document.getElementById('bacheca-edit-id').value = postToEdit.id;
                document.getElementById('bacheca-in-titolo').value = postToEdit.titolo;
                document.getElementById('bacheca-in-testo').value = postToEdit.testo;
                
                const catSelect = document.getElementById('bacheca-in-categoria');
                let opzioniBase = ["offro", "vendo", "regalo", "cerco"];
                if (opzioniBase.includes(postToEdit.categoria.toLowerCase())) {
                    catSelect.value = postToEdit.categoria.toLowerCase();
                    document.getElementById('bacheca-in-cat-pers').style.display = 'none';
                } else {
                    catSelect.value = "personalizzata";
                    document.getElementById('bacheca-in-cat-pers').style.display = 'block';
                    document.getElementById('bacheca-in-cat-pers').value = postToEdit.categoria;
                }
            } else {
                document.getElementById('bacheca-pub-title').innerText = "Nuovo Annuncio";
                document.getElementById('bacheca-edit-id').value = "";
                document.getElementById('bacheca-in-titolo').value = "";
                document.getElementById('bacheca-in-testo').value = "";
                document.getElementById('bacheca-in-categoria').value = "";
                document.getElementById('bacheca-in-cat-pers').style.display = 'none';
            }

            document.getElementById('modal-bacheca-publish').style.display = 'flex';
        },

        salvaAnnuncio: async function() {
            const pNome = document.getElementById('bacheca-p-nome').value.trim();
            const pCogn = document.getElementById('bacheca-p-cognome').value.trim();
            const pMatr = document.getElementById('bacheca-p-matricola').value.trim();
            const pOmo = document.getElementById('bacheca-p-omonimia').value.trim();
            const pTel = document.getElementById('bacheca-p-tel').value.trim();
            
            if (!pNome || !pCogn || !pMatr || !pTel) {
                alert("Completa i campi obbligatori del profilo (Nome, Cognome, Matricola, Telefono) prima di pubblicare.");
                document.getElementById('bacheca-profile-sec').classList.add('open');
                return;
            }

            let cat = document.getElementById('bacheca-in-categoria').value;
            if (cat === "personalizzata") cat = document.getElementById('bacheca-in-cat-pers').value.trim();
            const tit = document.getElementById('bacheca-in-titolo').value.trim();
            const test = document.getElementById('bacheca-in-testo').value.trim();
            const idModifica = document.getElementById('bacheca-edit-id').value;

            if (!cat || !tit || !test) {
                alert("Compila categoria, titolo e testo.");
                return;
            }

            try {
                // Corretto: salva come 'progressivo'
                if (pNome !== userDataPrivate.nome || pCogn !== userDataPrivate.cognome || pMatr !== userDataPrivate.matricola || pOmo !== (userDataPrivate.progressivo || "") || pTel !== userDataPrivate.telefono) {
                    await updateDoc(doc(db, "utenti", currentUserUid), {
                        nome: pNome, cognome: pCogn, matricola: pMatr, progressivo: pOmo, telefono: pTel
                    });
                    userDataPrivate.nome = pNome; userDataPrivate.cognome = pCogn; 
                    userDataPrivate.matricola = pMatr; userDataPrivate.progressivo = pOmo; userDataPrivate.telefono = pTel;
                }

                let nomeVisivo = `${pCogn} ${pNome}`;
                if (pOmo) nomeVisivo += ` (Om. ${pOmo})`;

                const postData = {
                    autoreId: currentUserUid,
                    autoreNome: nomeVisivo,
                    autoreContatto: pTel,
                    categoria: cat,
                    titolo: tit,
                    testo: test,
                    timestamp: idModifica ? undefined : serverTimestamp()
                };

                if (idModifica) {
                    await updateDoc(doc(db, "bacheca", idModifica), {
                        categoria: cat, titolo: tit, testo: test
                    });
                } else {
                    await addDoc(collection(db, "bacheca"), postData);
                }
                
                document.getElementById('modal-bacheca-publish').style.display = 'none';
            } catch (e) {
                console.error("Errore salvataggio annuncio", e);
                alert("Errore durante il salvataggio.");
            }
        },

        filtraPost: function() {
            const search = document.getElementById('bacheca-search-input').value.toLowerCase();
            
            const filtered = posts.filter(p => {
                const matchTesto = p.titolo.toLowerCase().includes(search) || p.testo.toLowerCase().includes(search);
                const matchCat = currentCategoryFilter === "tutte" || p.categoria.toLowerCase() === currentCategoryFilter;
                return matchTesto && matchCat;
            });
            renderFeed(filtered);
        },

        gestisciPost: async function(id, act, autoreId) {
            if (act === 'edit') {
                const post = posts.find(p => p.id === id);
                if(post) this.apriPubblica(post);
            } else if (act === 'delete') {
                if(confirm("Sei sicuro di voler eliminare questo annuncio?")) {
                    try {
                        await deleteDoc(doc(db, "bacheca", id));
                        if (isAdmin && autoreId !== currentUserUid) {
                            setTimeout(() => { this.promptWarnAdmin(autoreId); }, 500);
                        }
                    } catch (e) { console.error("Errore eliminazione", e); }
                }
            }
        },

        promptWarnAdmin: async function(targetUid) {
            try {
                const uDoc = await getDoc(doc(db, "utenti", targetUid));
                let warns = uDoc.data().bachecaWarns || 0;
                
                let msg = warns === 0 
                    ? "Post eliminato. Vuoi inviare un avviso (Warn) all'utente per post non adeguato?" 
                    : `L'utente ha già ${warns} Warn. Vuoi BANNARLO dalla bacheca?`;
                
                if (confirm(msg)) {
                    if (warns === 0) {
                        await updateDoc(doc(db, "utenti", targetUid), { bachecaWarns: 1 });
                        alert("Warn inviato con successo.");
                    } else {
                        await updateDoc(doc(db, "utenti", targetUid), { bachecaBanned: true });
                        alert("Utente bannato dalla bacheca.");
                    }
                }
            } catch (e) { console.error("Errore sistema warn", e); }
        },

        apriAdmin: async function() {
            document.getElementById('modal-bacheca-admin').style.display = 'flex';
            const container = document.getElementById('bacheca-admin-list');
            container.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary);"></i></div>';
            
            try {
                const qWarn = query(collection(db, "utenti"), where("bachecaWarns", ">", 0));
                const qBan = query(collection(db, "utenti"), where("bachecaBanned", "==", true));
                
                const [snapWarn, snapBan] = await Promise.all([getDocs(qWarn), getDocs(qBan)]);
                let adminHtml = '';
                
                let handled = new Set();
                
                const addRow = (docData) => {
                    if(handled.has(docData.id)) return;
                    handled.add(docData.id);
                    let d = docData.data();
                    let stato = d.bachecaBanned ? '<span style="color:var(--danger); font-weight:900;"><i class="fa-solid fa-ban"></i> BANNATO</span>' : `<span style="color:#f39c12; font-weight:900;"><i class="fa-solid fa-triangle-exclamation"></i> ${d.bachecaWarns} WARN</span>`;
                    
                    adminHtml += `
                        <div style="background:var(--surface); padding: 15px; margin-bottom: 12px; border-radius: 12px; border: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; box-shadow: var(--shadow-sm);">
                            <div><b style="font-size:15px;">${d.cognome} ${d.nome}</b><br><small style="margin-top: 4px; display:inline-block;">${stato}</small></div>
                            <button class="btn-action" style="background:var(--success); border-radius: 8px; font-size: 13px;" onclick="window.bachecaAPI.revocaWarnBan('${docData.id}')"><i class="fa-solid fa-check"></i> Revoca</button>
                        </div>
                    `;
                };

                snapWarn.forEach(addRow);
                snapBan.forEach(addRow);

                if (adminHtml === '') adminHtml = '<p style="text-align:center; color:var(--text-muted); font-weight:bold; padding:20px;">Nessun utente con warn o ban al momento.</p>';
                container.innerHTML = adminHtml;
            } catch (e) { console.error("Errore admin panel", e); }
        },

        revocaWarnBan: async function(targetUid) {
            if(confirm("Sei sicuro di voler revocare warn e ban per questo utente?")) {
                await updateDoc(doc(db, "utenti", targetUid), { bachecaWarns: 0, bachecaBanned: false });
                this.apriAdmin(); 
            }
        }
    };

    function linkify(text) {
        if (!text) return "";
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return safeText.replace(urlRegex, function(url) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    }

    function renderFeed(listaPosts) {
        const feed = document.getElementById('bacheca-feed');
        if (listaPosts.length === 0) {
            feed.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); font-weight:bold;"><i class="fa-solid fa-folder-open" style="font-size:40px; margin-bottom: 15px; opacity:0.5; display:block;"></i> Nessun annuncio trovato.</div>';
            return;
        }

        let html = '';
        listaPosts.forEach(p => {
            const isOwner = p.autoreId === currentUserUid;
            let dateStr = p.timestamp ? p.timestamp.toDate().toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Pubblicato ora";
            let telClean = String(p.autoreContatto).replace(/\s+/g, '');

            html += `
            <div class="bacheca-post">
                <div class="bacheca-post-header">
                    <span class="bacheca-post-author"><i class="fa-solid fa-circle-user" style="color:var(--primary); font-size:15px; margin-right:4px;"></i> ${p.autoreNome}</span>
                    <span class="bacheca-post-date">${dateStr}</span>
                </div>
                <div style="margin-bottom: 8px;"><span class="bacheca-tag">${p.categoria.toUpperCase()}</span></div>
                <h4 class="bacheca-post-title">${p.titolo}</h4>
                <div class="bacheca-post-body">${linkify(p.testo)}</div>
                
                <div style="background: rgba(0,0,0,0.03); padding: 10px 15px; border-radius: 8px; display:inline-flex; align-items: center; gap: 15px; margin-top: 5px;">
                    <span style="font-size: 13px; color: var(--text-muted);">Contatto: <b style="color: var(--text-main);">${p.autoreContatto}</b></span>
                    <a href="tel:${telClean}" style="color: var(--primary); font-size: 18px;" title="Chiama"><i class="fa-solid fa-phone"></i></a>
                    <a href="https://wa.me/39${telClean}" target="_blank" style="color: #25D366; font-size: 20px;" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                </div>
                
                ${(isOwner || isAdmin) ? `
                <div class="bacheca-actions">
                    ${isOwner ? `<button class="btn-bacheca btn-bacheca-ed" onclick="window.bachecaAPI.gestisciPost('${p.id}', 'edit', '${p.autoreId}')" title="Modifica"><i class="fa-solid fa-pen"></i></button>` : ''}
                    <button class="btn-bacheca btn-bacheca-del" onclick="window.bachecaAPI.gestisciPost('${p.id}', 'delete', '${p.autoreId}')" title="Elimina"><i class="fa-solid fa-trash"></i></button>
                </div>
                ` : ''}
            </div>
            `;
        });
        feed.innerHTML = html;
    }

    document.getElementById('modal-bacheca-main').style.display = 'flex';

    if (isAdmin) document.getElementById('btn-bacheca-admin').style.display = 'flex';

    if (!userDataPrivate.bachecaWelcomeSeen) {
        document.getElementById('modal-bacheca-welcome').style.display = 'flex';
    }

    if (userDataPrivate.bachecaWarns > 0) {
        document.getElementById('bacheca-warn-alert').style.display = 'block';
    }

    const q = query(collection(db, "bacheca"), orderBy("timestamp", "desc"));
    unsubscribePosts = onSnapshot(q, (snapshot) => {
        posts = [];
        snapshot.forEach((docSnap) => {
            posts.push({ id: docSnap.id, ...docSnap.data() });
        });
        window.bachecaAPI.filtraPost(); 
    }, (error) => {
        console.error("Errore fetch bacheca", error);
        document.getElementById('bacheca-feed').innerHTML = '<div style="color:var(--danger); text-align:center; padding: 20px; font-weight:bold;">Errore di caricamento. Riprova più tardi.</div>';
    });
}
