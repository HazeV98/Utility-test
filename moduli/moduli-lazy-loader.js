/**
 * Sistema di Lazy Loading per i moduli della SPA
 * Carica i moduli on-demand per ottimizzare le performance
 */

const ModuliLazyLoader = {
    // Cache per memorizzare i moduli già caricati
    cache: new Map(),
    
    // Set dei moduli UI già inizializzati
    initializedUIs: new Set(),
    
    // Map dei moduli disponibili
    moduli: {
        turni: { motore: './turni.js', ui: './ui_turni.js', exports: ['avviaMotoreTurni', 'initUITurni'] },
        orari: { motore: './orari.js', ui: './ui_orari.js', exports: ['avviaMotoreOrari', 'initUIOrari'] },
        link: { motore: './link.js', ui: './ui_link.js', exports: ['avviaMotoreLink', 'initUILink'] },
        documenti: { motore: './documenti.js', ui: './ui_documenti.js', exports: ['avviaMotoreDocumenti', 'initUIDocumenti'] },
        contatti: { motore: './contatti.js', ui: './ui_contatti.js', exports: ['avviaMotoreContatti', 'initUIContatti'] },
        bacheca_utility: { motore: './bacheca_utility.js', ui: './ui_bacheca_utility.js', exports: ['avviaMotoreBachecaUtility', 'initUIBachecaUtility'] },
        rubrica: { motore: './rubrica.js', ui: './ui_rubrica.js', exports: ['avviaMotoreRubrica', 'initUIRubrica'] },
        bacheca_turni: { motore: './bacheca_turni.js', ui: './ui_bacheca_turni.js', exports: ['avviaMotoreBachecaTurni', 'initUIBachecaTurni'] },
        barcadvisor: { motore: './barcadvisor.js', ui: './ui_barcadvisor.js', exports: ['avviaMotoreBarcadvisor', 'initUIBarcadvisor'] },
        buoni_pasto: { motore: './buoni_pasto.js', ui: './ui_buoniPasto.js', exports: ['avviaMotoreBuoniPasto', 'initUIBuoniPasto'] },
        statistiche: { motore: './statistiche.js', ui: './ui_statistiche.js', exports: ['avviaMotoreStatistiche', 'initUIStatistiche'] },
        rotazioni: { motore: './rotazioni.js', ui: './ui_rotazioni.js', exports: ['avviaMotoreRotazioni', 'initUIRotazioni'] },
        rotazione_ferie: { motore: './rotazione_ferie.js', ui: './ui_rotazione_ferie.js', exports: ['avviaMotoreRotazioneFerie', 'initUIRotazioneFerie'] },
        promemoria: { motore: './promemoria.js', ui: './ui_promemoria.js', exports: ['avviaMotorePromemoria', 'initUIPromemoria'] },
        dds: { motore: './dds.js', ui: './ui_dds.js', exports: ['avviaMotoreDDS', 'initUIDDS'] },
        guida: { motore: './guida.js', ui: './ui_guida.js', exports: ['avviaMotoreGuida', 'initUIGuida'] },
        admin: { motore: './admin.js', ui: './ui_admin.js', exports: ['avviaMotoreAdmin', 'initUIAdmin'] },
        report: { motore: './report.js', ui: './ui_report.js', exports: ['avviaMotoreSegnalazioni', 'initUISegnalazioni'] }
    },
    
    /**
     * Carica un modulo specifico (motore + UI)
     * @param {string} nomeModulo - Nome del modulo (es: 'turni')
     * @returns {Promise<Object>} Oggetto con le funzioni esportate dal modulo
     */
    async caricaModulo(nomeModulo) {
        const config = this.moduli[nomeModulo];
        if (!config) {
            console.error(`✗ Modulo '${nomeModulo}' non trovato`);
            return null;
        }

        // Controlla se il modulo è già in cache
        if (this.cache.has(nomeModulo)) {
            const cached = this.cache.get(nomeModulo);
            if (config.exports.some(f => f.startsWith('initUI')) && !this.initializedUIs.has(nomeModulo)) {
                const initFunc = config.exports.find(f => f.startsWith('initUI'));
                if (cached[initFunc]) {
                    try {
                        cached[initFunc]();
                        this.initializedUIs.add(nomeModulo);
                    } catch (initError) {
                        console.warn(`⚠️ Errore init UI cached '${nomeModulo}':`, initError);
                    }
                }
            }
            console.log(`✓ Modulo '${nomeModulo}' caricato da cache`);
            return cached;
        }
        
        try {
            console.log(`⏳ Caricamento modulo '${nomeModulo}'...`);
            
            // Carica il modulo motore
            const motoreModule = await import(config.motore);
            
            // Carica l'interfaccia UI
            const uiModule = await import(config.ui);
            
            // Estrai le funzioni richieste
            const esporta = {};
            config.exports.forEach(funz => {
                if (motoreModule[funz]) esporta[funz] = motoreModule[funz];
                if (uiModule[funz]) esporta[funz] = uiModule[funz];
            });
            
            // Salva in cache
            this.cache.set(nomeModulo, esporta);

            // Inizializza l'interfaccia UI una sola volta
            const initFunc = config.exports.find(f => f.startsWith('initUI'));
            if (initFunc && esporta[initFunc] && !this.initializedUIs.has(nomeModulo)) {
                try {
                    esporta[initFunc]();
                    this.initializedUIs.add(nomeModulo);
                } catch (initError) {
                    console.warn(`⚠️ Errore init UI '${nomeModulo}':`, initError);
                }
            }
            
            console.log(`✓ Modulo '${nomeModulo}' caricato con successo`);
            
            return esporta;
        } catch (errore) {
            console.error(`✗ Errore caricamento modulo '${nomeModulo}':`, errore);
            return null;
        }
    },
    
    /**
     * Carica e inizializza solo la UI di un modulo
     * @param {string} nomeModulo - Nome del modulo
     * @returns {Promise<Function|null>} La funzione initUI del modulo
     */
    async inizializzaUI(nomeModulo) {
        const modulo = await this.caricaModulo(nomeModulo);
        if (!modulo) return null;
        
        const config = this.moduli[nomeModulo];
        const initFunc = config.exports.find(f => f.startsWith('initUI'));
        
        return modulo[initFunc] || null;
    },
    
    /**
     * Carica e avvia il motore di un modulo
     * @param {string} nomeModulo - Nome del modulo
     * @returns {Promise<Function|null>} La funzione avviaMotore del modulo
     */
    async avviaMotore(nomeModulo) {
        const modulo = await this.caricaModulo(nomeModulo);
        if (!modulo) return null;
        
        const config = this.moduli[nomeModulo];
        const motoreFunc = config.exports.find(f => f.startsWith('avviaMotore'));
        
        return modulo[motoreFunc] || null;
    },
    
    /**
     * Precarica uno o più moduli in background (senza bloccare l'UI)
     * Utile per precaricamento preventivo
     * @param {Array<string>} nomiModuli - Array di nomi moduli da precaricare
     */
    async precarica(nomiModuli = []) {
        // Precarichiamo i moduli frequenti se non specificati
        const moduli_frequenti = ['turni', 'rotazioni', 'orari', 'statistiche'];
        const daPrecaricare = nomiModuli.length > 0 ? nomiModuli : moduli_frequenti;
        
        console.log(`⏳ Precario ${daPrecaricare.length} moduli in background...`);
        
        // Usa requestIdleCallback se disponibile, altrimenti setTimeout
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                daPrecaricare.forEach(nome => {
                    this.caricaModulo(nome).catch(e => console.warn(`Errore precario ${nome}:`, e));
                });
            }, { timeout: 3000 });
        } else {
            setTimeout(() => {
                daPrecaricare.forEach(nome => {
                    this.caricaModulo(nome).catch(e => console.warn(`Errore precario ${nome}:`, e));
                });
            }, 2000);
        }
    },
    
    /**
     * Svuota la cache (utile per forza il ricaricamento di moduli)
     */
    svuotaCache() {
        this.cache.clear();
        console.log('✓ Cache svuotata');
    },
    
    /**
     * Mostra statistiche di caricamento
     */
    mostraStatistiche() {
        console.log('📊 Statistiche Lazy Loading:');
        console.log(`   Moduli in cache: ${this.cache.size}`);
        this.cache.forEach((val, key) => console.log(`   - ${key}`));
    }
};

export { ModuliLazyLoader };
