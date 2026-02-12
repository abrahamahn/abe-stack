// src/client/api/src/phone/client.test.ts
/**
 * Phone Client Tests
 *
 * Comprehensive unit tests for the phone/SMS API client.
 * Tests all methods, authentication, error handling, and schema validation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPhoneClient } from './client';

import type { PhoneClientConfig } from './client';
import type { User, UserId } from '@abe-stack/shared';

// Mock @abe-stack/shared
vi.mock('@abe-stack/shared', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/shared')>('@abe-stack/shared');
  return {
    ...actual,
    addAuthHeader: vi.fn((headers: Headers, token: string | null | undefined) => {
      if (token !== null && token !== undefined && token !== '') {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }),
    setPhoneRequestSchema: { parse: vi.fn((data) => data) },
    verifyPhoneRequestSchema: { parse: vi.fn((data) => data) },
    smsChallengeRequestSchema: { parse: vi.fn((data) => data) },
    smsVerifyRequestSchema: { parse: vi.fn((data) => data) },
  };
});

describe('createPhoneClient', () => {
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

  const createClient = (token?: string) => {
    const config: PhoneClientConfig = { baseUrl };
    if (token !== undefined) {
      config.getToken = () => token;
    }
    return createPhoneClient(config);
  };

  describe('client initialization', () => {
    it('should create client with all expected methods', () => {
      const client = createClient();

      expect(client).toHaveProperty('setPhone');
      expect(client).toHaveProperty('verifyPhone');
      expect(client).toHaveProperty('removePhone');
      expect(client).toHaveProperty('sendSmsCode');
      expect(client).toHaveProperty('verifySmsCode');
    });
  });

  describe('setPhone', () => {
    it('should send phone number with authentication', async () => {
      const mockResponse = { message: 'Verification code sent' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.setPhone('+1234567890');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/me/phone',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );

      // Verify auth header
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Content-Type')).toBe('application/json');

      // Verify request body
      const body = JSON.parse(call[1].body as string);
      expect(body).toEqual({ phone: '+1234567890' });
    });

    it('should handle phone number with different formats', async () => {
      const mockResponse = { message: 'Verification code sent' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      await client.setPhone('555-123-4567');

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const body = JSON.parse(call[1].body as string);
      expect(body.phone).toBe('555-123-4567');
    });

    it('should handle unauthorized error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const client = createClient();

      await expect(client.setPhone('+1234567890')).rejects.toThrow('Unauthorized');
    });

    it('should handle bad request error for invalid phone', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid phone number format' }),
      });

      const client = createClient('test-token');

      await expect(client.setPhone('invalid')).rejects.toThrow('Invalid phone number format');
    });

    it('should handle conflict error when phone already exists', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Phone number already in use' }),
      });

      const client = createClient('test-token');

      await expect(client.setPhone('+1234567890')).rejects.toThrow('Phone number already in use');
    });
  });

  describe('verifyPhone', () => {
    it('should verify phone with code', async () => {
      const mockResponse = { verified: true as const };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.verifyPhone('123456');

      expect(result).toEqual(mockResponse);
      expect(result.verified).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/me/phone/verify',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );

      // Verify request body
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const body = JSON.parse(call[1].body as string);
      expect(body).toEqual({ code: '123456' });
    });

    it('should handle invalid verification code', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid verification code' }),
      });

      const client = createClient('test-token');

      await expect(client.verifyPhone('000000')).rejects.toThrow('Invalid verification code');
    });

    it('should handle expired verification code', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Verification code expired' }),
      });

      const client = createClient('test-token');

      await expect(client.verifyPhone('123456')).rejects.toThrow('Verification code expired');
    });

    it('should handle missing authentication', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const client = createClient();

      await expect(client.verifyPhone('123456')).rejects.toThrow('Unauthorized');
    });
  });

  describe('removePhone', () => {
    it('should remove phone number with authentication', async () => {
      const mockResponse = { message: 'Phone number removed' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.removePhone();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/me/phone',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        }),
      );

      // Verify no body is sent
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      expect(call[1].body).toBeUndefined();
    });

    it('should handle not found when no phone exists', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'No phone number found' }),
      });

      const client = createClient('test-token');

      await expect(client.removePhone()).rejects.toThrow('No phone number found');
    });

    it('should handle unauthorized access', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const client = createClient();

      await expect(client.removePhone()).rejects.toThrow('Unauthorized');
    });
  });

  describe('sendSmsCode', () => {
    it('should send SMS code with challenge token', async () => {
      const mockResponse = { message: 'SMS code sent' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient();
      const result = await client.sendSmsCode('challenge-token-123');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/sms/send',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );

      // Verify request body
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const body = JSON.parse(call[1].body as string);
      expect(body).toEqual({ challengeToken: 'challenge-token-123' });
    });

    it('should not require authentication', async () => {
      const mockResponse = { message: 'SMS code sent' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient();
      await client.sendSmsCode('challenge-token-123');

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle invalid challenge token', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid challenge token' }),
      });

      const client = createClient();

      await expect(client.sendSmsCode('invalid-token')).rejects.toThrow('Invalid challenge token');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Too many requests. Try again later.' }),
      });

      const client = createClient();

      await expect(client.sendSmsCode('challenge-token-123')).rejects.toThrow(
        'Too many requests. Try again later.',
      );
    });

    it('should handle no phone number associated with challenge', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'No phone number found for this user' }),
      });

      const client = createClient();

      await expect(client.sendSmsCode('challenge-token-123')).rejects.toThrow(
        'No phone number found for this user',
      );
    });
  });

  describe('verifySmsCode', () => {
    it('should verify SMS code and return token and user', async () => {
      const mockUser: User = {
        id: '00000000-0000-0000-0000-000000000001' as unknown as UserId,
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        emailVerified: true,
        phone: '+1234567890',
        phoneVerified: true,
        dateOfBirth: null,
        gender: null,
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const mockResponse = {
        token: 'auth-token-xyz',
        user: mockUser,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient();
      const result = await client.verifySmsCode('challenge-token-123', '654321');

      expect(result).toEqual(mockResponse);
      expect(result.token).toBe('auth-token-xyz');
      expect(result.user.id).toBe('00000000-0000-0000-0000-000000000001' as unknown as UserId);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/sms/verify',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );

      // Verify request body
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const body = JSON.parse(call[1].body as string);
      expect(body).toEqual({
        challengeToken: 'challenge-token-123',
        code: '654321',
      });
    });

    it('should not require authentication before verification', async () => {
      const mockUser: User = {
        id: '00000000-0000-0000-0000-000000000001' as unknown as UserId,
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        emailVerified: true,
        phone: '+1234567890',
        phoneVerified: true,
        dateOfBirth: null,
        gender: null,
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'token', user: mockUser }),
      });

      const client = createClient();
      await client.verifySmsCode('challenge-token-123', '654321');

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle invalid SMS code', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid SMS code' }),
      });

      const client = createClient();

      await expect(client.verifySmsCode('challenge-token-123', '000000')).rejects.toThrow(
        'Invalid SMS code',
      );
    });

    it('should handle expired SMS code', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'SMS code expired' }),
      });

      const client = createClient();

      await expect(client.verifySmsCode('challenge-token-123', '654321')).rejects.toThrow(
        'SMS code expired',
      );
    });

    it('should handle invalid challenge token', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid challenge token' }),
      });

      const client = createClient();

      await expect(client.verifySmsCode('invalid-token', '654321')).rejects.toThrow(
        'Invalid challenge token',
      );
    });
  });

  describe('error handling', () => {
    it('should throw NetworkError when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection lost'));

      const client = createClient('test-token');

      await expect(client.setPhone('+1234567890')).rejects.toThrow('Failed to fetch POST /users/me/phone');
    });

    it('should throw NetworkError for DNS failures', async () => {
      mockFetch.mockRejectedValue(new Error('DNS resolution failed'));

      const client = createClient('test-token');

      await expect(client.verifyPhone('123456')).rejects.toThrow('Failed to fetch POST /users/me/phone/verify');
    });

    it('should handle JSON parse failure in error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const client = createClient('test-token');

      await expect(client.removePhone()).rejects.toThrow();
    });

    it('should handle empty error response body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      const client = createClient('test-token');

      await expect(client.setPhone('+1234567890')).rejects.toThrow('HTTP 500');
    });

    it('should handle malformed error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: undefined }),
      });

      const client = createClient('test-token');

      await expect(client.setPhone('+1234567890')).rejects.toThrow('HTTP 400');
    });

    it('should handle 500 internal server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal Server Error' }),
      });

      const client = createClient('test-token');

      await expect(client.verifyPhone('123456')).rejects.toThrow('Internal Server Error');
    });

    it('should handle 403 forbidden error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Forbidden' }),
      });

      const client = createClient('test-token');

      await expect(client.removePhone()).rejects.toThrow('Forbidden');
    });
  });

  describe('authentication handling', () => {
    it('should include auth header when token is provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });

      const client = createClient('my-auth-token');
      await client.setPhone('+1234567890');

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer my-auth-token');
    });

    it('should not include auth header when token is not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'SMS sent' }),
      });

      const client = createClient();
      await client.sendSmsCode('challenge-token');

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle null token from getToken', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'SMS sent' }),
      });

      const client = createPhoneClient({
        baseUrl,
        getToken: () => null,
      });

      await client.sendSmsCode('challenge-token');

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should dynamically get token on each request', async () => {
      let token = 'token-1';
      const getToken = vi.fn(() => token);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });

      const client = createPhoneClient({
        baseUrl,
        getToken,
      });

      await client.setPhone('+1234567890');
      let call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      let headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer token-1');

      // Change token and make another request
      token = 'token-2';
      await client.setPhone('+0987654321');
      call = mockFetch.mock.calls[1];
      if (call === undefined) throw new Error('Call not found');
      headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer token-2');

      expect(getToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('request configuration', () => {
    it('should always include credentials: include', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });

      const client = createClient();
      await client.sendSmsCode('challenge-token');

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
        json: () => Promise.resolve({ message: 'Success' }),
      });

      const client = createClient('test-token');
      await client.setPhone('+1234567890');

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should construct correct API URLs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });

      const client = createClient('test-token');

      await client.setPhone('+1234567890');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/me/phone',
        expect.any(Object),
      );

      await client.verifyPhone('123456');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/me/phone/verify',
        expect.any(Object),
      );

      await client.removePhone();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/me/phone',
        expect.any(Object),
      );

      await client.sendSmsCode('challenge');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/sms/send',
        expect.any(Object),
      );

      await client.verifySmsCode('challenge', '123456');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/sms/verify',
        expect.any(Object),
      );
    });

    it('should use correct HTTP methods', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });

      const client = createClient('test-token');

      await client.setPhone('+1234567890');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' }),
      );

      await client.verifyPhone('123456');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' }),
      );

      await client.removePhone();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' }),
      );

      await client.sendSmsCode('challenge');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' }),
      );

      await client.verifySmsCode('challenge', '123456');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty phone number', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });

      const client = createClient('test-token');
      await client.setPhone('');

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const body = JSON.parse(call[1].body as string);
      expect(body.phone).toBe('');
    });

    it('should handle empty verification code', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ verified: true }),
      });

      const client = createClient('test-token');
      await client.verifyPhone('');

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const body = JSON.parse(call[1].body as string);
      expect(body.code).toBe('');
    });

    it('should handle very long phone number', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });

      const longPhone = '+' + '1'.repeat(50);
      const client = createClient('test-token');
      await client.setPhone(longPhone);

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const body = JSON.parse(call[1].body as string);
      expect(body.phone).toBe(longPhone);
    });

    it('should handle special characters in challenge token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });

      const specialToken = 'token-with-@#$%^&*()-special';
      const client = createClient();
      await client.sendSmsCode(specialToken);

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const body = JSON.parse(call[1].body as string);
      expect(body.challengeToken).toBe(specialToken);
    });
  });
});
