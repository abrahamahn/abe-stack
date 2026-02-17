// main/shared/src/engine/crypto/crypto.test.ts
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
});
