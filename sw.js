const CACHE = 'hustle-family-sunny-v24-2026-09-28';
const CORE = [
  './',
  './index.html',
  './data.js',
  './training-plan.js',
  './training-engine.js',
  './manifest.webmanifest',
  './firebase-config.js',
  './firebase-sync.js',
  './meal-breakfast-fri.webp',
  './meal-breakfast-mon.webp',
  './meal-breakfast-sat.webp',
  './meal-breakfast-sun.webp',
  './meal-breakfast-thu.webp',
  './meal-breakfast-tue.webp',
  './meal-breakfast-wed.webp',
  './meal-dinner-fri.webp',
  './meal-dinner-mon.webp',
  './meal-dinner-sat.webp',
  './meal-dinner-sun.webp',
  './meal-dinner-thu.webp',
  './meal-dinner-tue.webp',
  './meal-dinner-wed.webp',
  './meal-snack-banana-tortilla.webp',
  './meal-snack-cheese-sandwich.webp',
  './meal-snack-chicken-bites.webp',
  './meal-snack-fruit-nuts.webp',
  './meal-snack-tortilla-egg.webp',
  './workout-sunday.webp',
  './workout-monday.webp',
  './workout-wednesday.webp',
  './workout-friday.webp',
  './bent-knee-hollow-hold.webp',
  './bird-dog.webp',
  './cable-triceps-pushdown.webp',
  './calf-raise.webp',
  './chest-supported-row.webp',
  './dead-bug.webp',
  './dumbbell-bench-press.webp',
  './dumbbell-biceps-curl.webp',
  './dumbbell-lateral-raise.webp',
  './dumbbell-romanian-deadlift.webp',
  './face-pull.webp',
  './goblet-squat.webp',
  './heel-taps.webp',
  './hip-thrust.webp',
  './incline-dumbbell-press.webp',
  './lat-pulldown.webp',
  './leg-curl-machine.webp',
  './leg-press.webp',
  './low-cable-biceps-curl.webp',
  './mcgill-curl-up.webp',
  './pec-deck-fly.webp',
  './plank-shoulder-tap.webp',
  './plank.webp',
  './reverse-crunch.webp',
  './reverse-dumbbell-lunge.webp',
  './rope-triceps-extension.webp',
  './seated-cable-row.webp',
  './seated-shoulder-press.webp',
  './side-plank.webp',
  './app-icon.svg',
  './app-icon-192.png',
  './app-icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const request = event.request;
  const path = new URL(request.url).pathname;
  const isPage = request.mode === 'navigate' || path.endsWith('/index.html');
  const isCode = /\.(js|json|css|webmanifest)$/.test(path);

  if (isPage || isCode) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(isPage ? './index.html' : request, copy));
          return response;
        })
        .catch(() => caches.match(isPage ? './index.html' : request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    }))
  );
});
