// MainsLog PWA Service Worker with Push Notifications & Study Slot Reminders
const CACHE_NAME = 'mainslog-pwa-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './tracker.html',
  './deed.jpg',
  './manifest.json',
  './favicon.ico',
  './favicon.png',
  './favicon.svg',
  './apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Rozha+One&family=Tiro+Devanagari+Hindi:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy for HTML pages so updates show instantly
self.addEventListener('fetch', (event) => {
  // Never intercept or cache API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  const isHtml = event.request.mode === 'navigate' || 
                 (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) ||
                 event.request.url.endsWith('.html');

  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(res => res || caches.match('./index.html')))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (event.request.method === 'GET' && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
  }
});

// ==========================================
// PWA PUSH & LOCAL NOTIFICATION HANDLERS
// ==========================================

self.addEventListener('push', (event) => {
  let data = {
    title: '📚 MainsLog Study Slot Alert',
    body: 'Time for your scheduled study slot!',
    url: './index.html'
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './favicon.png',
    badge: './favicon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'study-slot-push',
    renotify: true,
    data: {
      url: data.url || './index.html'
    },
    actions: [
      { action: 'open', title: '📖 Open Routine' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('index.html') || client.url.endsWith('/') || client.url.includes('tracker')) {
          if ('focus' in client) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_STUDY_NOTIFICATION') {
    const { title, body, tag, url } = event.data;
    const options = {
      body: body || 'Time to focus on your target study slot!',
      icon: './favicon.png',
      badge: './favicon.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: tag || 'study-slot-reminder',
      renotify: true,
      data: { url: url || './index.html' },
      actions: [
        { action: 'open', title: '📖 View Target' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
    self.registration.showNotification(title || '📚 MainsLog Study Slot Alert', options);
  }
});

