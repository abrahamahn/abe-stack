// packages/core/src/utils/__tests__/utils.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { addAuthHeader, createTokenStore, tokenStore } from '../../index';

describe('utils', () => {
  describe('addAuthHeader', () => {
    test('should add Authorization header when token is provided', () => {
      const headers = new Headers();
      const result = addAuthHeader(headers, 'my-token');

      expect(result.get('Authorization')).toBe('Bearer my-token');
      expect(result).toBe(headers); // Returns same object for chaining
    });

    test('should not add Authorization header when token is null', () => {
      const headers = new Headers();
      const result = addAuthHeader(headers, null);

      expect(result.get('Authorization')).toBeNull();
    });

    test('should not add Authorization header when token is undefined', () => {
      const headers = new Headers();
      const result = addAuthHeader(headers, undefined);

      expect(result.get('Authorization')).toBeNull();
    });

    test('should not add Authorization header when token is empty string', () => {
      const headers = new Headers();
      const result = addAuthHeader(headers, '');

      expect(result.get('Authorization')).toBeNull();
    });

    test('should preserve existing headers', () => {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      addAuthHeader(headers, 'my-token');

      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Authorization')).toBe('Bearer my-token');
    });
  });

  describe('tokenStore', () => {
    afterEach(() => {
      tokenStore.clear();
    });

    test('should return null when no token is set', () => {
      expect(tokenStore.get()).toBeNull();
    });

    test('should store and retrieve token', () => {
      tokenStore.set('test-token');
      expect(tokenStore.get()).toBe('test-token');
    });

    test('should clear token', () => {
      tokenStore.set('test-token');
      tokenStore.clear();
      expect(tokenStore.get()).toBeNull();
    });

    test('should overwrite existing token', () => {
      tokenStore.set('first-token');
      tokenStore.set('second-token');
      expect(tokenStore.get()).toBe('second-token');
    });
  });

  describe('createTokenStore.memory', () => {
    test('should create isolated memory store', () => {
      const store1 = createTokenStore.memory();
      const store2 = createTokenStore.memory();

      store1.set('token1');
      store2.set('token2');

      expect(store1.get()).toBe('token1');
      expect(store2.get()).toBe('token2');
    });

    test('should return null initially', () => {
      const store = createTokenStore.memory();
      expect(store.get()).toBeNull();
    });

    test('should clear token', () => {
      const store = createTokenStore.memory();
      store.set('my-token');
      store.clear();
      expect(store.get()).toBeNull();
    });
  });

  describe('createTokenStore.localStorage', () => {
    const localStorageMock = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock.store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        Reflect.deleteProperty(localStorageMock.store, key);
      }),
      clear: vi.fn(() => {
        localStorageMock.store = {};
      }),
    };

    beforeEach(() => {
      localStorageMock.store = {};
      vi.clearAllMocks();
      vi.stubGlobal('localStorage', localStorageMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    test('should get token from localStorage', () => {
      localStorageMock.store['token'] = 'stored-token';
      const store = createTokenStore.localStorage();

      expect(store.get()).toBe('stored-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('token');
    });

    test('should set token in localStorage', () => {
      const store = createTokenStore.localStorage();
      store.set('new-token');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
      expect(localStorageMock.store['token']).toBe('new-token');
    });

    test('should clear token from localStorage', () => {
      localStorageMock.store['token'] = 'to-be-cleared';
      const store = createTokenStore.localStorage();
      store.clear();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.store['token']).toBeUndefined();
    });

    test('should return null when no token exists', () => {
      const store = createTokenStore.localStorage();
      expect(store.get()).toBeNull();
    });
  });
});
