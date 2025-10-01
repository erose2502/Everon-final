// Service Worker for offline functionality
const CACHE_NAME = 'everon-v2-' + Date.now(); // Dynamic cache name to force updates
const STATIC_CACHE = 'everon-static-v2';

const urlsToCache = [
  '/',
  '/favicon-32x32.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Never cache index.html or JS/CSS assets - always fetch fresh
  if (event.request.url.includes('/index.html') || 
      event.request.url.includes('/assets/') ||
      event.request.url.endsWith('.js') ||
      event.request.url.endsWith('.css')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
    );
    return;
  }
  
  // For other resources, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});