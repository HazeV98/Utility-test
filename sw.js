const CACHE_NAME = 'utility-app-v17';

// Elenco completo dei file dell'app basato su mappa_file.json
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './calendario.html',
    './vademecum.html',
    './manifest.json',
    './moduli/admin.js',
    './moduli/auth.js',
    './moduli/bacheca.js',
    './moduli/bacheca_turni.js',
    './moduli/bacheca_utility.js',
    './moduli/barcadvisor.js',
    './moduli/buoni_pasto.js',
    './moduli/calendario.js',
    './moduli/contatti.js',
    './moduli/dashboard.js',
    './moduli/dds.js',
    './moduli/documenti.js',
    './moduli/gps.js',
    './moduli/guida.js',
    './moduli/index.js',
    './moduli/link.js',
    './moduli/menu.js',
    './moduli/orari.js',
    './moduli/promemoria.js',
    './moduli/report.js',
    './moduli/rotazione_ferie.js',
    './moduli/rotazioni.js',
    './moduli/rubrica.js',
    './moduli/statistiche.js',
    './moduli/turni.js',
    './moduli/ui_admin.js',
    './moduli/ui_bacheca_turni.js',
    './moduli/ui_bacheca_utility.js',
    './moduli/ui_barcadvisor.js',
    './moduli/ui_buoni_pasto.js',
    './moduli/ui_contatti.js',
    './moduli/ui_dds.js',
    './moduli/ui_documenti.js',
    './moduli/ui_guida.js',
    './moduli/ui_link.js',
    './moduli/ui_orari.js',
    './moduli/ui_promemoria.js',
    './moduli/ui_report.js',
    './moduli/ui_rotazione_ferie.js',
    './moduli/ui_rotazioni.js',
    './moduli/ui_rubrica.js',
    './moduli/ui_statistiche.js',
    './moduli/ui_turni.js',
    './moduli/vademecum.js',
    './moduli/varianti.js',
    './moduli/varianti_admin.js',
    './moduli/vd_mappa.js',
    './moduli/vd_planimetria.js',
    './moduli/vd_scheda.js'
];

self.addEventListener('install', (event) => {
    console.log(`[Service Worker] Installazione ${CACHE_NAME}`);
    // Forza l'attivazione immediata del service worker
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-caching file dell\'app');
            return cache.addAll(PRECACHE_ASSETS).catch(err => {
                console.warn('[Service Worker] Errore durante il pre-cache di alcuni asset:', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log(`[Service Worker] Attivato ${CACHE_NAME}`);
    
    event.waitUntil(
        Promise.all([
            // Prende il controllo di tutte le schede aperte
            self.clients.claim(),
            // Elimina tutte le cache precedenti per forzare l'aggiornamento
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Eliminazione vecchia cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    // IMPORTANTE: Ignora le richieste verso Firebase per non bloccare upload e database
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebasestorage.googleapis.com')) {
        return; 
    }

    // Se non è una richiesta GET, lasciala passare normalmente
    if (event.request.method !== 'GET') return;

    // Strategia: Network First con fallback in Cache
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Se la chiamata alla rete ha successo, salva una copia aggiornata nella Cache
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Se la rete fallisce (es. dispositivo offline), recupera il file dalla cache
                return caches.match(event.request);
            })
    );
});
