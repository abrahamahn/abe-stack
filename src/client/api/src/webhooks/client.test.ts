// src/client/api/src/webhooks/client.test.ts
/**
 * Webhook Client Tests
 *
 * Comprehensive unit tests for the webhook API client.
 * Tests all endpoints, auth handling, error cases, and edge cases.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWebhookClient } from './client';

import type {
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookDeleteResponse,
  WebhookItem,
  WebhookListResponse,
  WebhookMutationResponse,
  WebhookResponse,
  WebhookWithDeliveries,
  RotateSecretResponse,
} from './client';

describe('createWebhookClient', () => {
  const baseUrl = 'https://api.example.com';
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to create client with optional token
   */
  const createClient = (token?: string) =>
    createWebhookClient({
      baseUrl,
      getToken: token !== undefined ? () => token : () => null,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

  /**
   * Helper to create mock webhook item
   */
  const createMockWebhook = (overrides?: Partial<WebhookItem>): WebhookItem => ({
    id: 'webhook-1',
    tenantId: 'tenant-123',
    url: 'https://example.com/webhook',
    events: ['user.created', 'user.updated'],
    secret: 'whsec_abcdef123456',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('client initialization', () => {
    it('should create client with all expected methods', () => {
      const client = createClient();

      expect(client).toHaveProperty('create');
      expect(client).toHaveProperty('list');
      expect(client).toHaveProperty('get');
      expect(client).toHaveProperty('update');
      expect(client).toHaveProperty('remove');
      expect(client).toHaveProperty('rotateSecret');
    });

    it('should trim trailing slashes from baseUrl', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webhooks: [] }),
      });

      const client = createWebhookClient({
        baseUrl: 'https://api.example.com///',
        fetchImpl: mockFetch as unknown as typeof fetch,
      });

      await client.list();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/webhooks/list',
        expect.any(Object),
      );
    });
  });

  describe('create', () => {
    it('should create webhook with authentication', async () => {
      const createRequest: CreateWebhookRequest = {
        url: 'https://example.com/webhook',
        events: ['user.created', 'user.updated'],
      };

      const mockResponse: WebhookMutationResponse = {
        webhook: createMockWebhook(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.create(createRequest);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/webhooks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(createRequest),
          credentials: 'include',
        }),
      );

      // Verify auth header and content-type are set
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should create webhook with single event', async () => {
      const createRequest: CreateWebhookRequest = {
        url: 'https://example.com/webhook',
        events: ['payment.success'],
      };

      const mockResponse: WebhookMutationResponse = {
        webhook: createMockWebhook({ events: ['payment.success'] }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.create(createRequest);

      expect(result.webhook.events).toEqual(['payment.success']);
    });

    it('should handle invalid URL', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid webhook URL' }),
      });

      const client = createClient('test-token');

      await expect(
        client.create({
          url: 'not-a-url',
          events: ['user.created'],
        }),
      ).rejects.toThrow('Invalid webhook URL');
    });

    it('should handle empty events array', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Events array cannot be empty' }),
      });

      const client = createClient('test-token');

      await expect(
        client.create({
          url: 'https://example.com/webhook',
          events: [],
        }),
      ).rejects.toThrow('Events array cannot be empty');
    });

    it('should handle unauthorized access', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const client = createClient();

      await expect(
        client.create({
          url: 'https://example.com/webhook',
          events: ['user.created'],
        }),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('list', () => {
    it('should fetch webhooks with authentication', async () => {
      const mockWebhooks: WebhookListResponse = {
        webhooks: [
          createMockWebhook({ id: 'webhook-1' }),
          createMockWebhook({ id: 'webhook-2', url: 'https://example.com/webhook2' }),
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWebhooks),
      });

      const client = createClient('test-token');
      const result = await client.list();

      expect(result).toEqual(mockWebhooks);
      expect(result.webhooks).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/webhooks/list',
        expect.objectContaining({
          credentials: 'include',
        }),
      );

      // Verify auth header is sent
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should handle empty webhooks list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webhooks: [] }),
      });

      const client = createClient('test-token');
      const result = await client.list();

      expect(result.webhooks).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal Server Error' }),
      });

      const client = createClient('test-token');

      await expect(client.list()).rejects.toThrow('Internal Server Error');
    });
  });

  describe('get', () => {
    it('should fetch single webhook with deliveries', async () => {
      const mockWebhookWithDeliveries: WebhookWithDeliveries = {
        ...createMockWebhook(),
        recentDeliveries: [
          {
            id: 'delivery-1',
            eventType: 'user.created',
            status: 'delivered',
            attempts: 1,
            createdAt: '2024-01-02T00:00:00Z',
            deliveredAt: '2024-01-02T00:00:01Z',
          },
          {
            id: 'delivery-2',
            eventType: 'user.updated',
            status: 'failed',
            attempts: 3,
            createdAt: '2024-01-03T00:00:00Z',
            deliveredAt: null,
          },
        ],
      };

      const mockResponse: WebhookResponse = {
        webhook: mockWebhookWithDeliveries,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.get('webhook-1');

      expect(result).toEqual(mockResponse);
      expect(result.webhook.recentDeliveries).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/webhooks/webhook-1',
        expect.objectContaining({
          credentials: 'include',
        }),
      );

      // Verify auth header is sent
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should fetch webhook with no deliveries', async () => {
      const mockResponse: WebhookResponse = {
        webhook: {
          ...createMockWebhook(),
          recentDeliveries: [],
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.get('webhook-1');

      expect(result.webhook.recentDeliveries).toEqual([]);
    });

    it('should handle 404 when webhook not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Webhook not found' }),
      });

      const client = createClient('test-token');

      await expect(client.get('nonexistent')).rejects.toThrow('Webhook not found');
    });

    it('should handle forbidden access', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Forbidden' }),
      });

      const client = createClient('test-token');

      await expect(client.get('webhook-1')).rejects.toThrow('Forbidden');
    });
  });

  describe('update', () => {
    it('should update webhook URL', async () => {
      const updateRequest: UpdateWebhookRequest = {
        url: 'https://example.com/new-webhook',
      };

      const mockResponse: WebhookMutationResponse = {
        webhook: createMockWebhook({ url: 'https://example.com/new-webhook' }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.update('webhook-1', updateRequest);

      expect(result).toEqual(mockResponse);
      expect(result.webhook.url).toBe('https://example.com/new-webhook');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/webhooks/webhook-1/update',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(updateRequest),
          credentials: 'include',
        }),
      );

      // Verify Content-Type header
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should update webhook events', async () => {
      const updateRequest: UpdateWebhookRequest = {
        events: ['payment.success', 'payment.failed'],
      };

      const mockResponse: WebhookMutationResponse = {
        webhook: createMockWebhook({ events: ['payment.success', 'payment.failed'] }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.update('webhook-1', updateRequest);

      expect(result.webhook.events).toEqual(['payment.success', 'payment.failed']);
    });

    it('should update webhook active status', async () => {
      const updateRequest: UpdateWebhookRequest = {
        isActive: false,
      };

      const mockResponse: WebhookMutationResponse = {
        webhook: createMockWebhook({ isActive: false }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.update('webhook-1', updateRequest);

      expect(result.webhook.isActive).toBe(false);
    });

    it('should update multiple webhook properties', async () => {
      const updateRequest: UpdateWebhookRequest = {
        url: 'https://example.com/new-webhook',
        events: ['user.deleted'],
        isActive: false,
      };

      const mockResponse: WebhookMutationResponse = {
        webhook: createMockWebhook({
          url: 'https://example.com/new-webhook',
          events: ['user.deleted'],
          isActive: false,
        }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.update('webhook-1', updateRequest);

      expect(result.webhook.url).toBe('https://example.com/new-webhook');
      expect(result.webhook.events).toEqual(['user.deleted']);
      expect(result.webhook.isActive).toBe(false);
    });

    it('should handle invalid URL', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid webhook URL' }),
      });

      const client = createClient('test-token');

      await expect(
        client.update('webhook-1', {
          url: 'not-a-url',
        }),
      ).rejects.toThrow('Invalid webhook URL');
    });

    it('should handle webhook not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Webhook not found' }),
      });

      const client = createClient('test-token');

      await expect(
        client.update('nonexistent', {
          url: 'https://example.com/webhook',
        }),
      ).rejects.toThrow('Webhook not found');
    });
  });

  describe('remove', () => {
    it('should remove webhook', async () => {
      const mockResponse: WebhookDeleteResponse = {
        message: 'Webhook deleted successfully',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.remove('webhook-1');

      expect(result).toEqual(mockResponse);
      expect(result.message).toBe('Webhook deleted successfully');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/webhooks/webhook-1/delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
          credentials: 'include',
        }),
      );
    });

    it('should handle webhook not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Webhook not found' }),
      });

      const client = createClient('test-token');

      await expect(client.remove('nonexistent')).rejects.toThrow('Webhook not found');
    });

    it('should handle forbidden access', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Forbidden' }),
      });

      const client = createClient('test-token');

      await expect(client.remove('webhook-1')).rejects.toThrow('Forbidden');
    });
  });

  describe('rotateSecret', () => {
    it('should rotate webhook secret', async () => {
      const mockResponse: RotateSecretResponse = {
        webhook: createMockWebhook({ secret: 'whsec_newSecret789' }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.rotateSecret('webhook-1');

      expect(result).toEqual(mockResponse);
      expect(result.webhook.secret).toBe('whsec_newSecret789');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/webhooks/webhook-1/rotate-secret',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
          credentials: 'include',
        }),
      );

      // Verify auth header
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should handle webhook not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Webhook not found' }),
      });

      const client = createClient('test-token');

      await expect(client.rotateSecret('nonexistent')).rejects.toThrow('Webhook not found');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Too many requests' }),
      });

      const client = createClient('test-token');

      await expect(client.rotateSecret('webhook-1')).rejects.toThrow('Too many requests');
    });
  });

  describe('error handling', () => {
    it('should throw NetworkError when fetch fails', async () => {
      const networkError = new Error('Network connection lost');
      mockFetch.mockRejectedValue(networkError);

      const client = createClient('test-token');

      await expect(client.list()).rejects.toThrow('Failed to fetch GET /webhooks/list');
    });

    it('should throw NetworkError with original error stored', async () => {
      const originalError = new Error('DNS resolution failed');
      mockFetch.mockRejectedValue(originalError);

      const client = createClient('test-token');

      try {
        await client.get('webhook-1');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toHaveProperty('message', 'Failed to fetch GET /webhooks/webhook-1');
        expect(error).toHaveProperty('originalError', originalError);
      }
    });

    it('should handle non-Error thrown from fetch', async () => {
      mockFetch.mockRejectedValue('string error');

      const client = createClient('test-token');

      await expect(client.list()).rejects.toThrow('Failed to fetch GET /webhooks/list');
    });

    it('should handle JSON parse failure gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const client = createClient('test-token');

      await expect(client.list()).rejects.toThrow();
    });

    it('should handle successful response with invalid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Malformed JSON')),
      });

      const client = createClient('test-token');

      const result = await client.list();

      // Should return empty object when JSON parsing fails
      expect(result).toEqual({});
    });

    it('should include correct method in NetworkError for POST requests', async () => {
      mockFetch.mockRejectedValue(new Error('Connection timeout'));

      const client = createClient('test-token');

      await expect(
        client.create({
          url: 'https://example.com/webhook',
          events: ['user.created'],
        }),
      ).rejects.toThrow('Failed to fetch POST /webhooks');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Too many requests' }),
      });

      const client = createClient('test-token');

      await expect(client.list()).rejects.toThrow('Too many requests');
    });

    it('should handle conflict errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Webhook URL already exists' }),
      });

      const client = createClient('test-token');

      await expect(
        client.create({
          url: 'https://example.com/webhook',
          events: ['user.created'],
        }),
      ).rejects.toThrow('Webhook URL already exists');
    });
  });

  describe('authentication handling', () => {
    it('should include auth header for authenticated endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webhooks: [] }),
      });

      const client = createClient('auth-token-123');
      await client.list();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer auth-token-123');
    });

    it('should handle missing token gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webhooks: [] }),
      });

      const client = createClient();
      await client.list();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle null token from getToken', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webhooks: [] }),
      });

      const client = createWebhookClient({
        baseUrl,
        getToken: () => null,
        fetchImpl: mockFetch as unknown as typeof fetch,
      });

      await client.list();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });
  });

  describe('request configuration', () => {
    it('should always include credentials: include', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webhooks: [] }),
      });

      const client = createClient();
      await client.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should always set Content-Type header to application/json', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webhooks: [] }),
      });

      const client = createClient('test-token');
      await client.list();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should construct correct API URLs with /api prefix', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webhooks: [] }),
      });

      const client = createClient();
      await client.list();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/webhooks/list',
        expect.any(Object),
      );
    });
  });
});
