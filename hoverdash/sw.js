const CACHE='hoverdash-v1';
const ASSETS=[
  '/','/index.html','/favicon.svg','/apple-touch-icon.png',
  '/Distant Cosmos.mp3','/boost_smash.mp3','/go.mp3','/wave_clear.mp3','/wave_start.mp3','/select_001.mp3'
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
