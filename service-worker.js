// service-worker.js --- UPDATED FOR FULL OFFLINE SUPPORT

const CACHE_NAME = 'lifepad-cache-v1';

// A list of all the essential files that make up the "app shell".
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/firebase-config.js',
  '/js/main.js',
  '/js/ui.js',
  '/js/auth.js',
  '/js/challenge.js',
  '/js/focus.js',
  '/js/mood.js',
  '/js/notes.js',
  '/js/planner.js',
  '/js/theme.js',
  '/files/logo-192.png',
  '/files/logo-512.png',
  '/files/default-avatar.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.quilljs.com/1.3.6/quill.snow.css',
  'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-functions-compat.js',
  'https://cdn.quilljs.com/1.3.6/quill.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js'
];

// --- Install Event: Caches the app shell ---
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// --- Activate Event: Cleans up old caches ---
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// --- Fetch Event: Serves app from cache when offline ---
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the request is in the cache, return it.
        if (response) {
          return response;
        }
        // Otherwise, try to fetch it from the network.
        return fetch(event.request);
      }
    )
  );
});


// --- Notification Logic (remains the same) ---
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: 'files/logo-192.png',
        badge: 'files/logo-192.png'
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});