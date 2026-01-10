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

  it('should include authorization header when token is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '1', email: 'test@example.com' }),
    });

    const client = createApiClient({
      baseUrl,
      fetchImpl: mockFetch,
      getToken: () => 'my-token',
    });

    await client.getCurrentUser();

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const calledHeaders = callArgs[1].headers as Headers;
    expect(calledHeaders.get('Authorization')).toBe('Bearer my-token');
  });

  it('should throw an error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    });

    const client = createApiClient({ baseUrl, fetchImpl: mockFetch });

    await expect(client.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials',
    );
  });

  it('should trim trailing slashes from baseUrl', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '1' }),
    });

    const client = createApiClient({ baseUrl: 'http://localhost:3000/', fetchImpl: mockFetch });
    await client.getCurrentUser();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/me',
      expect.any(Object),
    );
  });
});
