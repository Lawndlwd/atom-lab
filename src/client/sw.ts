/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST ?? []);

registerRoute(
  new NavigationRoute(async ({ request }) => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open("pages-fallback");
      const match = await cache.match("/offline.html");
      return match ?? new Response("offline", { status: 503 });
    }
  }),
);

registerRoute(
  ({ url }: { url: URL }) => url.pathname.startsWith("/trpc"),
  new NetworkFirst({
    cacheName: "trpc",
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 })],
  }),
);

registerRoute(
  ({ request }: { request: Request }) =>
    ["style", "script", "image", "font"].includes(request.destination),
  new CacheFirst({
    cacheName: "assets",
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 })],
  }),
);

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Identity", {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: data.data,
      actions: data.actions,
    } as NotificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;
  const data = (event.notification as Notification).data ?? {};
  event.waitUntil(
    (async () => {
      if (action === "done" && data.identityId) {
        try {
          await fetch("/api/push/ack", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              identityId: data.identityId,
              action: "done",
              date: data.date ?? new Date().toISOString().slice(0, 10),
            }),
          });
        } catch {}
      }
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const target = "/today";
      for (const c of clientsList) {
        if (c.url.includes(target) && "focus" in c) return (c as WindowClient).focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })(),
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
