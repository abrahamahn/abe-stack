// main/shared/src/engine/crypto/token.test.ts
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

  describe('tokenStore', () => {
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

  describe('adversarial: memory token store isolation and state', () => {
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

    test('after clear, both memory and localStorage are empty so get() returns null', () => {
      const store = createTokenStore.memory();
      store.set('token');
      store.clear();
      expect(store.get()).toBeNull();
    });

    test('memory store falls back to localStorage on first get', () => {
      localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME] = 'persisted-value';
      const store = createTokenStore.memory();
      expect(store.get()).toBe('persisted-value');
    });

    test('setting a token syncs it to localStorage', () => {
      const store = createTokenStore.memory();
      store.set('synced-token');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE_NAME,
        'synced-token',
      );
    });

    test('clearing removes primary key from localStorage', () => {
      const store = createTokenStore.memory();
      store.set('token');
      store.clear();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE_NAME);
    });

    test('clearing also removes legacy "token" key from localStorage', () => {
      // The implementation calls localStorage.removeItem('token') as a cleanup
      // for the previous auth storage strategy.
      const store = createTokenStore.memory();
      store.clear();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('adversarial: hasLocalStorage guard limitation', () => {
    // hasLocalStorage() checks: 'localStorage' in globalThis
    // vi.stubGlobal('localStorage', undefined) SETS the property to undefined —
    // the property still EXISTS in globalThis, so 'localStorage' in globalThis === true.
    // The guard passes but globalThis.localStorage.getItem() throws TypeError.
    // These tests document this real implementation gap.

    beforeEach(() => {
      vi.stubGlobal('localStorage', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    test('exposes guard gap: memory store get() throws when localStorage is set to undefined', () => {
      // 'localStorage' in globalThis is true even with value=undefined,
      // so hasLocalStorage() returns true and then crashes on .getItem()
      const store = createTokenStore.memory();
      expect(() => store.get()).toThrow(TypeError);
    });

    test('exposes guard gap: memory store set() throws when localStorage is set to undefined', () => {
      const store = createTokenStore.memory();
      expect(() => store.set('token')).toThrow(TypeError);
    });

    test('exposes guard gap: memory store clear() throws when localStorage is set to undefined', () => {
      const store = createTokenStore.memory();
      expect(() => store.clear()).toThrow(TypeError);
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

    test('exposes bug: empty string in memory bypasses fast-path but falls back to returning ""', () => {
      // memory get(): if (token !== null && token !== '') return token
      // '' fails this fast-path check, falls through to readPersistedToken.
      // readPersistedToken filters '' → returns null.
      // Back in get(): persisted is null, so token is NOT updated.
      // Final: `return token` returns the in-memory '' instead of null.
      // This is a real implementation gap: empty-string tokens leak out of get().
      const store = createTokenStore.memory();
      store.set(''); // sets in-memory token = ''

      // localStorageMock also receives '' via persistToken
      // (getItem returns '' → readPersistedToken returns null)
      expect(store.get()).toBe(''); // documents the actual (buggy) behavior
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

    test('memory store in-memory value takes priority over localStorage', () => {
      // Set different values in memory vs localStorage
      const store = createTokenStore.memory();
      store.set('in-memory-token'); // memory = 'in-memory-token', localStorage = 'in-memory-token'

      // Override localStorage to have a different value
      localStorageMock.store[ACCESS_TOKEN_COOKIE_NAME] = 'stale-persisted-token';

      // In-memory value takes priority (checked first in get())
      expect(store.get()).toBe('in-memory-token');
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
