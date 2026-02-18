// main/shared/src/primitives/schema/parsers.test.ts

import { describe, expect, it } from 'vitest';

import {
  coerceDate,
  coerceNumber,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseObject,
  parseOptional,
  parseRecord,
  parseString,
  parseTypedRecord,
  withDefault,
} from './parsers';

// ============================================================================
// parseString
// ============================================================================

describe('parseString', () => {
  describe('happy path', () => {
    it('accepts a plain string', () => {
      expect(parseString('hello', 'field')).toBe('hello');
    });

    it('returns the string unchanged without trim option', () => {
      expect(parseString('  spaced  ', 'field')).toBe('  spaced  ');
    });

    it('trims whitespace when trim:true', () => {
      expect(parseString('  trimmed  ', 'field', { trim: true })).toBe('trimmed');
    });

    it('accepts a string at exactly min length', () => {
      expect(parseString('ab', 'field', { min: 2 })).toBe('ab');
    });

    it('accepts a string at exactly max length', () => {
      expect(parseString('ab', 'field', { max: 2 })).toBe('ab');
    });

    it('accepts a string with exactly the required length', () => {
      expect(parseString('abc', 'field', { length: 3 })).toBe('abc');
    });

    it('accepts a valid UUID when uuid:true', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(parseString(uuid, 'field', { uuid: true })).toBe(uuid);
    });

    it('accepts a valid URL when url:true', () => {
      expect(parseString('https://example.com', 'field', { url: true })).toBe(
        'https://example.com',
      );
    });

    it('accepts a valid IPv4 when ip:true', () => {
      expect(parseString('192.168.1.1', 'field', { ip: true })).toBe('192.168.1.1');
    });

    it('accepts a valid IPv6 when ip:true', () => {
      expect(parseString('2001:db8::1', 'field', { ip: true })).toBe('2001:db8::1');
    });

    it('accepts a string matching a custom regex', () => {
      expect(parseString('abc123', 'field', { regex: /^[a-z0-9]+$/ })).toBe('abc123');
    });
  });

  describe('failure — wrong type', () => {
    it('throws on null', () => {
      expect(() => parseString(null, 'email')).toThrow('email must be a string');
    });

    it('throws on undefined', () => {
      expect(() => parseString(undefined, 'email')).toThrow('email must be a string');
    });

    it('throws on number', () => {
      expect(() => parseString(42, 'email')).toThrow('email must be a string');
    });

    it('throws on boolean true', () => {
      expect(() => parseString(true, 'field')).toThrow('field must be a string');
    });

    it('throws on boolean false', () => {
      expect(() => parseString(false, 'field')).toThrow('field must be a string');
    });

    it('throws on object', () => {
      expect(() => parseString({}, 'field')).toThrow('field must be a string');
    });

    it('throws on array', () => {
      expect(() => parseString(['hello'], 'field')).toThrow('field must be a string');
    });
  });

  describe('failure — min/max/length constraints', () => {
    it('throws when string is shorter than min', () => {
      expect(() => parseString('a', 'username', { min: 3 })).toThrow(
        'username must be at least 3 characters',
      );
    });

    it('throws when string is longer than max', () => {
      expect(() => parseString('toolong', 'code', { max: 5 })).toThrow(
        'code must be at most 5 characters',
      );
    });

    it('throws when string does not match exact length', () => {
      expect(() => parseString('ab', 'pin', { length: 4 })).toThrow(
        'pin must be exactly 4 characters',
      );
    });

    it('throws on very long string exceeding max', () => {
      const longStr = 'a'.repeat(10_001);
      expect(() => parseString(longStr, 'field', { max: 10_000 })).toThrow(
        'field must be at most 10000 characters',
      );
    });

    // Edge: empty string fails min:1
    it('throws on empty string when min:1', () => {
      expect(() => parseString('', 'field', { min: 1 })).toThrow(
        'field must be at least 1 characters',
      );
    });

    // Trim interaction: whitespace-only string trimmed to empty, then fails min
    it('throws when trim:true reduces string below min', () => {
      expect(() => parseString('   ', 'field', { trim: true, min: 1 })).toThrow(
        'field must be at least 1 characters',
      );
    });
  });

  describe('failure — format validators', () => {
    it('throws on invalid UUID when uuid:true', () => {
      expect(() => parseString('not-a-uuid', 'id', { uuid: true })).toThrow(
        'id must be a valid UUID',
      );
    });

    it('throws on nil UUID (all zeros, version digit 0) when uuid:true', () => {
      expect(() =>
        parseString('00000000-0000-0000-0000-000000000000', 'id', { uuid: true }),
      ).toThrow('id must be a valid UUID');
    });

    it('throws on invalid URL (no scheme) when url:true', () => {
      expect(() => parseString('example.com', 'url', { url: true })).toThrow(
        'url must be a valid URL',
      );
    });

    it('throws on invalid URL (ftp scheme) when url:true', () => {
      expect(() => parseString('ftp://example.com', 'url', { url: true })).toThrow(
        'url must be a valid URL',
      );
    });

    it('throws on non-IP string when ip:true', () => {
      expect(() => parseString('not-an-ip', 'host', { ip: true })).toThrow(
        'host must be a valid IP address',
      );
    });

    it('throws when custom regex does not match', () => {
      expect(() => parseString('UPPER', 'slug', { regex: /^[a-z]+$/ })).toThrow(
        'slug has invalid format',
      );
    });

    it('uses regexMessage when provided and regex fails', () => {
      expect(() =>
        parseString('BAD', 'code', {
          regex: /^[0-9]+$/,
          regexMessage: 'code must contain only digits',
        }),
      ).toThrow('code must contain only digits');
    });
  });

  describe('edge cases', () => {
    // A string with null bytes is still typeof 'string'
    it('accepts a string containing null bytes (no null-byte check)', () => {
      const withNull = 'hello\x00world';
      expect(parseString(withNull, 'field')).toBe(withNull);
    });

    it('accepts an empty string with no constraints', () => {
      expect(parseString('', 'field')).toBe('');
    });

    it('accepts a very long string with no max constraint', () => {
      const huge = 'a'.repeat(100_000);
      expect(parseString(huge, 'field')).toBe(huge);
    });
  });
});

