/**
 * CoinScope service worker.
 *
 * Caches static assets only (app shell, JS/CSS, images, fonts, manifest).
 * NEVER intercepts API or server-function traffic: the coin-identification
 * calls, auth, and all other dynamic requests always go to the network.
 * - Non-GET requests pass through untouched.
 * - /api/* (Better Auth, etc.), /_serverFn/* (TanStack Start server
 *   functions, incl. the AI identify calls), and /__grok/* (platform
 *   chrome) are never cached or intercepted.
 * - Navigations are network-first with a cached "/" fallback for offline.
 * - Static same-origin assets are cache-first, refreshed from network.
 */

const CACHE_NAME = "coinscope-v1";
const CORE_ASSETS = ["/", "/manifest.webmanifest", "/favicon.svg", "/icon.svg"];

const BYPASS_PREFIXES = ["/api/", "/_serverFn", "/__grok/"];

function shouldBypass(request) {
  if (request.method !== "GET") return true;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return true;
  return BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (shouldBypass(event.request)) return;

  // Navigations: fresh from the network when possible, offline fallback.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/")),
    );
    return;
  }

  // Static assets: serve from cache, fill the cache from the network.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
