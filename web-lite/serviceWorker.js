const CACHE_NAME = 'frame-runtime-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './src/frame.js',
  './src/storage.js',
  './src/crypto.js',
  './src/ui/IdentityPanel.js',
  './src/ui/CapabilityPanel.js',
  './src/ui/IntentPanel.js',
  './src/ui/AgentPanel.js',
  './src/ui/ConsolePanel.js',
  './src/ui/TabBar.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 