export function initUIGuida() {
    if (document.getElementById('modal-guida-main')) return;

    // Iniezione CSS specifico per la Guida
    const style = document.createElement('style');
    style.innerHTML = `
        /* ACCORDION (Mantenuti intatti i tuoi stili originali) */
        .guide-accordion-item {
            background: var(--surface);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border-color);
            overflow: hidden;
            animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
            transition: all 0.2s ease;
            flex-shrink: 0; /* Impedisce agli elementi di schiacciarsi */
        }

        .guide-accordion-item:hover {
            box-shadow: var(--shadow-md);
            transform: translateY(-1px);
        }

        .guide-accordion-header {
            width: 100%;
            background: none;
            border: none;
            padding: 20px 24px;
            text-align: left;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 16px;
            font-weight: 600;
            color: var(--text-main);
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
        }

        .guide-accordion-header:hover {
            background-color: var(--surface-hover);
        }

        .guide-accordion-header:active {
            background-color: var(--surface-hover);
            transform: scale(0.98);
        }

        .guide-accordion-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 16px;
            font-weight: 600;
        }

        .guide-accordion-title i {
            font-size: 20px;
            color: var(--primary);
            width: 24px;
            text-align: center;
        }

        .guide-accordion-icon {
            font-size: 16px;
            color: var(--text-muted);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-left: auto;
        }

        .guide-accordion-item.active .guide-accordion-icon {
            transform: rotate(180deg);
        }

        .guide-accordion-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            background-color: var(--surface-hover);
            border-top: 1px solid var(--border-color);
        }

        .guide-accordion-item.active .guide-accordion-content {
            max-height: 2000px;
        }

        .guide-accordion-body {
            padding: 24px;
            color: var(--text-main);
            line-height: 1.6;
        }

        .guide-accordion-body p {
            margin: 0 0 16px 0;
            font-size: 15px;
        }

        .guide-accordion-body p:last-child {
            margin-bottom: 0;
        }

        .guide-step-list {
            padding-left: 20px;
            margin: 16px 0;
            color: var(--text-main);
        }

        .guide-step-list li {
            margin-bottom: 8px;
            line-height: 1.5;
            font-size: 14px;
        }

        .guide-highlight-box {
            background-color: var(--surface);
            color: var(--text-main);
            padding: 16px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
            font-size: 14px;
            margin-top: 16px;
            animation: fadeInUp 0.4s ease;
        }

        /* STILI SPECIFICI PER TIPO */
        .guide-accordion-item.apple { border-left: 4px solid #000; }
        .guide-accordion-item.android { border-left: 4px solid var(--success); }
        .guide-accordion-item.calendar { border-left: 4px solid #5e72e4; }
        .guide-accordion-item.stats { border-left: 4px solid #fb6340; }
        .guide-accordion-item.rotations { border-left: 4px solid #8965e0; }
        .guide-accordion-item.barcadvisor { border-left: 4px solid #11cdef; }
        
        /* Dark mode apple logo fix */
        :root[data-theme="dark"] .guide-accordion-item.apple { border-left: 4px solid #fff; }
        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) .guide-accordion-item.apple { border-left: 4px solid #fff; }
        }
    `;
    document.head.appendChild(style);

    // Iniezione HTML Principale
    const container = document.createElement('div');
    container.id = 'modal-guida-main';
    container.className = 'modal-overlay';
    // Aggiungo la funzione per chiudere cliccando sullo sfondo
    container.onclick = (e) => { window.chiudiSuSfondo(e, 'modal-guida-main') };

    container.innerHTML = `
        <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-guida-main')"></i>
            
            <h3 style="margin-top: 0; color: var(--text-main); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-shrink: 0; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-book" style="color:var(--primary);"></i> Guida all'uso
            </h3>

            <!-- Contenitore scrollabile: flex: 1, min-height: 0, overflow-y: auto -->
            <div style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; gap: 12px; padding-bottom: 20px;">

                <div class="guide-accordion-item apple animate-pop">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-brands fa-apple" style="color: var(--text-main);"></i>
                            Come installare su iPhone
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Per avere l'icona dell'app direttamente sulla schermata principale del tuo telefono, segui questi semplici passaggi. <br><strong>ATTENZIONE: DEVI USARE SAFARI</strong> (non usare Chrome o altri).</p>
                            <ol class="guide-step-list">
                                <li>Apri questo sito web usando l'applicazione <strong>Safari</strong> (quella con l'icona della bussola).</li>
                                <li>Guarda in basso nello schermo: troverai un'icona quadrata con una freccia che punta verso l'alto (il tasto <strong>Condividi</strong>). Premila.</li>
                                <li>Si aprirà un menù. Scorri un po' verso il basso finché non trovi la voce <strong>"Aggiungi alla schermata Home"</strong> (ha l'icona di un +). Premila.</li>
                                <li>In alto a destra premi su <strong>"Aggiungi"</strong>.</li>
                            </ol>
                            <div class="guide-highlight-box">Fatto! Ora troverai l'icona "Utility" insieme alle altre app del telefono.</div>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item android animate-pop" style="animation-delay: 0.05s">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-brands fa-android"></i>
                            Come installare su Android
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Su telefoni Android (Samsung, Xiaomi, Oppo, ecc.) è facilissimo. Usa l'app <strong>Google Chrome</strong>.</p>
                            <ol class="guide-step-list">
                                <li>Nella pagina principale (Home Page) dovresti vedere un tasto verde con scritto <strong>"Installa"</strong> in alto a destra. Se lo vedi, premilo e conferma.</li>
                                <li>Se non vedi il tasto verde, premi i <strong>tre puntini</strong> in alto a destra su Chrome.</li>
                                <li>Nel menù che si apre, tocca <strong>"Aggiungi a schermata Home"</strong> o <strong>"Installa app"</strong>.</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item calendar animate-pop" style="animation-delay: 0.1s">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-calendar-days"></i>
                            Calendario Turni
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p><strong>Configurazione iniziale:</strong><br>
                            La prima volta che entri, l'app ti chiederà di scegliere la tua rotazione (es. F.Nove, Lido, Disp. 5-1). Poi dovrai toccare sul calendario il giorno di un tuo riposo singolo, e infine dire all'app che turno hai il giorno dopo. Fatto questo, il calendario si compilerà da solo</p>

                            <p><strong>Come modificare un giorno:</strong><br>
                            Tocca una casella qualsiasi del calendario. Si aprirà una finestra dove vedrai il turno previsto, l'orario e il luogo. Se vuoi cambiarlo (es. prendere Ferie), scrivi "FER" o "FERIE" nello spazio bianco e premi <strong>Salva Cambio</strong>. Da questa stessa finestra appariranno in automatico gli avvisi se c'è una Variante o una DDS in vigore quel giorno.</p>

                            <p><strong>Tasto "Altro" (Note, Nebbia, Straordinari):</strong><br>
                            Sempre toccando un giorno, se premi il tasto azzurro <strong>Altro</strong>, potrai:
                            <ul class="guide-step-list" style="margin-top: 5px;">
                                <li>Segnare se quel giorno stai facendo un <strong>sospeso riposo</strong>.</li>
                                <li>Aggiungere le ore di <strong>Straordinario</strong>.</li>
                                <li>Spuntare la casella per l'<strong>Indennità Nebbia</strong>.</li>
                                <li>Aggiungere delle <strong>Note di testo libere</strong> a quella giornata.</li>
                                <li>Segnare l'utilizzo del <strong>Buono Pasto</strong> in quella giornata.</li>
                                <li>Colorare la casella del giorno per evidenziarla.</li>
                            </ul>
                            </p>

                            <p><strong>Il menù Azioni (i 3 puntini ⋮):</strong><br>
                            In alto a destra, nel calendario, c'è un tasto con tre pallini. Aprendolo trovi funzioni potentissime:
                            <ul class="guide-step-list" style="margin-top: 5px;">
                                <li><strong>Modifica Multipla:</strong> Metti la data di inizio, la data di fine, scrivi il turno che vuoi inserire e lui modificherà tutti i giorni selezionati in un colpo solo.</li>
                                <li><strong>Colori Rotazione:</strong> Ti permette di assegnare un colore specifico (es. sempre rosso, verde, ecc.) al 1°, 2°, 3° giorno lavorato e via dicendo della tua rotazione</li>
                                <li><strong>Esporta PDF (Tipo 1 e Tipo 2):</strong> Il primo stampa l'immagine del calendario, il secondo genera un PDF a lista per un intero mese con tutti i tuoi orari.</li>
                                <li><strong>Esporta ICS:</strong> Salva un file che permette di aggiungere i turni con i relativi dati a qualsiasi calendario (Google Calendar, Outlook, Apple).</li>
                                <li><strong>Ferie programmate:</strong> Imposta la tua rotazione ferie che verrà calcolata automaticamente per gli anni successivi e aggiungi anno per anno eventuali cambi ferie.</li>
                                <li><strong>Importa Bibbia:</strong> Carica la tua bibbia per salvare automaticamente i turni diversi da quelli segnati come ad esempio coperture ferie.</li>
                                <li><strong>Backup e Reset:</strong> Salva i tuoi dati per non perderli se cambi telefono, oppure cancella tutto se vuoi ripartire da zero.</li>
                                <li><strong>Cambio bibbia:</strong> Da usare se cambi bibbia, elimina i riposi e i turni inseriti automaticamente mantenendo le modifiche e le ferie.</li>
                            </ul>
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="guide-accordion-item stats animate-pop" style="animation-delay: 0.15s">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-chart-bar"></i>
                            Statistiche Calendario
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Questa pagina legge automaticamente il tuo calendario. Inserisci una data d'inizio e una di fine: l'app conterà da sola quanti riposi, quante ferie, quanti giorni di malattia e quante ore totali di straordinario hai fatto in quel periodo</p>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item rotations animate-pop" style="animation-delay: 0.2s">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-users"></i>
                            Rotazioni
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Visualizza le rotazioni di tutti i colleghi in una tabella chiara e organizzata.</p>
                            <ul class="guide-step-list" style="margin-top: 10px;">
                                <li><strong>Visualizzazione Tabella:</strong> Una tabella scorrevole mostra le rotazioni per mese, con colori diversi per ogni tipo di turno (riposi, lavoro, ferie, ecc.).</li>
                                <li><strong>Ricerca:</strong> Con la funzione ricerca puoi trovare il collega che fa un determinato turno o la lista di colleghi per un cambio turno vedendo se sono di primo, mezzo, terzo o riposo</li>                
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item barcadvisor animate-pop" style="animation-delay: 0.25s">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-ship"></i>
                            BarcAdvisor
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Pagina in cui votare le prestazioni dei mezzi aziendali è segnalare problemi ai colleghi</p>
                            <ul class="guide-step-list" style="margin-top: 10px;">
                                <li><strong>+ Aggiungi unità:</strong> Serve per aggiungere un unità non presente in lista</li>
                                <li><strong>Voti:</strong> Vota da 1 a 5 stelle Potenza, Manovrabilità e Stato generale del mezzo</li>
                                <li><strong>Seganlazioni:</strong> Seganala problemi dell'unità, puoi anche segnare come risolti problemi non più presenti</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item animate-pop" style="animation-delay: 0.3s; border-left: 4px solid var(--primary);">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-file-pdf"></i>
                            Turni, Orari e Documenti
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>In queste pagine trovi i file PDF aziendali divisi per cartelle.</p>
                            <ul class="guide-step-list" style="margin-top: 10px;">
                                <li>Usando la barra di ricerca in cima alla lista puoi cercare direttamente il turno che ti interessa.</li>
                                <li>Con il tasto ricerca a fianco ai turni puoi trovare il turno che effettua una partenza o un arrivo dalle fermate segnate nei turni.</li>
                                <li>Se tocchi <strong>il nome del file (il tasto blu lungo)</strong>, il documento si aprirà direttamente nel telefono per leggerlo.</li>
                                <li>Se tocchi <strong>il tasto bianco con la freccia ⬇️</strong> a destra, il file verrà scaricato e salvato nella memoria del tuo telefono.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item animate-pop" style="animation-delay: 0.35s; border-left: 4px solid #e83e8c;">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-exchange-alt"></i>
                            Bacheca Turni
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Gestisci i tuoi cambi turno con i colleghi</p>
                            <ul class="guide-step-list">
                                <li><strong>Nuovo Scambio:</strong> Inserisci la data, il turno che cedi e quello che cerchi. Se inserisci un codice turno valido (es. 1C01), potrai visualizzare l'immagine del turno cliccando su "Mostra Immagine".</li>
                                <li><strong>Match:</strong> Se un collega offre un turno compatibile con quello che cerchi, l'annuncio apparirà in cima con l'etichetta gialla ✨ MATCH.</li>
                                <li><strong>Contatto Rapido:</strong> Clicca l'icona di WhatsApp per avviare subito una chat con il collega.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item animate-pop" style="animation-delay: 0.4s; border-left: 4px solid #ffc107;">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-umbrella-beach"></i>
                            Rotazione Ferie
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Vedi le ferie dei colleghi e proponi scambi per i periodi di ferie.</p>
                            <ul class="guide-step-list">
                                <li><strong>Condivisione Obbligatoria:</strong> Per vedere le ferie dei colleghi, devi prima inserire le tue tramite il tasto "Inserisci le tue ferie".</li>
                                <li><strong>Ricerca Avanzata:</strong> Filtra per anno (per vedere la rotazione futura) e per mansione.</li>
                                <li><strong>Bacheca Scambi:</strong> Nella sezione "Bacheca" puoi pubblicare un annuncio se cerchi di scambiare un periodo con un altro.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item animate-pop" style="animation-delay: 0.45s; border-left: 4px solid #343a40;">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-address-book" style="color: var(--text-main);"></i>
                            Rubrica Colleghi
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Tutti i contatti telefonici dei colleghi in un unico posto.</p>
                            <ul class="guide-step-list">
                                <li><strong>Privacy e Reciprocità:</strong> Potrai consultare la rubrica solo se deciderai di condividere il tuo numero con gli altri.</li>
                                <li><strong>Ricerca:</strong> Usa la barra in alto per cercare velocemente un collega per nome, cognome o matricola.</li>
                                <li><strong>Azioni:</strong> Usa l'icona del telefono 📞 per chiamare direttamente o quella di WhatsApp per inviare un messaggio.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item animate-pop" style="animation-delay: 0.5s; border-left: 4px solid #495057;">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-link" style="color: var(--text-main);"></i>
                            Link e Contatti
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Qui troverai una rubrica con tutti i numeri utili, le mail e i siti web.</p>
                            <ul class="guide-step-list" style="margin-top: 10px;">
                                <li>Se tocchi un numero di telefono, si aprirà automaticamente l'app telefono. Se tocchi una mail, si aprirà la posta.</li>
                                <li>Se premi il piccolo <strong>tasto a destra con l'icona della cartellina (📋)</strong>, l'app copierà il numero o l'indirizzo per permetterti di incollarlo facilmente su WhatsApp o Telegram.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item animate-pop" style="animation-delay: 0.55s; border-left: 4px solid #5856d6;">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-folder-open"></i>
                            Archivio DDS
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Una nuova sezione creata per gestire le Disposizioni di Servizio, puoi caricare il pdf o un immagine e segnando la data di validità puoi impostare degli avvisi.</p>
                            <ul class="guide-step-list" style="margin-top: 10px;">
                                <li>Puoi aggiungere il titolo, le date di validità specifiche cliccando sul calendario e allegare foto e file PDF per averli sempre a portata di mano.</li>
                                <li>I file allegati verranno salvati dentro al tuo telefono (senza consumare la tua connessione internet dopo la prima volta).</li>
                                <li>Quando salvi una DDS con delle date di validità, il calendario principale ti mostrerà un avviso automatico ("📄 DDS in vigore") quando toccherai quei giorni</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="guide-accordion-item animate-pop" style="animation-delay: 0.6s; border-left: 4px solid #d63384;">
                    <button class="guide-accordion-header" onclick="window.toggleGuideAccordion(this)">
                        <div class="guide-accordion-title">
                            <i class="fa-solid fa-utensils"></i>
                            Contatore Buoni Pasto
                        </div>
                        <i class="fa-solid fa-chevron-down guide-accordion-icon"></i>
                    </button>
                    <div class="guide-accordion-content">
                        <div class="guide-accordion-body">
                            <p>Gestisci i tuoi buoni in maniera manuale o automatica.</p>
                            <ul class="guide-step-list" style="margin-top: 10px;">
                                <li><strong>Tasti rapidi:</strong> Usa i pulsanti per scalare velocemente i buoni spesi (puoi personalizzare i numeri premendo l'icona ⚙️).</li>
                                <li><strong>Integrazione Calendario:</strong> Se attivi l'interruttore apposito, l'app calcolerà i buoni pasto maturati in base ai giorni lavorati nel calendario, escludendo automaticamente Riposi, Ferie, Malattia, ecc.</li>
                                <li><strong>Precompilazione:</strong> Dentro al <em>Calcolatore Buoni</em> trovi la bacchetta magica "Precompila con dati Calendario" per contare subito le tue presenze.</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;
    document.body.appendChild(container);
}
