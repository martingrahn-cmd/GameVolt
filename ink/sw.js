// INK service worker.
//
// The document is network-first: a new deploy is picked up on the next load as
// long as the player is online, so shipping an update means pushing and nothing
// else. The cache is only the offline copy. Static assets are cache-first and
// keyed to VERSION — bump it when an asset under assets/ changes.
const VERSION = 'v3';
const CACHE = 'ink-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('ink-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// The page asks for the waiting worker only when the player taps Update, so a
// new version never takes over in the middle of a run.
self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The game itself: network first, and keep the response as the offline copy.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const hit = await (await caches.open(CACHE)).match('./index.html', { ignoreSearch: true });
        return hit || Response.error();
      }
    })());
    return;
  }

  if (url.origin === self.location.origin && !url.pathname.startsWith(new URL('./', self.location.href).pathname)) return;

  // Icons and fonts: cache first, filled in behind the player.
  e.respondWith((async () => {
    const hit = await (await caches.open(CACHE)).match(req, { ignoreVary: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      const sameOrigin = url.origin === self.location.origin;
      const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
      if ((res.ok || res.type === 'opaque') && (sameOrigin || fonts)) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return Response.error();
    }
  })());
});
