/* Shredlog — service worker : app disponible hors ligne (coquille + images), données via localStorage + sync. */
const VERSION = "shredlog-v5";
const SHELL = ["./", "./index.html", "./app.js?v=5", "./data.js?v=5", "./backend.js?v=5", "./config.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin !== location.origin) return; // Supabase, fonts, cdn : réseau direct
  if (url.pathname.includes("/img/")) { // images : cache d'abord
    e.respondWith(caches.open(VERSION).then(async (c) => { const hit = await c.match(e.request); if (hit) return hit; const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }));
    return;
  }
  // coquille : réseau d'abord, cache en secours
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) caches.open(VERSION).then((c) => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html"))));
});
