const CACHE_NAME = 'map-cache-v2';
const DATA_CACHE_NAME = 'map-data-cache-v1';

const APP_SHELL_URLS = [
    './map.html',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/mgrs@2.0.0/mgrs.min.js',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэширую каркас карты');
                return cache.addAll(APP_SHELL_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                        console.log('Удаляю старый кэш карты:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            ).then(() => self.clients.claim());
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Стратегия "Stale-While-Revalidate" для данных из Google Sheet
    if (url.origin.includes('script.google.com')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return response || fetchPromise;
                });
            })
        );
    } 
    // Стратегия "Сначала сеть, потом кэш" для всего остального
    else {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
    }
});

