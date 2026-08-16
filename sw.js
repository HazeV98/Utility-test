const CACHE_NAME = 'utility-app-v5';

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installato v5');
    // Forza l'attivazione immediata del service worker
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Attivato v5');
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // IMPORTANTE: Ignora le richieste verso Firebase per non bloccare upload e database
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebasestorage.googleapis.com')) {
        return; 
    }

    // Lascia passare tutte le altre richieste normalmente alla rete
    event.respondWith(fetch(event.request));
});
 
