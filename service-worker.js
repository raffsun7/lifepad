// service-worker.js --- FINAL ROBUST VERSION FOR OFFLINE

// By changing the version, we ensure the browser installs the new service worker.
const CACHE_NAME = 'lifepad-cache-v3';

// A complete list of all the essential files that make up the "app shell".
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
  'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js',
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
        
        // Make caching of external resources more robust by not using addAll for them
        const coreAppShell = URLS_TO_CACHE.filter(url => url.startsWith('/'));
        const externalResources = URLS_TO_CACHE.filter(url => !url.startsWith('/'));
        
        externalResources.forEach(url => {
            cache.add(url).catch(err => console.warn(`Failed to cache external resource: ${url}`));
        });

        return cache.addAll(coreAppShell);
      })
      .then(() => self.skipWaiting()) // Force the new service worker to activate
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
    }).then(() => self.clients.claim()) // Take control of all open clients
  );
});

// --- Fetch Event: Serves app from cache when offline (Robust SPA Version) ---
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Try to get the response from the cache
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. If not in cache, try to fetch from the network
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // 3. If the network fails (offline) and it's a page navigation...
        if (event.request.mode === 'navigate') {
          // ...serve the main index.html file from the cache.
          return await cache.match('/index.html');
        }
        return null;
      }
    })
  );
});


// --- Notification Logic ---
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