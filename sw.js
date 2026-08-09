/* Жарава v2 · Service Worker — първо мрежа (винаги пресни файлове), кеш само офлайн */
const CACHE = "zharava-v45";
const ASSETS = [
  "./", "./index.html", "./style.css", "./app.js",
  "./data-2026-07.js", "./data-2026-08.js", "./data-2026-09.js",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./logo-mark.png", "./manifest.webmanifest",
  "./assets/meals/chicken-grain.webp",
  "./assets/meals/chicken-gyros.webp",
  "./assets/meals/chicken-lemon-potatoes.webp",
  "./assets/meals/chicken-peppers-rice.webp",
  "./assets/meals/chicken-potatoes-zucchini.webp",
  "./assets/meals/chicken-rice-box.webp",
  "./assets/meals/chicken-stew-greenbeans.webp",
  "./assets/meals/chicken-stew-potatoes.webp",
  "./assets/meals/chicken-stew.webp",
  "./assets/meals/corn-turkey-eggs.webp",
  "./assets/meals/cottage-honey-banana.webp",
  "./assets/meals/figs-pb-eggs.webp",
  "./assets/meals/fruit-nuts.webp",
  "./assets/meals/grapes-walnuts-turkey.webp",
  "./assets/meals/ham-cheese-sandwich.webp",
  "./assets/meals/lentils-chicken-box.webp",
  "./assets/meals/meatballs-mash-salad.webp",
  "./assets/meals/meatballs-peppers-potatoes.webp",
  "./assets/meals/meatballs-potatoes.webp",
  "./assets/meals/meatballs-rice-salad.webp",
  "./assets/meals/meatballs-roasted-veg.webp",
  "./assets/meals/melon-almonds-chicken.webp",
  "./assets/meals/milk-smoothie-raspberry.webp",
  "./assets/meals/moussaka.webp",
  "./assets/meals/oats-banana-eggs.webp",
  "./assets/meals/oats-fruit.webp",
  "./assets/meals/omelette-avocado.webp",
  "./assets/meals/omelette-peppers-bread.webp",
  "./assets/meals/pancakes-cottage-grapes.webp",
  "./assets/meals/pasta-tuna.webp",
  "./assets/meals/pb-banana-toast-eggs.webp",
  "./assets/meals/pita-tuna-grapes.webp",
  "./assets/meals/pork-bulgur-box.webp",
  "./assets/meals/pork-bulgur-veg.webp",
  "./assets/meals/pork-grill-kyopolou.webp",
  "./assets/meals/shakshuka.webp",
  "./assets/meals/stuffed-peppers.webp",
  "./assets/meals/toast-eggs-avocado.webp",
  "./assets/meals/tortilla-plums.webp",
  "./assets/meals/tuna-bean-salad-pita.webp",
  "./assets/meals/tuna-beans-salad.webp",
  "./assets/meals/tuna-pita-grapes.webp",
  "./assets/meals/tuna-salad.webp",
  "./assets/meals/turkey-sandwich-grapes.webp",
  "./assets/meals/watermelon-almonds-eggs.webp",
  "./assets/meals/yogurt-fruit.webp",
  "./assets/workouts/fullbody.webp",
  "./assets/workouts/legs-core.webp",
  "./assets/workouts/pull.webp",
  "./assets/workouts/push.webp",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
/* Network-first: винаги пробваме мрежата (с revalidate, за да прескочим HTTP кеша),
   пазим свежо копие и падаме на кеша само когато няма мрежа. Така новите версии
   се виждат веднага след публикуване, без да зависим от стар кеш. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  const req = sameOrigin ? new Request(e.request, { cache: "no-cache" }) : e.request;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && (sameOrigin || e.request.url.includes("fonts.") || e.request.url.includes("gstatic.com/firebasejs"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
