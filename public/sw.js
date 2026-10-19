const CACHE_NAME = 'pulse-pwa-v4';
const FONT_CACHE_NAME = 'pulse-fonts-v1';

// Build-injected precache manifest for entry and secondary assets
/* __BUILD_INJECT_ASSETS_START__ */
const BUILD_ENTRY_ASSETS = [];
const BUILD_SECONDARY_ASSETS = [];
/* __BUILD_INJECT_ASSETS_END__ */

// Essential core application shell required for offline presentation (fast and reliable)
const CORE_SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  ...BUILD_ENTRY_ASSETS
];

// Optional iconography & secondary route assets (failure will not abort SW install)
const OPTIONAL_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  ...BUILD_SECONDARY_ASSETS
];

function isAssessmentClient(clientUrl) {
  if (!clientUrl) return false;
  return /pulse-session-active=1|reaction-test|visual-reaction|direction-test|direction|colour-recognition|color-recognition|color-test|block-memory|number-memory/.test(clientUrl);
}

// Queries open window clients directly for live session state via MessageChannel
async function checkAnyClientHasActiveSession() {
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clientsList.length === 0) return false;

  for (const client of clientsList) {
    if (client.url && isAssessmentClient(client.url)) {
      return true;
    }
  }

  const checks = clientsList.map((client) => {
    return new Promise((resolve) => {
      try {
        const channel = new MessageChannel();
        const timer = setTimeout(() => resolve(false), 200);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          resolve(Boolean(event.data && event.data.isSessionActive));
        };
        client.postMessage({ type: 'QUERY_PULSE_SESSION_ACTIVE' }, [channel.port2]);
      } catch {
        resolve(false);
      }
    });
  });

  const results = await Promise.all(checks);
  return results.some(Boolean);
}

self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'PULSE_SESSIONS_COMPLETED') {
    const hasActiveSession = await checkAnyClientHasActiveSession();
    if (!hasActiveSession) {
      await self.skipWaiting();
    }
  }
});

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
      const hasActiveSession = await checkAnyClientHasActiveSession();
      if (!hasActiveSession) {
        await self.skipWaiting();
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('pulse-pwa-') && !key.startsWith('pulse-mobile-pwa-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      // Purge obsolete hashed assets from active cache if build assets were injected
      const allKnownAssets = [...CORE_SHELL_ASSETS, ...OPTIONAL_ASSETS];
      if (allKnownAssets.length > 0) {
        const currentCache = await caches.open(CACHE_NAME);
        const cachedRequests = await currentCache.keys();
        const validPaths = new Set(allKnownAssets);
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
