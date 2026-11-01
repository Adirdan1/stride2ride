// stride2ride service worker: push notifications only. No caching, no fetch
// handler — the app stays exactly as online as it was.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// iOS revokes push permission from a web app that receives a push without
// showing a notification. So every push shows one, whatever arrives.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'עדכון ברכב';
  const options = {
    body: data.body || '',
    tag: data.tag || undefined,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    lang: 'he',
    dir: 'rtl',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          if ('navigate' in w) await w.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
