// Minimal service worker: makes the app installable and keeps the last
// visited pages available offline. Only same-origin GET requests are handled;
// Supabase calls (other origin) always go straight to the network.

const CACHE = "o-mega-v1";
// Scope path, e.g. "/o-mega/" on GitHub Pages or "/" locally.
const SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SCOPE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Hashed build assets never change: serve from cache when present.
  if (url.pathname.startsWith(`${SCOPE}_next/static/`)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetchAndCache(request)),
    );
    return;
  }

  // Pages and everything else: network first, cache as offline fallback.
  event.respondWith(
    fetchAndCache(request).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const shell = await caches.match(SCOPE);
        if (shell) return shell;
      }
      return Response.error();
    }),
  );
});

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}
