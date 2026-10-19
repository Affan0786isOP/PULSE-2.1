const CACHE_NAME = 'pulse-mobile-pwa-v4';
const FONT_CACHE_NAME = 'pulse-fonts-v1';

// Build-injected precache manifest for hashed entry assets
/* __BUILD_INJECT_ASSETS_START__ */
const BUILD_ASSETS = [];
/* __BUILD_INJECT_ASSETS_END__ */

// Essential core application shell required for offline presentation
const CORE_SHELL_ASSETS = [
  '/mobile/',
  '/mobile/manifest.webmanifest',
  '/mobile/favicon.svg',
  ...BUILD_ASSETS
];

// Optional iconography assets (failure will not abort SW install)
const OPTIONAL_ASSETS = [
  '/mobile/icon-192.png',
  '/mobile/icon-512.png',
  '/mobile/apple-touch-icon.png'
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
              console.warn('[SW-Mobile] Optional asset caching skipped:', asset, err);
            })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Assessment Continuity Invariant: Check if any client has an active assessment session
      const clientsList = await self.clients.matchAll({ type: 'window' });
      const hasActiveSession = clientsList.some((client) => {
        return client.url && client.url.includes('pulse-session-active=1');
      });

      if (!hasActiveSession) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith('pulse-mobile-pwa-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET, non-HTTP, and backend API endpoints (including URL-normalized routes)
  if (
    request.method !== 'GET' ||
    !request.url.startsWith('http') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/personal-best') ||
    url.pathname.startsWith('/research') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/sessions') ||
    url.pathname.startsWith('/health')
  ) {
    return;
  }

  // Google Fonts caching (stylesheets and webfont binaries)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (fontCache) => {
        const cached = await fontCache.match(request);
        if (cached) return cached;
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            fontCache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return cached || new Response('', { status: 408, statusText: 'Request timed out' });
        }
      })
    );
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
          const mobileMatch = await caches.match('/mobile/');
          if (mobileMatch) return mobileMatch;
          return caches.match(request);
        })
    );
    return;
  }

  // Stale-while-revalidate for static scripts, styles, and media
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
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
