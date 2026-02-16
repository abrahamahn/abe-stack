// main/client/api/src/api/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createApiClient } from './client';

describe('createApiClient', () => {
  const mockFetch = vi.fn();
  const baseUrl = 'http://localhost:3000';
  const validUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    bio: null,
    city: null,
    state: null,
    country: null,
    language: null,
    website: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  } as const;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should create an api client with all expected methods', () => {
    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });

    expect(client).toHaveProperty('login');
    expect(client).toHaveProperty('register');
    expect(client).toHaveProperty('refresh');
    expect(client).toHaveProperty('logout');
    expect(client).toHaveProperty('getCurrentUser');
    expect(client).toHaveProperty('forgotPassword');
    expect(client).toHaveProperty('resetPassword');
    expect(client).toHaveProperty('verifyEmail');
  });

  it('should call login endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: validUser }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.login({ identifier: 'test@example.com', password: 'password123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'test@example.com', password: 'password123' }),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({ user: validUser });
  });

  it('should accept cookie-session login shape with only user payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { ...validUser, email: 'legacy@example.com' },
        }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.login({
      identifier: 'legacy@example.com',
      password: 'password123',
    });

    expect(result).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          id: validUser.id,
          email: 'legacy@example.com',
          role: 'user',
        }),
      }),
    );
  });

  it('should accept canonical user-only login shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { ...validUser },
        }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    await expect(
      client.login({ identifier: 'test@example.com', password: 'password123' }),
    ).resolves.toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          id: validUser.id,
          email: validUser.email,
        }),
      }),
    );
  });

  it('should refresh CSRF token and retry once for mutating requests', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Invalid CSRF token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: 'csrf-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: validUser }),
      });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.login({ identifier: 'test@example.com', password: 'password123' });

    expect(result).toEqual({ user: validUser });
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/csrf-token',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
    const thirdCall = mockFetch.mock.calls[2] as [string, RequestInit];
    const headers = thirdCall[1].headers as Headers;
    expect(headers.get('x-csrf-token')).toBe('csrf-123');
  });

  it('should reject legacy token login shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'token123', user: validUser }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    await expect(
      client.login({ identifier: 'test@example.com', password: 'password123' }),
    ).rejects.toThrow('Invalid login response shape (keys=token,user)');
  });

  it('should call forgotPassword endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Email sent' }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.forgotPassword({ email: 'test@example.com' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/forgot-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({ message: 'Email sent' });
  });

  it('should call resetPassword endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Password reset' }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.resetPassword({ token: 'reset-token', password: 'newpassword123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'reset-token', password: 'newpassword123' }),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({ message: 'Password reset' });
  });

  it('should call verifyEmail endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ verified: true, token: 'verify-token', user: validUser }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.verifyEmail({ token: 'verify-token' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/verify-email',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'verify-token' }),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({ verified: true, token: 'verify-token', user: validUser });
  });

  it('should include authorization header when token is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(validUser),
    });

    const client = createApiClient({
      baseUrl,
      fetchImpl: mockFetch,
      getToken: () => 'test-token',
    });
    await client.getCurrentUser();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/me',
      expect.objectContaining({
        credentials: 'include',
      }),
    );

    // Check headers separately since Headers is not a plain object
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should throw error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });

    await expect(client.getCurrentUser()).rejects.toThrow('Unauthorized');
  });

  it('should throw NetworkError when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });

    await expect(
      client.login({ identifier: 'test@example.com', password: 'pass' }),
    ).rejects.toThrow('Failed to fetch POST /auth/login');
  });

  it('should throw NetworkError with original error stored when fetch fails', async () => {
    const originalError = new Error('DNS lookup failed');
    mockFetch.mockRejectedValueOnce(originalError);

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });

    try {
      await client.getCurrentUser();
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toHaveProperty('message', 'Failed to fetch GET /users/me');
      expect(error).toHaveProperty('originalError', originalError);
    }
  });

  it('should handle non-Error thrown from fetch', async () => {
    mockFetch.mockRejectedValueOnce('string error');

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });

    await expect(client.getCurrentUser()).rejects.toThrow('Failed to fetch GET /users/me');
  });

  it('should handle JSON parse failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });

    await expect(client.getCurrentUser()).rejects.toThrow();
  });

  it('should call register endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'pending_verification',
          message: 'Please verify your email',
          email: 'new@example.com',
        }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.register({
      email: 'new@example.com',
      password: 'password123',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      tosAccepted: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'password123',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          tosAccepted: true,
        }),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({
      status: 'pending_verification',
      message: 'Please verify your email',
      email: 'new@example.com',
    });
  });

  it('should call refresh endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'new-token' }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.refresh();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({ token: 'new-token' });
  });

  it('should call logout endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Logged out' }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.logout();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({ message: 'Logged out' });
  });

  it('should call resendVerification endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Verification email sent' }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.resendVerification({ email: 'test@example.com' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/resend-verification',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({ message: 'Verification email sent' });
  });

  it('should trim trailing slashes from baseUrl', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(validUser),
    });

    const client = createApiClient({ baseUrl: 'http://localhost:3000///', fetchImpl: mockFetch });
    await client.getCurrentUser();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/me',
      expect.any(Object),
    );
  });
});
