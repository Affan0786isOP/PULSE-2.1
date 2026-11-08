const CACHE_NAME = 'pulse-pwa-v4';
const FONT_CACHE_NAME = 'pulse-fonts-v1';

// Build-injected precache manifest for entry and key assessment route assets
/* __BUILD_INJECT_ASSETS_START__ */
const BUILD_ENTRY_ASSETS = [];
const BUILD_KEY_ROUTE_ASSETS = [];
/* __BUILD_INJECT_ASSETS_END__ */

// Essential core application shell required for offline presentation (fast and reliable)
const CORE_SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  ...BUILD_ENTRY_ASSETS
];

// Key assessment routes and core iconography (failure will not abort SW install)
const OPTIONAL_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  ...BUILD_KEY_ROUTE_ASSETS
];

// Queries open window clients directly for live session state via MessageChannel
async function checkAnyClientHasActiveSession() {
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clientsList.length === 0) return { hasActive: false, confirmedActive: false, hasTimeout: false };

  let timedOutCount = 0;
  let confirmedActiveCount = 0;

  const checks = clientsList.map((client) => {
    let isAnswered = false;
    return new Promise((resolve) => {
      try {
        const channel = new MessageChannel();
        const timer = setTimeout(() => resolve(true), 1500);
        channel.port1.onmessage = (event) => {
          isAnswered = true;
          clearTimeout(timer);
          const isActive = Boolean(event.data && event.data.isSessionActive);
          if (isActive) confirmedActiveCount++;
          resolve(isActive);
        };
        client.postMessage({ type: 'QUERY_PULSE_SESSION_ACTIVE' }, [channel.port2]);
      } catch {
        resolve(true);
      }
    }).then((val) => {
      if (!isAnswered && val === true) {
        timedOutCount++;
      }
      return val;
    });
  });

  const results = await Promise.all(checks);
  return {
    hasActive: results.some(Boolean),
    confirmedActive: confirmedActiveCount > 0,
    hasTimeout: timedOutCount > 0,
  };
}

// Queries IndexedDB for any unexpired durable session lease
async function hasActiveIndexedDbLease() {
  if (typeof indexedDB === 'undefined') return false;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('pulse_sw_gate', 1);
      req.onerror = () => resolve(false);
      req.onupgradeneeded = () => {
        try {
          if (!req.result.objectStoreNames.contains('session_locks')) {
            req.result.createObjectStore('session_locks', { keyPath: 'clientId' });
          }
        } catch {}
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains('session_locks')) {
            db.close();
            resolve(false);
            return;
          }
          const tx = db.transaction('session_locks', 'readonly');
          const store = tx.objectStore('session_locks');
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            const records = getAllReq.result || [];
            const now = Date.now();
            const activeLease = records.some((r) => r && r.leaseExpires && r.leaseExpires > now);
            db.close();
            resolve(activeLease);
          };
          getAllReq.onerror = () => {
            db.close();
            resolve(false);
          };
        } catch {
          resolve(false);
        }
      };
    } catch {
      resolve(false);
    }
  });
}

let skipWaitingRetryTimer = null;
let skipWaitingRetryCount = 0;
const MAX_SKIP_WAITING_RETRIES = 3;
const RETRY_INTERVAL_MS = 2000;

function scheduleSkipWaitingRetry() {
  if (skipWaitingRetryTimer) return;
  if (skipWaitingRetryCount >= MAX_SKIP_WAITING_RETRIES) return;

  skipWaitingRetryTimer = setTimeout(async () => {
    skipWaitingRetryTimer = null;
    skipWaitingRetryCount++;
    await trySkipWaiting();
  }, RETRY_INTERVAL_MS);
}

async function trySkipWaiting() {
  const sessionCheck = await checkAnyClientHasActiveSession();

  // If a client explicitly confirmed an active assessment, never skip waiting
  if (sessionCheck.confirmedActive) {
    return false;
  }

  // Always check durable IndexedDB lease
  const hasLease = await hasActiveIndexedDbLease();
  if (hasLease) {
    return false;
  }

  // Distinguish timeout from confirmed active session:
  // If clients timed out without confirming an active session, fail closed initially
  // and schedule an automatic bounded retry so an unresponsive or suspended client
  // cannot indefinitely block updates once the lease has expired.
  if (sessionCheck.hasTimeout && !sessionCheck.confirmedActive) {
    if (skipWaitingRetryCount < MAX_SKIP_WAITING_RETRIES) {
      scheduleSkipWaitingRetry();
      return false;
    }
    // Bounded retries exhausted; re-verify durable lease before proceeding
    const finalLease = await hasActiveIndexedDbLease();
    if (finalLease) return false;
  } else if (sessionCheck.hasActive) {
    return false;
  }

  if (skipWaitingRetryTimer) {
    clearTimeout(skipWaitingRetryTimer);
    skipWaitingRetryTimer = null;
  }

  await self.skipWaiting();
  return true;
}

self.addEventListener('message', async (event) => {
  if (event.data && (event.data.type === 'PULSE_SESSIONS_COMPLETED' || event.data.type === 'PULSE_CLIENT_IDLE')) {
    skipWaitingRetryCount = 0;
    await trySkipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Critical core shell assets must succeed for valid activation
      await cache.addAll(CORE_SHELL_ASSETS);

      // 2. Key assessment route assets are cached non-fatally to keep install resilient
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
      await trySkipWaiting();
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

  // Handle HTML document navigation requests (SPA offline fallback with 3s timeout)
  if (request.mode === 'navigate') {
    if (url.pathname === '/mobile' || url.pathname.startsWith('/mobile/')) {
      return;
    }

    event.respondWith(
      (async () => {
        let timerId;
        const timeoutPromise = new Promise((_, reject) => {
          timerId = setTimeout(() => reject(new Error('Navigation timeout')), 3000);
        });

        try {
          const networkResponse = await Promise.race([
            fetch(request).then((res) => {
              clearTimeout(timerId);
              if (res && res.status === 200) {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              }
              return res;
            }),
            timeoutPromise
          ]);
          return networkResponse;
        } catch {
          clearTimeout(timerId);
          const fallback = (await caches.match('/')) || (await caches.match(request));
          if (fallback) return fallback;
          return fetch(request);
        }
      })()
    );
    return;
  }

  // Only cache same-origin static assets (scripts, styles, images, fonts, manifests, media)
  const isStaticAsset = (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.svg' ||
    /\.(?:js|css|svg|png|jpg|jpeg|webp|gif|ico|woff|woff2|json|riv|mp3|wav|ogg|webm|mp4)$/i.test(url.pathname)
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
