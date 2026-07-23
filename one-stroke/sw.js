const CACHE_NAME = "one-stroke-v20";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./src/main.js",
  "./src/data/campaign.js",
  "./src/game/app.js",
  "./src/game/challenge-pool.js",
  "./src/game/formatting.js",
  "./src/game/share-image.js",
  "./src/game/storage.js",
  "./src/game/trophies.js",
  "./src/core/grid.js",
  "./src/core/level-integrity.js",
  "./src/core/match.js",
  "./src/core/plausibility.js",
  "./src/core/rng.js",
  "./src/data/campaign-levels.js",
  "./src/data/difficulty.js",
  "./src/data/tutorial-levels.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./assets/sprites/atlas.png",
  "./assets/sprites/atlas.json",
];

// Install: precache all core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(PRECACHE_URLS.map(async (url) => {
        const request = new Request(url, { cache: "reload" });
        const response = await fetch(request);
        if (!response.ok) throw new Error(`Precache failed: ${url}`);
        await cache.put(url, response);
      }))
    )
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for precached assets, network-first for everything else
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cache hit, but update in background
        const freshRequest = new Request(event.request, { cache: "no-cache" });
        const fetchPromise = fetch(freshRequest).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => {});
        return cached;
      }

      // Not in cache — fetch from network, cache the result
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
