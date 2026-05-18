// Service Worker - Spesa Migross
const CACHE_NAME = 'migross-v32';
const APP_SHELL = [
  './',
  './index.html',
  './icon.png'
];

// Install: precache dell'app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: rimuovi le cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigazioni e HTML: stale-while-revalidate (avvio istantaneo, aggiorna in background)
  if (req.mode === 'navigate' || (sameOrigin && url.pathname.endsWith('.html'))) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Statici same-origin (icona, ecc.): cache-first
  if (sameOrigin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Cross-origin (es. Google Fonts): rete con fallback cache
  event.respondWith(
    fetch(req)
      .then(res => putInCache(req, res))
      .catch(() => caches.match(req))
  );
});

function putInCache(req, res) {
  if (res && res.status === 200) {
    const clone = res.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
  }
  return res;
}

function cacheFirst(req) {
  return caches.match(req).then(cached =>
    cached || fetch(req).then(res => putInCache(req, res))
  );
}

function staleWhileRevalidate(req) {
  return caches.open(CACHE_NAME).then(cache =>
    cache.match(req).then(cached => {
      const network = fetch(req)
        .then(res => putInCache(req, res))
        .catch(() => cached || caches.match('./index.html'));
      return cached || network;
    })
  );
}
