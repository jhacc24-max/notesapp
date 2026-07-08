// sw.js — Service Worker de notapp
// Offline caching + click en notificación local.
// Las notificaciones reales (con la app cerrada) las maneja Google Calendar,
// no este Service Worker.

const C = "notapp-v4";

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(clients.claim()); });

self.addEventListener("fetch", (e) => {
  if (e.request.url.startsWith(self.location.origin)) {
    e.respondWith(fetch(e.request).catch(() => new Response("Offline")));
  }
});

// ── Click en la notificación → enfoca o abre la app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const focused = list.find((c) => c.focused);
      if (focused) return focused.focus();
      if (list.length) return list[0].focus();
      return clients.openWindow(e.notification.data?.url || "./");
    })
  );
});

// ── Notificación local mientras la app está abierta (aviso inmediato en
// pantalla, complementario al de Google Calendar, no reemplaza a este).
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SCHEDULE_NOTIF") {
    const { id, title, body, delay } = e.data;
    if (e.source) e.source.postMessage({ type: "NOTIF_SCHEDULED", id, delay });
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23000020'/%3E%3Ctext y='52' x='8' font-size='44'%3E📝%3C/text%3E%3C/svg%3E",
        badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%2300f0ff'/%3E%3Ctext y='46' x='12' font-size='36'%3E🔔%3C/text%3E%3C/svg%3E",
        tag: id,
        renotify: true,
        vibrate: [200, 80, 200],
        data: { noteId: id, url: self.location.href },
      });
    }, Math.max(0, delay));
  }
});
