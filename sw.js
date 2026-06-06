const CACHE_NAME = "kemi-fly-v9";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/styles.css",
  "./src/main.js",
  "./src/config.js",
  "./src/assets.js",
  "./src/audio.js",
  "./src/game-actions.js",
  "./src/game-rules.js",
  "./src/game-state.js",
  "./src/layout.js",
  "./src/progression.js",
  "./src/random.js",
  "./src/renderer.js",
  "./src/storage.js",
  "./src/text-state.js",
  "./src/world-renderer.js",
  "./assets/bgm-running-past-clouds.mp3",
  "./assets/lava-background.png",
  "./assets/kemi-lv1-frame-1.png",
  "./assets/kemi-lv2-frame-1.png",
  "./assets/kemi-lv3-frame-1.png",
  "./assets/kemi-lv4-frame-1.png",
  "./assets/kemi-lv5-frame-1.png",
  "./assets/kemi-lv6-frame-1.png",
  "./assets/item-heart.png",
  "./assets/item-energy-bolt.png",
  "./assets/item-magnet.png",
  "./assets/item-hourglass.png",
  "./assets/obstacle-boulder.png",
  "./assets/obstacle-thorn-ring.png",
  "./assets/obstacle-lava-ball.png",
  "./assets/obstacle-purple-storm.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}
