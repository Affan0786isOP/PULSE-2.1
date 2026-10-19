const CACHE_NAME = 'pulse-pwa-v4';
const FONT_CACHE_NAME = 'pulse-fonts-v1';

// Build-injected precache manifest for hashed entry assets
/* __BUILD_INJECT_ASSETS_START__ */
const BUILD_ASSETS = [];
/* __BUILD_INJECT_ASSETS_END__ */

// Essential core application shell required for offline presentation
const CORE_SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  ...BUILD_ASSETS
];

// Optional iconography assets (failure will not abort SW install)
const OPTIONAL_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Session continuity tracking
let activeSessionCount = 0;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PULSE_SESSION_START') {
    activeSessionCount++;
  } else if (event.data && event.data.type === 'PULSE_SESSION_END') {
    activeSessionCount = Math.max(0, activeSessionCount - 1);
  }
});

function isAssessmentClient(clientUrl) {
  if (!clientUrl) return false;
  return /pulse-session-active=1|reaction-test|visual-reaction|direction-test|direction|colour-recognition|color-recognition|color-test|block-memory|number-memory/.test(clientUrl);
}

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
    }).then(async () => {
      const clientsList = await self.clients.matchAll({ type: 'window' });
      const hasActiveSession = activeSessionCount > 0 || clientsList.some((c) => isAssessmentClient(c.url));
      if (!hasActiveSession) {
        await self.skipWaiting();
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Assessment Continuity Invariant: Check if any client has an active assessment session
      const clientsList = await self.clients.matchAll({ type: 'window' });
      const hasActiveSession = activeSessionCount > 0 || clientsList.some((client) => {
        return client.url && (client.url.includes('pulse-session-active=1') || isAssessmentClient(client.url));
      });

      if (!hasActiveSession) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith('pulse-pwa-') && !key.startsWith('pulse-mobile-pwa-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );

        // Purge obsolete hashed assets from active cache if build assets were injected
        if (BUILD_ASSETS.length > 0) {
          const currentCache = await caches.open(CACHE_NAME);
          const cachedRequests = await currentCache.keys();
          const validPaths = new Set([...CORE_SHELL_ASSETS, ...OPTIONAL_ASSETS, ...BUILD_ASSETS]);
          await Promise.all(
            cachedRequests.map(async (req) => {
              const reqUrl = new URL(req.url);
              if (reqUrl.pathname.startsWith('/assets/') && !validPaths.has(reqUrl.pathname)) {
                await currentCache.delete(req);
              }
            })
          );
        }

        await self.clients.claim();
      }
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
        if (cached) {
          if (url.hostname === 'fonts.googleapis.com') {
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                fontCache.put(request, networkResponse.clone());
              }
            }).catch(() => {});
          }
          return cached;
        }
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

  // Cross-Origin Bypass (H3):
  // Any cross-origin request other than Google Fonts MUST NOT be intercepted or cached
  if (url.origin !== self.location.origin) {
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
          const fallback = await caches.match('/');
          if (fallback) return fallback;
          return caches.match(request);
        })
    );
    return;
  }

  // Only cache same-origin static assets (scripts, styles, images, fonts, manifests)
  const isStaticAsset = (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.svg' ||
    /\.(?:js|css|svg|png|jpg|jpeg|webp|ico|woff2|json)$/.test(url.pathname)
  );

  if (!isStaticAsset) {
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
            networkResponse.type === 'basic'
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
