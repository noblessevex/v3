// Scripts for Firebase Cloud Messaging in Web Worker
// Gives the service worker access to Firebase Messaging.
// Note: In development or production, Firebase scripts provide background push handling.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing at least the projectId & messagingSenderId.
// These are also passed dynamically if cached, or defaults to self-registration.
const firebaseConfig = {
  apiKey: "placeholder",
  authDomain: "placeholder",
  projectId: "placeholder",
  storageBucket: "placeholder",
  messagingSenderId: "placeholder",
  appId: "placeholder"
};

try {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Mohamed Mimouni Music Studio';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'New update from your music studio.',
      icon: '/hero-piano.jpg',
      badge: '/hero-piano.jpg',
      data: {
        url: payload.data?.link || '/'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log('[firebase-messaging-sw.js] Background messaging init skipped:', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
