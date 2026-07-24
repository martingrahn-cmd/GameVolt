const CACHE='hoverdash-v5';
const ASSETS=[
  './',
  './index.html',
  './favicon.svg',
  './apple-touch-icon.png',
  './Distant Cosmos.mp3',
  './boost_smash.mp3',
  './go.mp3',
  './wave_clear.mp3',
  './wave_start.mp3',
  './select_001.mp3',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>
      Promise.allSettled(ASSETS.map(url=>c.add(url).catch(err=>console.warn('Cache skip:',url,err))))
    ).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;

  // HTML must prefer the network so players are not pinned to an old release.
  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request).then(async response=>{
        if(response.ok){
          const copy=response.clone();
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',copy);
        }
        return response;
      }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  // Static assets load instantly from cache and refresh in the background.
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const fresh=fetch(e.request).then(async response=>{
        if(response&&(response.ok||response.type==='opaque')){
          const copy=response.clone();
          const cache=await caches.open(CACHE);
          await cache.put(e.request,copy);
        }
        return response;
      }).catch(()=>cached);
      return cached||fresh;
    })
  );
});
