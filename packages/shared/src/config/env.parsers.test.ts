// packages/core/src/config/env.parsers.test.ts
import { describe, expect, it, test } from 'vitest';

import { getBool, getInt, getList, getRequired } from './env.parsers';

describe('Configuration Utilities', () => {
  describe('getInt', () => {
    test.each([
      ['8080', 3000, 8080], // Valid string
      [undefined, 3000, 3000], // Missing value
      ['abc', 3000, 3000], // Garbage string
      ['10.5', 3000, 10], // Float (should be floor)
      ['', 3000, 3000], // Empty string
    ])(
      'given %p and fallback %p, should return %p',
      (input: string | undefined, fallback, expected) => {
        expect(getInt(input, fallback)).toBe(expected);
      },
    );
  });

  describe('getBool', () => {
    test.each([
      ['true', true],
      ['TRUE', true],
      ['  true  ', true], // Whitespace
      ['false', false],
      ['any-string', false],
      [undefined, false],
    ])('given %p, should return %p', (input: string | undefined, expected) => {
      expect(getBool(input)).toBe(expected);
    });
  });

  describe('getList', () => {
    it('should handle complex comma-separated strings', () => {
      const input = ' google, github,, facebook ';
      expect(getList(input)).toEqual(['google', 'github', 'facebook']);
    });

    it('should return an empty array for empty or undefined input', () => {
      expect(getList(undefined)).toEqual([]);
      expect(getList('')).toEqual([]);
    });
  });

  describe('getRequired', () => {
    it('should return the value if present', () => {
      expect(getRequired('secret-key', 'JWT_SECRET')).toBe('secret-key');
    });

    it('should throw a descriptive error if missing', () => {
      expect(() => getRequired(undefined, 'API_KEY')).toThrow(
        'Configuration Error: Missing required environment variable [API_KEY]',
      );
    });
  });
});
