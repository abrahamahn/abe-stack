const CACHE_VERSION = "v1";
const ASSETS_CACHE = `app-assets-${CACHE_VERSION}`;
const IMAGES_CACHE = `images-${CACHE_VERSION}`;
const FONTS_CACHE = `fonts-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const cacheWhitelist = [ASSETS_CACHE, IMAGES_CACHE, FONTS_CACHE, API_CACHE];

// Check if we're in development mode
const isDevelopment =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname.includes("localhost") ||
  self.location.port === "3000";

// If in development, immediately unregister
if (isDevelopment) {
  console.log("[ServiceWorker] Development mode detected, unregistering");
  self.registration?.unregister();
  return;
}

// Skip caching for development-related paths
const DEV_PATHS = [
  "/@vite/client",
  "/@react-refresh",
  "/index.tsx",
  "/index.css",
  "/vite",
  "/@fs",
  "/@vite",
  "/@fs/",
  "/@vite/",
  "/@react-refresh/",
  "/@vite/client/",
];

// Assets to cache on install
const PRE_CACHED_ASSETS = ["/", "/index.html", "/manifest.json"];

// Perform install steps
self.addEventListener("install", function (event) {
  console.log("[ServiceWorker] Install");

  // Skip waiting forces the waiting service worker to become the active service worker
  self.skipWaiting();

  // Skip caching in development
  if (isDevelopment) {
    console.log("[ServiceWorker] Development mode detected, skipping cache");
    return;
  }

  event.waitUntil(
    caches.open(ASSETS_CACHE).then(function (cache) {
      console.log("[ServiceWorker] Caching app shell");
      return cache.addAll(PRE_CACHED_ASSETS).catch((error) => {
        console.error("[ServiceWorker] Pre-cache error:", error);
        return Promise.resolve();
      });
    }),
  );
});

// Delete any old caches
self.addEventListener("activate", function (event) {
  console.log("[ServiceWorker] Activate");

  // Claim control of all clients
  event.waitUntil(self.clients.claim());

  // Skip cache cleanup in development
  if (isDevelopment) {
    console.log(
      "[ServiceWorker] Development mode detected, skipping cache cleanup",
    );
    return;
  }

  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("[ServiceWorker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

// Helper function to determine cache based on request URL and type
function getCacheForRequest(request) {
  const url = new URL(request.url);

  // Skip caching for development-related paths
  if (DEV_PATHS.some((path) => url.pathname.includes(path))) {
    return null;
  }

  // Cache images
  if (
    request.destination === "image" ||
    url.pathname.match(/\.(jpe?g|png|gif|svg|webp)$/i)
  ) {
    return IMAGES_CACHE;
  }

  // Cache fonts
  if (
    request.destination === "font" ||
    url.pathname.match(/\.(woff2?|ttf|otf|eot)$/i)
  ) {
    return FONTS_CACHE;
  }

  // Cache API responses (with caution)
  if (url.pathname.startsWith("/api/")) {
    return API_CACHE;
  }

  // Default to assets cache
  return ASSETS_CACHE;
}

// Fetch handler with improved caching strategy
self.addEventListener("fetch", function (event) {
  // Skip all caching in development
  if (isDevelopment) {
    console.log(
      "[ServiceWorker] Development mode detected, skipping fetch handling",
    );
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip caching for development-related paths
  const url = new URL(event.request.url);
  if (DEV_PATHS.some((path) => url.pathname.includes(path))) {
    return;
  }

  // Network-first strategy with fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache bad responses
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Store in the appropriate cache
        const cacheName = getCacheForRequest(event.request);
        if (cacheName) {
          caches
            .open(cacheName)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch((error) => {
              console.error("[ServiceWorker] Cache error:", error);
            });
        }

        return response;
      })
      .catch(() => {
        // Return from cache if network fails
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Check if request is for an HTML document (or navigation request)
          // Return index.html for SPA routes
          const acceptHeader = event.request.headers.get("accept");
          if (
            event.request.mode === "navigate" ||
            (acceptHeader && acceptHeader.includes("text/html"))
          ) {
            return caches.match("/");
          }

          // If we get here, we couldn't serve the request from cache either
          console.log("[ServiceWorker] Could not fetch:", event.request.url);

          // Create a minimal offline response for common asset types
          if (url.pathname.match(/\.(jpe?g|png|gif|svg)$/i)) {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" text-anchor="middle" dominant-baseline="middle" fill="#999">Image unavailable</text></svg>',
              { headers: { "Content-Type": "image/svg+xml" } },
            );
          }

          // For missing JavaScript or CSS, return empty response
          if (url.pathname.match(/\.(js|css)$/i)) {
            const contentType = url.pathname.endsWith(".js")
              ? "application/javascript"
              : "text/css";
            return new Response("/* Offline: resource unavailable */", {
              headers: { "Content-Type": contentType },
            });
          }

          // Default response for other types
          return new Response("Resource unavailable offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        });
      }),
  );
});
