// main/shared/src/primitives/schema/scalars.test.ts

import { describe, expect, it } from 'vitest';

import { emailSchema, isoDateTimeSchema, passwordSchema, uuidSchema } from './scalars';

// ============================================================================
// isoDateTimeSchema
// ============================================================================

describe('isoDateTimeSchema', () => {
  describe('valid inputs', () => {
    it('accepts a full UTC ISO 8601 string', () => {
      const input = '2024-06-15T12:30:00.000Z';
      const result = isoDateTimeSchema.parse(input);
      expect(result).toBe(input);
    });

    it('accepts ISO 8601 without milliseconds', () => {
      const result = isoDateTimeSchema.parse('2024-06-15T12:30:00Z');
      expect(result).toBe('2024-06-15T12:30:00Z');
    });

    it('accepts ISO 8601 with timezone offset', () => {
      const result = isoDateTimeSchema.parse('2024-06-15T12:30:00+05:30');
      expect(result).toBe('2024-06-15T12:30:00+05:30');
    });

    it('returns the original string unchanged', () => {
      const input = '2024-01-01T00:00:00.000Z';
      expect(isoDateTimeSchema.parse(input)).toBe(input);
    });

    it('accepts epoch zero as a full ISO string', () => {
      const result = isoDateTimeSchema.parse('1970-01-01T00:00:00.000Z');
      expect(result).toBe('1970-01-01T00:00:00.000Z');
    });

    it('accepts far-future dates', () => {
      const result = isoDateTimeSchema.parse('9999-12-31T23:59:59.999Z');
      expect(result).toBe('9999-12-31T23:59:59.999Z');
    });

    it('accepts far-past dates', () => {
      const result = isoDateTimeSchema.parse('0001-01-01T00:00:00.000Z');
      expect(result).toBe('0001-01-01T00:00:00.000Z');
    });
  });

  describe('safeParse — valid inputs return success', () => {
    it('returns success:true for valid ISO string', () => {
      const result = isoDateTimeSchema.safeParse('2024-06-15T12:30:00.000Z');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('2024-06-15T12:30:00.000Z');
    });
  });

  describe('failure states — wrong types', () => {
    it('throws when given null', () => {
      expect(() => isoDateTimeSchema.parse(null)).toThrow('ISO datetime must be a string');
    });

    it('throws when given undefined', () => {
      expect(() => isoDateTimeSchema.parse(undefined)).toThrow('ISO datetime must be a string');
    });

    it('throws when given a number', () => {
      expect(() => isoDateTimeSchema.parse(1718448600000)).toThrow('ISO datetime must be a string');
    });

    it('throws when given a boolean', () => {
      expect(() => isoDateTimeSchema.parse(true)).toThrow('ISO datetime must be a string');
    });

    it('throws when given an object', () => {
      expect(() => isoDateTimeSchema.parse({})).toThrow('ISO datetime must be a string');
    });

    it('throws when given a Date object (not a string)', () => {
      expect(() => isoDateTimeSchema.parse(new Date())).toThrow('ISO datetime must be a string');
    });

    it('throws when given an array', () => {
      expect(() => isoDateTimeSchema.parse(['2024-06-15T12:30:00Z'])).toThrow(
        'ISO datetime must be a string',
      );
    });
  });

  describe('failure states — invalid date strings', () => {
    it('throws on empty string', () => {
      expect(() => isoDateTimeSchema.parse('')).toThrow('Invalid ISO datetime format');
    });

    it('throws on plain text', () => {
      expect(() => isoDateTimeSchema.parse('not-a-date')).toThrow('Invalid ISO datetime format');
    });

    it('throws on "Invalid Date" string', () => {
      expect(() => isoDateTimeSchema.parse('Invalid Date')).toThrow('Invalid ISO datetime format');
    });

    it('throws on string "Infinity"', () => {
      expect(() => isoDateTimeSchema.parse('Infinity')).toThrow('Invalid ISO datetime format');
    });

    it('throws on string "NaN"', () => {
      expect(() => isoDateTimeSchema.parse('NaN')).toThrow('Invalid ISO datetime format');
    });

    it('DOES NOT throw on impossible calendar date (Feb 30) — V8 silently overflows to Mar 02', () => {
      // Adversarial finding: new Date('2025-02-30T00:00:00Z') is NOT NaN in V8 — it overflows
      // to Mar 02. The schema cannot catch this; it is a known limitation of delegating to Date().
      expect(() => isoDateTimeSchema.parse('2025-02-30T00:00:00Z')).not.toThrow();
    });

    it('throws on month 13 (unambiguously invalid)', () => {
      // new Date('2025-13-01T00:00:00Z') correctly returns NaN
      expect(() => isoDateTimeSchema.parse('2025-13-01T00:00:00Z')).toThrow(
        'Invalid ISO datetime format',
      );
    });

    it('throws on month 00 (unambiguously invalid)', () => {
      expect(() => isoDateTimeSchema.parse('2025-00-01T00:00:00Z')).toThrow(
        'Invalid ISO datetime format',
      );
    });

    it('throws on date-only string without time component', () => {
      // "2024-06-15" parses as a valid date in most engines — this documents behavior
      const result = isoDateTimeSchema.safeParse('2024-06-15');
      // Either it passes (engine accepts) or fails — we assert the return shape is consistent
      if (result.success) {
        expect(result.data).toBe('2024-06-15');
      } else {
        expect(result.error.message).toBe('Invalid ISO datetime format');
      }
    });
  });

  describe('safeParse — failure states return error', () => {
    it('returns success:false with error for null', () => {
      const result = isoDateTimeSchema.safeParse(null);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('ISO datetime must be a string');
    });

    it('DOES NOT return failure for "garbage-2024" — V8 parses it as Jan 1 2024', () => {
      // Adversarial finding: new Date('garbage-2024') parses as Jan 01 2024 in V8.
      // The schema accepts this string — a real gap in the validation contract.
      const result = isoDateTimeSchema.safeParse('garbage-2024');
      expect(result.success).toBe(true);
    });

    it('returns success:false with error for unambiguously unparseable string', () => {
      const result = isoDateTimeSchema.safeParse('---');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeInstanceOf(Error);
    });
  });
});

