// main/client/api/src/notifications/client.test.ts
/**
 * Notification Client Tests
 *
 * Tests for the notification API client.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNotificationClient, urlBase64ToUint8Array } from './client';

describe('Notification Client', () => {
  const baseUrl = 'http://localhost:3001';
  const validId = '550e8400-e29b-41d4-a716-446655440000';
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
      getToken: token !== undefined ? () => token : () => null,
      fetchImpl: mockFetch as any,
    });

  describe('getVapidKey', () => {
    it('should fetch VAPID key without auth', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ publicKey: 'test-public-key' }),
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
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('should send subscription with auth', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ subscriptionId: validId, message: 'Subscribed' }),
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

      expect(result.subscriptionId).toBe(validId);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/subscribe`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        }),
      );

      // Check auth header
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid subscription' }),
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
        json: () => Promise.resolve({ success: true, message: 'Unsubscribed' }),
      });

      const client = createClient('test-token');
      const result = await client.unsubscribe({
        subscriptionId: '550e8400-e29b-41d4-a716-446655440000',
      });

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
          userId: validId,
          globalEnabled: true,
          quietHours: { enabled: false, startHour: 22, endHour: 8, timezone: 'UTC' },
          types: {},
          updatedAt: new Date().toISOString(),
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrefs),
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
        json: () =>
          Promise.resolve({
            preferences: {
              userId: validId,
              globalEnabled: false,
              quietHours: { enabled: false, startHour: 22, endHour: 8, timezone: 'UTC' },
              types: {},
              updatedAt: new Date().toISOString(),
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
        json: () =>
          Promise.resolve({
            messageId: validId,
            result: {
              total: 1,
              successful: 1,
              failed: 0,
              results: [{ success: true, subscriptionId: validId }],
              expiredSubscriptions: [],
            },
          }),
      });

      const client = createClient('test-token');
      const result = await client.testNotification();

      expect(result.messageId).toBe(validId);
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
        json: () =>
          Promise.resolve({
            messageId: validId,
            result: {
              total: 10,
              successful: 9,
              failed: 1,
              results: [{ success: true, subscriptionId: validId }],
              expiredSubscriptions: [],
            },
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

  describe('listNotifications', () => {
    it('should fetch in-app notifications', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [
              {
                id: validId,
                userId: validId,
                type: 'info',
                title: 'Test',
                message: 'Hello',
                isRead: false,
                createdAt: new Date().toISOString(),
              },
            ],
            unreadCount: 1,
          }),
      });

      const client = createClient('test-token');
      const result = await client.listNotifications(10, 5);

      expect(result.unreadCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/list?limit=10&offset=5`,
        expect.objectContaining({ credentials: 'include' }),
      );
    });
  });

  describe('markRead', () => {
    it('should mark selected notifications as read', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Marked 1 notifications as read', count: 1 }),
      });

      const client = createClient('test-token');
      const result = await client.markRead([validId]);

      expect(result.count).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/mark-read`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Marked 2 notifications as read', count: 2 }),
      });

      const client = createClient('test-token');
      const result = await client.markAllRead();

      expect(result.count).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/mark-all-read`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification by id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Notification deleted' }),
      });

      const client = createClient('test-token');
      const result = await client.deleteNotification(validId);

      expect(result.message).toBe('Notification deleted');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/notifications/delete`,
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
