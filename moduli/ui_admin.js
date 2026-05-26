export function initUIAdmin() {
    if (document.getElementById('modal-admin-main')) return;

    // 1. Iniezione librerie esterne necessarie per l'Admin
    if (!document.querySelector('script[src*="jszip"]')) {
        const jsZip = document.createElement('script');
        jsZip.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        document.head.appendChild(jsZip);
    }
    if (!document.querySelector('link[href*="flatpickr"]')) {
        const flatCss = document.createElement('link');
        flatCss.rel = "stylesheet";
        flatCss.href = "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css";
        document.head.appendChild(flatCss);
    }
    if (!document.querySelector('script[src*="flatpickr"]')) {
        const flatJs = document.createElement('script');
        flatJs.src = "https://cdn.jsdelivr.net/npm/flatpickr";
        document.head.appendChild(flatJs);
        
        flatJs.onload = () => {
            const flatLang = document.createElement('script');
            flatLang.src = "https://npmcdn.com/flatpickr/dist/l10n/it.js";
            document.head.appendChild(flatLang);
        };
    }

    // 2. Iniezione CSS specifico per l'area Admin
    const style = document.createElement('style');
    style.innerHTML = `
        /* FIX FORZATO: Modale a finestra al centro dello schermo (anche per la sottomodale di eliminazione) */
        #modal-admin-main, #modal-delete-confirm {
            background-color: rgba(0, 0, 0, 0.5) !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
        }

        .admin-card-panel {
            background-color: var(--surface);
            padding: 24px;
            border-radius: var(--radius-lg);
            width: 100%;
            box-shadow: var(--shadow-md);
            border: 1px solid var(--border-color);
            box-sizing: border-box;
            /* opacity: 0 rimosso per far comparire i pannelli */
            flex-shrink: 0; /* Impedisce che il pannello si schiacci quando ce ne sono tanti */
        }

        .admin-card-panel h3 {
            margin-top: 0;
            font-size: 18px;
            color: var(--text-main);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 15px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        input[type="file"].admin-input-field {
            padding: 10px;
            background: var(--surface-hover);
        }

        .admin-checkbox-container {
            display: flex;
            align-items: center;
            font-size: 14px;
            margin-bottom: 20px;
            color: var(--text-muted);
            cursor: pointer;
            font-weight: 500;
        }

        .admin-checkbox-container input {
            margin-right: 10px;
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
        }

        .status-log { 
            font-size: 14px; 
            color: var(--text-muted); 
            margin-top: 15px; 
            text-align: center; 
            min-height: 15px; 
            font-weight: 600; 
            background: var(--surface-hover);
            padding: 10px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }

        .switch-cal { position: relative; display: inline-block; width: 44px; height: 24px; margin-left: auto; }
        .switch-cal input { opacity: 0; width: 0; height: 0; }
        .slider-cal { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-color); transition: .3s; border-radius: 24px; }
        .slider-cal:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: var(--shadow-sm); }
        .switch-cal input:checked + .slider-cal { background-color: var(--success); }
        .switch-cal input:checked + .slider-cal:before { transform: translateX(20px); }
        .reset-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; color: var(--text-main); font-weight: 500;}
        .reset-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

        .folder-group { margin-bottom: 10px; background: var(--surface-hover); border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); }
        .folder-header { display: flex; align-items: center; padding: 14px; cursor: pointer; background: var(--surface); font-weight: 600; font-size: 14px; color: var(--text-main); border-bottom: 1px solid var(--border-color); }
        .folder-header:hover { background: var(--surface-hover); }
        .folder-toggle-icon { width: 24px; text-align: center; margin-right: 5px; user-select: none; color: var(--primary); }
        .folder-checkbox { margin-right: 12px; width: 18px; height: 18px; cursor: pointer; accent-color: var(--danger); }
        .folder-content { padding: 10px 15px; background: var(--surface-hover); }
        .file-item { display: flex; align-items: center; margin-bottom: 10px; font-size: 13px; color: var(--text-muted); padding: 6px 0; border-bottom: 1px solid var(--border-color);}
        .file-item:last-child { margin-bottom: 0; border-bottom: none; }
        .file-checkbox { margin-right: 12px; width: 16px; height: 16px; cursor: pointer; accent-color: var(--danger); }

        #delete-confirm-list { list-style: none; padding: 0; margin: 15px 0; max-height: 200px; overflow-y: auto; background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px; color: var(--text-muted); }
        #delete-confirm-list li { padding: 10px; border-bottom: 1px solid var(--border-color); word-break: break-all; }
        #delete-confirm-list li:last-child { border-bottom: none; }
    `;
    document.head.appendChild(style);

    // 3. Iniezione dell'HTML Principale
    const container = document.createElement('div');
    container.id = 'modal-admin-main';
    container.className = 'modal-overlay';
    // Chiusura al click sullo sfondo
    container.onclick = (e) => { window.chiudiSuSfondo(e, 'modal-admin-main') };

    container.innerHTML = `
        <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-admin-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--danger); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-lock"></i> Admin Panel
            </h3>

            <!-- Area scrollabile -->
            <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; gap: 20px; padding-bottom: 20px;">

                <div class="admin-card-panel animate-pop" style="animation-delay: 0s;">
                    <h3><i class="fa-brands fa-github" style="color:var(--text-main);"></i> Credenziali Repository</h3>
                    <input type="text" id="gh-owner" class="input-field" placeholder="Username GitHub" value="HazeV98">
                    <input type="text" id="gh-repo" class="input-field" placeholder="Nome Repository" value="Utility">
                    <input type="password" id="gh-token" class="input-field" placeholder="Token GitHub (PAT)">
                    <label class="admin-checkbox-container">
                        <input type="checkbox" id="remember-token"> Ricorda Token su questo dispositivo
                    </label>
                </div>

                <div class="admin-card-panel animate-pop" style="animation-delay: 0.1s;">
                    <h3><i class="fa-solid fa-calendar-check" style="color:var(--primary);"></i> Gestione Calendario</h3>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; line-height: 1.5; margin-bottom: 20px;">
                        Carica la configurazione base del calendario per aggiornare versione, date di transizione e impostazioni di reset dei dati salvati.
                    </p>

                    <button class="btn-action" onclick="window.caricaDatiCalendario()"><i class="fa-solid fa-cloud-arrow-down"></i> Scarica Configurazione</button>
                    
                    <div id="calendario-editor" style="display: none; margin-top: 20px; border-top: 1px dashed var(--border-color); padding-top: 20px;">
                        
                        <label class="editor-label">Versione App:</label>
                        <input type="text" id="cal-versione" class="input-field" placeholder="Es. 1.0.1">
                        
                        <label class="editor-label">Data Inizio Nuovi Turni:</label>
                        <input type="date" id="cal-data" class="input-field">
                        
                        <label class="editor-label" style="margin-top: 20px; margin-bottom: 10px;">Interruttori Reset post Aggiornamento:</label>
                        <div id="cal-reset-switches" style="max-height: 250px; overflow-y: auto; background: var(--surface-hover); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 20px;">
                        </div>
                        
                        <button class="btn-action btn-success" onclick="window.salvaDatiCalendario()"><i class="fa-solid fa-cloud-arrow-up"></i> Salva su GitHub</button>
                    </div>

                    <div id="status-log-cal" class="status-log">In attesa...</div>
                </div>

                <div class="admin-card-panel animate-pop" style="animation-delay: 0.2s;">
                    <h3><i class="fa-solid fa-file-zipper" style="color:#6f42c1;"></i> Uploader ZIP</h3>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; line-height: 1.5; margin-bottom: 20px;">
                        Comprimi la cartella in <b>.zip</b> per caricare turni e rotazioni in un unico passaggio.
                    </p>
                    <input type="file" id="zip-file" class="input-field admin-input-field" accept=".zip">
                    <button class="btn-action" style="background-color: #6f42c1;" onclick="window.caricaZip()"><i class="fa-solid fa-box-open"></i> Estrai e Sincronizza</button>
                    <div id="status-log-zip" class="status-log">In attesa...</div>
                </div>
                
                <div class="admin-card-panel animate-pop" style="animation-delay: 0.3s;">
                    <h3><i class="fa-solid fa-rotate" style="color:var(--warning);"></i> Sincronizzazione Mappa</h3>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; line-height: 1.5; margin-bottom: 20px;">
                        Rigenera l'indice globale del database. Da usare se l'app non visualizza file caricati di recente.
                    </p>
                    <button class="btn-action btn-warning" onclick="window.forzaMappa()"><i class="fa-solid fa-tower-broadcast"></i> Forza Creazione Mappa</button>
                    <div id="status-log-map" class="status-log">In attesa...</div>
                </div>

                <div class="admin-card-panel animate-pop" style="animation-delay: 0.4s;">
                    <h3><i class="fa-solid fa-trash-can" style="color:var(--danger);"></i> Pulizia Repository</h3>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; line-height: 1.5; margin-bottom: 20px;">
                        Scansiona l'intero albero della repository per eliminare vecchi PDF o intere cartelle.
                    </p>
                    <button class="btn-action" style="background-color: #343a40;" onclick="window.caricaElencoFile()"><i class="fa-solid fa-magnifying-glass"></i> Carica Elenco File</button>

                    <div id="file-manager-container" style="display: none; margin-top: 20px; border-top: 1px dashed var(--border-color); padding-top: 20px;">
                        <input type="text" id="ricerca-file" class="input-field" placeholder="🔍 Cerca per nome (es. turni_2025)..." oninput="window.filtraElencoFile()" style="margin-bottom: 15px;">
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div style="display: flex; gap: 8px;">
                                <button class="btn-action" style="background-color: var(--surface-hover); color: var(--text-main); border: 1px solid var(--border-color); padding: 8px 12px; font-size: 12px; width: auto; box-shadow:none;" onclick="window.selezionaTuttiFile(true)">Seleziona Tutti</button>
                                <button class="btn-action" style="background-color: var(--surface-hover); color: var(--text-main); border: 1px solid var(--border-color); padding: 8px 12px; font-size: 12px; width: auto; box-shadow:none;" onclick="window.selezionaTuttiFile(false)">Deseleziona</button>
                            </div>
                            <div style="font-size: 13px; color: var(--text-muted);">
                                <span id="contatore-selezione" style="font-weight: 700; color: var(--danger); font-size: 15px;">0</span> selezionati
                            </div>
                        </div>

                        <div id="file-list" style="max-height: 350px; overflow-y: auto; background: var(--bg-color); padding: 10px; border-radius: var(--radius-md); margin-bottom: 15px; border: 1px solid var(--border-color);">
                        </div>
                        
                        <button class="btn-action btn-danger" onclick="window.preparaEliminazione()"><i class="fa-solid fa-eraser"></i> Elimina Selezionati</button>
                    </div>
                    
                    <div id="status-log-delete" class="status-log">In attesa...</div>
                </div>

                <div class="admin-card-panel animate-pop" style="animation-delay: 0.5s;">
                    <h3><i class="fa-solid fa-code-merge" style="color:#0dcaf0;"></i> Varianti Servizio</h3>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; line-height: 1.5; margin-bottom: 20px;">
                        Aggiungi o rimuovi comunicazioni sulle varianti di servizio aggiornando il file <b>presenza_varianti.json</b>
                    </p>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <button class="btn-action" id="btn-mode-singola" style="padding: 12px; font-size: 14px;" onclick="window.setVariantiMode('multiple')">Singola/Multiple</button>
                        <button class="btn-action" id="btn-mode-multipla" style="background-color: var(--surface-hover); color: var(--text-main); border: 1px solid var(--border-color); box-shadow: none; padding: 12px; font-size: 14px;" onclick="window.setVariantiMode('range')">Range Date</button>
                    </div>
                    
                    <label class="editor-label">Date interessate:</label>
                    <input type="text" id="var-date" class="input-field" placeholder="Clicca per selezionare..." readonly style="cursor: pointer;">
                    
                    <label class="editor-label">Linee (separa con virgola):</label>
                    <input type="text" id="var-linee" class="input-field" placeholder="Es. Linea 1, Linea 12" style="margin-bottom: 8px;">
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 0; margin-bottom: 20px;">Lascia vuoto per creare una nota generica.</p>
                    
                    <label class="admin-checkbox-container">
                        <input type="checkbox" id="var-pulisci" checked> Auto-pulisci date antecedenti ad oggi
                    </label>
                    
                    <button class="btn-action btn-success" onclick="window.salvaVarianti()"><i class="fa-solid fa-paper-plane"></i> Invia Varianti</button>
                    <div id="status-log-var" class="status-log">In attesa...</div>
                </div>

                <div class="admin-card-panel animate-pop" style="animation-delay: 0.6s;">
                    <h3><i class="fa-solid fa-toolbox" style="color:var(--text-muted);"></i> Strumenti Esterni</h3>
                    <button class="btn-action" style="background-color: #ff4b4b;" onclick="window.open('http://100.80.221.32:8501/', '_blank')"><i class="fa-solid fa-arrow-up-right-from-square"></i> Apri Toolbox Turni</button>
                </div>

            </div>
        </div>
    `;
    document.body.appendChild(container);

    // 4. Iniezione Modale di Conferma Eliminazione (Separata per evitare conflitti grafici)
    if (!document.getElementById('modal-delete-confirm')) {
        const deleteContainer = document.createElement('div');
        deleteContainer.id = 'modal-delete-confirm';
        deleteContainer.className = 'modal-overlay';
        deleteContainer.style.display = 'none'; // Nascosta di default
        deleteContainer.innerHTML = `
            <div class="modal-content" style="max-width: 440px; position: relative; padding: 20px;">
                <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModalElimina()"></i>
                <h3 style="margin-top:0; color:var(--danger); border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-triangle-exclamation"></i> Conferma Azione</h3>
                <p style="font-size: 14px; color: var(--text-main); margin-bottom: 15px; line-height: 1.5;">Stai per eliminare definitivamente <b id="delete-count-display" style="color:var(--danger); font-size:16px;"></b> file dalla repository. Questa operazione <b>non è reversibile</b>.</p>
                
                <ul id="delete-confirm-list"></ul>
                
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    <button class="btn-action btn-danger" onclick="window.confermaEliminazione()"><i class="fa-solid fa-trash-can"></i> Conferma Eliminazione</button>
                    <button class="btn-action" style="background-color: transparent; border: 2px solid var(--border-color); color: var(--text-main); box-shadow: none;" onclick="window.chiudiModalElimina()">Annulla</button>
                </div>
            </div>
        `;
        document.body.appendChild(deleteContainer);
    }
}
