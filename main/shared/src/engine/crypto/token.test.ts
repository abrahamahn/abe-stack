// main/shared/src/utils/crypto/token.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ACCESS_TOKEN_COOKIE_NAME } from '../../core/constants';

import { addAuthHeader, createTokenStore, tokenStore } from './token';

describe('token', () => {
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
    const localStorageMock = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
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
      tokenStore.clear();
      vi.unstubAllGlobals();
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

    test('should hydrate from persisted access token key', () => {
      localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME] = 'persisted-token';
      expect(tokenStore.get()).toBe('persisted-token');
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
      getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
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
      localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME] = 'stored-token';
      const store = createTokenStore.localStorage();

      expect(store.get()).toBe('stored-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE_NAME);
    });

    test('should set token in localStorage', () => {
      const store = createTokenStore.localStorage();
      store.set('new-token');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE_NAME, 'new-token');
      expect(localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME]).toBe('new-token');
    });

    test('should clear token from localStorage', () => {
      localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME] = 'to-be-cleared';
      const store = createTokenStore.localStorage();
      store.clear();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE_NAME);
      expect(localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME]).toBeUndefined();
    });

    test('should return null when no token exists', () => {
      const store = createTokenStore.localStorage();
      expect(store.get()).toBeNull();
    });
  });
});
