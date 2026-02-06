// apps/web/public/sw.js
/**
 * Service Worker for PWA Offline Asset Caching and Push Notifications
 *
 * Implements caching strategies:
 * - Cache-first: Static assets (JS, CSS, images, fonts)
 * - Network-first: API calls with fallback to cache
 * - Stale-while-revalidate: HTML pages
 *
 * Push notification handling:
 * - Receives push events and displays notifications
 * - Handles notification clicks (opens URL, focuses window)
 * - Supports action buttons and custom data payloads
 *
 * @version 1.1.0
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Assets to pre-cache during install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/favicon.ico',
  '/icons/favicon.svg',
  '/icons/logo192.png',
  '/icons/logo512.png',
];

// URL patterns for caching strategies
const STATIC_ASSET_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.otf$/,
  /\.eot$/,
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.webp$/,
  /\.ico$/,
];

const API_PATTERNS = [/\/api\//];

const HTML_PATTERNS = [/\.html$/, /\/$/];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if URL matches any pattern in the list
 */
function matchesPattern(url, patterns) {
  const pathname = new URL(url).pathname;
  return patterns.some((pattern) => pattern.test(pathname) || pattern.test(url));
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  return matchesPattern(request.url, STATIC_ASSET_PATTERNS);
}

/**
 * Check if request is for an API endpoint
 */
function isApiRequest(request) {
  return matchesPattern(request.url, API_PATTERNS);
}

/**
 * Check if request is for an HTML page
 */
function isHtmlRequest(request) {
  const acceptHeader = request.headers.get('Accept') || '';
  return (
    acceptHeader.includes('text/html') ||
    matchesPattern(request.url, HTML_PATTERNS) ||
    request.mode === 'navigate'
  );
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];

  const deletions = cacheNames
    .filter((name) => !validCaches.includes(name))
    .map((name) => caches.delete(name));

  return Promise.all(deletions);
}

// ============================================================================
// Caching Strategies
// ============================================================================

/**
 * Cache-first strategy for static assets
 * Try cache first, fall back to network and update cache
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Return offline fallback if available
    const fallback = await caches.match('/index.html');
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

/**
 * Network-first strategy for API calls
 * Try network first, fall back to cache on failure
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful GET responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Fall back to cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Return offline error response for failed API calls
    return new Response(JSON.stringify({ error: 'Network unavailable', offline: true }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Stale-while-revalidate strategy for HTML pages
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  // Fetch fresh version in background
  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  // Return cached version if available, otherwise wait for network
  if (cachedResponse) {
    // Don't await - let it update in background
    networkPromise.catch(() => {});
    return cachedResponse;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  // Return cached index.html as fallback for navigation
  const fallback = await caches.match('/index.html');
  if (fallback) {
    return fallback;
  }

  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ============================================================================
// Service Worker Lifecycle Events
// ============================================================================

/**
 * Install event - pre-cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        // Pre-cache essential assets
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch(() => {
        // Silent fail - service worker will retry on next page load
      }),
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    cleanupOldCaches()
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
      .catch(() => {
        // Silent fail - service worker will retry on next activation
      }),
  );
});

/**
 * Fetch event - route requests through appropriate caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests (for non-API)
  // API can have other methods but only GET is cached
  if (request.method !== 'GET' && !isApiRequest(request)) {
    return;
  }

  // Skip cross-origin requests that aren't from our API
  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !isApiRequest(request)) {
    return;
  }

  // Route to appropriate caching strategy
  if (isApiRequest(request)) {
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
  } else if (isHtmlRequest(request)) {
    event.respondWith(staleWhileRevalidate(request));
  } else {
    // Default: try cache first, then network
    event.respondWith(cacheFirst(request));
  }
});

/**
 * Message event - handle communication from main thread
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))),
    );
  }
});

// ============================================================================
// Push Notification Events
// ============================================================================

/**
 * Push event - receive and display push notifications
 *
 * Expected payload format (matches NotificationPayload from @abe-stack/shared):
 * {
 *   title: string,
 *   body: string,
 *   icon?: string,
 *   badge?: string,
 *   image?: string,
 *   tag?: string,
 *   data?: { type?: string, url?: string, ... },
 *   actions?: Array<{ action: string, title: string, icon?: string }>,
 *   requireInteraction?: boolean,
 *   renotify?: boolean,
 *   silent?: boolean,
 *   vibrate?: number[],
 *   timestamp?: number,
 *   url?: string
 * }
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    // No data in push event, skip
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Fallback: try to use text as title if JSON parsing fails
    payload = {
      title: 'New Notification',
      body: event.data.text() || 'You have a new notification',
    };
  }

  const { title, ...options } = payload;

  // Build notification options
  const notificationOptions = {
    body: options.body || '',
    icon: options.icon || '/icons/logo192.png',
    badge: options.badge || '/icons/badge72.png',
    image: options.image,
    tag: options.tag,
    data: {
      ...options.data,
      // Store URL in data for click handling
      url: options.url || options.data?.url,
      timestamp: options.timestamp || Date.now(),
    },
    actions: options.actions || [],
    requireInteraction: options.requireInteraction || false,
    renotify: options.renotify || false,
    silent: options.silent || false,
    vibrate: options.vibrate,
    timestamp: options.timestamp,
  };

  // Remove undefined values
  Object.keys(notificationOptions).forEach((key) => {
    if (notificationOptions[key] === undefined) {
      delete notificationOptions[key];
    }
  });

  event.waitUntil(self.registration.showNotification(title || 'Notification', notificationOptions));
});

/**
 * Notification click event - handle user interaction with notifications
 *
 * Handles:
 * - Main notification body clicks (opens URL or focuses app)
 * - Action button clicks (dispatches to app via postMessage)
 */
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Always close the notification
  notification.close();

  // Determine the URL to open
  let targetUrl = data.url || '/';

  // If an action was clicked, check for action-specific URL
  if (action && data.actions) {
    const clickedAction = data.actions.find((a) => a.action === action);
    if (clickedAction && clickedAction.url) {
      targetUrl = clickedAction.url;
    }
  }

  event.waitUntil(
    (async () => {
      // Get all window clients
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Try to find an existing window to focus
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);

        // If we have a matching origin, focus and navigate
        if (clientUrl.origin === self.location.origin) {
          // Send message to client about the notification click
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            action: action,
            data: data,
            url: targetUrl,
          });

          // Focus and navigate the client
          await client.focus();

          // Navigate if URL is different from current page
          if (clientUrl.pathname !== targetUrl && !targetUrl.startsWith('http')) {
            await client.navigate(targetUrl);
          }

          return;
        }
      }

      // No existing window found, open a new one
      const fullUrl = targetUrl.startsWith('http') ? targetUrl : self.location.origin + targetUrl;
      await self.clients.openWindow(fullUrl);
    })(),
  );
});

/**
 * Notification close event - track when notifications are dismissed
 */
self.addEventListener('notificationclose', (event) => {
  const notification = event.notification;

  // Track notification dismissal
  // Data is available but not logged to avoid console usage
  // In production, this could send analytics to server
  void notification;
  void event;
});
