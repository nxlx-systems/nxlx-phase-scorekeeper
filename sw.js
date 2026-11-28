// Keeps the app working with no internet.
// The app files are saved on the device and always opened from there (fast, works offline).
// Updates only happen when the person taps "Update now", which saves a safety copy of the
// scores and then replaces these saved files with the newest ones.
// Scores are stored separately and are never touched.
//
// IMPORTANT: keep this file the same from one app version to the next. When this file changes,
// browsers install the new copy on their own. Since version 24 that keeps the app files already
// saved, but change it only to fix the service worker itself (docs/RELEASING.md).
const CACHE = "phase10-app";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  // Files already saved stay as they are, so a new copy of this file never changes the app by itself;
  // only missing files are downloaded (a first install, or a cache the browser cleared).
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f =>
    c.match(f).then(hit => hit || c.add(new Request(f, {cache: "reload"})))))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  // Other NXLX apps share this web address and its saved files: remove only Phase 10's own old caches.
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith("phase10-")).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.url.includes("version.json")) return; // always ask the internet for the latest version number
  if (new URL(req.url).searchParams.has("fresh")) return; // Update now downloading the new version
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req.url, {cache: "reload"}).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match("./").then(r => r || caches.match("index.html"))))
  );
});
