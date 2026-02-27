const CACHE_NAME = 'axeluga-v1';

// Pre-cache core files on install
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll([
            './',
            './index.html',
            './manifest.json',
            './icon-192.png',
            './icon-512.png',
            './js/main.js',
            './js/game.js',
            './js/config.js',
            './js/audio.js',
            './js/input.js',
            './js/background.js',
        ])).then(() => self.skipWaiting())
    );
});

// Clean old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Cache-first for assets, network-first for HTML
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Skip non-GET
    if (e.request.method !== 'GET') return;

    // Network-first for HTML (so updates work)
    if (e.request.destination === 'document') {
        e.respondWith(
            fetch(e.request).then(resp => {
                const clone = resp.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                return resp;
            }).catch(() => caches.match(e.request))
        );
        return;
    }

    // Cache-first for everything else (assets, JS, audio)
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(resp => {
                // Cache successful responses
                if (resp.ok && url.origin === location.origin) {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                }
                return resp;
            });
        })
    );
});
