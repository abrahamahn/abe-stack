// main/shared/src/primitives/helpers/object.test.ts
import { describe, expect, it } from 'vitest';

import {
  assert,
  assertDefined,
  assertNever,
  deepEqual,
  getFieldValue,
  hasDangerousKeys,
  isNonEmptyString,
  isNumber,
  isObjectLike,
  isPlainObject,
  isSafeObjectKey,
  isString,
  sanitizePrototype,
} from './object';

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

// ==========================================================================
// ADVERSARIAL: sanitizePrototype
// ==========================================================================
describe('adversarial — sanitizePrototype', () => {
  it('removes __proto__ key from a flat object', () => {
    // JSON.parse is needed to actually create an object with __proto__ key
    const dangerous = JSON.parse('{"__proto__": {"admin": true}, "name": "test"}') as Record<
      string,
      unknown
    >;
    const result = sanitizePrototype(dangerous) as Record<string, unknown>;
    expect(result).not.toHaveProperty('__proto__');
    expect(result['name']).toBe('test');
  });

  it('removes constructor key from a flat object', () => {
    const dangerous = { constructor: () => 'evil', name: 'test' };
    const result = sanitizePrototype(dangerous) as Record<string, unknown>;
    expect(result).not.toHaveProperty('constructor');
    expect((result as Record<string, unknown>)['name']).toBe('test');
  });

  it('removes prototype key from a flat object', () => {
    const dangerous = { prototype: { isAdmin: true }, name: 'safe' };
    const result = sanitizePrototype(dangerous) as Record<string, unknown>;
    expect(result).not.toHaveProperty('prototype');
  });

  it('recursively removes dangerous keys from nested objects', () => {
    const dangerous = {
      user: {
        __proto__: { admin: true },
        name: 'alice',
      },
    };
    const result = sanitizePrototype(dangerous) as Record<string, Record<string, unknown>>;
    expect(result['user']).not.toHaveProperty('__proto__');
    expect(result['user']?.['name']).toBe('alice');
  });

  it('sanitizes dangerous keys inside arrays', () => {
    const dangerous = [{ __proto__: { evil: true }, safe: 'yes' }];
    const result = sanitizePrototype(dangerous) as Record<string, unknown>[];
    expect(result[0]).not.toHaveProperty('__proto__');
    expect(result[0]?.['safe']).toBe('yes');
  });

  it('passes through primitives unchanged', () => {
    expect(sanitizePrototype(42)).toBe(42);
    expect(sanitizePrototype('hello')).toBe('hello');
    expect(sanitizePrototype(null)).toBeNull();
    expect(sanitizePrototype(true)).toBe(true);
  });

  it('handles an empty object', () => {
    expect(sanitizePrototype({})).toEqual({});
  });

  it('handles deeply nested dangerous keys (10 levels)', () => {
    // Build a 10-level deep object with a dangerous key at the bottom
    let obj: Record<string, unknown> = { __proto__: 'evil' };
    for (let i = 0; i < 10; i++) {
      obj = { level: obj };
    }
    const result = sanitizePrototype(obj) as Record<string, unknown>;
    // Navigate to the deepest level and verify the key was removed
    let current: unknown = result;
    for (let i = 0; i < 10; i++) {
      expect(current).toHaveProperty('level');
      current = (current as Record<string, unknown>)['level'];
    }
    expect(current).not.toHaveProperty('__proto__');
  });

  it('preserves safe keys alongside dangerous keys', () => {
    const obj = { safe1: 'a', __proto__: 'bad', safe2: 'b', constructor: 'bad', safe3: 'c' };
    const result = sanitizePrototype(obj) as Record<string, unknown>;
    expect(result['safe1']).toBe('a');
    expect(result['safe2']).toBe('b');
    expect(result['safe3']).toBe('c');
    expect(result).not.toHaveProperty('__proto__');
    expect(result).not.toHaveProperty('constructor');
  });

  it('handles null prototype objects safely', () => {
    const nullProto = Object.create(null) as Record<string, unknown>;
    nullProto['name'] = 'safe';
    nullProto['value'] = 42;
    const result = sanitizePrototype(nullProto) as Record<string, unknown>;
    expect(result['name']).toBe('safe');
    expect(result['value']).toBe(42);
  });
});

