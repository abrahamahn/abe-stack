// apps/web/src/utils/registerServiceWorker.ts
/**
 * Service Worker Registration Utility
 *
 * Provides type-safe registration and lifecycle management
 * for the service worker that handles offline asset caching.
 */

// ============================================================================
// Types
// ============================================================================

export type ServiceWorkerStatus =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'installing'
  | 'installed'
  | 'activating'
  | 'activated'
  | 'error'
  | 'unsupported';

export type ServiceWorkerEventType = 'statechange' | 'updatefound' | 'error' | 'message';

export interface ServiceWorkerUpdateInfo {
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Whether the service worker is waiting to be activated */
  waiting: boolean;
  /** The new service worker registration */
  registration: ServiceWorkerRegistration | null;
}

export interface ServiceWorkerCallbacks {
  /** Called when service worker registration succeeds */
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  /** Called when a new service worker update is found */
  onUpdate?: (info: ServiceWorkerUpdateInfo) => void;
  /** Called when service worker registration fails */
  onError?: (error: Error) => void;
  /** Called when service worker status changes */
  onStatusChange?: (status: ServiceWorkerStatus) => void;
}

export interface ServiceWorkerConfig {
  /** Path to the service worker file (default: '/sw.js') */
  swPath?: string;
  /** Scope for the service worker (default: '/') */
  scope?: string;
  /** Whether to register immediately (default: true in production) */
  immediate?: boolean;
  /** Callbacks for service worker events */
  callbacks?: ServiceWorkerCallbacks;
}

export interface ServiceWorkerController {
  /** Current registration status */
  status: ServiceWorkerStatus;
  /** The service worker registration object */
  registration: ServiceWorkerRegistration | null;
  /** Check for updates */
  checkForUpdates: () => Promise<void>;
  /** Skip waiting and activate new service worker */
  skipWaiting: () => Promise<void>;
  /** Unregister the service worker */
  unregister: () => Promise<boolean>;
  /** Get the current cache version */
  getVersion: () => Promise<string | null>;
  /** Clear all caches */
  clearCache: () => Promise<void>;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Check if we're in a secure context (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  return (
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

/**
 * Create a promise-based message channel to communicate with the service worker
 */
function postMessageToSW(
  sw: ServiceWorker,
  message: { type: string; [key: string]: unknown },
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event: MessageEvent): void => {
      resolve(event.data);
    };

    messageChannel.port1.onmessageerror = (): void => {
      reject(new Error('Message channel error'));
    };

    try {
      sw.postMessage(message, [messageChannel.port2]);

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 5000);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Register the service worker and return a controller object
 */
export async function registerServiceWorker(
  config: ServiceWorkerConfig = {},
): Promise<ServiceWorkerController> {
  const { swPath = '/sw.js', scope = '/', immediate = true, callbacks = {} } = config;

  let status: ServiceWorkerStatus = 'idle';
  let registration: ServiceWorkerRegistration | null = null;

  const updateStatus = (newStatus: ServiceWorkerStatus): void => {
    status = newStatus;
    callbacks.onStatusChange?.(status);
  };

  // Check browser support
  if (!isServiceWorkerSupported()) {
    updateStatus('unsupported');
    return createController();
  }

  // Check secure context
  if (!isSecureContext()) {
    updateStatus('error');
    callbacks.onError?.(new Error('Service workers require a secure context (HTTPS)'));
    return createController();
  }

  function createController(): ServiceWorkerController {
    return {
      get status(): ServiceWorkerStatus {
        return status;
      },
      get registration(): ServiceWorkerRegistration | null {
        return registration;
      },

      async checkForUpdates(): Promise<void> {
        if (registration !== null) {
          await registration.update();
        }
      },

      async skipWaiting(): Promise<void> {
        const waiting = registration?.waiting;
        if (waiting !== null && waiting !== undefined) {
          await postMessageToSW(waiting, { type: 'SKIP_WAITING' });
        }
      },

      async unregister(): Promise<boolean> {
        if (registration !== null) {
          const result = await registration.unregister();
          if (result) {
            registration = null;
            updateStatus('idle');
          }
          return result;
        }
        return false;
      },

      async getVersion(): Promise<string | null> {
        const active = registration?.active;
        if (active !== null && active !== undefined) {
          try {
            const response = (await postMessageToSW(active, { type: 'GET_VERSION' })) as {
              version: string;
            };
            return response.version;
          } catch {
            return null;
          }
        }
        return null;
      },

      async clearCache(): Promise<void> {
        const active = registration?.active;
        if (active !== null && active !== undefined) {
          await postMessageToSW(active, { type: 'CLEAR_CACHE' });
        }
      },
    };
  }

  // Register the service worker
  const register = async (): Promise<void> => {
    updateStatus('registering');

    try {
      registration = await navigator.serviceWorker.register(swPath, { scope });
      updateStatus('registered');

      // Handle initial installation
      if (registration.installing !== null) {
        trackInstallation(registration.installing);
      }

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration?.installing;
        if (newWorker !== null && newWorker !== undefined) {
          trackInstallation(newWorker);
        }
      });

      // Check if already active
      if (registration.active !== null) {
        updateStatus('activated');
        callbacks.onSuccess?.(registration);
      }

      // Check for waiting worker (update available)
      if (registration.waiting !== null) {
        callbacks.onUpdate?.({
          updateAvailable: true,
          waiting: true,
          registration,
        });
      }
    } catch (error) {
      updateStatus('error');
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  function trackInstallation(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      switch (worker.state) {
        case 'installing':
          updateStatus('installing');
          break;
        case 'installed':
          updateStatus('installed');
          // Check if this is an update
          if (navigator.serviceWorker.controller !== null) {
            callbacks.onUpdate?.({
              updateAvailable: true,
              waiting: true,
              registration,
            });
          }
          break;
        case 'activating':
          updateStatus('activating');
          break;
        case 'activated':
          updateStatus('activated');
          if (registration !== null) {
            callbacks.onSuccess?.(registration);
          }
          break;
        case 'redundant':
          // Worker was replaced
          break;
      }
    });
  }

  // Register immediately or wait for load
  if (immediate) {
    await register();
  } else {
    if (document.readyState === 'complete') {
      await register();
    } else {
      window.addEventListener('load', () => {
        void register();
      });
    }
  }

  return createController();
}

/**
 * Unregister all service workers (useful for debugging)
 */
export async function unregisterAllServiceWorkers(): Promise<boolean[]> {
  if (!isServiceWorkerSupported()) {
    return [];
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  return Promise.all(registrations.map((reg) => reg.unregister()));
}

/**
 * Get the current service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  return registration ?? null;
}

/**
 * Check if a service worker update is available
 */
export async function checkServiceWorkerUpdate(): Promise<ServiceWorkerUpdateInfo> {
  const registration = await getServiceWorkerRegistration();

  if (registration === null) {
    return {
      updateAvailable: false,
      waiting: false,
      registration: null,
    };
  }

  await registration.update();

  return {
    updateAvailable: registration.waiting !== null,
    waiting: registration.waiting !== null,
    registration,
  };
}
