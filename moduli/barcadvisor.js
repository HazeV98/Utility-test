import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, orderBy, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function avviaMotoreBarcadvisor(db, auth, userDataPrivate, isAdmin) {
    const currentUser = auth.currentUser;
    const ADMIN_UID = "xm1LR5TeiKgBfuo0Htt6q3G1LdU2";

    if (!currentUser) {
        alert("Devi effettuare il login per accedere al BarcAdvisor.");
        // Se non è loggato, per sicurezza chiudiamo la modale (che creeremo in index)
        window.chiudiModal('modal-barcadvisor-main');
        return;
    }

    let allUnits = [];
    let activeUnitId = null;
    window.reportsCount = {};

    let unsubUserVote = null;
    let unsubAllVotes = null;
    let unsubReports = null;
    let unsubUnits = null;
    let unsubGlobalReports = null;

    // --- INIZIALIZZAZIONE ---
    function initApp() {
        // Pulizia listener precedenti
        if (unsubUnits) unsubUnits();
        if (unsubGlobalReports) unsubGlobalReports();

        // Listener per le unità
        unsubUnits = onSnapshot(collection(db, "flotta_unita"), (snapshot) => {
            allUnits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            window.renderUnitsBA();
        });

        // Listener globale per le segnalazioni (serve per i badge)
        unsubGlobalReports = onSnapshot(collection(db, "flotta_segnalazioni"), (snapshot) => {
            window.reportsCount = {};
            snapshot.docs.forEach(d => {
                const data = d.data();
                // CONTEGGIA SOLO LE SEGNALAZIONI NON RISOLTE
                if(data.unitId && !data.risolto) {
                    window.reportsCount[data.unitId] = (window.reportsCount[data.unitId] || 0) + 1;
                }
            });
            window.renderUnitsBA();
        });
    }

    // --- LOGICA VISTA LISTA CON ACCORDION CATEGORIE ---
    window.renderUnitsBA = function() {
        const container = document.getElementById('ba-unitsContainer');
        if(!container) return; // Se la UI non è ancora caricata

        const searchInput = document.getElementById('ba-searchInput');
        const search = searchInput ? searchInput.value.toLowerCase() : "";
        container.innerHTML = '';

        const filtered = allUnits.filter(u => {
            const displayId = u.id.replace(/_/g, '/');
            return displayId.toLowerCase().includes(search);
        });

        if(filtered.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px; font-size:15px;"><i class="fa-solid fa-ship" style="font-size:32px; opacity:0.5; margin-bottom:10px; display:block;"></i>Nessuna unità trovata.</div>`;
            return;
        }

        // Inizializza i gruppi
        const groups = {
            "Motoscafi": [],
            "Motobattelli": [],
            "Motobattelli foranei": [],
            "Motonavi": [],
            "Motozattere": [],
            "Altre Unità": []
        };

        const orderCats = ["Motoscafi", "Motobattelli", "Motobattelli foranei", "Motonavi", "Motozattere", "Altre Unità"];

        // Suddivide le unità filtrate nei gruppi
        filtered.sort((a,b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })).forEach(unit => {
            const displayId = unit.id.replace(/_/g, '/');
            let cat = "Altre Unità";
            
            if(displayId.startsWith('M/Z')) cat = "Motozattere";
            else if(displayId.startsWith('M/N')) cat = "Motonavi";
            else if(displayId.startsWith('M/S')) cat = "Motoscafi";
            else if(displayId.startsWith('M/B')) {
                let suffix = displayId.replace('M/B', '').trim();
                if(/^\d/.test(suffix)) cat = "Motobattelli";
                else cat = "Motobattelli foranei";
            }
            
            groups[cat].push(unit);
        });

        // Genera l'HTML per ogni gruppo che non è vuoto
        orderCats.forEach((catName, index) => {
            if(groups[catName].length === 0) return;

            const catSafe = "ba-cat_" + index;
            const isOpenClass = search.length > 0 ? "open" : "";
            
            let groupHTML = `
                <div class="category-group" style="margin-bottom: 16px; animation: fadeInUp 0.4s ease forwards;">
                    <div id="cat-header-${catSafe}" style="background: var(--surface); padding: 18px 20px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 16px; color: var(--primary); cursor: pointer; transition: all 0.2s; user-select: none;" class="${isOpenClass}" onclick="window.toggleCategoryBA('${catSafe}')">
                        <span><i class="fa-solid fa-layer-group" style="margin-right:8px; opacity:0.7;"></i> ${catName} <span style="color:var(--text-muted); font-size:13px; font-weight:500; margin-left:6px;">(${groups[catName].length})</span></span>
                        <i class="fa-solid fa-chevron-down" style="transition: transform 0.3s; color: ${search.length > 0 ? 'var(--primary)' : 'var(--text-muted)'}; transform: ${search.length > 0 ? 'rotate(180deg)' : 'none'};"></i>
                    </div>
                    <div id="cat-content-${catSafe}" style="padding: 12px 0 0 0; display: ${search.length > 0 ? 'flex' : 'none'}; flex-direction: column; gap: 12px; animation: fadeIn 0.3s ease;">
            `;

            groups[catName].forEach(unit => {
                const displayId = unit.id.replace(/_/g, '/');
                
                let iconaBarca = 'fa-ship';
                if(displayId.startsWith('M/B')) iconaBarca = 'fa-ferry';
                if(displayId.startsWith('M/Z')) iconaBarca = 'fa-truck-fast';

                const repCount = window.reportsCount ? (window.reportsCount[unit.id] || 0) : 0;
                const alertBadge = repCount > 0 
                    ? `<span style="color:var(--danger); margin-left:8px; font-weight:800; font-size:13px; display:inline-flex; align-items:center; gap:4px; background:var(--danger-light); padding:2px 6px; border-radius:6px; border:1px solid var(--danger-border);"><i class="fa-solid fa-triangle-exclamation"></i> ${repCount}</span>` 
                    : '';

                groupHTML += `
                    <div style="background: var(--surface); border-radius: var(--radius-md); padding: 20px; margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)'; this.style.borderColor='var(--primary)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)'; this.style.borderColor='var(--border-color)';" onclick="window.showDetailBA('${unit.id}')">
                        <div class="unit-info">
                            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-main); display:flex; align-items:center; gap:8px;"><i class="fa-solid ${iconaBarca}" style="color: var(--text-muted); font-size: 14px;"></i> ${displayId}</h3>
                            <div style="color: var(--warning); font-weight: 700; margin-top: 6px; font-size: 14px; display:flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-star"></i> ${unit.mediaVoto || 'N/D'}
                                ${alertBadge}
                            </div>
                        </div>
                        ${isAdmin ? `
                            <div style="padding: 10px; color: var(--text-muted); cursor: pointer; transition: 0.2s; border-radius: 50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='var(--surface-hover)'; this.style.color='var(--danger)';" onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted)';" onclick="event.stopPropagation(); window.openAdminMenuBA('${unit.id}')">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            groupHTML += `</div></div>`;
            container.innerHTML += groupHTML;
        });
    };

    window.toggleCategoryBA = function(catId) {
        const content = document.getElementById('cat-content-' + catId);
        const header = document.getElementById('cat-header-' + catId);
        const icon = header.querySelector('i.fa-chevron-down');
        
        if(content.style.display === 'flex') {
            content.style.display = 'none';
            icon.style.transform = 'none';
            icon.style.color = 'var(--text-muted)';
        } else {
            content.style.display = 'flex';
            icon.style.transform = 'rotate(180deg)';
            icon.style.color = 'var(--primary)';
        }
    };

    // --- LOGICA DETTAGLIO (MODAL) ---
    window.showDetailBA = async function(unitId) {
        activeUnitId = unitId;
        const displayId = unitId.replace(/_/g, '/');
        
        let iconaBarca = 'fa-ship';
        if(displayId.startsWith('M/B')) iconaBarca = 'fa-ferry';
        if(displayId.startsWith('M/Z')) iconaBarca = 'fa-truck-fast';
        
        document.getElementById('ba-detailTitle').innerHTML = `<i class="fa-solid ${iconaBarca}" style="color:var(--text-muted); font-size:18px;"></i> ${displayId}`;
        document.getElementById('ba-detailViewModal').style.display = 'flex';
        
        // Assicurati che la cronologia sia nascosta all'apertura
        const histContainer = document.getElementById('ba-historyContainer');
        if(histContainer) histContainer.style.display = 'none';

        const voteId = `${unitId}_${currentUser.uid}`;
        if(unsubUserVote) unsubUserVote();
        unsubUserVote = onSnapshot(doc(db, "flotta_voti", voteId), (docSnap) => {
            window.resetStarsBA();
            if (docSnap.exists()) {
                const data = docSnap.data();
                if(data.potenza) window.applyStarsBA('potenza', data.potenza);
                if(data.manovrabilita) window.applyStarsBA('manovrabilita', data.manovrabilita);
                if(data.stato) window.applyStarsBA('stato', data.stato);
            }
        });

        if(unsubAllVotes) unsubAllVotes();
        unsubAllVotes = onSnapshot(collection(db, "flotta_voti"), (snapshot) => {
            let pSum = 0, pCount = 0, mSum = 0, mCount = 0, sSum = 0, sCount = 0;
            snapshot.docs.forEach(d => {
                const data = d.data();
                if (data.unitId === unitId) {
                    if(data.potenza) { pSum += data.potenza; pCount++; }
                    if(data.manovrabilita) { mSum += data.manovrabilita; mCount++; }
                    if(data.stato) { sSum += data.stato; sCount++; }
                }
            });
            
            document.getElementById('ba-media-potenza').innerHTML = pCount > 0 ? `Media: ${(pSum/pCount).toFixed(1)} <i class="fa-solid fa-star" style="color:var(--warning); font-size:10px;"></i>` : `Media: -`;
            document.getElementById('ba-media-manovrabilita').innerHTML = mCount > 0 ? `Media: ${(mSum/mCount).toFixed(1)} <i class="fa-solid fa-star" style="color:var(--warning); font-size:10px;"></i>` : `Media: -`;
            document.getElementById('ba-media-stato').innerHTML = sCount > 0 ? `Media: ${(sSum/sCount).toFixed(1)} <i class="fa-solid fa-star" style="color:var(--warning); font-size:10px;"></i>` : `Media: -`;
        });

        if(unsubReports) unsubReports();
        const q = query(collection(db, "flotta_segnalazioni"), orderBy("data", "desc"));
        unsubReports = onSnapshot(q, (snapshot) => {
            const container = document.getElementById('ba-reportsContainer');
            const historyList = document.getElementById('ba-historyList');
            
            container.innerHTML = '';
            if(historyList) historyList.innerHTML = '';
            
            let repCount = 0;
            let histCount = 0;

            snapshot.docs.forEach(d => {
                const data = d.data();
                if (data.unitId === unitId) {
                    if (!data.risolto) {
                        // SEGNALAZIONI ATTIVE
                        repCount++;
                        const btnElimina = `<button style="background: var(--surface-hover); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; float: right; cursor: pointer; color: var(--danger); transition: 0.2s;" onmouseover="this.style.background='var(--danger)'; this.style.color='white'; this.style.borderColor='var(--danger)';" onmouseout="this.style.background='var(--surface-hover)'; this.style.color='var(--danger)'; this.style.borderColor='var(--border-color)';" onclick="window.deleteReportBA('${d.id}')"><i class="fa-solid fa-trash-can"></i> Elimina</button>`;

                        container.innerHTML += `
                            <div style="background: var(--surface); border-left: 4px solid var(--danger); padding: 16px; margin-bottom: 12px; border-radius: var(--radius-md); position: relative; box-shadow: var(--shadow-sm); border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
                                ${btnElimina}
                                <span style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 15px; color: var(--text-main);">${data.testo}</span>
                                <span style="font-size: 12px; color: var(--text-muted); display:flex; align-items:center; gap:6px;"><i class="fa-regular fa-user"></i> ${data.autore} - <i class="fa-regular fa-calendar"></i> ${new Date(data.data).toLocaleDateString('it-IT')}</span>
                            </div>
                        `;
                    } else {
                        // SEGNALAZIONI IN CRONOLOGIA (RISOLTE) - Tolto il text-decoration: line-through;
                        histCount++;
                        if(historyList) {
                            historyList.innerHTML += `
                                <div style="background: var(--bg-color); padding: 12px; margin-bottom: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); opacity: 0.8;">
                                    <span style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 14px; color: var(--text-main);">${data.testo}</span>
                                    <span style="font-size: 11px; color: var(--text-muted); display:flex; align-items:center; gap:6px;"><i class="fa-regular fa-user"></i> ${data.autore} - <i class="fa-regular fa-calendar"></i> ${new Date(data.data).toLocaleDateString('it-IT')}</span>
                                </div>
                            `;
                        }
                    }
                }
            });
            
            if(repCount === 0) {
                container.innerHTML = `<div style="color:var(--text-muted); font-size:14px; text-align:center; padding:15px; background:var(--surface); border-radius:8px; border:1px solid var(--border-color);"><i class="fa-regular fa-circle-check" style="color:var(--success); font-size:24px; margin-bottom:8px; display:block;"></i>Nessun problema segnalato per questa unità.</div>`;
            }

            if(historyList && histCount === 0) {
                historyList.innerHTML = `<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:10px;">Nessuna segnalazione archiviata.</div>`;
            }
        });
    };

    window.closeDetailModalBA = function() {
        document.getElementById('ba-detailViewModal').style.display = 'none';
        activeUnitId = null;
        if(unsubUserVote) unsubUserVote();
        if(unsubAllVotes) unsubAllVotes();
        if(unsubReports) unsubReports();
    };

    // --- VOTAZIONI ---
    window.votaStarBA = async function(element, val) {
        const cat = element.parentElement.dataset.category;
        
        const voteId = `${activeUnitId}_${currentUser.uid}`;
        const voteRef = doc(db, "flotta_voti", voteId);
        
        await setDoc(voteRef, {
            unitId: activeUnitId,
            uid: currentUser.uid,
            [cat]: val
        }, { merge: true });

        window.updateGlobalAverageBA(activeUnitId);
    };

    window.applyStarsBA = function(cat, val) {
        const stars = document.querySelectorAll(`.ba-stars[data-category="${cat}"] .ba-star`);
        stars.forEach(s => {
            if (parseInt(s.dataset.value) <= val) {
                s.style.color = 'var(--warning)';
            } else {
                s.style.color = 'var(--border-color)';
            }
        });
        document.getElementById(`ba-val-${cat}`).innerText = val + "/5";
    };

    window.resetStarsBA = function() {
        document.querySelectorAll('.ba-star').forEach(s => s.style.color = 'var(--border-color)');
        ['potenza','manovrabilita','stato'].forEach(c => document.getElementById(`ba-val-${c}`).innerText = "-");
    };

    window.updateGlobalAverageBA = async function(unitId) {
        const votesSnap = await getDocs(collection(db, "flotta_voti"));
        let total = 0;
        let count = 0;
        votesSnap.forEach(d => {
            const data = d.data();
            if (data.unitId === unitId) {
                let cats = 0; let sum = 0;
                if(data.potenza) { sum += data.potenza; cats++; }
                if(data.manovrabilita) { sum += data.manovrabilita; cats++; }
                if(data.stato) { sum += data.stato; cats++; }
                
                if(cats > 0) {
                    total += (sum / cats);
                    count++;
                }
            }
        });
        const media = count > 0 ? (total / count).toFixed(1) : 0;
        await updateDoc(doc(db, "flotta_unita", unitId), { mediaVoto: media });
    };

    // --- SEGNALAZIONI ---
    window.submitReportBA = async function() {
        const input = document.getElementById('ba-newReportInput');
        if (!input.value.trim()) return;

        let userName = "Utente";
        try {
            const userDoc = await getDoc(doc(db, "utenti", currentUser.uid));
            if(userDoc.exists()) {
                const ud = userDoc.data();
                userName = `${ud.cognome || ''} ${ud.nome || ''}`.trim() || currentUser.email;
            }
        } catch(e) {
            console.error("Errore recupero nome:", e);
            userName = currentUser.email || "Utente";
        }

        await setDoc(doc(collection(db, "flotta_segnalazioni")), {
            unitId: activeUnitId,
            testo: input.value,
            autore: userName,
            uid: currentUser.uid,
            data: Date.now(),
            risolto: false // Aggiunto flag di default
        });
        input.value = '';
    };

    window.deleteReportBA = async function(id) {
        if (confirm("Confermi di voler eliminare la segnalazione e spostarla nella cronologia?")) {
            // Aggiorna il documento settando risolto a true invece di eliminarlo
            await updateDoc(doc(db, "flotta_segnalazioni", id), {
                risolto: true
            });
        }
    };

    window.toggleHistoryBA = function() {
        const container = document.getElementById('ba-historyContainer');
        if(container) {
            if(container.style.display === 'none') {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }
    };

    // --- AZIONI ADMIN & AGGIUNTA ---
    window.openAddUnitBA = function() {
        const overlay = document.getElementById('ba-modalOverlay');
        document.getElementById('ba-modalTitle').innerHTML = '<i class="fa-solid fa-plus" style="color:var(--primary);"></i> Aggiungi Nuova Unità';
        
        document.getElementById('ba-modalPrefix').style.display = 'block';
        document.getElementById('ba-modalInput').value = "";
        document.getElementById('ba-modalInput').placeholder = "Numero o Nome";
        document.getElementById('ba-modalDeleteBtn').style.display = 'none';
        
        document.getElementById('ba-modalConfirmBtn').onclick = async () => {
            const prefix = document.getElementById('ba-modalPrefix').value;
            const inputVal = document.getElementById('ba-modalInput').value.trim();
            
            if (inputVal) {
                const fullName = `${prefix} ${inputVal}`;
                const name = fullName.replace(/\//g, '_');
                await setDoc(doc(db, "flotta_unita", name), { mediaVoto: 0 });
                window.closeModalBA();
            }
        };
        overlay.style.display = 'flex';
    };

    window.openAdminMenuBA = function(unitId) {
        const overlay = document.getElementById('ba-modalOverlay');
        
        document.getElementById('ba-modalPrefix').style.display = 'none';

        const displayId = unitId.replace(/_/g, '/');
        document.getElementById('ba-modalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color:var(--primary);"></i> Modifica Unità';
        document.getElementById('ba-modalInput').value = displayId;
        
        const delBtn = document.getElementById('ba-modalDeleteBtn');
        delBtn.style.display = 'flex';

        document.getElementById('ba-modalConfirmBtn').onclick = async () => {
            const newName = document.getElementById('ba-modalInput').value.trim().replace(/\//g, '_');
            if (newName && newName !== unitId) {
                const oldData = allUnits.find(u => u.id === unitId);
                await setDoc(doc(db, "flotta_unita", newName), { ...oldData });
                await deleteDoc(doc(db, "flotta_unita", unitId));
                window.closeModalBA();
            }
        };

        delBtn.onclick = async () => {
            if (confirm(`Sei sicuro di voler eliminare definitivamente l'unità ${displayId} dal database? Tutti i voti e le segnalazioni andranno persi.`)) {
                await deleteDoc(doc(db, "flotta_unita", unitId));
                window.closeModalBA();
            }
        };

        overlay.style.display = 'flex';
    };

    window.closeModalBA = function() {
        document.getElementById('ba-modalOverlay').style.display = 'none';
    };

    // Avvia l'inizializzazione al primo caricamento del modulo
    initApp();
}
