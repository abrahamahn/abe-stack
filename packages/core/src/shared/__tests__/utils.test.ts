// packages/core/src/shared/__tests__/utils.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { randomId } from '../utils';

describe('randomId', () => {
  describe('with crypto.randomUUID available', () => {
    it('should return a valid UUID', () => {
      const id = randomId();
      expect(typeof id).toBe('string');
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(randomId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('fallback without crypto.randomUUID', () => {
    const originalCrypto = globalThis.crypto;

    beforeEach(() => {
      // Remove crypto.randomUUID to test fallback
      vi.stubGlobal('crypto', {
        ...originalCrypto,
        randomUUID: undefined,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return a valid UUID-like string', () => {
      const id = randomId();
      expect(typeof id).toBe('string');
      // UUID format with version 4 characteristics
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(randomId());
      }
      // Allow for small chance of collision with Math.random
      expect(ids.size).toBeGreaterThan(95);
    });
  });

  describe('without crypto at all', () => {
    const originalCrypto = globalThis.crypto;

    beforeEach(() => {
      vi.stubGlobal('crypto', undefined);
    });

    afterEach(() => {
      vi.stubGlobal('crypto', originalCrypto);
    });

    it('should use fallback and return valid UUID-like string', () => {
      const id = randomId();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});
