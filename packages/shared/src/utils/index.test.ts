import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTokenStore, tokenStore } from './index';

describe('TokenStore', () => {
  describe('Memory Token Store', () => {
    let store: ReturnType<typeof createTokenStore.memory>;

    beforeEach(() => {
      store = createTokenStore.memory();
    });

    it('should return null when no token is set', () => {
      expect(store.get()).toBeNull();
    });

    it('should store and retrieve a token', () => {
      const testToken = 'test-token-123';
      store.set(testToken);
      expect(store.get()).toBe(testToken);
    });

    it('should clear the token', () => {
      store.set('test-token');
      store.clear();
      expect(store.get()).toBeNull();
    });

    it('should overwrite previous token when setting a new one', () => {
      store.set('first-token');
      store.set('second-token');
      expect(store.get()).toBe('second-token');
    });
  });

  describe('LocalStorage Token Store', () => {
    let store: ReturnType<typeof createTokenStore.localStorage>;
    let mockLocalStorage: Record<string, string>;

    beforeEach(() => {
      mockLocalStorage = {};

      // Mock localStorage
      global.localStorage = {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          mockLocalStorage = {};
        },
        key: () => null,
        length: 0,
      };

      store = createTokenStore.localStorage();
    });

    afterEach(() => {
      // Clean up
      delete (global as { localStorage?: Storage }).localStorage;
    });

    it('should return null when no token is set', () => {
      expect(store.get()).toBeNull();
    });

    it('should store and retrieve a token from localStorage', () => {
      const testToken = 'test-token-456';
      store.set(testToken);
      expect(store.get()).toBe(testToken);
      expect(mockLocalStorage['token']).toBe(testToken);
    });

    it('should clear the token from localStorage', () => {
      store.set('test-token');
      store.clear();
      expect(store.get()).toBeNull();
      expect(mockLocalStorage['token']).toBeUndefined();
    });

    it('should persist token across store instances', () => {
      store.set('persistent-token');

      const newStore = createTokenStore.localStorage();
      expect(newStore.get()).toBe('persistent-token');
    });
  });

  describe('Default tokenStore', () => {
    it('should be defined', () => {
      expect(tokenStore).toBeDefined();
      expect(tokenStore.get).toBeDefined();
      expect(tokenStore.set).toBeDefined();
      expect(tokenStore.clear).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof tokenStore.get).toBe('function');
      expect(typeof tokenStore.set).toBe('function');
      expect(typeof tokenStore.clear).toBe('function');
    });
  });
});
