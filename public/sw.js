const CACHE_NAME = 'namaste-cache-v1';
const ASSETS_TO_CACHE = [
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Bypass service worker for navigation/document requests to allow next-intl redirects to work natively
  if (request.mode === 'navigate' || request.destination === 'document') {
    return;
  }

  // Network-first for admin panel/KDS pages and API endpoints to ensure real-time accuracy
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api') || url.pathname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseCopy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Stale-while-revalidate for static files (css, js, images, fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Silently catch fetch errors for static assets if offline
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// PWA WEB PUSH EVENTS (Phase 13C)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const { title, body, data } = payload;

    const options = {
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [500, 200, 500, 200, 500],
      data: data || {},
      actions: [
        { action: 'open', title: 'Open Panel' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title || 'Namaste Alert', options)
    );
  } catch (err) {
    console.error('Failed to process push payload:', err);
    event.waitUntil(
      self.registration.showNotification('Namaste Indian Restaurant', {
        body: event.data.text(),
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickPath = event.notification.data?.clickPath || '/admin/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Find matching client if already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          if ('focus' in client) {
            client.focus();
          }
          if ('navigate' in client) {
            client.navigate(clickPath);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickPath);
      }
    })
  );
});

