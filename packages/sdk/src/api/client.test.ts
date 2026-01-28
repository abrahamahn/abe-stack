// packages/sdk/src/api/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createApiClient } from '../client';

describe('createApiClient', () => {
  const mockFetch = vi.fn();
  const baseUrl = 'http://localhost:3000';

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
      json: () => Promise.resolve({ accessToken: 'token123', user: { id: '1' } }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.login({ email: 'test@example.com', password: 'password123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({ accessToken: 'token123', user: { id: '1' } });
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
      json: () => Promise.resolve({ verified: true, userId: 'user-123' }),
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
    expect(result).toEqual({ verified: true, userId: 'user-123' });
  });

  it('should include authorization header when token is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '1', email: 'test@example.com' }),
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

    await expect(client.login({ email: 'test@example.com', password: 'pass' })).rejects.toThrow(
      'Failed to fetch POST /auth/login',
    );
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
      json: () => Promise.resolve({ accessToken: 'token123', user: { id: '1' } }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });
    const result = await client.register({
      email: 'new@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'password123',
          name: 'Test User',
        }),
        credentials: 'include',
      }),
    );
    expect(result).toEqual({ accessToken: 'token123', user: { id: '1' } });
  });

  it('should call refresh endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'new-token' }),
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
    expect(result).toEqual({ accessToken: 'new-token' });
  });

  it('should call logout endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
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
    expect(result).toEqual({ success: true });
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
      json: () => Promise.resolve({ id: '1' }),
    });

    const client = createApiClient({ baseUrl: 'http://localhost:3000///', fetchImpl: mockFetch });
    await client.getCurrentUser();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/me',
      expect.any(Object),
    );
  });
});
