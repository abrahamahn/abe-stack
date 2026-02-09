// src/server/core/src/notifications/providers/fcm-provider.test.ts
/**
 * Tests for FCM Provider Stub
 *
 * Verifies FCM provider stub implementation that returns not-configured status.
 * This is a placeholder until actual FCM integration is implemented.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { FcmProvider, createFcmProvider } from './fcm-provider';

import type { SubscriptionWithId } from './types';
import type { NotificationPayload, PushSendResult, PushSubscription } from '@abe-stack/shared';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock push subscription
 */
function createMockSubscription(overrides: Partial<PushSubscription> = {}): PushSubscription {
  return {
    endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
    keys: {
      p256dh: 'BKey123',
      auth: 'AKey456',
    },
    expirationTime: null,
    ...overrides,
  };
}

/**
 * Create a subscription with ID
 */
function createSubscriptionWithId(id: string): SubscriptionWithId {
  return {
    id,
    subscription: createMockSubscription(),
  };
}

/**
 * Create a mock notification payload
 */
function createMockPayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    title: 'Test Notification',
    body: 'This is a test',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('FcmProvider', () => {
  let provider: FcmProvider;

  describe('without configuration', () => {
    beforeEach(() => {
      provider = new FcmProvider();
    });

    it('should have name "fcm"', () => {
      expect(provider.name).toBe('fcm');
    });

    it('should not be configured without config', () => {
      expect(provider.isConfigured()).toBe(false);
    });

    it('should return undefined for public key', () => {
      expect(provider.getPublicKey()).toBeUndefined();
    });

    it('should return failure result for send', async () => {
      const subscription = createMockSubscription();
      const payload = createMockPayload();

      const result: PushSendResult = await provider.send(subscription, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('FCM provider not implemented');
      expect(result.subscriptionId).toBe('unknown');
    });

    it('should return failure results for sendBatch', async () => {
      const subscriptions = [
        createSubscriptionWithId('sub-1'),
        createSubscriptionWithId('sub-2'),
        createSubscriptionWithId('sub-3'),
      ];
      const payload = createMockPayload();

      const result = await provider.sendBatch(subscriptions, payload);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.expiredSubscriptions).toHaveLength(0);

      result.results.forEach(
        (r: { success: boolean; subscriptionId?: string; error?: string }, idx: number) => {
          expect(r.success).toBe(false);
          expect(r.subscriptionId).toBe(subscriptions[idx]?.id);
          expect(r.error).toBe('FCM provider not implemented');
        },
      );
    });

    it('should handle empty batch', async () => {
      const payload = createMockPayload();

      const result = await provider.sendBatch([], payload);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('with configuration', () => {
    beforeEach(() => {
      provider = new FcmProvider({
        credentials: 'fake-credentials-json',
        projectId: 'test-project-123',
      });
    });

    it('should still not be configured (implementation pending)', () => {
      // FCM is explicitly not implemented yet, so isConfigured returns false
      expect(provider.isConfigured()).toBe(false);
    });

    it('should still return failure for send even with config', async () => {
      const subscription = createMockSubscription();
      const payload = createMockPayload();

      const result = await provider.send(subscription, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('FCM provider not implemented');
    });

    it('should still return failure for sendBatch even with config', async () => {
      const subscriptions = [createSubscriptionWithId('sub-1')];
      const payload = createMockPayload();

      const result = await provider.sendBatch(subscriptions, payload);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('send method edge cases', () => {
    beforeEach(() => {
      provider = new FcmProvider();
    });

    it('should handle send with options', async () => {
      const subscription = createMockSubscription();
      const payload = createMockPayload();
      const options = { ttl: 3600, urgency: 'high' as const };

      const result = await provider.send(subscription, payload, options);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle payload with icon and badge', async () => {
      const subscription = createMockSubscription();
      const payload = createMockPayload({
        icon: 'https://example.com/icon.png',
        badge: 'https://example.com/badge.png',
      });

      const result = await provider.send(subscription, payload);

      expect(result.success).toBe(false);
    });

    it('should handle payload with actions', async () => {
      const subscription = createMockSubscription();
      const payload = createMockPayload({
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });

      const result = await provider.send(subscription, payload);

      expect(result.success).toBe(false);
    });
  });

  describe('sendBatch method edge cases', () => {
    beforeEach(() => {
      provider = new FcmProvider();
    });

    it('should handle batch with options', async () => {
      const subscriptions = [createSubscriptionWithId('sub-1')];
      const payload = createMockPayload();
      const options = { ttl: 7200 };

      const result = await provider.sendBatch(subscriptions, payload, options);

      expect(result.failed).toBe(1);
    });

    it('should handle large batch', async () => {
      const subscriptions = Array.from({ length: 100 }, (_, i) =>
        createSubscriptionWithId(`sub-${i}`),
      );
      const payload = createMockPayload();

      const result = await provider.sendBatch(subscriptions, payload);

      expect(result.total).toBe(100);
      expect(result.failed).toBe(100);
      expect(result.results).toHaveLength(100);
    });
  });
});

describe('createFcmProvider', () => {
  it('should create FcmProvider with valid credentials', () => {
    const env = {
      FCM_CREDENTIALS: 'credentials-json-string',
      FCM_PROJECT_ID: 'my-project-id',
    };

    const provider = createFcmProvider(env);

    expect(provider).toBeInstanceOf(FcmProvider);
    expect(provider?.name).toBe('fcm');
  });

  it('should return undefined if FCM_CREDENTIALS is missing', () => {
    const env = {
      FCM_PROJECT_ID: 'my-project-id',
    };

    const provider = createFcmProvider(env);

    expect(provider).toBeUndefined();
  });

  it('should return undefined if FCM_PROJECT_ID is missing', () => {
    const env = {
      FCM_CREDENTIALS: 'credentials-json-string',
    };

    const provider = createFcmProvider(env);

    expect(provider).toBeUndefined();
  });

  it('should return undefined if credentials is empty string', () => {
    const env = {
      FCM_CREDENTIALS: '',
      FCM_PROJECT_ID: 'my-project-id',
    };

    const provider = createFcmProvider(env);

    expect(provider).toBeUndefined();
  });

  it('should return undefined if project ID is empty string', () => {
    const env = {
      FCM_CREDENTIALS: 'credentials',
      FCM_PROJECT_ID: '',
    };

    const provider = createFcmProvider(env);

    expect(provider).toBeUndefined();
  });

  it('should return undefined if both are missing', () => {
    const env = {};

    const provider = createFcmProvider(env);

    expect(provider).toBeUndefined();
  });

  it('should handle undefined environment values', () => {
    const env = {};

    const provider = createFcmProvider(env);

    expect(provider).toBeUndefined();
  });
});
