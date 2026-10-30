// Service worker: caches the whole game so it runs with no internet.
// Bump VERSION whenever you change any file so players get the update.
const VERSION = 'bbb-v1.1.1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/main.js', './js/game.js', './js/ui.js', './js/render.js', './js/data.js', './js/audio.js', './js/save.js',
  './assets/fonts/lilita.woff2', './assets/fonts/nunito.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Cache-first, falling back to network (and caching what it fetches).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
