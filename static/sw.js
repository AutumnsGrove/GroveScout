// Scout - Service Worker
const CACHE_NAME = 'scout-v1';
const STATIC_ASSETS = [
	'/',
	'/favicon.svg',
	'/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_ASSETS);
		})
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name !== CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip API requests
	if (event.request.url.includes('/api/')) return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				// Clone the response before caching
				const responseClone = response.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(event.request, responseClone);
				});
				return response;
			})
			.catch(() => {
				// Fall back to cache
				return caches.match(event.request);
			})
	);
});

// Push notification event
self.addEventListener('push', (event) => {
	if (!event.data) return;

	const data = event.data.json();
	const options = {
		body: data.body || 'You have a new notification',
		icon: '/icons/icon-192.png',
		badge: '/icons/badge-72.png',
		vibrate: [100, 50, 100],
		data: {
			url: data.url || '/'
		},
		actions: data.actions || []
	};

	event.waitUntil(
		self.registration.showNotification(data.title || 'Scout', options)
	);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const url = event.notification.data.url || '/';

	event.waitUntil(
		clients.matchAll({ type: 'window' }).then((windowClients) => {
			// Check if there's already a window open
			for (const client of windowClients) {
				if (client.url === url && 'focus' in client) {
					return client.focus();
				}
			}
			// Open new window
			if (clients.openWindow) {
				return clients.openWindow(url);
			}
		})
	);
});
