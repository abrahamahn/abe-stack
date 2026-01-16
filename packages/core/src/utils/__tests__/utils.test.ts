// packages/core/src/utils/__tests__/utils.test.ts
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { addAuthHeader, createTokenStore } from '@utils/index';

describe('addAuthHeader', () => {
  test('should add Authorization header when token is provided', () => {
    const headers = new Headers();
    addAuthHeader(headers, 'my-token');
    expect(headers.get('Authorization')).toBe('Bearer my-token');
  });

  test('should not add header when token is null', () => {
    const headers = new Headers();
    addAuthHeader(headers, null);
    expect(headers.get('Authorization')).toBeNull();
  });

  test('should not add header when token is undefined', () => {
    const headers = new Headers();
    addAuthHeader(headers, undefined);
    expect(headers.get('Authorization')).toBeNull();
  });

  test('should not add header when token is empty string', () => {
    const headers = new Headers();
    addAuthHeader(headers, '');
    expect(headers.get('Authorization')).toBeNull();
  });

  test('should return the same Headers object for chaining', () => {
    const headers = new Headers();
    const result = addAuthHeader(headers, 'token');
    expect(result).toBe(headers);
  });

  test('should preserve existing headers', () => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    addAuthHeader(headers, 'my-token');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer my-token');
  });
});

describe('createTokenStore.memory', () => {
  let store: ReturnType<typeof createTokenStore.memory>;

  beforeEach(() => {
    store = createTokenStore.memory();
  });

  test('should return null initially', () => {
    expect(store.get()).toBeNull();
  });

  test('should store and retrieve token', () => {
    store.set('test-token');
    expect(store.get()).toBe('test-token');
  });

  test('should overwrite existing token', () => {
    store.set('first-token');
    store.set('second-token');
    expect(store.get()).toBe('second-token');
  });

  test('should clear token', () => {
    store.set('test-token');
    store.clear();
    expect(store.get()).toBeNull();
  });

  test('should be independent between instances', () => {
    const store2 = createTokenStore.memory();
    store.set('token-1');
    store2.set('token-2');
    expect(store.get()).toBe('token-1');
    expect(store2.get()).toBe('token-2');
  });
});

describe('createTokenStore.localStorage', () => {
  let store: ReturnType<typeof createTokenStore.localStorage>;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    // Mock localStorage
    const storage: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      },
      length: 0,
      key: () => null,
    };
    store = createTokenStore.localStorage();
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
  });

  test('should return null initially', () => {
    expect(store.get()).toBeNull();
  });

  test('should store and retrieve token from localStorage', () => {
    store.set('test-token');
    expect(store.get()).toBe('test-token');
    expect(globalThis.localStorage.getItem('token')).toBe('test-token');
  });

  test('should clear token from localStorage', () => {
    store.set('test-token');
    store.clear();
    expect(store.get()).toBeNull();
    expect(globalThis.localStorage.getItem('token')).toBeNull();
  });
});
