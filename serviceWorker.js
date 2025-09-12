const CACHE_NAME = 'cache-v2';
const urlsToCache = [
    './',
    './icon192.png',
    './icon512.png',
    './serviceWorker.js',
    './scripts.js',
    './index.html',
    './manifest.json',
    './msu_105_1.json',
    './style.css'
];



self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});


// Активация Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Перехватываем запросы и возвращаем закешированные данные
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Возвращаем кешированный ресурс или делаем запрос к сети
        return response || fetch(event.request);
      })
  );
});
