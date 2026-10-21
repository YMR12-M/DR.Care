// DR.Care Service Worker v2.3
const CACHE_NAME = 'drcare-v10';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/mobile.html',
  '/assets/css/styles.css',
  '/assets/css/brand.css',
  '/assets/css/home.css',
  '/assets/css/mobile.css',
  '/assets/js/script.js',
  '/assets/js/brand.js',
  '/assets/js/mobile.js',
  '/assets/js/idb.js',
  '/admin.html',
  '/assets/js/admin.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/img/brand/sprite.svg',
  'https://fonts.googleapis.com/css2?family=Lalezar&family=Handjet:ELGR,ELSH,wght@1,2,600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap'
];

// IndexedDB helper (worker context)
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('drcare-sync', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllOutbox() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readonly');
    const store = tx.objectStore('outbox');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteOutbox(id) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http') || url.includes('fonts')));
    }).then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network first, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ ok: false, message: 'لا يوجد اتصال بالإنترنت.' }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        })
      )
    );
    return;
  }

  // Page navigations (index.html/mobile.html/admin.html/...): network-first.
  // These carry the mobile-vs-desktop redirect logic itself, so serving a
  // stale cached copy after a deploy means visitors keep landing on old
  // routing forever — cache is only a fallback for genuinely offline visits.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Google Fonts: cache first
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return resp;
        })
      )
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return resp;
      });
      return cached || fetchPromise;
    })
  );
});

// Background sync for offline bookings
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncOfflineBookings());
  }
});

async function syncOfflineBookings() {
  try {
    // Fetch CSRF token using session cookie (credentials: 'include' for SW context)
    let csrfToken = '';
    try {
      const csrfResp = await fetch('/api/csrf.php', { credentials: 'include' });
      const csrfData = await csrfResp.json();
      csrfToken = csrfData.token || '';
    } catch (e) { /* will be rejected server-side without token */ }

    if (!csrfToken) return; // session likely expired — wait for next user interaction

    const items = await getAllOutbox();
    for (const item of items) {
      try {
        const resp = await fetch('/api/bookings.php', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify(item.payload)
        });
        if (resp && resp.ok) {
          await deleteOutbox(item.id);
        }
      } catch (e) {
        // keep item for next sync
      }
    }
    const clients = await self.clients.matchAll();
    clients.forEach((client) => client.postMessage({ type: 'SYNC_COMPLETE' }));
  } catch (e) {
    console.warn('[SW] sync failed', e);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'DR.Care', {
      body: data.body || 'لديك إشعار جديد',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: 'drcare-notification',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  );
});
