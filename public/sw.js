/**
 * Service Worker for platev3 PWA
 * Handles caching for offline support
 */

const CACHE_NAME = 'platev3-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/plate1.png',
  '/assets/plate2.png',
  '/assets/plate3.png',
  '/assets/plate4.png',
  '/assets/plate5.png',
  '/manifest.json',
  '/sw.js'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching assets for offline use');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Failed to cache assets:', error);
      })
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch - serve cached assets when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Clone and cache the response for future use
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
            return response;
          });
      })
      .catch(() => {
        // If fetch fails, try to return a fallback page
        return caches.match('/index.html');
      })
  );
});

// Listen for messages from the app (e.g., to skip waiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
