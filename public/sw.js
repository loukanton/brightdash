// Service worker voor offline lezen.
// Netwerk eerst, cache als reserve: de site blijft altijd vers,
// maar zonder verbinding krijg je het laatst geladen nieuws.
const CACHE = 'brightdash-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // De admin en analyses horen niet in de cache
  if (url.pathname.startsWith('/admin') || url.pathname === '/api/analyse') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const kopie = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, kopie));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
