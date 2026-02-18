// main/client/api/src/devices/client.test.ts
/**
 * Device Client Tests
 *
 * Tests for the device management API client.
 */

import { BadRequestError, NotFoundError, UnauthorizedError } from '@bslt/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkError } from '../errors';

import { createDeviceClient } from './client';

import type { DeviceClientConfig, DeviceItem } from './client';

// Mock addAuthHeader from shared
vi.mock('@bslt/shared', async () => {
  const actual = await vi.importActual<typeof import('@bslt/shared')>('@bslt/shared');
  return {
    ...actual,
    addAuthHeader: vi.fn((headers: Headers, token: string | null) => {
      if (token !== null && token !== undefined && token !== '') {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    }),
  };
});

describe('Device Client', () => {
  const baseUrl = 'http://localhost:3001';
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  const createClient = (token?: string | null) => {
    const config: DeviceClientConfig = { baseUrl };
    if (token !== undefined) {
      config.getToken = () => token;
    }
    return createDeviceClient(config);
  };

  const mockDevice: DeviceItem = {
    id: 'device-1',
    deviceFingerprint: 'fp-123',
    label: 'My Device',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    firstSeenAt: '2025-01-01T00:00:00Z',
    lastSeenAt: '2025-01-02T00:00:00Z',
    trusted: false,
    createdAt: '2025-01-01T00:00:00Z',
  };

  describe('listDevices', () => {
    it('should fetch device list with auth token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ devices: [mockDevice] }),
      });

      const client = createClient('test-token');
      const result = await client.listDevices();

      expect(result.devices).toHaveLength(1);
      expect(result.devices[0]).toEqual(mockDevice);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/users/me/devices`,
        expect.objectContaining({
          headers: expect.any(Headers),
          credentials: 'include',
        }),
      );

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should fetch device list without auth token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ devices: [] }),
      });

      const client = createClient(null);
      const result = await client.listDevices();

      expect(result.devices).toHaveLength(0);

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should return empty array when no devices', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ devices: [] }),
      });

      const client = createClient('test-token');
      const result = await client.listDevices();

      expect(result.devices).toEqual([]);
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = createClient('test-token');

      await expect(client.listDevices()).rejects.toThrow(NetworkError);
      await expect(client.listDevices()).rejects.toThrow('Failed to fetch GET /users/me/devices');
    });

    it('should throw UnauthorizedError on 401 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const client = createClient('invalid-token');

      await expect(client.listDevices()).rejects.toThrow(UnauthorizedError);
      await expect(client.listDevices()).rejects.toThrow('Unauthorized');
    });

    it('should handle error response with missing body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const client = createClient('test-token');

      await expect(client.listDevices()).rejects.toThrow('HTTP 500');
    });
  });

  describe('trustDevice', () => {
    it('should trust device with correct endpoint', async () => {
      const trustedDevice = { ...mockDevice, trusted: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ device: trustedDevice }),
      });

      const client = createClient('test-token');
      const result = await client.trustDevice('device-1');

      expect(result.device.trusted).toBe(true);
      expect(result.device.id).toBe('device-1');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/users/me/devices/device-1/trust`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
          credentials: 'include',
        }),
      );

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should throw NotFoundError when device does not exist', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Device not found' }),
      });

      const client = createClient('test-token');

      await expect(client.trustDevice('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(client.trustDevice('nonexistent')).rejects.toThrow('Device not found');
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = createClient('test-token');

      await expect(client.trustDevice('device-1')).rejects.toThrow(NetworkError);
    });
  });

  describe('revokeDevice', () => {
    it('should revoke device with DELETE method', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Device revoked successfully' }),
      });

      const client = createClient('test-token');
      const result = await client.revokeDevice('device-1');

      expect(result.message).toBe('Device revoked successfully');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/users/me/devices/device-1`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.any(Headers),
          credentials: 'include',
        }),
      );

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should throw NotFoundError when device does not exist', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Device not found', code: 'DEVICE_NOT_FOUND' }),
      });

      const client = createClient('test-token');

      await expect(client.revokeDevice('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Authentication required' }),
      });

      const client = createClient(null);

      await expect(client.revokeDevice('device-1')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = createClient('test-token');

      await expect(client.revokeDevice('device-1')).rejects.toThrow(NetworkError);
    });
  });

  describe('invalidateSessions', () => {
    it('should invalidate all sessions with POST method', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'All sessions invalidated' }),
      });

      const client = createClient('test-token');
      const result = await client.invalidateSessions();

      expect(result.message).toBe('All sessions invalidated');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/auth/invalidate-sessions`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
          credentials: 'include',
        }),
      );

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should throw UnauthorizedError when not authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Authentication required' }),
      });

      const client = createClient(null);

      await expect(client.invalidateSessions()).rejects.toThrow(UnauthorizedError);
      await expect(client.invalidateSessions()).rejects.toThrow('Authentication required');
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = createClient('test-token');

      await expect(client.invalidateSessions()).rejects.toThrow(NetworkError);
    });

    it('should throw BadRequestError on 400 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid request', code: 'BAD_REQUEST' }),
      });

      const client = createClient('test-token');

      await expect(client.invalidateSessions()).rejects.toThrow(BadRequestError);
      await expect(client.invalidateSessions()).rejects.toThrow('Invalid request');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle error response with details', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: { field: 'deviceId', reason: 'invalid format' },
          }),
      });

      const client = createClient('test-token');

      await expect(client.trustDevice('invalid')).rejects.toThrow(BadRequestError);
      await expect(client.trustDevice('invalid')).rejects.toThrow('Validation failed');
    });

    it('should handle error response without message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      const client = createClient('test-token');

      await expect(client.listDevices()).rejects.toThrow('HTTP 500');
    });

    it('should handle malformed error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const client = createClient('test-token');

      await expect(client.listDevices()).rejects.toThrow('HTTP 503');
    });
  });

  describe('configuration edge cases', () => {
    it('should work without getToken function', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ devices: [] }),
      });

      const client = createDeviceClient({ baseUrl });
      const result = await client.listDevices();

      expect(result.devices).toEqual([]);

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle empty token string', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ devices: [] }),
      });

      const client = createClient('');
      await client.listDevices();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle baseUrl with trailing slash', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ devices: [] }),
      });

      const client = createDeviceClient({ baseUrl: 'http://localhost:3001/' });
      await client.listDevices();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/me/devices',
        expect.anything(),
      );
    });
  });

  describe('credentials setting', () => {
    it('should always include credentials', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ devices: [] }),
      });

      const client = createClient('test-token');
      await client.listDevices();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });
  });
});
