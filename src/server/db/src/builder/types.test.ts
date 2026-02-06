// backend/db/src/builder/types.test.ts
import { describe, expect, it } from 'vitest';

import {
  combine,
  EMPTY_FRAGMENT,
  escapeIdentifier,
  formatTable,
  fragment,
  param,
  raw,
} from './types';

describe('types', () => {
  describe('EMPTY_FRAGMENT', () => {
    it('has empty text and values', () => {
      expect(EMPTY_FRAGMENT.text).toBe('');
      expect(EMPTY_FRAGMENT.values).toEqual([]);
    });
  });

  describe('fragment', () => {
    it('creates fragment with text and values', () => {
      const f = fragment('id = $1', ['user-123']);
      expect(f.text).toBe('id = $1');
      expect(f.values).toEqual(['user-123']);
    });

    it('creates fragment with empty values by default', () => {
      const f = fragment('SELECT 1');
      expect(f.text).toBe('SELECT 1');
      expect(f.values).toEqual([]);
    });
  });

  describe('raw', () => {
    it('creates fragment without values', () => {
      const f = raw('users.id = orders.user_id');
      expect(f.text).toBe('users.id = orders.user_id');
      expect(f.values).toEqual([]);
    });
  });

  describe('param', () => {
    it('creates parameterized placeholder', () => {
      const f = param('value', 1);
      expect(f.text).toBe('$1');
      expect(f.values).toEqual(['value']);
    });

    it('uses provided index', () => {
      const f = param('value', 5);
      expect(f.text).toBe('$5');
    });
  });

  describe('combine', () => {
    it('combines fragments with default separator', () => {
      const result = combine([fragment('SELECT *'), fragment('FROM users')]);
      expect(result.text).toBe('SELECT * FROM users');
      expect(result.values).toEqual([]);
    });

    it('combines fragments with custom separator', () => {
      const result = combine([fragment('a = $1', [1]), fragment('b = $1', [2])], ' AND ');
      expect(result.text).toBe('a = $1 AND b = $2');
      expect(result.values).toEqual([1, 2]);
    });

    it('renumbers parameters correctly', () => {
      const result = combine([
        fragment('a = $1 AND b = $2', [1, 2]),
        fragment('c = $1', [3]),
        fragment('d = $1 AND e = $2', [4, 5]),
      ]);
      expect(result.text).toBe('a = $1 AND b = $2 c = $3 d = $4 AND e = $5');
      expect(result.values).toEqual([1, 2, 3, 4, 5]);
    });

    it('handles empty fragments', () => {
      const result = combine([fragment('a'), EMPTY_FRAGMENT, fragment('b')]);
      expect(result.text).toBe('a b');
    });

    it('returns empty fragment for empty array', () => {
      const result = combine([]);
      expect(result.text).toBe('');
      expect(result.values).toEqual([]);
    });

    it('handles fragments with no parameters', () => {
      const result = combine([raw('SELECT *'), raw('FROM users'), raw('WHERE active')]);
      expect(result.text).toBe('SELECT * FROM users WHERE active');
      expect(result.values).toEqual([]);
    });

    it('preserves $10+ parameter syntax', () => {
      const values = Array.from({ length: 12 }, (_, i) => i + 1);
      const fragments = values.map((v) => fragment(`col${String(v)} = $1`, [v]));
      const result = combine(fragments, ', ');

      // Should have $1 through $12
      expect(result.text).toContain('$10');
      expect(result.text).toContain('$11');
      expect(result.text).toContain('$12');
      expect(result.values).toEqual(values);
    });
  });

  describe('escapeIdentifier', () => {
    it('returns simple identifiers unchanged', () => {
      expect(escapeIdentifier('users')).toBe('users');
      expect(escapeIdentifier('user_id')).toBe('user_id');
      expect(escapeIdentifier('Users123')).toBe('Users123');
    });

    it('quotes identifiers with special characters', () => {
      expect(escapeIdentifier('user-name')).toBe('"user-name"');
      expect(escapeIdentifier('user name')).toBe('"user name"');
      expect(escapeIdentifier('user.name')).toBe('"user.name"');
    });

    it('escapes double quotes in identifiers', () => {
      expect(escapeIdentifier('user"name')).toBe('"user""name"');
    });
  });

  describe('formatTable', () => {
    it('formats simple table name', () => {
      expect(formatTable({ name: 'users' })).toEqual({ text: 'users', values: [] });
    });

    it('formats table with schema', () => {
      expect(formatTable({ name: 'users', schema: 'public' })).toEqual({
        text: 'public.users',
        values: [],
      });
    });

    it('formats table with alias', () => {
      expect(formatTable({ name: 'users', alias: 'u' })).toEqual({
        text: 'users AS u',
        values: [],
      });
    });

    it('formats table with schema and alias', () => {
      expect(formatTable({ name: 'users', schema: 'public', alias: 'u' })).toEqual({
        text: 'public.users AS u',
        values: [],
      });
    });

    it('quotes special characters in table name', () => {
      expect(formatTable({ name: 'user-data' })).toEqual({ text: '"user-data"', values: [] });
    });

    it('formats subquery table', () => {
      const subqueryMock = { text: 'SELECT 1', values: [100] };
      expect(formatTable({ name: 'ignored', alias: 'sub', subquery: subqueryMock })).toEqual({
        text: '(SELECT 1) AS sub',
        values: [100],
      });
    });
  });
});
