// Service worker: makes the app installable, keeps the last visited pages
// available offline and keeps the art and the app's code on the device across
// visits and deploys. Only same-origin GET requests are handled; Supabase calls
// (other origin) always go straight to the network.

// These values are filled in at deploy time by scripts/stamp-sw.mjs.
// The commit the site was built from: each deploy gets its own shell cache.
const BUILD = "__BUILD_ID__";
// Content hash of every file under cards/, world/, fonts/ and models/.
const ASSET_VERSIONS = {} /* __ASSET_VERSIONS__ */;
// Every file of this build under _next/static/, as a path inside that folder.
const NEXT_FILES = [] /* __NEXT_FILES__ */;

const SHELL_CACHE = `o-mega-shell-${BUILD}`;
// Survives deploys and holds only the current version of each file.
const ASSET_CACHE = "o-mega-assets";
// The build's JS, CSS and fonts also survive deploys: their names carry a content hash,
// so a file a deploy did not change keeps its name and its saved copy.
const NEXT_CACHE = "o-mega-next";
// Scope path, e.g. "/o-mega/" on GitHub Pages or "/" locally.
const SCOPE = new URL(self.registration.scope).pathname;
const ASSET_DIRS = ["cards/", "world/", "fonts/", "models/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await (await caches.open(SHELL_CACHE)).add(SCOPE);
      // The splash image is a nicety: failing to fetch it must not block the install.
      const splash = new URL(`${SCOPE}world/citta.webp`, self.location.origin);
      const key = assetKey(splash);
      if (key && !(await caches.match(key))) await fetchAndCache(ASSET_CACHE, splash.href, key).catch(() => {});
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Shells of older deploys and the old single cache (o-mega-v3) go away.
      const kept = [SHELL_CACHE, ASSET_CACHE, NEXT_CACHE];
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !kept.includes(name)).map((name) => caches.delete(name)));
      // So do the saved copies of files that were redrawn or removed since.
      const assets = await caches.open(ASSET_CACHE);
      const saved = await assets.keys();
      await Promise.all(saved.filter((key) => key.url !== assetKey(new URL(key.url))).map((key) => assets.delete(key)));
      // And the build files this deploy no longer uses (all kept when not stamped: local preview).
      if (NEXT_FILES.length > 0) {
        const current = new Set(NEXT_FILES.map((file) => `${self.location.origin}${SCOPE}_next/static/${file}`));
        const code = await caches.open(NEXT_CACHE);
        const savedCode = await code.keys();
        await Promise.all(savedCode.filter((key) => !current.has(key.url)).map((key) => code.delete(key)));
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // The OAuth callback carries one-time codes: never cache it.
  if (url.pathname.startsWith(`${SCOPE}auth/`)) return;

  // Hashed build assets never change: the saved copy is used as it is, whichever deploy saved it.
  if (url.pathname.startsWith(`${SCOPE}_next/static/`)) {
    const key = url.origin + url.pathname;
    event.respondWith(caches.match(key, { cacheName: NEXT_CACHE }).then((cached) => cached ?? fetchAndCache(NEXT_CACHE, request, key)));
    return;
  }

  // Art, letter outlines and 3D models: the saved copy is used as it is, with
  // no download at all. A redrawn file gets a new hash, hence a new key.
  if (ASSET_DIRS.some((dir) => url.pathname.startsWith(SCOPE + dir))) {
    const key = assetKey(url);
    if (key) {
      event.respondWith(
        caches
          .match(key)
          // "no-cache": a just-redrawn file must not come from the browser's HTTP cache.
          .then((cached) => cached ?? fetchAndCache(ASSET_CACHE, new Request(request, { cache: "no-cache" }), key)),
      );
      return;
    }
  }

  // Pages and everything else: network first, cache as offline fallback.
  // Saved without the query string, so /carta/?id=… keeps one copy, not one per card.
  const key = url.origin + url.pathname;
  event.respondWith(
    fetchAndCache(SHELL_CACHE, request, key).catch(async () => {
      const cached = await caches.match(key);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const shell = await caches.match(SCOPE);
        if (shell) return shell;
      }
      return Response.error();
    }),
  );
});

/** The cache key of an art file: its path plus its current hash, or null once the file is gone. */
function assetKey(url) {
  // Not stamped (local preview): one copy per path.
  if (Object.keys(ASSET_VERSIONS).length === 0) return url.origin + url.pathname;
  const version = ASSET_VERSIONS[url.pathname.slice(SCOPE.length)];
  return version ? `${url.origin}${url.pathname}?v=${version}` : null;
}

async function fetchAndCache(cacheName, request, key) {
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(cacheName).then((cache) => cache.put(key, copy));
  }
  return response;
}
