// MainsLog PWA Service Worker with Push Notifications & Study Slot Reminders
const CACHE_NAME = 'mainslog-pwa-v26';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './tracker.html',
  './pyq.html',
  './examples-bank.js',
  './voice-recall.js',
  './assets/pyq/pyq.css',
  './assets/pyq/pyq.js',
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

  const isLocalAsset = event.request.url.startsWith(self.location.origin);

  if (isHtml || isLocalAsset) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(res => res || (isHtml ? caches.match('./index.html') : null)))
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
    const iconUrl = self.location.origin + '/favicon.png';
    const options = {
      body: body || 'Time to focus on your target study slot!',
      icon: iconUrl,
      badge: iconUrl,
      vibrate: [250, 100, 250, 100, 250],
      tag: tag || 'study-slot-reminder',
      renotify: true,
      requireInteraction: true,
      data: { url: url || './index.html' },
      actions: [
        { action: 'open', title: '📖 View Target' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
    const showPromise = self.registration.showNotification(title || '📚 MainsLog Study Slot Alert', options);
    if (event.waitUntil) {
      event.waitUntil(showPromise);
    }
  }
});

// ==========================================
// BACKGROUND PERIODIC SYNC STUDY REMINDERS
// ==========================================
const TIMETABLE_SLOTS_SW = [
  { start: "07:00", end: "08:00", title: "Wake Up & Morning Prep", timeDisplay: "7:00 AM – 8:00 AM", desc: "Hydration, morning exercise and mental preparation." },
  { start: "08:00", end: "09:30", title: "CSAT Practice", timeDisplay: "8:00 AM – 9:30 AM", desc: "Quantitative aptitude, reasoning and comprehension practice." },
  { start: "09:30", end: "12:30", title: "GS Mains Study Block 1", timeDisplay: "9:30 AM – 12:30 PM", desc: "Core static syllabus conceptual depth and topic notes." },
  { start: "12:30", end: "13:30", title: "GS Mains Study Block 2", timeDisplay: "12:30 PM – 1:30 PM", desc: "Targeted topic revision and syllabus mapping." },
  { start: "14:00", end: "15:30", title: "Current Affairs Analysis", timeDisplay: "2:00 PM – 3:30 PM", desc: "The Hindu editorial reading, monthly compilation notes." },
  { start: "16:30", end: "19:30", title: "Sociology Optional Deep Dive", timeDisplay: "4:30 PM – 7:30 PM", desc: "Sociological thinkers, PYQs and paper 1 & 2 coverage." },
  { start: "21:00", end: "23:00", title: "GS Answer Writing Practice", timeDisplay: "9:00 PM – 11:00 PM", desc: "Answer writing practice, structure and model solutions." },
  { start: "23:00", end: "00:30", title: "Skill Building Block", timeDisplay: "11:00 PM – 12:30 AM", desc: "Technical skill development and strategic tools." },
  { start: "00:30", end: "01:30", title: "Sociology PYQ & Revision", timeDisplay: "12:30 AM – 1:30 AM", desc: "Concept recap, thinker quotes and previous questions." },
  { start: "01:30", end: "02:30", title: "Same-Day R0 Review", timeDisplay: "1:30 AM – 2:30 AM", desc: "Complete active recall of all topics studied today." }
];

async function checkBackgroundSlots() {
  const now = new Date();
  const curMins = now.getHours() * 60 + now.getMinutes();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  for (const slot of TIMETABLE_SLOTS_SW) {
    const [sH, sM] = slot.start.split(':').map(Number);
    const [eH, eM] = slot.end.split(':').map(Number);
    let startMins = sH * 60 + sM;
    let endMins = eH * 60 + eM;
    if (endMins < startMins) endMins += 24 * 60;
    let effectiveNow = curMins;
    if (startMins > 12 * 60 && curMins < 6 * 60) effectiveNow += 24 * 60;

    if (effectiveNow >= startMins && effectiveNow < endMins) {
      const tag = `slot-start-${slot.start}-${todayStr}`;
      try {
        const existing = await self.registration.getNotifications({ tag: tag });
        if (!existing || existing.length === 0) {
          const iconUrl = self.location.origin + '/favicon.png';
          await self.registration.showNotification(`📚 Study Slot Alert: ${slot.title}`, {
            body: `⏰ ${slot.timeDisplay} — ${slot.desc}`,
            icon: iconUrl,
            badge: iconUrl,
            tag: tag,
            renotify: true,
            requireInteraction: true,
            vibrate: [250, 100, 250, 100, 250],
            data: { url: self.location.origin + '/index.html' }
          });
        }
      } catch (e) {
        console.warn('[SW Background Sync notification error]:', e);
      }
    }
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mainslog-study-sync' || event.tag === 'study-slot-reminder') {
    event.waitUntil(checkBackgroundSlots());
  }
});

