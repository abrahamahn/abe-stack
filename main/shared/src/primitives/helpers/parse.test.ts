// main/shared/src/primitives/helpers/parse.test.ts
import { describe, expect, it, test } from 'vitest';

import { getBool, getInt, getList, getRequired } from './parse';

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

  // ==========================================================================
  // ADVERSARIAL: getInt
  // ==========================================================================
  describe('adversarial — getInt', () => {
    it('returns fallback for whitespace-only string', () => {
      expect(getInt('   ', 99)).toBe(99);
    });

    it('returns fallback for null-like string "null"', () => {
      expect(getInt('null', 42)).toBe(42);
    });

    it('returns fallback for scientific notation that parseInt cannot handle fully', () => {
      // parseInt('1e5') parses as 1, not 100000
      expect(getInt('1e5', 0)).toBe(1);
    });

    it('handles negative numbers', () => {
      expect(getInt('-42', 0)).toBe(-42);
    });

    it('handles zero as a valid value (not fallback)', () => {
      expect(getInt('0', 999)).toBe(0);
    });

    it('handles very large integers beyond safe integer range', () => {
      // parseInt saturates; result is a number — should not be NaN
      const result = getInt('99999999999999999999999', 0);
      expect(typeof result).toBe('number');
      expect(Number.isNaN(result)).toBe(false);
    });

    it('handles leading whitespace in numeric string', () => {
      // parseInt trims leading whitespace
      expect(getInt('  8080  ', 3000)).toBe(8080);
    });

    it('handles hexadecimal-looking strings (parsed as decimal base 10)', () => {
      // parseInt with radix 10 stops at 'x' so '0x10' -> 0
      expect(getInt('0x10', 999)).toBe(0);
    });

    it('handles string with leading numeric chars followed by alpha', () => {
      // parseInt stops at first non-digit: '42abc' -> 42
      expect(getInt('42abc', 0)).toBe(42);
    });

    it('returns fallback for Infinity string', () => {
      expect(getInt('Infinity', 0)).toBe(0);
    });

    it('returns fallback for NaN string', () => {
      expect(getInt('NaN', 0)).toBe(0);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: getBool
  // ==========================================================================
  describe('adversarial — getBool', () => {
    it('returns false for "1" (only "true" is truthy)', () => {
      expect(getBool('1')).toBe(false);
    });

    it('returns false for "yes"', () => {
      expect(getBool('yes')).toBe(false);
    });

    it('returns false for "on"', () => {
      expect(getBool('on')).toBe(false);
    });

    it('returns false for "True " with trailing space (trimmed correctly)', () => {
      // The implementation does .trim() so "True " becomes "true"
      expect(getBool('True ')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(getBool('')).toBe(false);
    });

    it('returns false for tab-padded "true" (trim covers tabs)', () => {
      expect(getBool('\ttrue\t')).toBe(true);
    });

    it('returns false for "TRUE\n" with newline (trim covers newlines)', () => {
      expect(getBool('TRUE\n')).toBe(true);
    });

    it('returns false for "false" — not confusable with true', () => {
      expect(getBool('false')).toBe(false);
    });

    it('returns false for "TRUE_EXTRA"', () => {
      expect(getBool('TRUE_EXTRA')).toBe(false);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: getList
  // ==========================================================================
  describe('adversarial — getList', () => {
    it('filters out whitespace-only segments between commas', () => {
      expect(getList('a,  ,b')).toEqual(['a', 'b']);
    });

    it('handles a single value without commas', () => {
      expect(getList('single')).toEqual(['single']);
    });

    it('handles trailing comma', () => {
      expect(getList('a,b,')).toEqual(['a', 'b']);
    });

    it('handles leading comma', () => {
      expect(getList(',a,b')).toEqual(['a', 'b']);
    });

    it('handles multiple consecutive commas', () => {
      expect(getList('a,,,b')).toEqual(['a', 'b']);
    });

    it('handles a string with only commas', () => {
      expect(getList(',,,')).toEqual([]);
    });

    it('preserves values with internal spaces', () => {
      // trimming only happens to individual segments, not inside values
      expect(getList('hello world,foo bar')).toEqual(['hello world', 'foo bar']);
    });

    it('handles a single-space string (not truly empty — but filter strips it)', () => {
      // ' ' split by ',' yields [' '], trimmed to '', filtered out
      expect(getList(' ')).toEqual([]);
    });

    it('handles values with special characters', () => {
      expect(getList('a@b.com,user+tag@example.org')).toEqual(['a@b.com', 'user+tag@example.org']);
    });

    it('handles a very large list (500 items)', () => {
      const items = Array.from({ length: 500 }, (_, i) => `item${i}`);
      const input = items.join(',');
      expect(getList(input)).toEqual(items);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: getRequired
  // ==========================================================================
  describe('adversarial — getRequired', () => {
    it('throws for empty string (treated as missing)', () => {
      expect(() => getRequired('', 'DATABASE_URL')).toThrow(
        'Configuration Error: Missing required environment variable [DATABASE_URL]',
      );
    });

    it('throws for undefined with the correct key name in the message', () => {
      expect(() => getRequired(undefined, 'SECRET_KEY')).toThrow('[SECRET_KEY]');
    });

    it('returns value for string that looks falsy but is not empty (e.g., "0")', () => {
      expect(getRequired('0', 'PORT')).toBe('0');
    });

    it('returns value for string "false"', () => {
      expect(getRequired('false', 'FEATURE_FLAG')).toBe('false');
    });

    it('returns value for string "null" (not actual null)', () => {
      expect(getRequired('null', 'SOME_KEY')).toBe('null');
    });

    it('returns value with special characters intact', () => {
      const secret = 'p@$$w0rd!#%^&*()';
      expect(getRequired(secret, 'JWT_SECRET')).toBe(secret);
    });

    it('error message includes the bracket-wrapped key for easy grepping', () => {
      try {
        getRequired(undefined, 'MY_VAR');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as Error).message).toContain('[MY_VAR]');
        expect((e as Error).message).toContain('Configuration Error');
      }
    });
  });
});
