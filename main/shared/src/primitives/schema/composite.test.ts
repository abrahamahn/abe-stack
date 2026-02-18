// main/shared/src/primitives/schema/composite.test.ts

import { describe, expect, it } from 'vitest';

import {
  createArraySchema,
  createBrandedStringSchema,
  createBrandedUuidSchema,
  createEnumSchema,
  createLiteralSchema,
  createUnionSchema,
} from './composite';
import { createSchema } from './factory';

// Branded types used as test fixtures
type TestBrandedStr = string & { __brand: 'TestBrandedStr' };
type TestBrandedUuid = string & { __brand: 'TestBrandedUuid' };

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// ============================================================================
// createBrandedStringSchema
// ============================================================================

describe('createBrandedStringSchema', () => {
  const schema = createBrandedStringSchema<TestBrandedStr>('TestBrand');

  describe('happy path', () => {
    it('accepts a non-empty string', () => {
      expect(schema.parse('hello')).toBe('hello');
    });

    it('accepts a long string', () => {
      const long = 'a'.repeat(1000);
      expect(schema.parse(long)).toBe(long);
    });

    it('accepts a string with special characters', () => {
      expect(schema.parse('hello!@#')).toBe('hello!@#');
    });

    it('safeParse returns success:true for valid string', () => {
      const result = schema.safeParse('valid');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('valid');
    });
  });

  describe('failure — type violations', () => {
    it('throws on null', () => {
      expect(() => schema.parse(null)).toThrow('TestBrand must be a string');
    });

    it('throws on undefined', () => {
      expect(() => schema.parse(undefined)).toThrow('TestBrand must be a string');
    });

    it('throws on number', () => {
      expect(() => schema.parse(42)).toThrow('TestBrand must be a string');
    });

    it('throws on boolean', () => {
      expect(() => schema.parse(true)).toThrow('TestBrand must be a string');
    });

    it('throws on object', () => {
      expect(() => schema.parse({})).toThrow('TestBrand must be a string');
    });

    it('throws on array', () => {
      expect(() => schema.parse(['hello'])).toThrow('TestBrand must be a string');
    });
  });

  describe('failure — empty string (default min:1)', () => {
    it('throws on empty string because default min is 1', () => {
      expect(() => schema.parse('')).toThrow('TestBrand must be at least 1 characters');
    });

    it('safeParse returns success:false for empty string', () => {
      const result = schema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('failure — whitespace-only string', () => {
    it('accepts whitespace-only string (no trim by default, min:1 is met)', () => {
      // '   ' has length 3, which satisfies min:1 — whitespace is valid unless trim is set
      expect(schema.parse('   ')).toBe('   ');
    });
  });

  describe('with custom opts — max length', () => {
    const bounded = createBrandedStringSchema<TestBrandedStr>('Bounded', { max: 5 });

    it('accepts a string within max length', () => {
      expect(bounded.parse('hello')).toBe('hello');
    });

    it('throws when string exceeds max', () => {
      expect(() => bounded.parse('toolong')).toThrow('Bounded must be at most 5 characters');
    });
  });

  describe('with custom opts — min length override', () => {
    const strict = createBrandedStringSchema<TestBrandedStr>('Strict', { min: 3 });

    it('throws on string shorter than custom min', () => {
      expect(() => strict.parse('ab')).toThrow('Strict must be at least 3 characters');
    });

    it('accepts string meeting the custom min', () => {
      expect(strict.parse('abc')).toBe('abc');
    });
  });
});

// ============================================================================
// createBrandedUuidSchema
// ============================================================================

describe('createBrandedUuidSchema', () => {
  const schema = createBrandedUuidSchema<TestBrandedUuid>('TestUUID');

  describe('happy path', () => {
    it('accepts a valid v4 UUID (lowercase)', () => {
      expect(schema.parse(VALID_UUID)).toBe(VALID_UUID);
    });

    it('accepts a valid UUID with uppercase hex digits (case-insensitive)', () => {
      const upper = '550E8400-E29B-41D4-A716-446655440000';
      expect(schema.parse(upper)).toBe(upper);
    });

    it('accepts a valid v1 UUID', () => {
      // v1: version digit = 1
      expect(schema.parse('550e8400-e29b-11d4-a716-446655440000')).toBe(
        '550e8400-e29b-11d4-a716-446655440000',
      );
    });

    it('safeParse returns success:true for valid UUID', () => {
      const result = schema.safeParse(VALID_UUID);
      expect(result.success).toBe(true);
    });
  });

  describe('failure — type violations', () => {
    it('throws on null', () => {
      expect(() => schema.parse(null)).toThrow('TestUUID must be a string');
    });

    it('throws on undefined', () => {
      expect(() => schema.parse(undefined)).toThrow('TestUUID must be a string');
    });

    it('throws on number', () => {
      expect(() => schema.parse(42)).toThrow('TestUUID must be a string');
    });

    it('throws on object', () => {
      expect(() => schema.parse({ id: VALID_UUID })).toThrow('TestUUID must be a string');
    });

    it('throws on array', () => {
      expect(() => schema.parse([VALID_UUID])).toThrow('TestUUID must be a string');
    });
  });

  describe('failure — invalid UUID format', () => {
    it('throws on empty string', () => {
      expect(() => schema.parse('')).toThrow('TestUUID must be a valid UUID');
    });

    it('throws on nil UUID (version digit is 0, outside [1-5])', () => {
      expect(() => schema.parse(NIL_UUID)).toThrow('TestUUID must be a valid UUID');
    });

    it('throws on UUID with wrong length (too short)', () => {
      expect(() => schema.parse('550e8400-e29b-41d4-a716')).toThrow(
        'TestUUID must be a valid UUID',
      );
    });

    it('throws on UUID with wrong length (too long)', () => {
      expect(() => schema.parse(`${VALID_UUID}-extra`)).toThrow(
        'TestUUID must be a valid UUID',
      );
    });

    it('throws on UUID missing hyphens', () => {
      expect(() => schema.parse('550e8400e29b41d4a716446655440000')).toThrow(
        'TestUUID must be a valid UUID',
      );
    });

    it('throws on UUID with hyphens in wrong positions', () => {
      expect(() => schema.parse('550e840-0e29b-41d4-a716-446655440000')).toThrow(
        'TestUUID must be a valid UUID',
      );
    });

    it('throws on UUID with non-hex characters', () => {
      expect(() => schema.parse('gggggggg-e29b-41d4-a716-446655440000')).toThrow(
        'TestUUID must be a valid UUID',
      );
    });

    it('throws on UUID with invalid variant bits (position 19 not in [89ab])', () => {
      // c is not [89ab]
      expect(() => schema.parse('550e8400-e29b-41d4-c716-446655440000')).toThrow(
        'TestUUID must be a valid UUID',
      );
    });

    it('throws on UUID with version digit 0 (outside [1-5])', () => {
      expect(() => schema.parse('550e8400-e29b-01d4-a716-446655440000')).toThrow(
        'TestUUID must be a valid UUID',
      );
    });

    it('throws on UUID with version digit 6 (outside [1-5])', () => {
      expect(() => schema.parse('550e8400-e29b-61d4-a716-446655440000')).toThrow(
        'TestUUID must be a valid UUID',
      );
    });

    it('throws on braced UUID format', () => {
      expect(() => schema.parse(`{${VALID_UUID}}`)).toThrow('TestUUID must be a valid UUID');
    });

    it('throws on UUID with spaces instead of hyphens', () => {
      expect(() => schema.parse('550e8400 e29b 41d4 a716 446655440000')).toThrow(
        'TestUUID must be a valid UUID',
      );
    });

    it('safeParse returns success:false for nil UUID', () => {
      const result = schema.safeParse(NIL_UUID);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('TestUUID must be a valid UUID');
    });
  });
});

// ============================================================================
// createArraySchema
// ============================================================================

describe('createArraySchema', () => {
  const strParser = (v: unknown): string => {
    if (typeof v !== 'string') throw new Error('item must be a string');
    return v;
  };

  const schema = createArraySchema(strParser);

  describe('happy path', () => {
    it('accepts a valid array', () => {
      expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('accepts an empty array (no min constraint)', () => {
      expect(schema.parse([])).toEqual([]);
    });

    it('accepts a single-element array', () => {
      expect(schema.parse(['only'])).toEqual(['only']);
    });

    it('safeParse returns success:true for valid array', () => {
      const result = schema.safeParse(['x']);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toEqual(['x']);
    });
  });

  describe('failure — not an array', () => {
    it('throws on null', () => {
      expect(() => schema.parse(null)).toThrow('Expected an array');
    });

    it('throws on undefined', () => {
      expect(() => schema.parse(undefined)).toThrow('Expected an array');
    });

    it('throws on object', () => {
      expect(() => schema.parse({ 0: 'a' })).toThrow('Expected an array');
    });

    it('throws on string', () => {
      expect(() => schema.parse('hello')).toThrow('Expected an array');
    });

    it('throws on number', () => {
      expect(() => schema.parse(42)).toThrow('Expected an array');
    });
  });

  describe('failure — invalid elements', () => {
    it('throws when an element fails the item parser', () => {
      expect(() => schema.parse(['valid', 42, 'also-valid'])).toThrow('item must be a string');
    });

    it('throws when all elements are invalid', () => {
      expect(() => schema.parse([1, 2, 3])).toThrow('item must be a string');
    });

    it('throws on mixed valid/invalid elements', () => {
      expect(() => schema.parse(['ok', null, 'fine'])).toThrow('item must be a string');
    });
  });

  describe('with min constraint', () => {
    const minSchema = createArraySchema(strParser, { min: 2 });

    it('throws on empty array when min:2', () => {
      expect(() => minSchema.parse([])).toThrow('Array must have at least 2 items');
    });

    it('throws on single-element array when min:2', () => {
      expect(() => minSchema.parse(['one'])).toThrow('Array must have at least 2 items');
    });

    it('accepts array with exactly min elements (boundary)', () => {
      expect(minSchema.parse(['a', 'b'])).toEqual(['a', 'b']);
    });
  });

  describe('with max constraint', () => {
    const maxSchema = createArraySchema(strParser, { max: 3 });

    it('throws on array exceeding max', () => {
      expect(() => maxSchema.parse(['a', 'b', 'c', 'd'])).toThrow(
        'Array must have at most 3 items',
      );
    });

    it('accepts array with exactly max elements (boundary)', () => {
      expect(maxSchema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('throws on very large array exceeding max', () => {
      const huge = Array.from({ length: 1001 }, (_, i) => String(i));
      expect(() => createArraySchema(strParser, { max: 1000 }).parse(huge)).toThrow(
        'Array must have at most 1000 items',
      );
    });
  });
});

// ============================================================================
// createEnumSchema
// ============================================================================

describe('createEnumSchema', () => {
  const STATUS_VALUES = ['active', 'inactive', 'pending'] as const;
  type Status = (typeof STATUS_VALUES)[number];
  const schema = createEnumSchema<Status>(STATUS_VALUES, 'Status');

  describe('happy path', () => {
    it('accepts "active"', () => {
      expect(schema.parse('active')).toBe('active');
    });

    it('accepts "inactive"', () => {
      expect(schema.parse('inactive')).toBe('inactive');
    });

    it('accepts "pending"', () => {
      expect(schema.parse('pending')).toBe('pending');
    });

    it('safeParse returns success:true for valid enum value', () => {
      const result = schema.safeParse('active');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('active');
    });
  });

  describe('failure — type violations', () => {
    it('throws on null', () => {
      expect(() => schema.parse(null)).toThrow('Status must be a string');
    });

    it('throws on undefined', () => {
      expect(() => schema.parse(undefined)).toThrow('Status must be a string');
    });

    it('throws on number', () => {
      expect(() => schema.parse(0)).toThrow('Status must be a string');
    });

    it('throws on boolean', () => {
      expect(() => schema.parse(false)).toThrow('Status must be a string');
    });

    it('throws on object', () => {
      expect(() => schema.parse({ status: 'active' })).toThrow('Status must be a string');
    });
  });

  describe('failure — invalid enum value', () => {
    it('throws on a value not in the enum', () => {
      expect(() => schema.parse('deleted')).toThrow(
        'Invalid Status: "deleted". Expected one of: active, inactive, pending',
      );
    });

    it('throws on empty string', () => {
      expect(() => schema.parse('')).toThrow('Invalid Status: "".');
    });

    it('throws on uppercase variant (case-sensitive)', () => {
      expect(() => schema.parse('Active')).toThrow('Invalid Status: "Active".');
    });

    it('throws on ALL_CAPS variant', () => {
      expect(() => schema.parse('ACTIVE')).toThrow('Invalid Status: "ACTIVE".');
    });

    it('safeParse returns success:false for invalid enum value', () => {
      const result = schema.safeParse('unknown');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeInstanceOf(Error);
    });
  });
});

// ============================================================================
// createLiteralSchema
// ============================================================================

describe('createLiteralSchema', () => {
  describe('string literal', () => {
    const schema = createLiteralSchema('v1');

    it('accepts the exact literal string', () => {
      expect(schema.parse('v1')).toBe('v1');
    });

    it('throws on a close-but-wrong string', () => {
      expect(() => schema.parse('v2')).toThrow('Expected literal v1, got v2');
    });

    it('throws on empty string', () => {
      expect(() => schema.parse('')).toThrow('Expected literal v1, got ');
    });

    it('throws on null', () => {
      expect(() => schema.parse(null)).toThrow('Expected literal v1, got null');
    });

    it('throws on undefined', () => {
      expect(() => schema.parse(undefined)).toThrow('Expected literal v1, got undefined');
    });

    it('throws on the literal with extra whitespace', () => {
      expect(() => schema.parse(' v1')).toThrow('Expected literal v1, got  v1');
    });

    it('safeParse returns success:false for wrong literal', () => {
      const result = schema.safeParse('v2');
      expect(result.success).toBe(false);
    });
  });

  describe('number literal', () => {
    const schema = createLiteralSchema(42);

    it('accepts the exact literal number', () => {
      expect(schema.parse(42)).toBe(42);
    });

    it('throws on a different number', () => {
      expect(() => schema.parse(43)).toThrow('Expected literal 42, got 43');
    });

    it('throws on the string "42"', () => {
      expect(() => schema.parse('42')).toThrow('Expected literal 42, got 42');
    });
  });

  describe('boolean literal', () => {
    const trueSchema = createLiteralSchema(true);

    it('accepts true', () => {
      expect(trueSchema.parse(true)).toBe(true);
    });

    it('throws on false', () => {
      expect(() => trueSchema.parse(false)).toThrow('Expected literal true, got false');
    });

    it('throws on 1 (truthy but not boolean true)', () => {
      expect(() => trueSchema.parse(1)).toThrow('Expected literal true, got 1');
    });
  });
});

// ============================================================================
// createUnionSchema
// ============================================================================

describe('createUnionSchema', () => {
  const strSchema = createSchema<string>((v: unknown) => {
    if (typeof v !== 'string') throw new Error('not a string');
    return v;
  });
  const numSchema = createSchema<number>((v: unknown) => {
    if (typeof v !== 'number') throw new Error('not a number');
    return v;
  });

  // Union of string | number
  const union = createUnionSchema<string | number>([strSchema, numSchema]);

  describe('happy path', () => {
    it('accepts a string (first schema matches)', () => {
      expect(union.parse('hello')).toBe('hello');
    });

    it('accepts a number (second schema matches)', () => {
      expect(union.parse(42)).toBe(42);
    });

    it('safeParse returns success:true when any schema matches', () => {
      const result = union.safeParse('ok');
      expect(result.success).toBe(true);
    });
  });

  describe('failure — no schema matches', () => {
    it('throws with combined error messages when no schema matches', () => {
      expect(() => union.parse(null)).toThrow('Value does not match any schema');
    });

    it('throws on boolean — not string or number', () => {
      expect(() => union.parse(true)).toThrow('Value does not match any schema');
    });

    it('throws on object', () => {
      expect(() => union.parse({ key: 'val' })).toThrow('Value does not match any schema');
    });

    it('throws on undefined', () => {
      expect(() => union.parse(undefined)).toThrow('Value does not match any schema');
    });

    it('includes each schema error message in the thrown error', () => {
      let message = '';
      try {
        union.parse([]);
      } catch (e) {
        if (e instanceof Error) message = e.message;
      }
      expect(message).toContain('not a string');
      expect(message).toContain('not a number');
    });

    it('safeParse returns success:false when no schema matches', () => {
      const result = union.safeParse(null);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('early return — first-match semantics', () => {
    // If the first schema matches, the second is not tried
    it('returns the first matching schema result for an ambiguous value', () => {
      // For a union of two strSchemas, the first always wins
      const s1 = createSchema<string>((v: unknown) => {
        if (typeof v !== 'string') throw new Error('s1 fail');
        return `s1:${v}`;
      });
      const s2 = createSchema<string>((v: unknown) => {
        if (typeof v !== 'string') throw new Error('s2 fail');
        return `s2:${v}`;
      });
      const ambiguous = createUnionSchema<string>([s1, s2]);
      // First schema wins
      expect(ambiguous.parse('test')).toBe('s1:test');
    });
  });
});
