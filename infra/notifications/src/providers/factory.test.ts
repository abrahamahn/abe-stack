// infra/notifications/src/providers/factory.test.ts
/**
 * Tests for Notification Provider Factory
 *
 * Verifies creation and management of push notification providers,
 * including FCM configuration and environment variable parsing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createNotificationProviderService,
  createNotificationProviderServiceFromEnv,
} from './factory';
import type { NotificationFactoryOptions } from './types';

// ============================================================================
// Mock Modules
// ============================================================================

vi.mock('./fcm-provider', () => ({
  FcmProvider: class MockFcmProvider {
    name = 'fcm';
    private config: unknown;

    constructor(config?: unknown) {
      this.config = config;
    }

    isConfigured(): boolean {
      // Mock: configured if config is present and non-empty
      return this.config !== undefined && this.config !== null;
    }

    getPublicKey(): string | undefined {
      return undefined;
    }

    async send(): Promise<unknown> {
      return { success: false, error: 'not implemented' };
    }

    async sendBatch(): Promise<unknown> {
      return { total: 0, successful: 0, failed: 0, results: [] };
    }
  },
  createFcmProvider: vi.fn((env: { FCM_CREDENTIALS?: string; FCM_PROJECT_ID?: string }) => {
    if (
      env.FCM_CREDENTIALS != null &&
      env.FCM_CREDENTIALS !== '' &&
      env.FCM_PROJECT_ID != null &&
      env.FCM_PROJECT_ID !== ''
    ) {
      return new (class MockFcmProvider {
        name = 'fcm';
        isConfigured(): boolean {
          return true;
        }
        getPublicKey(): string | undefined {
          return undefined;
        }
        async send(): Promise<unknown> {
          return { success: false };
        }
        async sendBatch(): Promise<unknown> {
          return { total: 0, successful: 0, failed: 0, results: [] };
        }
      })();
    }
    return undefined;
  }),
}));

// ============================================================================
// Tests
// ============================================================================

describe('createNotificationProviderService', () => {
  describe('with FCM configuration', () => {
    it('should create service with FCM provider', () => {
      const options: NotificationFactoryOptions = {
        fcm: {
          credentials: 'service-account-json',
          projectId: 'test-project-123',
        },
      };

      const service = createNotificationProviderService(options);

      expect(service).toBeDefined();
      expect(service.isConfigured()).toBe(true);
    });

    it('should return FCM provider when configured', () => {
      const options: NotificationFactoryOptions = {
        fcm: {
          credentials: 'service-account-json',
          projectId: 'test-project-123',
        },
      };

      const service = createNotificationProviderService(options);
      const fcmProvider = service.getFcmProvider();

      expect(fcmProvider).toBeDefined();
      expect(fcmProvider?.name).toBe('fcm');
    });
  });

  describe('without FCM configuration', () => {
    it('should create service without providers', () => {
      const options: NotificationFactoryOptions = {};

      const service = createNotificationProviderService(options);

      expect(service).toBeDefined();
      expect(service.isConfigured()).toBe(false);
    });

    it('should return undefined for FCM provider when not configured', () => {
      const options: NotificationFactoryOptions = {};

      const service = createNotificationProviderService(options);
      const fcmProvider = service.getFcmProvider();

      expect(fcmProvider).toBeUndefined();
    });

    it('should handle fcm as null', () => {
      const options: NotificationFactoryOptions = {
        fcm: null as never,
      };

      const service = createNotificationProviderService(options);

      expect(service.isConfigured()).toBe(false);
    });

    it('should handle fcm as undefined', () => {
      const options: NotificationFactoryOptions = {
        fcm: undefined,
      };

      const service = createNotificationProviderService(options);

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('isConfigured method', () => {
    it('should return true when FCM is configured', () => {
      const options: NotificationFactoryOptions = {
        fcm: {
          credentials: 'credentials',
          projectId: 'project-123',
        },
      };

      const service = createNotificationProviderService(options);

      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when no providers configured', () => {
      const options: NotificationFactoryOptions = {};

      const service = createNotificationProviderService(options);

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty credentials', () => {
      const options: NotificationFactoryOptions = {
        fcm: {
          credentials: '',
          projectId: 'project-123',
        },
      };

      const service = createNotificationProviderService(options);

      // Provider created but not configured (empty credentials)
      expect(service).toBeDefined();
    });

    it('should handle empty project ID', () => {
      const options: NotificationFactoryOptions = {
        fcm: {
          credentials: 'credentials',
          projectId: '',
        },
      };

      const service = createNotificationProviderService(options);

      expect(service).toBeDefined();
    });
  });
});

describe('createNotificationProviderServiceFromEnv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with valid environment variables', () => {
    it('should create service from process.env', () => {
      const env = {
        FCM_CREDENTIALS: 'env-credentials',
        FCM_PROJECT_ID: 'env-project-123',
      };

      const service = createNotificationProviderServiceFromEnv(env);

      expect(service).toBeDefined();
      expect(service.isConfigured()).toBe(true);
    });

    it('should return configured FCM provider', () => {
      const env = {
        FCM_CREDENTIALS: 'env-credentials',
        FCM_PROJECT_ID: 'env-project-123',
      };

      const service = createNotificationProviderServiceFromEnv(env);
      const fcmProvider = service.getFcmProvider();

      expect(fcmProvider).toBeDefined();
    });

    it('should use default process.env if no env provided', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        FCM_CREDENTIALS: 'process-credentials',
        FCM_PROJECT_ID: 'process-project',
      };

      const service = createNotificationProviderServiceFromEnv();

      expect(service).toBeDefined();

      process.env = originalEnv;
    });
  });

  describe('with missing environment variables', () => {
    it('should return unconfigured service if FCM_CREDENTIALS missing', () => {
      const env = {
        FCM_PROJECT_ID: 'project-123',
      };

      const service = createNotificationProviderServiceFromEnv(env);

      expect(service.isConfigured()).toBe(false);
      expect(service.getFcmProvider()).toBeUndefined();
    });

    it('should return unconfigured service if FCM_PROJECT_ID missing', () => {
      const env = {
        FCM_CREDENTIALS: 'credentials',
      };

      const service = createNotificationProviderServiceFromEnv(env);

      expect(service.isConfigured()).toBe(false);
      expect(service.getFcmProvider()).toBeUndefined();
    });

    it('should return unconfigured service if both missing', () => {
      const env = {};

      const service = createNotificationProviderServiceFromEnv(env);

      expect(service.isConfigured()).toBe(false);
    });

    it('should handle undefined values', () => {
      const env = {
        FCM_CREDENTIALS: undefined,
        FCM_PROJECT_ID: undefined,
      };

      const service = createNotificationProviderServiceFromEnv(env);

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('with empty environment variables', () => {
    it('should return unconfigured service if FCM_CREDENTIALS is empty', () => {
      const env = {
        FCM_CREDENTIALS: '',
        FCM_PROJECT_ID: 'project-123',
      };

      const service = createNotificationProviderServiceFromEnv(env);

      expect(service.isConfigured()).toBe(false);
    });

    it('should return unconfigured service if FCM_PROJECT_ID is empty', () => {
      const env = {
        FCM_CREDENTIALS: 'credentials',
        FCM_PROJECT_ID: '',
      };

      const service = createNotificationProviderServiceFromEnv(env);

      expect(service.isConfigured()).toBe(false);
    });

    it('should return unconfigured service if both are empty', () => {
      const env = {
        FCM_CREDENTIALS: '',
        FCM_PROJECT_ID: '',
      };

      const service = createNotificationProviderServiceFromEnv(env);

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('integration behavior', () => {
    it('should create same service as createNotificationProviderService with matching config', () => {
      const credentials = 'test-credentials';
      const projectId = 'test-project';

      const directService = createNotificationProviderService({
        fcm: { credentials, projectId },
      });

      const envService = createNotificationProviderServiceFromEnv({
        FCM_CREDENTIALS: credentials,
        FCM_PROJECT_ID: projectId,
      });

      expect(directService.isConfigured()).toBe(envService.isConfigured());
    });

    it('should handle various environment configurations', () => {
      const testCases = [
        { env: { FCM_CREDENTIALS: 'a', FCM_PROJECT_ID: 'b' }, expected: true },
        { env: { FCM_CREDENTIALS: 'a' }, expected: false },
        { env: { FCM_PROJECT_ID: 'b' }, expected: false },
        { env: {}, expected: false },
      ];

      testCases.forEach(({ env, expected }) => {
        const service = createNotificationProviderServiceFromEnv(env);
        expect(service.isConfigured()).toBe(expected);
      });
    });
  });
});
