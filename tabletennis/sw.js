/* Table Tennis — offline service worker (same pattern as Vector Hexagon).
   Cache-first for the app shell so it launches and plays with no network.
   RELEASE CHECKLIST — bump together, every release:
     1. VERSION in index.html
     2. the ?v= on the script tags in index.html
     3. CACHE below AND the ?v= entries in ASSETS */
const CACHE = 'ttpwa-v0.30.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './tt-core.js?v=0.30.0',
  './tt-ai.js?v=0.30.0',
  './assets/hit.mp3?v=0.30.0',
  './assets/bounce.mp3?v=0.30.0',
  './assets/cheer.mp3?v=0.30.0',
  './assets/net.mp3?v=0.30.0',
  './assets/crowd.mp3?v=0.30.0',
  './assets/winfare.mp3?v=0.30.0',
  './assets/lose.mp3?v=0.30.0',
  './assets/matchpoint.mp3?v=0.30.0',
  './assets/opp-hans.png?v=0.30.0',
  './assets/opp-hummel.png?v=0.30.0',
  './assets/opp-chongli.png?v=0.30.0',
  './assets/opp-player.png?v=0.30.0',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // don't fail the whole install if one optional asset 404s
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))
    // NOTE: no skipWaiting here — the new worker waits so the page can show a
    // "new version available" prompt; it activates only when the user taps it.
  );
});

// the page asks us to activate immediately when the user taps "update"
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // cache same-origin successful responses for next time
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