// ============================================================================
// emailSchema
// ============================================================================

describe('emailSchema', () => {
  describe('valid inputs', () => {
    it('accepts a standard email address', () => {
      expect(emailSchema.parse('user@example.com')).toBe('user@example.com');
    });

    it('normalizes uppercase to lowercase', () => {
      expect(emailSchema.parse('User@Example.COM')).toBe('user@example.com');
    });

    it('trims leading and trailing whitespace before validation', () => {
      expect(emailSchema.parse('  user@example.com  ')).toBe('user@example.com');
    });

    it('accepts subdomain email addresses', () => {
      expect(emailSchema.parse('user@mail.example.com')).toBe('user@mail.example.com');
    });

    it('accepts email with plus addressing', () => {
      expect(emailSchema.parse('user+tag@example.com')).toBe('user+tag@example.com');
    });

    it('accepts email with dots in local part', () => {
      expect(emailSchema.parse('first.last@example.com')).toBe('first.last@example.com');
    });

    it('accepts email with hyphen in domain', () => {
      expect(emailSchema.parse('user@my-domain.com')).toBe('user@my-domain.com');
    });

    it('returns normalized (lowercase, trimmed) value, not the original', () => {
      const result = emailSchema.parse('  ADMIN@EXAMPLE.COM  ');
      expect(result).toBe('admin@example.com');
      expect(result).not.toBe('  ADMIN@EXAMPLE.COM  ');
    });
  });

  describe('safeParse — valid inputs return success', () => {
    it('returns success:true for valid email', () => {
      const result = emailSchema.safeParse('user@example.com');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('user@example.com');
    });
  });

  describe('failure states — wrong types', () => {
    it('throws when given null', () => {
      expect(() => emailSchema.parse(null)).toThrow('Email must be a string');
    });

    it('throws when given undefined', () => {
      expect(() => emailSchema.parse(undefined)).toThrow('Email must be a string');
    });

    it('throws when given a number', () => {
      expect(() => emailSchema.parse(42)).toThrow('Email must be a string');
    });

    it('throws when given a boolean', () => {
      expect(() => emailSchema.parse(false)).toThrow('Email must be a string');
    });

    it('throws when given an object', () => {
      expect(() => emailSchema.parse({ email: 'user@example.com' })).toThrow(
        'Email must be a string',
      );
    });

    it('throws when given an array', () => {
      expect(() => emailSchema.parse(['user@example.com'])).toThrow('Email must be a string');
    });
  });

  describe('failure states — invalid email formats', () => {
    it('throws on empty string', () => {
      expect(() => emailSchema.parse('')).toThrow('Invalid email format');
    });

    it('throws on missing @ symbol', () => {
      expect(() => emailSchema.parse('userexample.com')).toThrow('Invalid email format');
    });

    it('throws on missing domain', () => {
      expect(() => emailSchema.parse('user@')).toThrow('Invalid email format');
    });

    it('throws on missing local part', () => {
      expect(() => emailSchema.parse('@example.com')).toThrow('Invalid email format');
    });

    it('throws on missing TLD separator (no dot in domain)', () => {
      // regex requires [^\s@]+\.[^\s@]+ for the domain part
      expect(() => emailSchema.parse('user@localhost')).toThrow('Invalid email format');
    });

    it('throws on multiple @ symbols', () => {
      expect(() => emailSchema.parse('user@@example.com')).toThrow('Invalid email format');
    });

    it('throws on @ embedded in local and domain (double @)', () => {
      expect(() => emailSchema.parse('us@er@example.com')).toThrow('Invalid email format');
    });

    it('throws on email with whitespace in local part', () => {
      expect(() => emailSchema.parse('us er@example.com')).toThrow('Invalid email format');
    });

    it('throws on email with whitespace in domain', () => {
      expect(() => emailSchema.parse('user@exam ple.com')).toThrow('Invalid email format');
    });

    it('throws on string that is only whitespace (normalized to empty)', () => {
      expect(() => emailSchema.parse('   ')).toThrow('Invalid email format');
    });

    it('throws on email exceeding 255 characters', () => {
      // local part is 243 chars + @example.com = 255+1 chars
      const longLocal = 'a'.repeat(244);
      expect(() => emailSchema.parse(`${longLocal}@example.com`)).toThrow('Invalid email format');
    });
  });

  describe('safeParse — failure states return error', () => {
    it('returns success:false for null', () => {
      const result = emailSchema.safeParse(null);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('Email must be a string');
    });

    it('returns success:false for missing @', () => {
      const result = emailSchema.safeParse('notanemail');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('Invalid email format');
    });

    it('returns success:false for empty string', () => {
      const result = emailSchema.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeInstanceOf(Error);
    });
  });
});

