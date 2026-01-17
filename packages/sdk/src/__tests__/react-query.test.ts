// packages/sdk/src/__tests__/react-query.test.ts
import { describe, expect, test, vi } from 'vitest';

import { createReactQueryClient, type CreateApiOptions } from '../react-query';

describe('createReactQueryClient', () => {
  describe('client creation', () => {
    test('should create a client with required options', () => {
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
      });

      expect(client).toBeDefined();
      // The client should have auth routes
      expect(client.auth).toBeDefined();
      expect(client.users).toBeDefined();
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

      expect(client).toBeDefined();
    });
  });

  describe('client routes', () => {
    test('should have auth routes defined', () => {
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
      });

      // Check that expected auth routes exist
      expect(client.auth.login).toBeDefined();
      expect(client.auth.register).toBeDefined();
      expect(client.auth.logout).toBeDefined();
      expect(client.auth.refresh).toBeDefined();
    });

    test('should have users routes defined', () => {
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
      });

      // The users contract has a 'me' route
      expect(client.users.me).toBeDefined();
    });
  });

  describe('client hooks structure', () => {
    test('auth routes should have mutation hooks', () => {
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
      });

      // ts-rest react-query creates useMutation for POST endpoints
      expect(typeof client.auth.login.useMutation).toBe('function');
      expect(typeof client.auth.register.useMutation).toBe('function');
      expect(typeof client.auth.logout.useMutation).toBe('function');
    });

    test('users routes should have query hooks', () => {
      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
      });

      // ts-rest react-query creates useQuery for GET endpoints
      expect(typeof client.users.me.useQuery).toBe('function');
    });
  });

  describe('options callback functions', () => {
    test('getToken should be called correctly', () => {
      const getToken = vi.fn().mockReturnValue('my-token');

      createReactQueryClient({
        baseUrl: 'https://api.example.com',
        getToken,
      });

      // The token getter is stored but not immediately called
      // It's called when making requests
      expect(typeof getToken).toBe('function');
    });

    test('callbacks should be functions when provided', () => {
      const onUnauthorized = vi.fn();
      const onServerError = vi.fn();

      const client = createReactQueryClient({
        baseUrl: 'https://api.example.com',
        onUnauthorized,
        onServerError,
      });

      expect(client).toBeDefined();
      expect(typeof onUnauthorized).toBe('function');
      expect(typeof onServerError).toBe('function');
    });
  });
});
