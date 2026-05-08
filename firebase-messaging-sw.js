importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4",
  authDomain: "utility-haze.firebaseapp.com",
  projectId: "utility-haze",
  storageBucket: "utility-haze.firebasestorage.app",
  messagingSenderId: "686237947418",
  appId: "1:686237947418:web:f03ba19ab8fff43110a3a3"
});

const messaging = firebase.messaging();

// Gestisce i messaggi in background quando l'app web è chiusa o in un'altra scheda
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Notifica in background ricevuta', payload);
  
  const notificationTitle = payload.notification?.title || 'Nuova Notifica';
  const notificationOptions = {
    body: payload.notification?.body || 'Hai un nuovo aggiornamento in Utility.',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