// ============================================================================
// parseNumber
// ============================================================================

describe('parseNumber', () => {
  describe('happy path', () => {
    it('accepts 0', () => {
      expect(parseNumber(0, 'count')).toBe(0);
    });

    it('accepts a positive integer', () => {
      expect(parseNumber(42, 'count')).toBe(42);
    });

    it('accepts a negative integer', () => {
      expect(parseNumber(-7, 'offset')).toBe(-7);
    });

    it('accepts a float', () => {
      expect(parseNumber(3.14, 'ratio')).toBe(3.14);
    });

    it('accepts Number.MAX_SAFE_INTEGER', () => {
      expect(parseNumber(Number.MAX_SAFE_INTEGER, 'id')).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('accepts Infinity (no finite check by default)', () => {
      expect(parseNumber(Infinity, 'score')).toBe(Infinity);
    });

    it('accepts -Infinity (no finite check by default)', () => {
      expect(parseNumber(-Infinity, 'score')).toBe(-Infinity);
    });
  });

  describe('failure — wrong type', () => {
    it('throws on null', () => {
      expect(() => parseNumber(null, 'age')).toThrow('age must be a number');
    });

    it('throws on undefined', () => {
      expect(() => parseNumber(undefined, 'age')).toThrow('age must be a number');
    });

    it('throws on NaN (special-cased in the guard)', () => {
      expect(() => parseNumber(NaN, 'age')).toThrow('age must be a number');
    });

    it('throws on string "123" (no coercion)', () => {
      expect(() => parseNumber('123', 'age')).toThrow('age must be a number');
    });

    it('throws on boolean', () => {
      expect(() => parseNumber(true, 'flag')).toThrow('flag must be a number');
    });

    it('throws on object', () => {
      expect(() => parseNumber({}, 'score')).toThrow('score must be a number');
    });
  });

  describe('failure — int constraint', () => {
    it('throws on float when int:true', () => {
      expect(() => parseNumber(3.14, 'count', { int: true })).toThrow(
        'count must be an integer',
      );
    });

    it('accepts 0 as integer when int:true', () => {
      expect(parseNumber(0, 'count', { int: true })).toBe(0);
    });
  });

  describe('failure — min/max constraints', () => {
    it('throws when below min', () => {
      expect(() => parseNumber(-1, 'age', { min: 0 })).toThrow('age must be at least 0');
    });

    it('throws when above max', () => {
      expect(() => parseNumber(101, 'percent', { max: 100 })).toThrow(
        'percent must be at most 100',
      );
    });

    it('accepts value at exactly min (boundary)', () => {
      expect(parseNumber(0, 'age', { min: 0 })).toBe(0);
    });

    it('accepts value at exactly max (boundary)', () => {
      expect(parseNumber(100, 'percent', { max: 100 })).toBe(100);
    });

    // MAX_SAFE_INTEGER + 1 loses integer precision, but is still typeof number
    it('accepts MAX_SAFE_INTEGER+1 — no finite/safe check by default', () => {
      const val = Number.MAX_SAFE_INTEGER + 1;
      expect(parseNumber(val, 'bigNum')).toBe(val);
    });
  });
});

// ============================================================================
// parseBoolean
// ============================================================================

describe('parseBoolean', () => {
  describe('happy path', () => {
    it('accepts true', () => {
      expect(parseBoolean(true, 'active')).toBe(true);
    });

    it('accepts false', () => {
      expect(parseBoolean(false, 'active')).toBe(false);
    });
  });

  describe('failure — truthy/falsy non-booleans are rejected', () => {
    it('throws on null', () => {
      expect(() => parseBoolean(null, 'active')).toThrow('active must be a boolean');
    });

    it('throws on undefined', () => {
      expect(() => parseBoolean(undefined, 'active')).toThrow('active must be a boolean');
    });

    it('throws on string "true"', () => {
      expect(() => parseBoolean('true', 'active')).toThrow('active must be a boolean');
    });

    it('throws on string "false"', () => {
      expect(() => parseBoolean('false', 'active')).toThrow('active must be a boolean');
    });

    it('throws on number 1 (truthy)', () => {
      expect(() => parseBoolean(1, 'active')).toThrow('active must be a boolean');
    });

    it('throws on number 0 (falsy)', () => {
      expect(() => parseBoolean(0, 'active')).toThrow('active must be a boolean');
    });

    it('throws on empty string (falsy)', () => {
      expect(() => parseBoolean('', 'active')).toThrow('active must be a boolean');
    });

    it('throws on string "yes"', () => {
      expect(() => parseBoolean('yes', 'active')).toThrow('active must be a boolean');
    });

    it('throws on string "no"', () => {
      expect(() => parseBoolean('no', 'active')).toThrow('active must be a boolean');
    });

    it('throws on object', () => {
      expect(() => parseBoolean({}, 'active')).toThrow('active must be a boolean');
    });
  });
});

// ============================================================================
// parseObject
// ============================================================================

describe('parseObject', () => {
  describe('happy path', () => {
    it('accepts a plain object', () => {
      const obj = { a: 1 };
      expect(parseObject(obj, 'config')).toEqual(obj);
    });

    it('accepts an empty object', () => {
      expect(parseObject({}, 'config')).toEqual({});
    });

    it('accepts nested objects', () => {
      const nested = { a: { b: { c: 3 } } };
      expect(parseObject(nested, 'config')).toEqual(nested);
    });

    it('accepts objects with array values (it is still an object)', () => {
      expect(parseObject({ items: [1, 2, 3] }, 'data')).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('failure', () => {
    it('throws on null', () => {
      expect(() => parseObject(null, 'body')).toThrow('body must be an object');
    });

    it('throws on undefined', () => {
      expect(() => parseObject(undefined, 'body')).toThrow('body must be an object');
    });

    it('throws on array (typeof array is "object" but Array.isArray is true)', () => {
      expect(() => parseObject([1, 2, 3], 'body')).toThrow('body must be an object');
    });

    it('throws on string', () => {
      expect(() => parseObject('{}', 'body')).toThrow('body must be an object');
    });

    it('throws on number', () => {
      expect(() => parseObject(42, 'body')).toThrow('body must be an object');
    });

    it('throws on boolean', () => {
      expect(() => parseObject(true, 'body')).toThrow('body must be an object');
    });
  });
});

// ============================================================================
// parseRecord
// ============================================================================

describe('parseRecord', () => {
  describe('happy path', () => {
    it('accepts a plain record object', () => {
      expect(parseRecord({ key: 'value' }, 'map')).toEqual({ key: 'value' });
    });

    it('accepts an empty record', () => {
      expect(parseRecord({}, 'map')).toEqual({});
    });
  });

  describe('failure', () => {
    it('throws on null', () => {
      expect(() => parseRecord(null, 'map')).toThrow('map must be an object');
    });

    it('throws on undefined', () => {
      expect(() => parseRecord(undefined, 'map')).toThrow('map must be an object');
    });

    it('throws on array', () => {
      expect(() => parseRecord(['a', 'b'], 'map')).toThrow('map must be an object');
    });

    it('throws on string', () => {
      expect(() => parseRecord('{"a":1}', 'map')).toThrow('map must be an object');
    });

    it('throws on number', () => {
      expect(() => parseRecord(0, 'map')).toThrow('map must be an object');
    });
  });
});

// ============================================================================
// parseTypedRecord
// ============================================================================

describe('parseTypedRecord', () => {
  const parseStr = (v: unknown): string => {
    if (typeof v !== 'string') throw new Error('must be string');
    return v;
  };

  describe('happy path', () => {
    it('validates each value with the provided parser', () => {
      const result = parseTypedRecord({ a: 'hello', b: 'world' }, 'labels', parseStr);
      expect(result).toEqual({ a: 'hello', b: 'world' });
    });

    it('returns an empty record for an empty object', () => {
      expect(parseTypedRecord({}, 'labels', parseStr)).toEqual({});
    });
  });

  describe('failure — invalid structure', () => {
    it('throws when input is not an object', () => {
      expect(() => parseTypedRecord(null, 'labels', parseStr)).toThrow(
        'labels must be an object',
      );
    });

    it('throws when a value fails the parser', () => {
      expect(() => parseTypedRecord({ a: 'ok', b: 42 }, 'labels', parseStr)).toThrow(
        'must be string',
      );
    });
  });
});

// ============================================================================
// parseOptional
// ============================================================================

describe('parseOptional', () => {
  const parseStr = (v: unknown): string => {
    if (typeof v !== 'string') throw new Error('must be a string');
    return v as string;
  };

  describe('happy path', () => {
    it('returns undefined when data is undefined', () => {
      expect(parseOptional(undefined, parseStr)).toBeUndefined();
    });

    it('runs the parser when data is a valid value', () => {
      expect(parseOptional('hello', parseStr)).toBe('hello');
    });
  });

  describe('failure — null is NOT treated as undefined', () => {
    // null !== undefined so parseOptional passes null to the parser
    it('passes null to the parser, which then throws', () => {
      expect(() => parseOptional(null, parseStr)).toThrow('must be a string');
    });
  });

  describe('failure — invalid value goes to parser', () => {
    it('throws when parser rejects the value', () => {
      expect(() => parseOptional(42, parseStr)).toThrow('must be a string');
    });
  });
});

// ============================================================================
// parseNullable
// ============================================================================

describe('parseNullable', () => {
  const parseStr = (v: unknown): string => {
    if (typeof v !== 'string') throw new Error('must be a string');
    return v as string;
  };

  describe('happy path', () => {
    it('returns null when data is null', () => {
      expect(parseNullable(null, parseStr)).toBeNull();
    });

    it('runs the parser when data is a valid value', () => {
      expect(parseNullable('hello', parseStr)).toBe('hello');
    });
  });

  describe('failure — undefined is NOT treated as null', () => {
    // undefined !== null, so parseNullable passes undefined to the parser
    it('passes undefined to the parser, which then throws', () => {
      expect(() => parseNullable(undefined, parseStr)).toThrow('must be a string');
    });
  });

  describe('failure — invalid value goes to parser', () => {
    it('throws when parser rejects non-null value', () => {
      expect(() => parseNullable(99, parseStr)).toThrow('must be a string');
    });
  });
});

// ============================================================================
// parseNullableOptional
// ============================================================================

describe('parseNullableOptional', () => {
  const parseStr = (v: unknown): string => {
    if (typeof v !== 'string') throw new Error('must be a string');
    return v as string;
  };

  it('returns undefined for undefined', () => {
    expect(parseNullableOptional(undefined, parseStr)).toBeUndefined();
  });

  it('returns null for null', () => {
    expect(parseNullableOptional(null, parseStr)).toBeNull();
  });

  it('runs parser for a valid value', () => {
    expect(parseNullableOptional('ok', parseStr)).toBe('ok');
  });

  it('throws when parser rejects the value', () => {
    expect(() => parseNullableOptional(42, parseStr)).toThrow('must be a string');
  });
});

// ============================================================================
// coerceNumber
// ============================================================================

describe('coerceNumber', () => {
  describe('happy path', () => {
    it('accepts a number directly', () => {
      expect(coerceNumber(42, 'n')).toBe(42);
    });

    it('coerces a numeric string to number', () => {
      expect(coerceNumber('123', 'n')).toBe(123);
    });

    it('coerces a float string', () => {
      expect(coerceNumber('3.14', 'n')).toBeCloseTo(3.14);
    });

    it('coerces 0', () => {
      expect(coerceNumber(0, 'n')).toBe(0);
    });

    it('coerces negative string', () => {
      expect(coerceNumber('-5', 'n')).toBe(-5);
    });
  });

  describe('failure', () => {
    it('throws on NaN (typeof number but Number.isNaN)', () => {
      expect(() => coerceNumber(NaN, 'n')).toThrow('n must be a valid number');
    });

    it('throws on non-numeric string', () => {
      expect(() => coerceNumber('abc', 'n')).toThrow('n must be a valid number');
    });

    it('throws on null (Number(null)=0 edge case — null coerces to 0, does NOT throw)', () => {
      // Number(null) === 0, so this should NOT throw
      expect(coerceNumber(null, 'n')).toBe(0);
    });

    it('throws on undefined (Number(undefined) === NaN)', () => {
      expect(() => coerceNumber(undefined, 'n')).toThrow('n must be a valid number');
    });

    it('throws on empty string (Number("") === 0 — does not throw)', () => {
      // Number('') === 0, so this should NOT throw
      expect(coerceNumber('', 'n')).toBe(0);
    });

    it('throws when below min', () => {
      expect(() => coerceNumber('5', 'n', { min: 10 })).toThrow('n must be at least 10');
    });

    it('throws when above max', () => {
      expect(() => coerceNumber(200, 'n', { max: 100 })).toThrow('n must be at most 100');
    });

    it('throws on float string when int:true', () => {
      expect(() => coerceNumber('3.7', 'n', { int: true })).toThrow('n must be an integer');
    });
  });
});

// ============================================================================
// coerceDate
// ============================================================================

describe('coerceDate', () => {
  describe('happy path', () => {
    it('accepts a valid Date object', () => {
      const d = new Date('2024-01-01');
      expect(coerceDate(d, 'date')).toBe(d);
    });

    it('accepts a valid ISO string', () => {
      const result = coerceDate('2024-06-15T12:00:00Z', 'date');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toContain('2024-06-15');
    });

    it('accepts a numeric timestamp', () => {
      const ts = Date.now();
      const result = coerceDate(ts, 'date');
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(ts);
    });

    it('accepts 0 as epoch', () => {
      const result = coerceDate(0, 'date');
      expect(result.getTime()).toBe(0);
    });
  });

  describe('failure', () => {
    it('throws on an invalid Date object', () => {
      expect(() => coerceDate(new Date('not-a-date'), 'date')).toThrow(
        'date is an invalid date',
      );
    });

    it('throws on a non-date string', () => {
      expect(() => coerceDate('not-a-date', 'date')).toThrow('date is an invalid date');
    });

    it('throws on null', () => {
      expect(() => coerceDate(null, 'date')).toThrow('date must be a valid date');
    });

    it('throws on boolean', () => {
      expect(() => coerceDate(true, 'date')).toThrow('date must be a valid date');
    });

    it('throws on object', () => {
      expect(() => coerceDate({}, 'date')).toThrow('date must be a valid date');
    });

    it('throws on array', () => {
      expect(() => coerceDate([], 'date')).toThrow('date must be a valid date');
    });
  });
});

// ============================================================================
// withDefault
// ============================================================================

describe('withDefault', () => {
  it('returns the default when data is undefined', () => {
    expect(withDefault(undefined, 'fallback')).toBe('fallback');
  });

  it('returns data when it is defined', () => {
    expect(withDefault('value', 'fallback')).toBe('value');
  });

  it('returns null (not the default) when data is explicitly null', () => {
    // null !== undefined, so the data itself is returned
    expect(withDefault(null, 'fallback')).toBeNull();
  });

  it('returns 0 (not the default) when data is 0', () => {
    expect(withDefault(0, 99)).toBe(0);
  });

  it('returns false (not the default) when data is false', () => {
    expect(withDefault(false, true)).toBe(false);
  });

  it('returns empty string (not the default) when data is empty string', () => {
    expect(withDefault('', 'default')).toBe('');
  });
});
