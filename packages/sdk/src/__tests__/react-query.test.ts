// packages/sdk/src/__tests__/react-query.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createReactQueryClient } from '../react-query';

// Mock @ts-rest/react-query
vi.mock('@ts-rest/react-query', () => ({
  initQueryClient: vi.fn((contract, options) => {
    // Return a mock client that captures the api function
    return {
      _contract: contract,
      _options: options,
      // Expose api for testing
      _api: options.api,
    };
  }),
}));

// Mock @abe-stack/core
vi.mock('@abe-stack/core', () => ({
  addAuthHeader: vi.fn((headers, token) => {
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }),
  apiContract: { routes: {} },
}));

describe('createReactQueryClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.clearAllMocks();
  });

  test('should create a client with base URL', () => {
    const client = createReactQueryClient({
      baseUrl: 'https://api.example.com',
      fetchImpl: mockFetch,
    });

    expect(client).toBeDefined();
    expect(client._options.baseUrl).toBe('https://api.example.com');
  });

  describe('api function', () => {
    test('should make fetch request with correct method and path', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ data: 'test' }),
      });

      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        fetchImpl: mockFetch,
      });

      await client._api({
        path: '/users',
        method: 'GET',
        headers: {},
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    test('should add auth header when getToken returns a token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        getToken: () => 'my-token',
        fetchImpl: mockFetch,
      });

      await client._api({
        path: '/users',
        method: 'GET',
        headers: {},
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );

      const calledHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(calledHeaders.get('Authorization')).toBe('Bearer my-token');
    });

    test('should set Content-Type to application/json', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        fetchImpl: mockFetch,
      });

      await client._api({
        path: '/users',
        method: 'GET',
        headers: {},
      });

      const calledHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(calledHeaders.get('Content-Type')).toBe('application/json');
    });

    test('should stringify body for POST requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: () => Promise.resolve({ id: 1 }),
      });

      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        fetchImpl: mockFetch,
      });

      await client._api({
        path: '/users',
        method: 'POST',
        headers: {},
        body: { name: 'John' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          body: JSON.stringify({ name: 'John' }),
        }),
      );
    });

    test('should call onUnauthorized on 401 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const onUnauthorized = vi.fn();
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        onUnauthorized,
        fetchImpl: mockFetch,
      });

      await client._api({
        path: '/users',
        method: 'GET',
        headers: {},
      });

      expect(onUnauthorized).toHaveBeenCalled();
    });

    test('should call onServerError on 5xx response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'Database error' }),
      });

      const onServerError = vi.fn();
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        onServerError,
        fetchImpl: mockFetch,
      });

      await client._api({
        path: '/users',
        method: 'GET',
        headers: {},
      });

      expect(onServerError).toHaveBeenCalledWith('Database error');
    });

    test('should use statusText when no message in response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      const onServerError = vi.fn();
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        onServerError,
        fetchImpl: mockFetch,
      });

      await client._api({
        path: '/users',
        method: 'GET',
        headers: {},
      });

      expect(onServerError).toHaveBeenCalledWith('Service Unavailable');
    });

    test('should return response with status and body', async () => {
      const responseBody = { id: 1, name: 'John' };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'x-custom': 'value' }),
        json: () => Promise.resolve(responseBody),
      });

      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        fetchImpl: mockFetch,
      });

      const result = await client._api({
        path: '/users/1',
        method: 'GET',
        headers: {},
      });

      expect(result.status).toBe(200);
      expect(result.body).toEqual(responseBody);
      expect(result.headers).toBeInstanceOf(Headers);
    });

    test('should handle JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
        json: () => Promise.reject(new Error('No content')),
      });

      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        fetchImpl: mockFetch,
      });

      const result = await client._api({
        path: '/users/1',
        method: 'DELETE',
        headers: {},
      });

      expect(result.status).toBe(204);
      expect(result.body).toBeUndefined();
    });
  });
});
