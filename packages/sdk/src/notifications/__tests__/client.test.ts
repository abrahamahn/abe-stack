// packages/sdk/src/notifications/__tests__/client.test.ts
/**
 * Notification Client Tests
 *
 * Tests for the notification API client.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNotificationClient, urlBase64ToUint8Array } from '../client';

describe('Notification Client', () => {
  const baseUrl = 'http://localhost:3001';
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createClient = (token?: string) =>
    createNotificationClient({
      baseUrl,
      getToken: token ? () => token : undefined,
      fetchImpl: mockFetch,
    });

  describe('getVapidKey', () => {
    it('should fetch VAPID key without auth', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ publicKey: 'test-public-key' }),
      });

      const client = createClient();
      const result = await client.getVapidKey();

      expect(result.publicKey).toBe('test-public-key');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/vapid-key`,
        expect.objectContaining({
          headers: expect.any(Headers),
          credentials: 'include',
        }),
      );

      // Check no auth header
      const call = mockFetch.mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('should send subscription with auth', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ subscriptionId: 'sub-123', message: 'Subscribed' }),
      });

      const client = createClient('test-token');
      const result = await client.subscribe({
        subscription: {
          endpoint: 'https://example.com/push',
          expirationTime: null,
          keys: { p256dh: 'key1', auth: 'key2' },
        },
        deviceId: 'device-1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.subscriptionId).toBe('sub-123');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/subscribe`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        }),
      );

      // Check auth header
      const call = mockFetch.mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid subscription' }),
      });

      const client = createClient('test-token');

      await expect(
        client.subscribe({
          subscription: {
            endpoint: 'https://example.com/push',
            expirationTime: null,
            keys: { p256dh: 'key1', auth: 'key2' },
          },
          deviceId: 'device-1',
          userAgent: 'Mozilla/5.0',
        }),
      ).rejects.toThrow('Invalid subscription');
    });
  });

  describe('unsubscribe', () => {
    it('should send unsubscribe request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Unsubscribed' }),
      });

      const client = createClient('test-token');
      const result = await client.unsubscribe({ subscriptionId: 'sub-123' });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/unsubscribe`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('getPreferences', () => {
    it('should fetch preferences', async () => {
      const mockPrefs = {
        preferences: {
          userId: 'user-1',
          globalEnabled: true,
          quietHours: { enabled: false, startHour: 22, endHour: 8, timezone: 'UTC' },
          types: {},
          updatedAt: new Date().toISOString(),
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPrefs,
      });

      const client = createClient('test-token');
      const result = await client.getPreferences();

      expect(result.preferences.globalEnabled).toBe(true);
    });
  });

  describe('updatePreferences', () => {
    it('should send preference updates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          preferences: {
            globalEnabled: false,
          },
        }),
      });

      const client = createClient('test-token');
      await client.updatePreferences({ globalEnabled: false });

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/preferences/update`,
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  describe('testNotification', () => {
    it('should send test notification request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          messageId: 'msg-123',
          result: { total: 1, successful: 1, failed: 0 },
        }),
      });

      const client = createClient('test-token');
      const result = await client.testNotification();

      expect(result.messageId).toBe('msg-123');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/test`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('sendNotification', () => {
    it('should send notification request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          messageId: 'msg-123',
          result: { total: 10, successful: 9, failed: 1 },
        }),
      });

      const client = createClient('admin-token');
      const result = await client.sendNotification({
        type: 'system',
        payload: { title: 'Test', body: 'Body' },
      });

      expect(result.result.total).toBe(10);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/send`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('network error handling', () => {
    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = createClient('test-token');

      await expect(client.getVapidKey()).rejects.toThrow('Failed to fetch');
    });
  });
});

describe('urlBase64ToUint8Array', () => {
  it('should convert base64url to Uint8Array', () => {
    const input = 'SGVsbG8gV29ybGQ'; // "Hello World" in base64url
    const result = urlBase64ToUint8Array(input);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(11);
    expect(String.fromCharCode(...result)).toBe('Hello World');
  });

  it('should handle base64url with - and _', () => {
    const input = 'SGVs-G8g_29ybGQ'; // With base64url characters
    const result = urlBase64ToUint8Array(input);

    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should handle padding correctly', () => {
    // Test different padding scenarios
    const test1 = urlBase64ToUint8Array('YQ'); // 'a' - needs == padding
    expect(test1.length).toBe(1);

    const test2 = urlBase64ToUint8Array('YWI'); // 'ab' - needs = padding
    expect(test2.length).toBe(2);

    const test3 = urlBase64ToUint8Array('YWJj'); // 'abc' - no padding needed
    expect(test3.length).toBe(3);
  });
});
