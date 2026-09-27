/* Shredlog — service worker : app disponible hors ligne (coquille + images), données via localStorage + sync. */
const VERSION = "shredlog-v12";
const SHELL = ["./", "./index.html", "./app.js?v=12", "./data.js?v=12", "./stock.js?v=12", "./backend.js?v=12", "./config.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
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

/* Notifications push (Edge Function shredlog-notify). Charge utile : {title, body, url: "#stock", tag}. */
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Shredlog", { body: d.body || "", tag: d.tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: d.url || "#home" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.url) || "#home";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs[0];
    if (c) { c.postMessage({ nav: hash }); return c.focus(); } // app déjà ouverte : on y va sans recharger
    return self.clients.openWindow(new URL("./" + hash, self.registration.scope).href);
  }));
});
