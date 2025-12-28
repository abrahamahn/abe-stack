/// <reference lib="webworker" />

// Type the service worker global scope
declare const self: ServiceWorkerGlobalScope;

const ASSETS_CACHE = 'app-assets-v1';
const IMAGES_CACHE = 'static-simages-v1'; // TODO
const cacheWhitelist: string[] = [ASSETS_CACHE, IMAGES_CACHE];

// Valid MIME types for caching
const validMimeTypes: string[] = ['text/html', 'application/javascript', 'text/css'];

// Perform install steps
self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches.open(ASSETS_CACHE).then((cache: Cache): Promise<void> => {
      // Fetch and cache these assets on the first install.
      return cache.addAll(['/', '/index.css', '/index.js']);
    }),
  );
});

// Delete any old caches
self.addEventListener('activate', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches.keys().then((cacheNames: string[]): Promise<(boolean | void)[]> => {
      return Promise.all(
        cacheNames.map((cacheName: string): Promise<boolean> | undefined => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

// TODO: add a request timeout.

/**
 * Check if response should be cached
 */
function shouldCacheResponse(response: Response, request: Request): boolean {
  // Don't cache bad responses
  if (!response) return false;
  if (response.status !== 200) return false;
  if (response.type !== 'basic') return false;

  // Only cache GET requests
  if (request.method !== 'GET') return false;

  // Only cache responses from the origin
  // if (!request.url.startsWith(self.origin)) return false;

  // Check MIME type
  const contentType = response.headers.get('Content-Type');
  if (!contentType) return false;
  if (!validMimeTypes.some((mimeType) => contentType.includes(mimeType))) {
    return false;
  }

  return true;
}

/**
 * Handle offline fallback for navigation requests
 */
function handleOfflineFallback(request: Request, error: Error): Promise<Response> {
  return caches.match(request).then((cachedResponse: Response | undefined) => {
    if (cachedResponse) return cachedResponse;

    // Check if request is for an HTML document (or navigation request)
    // appropriate for HTML5 routing used by single page applications
    const acceptHeader = request.headers.get('accept');
    if (
      request.mode === 'navigate' ||
      (request.method === 'GET' && acceptHeader?.includes('text/html'))
    ) {
      return caches.match('/').then((indexResponse) => {
        if (indexResponse) return indexResponse;
        return Promise.reject(error);
      });
    }

    return Promise.reject(error);
  });
}

// Always fetch when online, only use the cache as an offline fallback
self.addEventListener('fetch', (event: FetchEvent): void => {
  event.respondWith(
    // Fetch from the network in case we're online
    fetch(event.request)
      .then((response: Response): Response => {
        // Check if we should cache this response
        if (!shouldCacheResponse(response, event.request)) {
          return response;
        }

        // IMPORTANT: Clone the response. A response is a stream
        // and because we want the browser to consume the response
        // as well as the cache consuming the response, we need
        // to clone it so we have two streams
        const responseToCache = response.clone();

        // Cache the response for offline use
        caches.open(ASSETS_CACHE).then((cache: Cache): void => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch((error: Error): Promise<Response> => {
        // If we're offline, return the cached response
        return handleOfflineFallback(event.request, error);
      }),
  );
});
