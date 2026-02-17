// main/shared/src/engine/security/prototype.test.ts
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
      list: [{ constructor: { dangerous: true } }, { ok: true }],
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
});
