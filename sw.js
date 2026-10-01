// Offline shell for "שם לבת". Bump VERSION on every release so phones pick up the new build.
const VERSION = "shem-v4";
const SHELL = ["/", "/index.html", "/app.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/icons/apple-touch-icon.png", "/fonts/assistant-hebrew-400-normal.woff2","/fonts/assistant-hebrew-600-normal.woff2","/fonts/assistant-hebrew-700-normal.woff2","/fonts/assistant-hebrew-800-normal.woff2","/fonts/assistant-latin-400-normal.woff2","/fonts/assistant-latin-600-normal.woff2","/fonts/assistant-latin-700-normal.woff2","/fonts/assistant-latin-800-normal.woff2","/fonts/frank-ruhl-libre-hebrew-700-normal.woff2","/fonts/frank-ruhl-libre-hebrew-900-normal.woff2","/fonts/frank-ruhl-libre-latin-700-normal.woff2","/fonts/frank-ruhl-libre-latin-900-normal.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || e.request.method !== "GET") return;
  if (e.request.mode === "navigate" || url.pathname === "/app.js") {
    // network first so updates arrive; cached shell when offline
    e.respondWith(
      fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request.mode === "navigate" ? "/index.html" : e.request, copy)); return r; })
        .catch(() => caches.match(e.request.mode === "navigate" ? "/index.html" : e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return r;
  })));
});