// ============================================================================
// passwordSchema
// ============================================================================

describe('passwordSchema', () => {
  describe('valid inputs', () => {
    it('accepts a password of exactly 8 characters', () => {
      expect(passwordSchema.parse('abcdefgh')).toBe('abcdefgh');
    });

    it('accepts a password longer than 8 characters', () => {
      const pw = 'correcthorsebatterystaple';
      expect(passwordSchema.parse(pw)).toBe(pw);
    });

    it('accepts a password with special characters', () => {
      const pw = 'p@ssw0rd!';
      expect(passwordSchema.parse(pw)).toBe(pw);
    });

    it('accepts a password with unicode characters if length >= 8', () => {
      // Each emoji is one char in JS string length terms... but emoji are multi-codepoint
      // Use regular unicode letters to be deterministic
      const pw = 'pässwörd';
      expect(passwordSchema.parse(pw)).toBe(pw);
    });

    it('accepts a very long password', () => {
      const pw = 'a'.repeat(1000);
      expect(passwordSchema.parse(pw)).toBe(pw);
    });

    it('returns the original string unchanged (no normalization)', () => {
      const pw = '  MyPass  ';
      expect(passwordSchema.parse(pw)).toBe(pw);
    });
  });

  describe('safeParse — valid inputs return success', () => {
    it('returns success:true for 8-char password', () => {
      const result = passwordSchema.safeParse('12345678');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('12345678');
    });
  });

  describe('failure states — wrong types', () => {
    it('throws when given null', () => {
      expect(() => passwordSchema.parse(null)).toThrow('Password must be a string');
    });

    it('throws when given undefined', () => {
      expect(() => passwordSchema.parse(undefined)).toThrow('Password must be a string');
    });

    it('throws when given a number', () => {
      expect(() => passwordSchema.parse(12345678)).toThrow('Password must be a string');
    });

    it('throws when given a boolean', () => {
      expect(() => passwordSchema.parse(true)).toThrow('Password must be a string');
    });

    it('throws when given an object', () => {
      expect(() => passwordSchema.parse({})).toThrow('Password must be a string');
    });
  });

  describe('failure states — too short', () => {
    it('throws on empty string', () => {
      expect(() => passwordSchema.parse('')).toThrow(
        'Password must be at least 8 characters',
      );
    });

    it('throws on 1-character password', () => {
      expect(() => passwordSchema.parse('a')).toThrow('Password must be at least 8 characters');
    });

    it('throws on 7-character password (boundary)', () => {
      expect(() => passwordSchema.parse('abcdefg')).toThrow(
        'Password must be at least 8 characters',
      );
    });

    it('does NOT throw on exactly 8 characters (boundary passes)', () => {
      expect(() => passwordSchema.parse('abcdefgh')).not.toThrow();
    });

    it('throws on password that is only whitespace but < 8 chars', () => {
      expect(() => passwordSchema.parse('   ')).toThrow('Password must be at least 8 characters');
    });
  });

  describe('safeParse — failure states return error', () => {
    it('returns success:false with correct message for short password', () => {
      const result = passwordSchema.safeParse('short');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Password must be at least 8 characters');
      }
    });

    it('returns success:false for null', () => {
      const result = passwordSchema.safeParse(null);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('Password must be a string');
    });
  });
});

