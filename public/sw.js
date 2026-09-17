const CACHE_NAME = 'pulse-pwa-v2';

// Essential core application shell required for offline presentation
const CORE_SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg'
];

// Optional iconography assets (failure will not abort SW install)
const OPTIONAL_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Critical core shell assets must succeed for valid activation
      await cache.addAll(CORE_SHELL_ASSETS);

      // 2. Secondary assets are cached gracefully without aborting
      await Promise.allSettled(
        OPTIONAL_ASSETS.map((asset) =>
          fetch(asset, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) return cache.put(asset, res);
            })
            .catch((err) => {
              console.warn('[SW] Optional asset caching skipped:', asset, err);
            })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET, non-HTTP, and backend API endpoints
  if (request.method !== 'GET' || !request.url.startsWith('http') || request.url.includes('/api/')) {
    return;
  }

  // Handle HTML document navigation requests (SPA offline fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const isMobile = request.url.includes('/mobile');
          const fallback = await caches.match(isMobile ? '/mobile/' : '/');
          if (fallback) return fallback;
          return caches.match('/');
        })
    );
    return;
  }

  // Stale-while-revalidate for static scripts, styles, and media
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
