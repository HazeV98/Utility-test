// Importa gli script di Firebase (versione compatibile per i Service Worker)
importScripts("https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js");

// Inizializza l'app Firebase con le tue credenziali
firebase.initializeApp({
  apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4",
  authDomain: "utility-haze.firebaseapp.com",
  projectId: "utility-haze",
  storageBucket: "utility-haze.firebasestorage.app",
  messagingSenderId: "686237947418",
  appId: "1:686237947418:web:f03ba19ab8fff43110a3a3"
});

// Avvia il servizio di messaggistica in background
const messaging = firebase.messaging();

// Opzionale: gestisce la ricezione dei messaggi quando l'app è in background
messaging.onBackgroundMessage((payload) => {
  console.log("Messaggio ricevuto in background: ", payload);
  const notificationTitle = payload.notification.title || "Nuova Notifica Utility";
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-512.png" // Assicurati che l'icona esista in questa posizione
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
