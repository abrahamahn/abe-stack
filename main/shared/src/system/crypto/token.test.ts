// main/shared/src/system/crypto/token.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ACCESS_TOKEN_COOKIE_NAME } from '../constants/platform';

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

  describe('tokenStore (default memory store)', () => {
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
      getItem: vi.fn((key: string): string | null => localStorageMock.store[key] ?? null),
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

  // ============================================================================
  // Adversarial Tests
  // ============================================================================

  describe('adversarial: addAuthHeader edge cases', () => {
    test('whitespace-only token passes non-empty guard but Headers API trims it', () => {
      // addAuthHeader checks token !== '' but NOT whitespace-only.
      // However, the WHATWG Headers spec strips leading/trailing whitespace from header values.
      // So 'Bearer    ' becomes 'Bearer' after trimming.
      const headers = new Headers();
      addAuthHeader(headers, '   ');
      // The spec trims the result — documents the actual behavior
      expect(headers.get('Authorization')).toBe('Bearer');
    });

    test('very long token is accepted without truncation', () => {
      const longToken = 'a'.repeat(10000);
      const headers = new Headers();
      addAuthHeader(headers, longToken);
      expect(headers.get('Authorization')).toBe(`Bearer ${longToken}`);
    });

    test('token with embedded newlines causes Headers to reject the value', () => {
      // HTTP header values cannot contain newlines — the WHATWG Headers API throws
      // This documents a real failure mode: tokens with newlines break the header setter
      const tokenWithNewline = 'tok\nen';
      const headers = new Headers();
      expect(() => addAuthHeader(headers, tokenWithNewline)).toThrow();
    });

    test('returns the exact same Headers reference (not a clone)', () => {
      const headers = new Headers();
      const result = addAuthHeader(headers, 'token');
      expect(result).toBe(headers);
    });

    test('calling addAuthHeader twice overwrites previous Authorization', () => {
      const headers = new Headers();
      addAuthHeader(headers, 'first-token');
      addAuthHeader(headers, 'second-token');
      expect(headers.get('Authorization')).toBe('Bearer second-token');
    });

    test('null after a set token leaves old Authorization in place', () => {
      // addAuthHeader is additive only — null does not clear the header
      const headers = new Headers();
      addAuthHeader(headers, 'initial-token');
      addAuthHeader(headers, null);
      expect(headers.get('Authorization')).toBe('Bearer initial-token');
    });
  });

  describe('adversarial: memory token store isolation and XSS immunity', () => {
    const localStorageMock = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string): string | null => localStorageMock.store[key] ?? null),
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

    test('100 memory stores are all independent', () => {
      const stores = Array.from({ length: 100 }, (_, i) => {
        const s = createTokenStore.memory();
        s.set(`token-${i}`);
        return s;
      });

      for (let i = 0; i < 100; i++) {
        expect(stores[i]!.get()).toBe(`token-${i}`);
      }
    });

    test('100 sequential set operations all store unique retrievable values', () => {
      const store = createTokenStore.memory();
      const seen = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const token = `unique-token-${i}`;
        store.set(token);
        seen.add(store.get()!);
      }

      expect(seen.size).toBe(100);
    });

    test('clear after no set returns null', () => {
      const store = createTokenStore.memory();
      store.clear();
      expect(store.get()).toBeNull();
    });

    test('multiple clears are idempotent', () => {
      const store = createTokenStore.memory();
      store.set('token');
      store.clear();
      store.clear();
      store.clear();
      expect(store.get()).toBeNull();
    });

    test('set() never writes to localStorage (XSS immunity)', () => {
      const store = createTokenStore.memory();
      store.set('secret-jwt');

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      expect(localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME]).toBeUndefined();
    });

    test('get() never reads from localStorage', () => {
      localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME] = 'persisted-value';
      const store = createTokenStore.memory();

      expect(store.get()).toBeNull();
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });

    test('clear() never touches localStorage', () => {
      const store = createTokenStore.memory();
      store.set('token');
      store.clear();

      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });

    test('XSS attacker cannot steal token via localStorage.getItem()', () => {
      const store = createTokenStore.memory();
      store.set('eyJhbGciOiJIUzI1NiJ9.sensitive-payload');

      // Simulate XSS: attacker reads localStorage
      const stolen = globalThis.localStorage.getItem(ACCESS_TOKEN_COOKIE_NAME);
      expect(stolen).toBeNull();
    });
  });

  describe('adversarial: hasLocalStorage guard limitation', () => {
    // hasLocalStorage() checks: 'localStorage' in globalThis
    // vi.stubGlobal('localStorage', undefined) SETS the property to undefined —
    // the property still EXISTS in globalThis, so 'localStorage' in globalThis === true.
    // The guard passes but globalThis.localStorage.getItem() throws TypeError.
    // These tests document the gap in the localStorage store only.
    // The memory store is unaffected — it never touches localStorage.

    beforeEach(() => {
      vi.stubGlobal('localStorage', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    test('memory store is unaffected by broken localStorage', () => {
      const store = createTokenStore.memory();
      store.set('token');
      expect(store.get()).toBe('token');
      store.clear();
      expect(store.get()).toBeNull();
    });

    test('exposes guard gap: localStorage store get() throws when localStorage is set to undefined', () => {
      const store = createTokenStore.localStorage();
      expect(() => store.get()).toThrow(TypeError);
    });

    test('exposes guard gap: localStorage store set() throws when localStorage is set to undefined', () => {
      const store = createTokenStore.localStorage();
      expect(() => store.set('token')).toThrow(TypeError);
    });

    test('exposes guard gap: localStorage store clear() throws when localStorage is set to undefined', () => {
      const store = createTokenStore.localStorage();
      expect(() => store.clear()).toThrow(TypeError);
    });
  });

  describe('adversarial: token value edge cases', () => {
    const localStorageMock = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string): string | null => localStorageMock.store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock.store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        Reflect.deleteProperty(localStorageMock.store, key);
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

    test('memory store set("") stores empty string and get() returns it', () => {
      const store = createTokenStore.memory();
      store.set('');
      expect(store.get()).toBe('');
    });

    test('localStorage store with empty-string value returns null', () => {
      // readPersistedToken guards against empty string explicitly
      localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME] = '';
      const store = createTokenStore.localStorage();
      expect(store.get()).toBeNull();
    });

    test('localStorage store returns null when key is absent', () => {
      const store = createTokenStore.localStorage();
      expect(store.get()).toBeNull();
    });

    test('localStorage store correctly returns a non-empty token', () => {
      localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME] = 'valid-token';
      const store = createTokenStore.localStorage();
      expect(store.get()).toBe('valid-token');
    });

    test('memory store ignores localStorage entirely', () => {
      localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME] = 'stale-persisted-token';
      const store = createTokenStore.memory();

      // Memory store returns null — it does not read from localStorage
      expect(store.get()).toBeNull();
    });

    test('two isolated memory stores do not share the in-memory variable', () => {
      const store1 = createTokenStore.memory();
      const store2 = createTokenStore.memory();

      store1.set('alpha');
      store2.set('beta');

      expect(store1.get()).toBe('alpha');
      expect(store2.get()).toBe('beta');
    });
  });
});
