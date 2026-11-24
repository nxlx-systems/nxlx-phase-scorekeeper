// Keeps the app working with no internet.
// The app files are saved on the device and always opened from there (fast, works offline).
// Updates only happen when the person taps "Update now", which saves a safety copy of the
// scores and then clears these saved files so the newest ones are downloaded.
// Scores are stored separately and are never touched.
//
// IMPORTANT: keep this file the same from one app version to the next. When this file changes,
// browsers install the new copy on their own, which updates the app without "Update now" and
// without the safety copy. Change it only to fix the service worker itself (docs/RELEASING.md).
const CACHE = "phase10-app";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: "reload"})))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.url.includes("version.json")) return; // always ask the internet for the latest version number
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req.url, {cache: "reload"}).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match("./").then(r => r || caches.match("index.html"))))
  );
});
