// sw.js - GameLife Service Worker (Offline First / PWA)
const CACHE_NAME = 'gamelife-v5.1.0';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './css/systems.css',
    './manifest.json',
    './assets/favicon.svg',
    './assets/cash.png',
    './assets/coin.png',
    './assets/creativity.png',
    './assets/force.png',
    './assets/goals.png',
    './assets/guild.png',
    './assets/life.png',
    './assets/lifebar.png',
    './assets/missions.png',
    './assets/potion.png',
    './assets/profile.png',
    './assets/save.png',
    './assets/settings.png',
    './assets/shield.png',
    './assets/social.png',
    './assets/star.png',
    './assets/stats.png',
    './assets/streak.png',
    './assets/swords.png',
    './assets/wisdom.png',
    './js/core/utils.js',
    './js/core/bus.js',
    './js/core/state.js',
    './js/audio.js',
    './js/ui/toasts.js',
    './js/ui/modals.js',
    './js/systems/profile.js',
    './js/systems/missions.js',
    './js/systems/rest.js',
    './js/systems/day-engine.js',
    './js/systems/hero.js',
    './js/systems/streak.js',
    './js/systems/achievements.js',
    './js/systems/titles.js',
    './js/systems/history.js',
    './js/systems/save.js',
    './js/systems/economy.js',
    './js/systems/base.js',
    './js/ui/fx.js',
    './js/ui/hud.js',
    './js/ui/chronicle.js',
    './js/main-v3.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Solo cachear peticiones GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Devolver recurso en caché e intentar actualizar en segundo plano (stale-while-revalidate)
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(() => {
                    // Silencio ante fallo de red: estamos offline
                });

                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Fallback a index si es navegación
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