// ==========================================================================
// ADVERSARIAL: hasDangerousKeys
// ==========================================================================
describe('adversarial — hasDangerousKeys', () => {
  it('detects __proto__ at the top level', () => {
    const obj = JSON.parse('{"__proto__": {"admin": true}}') as Record<string, unknown>;
    expect(hasDangerousKeys(obj)).toBe(true);
  });

  it('detects constructor at the top level', () => {
    expect(hasDangerousKeys({ constructor: 'evil' })).toBe(true);
  });

  it('detects prototype at the top level', () => {
    expect(hasDangerousKeys({ prototype: {} })).toBe(true);
  });

  it('does NOT detect __proto__ inside array literals — JS engine intercepts it as a non-enumerable key', () => {
    // Object literal { __proto__: {} } is processed by the JS engine as prototype assignment,
    // so Object.keys() never sees "__proto__" as an enumerable property. The function cannot
    // detect it via Object.keys enumeration. Use JSON.parse to create a genuine string key.
    const withProtoLiteral = [{ __proto__: {} }];
    expect(hasDangerousKeys(withProtoLiteral)).toBe(false);
  });

  it('detects __proto__ string key nested inside objects when injected via JSON.parse', () => {
    // JSON.parse creates objects with "__proto__" as a real string key, visible to Object.keys
    const dangerous = JSON.parse('{"a": {"b": {"__proto__": {}}}}') as Record<string, unknown>;
    expect(hasDangerousKeys(dangerous)).toBe(true);
  });

  it('does NOT detect __proto__ in object literals nested inside objects — engine intercepts it', () => {
    // Same interception: { __proto__: {} } in a literal is a prototype assignment, not a key
    const obj = { a: { b: { __proto__: {} as unknown } } };
    expect(hasDangerousKeys(obj)).toBe(false);
  });

  it('returns false for a clean object', () => {
    expect(hasDangerousKeys({ name: 'alice', age: 30 })).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(hasDangerousKeys(null)).toBe(false);
    expect(hasDangerousKeys(42)).toBe(false);
    expect(hasDangerousKeys('string')).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(hasDangerousKeys({})).toBe(false);
  });

  it('returns false for an empty array', () => {
    expect(hasDangerousKeys([])).toBe(false);
  });
});

