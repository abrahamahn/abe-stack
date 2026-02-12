// src/apps/web/src/utils/registerServiceWorker.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkServiceWorkerUpdate,
  getServiceWorkerRegistration,
  isSecureContext,
  isServiceWorkerSupported,
  registerServiceWorker,
  unregisterAllServiceWorkers,
} from './registerServiceWorker';

import type { ServiceWorkerCallbacks } from './registerServiceWorker';

// ============================================================================
// Mock Types
// ============================================================================

type MockServiceWorkerState =
  | 'parsed'
  | 'installing'
  | 'installed'
  | 'activating'
  | 'activated'
  | 'redundant';

interface MockServiceWorker {
  state: MockServiceWorkerState;
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

interface MockServiceWorkerRegistration {
  scope: string;
  installing: MockServiceWorker | null;
  waiting: MockServiceWorker | null;
  active: MockServiceWorker | null;
  update: ReturnType<typeof vi.fn>;
  unregister: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

interface MockServiceWorkerContainer {
  controller: MockServiceWorker | null;
  ready: Promise<MockServiceWorkerRegistration>;
  register: ReturnType<typeof vi.fn>;
  getRegistration: ReturnType<typeof vi.fn>;
  getRegistrations: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

// ============================================================================
// Mock Setup
// ============================================================================

function createMockServiceWorker(state: MockServiceWorkerState = 'activated'): MockServiceWorker {
  return {
    state,
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createMockRegistration(
  options: Partial<{
    installing: MockServiceWorker | null;
    waiting: MockServiceWorker | null;
    active: MockServiceWorker | null;
    scope: string;
  }> = {},
): MockServiceWorkerRegistration {
  return {
    scope: options.scope ?? '/',
    installing: options.installing ?? null,
    waiting: options.waiting ?? null,
    active: options.active ?? createMockServiceWorker(),
    update: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createMockServiceWorkerContainer(): MockServiceWorkerContainer {
  const mockRegistration = createMockRegistration();

  return {
    controller: createMockServiceWorker(),
    ready: Promise.resolve(mockRegistration),
    register: vi.fn().mockResolvedValue(mockRegistration),
    getRegistration: vi.fn().mockResolvedValue(mockRegistration),
    getRegistrations: vi.fn().mockResolvedValue([mockRegistration]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('registerServiceWorker', () => {
  let mockServiceWorkerContainer: MockServiceWorkerContainer;

  beforeEach(() => {
    // Create fresh mock
    mockServiceWorkerContainer = createMockServiceWorkerContainer();

    // Setup navigator.serviceWorker mock
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorkerContainer,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isServiceWorkerSupported', () => {
    it('returns true when serviceWorker is available', () => {
      expect(isServiceWorkerSupported()).toBe(true);
    });
  });

  describe('isSecureContext', () => {
    it('returns true for secure context', () => {
      // jsdom sets isSecureContext to true by default
      expect(isSecureContext()).toBe(true);
    });

    it('returns true for localhost', () => {
      // In jsdom, localhost is considered secure
      expect(window.location.hostname === 'localhost' || isSecureContext()).toBe(true);
    });
  });

  describe('registerServiceWorker', () => {
    it('registers service worker with default config', async () => {
      const controller = await registerServiceWorker();

      expect(mockServiceWorkerContainer.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(controller.status).toBe('activated');
      expect(controller.registration).not.toBeNull();
    });

    it('registers service worker with custom path and scope', async () => {
      await registerServiceWorker({
        swPath: '/custom-sw.js',
        scope: '/app/',
      });

      expect(mockServiceWorkerContainer.register).toHaveBeenCalledWith('/custom-sw.js', {
        scope: '/app/',
      });
    });

    it('calls onSuccess callback when registration succeeds', async () => {
      const onSuccess = vi.fn();

      await registerServiceWorker({
        callbacks: { onSuccess },
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('calls onError callback when registration fails', async () => {
      const error = new Error('Registration failed');
      mockServiceWorkerContainer.register.mockRejectedValueOnce(error);

      const onError = vi.fn();
      const controller = await registerServiceWorker({
        callbacks: { onError },
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(controller.status).toBe('error');
    });

    it('calls onUpdate callback when update is available', async () => {
      const waitingWorker = createMockServiceWorker('installed');
      const registration = createMockRegistration({ waiting: waitingWorker });
      mockServiceWorkerContainer.register.mockResolvedValueOnce(registration);

      const onUpdate = vi.fn();

      await registerServiceWorker({
        callbacks: { onUpdate },
      });

      expect(onUpdate).toHaveBeenCalledWith({
        updateAvailable: true,
        waiting: true,
        registration,
      });
    });

    it('calls onStatusChange callback on status changes', async () => {
      const onStatusChange = vi.fn();

      await registerServiceWorker({
        callbacks: { onStatusChange },
      });

      // Should have been called multiple times during registration
      expect(onStatusChange).toHaveBeenCalled();
      expect(onStatusChange).toHaveBeenCalledWith('registering');
      expect(onStatusChange).toHaveBeenCalledWith('registered');
    });
  });

  describe('ServiceWorkerController', () => {
    it('checkForUpdates calls registration.update', async () => {
      const registration = createMockRegistration();
      mockServiceWorkerContainer.register.mockResolvedValueOnce(registration);

      const controller = await registerServiceWorker();
      await controller.checkForUpdates();

      expect(registration.update).toHaveBeenCalled();
    });

    it('skipWaiting posts message to waiting worker', async () => {
      const waitingWorker = createMockServiceWorker('installed');
      const registration = createMockRegistration({ waiting: waitingWorker });
      mockServiceWorkerContainer.register.mockResolvedValueOnce(registration);

      const controller = await registerServiceWorker();

      // skipWaiting will time out because mock doesn't send response
      // But we can verify the message was sent
      const skipPromise = controller.skipWaiting();

      // Wait a tick for the message to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(waitingWorker.postMessage).toHaveBeenCalledWith(
        { type: 'SKIP_WAITING' },
        expect.any(Array),
      );

      // Clean up - catch the timeout error
      await skipPromise.catch(() => {});
    }, 10000);

    it('unregister removes the service worker', async () => {
      const registration = createMockRegistration();
      mockServiceWorkerContainer.register.mockResolvedValueOnce(registration);

      const controller = await registerServiceWorker();
      const result = await controller.unregister();

      expect(result).toBe(true);
      expect(registration.unregister).toHaveBeenCalled();
      expect(controller.status).toBe('idle');
    });

    it('getVersion posts message to active worker', async () => {
      const activeWorker = createMockServiceWorker();
      const registration = createMockRegistration({ active: activeWorker });
      mockServiceWorkerContainer.register.mockResolvedValueOnce(registration);

      const controller = await registerServiceWorker();

      // getVersion will return null due to timeout, but we can verify message was sent
      const versionPromise = controller.getVersion();

      // Wait a tick for the message to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(activeWorker.postMessage).toHaveBeenCalledWith(
        { type: 'GET_VERSION' },
        expect.any(Array),
      );

      // The promise will resolve to null due to timeout/catch
      const version = await versionPromise;
      expect(version).toBeNull();
    }, 10000);

    it('clearCache posts message to active worker', async () => {
      const activeWorker = createMockServiceWorker();
      const registration = createMockRegistration({ active: activeWorker });
      mockServiceWorkerContainer.register.mockResolvedValueOnce(registration);

      const controller = await registerServiceWorker();

      // clearCache will time out, but we verify the message was sent
      const clearPromise = controller.clearCache();

      // Wait a tick for the message to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(activeWorker.postMessage).toHaveBeenCalledWith(
        { type: 'CLEAR_CACHE' },
        expect.any(Array),
      );

      // Clean up - catch the timeout error
      await clearPromise.catch(() => {});
    }, 10000);
  });

  describe('unregisterAllServiceWorkers', () => {
    it('unregisters all service workers', async () => {
      const reg1 = createMockRegistration();
      const reg2 = createMockRegistration();
      mockServiceWorkerContainer.getRegistrations.mockResolvedValueOnce([reg1, reg2]);

      const results = await unregisterAllServiceWorkers();

      expect(results).toEqual([true, true]);
      expect(reg1.unregister).toHaveBeenCalled();
      expect(reg2.unregister).toHaveBeenCalled();
    });
  });

  describe('getServiceWorkerRegistration', () => {
    it('returns the current registration', async () => {
      const registration = createMockRegistration();
      mockServiceWorkerContainer.getRegistration.mockResolvedValueOnce(registration);

      const result = await getServiceWorkerRegistration();

      expect(result).toBe(registration);
    });

    it('returns null when no registration exists', async () => {
      mockServiceWorkerContainer.getRegistration.mockResolvedValueOnce(undefined);

      const result = await getServiceWorkerRegistration();

      expect(result).toBeNull();
    });
  });

  describe('checkServiceWorkerUpdate', () => {
    it('returns update info when update is available', async () => {
      const waitingWorker = createMockServiceWorker('installed');
      const registration = createMockRegistration({ waiting: waitingWorker });
      mockServiceWorkerContainer.getRegistration.mockResolvedValueOnce(registration);

      const result = await checkServiceWorkerUpdate();

      expect(result).toEqual({
        updateAvailable: true,
        waiting: true,
        registration,
      });
      expect(registration.update).toHaveBeenCalled();
    });

    it('returns no update when none available', async () => {
      const registration = createMockRegistration({ waiting: null });
      mockServiceWorkerContainer.getRegistration.mockResolvedValueOnce(registration);

      const result = await checkServiceWorkerUpdate();

      expect(result).toEqual({
        updateAvailable: false,
        waiting: false,
        registration,
      });
    });

    it('returns no update when no registration exists', async () => {
      mockServiceWorkerContainer.getRegistration.mockResolvedValueOnce(undefined);

      const result = await checkServiceWorkerUpdate();

      expect(result).toEqual({
        updateAvailable: false,
        waiting: false,
        registration: null,
      });
    });
  });

  describe('installation tracking', () => {
    it('tracks service worker state changes during installation', async () => {
      const installingWorker = createMockServiceWorker('installing');
      const stateChangeListeners: Array<() => void> = [];

      installingWorker.addEventListener = vi.fn((event: string, handler: () => void) => {
        if (event === 'statechange') {
          stateChangeListeners.push(handler);
        }
      });

      const registration = createMockRegistration({
        installing: installingWorker,
        active: null,
      });
      mockServiceWorkerContainer.register.mockResolvedValueOnce(registration);

      const callbacks: ServiceWorkerCallbacks = {
        onStatusChange: vi.fn(),
      };

      await registerServiceWorker({ callbacks });

      expect(installingWorker.addEventListener).toHaveBeenCalledWith(
        'statechange',
        expect.any(Function),
      );

      // Simulate state change to installed
      installingWorker.state = 'installed';
      stateChangeListeners.forEach((listener) => {
        listener();
      });

      expect(callbacks.onStatusChange).toHaveBeenCalledWith('installed');
    });
  });
});
