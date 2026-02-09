// src/shared/src/core/guard.test.ts
import { describe, expect, it } from 'vitest';

import {
  assert,
  assertDefined,
  assertNever,
  isNonEmptyString,
  isNumber,
  isObjectLike,
  isPlainObject,
  isString,
} from './guard';

describe('guard', () => {
  // ==========================================================================
  // assert
  // ==========================================================================
  describe('assert', () => {
    it('does not throw when condition is true', () => {
      expect(() => {
        assert(true, 'should not throw');
      }).not.toThrow();
    });

    it('throws Error when condition is false', () => {
      expect(() => {
        assert(false, 'condition failed');
      }).toThrow('condition failed');
    });

    it('throws custom error from factory when condition is false', () => {
      const factory = (msg: string): Error => new TypeError(msg);
      expect(() => {
        assert(false, 'type error', factory);
      }).toThrow(TypeError);
      expect(() => {
        assert(false, 'type error', factory);
      }).toThrow('type error');
    });

    it('does not invoke factory when condition is true', () => {
      let factoryCalled = false;
      const factory = (msg: string): Error => {
        factoryCalled = true;
        return new Error(msg);
      };
      assert(true, 'ok', factory);
      expect(factoryCalled).toBe(false);
    });
  });

  // ==========================================================================
  // assertDefined
  // ==========================================================================
  describe('assertDefined', () => {
    it('does not throw for defined values', () => {
      expect(() => {
        assertDefined('hello', 'msg');
      }).not.toThrow();
      expect(() => {
        assertDefined(0, 'msg');
      }).not.toThrow();
      expect(() => {
        assertDefined(false, 'msg');
      }).not.toThrow();
      expect(() => {
        assertDefined('', 'msg');
      }).not.toThrow();
    });

    it('throws for null', () => {
      expect(() => {
        assertDefined(null, 'was null');
      }).toThrow('was null');
    });

    it('throws for undefined', () => {
      expect(() => {
        assertDefined(undefined, 'was undefined');
      }).toThrow('was undefined');
    });

    it('uses default message when not provided', () => {
      expect(() => {
        assertDefined(null);
      }).toThrow('Value is not defined');
    });

    it('throws custom error from factory', () => {
      const factory = (msg: string): Error => new RangeError(msg);
      expect(() => {
        assertDefined(null, 'range', factory);
      }).toThrow(RangeError);
    });
  });

  // ==========================================================================
  // assertNever
  // ==========================================================================
  describe('assertNever', () => {
    it('always throws with serialized value', () => {
      expect(() => assertNever('unexpected' as never)).toThrow(
        'Unreachable code reached for value: "unexpected"',
      );
    });
  });

  // ==========================================================================
  // Type Guards
  // ==========================================================================
  describe('isString', () => {
    it('returns true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
    });

    it('returns false for non-strings', () => {
      expect(isString(42)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString({})).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' ')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('returns false for non-strings', () => {
      expect(isNonEmptyString(42)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('returns true for finite numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-3.14)).toBe(true);
    });

    it('returns false for Infinity and NaN', () => {
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber(-Infinity)).toBe(false);
      expect(isNumber(NaN)).toBe(false);
    });

    it('returns false for non-numbers', () => {
      expect(isNumber('42')).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
    });
  });

  describe('isPlainObject', () => {
    it('returns true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ key: 'value' })).toBe(true);
      expect(isPlainObject(Object.create(null))).toBe(true);
    });

    it('returns false for arrays', () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject([1, 2, 3])).toBe(false);
    });

    it('returns false for class instances', () => {
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(new Map())).toBe(false);
      expect(isPlainObject(new Set())).toBe(false);
    });

    it('returns false for null and non-objects', () => {
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(42)).toBe(false);
    });
  });

  describe('isObjectLike', () => {
    it('returns true for objects (plain and class instances)', () => {
      expect(isObjectLike({})).toBe(true);
      expect(isObjectLike(new Date())).toBe(true);
      expect(isObjectLike(new Map())).toBe(true);
    });

    it('returns false for arrays', () => {
      expect(isObjectLike([])).toBe(false);
    });

    it('returns false for null and non-objects', () => {
      expect(isObjectLike(null)).toBe(false);
      expect(isObjectLike(undefined)).toBe(false);
      expect(isObjectLike('string')).toBe(false);
      expect(isObjectLike(42)).toBe(false);
    });
  });
});
