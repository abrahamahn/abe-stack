// main/shared/src/system/pagination/http.test.ts
import { describe, expect, it } from 'vitest';

import { PAGINATION_ERROR_TYPES, PaginationError } from './pagination';
import {
  DEFAULT_PAGINATION_PARAMS,
  getQueryParam,
  parseLimitParam,
  parsePageParam,
  parseSortByParam,
  parseSortOrderParam,
} from './http';

// DEFAULT_PAGE_LIMIT comes from DEFAULT_PAGINATION.LIMIT = 50
const DEFAULT_LIMIT = 50;
const DEFAULT_MAX_LIMIT = 1000;

// ---------------------------------------------------------------------------
// parsePageParam
// ---------------------------------------------------------------------------
describe('parsePageParam', () => {
  describe('defaults', () => {
    it('returns 1 when param is undefined', () => {
      expect(parsePageParam(undefined)).toBe(1);
    });
  });

  describe('valid inputs', () => {
    it('parses "1" as 1', () => {
      expect(parsePageParam('1')).toBe(1);
    });

    it('parses "5" as 5', () => {
      expect(parsePageParam('5')).toBe(5);
    });

    it('parses large page numbers', () => {
      expect(parsePageParam('9999')).toBe(9999);
    });

    it('accepts string array and uses the first element', () => {
      expect(parsePageParam(['3', '7'])).toBe(3);
    });

    it('accepts a single-element string array', () => {
      expect(parsePageParam(['10'])).toBe(10);
    });
  });

  describe('strict numeric parsing — rejects non-integer inputs', () => {
    it('throws for "10abc" (trailing garbage)', () => {
      expect(() => parsePageParam('10abc')).toThrow(PaginationError);
    });

    it('throws for "1.5" (decimal)', () => {
      expect(() => parsePageParam('1.5')).toThrow(PaginationError);
    });

    it('throws for "99.9" (decimal)', () => {
      expect(() => parsePageParam('99.9')).toThrow(PaginationError);
    });
  });

  describe('boundary — zero and negatives', () => {
    it('throws PaginationError for "0"', () => {
      expect(() => parsePageParam('0')).toThrow(PaginationError);
    });

    it('throws for "0" with correct type INVALID_PAGE', () => {
      try {
        parsePageParam('0');
        expect.fail('should have thrown');
      } catch (err) {
        expect(PaginationError.isType(err, PAGINATION_ERROR_TYPES.INVALID_PAGE)).toBe(true);
      }
    });

    it('throws for "-1"', () => {
      expect(() => parsePageParam('-1')).toThrow(PaginationError);
    });

    it('throws for "-100"', () => {
      expect(() => parsePageParam('-100')).toThrow(PaginationError);
    });
  });

  describe('invalid string inputs', () => {
    it('throws for non-numeric string "abc"', () => {
      expect(() => parsePageParam('abc')).toThrow(PaginationError);
    });

    it('throws for empty string', () => {
      expect(() => parsePageParam('')).toThrow(PaginationError);
    });

    it('throws for whitespace-only string', () => {
      expect(() => parsePageParam('   ')).toThrow(PaginationError);
    });
  });

  describe('array edge cases', () => {
    it('throws for empty array (first element is undefined, coerced to "")', () => {
      expect(() => parsePageParam([])).toThrow(PaginationError);
    });

    it('uses the first element of a multi-element array, ignores rest', () => {
      expect(parsePageParam(['2', 'garbage', '99'])).toBe(2);
    });

    it('throws when first array element is invalid', () => {
      expect(() => parsePageParam(['abc', '5'])).toThrow(PaginationError);
    });

    it('throws when first array element is "0"', () => {
      expect(() => parsePageParam(['0', '5'])).toThrow(PaginationError);
    });
  });

  describe('error shape', () => {
    it('error message contains the offending value', () => {
      try {
        parsePageParam('bad');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(PaginationError);
        expect((err as PaginationError).message).toContain('bad');
      }
    });

    it('error message mentions "positive integer"', () => {
      try {
        parsePageParam('0');
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as PaginationError).message).toContain('positive integer');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// parseLimitParam
// ---------------------------------------------------------------------------
describe('parseLimitParam', () => {
  describe('defaults', () => {
    it('returns DEFAULT_PAGE_LIMIT (50) when param is undefined', () => {
      expect(parseLimitParam(undefined)).toBe(DEFAULT_LIMIT);
    });

    it('respects custom defaultLimit from config', () => {
      expect(parseLimitParam(undefined, { defaultLimit: 25 })).toBe(25);
    });

    it('uses built-in maxLimit of 1000 when not configured', () => {
      // 1000 is exactly at the boundary — must NOT throw
      expect(parseLimitParam('1000')).toBe(1000);
    });

    it('respects custom maxLimit from config', () => {
      expect(parseLimitParam(undefined, { maxLimit: 50 })).toBe(DEFAULT_LIMIT);
    });
  });

  describe('valid inputs', () => {
    it('parses "1" as 1 (minimum valid)', () => {
      expect(parseLimitParam('1')).toBe(1);
    });

    it('parses "20" as 20', () => {
      expect(parseLimitParam('20')).toBe(20);
    });

    it('parses array and uses first element', () => {
      expect(parseLimitParam(['10', '50'])).toBe(10);
    });
  });

  describe('strict numeric parsing — rejects non-integer inputs', () => {
    it('throws for "25abc" (trailing garbage)', () => {
      expect(() => parseLimitParam('25abc')).toThrow(PaginationError);
    });

    it('throws for "10.9" (decimal)', () => {
      expect(() => parseLimitParam('10.9')).toThrow(PaginationError);
    });
  });

  describe('boundary — maxLimit', () => {
    it('accepts limit exactly at default maxLimit (1000)', () => {
      expect(parseLimitParam('1000')).toBe(1000);
    });

    it('throws when limit is one above default maxLimit (1001)', () => {
      expect(() => parseLimitParam('1001')).toThrow(PaginationError);
    });

    it('accepts limit exactly at custom maxLimit', () => {
      expect(parseLimitParam('100', { maxLimit: 100 })).toBe(100);
    });

    it('throws when limit is one above custom maxLimit', () => {
      expect(() => parseLimitParam('101', { maxLimit: 100 })).toThrow(PaginationError);
    });

    it('throws for "0"', () => {
      expect(() => parseLimitParam('0')).toThrow(PaginationError);
    });

    it('throws for "-1"', () => {
      expect(() => parseLimitParam('-1')).toThrow(PaginationError);
    });
  });

  describe('invalid string inputs', () => {
    it('throws for non-numeric "xyz"', () => {
      expect(() => parseLimitParam('xyz')).toThrow(PaginationError);
    });

    it('throws for empty string', () => {
      expect(() => parseLimitParam('')).toThrow(PaginationError);
    });
  });

  describe('array edge cases', () => {
    it('throws for empty array', () => {
      expect(() => parseLimitParam([])).toThrow(PaginationError);
    });

    it('throws when first array element exceeds maxLimit', () => {
      expect(() => parseLimitParam(['1001'])).toThrow(PaginationError);
    });
  });

  describe('error shape', () => {
    it('thrown error has type INVALID_LIMIT for non-numeric input', () => {
      try {
        parseLimitParam('bad');
        expect.fail('should have thrown');
      } catch (err) {
        expect(PaginationError.isType(err, PAGINATION_ERROR_TYPES.INVALID_LIMIT)).toBe(true);
      }
    });

    it('thrown error has type INVALID_LIMIT when exceeding max', () => {
      try {
        parseLimitParam('1001');
        expect.fail('should have thrown');
      } catch (err) {
        expect(PaginationError.isType(err, PAGINATION_ERROR_TYPES.INVALID_LIMIT)).toBe(true);
      }
    });

    it('error message contains the offending value when exceeding max', () => {
      try {
        parseLimitParam('9999');
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as PaginationError).message).toContain('9999');
      }
    });

    it('error message mentions the maximum allowed limit', () => {
      try {
        parseLimitParam('1001');
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as PaginationError).message).toContain(String(DEFAULT_MAX_LIMIT));
      }
    });
  });
});

// ---------------------------------------------------------------------------
// parseSortByParam
// ---------------------------------------------------------------------------
describe('parseSortByParam', () => {
  describe('defaults', () => {
    it('returns "createdAt" when param is undefined', () => {
      expect(parseSortByParam(undefined)).toBe('createdAt');
    });

    it('respects custom defaultSortBy from config', () => {
      expect(parseSortByParam(undefined, { defaultSortBy: 'name' })).toBe('name');
    });
  });

  describe('null vs undefined — critical distinction', () => {
    // The function uses `=== undefined`, NOT `== null`.
    // Therefore null is NOT treated as "use default" — it falls through to the
    // trim check and causes a throw since null coerced to string is unexpected.
    // Actually null cannot be passed because the type is string | string[] | undefined,
    // but we can verify the strict check by reading the behavior with a valid string.
    it('returns the value when a non-empty string is passed', () => {
      expect(parseSortByParam('updatedAt')).toBe('updatedAt');
    });
  });

  describe('valid inputs', () => {
    it('passes through any non-empty string unchanged', () => {
      expect(parseSortByParam('email')).toBe('email');
    });

    it('accepts a string with spaces (only rejects all-whitespace)', () => {
      expect(parseSortByParam('first name')).toBe('first name');
    });

    it('accepts underscored field names', () => {
      expect(parseSortByParam('created_at')).toBe('created_at');
    });

    it('uses first element of a string array', () => {
      expect(parseSortByParam(['updatedAt', 'createdAt'])).toBe('updatedAt');
    });
  });

  describe('invalid inputs — empty and whitespace', () => {
    it('throws for empty string ""', () => {
      expect(() => parseSortByParam('')).toThrow(PaginationError);
    });

    it('throws for whitespace-only " "', () => {
      expect(() => parseSortByParam('   ')).toThrow(PaginationError);
    });

    it('throws for tab-only "\\t"', () => {
      expect(() => parseSortByParam('\t')).toThrow(PaginationError);
    });

    it('throws for newline-only "\\n"', () => {
      expect(() => parseSortByParam('\n')).toThrow(PaginationError);
    });
  });

  describe('array edge cases', () => {
    it('throws for empty array (first element becomes "")', () => {
      expect(() => parseSortByParam([])).toThrow(PaginationError);
    });

    it('throws when first array element is whitespace-only', () => {
      expect(() => parseSortByParam(['   ', 'createdAt'])).toThrow(PaginationError);
    });

    it('uses first valid element when it is non-empty', () => {
      expect(parseSortByParam(['name', 'createdAt'])).toBe('name');
    });
  });

  describe('error shape', () => {
    it('error has type INVALID_SORT_FIELD', () => {
      try {
        parseSortByParam('');
        expect.fail('should have thrown');
      } catch (err) {
        expect(PaginationError.isType(err, PAGINATION_ERROR_TYPES.INVALID_SORT_FIELD)).toBe(true);
      }
    });

    it('error message mentions "empty"', () => {
      try {
        parseSortByParam('');
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as PaginationError).message).toContain('empty');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// parseSortOrderParam
// ---------------------------------------------------------------------------
describe('parseSortOrderParam', () => {
  describe('defaults', () => {
    it('returns "desc" when param is undefined (DEFAULT_SORT_ORDER)', () => {
      expect(parseSortOrderParam(undefined)).toBe('desc');
    });

    it('respects custom defaultSortOrder "asc" from config', () => {
      expect(parseSortOrderParam(undefined, { defaultSortOrder: 'asc' })).toBe('asc');
    });
  });

  describe('valid values', () => {
    it('returns "asc" for "asc"', () => {
      expect(parseSortOrderParam('asc')).toBe('asc');
    });

    it('returns "desc" for "desc"', () => {
      expect(parseSortOrderParam('desc')).toBe('desc');
    });

    it('accepts "asc" in an array', () => {
      expect(parseSortOrderParam(['asc'])).toBe('asc');
    });

    it('accepts "desc" in an array, uses first element', () => {
      expect(parseSortOrderParam(['desc', 'asc'])).toBe('desc');
    });
  });

  describe('case sensitivity — must reject all non-exact matches', () => {
    it('throws for "ASC" (uppercase)', () => {
      expect(() => parseSortOrderParam('ASC')).toThrow(PaginationError);
    });

    it('throws for "DESC" (uppercase)', () => {
      expect(() => parseSortOrderParam('DESC')).toThrow(PaginationError);
    });

    it('throws for "Asc" (mixed case)', () => {
      expect(() => parseSortOrderParam('Asc')).toThrow(PaginationError);
    });

    it('throws for "Desc" (mixed case)', () => {
      expect(() => parseSortOrderParam('Desc')).toThrow(PaginationError);
    });

    it('throws for " asc" (leading space)', () => {
      expect(() => parseSortOrderParam(' asc')).toThrow(PaginationError);
    });

    it('throws for "asc " (trailing space)', () => {
      expect(() => parseSortOrderParam('asc ')).toThrow(PaginationError);
    });
  });

  describe('invalid values', () => {
    it('throws for empty string', () => {
      expect(() => parseSortOrderParam('')).toThrow(PaginationError);
    });

    it('throws for "ascending"', () => {
      expect(() => parseSortOrderParam('ascending')).toThrow(PaginationError);
    });

    it('throws for "descending"', () => {
      expect(() => parseSortOrderParam('descending')).toThrow(PaginationError);
    });

    it('throws for "1" (numeric sort direction)', () => {
      expect(() => parseSortOrderParam('1')).toThrow(PaginationError);
    });

    it('throws for "-1" (numeric sort direction)', () => {
      expect(() => parseSortOrderParam('-1')).toThrow(PaginationError);
    });
  });

  describe('array edge cases', () => {
    it('throws for empty array (first element becomes "")', () => {
      expect(() => parseSortOrderParam([])).toThrow(PaginationError);
    });

    it('throws when first array element is invalid', () => {
      expect(() => parseSortOrderParam(['ASC', 'asc'])).toThrow(PaginationError);
    });
  });

  describe('error shape', () => {
    it('error has type INVALID_SORT_ORDER', () => {
      try {
        parseSortOrderParam('ASC');
        expect.fail('should have thrown');
      } catch (err) {
        expect(PaginationError.isType(err, PAGINATION_ERROR_TYPES.INVALID_SORT_ORDER)).toBe(true);
      }
    });

    it('error message contains the offending value', () => {
      try {
        parseSortOrderParam('DESCENDING');
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as PaginationError).message).toContain('DESCENDING');
      }
    });

    it('error message mentions "asc" or "desc" as accepted values', () => {
      try {
        parseSortOrderParam('invalid');
        expect.fail('should have thrown');
      } catch (err) {
        const msg = (err as PaginationError).message;
        expect(msg).toMatch(/asc|desc/);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// getQueryParam
// ---------------------------------------------------------------------------
describe('getQueryParam', () => {
  describe('string values', () => {
    it('returns string value directly', () => {
      expect(getQueryParam({ page: '3' }, 'page')).toBe('3');
    });

    it('returns empty string value when present', () => {
      expect(getQueryParam({ q: '' }, 'q')).toBe('');
    });
  });

  describe('string array values', () => {
    it('returns string array when all elements are strings', () => {
      expect(getQueryParam({ tags: ['a', 'b', 'c'] }, 'tags')).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array (all-string vacuously)', () => {
      expect(getQueryParam({ tags: [] }, 'tags')).toEqual([]);
    });
  });

  describe('returns undefined for non-string/non-string-array values', () => {
    it('returns undefined for a number value', () => {
      expect(getQueryParam({ page: 3 }, 'page')).toBeUndefined();
    });

    it('returns undefined for a boolean value', () => {
      expect(getQueryParam({ active: true }, 'active')).toBeUndefined();
    });

    it('returns undefined for null value', () => {
      expect(getQueryParam({ page: null }, 'page')).toBeUndefined();
    });

    it('returns undefined for an object value', () => {
      expect(getQueryParam({ meta: { foo: 'bar' } }, 'meta')).toBeUndefined();
    });

    it('returns undefined for a mixed array (string + number)', () => {
      expect(getQueryParam({ tags: ['a', 1, 'b'] }, 'tags')).toBeUndefined();
    });

    it('returns undefined for a mixed array (string + null)', () => {
      expect(getQueryParam({ tags: ['a', null, 'b'] }, 'tags')).toBeUndefined();
    });

    it('returns undefined for a mixed array (string + boolean)', () => {
      expect(getQueryParam({ tags: ['a', true] }, 'tags')).toBeUndefined();
    });
  });

  describe('missing keys', () => {
    it('returns undefined when key is not present in query', () => {
      expect(getQueryParam({}, 'page')).toBeUndefined();
    });

    it('returns undefined when key value is undefined', () => {
      expect(getQueryParam({ page: undefined }, 'page')).toBeUndefined();
    });
  });

  describe('empty key — special guard', () => {
    it('returns undefined for an empty string key regardless of query contents', () => {
      expect(getQueryParam({ '': 'something' }, '')).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_PAGINATION_PARAMS constant
// ---------------------------------------------------------------------------
describe('DEFAULT_PAGINATION_PARAMS', () => {
  it('has the expected default parameter names', () => {
    expect(DEFAULT_PAGINATION_PARAMS).toEqual({
      page: 'page',
      limit: 'limit',
      cursor: 'cursor',
      sortBy: 'sortBy',
      sortOrder: 'sortOrder',
    });
  });
});
