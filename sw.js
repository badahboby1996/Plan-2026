/* ХЪСЪЛ · service worker */
const VERSION = 'hustle-v2-2026-08-18-1';
const CORE = [
  './', './index.html', './styles.css', './data.js', './app.js',
  './manifest.webmanifest', './firebase-config.js', './firebase-sync.js',
  './workout-sunday.webp', './workout-monday.webp', './workout-wednesday.webp', './workout-friday.webp',
  './app-icon.svg', './app-icon-192.png', './app-icon-512.png', './app-icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // Firebase и шрифтове минават директно

  const isPage = request.mode === 'navigate';

  // Страницата и логиката: мрежата има приоритет, кешът е резервата.
  if (isPage || /\.(?:js|css|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(isPage ? './index.html' : request, copy));
          return response;
        })
        .catch(() => caches.match(isPage ? './index.html' : request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Снимки и икони: кешът има приоритет.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(VERSION).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => cached))
  );
});
