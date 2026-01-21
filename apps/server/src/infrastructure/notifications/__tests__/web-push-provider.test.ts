// apps/server/src/infrastructure/notifications/__tests__/web-push-provider.test.ts
/**
 * Web Push Provider Tests
 *
 * Tests for the Web Push notification provider.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import webPush from 'web-push';

import { createWebPushProvider, WebPushProvider } from '../web-push-provider';

import type { NotificationPayload, PushSubscription } from '@abe-stack/core';

// Mock web-push
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

describe('WebPushProvider', () => {
  const validConfig = {
    publicKey: 'BEl62iUYgUivxIk0TrDOQMlB5w8rVALgsBU6fVDR7xzNS8Qu',
    privateKey: 'UUxI4O8k2rSNbfckTls_KXJdz3OQY6-C0wCNnEjx5lg',
    subject: 'mailto:admin@example.com',
  };

  const testSubscription: PushSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    expirationTime: null,
    keys: {
      p256dh: 'BEl62iUYgUivxIk0TrDOQMlB5w8rVALgsBU6fVDR7xzNS8Qu',
      auth: 'UUxI4O8k2r',
    },
  };

  const testPayload: NotificationPayload = {
    title: 'Test Notification',
    body: 'This is a test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should configure web-push with valid config', () => {
      const provider = new WebPushProvider(validConfig);

      expect(webPush.setVapidDetails).toHaveBeenCalledWith(
        validConfig.subject,
        validConfig.publicKey,
        validConfig.privateKey,
      );
      expect(provider.isConfigured()).toBe(true);
    });

    it('should not configure with missing public key', () => {
      const provider = new WebPushProvider({
        ...validConfig,
        publicKey: '',
      });

      expect(webPush.setVapidDetails).not.toHaveBeenCalled();
      expect(provider.isConfigured()).toBe(false);
    });

    it('should not configure with missing private key', () => {
      const provider = new WebPushProvider({
        ...validConfig,
        privateKey: '',
      });

      expect(webPush.setVapidDetails).not.toHaveBeenCalled();
      expect(provider.isConfigured()).toBe(false);
    });

    it('should not configure with invalid subject', () => {
      const provider = new WebPushProvider({
        ...validConfig,
        subject: 'invalid-subject',
      });

      expect(webPush.setVapidDetails).not.toHaveBeenCalled();
      expect(provider.isConfigured()).toBe(false);
    });

    it('should accept https subject', () => {
      const provider = new WebPushProvider({
        ...validConfig,
        subject: 'https://example.com',
      });

      expect(provider.isConfigured()).toBe(true);
    });
  });

  describe('name', () => {
    it('should return web-push', () => {
      const provider = new WebPushProvider(validConfig);
      expect(provider.name).toBe('web-push');
    });
  });

  describe('getPublicKey', () => {
    it('should return public key when configured', () => {
      const provider = new WebPushProvider(validConfig);
      expect(provider.getPublicKey()).toBe(validConfig.publicKey);
    });

    it('should return undefined when not configured', () => {
      const provider = new WebPushProvider({ ...validConfig, publicKey: '' });
      expect(provider.getPublicKey()).toBeUndefined();
    });
  });

  describe('send', () => {
    it('should send notification successfully', async () => {
      vi.mocked(webPush.sendNotification).mockResolvedValue({
        statusCode: 201,
        body: '',
        headers: {},
      });

      const provider = new WebPushProvider(validConfig);
      const result = await provider.send(testSubscription, testPayload);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(webPush.sendNotification).toHaveBeenCalled();
    });

    it('should return error when provider not configured', async () => {
      const provider = new WebPushProvider({ ...validConfig, publicKey: '' });
      const result = await provider.send(testSubscription, testPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should return error when payload too large', async () => {
      const provider = new WebPushProvider(validConfig);
      const largePayload: NotificationPayload = {
        title: 'Test',
        body: 'x'.repeat(5000), // > 4KB
      };

      const result = await provider.send(testSubscription, largePayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should handle send failure', async () => {
      const webPushError = new Error('Push failed') as Error & { statusCode: number };
      webPushError.statusCode = 410;
      vi.mocked(webPush.sendNotification).mockRejectedValue(webPushError);

      const provider = new WebPushProvider(validConfig);
      const result = await provider.send(testSubscription, testPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Push failed');
      expect(result.statusCode).toBe(410);
    });

    it('should pass TTL option', async () => {
      vi.mocked(webPush.sendNotification).mockResolvedValue({
        statusCode: 201,
        body: '',
        headers: {},
      });

      const provider = new WebPushProvider(validConfig);
      await provider.send(testSubscription, testPayload, { ttl: 3600 });

      expect(webPush.sendNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ TTL: 3600 }),
      );
    });
  });

  describe('sendBatch', () => {
    const subscriptions = [
      { id: 'sub-1', subscription: testSubscription },
      { id: 'sub-2', subscription: { ...testSubscription, endpoint: 'https://example.com/2' } },
    ];

    it('should send to all subscriptions', async () => {
      vi.mocked(webPush.sendNotification).mockResolvedValue({
        statusCode: 201,
        body: '',
        headers: {},
      });

      const provider = new WebPushProvider(validConfig);
      const result = await provider.sendBatch(subscriptions, testPayload);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('should return error for all when not configured', async () => {
      const provider = new WebPushProvider({ ...validConfig, publicKey: '' });
      const result = await provider.sendBatch(subscriptions, testPayload);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
    });

    it('should identify expired subscriptions', async () => {
      const expiredError = new Error('Gone') as Error & { statusCode: number };
      expiredError.statusCode = 410;

      vi.mocked(webPush.sendNotification)
        .mockResolvedValueOnce({ statusCode: 201, body: '', headers: {} })
        .mockRejectedValueOnce(expiredError);

      const provider = new WebPushProvider(validConfig);
      const result = await provider.sendBatch(subscriptions, testPayload);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.expiredSubscriptions).toContain('sub-2');
    });

    it('should handle 404 as expired', async () => {
      const notFoundError = new Error('Not Found') as Error & { statusCode: number };
      notFoundError.statusCode = 404;

      vi.mocked(webPush.sendNotification).mockRejectedValue(notFoundError);

      const provider = new WebPushProvider(validConfig);
      const result = await provider.sendBatch(subscriptions, testPayload);

      expect(result.expiredSubscriptions).toHaveLength(2);
    });

    it('should return error for all when payload too large', async () => {
      const provider = new WebPushProvider(validConfig);
      const largePayload: NotificationPayload = {
        title: 'Test',
        body: 'x'.repeat(5000),
      };

      const result = await provider.sendBatch(subscriptions, largePayload);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.results[0]?.error).toContain('too large');
    });
  });

  describe('createWebPushProvider', () => {
    it('should create provider from env vars', () => {
      const provider = createWebPushProvider({
        VAPID_PUBLIC_KEY: validConfig.publicKey,
        VAPID_PRIVATE_KEY: validConfig.privateKey,
        VAPID_SUBJECT: validConfig.subject,
      });

      expect(provider).toBeDefined();
      expect(provider?.isConfigured()).toBe(true);
    });

    it('should return undefined when public key missing', () => {
      const provider = createWebPushProvider({
        VAPID_PRIVATE_KEY: validConfig.privateKey,
      });

      expect(provider).toBeUndefined();
    });

    it('should return undefined when private key missing', () => {
      const provider = createWebPushProvider({
        VAPID_PUBLIC_KEY: validConfig.publicKey,
      });

      expect(provider).toBeUndefined();
    });

    it('should use default subject when not provided', () => {
      const provider = createWebPushProvider({
        VAPID_PUBLIC_KEY: validConfig.publicKey,
        VAPID_PRIVATE_KEY: validConfig.privateKey,
      });

      expect(provider).toBeDefined();
    });
  });
});
