// main/shared/src/system/security/prototype.test.ts
import { describe, expect, it } from 'vitest';

import { hasDangerousKeys, sanitizePrototype } from './prototype';

describe('prototype pollution helpers', () => {
  it('removes dangerous keys recursively', () => {
    const input = {
      safe: 'value',
      nested: {
        ['__proto__']: { hacked: true },
        keep: 1,
      },
      list: [{ constructor: { dangerous: true } }, { ok: true }] as unknown[],
    };

    const result = sanitizePrototype(input) as Record<string, unknown>;
    const nested = result['nested'] as Record<string, unknown>;
    const listFirst = (result['list'] as unknown[])[0] as Record<string, unknown>;

    expect(result['safe']).toBe('value');
    expect(nested['keep']).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(nested, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(listFirst, 'constructor')).toBe(false);
  });

  it('detects dangerous keys deeply', () => {
    expect(hasDangerousKeys({ a: { b: { prototype: true } } })).toBe(true);
    expect(hasDangerousKeys([{ ok: 1 }, { constructor: {} }])).toBe(true);
    expect(hasDangerousKeys({ safe: { value: 1 } })).toBe(false);
  });

  // ============================================================================
  // Adversarial Tests
  // ============================================================================

  describe('adversarial: sanitizePrototype', () => {
    it('returns primitives unchanged', () => {
      expect(sanitizePrototype(42)).toBe(42);
      expect(sanitizePrototype('hello')).toBe('hello');
      expect(sanitizePrototype(true)).toBe(true);
      expect(sanitizePrototype(null)).toBeNull();
      expect(sanitizePrototype(undefined)).toBeUndefined();
    });

    it('handles empty object', () => {
      expect(sanitizePrototype({})).toEqual({});
    });

    it('handles empty array', () => {
      expect(sanitizePrototype([])).toEqual([]);
    });

    it('strips constructor at the top level', () => {
      const obj: Record<string, unknown> = { constructor: { prototype: { evil: true } } };
      const result = sanitizePrototype(obj) as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
    });

    it('strips prototype key at top level', () => {
      const obj: Record<string, unknown> = { prototype: { evil: true } };
      const result = sanitizePrototype(obj) as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
    });

    it('strips dangerous keys deeply nested 10+ levels', () => {
      // Build a deeply nested object with a dangerous key at level 12.
      // We use a string key 'constructor' instead of __proto__ because
      // __proto__ assignment via bracket notation sets the actual prototype
      // rather than an own enumerable property, so Object.entries() won't see it.
      const deep: Record<string, unknown> = {};
      let current = deep;
      for (let i = 0; i < 11; i++) {
        const next: Record<string, unknown> = {};
        current['level'] = next;
        current = next;
      }
      current['constructor'] = { hacked: true };
      current['safe'] = 'value';

      const result = sanitizePrototype(deep) as Record<string, unknown>;

      // Walk down the sanitized tree
      let node = result;
      for (let i = 0; i < 11; i++) {
        node = node['level'] as Record<string, unknown>;
      }
      expect(Object.prototype.hasOwnProperty.call(node, 'constructor')).toBe(false);
      expect(node['safe']).toBe('value');
    });

    it('sanitizes arrays containing objects with dangerous keys', () => {
      const input: unknown[] = [
        { ok: 1 },
        { prototype: { evil: true }, name: 'attacker' },
        { constructor: { prototype: {} }, id: 42 },
      ];

      const result = sanitizePrototype(input) as Record<string, unknown>[];
      expect(Object.prototype.hasOwnProperty.call(result[1], 'prototype')).toBe(false);
      expect((result[1] as Record<string, unknown>)['name']).toBe('attacker');
      expect(Object.prototype.hasOwnProperty.call(result[2], 'constructor')).toBe(false);
      expect((result[2] as Record<string, unknown>)['id']).toBe(42);
    });

    it('sanitizes arrays-within-objects (mixed nesting)', () => {
      const input = {
        users: [
          { id: 1, prototype: { admin: true } },
          { id: 2, roles: [{ constructor: 'evil' }] },
        ],
      };

      const result = sanitizePrototype(input) as Record<string, unknown>;
      const users = result['users'] as Record<string, unknown>[];
      expect(Object.prototype.hasOwnProperty.call(users[0], 'prototype')).toBe(false);
      expect(users[0]!['id']).toBe(1);
      const roles = users[1]!['roles'] as Record<string, unknown>[];
      expect(Object.prototype.hasOwnProperty.call(roles[0], 'constructor')).toBe(false);
    });

    it('does not mutate the original object structure', () => {
      const original: Record<string, unknown> = { a: 1, constructor: { evil: true } };
      sanitizePrototype(original);
      // sanitizePrototype returns a new object; the original's own keys are unchanged
      expect(original['a']).toBe(1);
    });

    it('handles very large flat object', () => {
      const large: Record<string, unknown> = {};
      for (let i = 0; i < 10000; i++) {
        large[`key_${i}`] = i;
      }
      // Use 'prototype' rather than '__proto__' so it's an own enumerable key
      large['prototype'] = { evil: true };

      const result = sanitizePrototype(large) as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
      expect(result['key_9999']).toBe(9999);
    });

    it('handles object with numeric-string keys that look like indices', () => {
      const input = { '0': 'zero', '1': 'one', constructor: 'evil' };
      const result = sanitizePrototype(input) as Record<string, unknown>;
      expect(result['0']).toBe('zero');
      expect(result['1']).toBe('one');
      expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
    });

    it('preserves null values inside objects', () => {
      const input = { value: null, other: 'ok' };
      const result = sanitizePrototype(input) as Record<string, unknown>;
      expect(result['value']).toBeNull();
      expect(result['other']).toBe('ok');
    });

    it('sanitizes nested array of arrays', () => {
      const input = [[{ prototype: 'evil', ok: 1 }], [{ constructor: 'bad' }]];
      const result = sanitizePrototype(input) as unknown[][];
      const innerFirst = (result[0] as unknown[])[0] as Record<string, unknown>;
      const innerSecond = (result[1] as unknown[])[0] as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(innerFirst, 'prototype')).toBe(false);
      expect(innerFirst['ok']).toBe(1);
      expect(Object.prototype.hasOwnProperty.call(innerSecond, 'constructor')).toBe(false);
    });

    it('exposes real-world limitation: __proto__ bracket assignment evades Object.entries()', () => {
      // When you do obj['__proto__'] = x in JS, it sets the actual prototype.
      // Object.entries() only returns own enumerable keys, so '__proto__' set this way
      // is INVISIBLE to Object.entries() and therefore NOT stripped by sanitizePrototype.
      // This is a known JavaScript semantics quirk — tests document the actual behavior.
      const obj: Record<string, unknown> = {};
      obj['__proto__'] = { hidden: true };

      // '__proto__' is NOT an own enumerable property — it set the prototype instead
      expect(Object.prototype.hasOwnProperty.call(obj, '__proto__')).toBe(false);

      // sanitizePrototype cannot strip what Object.entries() cannot see
      const result = sanitizePrototype(obj) as Record<string, unknown>;
      // result will be {} — the prototype mutation happened at assignment time, not here
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    });
  });

  describe('adversarial: hasDangerousKeys', () => {
    it('returns false for primitive inputs', () => {
      expect(hasDangerousKeys(42)).toBe(false);
      expect(hasDangerousKeys('string')).toBe(false);
      expect(hasDangerousKeys(true)).toBe(false);
      expect(hasDangerousKeys(null)).toBe(false);
      expect(hasDangerousKeys(undefined)).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(hasDangerousKeys({})).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(hasDangerousKeys([])).toBe(false);
    });

    it('detects constructor at top level', () => {
      expect(hasDangerousKeys({ constructor: {} })).toBe(true);
    });

    it('detects prototype at top level', () => {
      expect(hasDangerousKeys({ prototype: {} })).toBe(true);
    });

    it('exposes limitation: __proto__ bracket-assignment sets JS prototype, not an own key', () => {
      // Assigning via obj['__proto__'] = ... sets the actual prototype, not an enumerable own key.
      // Object.keys() only yields own enumerable keys, so hasDangerousKeys cannot detect this form.
      // This is a real limitation of the implementation when __proto__ is used as a setter.
      const obj: Record<string, unknown> = {};
      obj['__proto__'] = { evil: true };

      // Empirically: hasDangerousKeys returns false because Object.keys() does not see '__proto__'
      // This documents the gap — the attacker-controlled prototype mutation already occurred at
      // assignment time, before hasDangerousKeys is even called.
      expect(Object.prototype.hasOwnProperty.call(obj, '__proto__')).toBe(false);
      expect(hasDangerousKeys(obj)).toBe(false); // documents the limitation, not a pass
    });

    it('detects __proto__ when explicitly set as an own enumerable property via Object.defineProperty', () => {
      // The only way to have __proto__ as an own enumerable key is Object.defineProperty
      const obj = Object.create(null) as Record<string, unknown>;
      Object.defineProperty(obj, '__proto__', { value: {}, enumerable: true, configurable: true });

      // Now Object.keys() CAN see it because it's an own enumerable key on a null-prototype object
      expect(Object.prototype.hasOwnProperty.call(obj, '__proto__')).toBe(true);
      expect(hasDangerousKeys(obj)).toBe(true);
    });

    it('detects constructor 10 levels deep (using prototype key)', () => {
      const deep: Record<string, unknown> = {};
      let current = deep;
      for (let i = 0; i < 9; i++) {
        const next: Record<string, unknown> = {};
        current['child'] = next;
        current = next;
      }
      current['constructor'] = { evil: true };
      expect(hasDangerousKeys(deep)).toBe(true);
    });

    it('detects dangerous keys inside arrays', () => {
      expect(hasDangerousKeys([1, 2, { constructor: 'evil' }])).toBe(true);
      expect(hasDangerousKeys(['a', 'b', 'c'])).toBe(false);
    });

    it('detects constructor.prototype attack path nested in array-in-object', () => {
      const input = {
        data: [{ legit: true }, { constructor: { prototype: { polluted: true } } }] as unknown[],
      };
      expect(hasDangerousKeys(input)).toBe(true);
    });

    it('returns false for deeply safe nested object', () => {
      const safe = { a: { b: { c: { d: { e: { f: 'leaf' } } } } } };
      expect(hasDangerousKeys(safe)).toBe(false);
    });

    it('returns false for array of safe objects', () => {
      const arr = [{ id: 1, name: 'alice' }, { id: 2, name: 'bob' }];
      expect(hasDangerousKeys(arr)).toBe(false);
    });

    it('detects dangerous key mixed with safe keys (string-literal key, not __proto__ setter)', () => {
      // Use Object.create(null) to get an object where 'prototype' is an own enumerable key
      const input: Record<string, unknown> = { safe: 'yes', alsoSafe: 123 };
      // Add 'prototype' as a normal own key (not the dangerous __proto__ setter path)
      input['prototype'] = { evil: true };
      expect(hasDangerousKeys(input)).toBe(true);
    });
  });
});
