/**
 * Service Worker - Phase 3 PWA Implementation
 * Provides offline capabilities, caching, and background sync
 */

const CACHE_NAME = 'portfolio-v3.0.0';
const STATIC_CACHE = 'static-v3.0.0';
const DYNAMIC_CACHE = 'dynamic-v3.0.0';
const SEARCH_CACHE = 'search-v3.0.0';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/js/main.js',
  '/css/styles.css',
  '/tailwind_theme/tailwind.css',
  '/assets/images/landing_image.tiff',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/manifest.json'
];

// Content that should be cached dynamically
const CACHE_PATTERNS = {
  content: /\/data\/.*\.json$/,
  images: /\/assets\/.*\.(jpg|jpeg|png|webp|gif|svg|tiff)$/,
  fonts: /\/fonts\/.*\.(woff|woff2|ttf|eot)$/,
  api: /\/api\/.*/
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old cache versions
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== SEARCH_CACHE) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // Strategy 1: Static assets - Cache First
    if (STATIC_ASSETS.some(asset => pathname.endsWith(asset))) {
      return await cacheFirst(request, STATIC_CACHE);
    }

    // Strategy 2: Content JSON - Stale While Revalidate
    if (CACHE_PATTERNS.content.test(pathname)) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    }

    // Strategy 3: Images - Cache First with fallback
    if (CACHE_PATTERNS.images.test(pathname)) {
      return await cacheFirstWithFallback(request, DYNAMIC_CACHE);
    }

    // Strategy 4: Search index - Network First
    if (pathname.includes('search-index')) {
      return await networkFirst(request, SEARCH_CACHE);
    }

    // Strategy 5: HTML pages - Network First with offline fallback
    if (request.headers.get('accept')?.includes('text/html')) {
      return await networkFirstWithOfflineFallback(request);
    }

    // Strategy 6: API calls - Network First
    if (CACHE_PATTERNS.api.test(pathname)) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }

    // Default: Network only
    return await fetch(request);

  } catch (error) {
    console.error('Service Worker: Fetch failed:', error);
    return await getOfflineFallback(request);
  }
}

// Caching Strategy Implementations

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Optionally update in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {}); // Silent fail for background updates

    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always try to update in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
      // Notify clients of content update
      notifyClientsOfUpdate(request.url);
    }
    return response;
  }).catch(() => cached); // Fallback to cached on network error

  // Return cached immediately if available, otherwise wait for network
  return cached || await fetchPromise;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirstWithFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    // Return placeholder image for failed image requests
    if (request.url.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
      return new Response(
        '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" fill="#6b7280">Image Unavailable</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
  }

  throw new Error('Resource not available');
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Try cached version
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Return offline page
    return await getOfflinePage();
  }
}

async function getOfflineFallback(request) {
  // Return appropriate offline content based on request type
  if (request.headers.get('accept')?.includes('text/html')) {
    return await getOfflinePage();
  }

  if (request.url.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
    return new Response(
      '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" fill="#6b7280">Offline</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }

  return new Response('Offline - Content not available', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

async function getOfflinePage() {
  const cache = await caches.open(STATIC_CACHE);
  const offlinePage = await cache.match('/offline.html');

  if (offlinePage) {
    return offlinePage;
  }

  // Fallback offline content
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Offline - Chris Lindeman Portfolio</title>
      <style>
        body { font-family: system-ui; text-align: center; padding: 2rem; background: #f3f4f6; }
        .offline-container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { color: #374151; margin-bottom: 1rem; }
        p { color: #6b7280; margin-bottom: 1.5rem; }
        .retry-btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; }
        .retry-btn:hover { background: #2563eb; }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>You're Offline</h1>
        <p>It looks like you've lost your internet connection. Don't worry - you can still browse previously loaded content.</p>
        <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Background Sync
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Background sync triggered:', event.tag);

  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }

  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncContent() {
  try {
    // Sync any pending content updates
    const cache = await caches.open(DYNAMIC_CACHE);
    const contentRequests = [
      '/data/projects.json',
      '/data/papers.json',
      '/data/testimonials.json',
      '/data/search-index.json'
    ];

    for (const url of contentRequests) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response.clone());
          console.log('✅ Synced:', url);
        }
      } catch (error) {
        console.warn('⚠️ Failed to sync:', url, error);
      }
    }

    // Notify clients of successful sync
    notifyClientsOfUpdate('content-sync-complete');

  } catch (error) {
    console.error('❌ Content sync failed:', error);
  }
}

async function syncAnalytics() {
  try {
    // Sync any pending analytics data
    const analyticsData = await getStoredAnalytics();

    if (analyticsData.length > 0) {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyticsData)
      });

      if (response.ok) {
        await clearStoredAnalytics();
        console.log('✅ Analytics synced successfully');
      }
    }
  } catch (error) {
    console.error('❌ Analytics sync failed:', error);
  }
}

// Push Notifications
self.addEventListener('push', event => {
  console.log('📢 Service Worker: Push received');

  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New content available',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/badge-72.png',
    tag: data.tag || 'portfolio-update',
    data: data,
    actions: [
      {
        action: 'view',
        title: 'View Now',
        icon: '/assets/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: false,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Portfolio Update', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', event => {
  console.log('🔔 Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'view') {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Message handling
self.addEventListener('message', event => {
  console.log('💬 Service Worker: Message received:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Utility Functions

function notifyClientsOfUpdate(url) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CONTENT_UPDATED',
        url: url,
        timestamp: Date.now()
      });
    });
  });
}

async function getStoredAnalytics() {
  // Retrieve analytics data from IndexedDB
  // Implementation would depend on your analytics storage strategy
  return [];
}

async function clearStoredAnalytics() {
  // Clear analytics data from IndexedDB after successful sync
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Performance monitoring
self.addEventListener('fetch', event => {
  // Track performance metrics
  const startTime = performance.now();

  event.respondWith(
    handleFetch(event.request).then(response => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log slow requests
      if (duration > 1000) {
        console.warn(`🐌 Slow request (${duration.toFixed(2)}ms):`, event.request.url);
      }

      return response;
    })
  );
});

console.log('🎉 Service Worker: Loaded and ready!');