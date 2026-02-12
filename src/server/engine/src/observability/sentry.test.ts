// src/server/engine/src/observability/sentry.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ErrorTrackingConfig, ErrorTrackingProvider } from './types';

// Mock the factory module so we can control which provider is returned
vi.mock('./factory', () => ({
  createErrorTracker: vi.fn(),
}));

function createMockProvider(): ErrorTrackingProvider {
  return {
    init: vi.fn(),
    captureError: vi.fn(),
    setUserContext: vi.fn(),
    addBreadcrumb: vi.fn(),
  };
}

const testConfig: ErrorTrackingConfig = {
  dsn: 'https://public@sentry.io/123',
  environment: 'test',
  release: '1.0.0',
  sampleRate: 1.0,
};

describe('Sentry facade', () => {
  let mockProvider: ErrorTrackingProvider;

  beforeEach(() => {
    // Reset modules so the module-level `errorTracker` resets to null
    vi.resetModules();

    // Re-mock after resetModules since it clears mocks
    vi.mock('./factory', () => ({
      createErrorTracker: vi.fn(),
    }));

    mockProvider = createMockProvider();
  });

  async function loadSentry() {
    const mod = await import('./sentry');
    // Get the freshly mocked factory
    const factoryMod = await import('./factory');
    vi.mocked(factoryMod.createErrorTracker).mockReturnValue(mockProvider);
    return { sentry: mod, factory: factoryMod };
  }

  describe('initSentry', () => {
    it('should create a tracker via the factory and call init', async () => {
      const { sentry, factory } = await loadSentry();

      sentry.initSentry(testConfig);

      expect(factory.createErrorTracker).toHaveBeenCalledWith(testConfig);
      expect(mockProvider.init).toHaveBeenCalledWith(testConfig);
    });

    it('should pass the full config to the factory', async () => {
      const { sentry, factory } = await loadSentry();
      const fullConfig: ErrorTrackingConfig = {
        dsn: 'https://key@sentry.io/456',
        environment: 'production',
        release: 'v2.0.0',
        sampleRate: 0.5,
      };

      sentry.initSentry(fullConfig);

      expect(factory.createErrorTracker).toHaveBeenCalledWith(fullConfig);
      expect(mockProvider.init).toHaveBeenCalledWith(fullConfig);
    });
  });

  describe('captureError', () => {
    it('should delegate to the provider after initialization', async () => {
      const { sentry } = await loadSentry();
      sentry.initSentry(testConfig);

      const error = new Error('Test error');
      const context = {
        user: { id: 'user123', email: 'test@example.com' },
        tags: { feature: 'auth' },
      };

      sentry.captureError(error, context);

      expect(mockProvider.captureError).toHaveBeenCalledWith(error, context);
    });

    it('should support calling without context', async () => {
      const { sentry } = await loadSentry();
      sentry.initSentry(testConfig);

      const error = new Error('Simple error');
      sentry.captureError(error);

      expect(mockProvider.captureError).toHaveBeenCalledWith(error, undefined);
    });

    it('should accept string errors', async () => {
      const { sentry } = await loadSentry();
      sentry.initSentry(testConfig);

      sentry.captureError('string error message');

      expect(mockProvider.captureError).toHaveBeenCalledWith('string error message', undefined);
    });

    it('should be a no-op when not initialized', async () => {
      const { sentry } = await loadSentry();
      // Do NOT call initSentry

      expect(() => {
        sentry.captureError(new Error('should not throw'));
      }).not.toThrow();

      expect(mockProvider.captureError).not.toHaveBeenCalled();
    });
  });

  describe('setUserContext', () => {
    it('should delegate to the provider after initialization', async () => {
      const { sentry } = await loadSentry();
      sentry.initSentry(testConfig);

      sentry.setUserContext('user123', 'test@example.com');

      expect(mockProvider.setUserContext).toHaveBeenCalledWith('user123', 'test@example.com');
    });

    it('should support calling without email', async () => {
      const { sentry } = await loadSentry();
      sentry.initSentry(testConfig);

      sentry.setUserContext('user123');

      expect(mockProvider.setUserContext).toHaveBeenCalledWith('user123', undefined);
    });

    it('should be a no-op when not initialized', async () => {
      const { sentry } = await loadSentry();

      expect(() => {
        sentry.setUserContext('user123', 'test@example.com');
      }).not.toThrow();

      expect(mockProvider.setUserContext).not.toHaveBeenCalled();
    });
  });

  describe('addBreadcrumb', () => {
    it('should delegate to the provider after initialization', async () => {
      const { sentry } = await loadSentry();
      sentry.initSentry(testConfig);

      sentry.addBreadcrumb('User logged in', 'auth', { userId: '123' });

      expect(mockProvider.addBreadcrumb).toHaveBeenCalledWith('User logged in', 'auth', {
        userId: '123',
      });
    });

    it('should support calling without data', async () => {
      const { sentry } = await loadSentry();
      sentry.initSentry(testConfig);

      sentry.addBreadcrumb('Page loaded', 'navigation');

      expect(mockProvider.addBreadcrumb).toHaveBeenCalledWith(
        'Page loaded',
        'navigation',
        undefined,
      );
    });

    it('should be a no-op when not initialized', async () => {
      const { sentry } = await loadSentry();

      expect(() => {
        sentry.addBreadcrumb('should not throw', 'test');
      }).not.toThrow();

      expect(mockProvider.addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('null-safety (uninitialized)', () => {
    it('should handle all methods being called without initialization', async () => {
      const { sentry } = await loadSentry();

      expect(() => {
        sentry.captureError(new Error('error'));
        sentry.setUserContext('user1');
        sentry.addBreadcrumb('msg', 'cat');
      }).not.toThrow();

      expect(mockProvider.captureError).not.toHaveBeenCalled();
      expect(mockProvider.setUserContext).not.toHaveBeenCalled();
      expect(mockProvider.addBreadcrumb).not.toHaveBeenCalled();
    });

    it('should work correctly after late initialization', async () => {
      const { sentry } = await loadSentry();

      // These should be no-ops
      sentry.captureError(new Error('before init'));
      sentry.setUserContext('early-user');
      sentry.addBreadcrumb('early', 'test');

      expect(mockProvider.captureError).not.toHaveBeenCalled();
      expect(mockProvider.setUserContext).not.toHaveBeenCalled();
      expect(mockProvider.addBreadcrumb).not.toHaveBeenCalled();

      // Now initialize
      sentry.initSentry(testConfig);

      // These should delegate
      sentry.captureError(new Error('after init'));
      sentry.setUserContext('late-user');
      sentry.addBreadcrumb('late', 'test');

      expect(mockProvider.captureError).toHaveBeenCalledTimes(1);
      expect(mockProvider.setUserContext).toHaveBeenCalledTimes(1);
      expect(mockProvider.addBreadcrumb).toHaveBeenCalledTimes(1);
    });
  });
});