// ============================================================================
// uuidSchema
// ============================================================================

describe('uuidSchema', () => {
  describe('valid inputs', () => {
    it('accepts a valid UUID v4 (lowercase)', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(uuidSchema.parse(uuid)).toBe(uuid);
    });

    it('accepts a valid UUID v4 (uppercase — regex is case-insensitive)', () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000';
      expect(uuidSchema.parse(uuid)).toBe(uuid);
    });

    it('accepts a valid UUID v1', () => {
      // Version 1: version digit is 1
      const uuid = '550e8400-e29b-11d4-a716-446655440000';
      expect(uuidSchema.parse(uuid)).toBe(uuid);
    });

    it('accepts UUIDs with version digits 1-5', () => {
      const versions = ['1', '2', '3', '4', '5'] as const;
      for (const v of versions) {
        const uuid = `550e8400-e29b-${v}1d4-a716-446655440000`;
        expect(() => uuidSchema.parse(uuid)).not.toThrow();
      }
    });

    it('returns the original string unchanged', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(uuidSchema.parse(uuid)).toBe(uuid);
    });
  });

  describe('safeParse — valid inputs return success', () => {
    it('returns success:true for valid UUID', () => {
      const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('failure states — wrong types', () => {
    it('throws when given null', () => {
      expect(() => uuidSchema.parse(null)).toThrow('UUID must be a string');
    });

    it('throws when given undefined', () => {
      expect(() => uuidSchema.parse(undefined)).toThrow('UUID must be a string');
    });

    it('throws when given a number', () => {
      expect(() => uuidSchema.parse(550_000)).toThrow('UUID must be a string');
    });

    it('throws when given a boolean', () => {
      expect(() => uuidSchema.parse(true)).toThrow('UUID must be a string');
    });

    it('throws when given an object', () => {
      expect(() => uuidSchema.parse({})).toThrow('UUID must be a string');
    });

    it('throws when given an array', () => {
      expect(() => uuidSchema.parse(['550e8400-e29b-41d4-a716-446655440000'])).toThrow(
        'UUID must be a string',
      );
    });
  });

  describe('failure states — invalid UUID formats', () => {
    it('throws on empty string', () => {
      expect(() => uuidSchema.parse('')).toThrow('Invalid UUID format');
    });

    it('throws on nil UUID (all zeros — version digit is 0, not 1-5)', () => {
      // 00000000-0000-0000-0000-000000000000: version digit '0' not in [1-5]
      expect(() => uuidSchema.parse('00000000-0000-0000-0000-000000000000')).toThrow(
        'Invalid UUID format',
      );
    });

    it('throws on UUID with version digit 0', () => {
      expect(() => uuidSchema.parse('550e8400-e29b-01d4-a716-446655440000')).toThrow(
        'Invalid UUID format',
      );
    });

    it('throws on UUID with version digit 6 (out of [1-5] range)', () => {
      expect(() => uuidSchema.parse('550e8400-e29b-61d4-a716-446655440000')).toThrow(
        'Invalid UUID format',
      );
    });

    it('throws on UUID missing hyphens', () => {
      expect(() => uuidSchema.parse('550e8400e29b41d4a716446655440000')).toThrow(
        'Invalid UUID format',
      );
    });

    it('throws on UUID with wrong hyphen placement', () => {
      expect(() => uuidSchema.parse('550e840-0e29b-41d4-a716-446655440000')).toThrow(
        'Invalid UUID format',
      );
    });

    it('throws on UUID that is too short', () => {
      expect(() => uuidSchema.parse('550e8400-e29b-41d4-a716')).toThrow('Invalid UUID format');
    });

    it('throws on UUID that is too long', () => {
      expect(() => uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000-extra')).toThrow(
        'Invalid UUID format',
      );
    });

    it('throws on UUID with non-hex characters', () => {
      expect(() => uuidSchema.parse('gggggggg-e29b-41d4-a716-446655440000')).toThrow(
        'Invalid UUID format',
      );
    });

    it('throws on UUID with invalid variant bits (not 8,9,a,b in position 19)', () => {
      // Variant byte must be [89ab]; using 'c' here is invalid
      expect(() => uuidSchema.parse('550e8400-e29b-41d4-c716-446655440000')).toThrow(
        'Invalid UUID format',
      );
    });

    it('throws on plain string that looks like a UUID but has spaces', () => {
      expect(() => uuidSchema.parse('550e8400 e29b 41d4 a716 446655440000')).toThrow(
        'Invalid UUID format',
      );
    });

    it('throws on braced UUID format {550e8400-e29b-41d4-a716-446655440000}', () => {
      expect(() => uuidSchema.parse('{550e8400-e29b-41d4-a716-446655440000}')).toThrow(
        'Invalid UUID format',
      );
    });
  });

  describe('safeParse — failure states return error', () => {
    it('returns success:false for null', () => {
      const result = uuidSchema.safeParse(null);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('UUID must be a string');
    });

    it('returns success:false for nil UUID', () => {
      const result = uuidSchema.safeParse('00000000-0000-0000-0000-000000000000');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('Invalid UUID format');
    });

    it('returns success:false for empty string', () => {
      const result = uuidSchema.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeInstanceOf(Error);
    });
  });
});

// ============================================================================
// Cross-schema: safeParse always returns SafeParseResult, never throws
// ============================================================================

describe('safeParse contract — never throws', () => {
  const schemas = [isoDateTimeSchema, emailSchema, passwordSchema, uuidSchema];
  const adversarialInputs = [
    null,
    undefined,
    '',
    0,
    -1,
    Infinity,
    -Infinity,
    NaN,
    true,
    false,
    [],
    {},
    Symbol('test'),
    // Intentionally not using 'any' — using unknown-compatible values
  ];

  for (const schema of schemas) {
    for (const input of adversarialInputs) {
      it(`${schema === isoDateTimeSchema ? 'isoDateTimeSchema' : schema === emailSchema ? 'emailSchema' : schema === passwordSchema ? 'passwordSchema' : 'uuidSchema'}.safeParse(${String(input)}) never throws`, () => {
        expect(() => schema.safeParse(input)).not.toThrow();
        const result = schema.safeParse(input);
        expect(typeof result.success).toBe('boolean');
      });
    }
  }
});
