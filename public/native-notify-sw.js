// @ts-nocheck — a service worker runs in ServiceWorkerGlobalScope, not the
// page: a project that type-checks its JavaScript with the DOM lib would
// otherwise flag `self.registration` / `clients` here.
/**
 * Native Notify — the web push service worker (added by Agent Notify).
 *
 * Served from the site ROOT (/native-notify-sw.js) so it covers the whole
 * site. It shows each push and opens its `data.url` when the notification is
 * clicked. It is named native-notify-sw.js on purpose: a site can have only
 * ONE service worker per scope — if yours already has one (a PWA / offline
 * worker), do not register this file; add the two listeners below to your
 * existing worker instead (see native-notify/web/README-web-push.md).
 */
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: 'Notification', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Notification', {
      body: payload.body || '',
      image: payload.image,
      tag: payload.tag,
      data: payload.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus().then(() => client.navigate(url));
      }
      return clients.openWindow(url);
    })
  );
});
