self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'Zul', body: event.data.text() }; }

  const title = payload.title || 'Zul 💕';
  const options = {
    body: payload.body || 'New message',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'zul-message',
    renotify: true,
    vibrate: [150, 80, 150],
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(self.location.origin));
      if (existing) { existing.focus(); return; }
      return self.clients.openWindow(url);
    })
  );
});
