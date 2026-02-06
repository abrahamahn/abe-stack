// packages/shared/src/contracts/schema.test.ts
/**
 * Tests for Schema Factory Helpers
 */

import { describe, expect, it } from 'vitest';

import { createSchema } from './schema';

describe('createSchema', () => {
  describe('parse', () => {
    it('returns validated data when validation succeeds', () => {
      const schema = createSchema<string>((data) => {
        if (typeof data !== 'string') throw new Error('Must be a string');
        return data;
      });

      expect(schema.parse('hello')).toBe('hello');
    });

    it('throws when validation fails', () => {
      const schema = createSchema<string>((data) => {
        if (typeof data !== 'string') throw new Error('Must be a string');
        return data;
      });

      expect(() => schema.parse(123)).toThrow('Must be a string');
    });

    it('transforms data during validation', () => {
      const schema = createSchema<number>((data) => {
        if (typeof data !== 'string') throw new Error('Must be a string');
        return parseInt(data, 10);
      });

      expect(schema.parse('42')).toBe(42);
    });
  });

  describe('safeParse', () => {
    it('returns success result when validation succeeds', () => {
      const schema = createSchema<string>((data) => {
        if (typeof data !== 'string') throw new Error('Must be a string');
        return data;
      });

      const result = schema.safeParse('hello');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('hello');
      }
    });

    it('returns error result when validation fails', () => {
      const schema = createSchema<string>((data) => {
        if (typeof data !== 'string') throw new Error('Must be a string');
        return data;
      });

      const result = schema.safeParse(123);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Must be a string');
      }
    });

    it('wraps non-Error throws in Error', () => {
      const schema = createSchema<string>(() => {
        throw 'string error';
      });

      const result = schema.safeParse('test');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      }
    });
  });

  describe('type inference', () => {
    it('preserves type through _type property', () => {
      interface User {
        id: string;
        name: string;
      }

      const schema = createSchema<User>((data) => {
        if (data === null || typeof data !== 'object') {
          throw new Error('Must be an object');
        }
        const obj = data as Record<string, unknown>;
        if (typeof obj['id'] !== 'string' || typeof obj['name'] !== 'string') {
          throw new Error('Invalid user');
        }
        return { id: obj['id'], name: obj['name'] };
      });

      const user = schema.parse({ id: '1', name: 'Test' });
      expect(user.id).toBe('1');
      expect(user.name).toBe('Test');
    });
  });
});
