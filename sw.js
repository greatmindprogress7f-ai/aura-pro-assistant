const CACHE_NAME = 'aura-pro-v2-cache-v17';
const CORE_ASSETS = [
  './',
  './index.html',
  './config.js',
  './orb.webp',
  './orb.png',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './favicon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests or external Google API calls
  if (req.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // Network-First for HTML documents (index.html) so updates apply immediately!
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(req).then(cached => cached || caches.match('./index.html'));
      })
    );
    return;
  }

  // Cache-First with background revalidation for static assets (images, icons)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        fetch(req).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(req, networkResponse));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkResponse;
      });
    })
  );
});
