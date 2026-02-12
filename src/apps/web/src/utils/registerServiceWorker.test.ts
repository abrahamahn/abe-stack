// src/apps/web/src/utils/registerServiceWorker.test.ts
import { describe, expect, it } from 'vitest';

import {
  checkServiceWorkerUpdate,
  getServiceWorkerRegistration,
  isSecureContext,
  isServiceWorkerSupported,
  registerServiceWorker,
  unregisterAllServiceWorkers,
} from './registerServiceWorker';

describe('registerServiceWorker utils', () => {
  it('exports expected public API', () => {
    expect(typeof registerServiceWorker).toBe('function');
    expect(typeof unregisterAllServiceWorkers).toBe('function');
    expect(typeof getServiceWorkerRegistration).toBe('function');
    expect(typeof checkServiceWorkerUpdate).toBe('function');
    expect(typeof isServiceWorkerSupported).toBe('function');
    expect(typeof isSecureContext).toBe('function');
  });
});
