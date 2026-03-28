importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBWrN5ZTBeLxaAJWVzPwbo1sY94VwrpULg",
  authDomain: "bloodlink-0.firebaseapp.com",
  projectId: "bloodlink-0",
  storageBucket: "bloodlink-0.firebasestorage.app",
  messagingSenderId: "67974725857",
  appId: "1:67974725857:web:2908f3703758daec0637a0"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'Urgent Blood Needed';
    const notificationOptions = {
      body: payload.notification?.body || 'A donor near you needs blood urgently.',
      icon: '/logo.png', // Push notification icon
      badge: '/logo.png',
      data: payload.data
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch(e) {
  console.log('Firebase messaging SW error:', e);
}
