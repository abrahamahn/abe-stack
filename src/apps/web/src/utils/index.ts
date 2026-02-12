// src/apps/web/src/utils/index.ts
/**
 * Utility Functions
 *
 * Framework-agnostic utilities for the web application.
 */

export {
  checkServiceWorkerUpdate,
  getServiceWorkerRegistration,
  isSecureContext,
  isServiceWorkerSupported,
  registerServiceWorker,
  unregisterAllServiceWorkers,
} from './registerServiceWorker';

export type {
  ServiceWorkerCallbacks,
  ServiceWorkerConfig,
  ServiceWorkerController,
  ServiceWorkerEventType,
  ServiceWorkerStatus,
  ServiceWorkerUpdateInfo,
} from './registerServiceWorker';
