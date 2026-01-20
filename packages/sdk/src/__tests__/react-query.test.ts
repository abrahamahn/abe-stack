// packages/sdk/src/__tests__/react-query.test.ts
import { describe, expect, test, vi } from 'vitest';

import { createReactQueryClient, type CreateApiOptions } from '../react-query';

describe('createReactQueryClient', () => {
  describe('client creation', () => {
    test('should create a client with required options', () => {
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
      });

      // Verify the client has the expected route namespaces with methods
      expect(client.auth).toHaveProperty('login');
      expect(client.auth).toHaveProperty('register');
      expect(client.users).toHaveProperty('me');
    });

    test('should create a client with all options', () => {
      const options: CreateApiOptions = {
        baseUrl: 'https://api.example.com',
        getToken: () => 'test-token',
        onUnauthorized: vi.fn(),
        onServerError: vi.fn(),
        fetchImpl: vi.fn(),
      };

      const client = createReactQueryClient(options);

      // Verify client was created with expected structure
      expect(client.auth).toHaveProperty('login');
      expect(client.users).toHaveProperty('me');
    });
  });

  describe('client routes', () => {
    test('should have auth routes with mutation hooks', () => {
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
      });

      // ts-rest react-query creates useMutation for POST endpoints
      expect(typeof client.auth.login.useMutation).toBe('function');
      expect(typeof client.auth.register.useMutation).toBe('function');
      expect(typeof client.auth.logout.useMutation).toBe('function');
      expect(typeof client.auth.refresh.useMutation).toBe('function');
    });

    test('should have users routes with query hooks', () => {
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
      });

      // ts-rest react-query creates useQuery for GET endpoints
      expect(typeof client.users.me.useQuery).toBe('function');
    });
  });

  describe('options callback functions', () => {
    test('getToken should be stored as callback', () => {
      const getToken = vi.fn().mockReturnValue('my-token');

      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        getToken,
      });

      // The token getter is stored but not immediately called
      // It's called when making requests - verify client was created
      expect(client.auth).toHaveProperty('login');
      expect(getToken).not.toHaveBeenCalled(); // Not called until request
    });

    test('error callbacks should not be called during client creation', () => {
      const onUnauthorized = vi.fn();
      const onServerError = vi.fn();

      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        onUnauthorized,
        onServerError,
      });

      // Callbacks are stored but not called during creation
      expect(client.auth).toHaveProperty('login');
      expect(onUnauthorized).not.toHaveBeenCalled();
      expect(onServerError).not.toHaveBeenCalled();
    });
  });
});
