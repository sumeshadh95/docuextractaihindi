// Service Worker for Farmer OCR PWA
// Cache version - INCREMENT THIS ON EVERY DEPLOYMENT
const CACHE_VERSION = 'v2-' + new Date().toISOString().split('T')[0];
const CACHE_NAME = 'farmer-ocr-' + CACHE_VERSION;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install event - cache static assets and force activation
self.addEventListener('install', (event) => {
    console.log('[SW] Installing new service worker:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Skip waiting - immediately activate new service worker
    self.skipWaiting();
});

// Activate event - clean ALL old caches and take control immediately
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new service worker:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('farmer-ocr-') && name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        }).then(() => {
            // Notify all clients to refresh
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
                });
            });
        })
    );
});

// Fetch event - NETWORK FIRST strategy with cache fallback
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API calls and external resources
    if (event.request.url.includes('generativelanguage.googleapis.com')) return;
    if (event.request.url.includes('esm.sh')) return;
    if (event.request.url.includes('fonts.googleapis.com')) return;
    if (event.request.url.includes('fonts.gstatic.com')) return;
    if (event.request.url.includes('cdn.tailwindcss.com')) return;

    event.respondWith(
        fetch(event.request, { cache: 'no-store' })
            .then((response) => {
                // Only cache successful responses
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache only when offline
                return caches.match(event.request);
            })
    );
});

// Listen for skip waiting message from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'FORCE_REFRESH') {
        // Clear all caches and refresh
        caches.keys().then(names => {
            Promise.all(names.map(name => caches.delete(name))).then(() => {
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => client.postMessage({ type: 'CACHE_CLEARED' }));
                });
            });
        });
    }
});
