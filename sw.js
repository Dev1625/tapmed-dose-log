const tag = "tapmed-dose-log-shell-";
const cacheName = `${tag}v1`;
const index = new URL("./index.html", self.location.href).href;
const home = new URL("./", self.location.href).href;
const files = ["./index.html", "./style.css", "./app.js", "./log.js"];
const urls = files.map((path) => new URL(path, self.location.href).href);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(urls.map((url) => new Request(url, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(tag) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  url.search = "";

  if (request.method !== "GET" || (url.href !== home && !urls.includes(url.href))) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(url.href === home ? index : url.href);
    return cached || fetch(request);
  })());
});
