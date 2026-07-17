// DR.Care mobile-app Service Worker
// Runtime (stale-while-revalidate) caching instead of a static precache list —
// Vite content-hashes build filenames per build, so a hardcoded asset list would
// go stale on every deploy. API calls and cross-origin requests pass straight through.
const CACHE_NAME = 'drcare-app-v2';
const SCOPE_PATH = '/app/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never cache live API responses
  if (!url.pathname.startsWith(SCOPE_PATH)) return;

  // Navigations (the app shell HTML) go network-first: a stale cached index.html
  // keeps referencing OLD hashed JS/CSS bundle filenames after every deploy, which
  // is exactly what silently pinned old app code in place after the last two fixes.
  // Cache is only a fallback for genuinely offline visits.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(SCOPE_PATH)))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
