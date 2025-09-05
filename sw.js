const CACHE_NAME = 'event-log-cache-v2'; // Увеличили версию кэша

// Список основных файлов, которые составляют "каркас" приложения.
const APP_SHELL_URLS = [
    './', // Главная страница
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/mgrs@2.0.0/mgrs.min.js',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    'https://jen9-ops.github.io/library/style.css',
    'https://jen9-ops.github.io/library/script.js',
    'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2'
];

// Этап установки: кэшируем основной "каркас" приложения
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэш открыт, кэширую каркас приложения');
                // Мы не блокируем установку, если какие-то из этих ресурсов не загрузятся.
                // Это делает установку более надежной.
                return cache.addAll(APP_SHELL_URLS).catch(error => {
                    console.warn('Не удалось закэшировать все ресурсы каркаса:', error);
                });
            })
    );
});

// Этап активации: удаляем старые кэши, чтобы приложение обновлялось
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Удаляю старый кэш:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Этап перехвата запросов (fetch): здесь происходит вся магия
self.addEventListener('fetch', event => {
    // Мы обрабатываем только GET-запросы
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        // 1. Пытаемся получить ответ из сети
        fetch(event.request)
            .then(networkResponse => {
                // 2. Если получилось, клонируем ответ и сохраняем его в кэш
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                    .then(cache => {
                        // Кэшируем успешный ответ для будущего использования
                        cache.put(event.request, responseToCache);
                    });
                // 3. Возвращаем свежий ответ из сети
                return networkResponse;
            })
            .catch(() => {
                // 4. Если сеть недоступна, пытаемся найти ответ в кэше
                console.log('Сеть недоступна, ищу в кэше:', event.request.url);
                return caches.match(event.request);
            })
    );
});