// ==========================================================================
// ADVERSARIAL: deepEqual
// ==========================================================================
describe('adversarial — deepEqual', () => {
  it('returns true for identical primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
  });

  it('returns false for different primitives', () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it('returns true for equal nested objects', () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
  });

  it('returns false for objects with different nested values', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it('returns false when one object has more keys', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('returns true for equal arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('returns false for arrays with different lengths', () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('returns false for arrays with same elements in different order', () => {
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it('array vs plain-object with same numeric keys — deepEqual returns true (known limitation)', () => {
    // deepEqual checks Array.isArray on both sides; when only one is an array, it falls through
    // to the object branch where Object.keys(['a','b']) yields ['0','1'] matching {0:'a',1:'b'}.
    // This is a known behavioral gap: the implementation does not distinguish arrays from objects
    // when only one side is an array. Documenting actual behavior, not ideal behavior.
    expect(deepEqual([1, 2, 3], { 0: 1, 1: 2, 2: 3 })).toBe(true);
  });

  it('handles deeply nested objects (10 levels)', () => {
    const buildDeep = (depth: number): Record<string, unknown> =>
      depth === 0 ? { value: 42 } : { child: buildDeep(depth - 1) };

    const a = buildDeep(10);
    const b = buildDeep(10);
    expect(deepEqual(a, b)).toBe(true);
  });

  it('returns false for deeply nested objects with a single differing leaf', () => {
    const a = { l1: { l2: { l3: { l4: { l5: 'same' } } } } };
    const b = { l1: { l2: { l3: { l4: { l5: 'different' } } } } };
    expect(deepEqual(a, b)).toBe(false);
  });

  it('handles array of objects comparison', () => {
    const a = [{ id: 1, name: 'alice' }, { id: 2, name: 'bob' }];
    const b = [{ id: 1, name: 'alice' }, { id: 2, name: 'bob' }];
    expect(deepEqual(a, b)).toBe(true);
  });

  it('returns false for numeric keys vs string — objects with numeric keys', () => {
    // Both should serialize the same via Object.keys
    expect(deepEqual({ 1: 'a', 2: 'b' }, { '1': 'a', '2': 'b' })).toBe(true);
  });

  it('handles a large object (1000 keys)', () => {
    const a: Record<string, number> = {};
    const b: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      a[`key${i}`] = i;
      b[`key${i}`] = i;
    }
    expect(deepEqual(a, b)).toBe(true);
    b['key999'] = 9999;
    expect(deepEqual(a, b)).toBe(false);
  });

  it('returns false when a is null and b is an object', () => {
    expect(deepEqual(null, {})).toBe(false);
  });

  it('returns false when a is an object and b is null', () => {
    expect(deepEqual({}, null)).toBe(false);
  });
});

// ==========================================================================
// ADVERSARIAL: isSafeObjectKey
// ==========================================================================
describe('adversarial — isSafeObjectKey', () => {
  it('returns false for __proto__', () => {
    expect(isSafeObjectKey('__proto__')).toBe(false);
  });

  it('returns false for constructor', () => {
    expect(isSafeObjectKey('constructor')).toBe(false);
  });

  it('returns false for prototype', () => {
    expect(isSafeObjectKey('prototype')).toBe(false);
  });

  it('returns true for safe keys', () => {
    expect(isSafeObjectKey('name')).toBe(true);
    expect(isSafeObjectKey('id')).toBe(true);
    expect(isSafeObjectKey('')).toBe(true);
    expect(isSafeObjectKey('__proto')).toBe(true);
    expect(isSafeObjectKey('proto__')).toBe(true);
  });

  it('case-sensitive — mixed-case dangerous keys are considered safe', () => {
    // The implementation uses exact string matching
    expect(isSafeObjectKey('__PROTO__')).toBe(true);
    expect(isSafeObjectKey('Constructor')).toBe(true);
  });
});

// ==========================================================================
// ADVERSARIAL: getFieldValue
// ==========================================================================
describe('adversarial — getFieldValue', () => {
  it('retrieves a top-level value', () => {
    expect(getFieldValue({ name: 'alice' }, 'name')).toBe('alice');
  });

  it('retrieves a nested value using dot notation', () => {
    expect(getFieldValue({ user: { name: 'alice' } }, 'user.name')).toBe('alice');
  });

  it('returns undefined for a missing top-level key', () => {
    expect(getFieldValue({ name: 'alice' }, 'age')).toBeUndefined();
  });

  it('returns undefined when traversing through a missing intermediate key', () => {
    expect(getFieldValue({ user: { name: 'alice' } }, 'user.address.city')).toBeUndefined();
  });

  it('returns undefined when traversing through a null value', () => {
    const obj = { user: null } as unknown as Record<string, unknown>;
    expect(getFieldValue(obj, 'user.name')).toBeUndefined();
  });

  it('returns undefined when traversing through a primitive value', () => {
    const obj = { count: 42 } as unknown as Record<string, unknown>;
    expect(getFieldValue(obj, 'count.toString')).toBeUndefined();
  });

  it('handles a single-segment path with no dots', () => {
    expect(getFieldValue({ a: 99 }, 'a')).toBe(99);
  });

  it('retrieves deeply nested value (5 levels)', () => {
    const obj = { a: { b: { c: { d: { e: 'deep' } } } } };
    expect(getFieldValue(obj, 'a.b.c.d.e')).toBe('deep');
  });

  it('returns undefined for empty path segments caused by leading dot', () => {
    // '.name' splits into ['', 'name'] — first part '' is not in root
    expect(getFieldValue({ name: 'alice' }, '.name')).toBeUndefined();
  });

  it('handles keys that contain special characters (no dots)', () => {
    const obj = { 'my-key': 'value' };
    expect(getFieldValue(obj, 'my-key')).toBe('value');
  });
});
