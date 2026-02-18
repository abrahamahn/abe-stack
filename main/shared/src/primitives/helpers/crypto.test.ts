// main/shared/src/primitives/helpers/crypto.test.ts
import { describe, expect, it } from 'vitest';

import { constantTimeCompare, generateSecureId, generateToken, generateUUID } from './crypto';

describe('crypto utilities', () => {
  // ==========================================================================
  // generateToken
  // ==========================================================================
  describe('generateToken', () => {
    it('generates hex string of default length (32)', () => {
      const token = generateToken();
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('generates hex string of custom length', () => {
      const token = generateToken(64);
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('generates unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });

    it('handles short lengths', () => {
      const token = generateToken(4);
      expect(token).toHaveLength(4);
    });
  });

  // ==========================================================================
  // generateUUID
  // ==========================================================================
  describe('generateUUID', () => {
    it('generates valid UUID v4 format', () => {
      const uuid = generateUUID();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('generates unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  // ==========================================================================
  // generateSecureId
  // ==========================================================================
  describe('generateSecureId', () => {
    it('generates alphanumeric string of default length (16)', () => {
      const id = generateSecureId();
      expect(id).toHaveLength(16);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('generates string of custom length', () => {
      const id = generateSecureId(32);
      expect(id).toHaveLength(32);
    });

    it('generates unique IDs', () => {
      const id1 = generateSecureId();
      const id2 = generateSecureId();
      expect(id1).not.toBe(id2);
    });
  });

  // ==========================================================================
  // constantTimeCompare
  // ==========================================================================
  describe('constantTimeCompare', () => {
    it('returns true for equal strings', () => {
      expect(constantTimeCompare('hello', 'hello')).toBe(true);
      expect(constantTimeCompare('', '')).toBe(true);
    });

    it('returns false for different strings', () => {
      expect(constantTimeCompare('hello', 'world')).toBe(false);
    });

    it('returns false for different lengths', () => {
      expect(constantTimeCompare('hello', 'hi')).toBe(false);
    });

    it('returns false for strings differing by one character', () => {
      expect(constantTimeCompare('abcde', 'abcdf')).toBe(false);
    });

    it('handles special characters', () => {
      expect(constantTimeCompare('p@ss!w0rd', 'p@ss!w0rd')).toBe(true);
      expect(constantTimeCompare('p@ss!w0rd', 'p@ss!w0re')).toBe(false);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: generateToken edge cases
  // ==========================================================================
  describe('adversarial — generateToken', () => {
    it('produces valid hex output for length 1', () => {
      const token = generateToken(1);
      expect(token).toHaveLength(1);
      expect(token).toMatch(/^[0-9a-f]$/);
    });

    it('produces valid hex output for odd lengths', () => {
      const token = generateToken(7);
      expect(token).toHaveLength(7);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('produces valid output for very large length (1024)', () => {
      const token = generateToken(1024);
      expect(token).toHaveLength(1024);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('same length call produces different results (not deterministic)', () => {
      const results = new Set(Array.from({ length: 20 }, () => generateToken(32)));
      // With 32 hex chars of entropy, collision probability is astronomically low
      expect(results.size).toBe(20);
    });

    it('output contains only lowercase hex characters, never uppercase', () => {
      for (let i = 0; i < 10; i++) {
        const token = generateToken(64);
        expect(token).toMatch(/^[0-9a-f]+$/);
        expect(token).not.toMatch(/[A-F]/);
      }
    });
  });

  // ==========================================================================
  // ADVERSARIAL: generateUUID uniqueness under load
  // ==========================================================================
  describe('adversarial — generateUUID', () => {
    it('generates 100 unique UUIDs with no collisions', () => {
      const uuids = Array.from({ length: 100 }, () => generateUUID());
      const uniqueSet = new Set(uuids);
      expect(uniqueSet.size).toBe(100);
    });

    it('every UUID has exactly the version 4 marker at position 14', () => {
      for (let i = 0; i < 20; i++) {
        const uuid = generateUUID();
        // character at index 14 must be '4' (version 4)
        expect(uuid[14]).toBe('4');
      }
    });

    it('every UUID has a valid variant bits nibble at position 19', () => {
      for (let i = 0; i < 20; i++) {
        const uuid = generateUUID();
        // character at index 19 must be 8, 9, a, or b
        expect(uuid[19]).toMatch(/^[89ab]$/i);
      }
    });

    it('all UUIDs have the standard 36-character length with dashes', () => {
      for (let i = 0; i < 20; i++) {
        const uuid = generateUUID();
        expect(uuid).toHaveLength(36);
        expect(uuid[8]).toBe('-');
        expect(uuid[13]).toBe('-');
        expect(uuid[18]).toBe('-');
        expect(uuid[23]).toBe('-');
      }
    });
  });

  // ==========================================================================
  // ADVERSARIAL: generateSecureId
  // ==========================================================================
  describe('adversarial — generateSecureId', () => {
    it('generates 100 unique IDs with no collisions', () => {
      const ids = Array.from({ length: 100 }, () => generateSecureId(32));
      const uniqueSet = new Set(ids);
      expect(uniqueSet.size).toBe(100);
    });

    it('output never contains non-alphanumeric characters', () => {
      for (let i = 0; i < 20; i++) {
        const id = generateSecureId(64);
        expect(id).toMatch(/^[A-Za-z0-9]+$/);
      }
    });

    it('output for length 1 is exactly 1 character', () => {
      const id = generateSecureId(1);
      expect(id).toHaveLength(1);
      expect(id).toMatch(/^[A-Za-z0-9]$/);
    });

    it('handles very large lengths (500 chars) correctly', () => {
      const id = generateSecureId(500);
      expect(id).toHaveLength(500);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('is not biased toward first few alphabet characters', () => {
      // Generate a large sample and verify the character distribution
      // is not dominated by any single character (rough uniformity check)
      const id = generateSecureId(620);
      const freq: Record<string, number> = {};
      for (const ch of id) {
        freq[ch] = (freq[ch] ?? 0) + 1;
      }
      // With 62 chars and 620 samples, expect each char ~10 times
      // Any single char appearing >50 times (~8%) would suggest bad bias
      for (const count of Object.values(freq)) {
        expect(count).toBeLessThan(50);
      }
    });
  });

  // ==========================================================================
  // ADVERSARIAL: constantTimeCompare
  // ==========================================================================
  describe('adversarial — constantTimeCompare', () => {
    it('returns false when first string is empty and second is not', () => {
      expect(constantTimeCompare('', 'a')).toBe(false);
    });

    it('returns false when second string is empty and first is not', () => {
      expect(constantTimeCompare('a', '')).toBe(false);
    });

    it('handles unicode characters correctly — equal', () => {
      expect(constantTimeCompare('héllo', 'héllo')).toBe(true);
    });

    it('handles unicode characters correctly — not equal', () => {
      expect(constantTimeCompare('héllo', 'hello')).toBe(false);
    });

    it('handles null bytes in strings', () => {
      expect(constantTimeCompare('a\x00b', 'a\x00b')).toBe(true);
      expect(constantTimeCompare('a\x00b', 'a\x00c')).toBe(false);
    });

    it('differs only in last character — must return false', () => {
      const base = 'a'.repeat(31);
      expect(constantTimeCompare(base + 'a', base + 'b')).toBe(false);
    });

    it('prefix match does not produce true when lengths differ', () => {
      expect(constantTimeCompare('secret', 'secret-extra')).toBe(false);
      expect(constantTimeCompare('secret-extra', 'secret')).toBe(false);
    });

    it('handles very long identical strings', () => {
      const long = 'x'.repeat(10_000);
      expect(constantTimeCompare(long, long)).toBe(true);
    });

    it('handles very long strings differing only in the last byte', () => {
      const a = 'x'.repeat(9_999) + 'a';
      const b = 'x'.repeat(9_999) + 'b';
      expect(constantTimeCompare(a, b)).toBe(false);
    });

    it('case-sensitivity: lowercase and uppercase are not equal', () => {
      expect(constantTimeCompare('ABC', 'abc')).toBe(false);
    });

    it('special characters in both sides match correctly', () => {
      const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(constantTimeCompare(special, special)).toBe(true);
      expect(constantTimeCompare(special, special.slice(0, -1) + '!')).toBe(false);
    });
  });
});
