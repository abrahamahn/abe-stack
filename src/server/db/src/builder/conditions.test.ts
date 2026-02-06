// backend/db/src/builder/conditions.test.ts
import { describe, expect, it } from 'vitest';

import {
  and,
  any,
  arrayContains,
  arrayOverlaps,
  between,
  colEq,
  contains,
  endsWith,
  eq,
  escapeLikePattern,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  jsonbContainedBy,
  jsonbContains,
  jsonbEq,
  jsonbHasAllKeys,
  jsonbHasAnyKey,
  jsonbHasKey,
  jsonbPath,
  jsonbPathEq,
  jsonbPathText,
  like,
  lt,
  lte,
  ne,
  not,
  notBetween,
  notExists,
  notIlike,
  notInArray,
  notLike,
  or,
  rawCondition,
  startsWith,
} from './conditions';

describe('conditions', () => {
  describe('comparison operators', () => {
    it('eq generates equals condition', () => {
      const result = eq('email', 'user@example.com');
      expect(result.text).toBe('email = $1');
      expect(result.values).toEqual(['user@example.com']);
    });

    it('ne generates not equals condition', () => {
      const result = ne('status', 'deleted');
      expect(result.text).toBe('status <> $1');
      expect(result.values).toEqual(['deleted']);
    });

    it('gt generates greater than condition', () => {
      const result = gt('age', 18);
      expect(result.text).toBe('age > $1');
      expect(result.values).toEqual([18]);
    });

    it('gte generates greater than or equal condition', () => {
      const result = gte('score', 100);
      expect(result.text).toBe('score >= $1');
      expect(result.values).toEqual([100]);
    });

    it('lt generates less than condition', () => {
      const result = lt('price', 50);
      expect(result.text).toBe('price < $1');
      expect(result.values).toEqual([50]);
    });

    it('lte generates less than or equal condition', () => {
      const result = lte('quantity', 10);
      expect(result.text).toBe('quantity <= $1');
      expect(result.values).toEqual([10]);
    });
  });

  describe('null checks', () => {
    it('isNull generates IS NULL condition', () => {
      const result = isNull('deleted_at');
      expect(result.text).toBe('deleted_at IS NULL');
      expect(result.values).toEqual([]);
    });

    it('isNotNull generates IS NOT NULL condition', () => {
      const result = isNotNull('email_verified_at');
      expect(result.text).toBe('email_verified_at IS NOT NULL');
      expect(result.values).toEqual([]);
    });
  });

  describe('array operators', () => {
    it('inArray generates IN condition', () => {
      const result = inArray('role', ['admin', 'moderator']);
      expect(result.text).toBe('role IN ($1, $2)');
      expect(result.values).toEqual(['admin', 'moderator']);
    });

    it('inArray with empty array returns FALSE', () => {
      const result = inArray('role', []);
      expect(result.text).toBe('FALSE');
      expect(result.values).toEqual([]);
    });

    it('notInArray generates NOT IN condition', () => {
      const result = notInArray('status', ['deleted', 'archived']);
      expect(result.text).toBe('status NOT IN ($1, $2)');
      expect(result.values).toEqual(['deleted', 'archived']);
    });

    it('notInArray with empty array returns TRUE', () => {
      const result = notInArray('status', []);
      expect(result.text).toBe('TRUE');
      expect(result.values).toEqual([]);
    });
  });

  describe('range operators', () => {
    it('between generates BETWEEN condition', () => {
      const result = between('age', 18, 65);
      expect(result.text).toBe('age BETWEEN $1 AND $2');
      expect(result.values).toEqual([18, 65]);
    });

    it('notBetween generates NOT BETWEEN condition', () => {
      const result = notBetween('temperature', -10, 50);
      expect(result.text).toBe('temperature NOT BETWEEN $1 AND $2');
      expect(result.values).toEqual([-10, 50]);
    });
  });

  describe('string pattern matching', () => {
    it('like generates LIKE condition', () => {
      const result = like('name', 'John%');
      expect(result.text).toBe('name LIKE $1');
      expect(result.values).toEqual(['John%']);
    });

    it('ilike generates ILIKE condition', () => {
      const result = ilike('email', '%@gmail.com');
      expect(result.text).toBe('email ILIKE $1');
      expect(result.values).toEqual(['%@gmail.com']);
    });

    it('notLike generates NOT LIKE condition', () => {
      const result = notLike('name', 'Test%');
      expect(result.text).toBe('name NOT LIKE $1');
      expect(result.values).toEqual(['Test%']);
    });

    it('notIlike generates NOT ILIKE condition', () => {
      const result = notIlike('email', '%@spam.com');
      expect(result.text).toBe('email NOT ILIKE $1');
      expect(result.values).toEqual(['%@spam.com']);
    });

    it('escapeLikePattern escapes wildcards', () => {
      expect(escapeLikePattern('50% off!')).toBe('50\\% off!');
      expect(escapeLikePattern('user_name')).toBe('user\\_name');
      expect(escapeLikePattern('back\\slash')).toBe('back\\\\slash');
    });

    it('contains generates escaped ILIKE with wildcards', () => {
      const result = contains('description', 'search term');
      expect(result.text).toBe('description ILIKE $1');
      expect(result.values).toEqual(['%search term%']);
    });

    it('contains escapes special characters in value', () => {
      const result = contains('description', '50% off');
      expect(result.values).toEqual(['%50\\% off%']);
    });

    it('startsWith generates escaped ILIKE with suffix wildcard', () => {
      const result = startsWith('name', 'John');
      expect(result.text).toBe('name ILIKE $1');
      expect(result.values).toEqual(['John%']);
    });

    it('endsWith generates escaped ILIKE with prefix wildcard', () => {
      const result = endsWith('email', '@example.com');
      expect(result.text).toBe('email ILIKE $1');
      expect(result.values).toEqual(['%@example.com']);
    });
  });

  describe('logical operators', () => {
    it('and combines conditions with AND', () => {
      const result = and(eq('active', true), gt('age', 18));
      expect(result.text).toBe('(active = $1 AND age > $2)');
      expect(result.values).toEqual([true, 18]);
    });

    it('and with single condition returns that condition', () => {
      const result = and(eq('active', true));
      expect(result.text).toBe('active = $1');
      expect(result.values).toEqual([true]);
    });

    it('and with empty conditions returns empty fragment', () => {
      const result = and();
      expect(result.text).toBe('');
      expect(result.values).toEqual([]);
    });

    it('or combines conditions with OR', () => {
      const result = or(eq('role', 'admin'), eq('role', 'superadmin'));
      expect(result.text).toBe('(role = $1 OR role = $2)');
      expect(result.values).toEqual(['admin', 'superadmin']);
    });

    it('or with single condition returns that condition', () => {
      const result = or(eq('role', 'admin'));
      expect(result.text).toBe('role = $1');
      expect(result.values).toEqual(['admin']);
    });

    it('not negates a condition', () => {
      const result = not(eq('deleted', true));
      expect(result.text).toBe('NOT (deleted = $1)');
      expect(result.values).toEqual([true]);
    });

    it('not with empty condition returns empty fragment', () => {
      const result = not({ text: '', values: [] });
      expect(result.text).toBe('');
      expect(result.values).toEqual([]);
    });

    it('nested and/or combinations work correctly', () => {
      const result = and(eq('active', true), or(eq('role', 'admin'), eq('role', 'moderator')));
      expect(result.text).toBe('(active = $1 AND (role = $2 OR role = $3))');
      expect(result.values).toEqual([true, 'admin', 'moderator']);
    });
  });

  describe('PostgreSQL-specific operators', () => {
    it('any generates ANY condition', () => {
      const result = any('tags', 'typescript');
      expect(result.text).toBe('$1 = ANY(tags)');
      expect(result.values).toEqual(['typescript']);
    });

    it('arrayContains generates @> condition', () => {
      const result = arrayContains('tags', ['a', 'b']);
      expect(result.text).toBe('tags @> $1');
      expect(result.values).toEqual([['a', 'b']]);
    });

    it('arrayOverlaps generates && condition', () => {
      const result = arrayOverlaps('tags', ['a', 'b']);
      expect(result.text).toBe('tags && $1');
      expect(result.values).toEqual([['a', 'b']]);
    });

    it('jsonbEq generates JSON field equals condition', () => {
      const result = jsonbEq('metadata', 'type', 'premium');
      expect(result.text).toBe("metadata->>'type' = $1");
      expect(result.values).toEqual(['premium']);
    });

    it('jsonbHasKey generates JSON key exists condition', () => {
      const result = jsonbHasKey('metadata', 'premium');
      expect(result.text).toBe('metadata ? $1');
      expect(result.values).toEqual(['premium']);
    });

    it('jsonbContains generates @> containment condition', () => {
      const result = jsonbContains('metadata', { role: 'admin' });
      expect(result.text).toBe('metadata @> $1::jsonb');
      expect(result.values).toEqual(['{"role":"admin"}']);
    });

    it('jsonbContainedBy generates <@ containment condition', () => {
      const result = jsonbContainedBy('metadata', { a: 1, b: 2 });
      expect(result.text).toBe('metadata <@ $1::jsonb');
      expect(result.values).toEqual(['{"a":1,"b":2}']);
    });

    it('jsonbHasAnyKey generates ?| condition', () => {
      const result = jsonbHasAnyKey('metadata', ['a', 'b', 'c']);
      expect(result.text).toBe('metadata ?| $1');
      expect(result.values).toEqual([['a', 'b', 'c']]);
    });

    it('jsonbHasAllKeys generates ?& condition', () => {
      const result = jsonbHasAllKeys('metadata', ['required1', 'required2']);
      expect(result.text).toBe('metadata ?& $1');
      expect(result.values).toEqual([['required1', 'required2']]);
    });

    it('jsonbPath generates #> path access', () => {
      const result = jsonbPath('metadata', ['user', 'settings']);
      expect(result.text).toBe('metadata #> $1');
      expect(result.values).toEqual([['user', 'settings']]);
    });

    it('jsonbPathText generates #>> path text access', () => {
      const result = jsonbPathText('metadata', ['user', 'name']);
      expect(result.text).toBe('metadata #>> $1');
      expect(result.values).toEqual([['user', 'name']]);
    });

    it('jsonbPathEq generates path equality condition', () => {
      const result = jsonbPathEq('metadata', ['user', 'role'], 'admin');
      expect(result.text).toBe('metadata #>> $1 = $2');
      expect(result.values).toEqual([['user', 'role'], 'admin']);
    });
  });

  describe('raw expressions', () => {
    it('rawCondition creates custom condition', () => {
      const result = rawCondition('EXTRACT(YEAR FROM "created_at") = $1', [2024]);
      expect(result.text).toBe('EXTRACT(YEAR FROM "created_at") = $1');
      expect(result.values).toEqual([2024]);
    });

    it('colEq compares two columns', () => {
      const result = colEq('updated_at', 'created_at');
      expect(result.text).toBe('updated_at = created_at');
      expect(result.values).toEqual([]);
    });

    it('exists generates EXISTS subquery', () => {
      const result = exists('SELECT 1 FROM orders WHERE user_id = $1', ['user-123']);
      expect(result.text).toBe('EXISTS (SELECT 1 FROM orders WHERE user_id = $1)');
      expect(result.values).toEqual(['user-123']);
    });

    it('notExists generates NOT EXISTS subquery', () => {
      const result = notExists('SELECT 1 FROM banned_users WHERE id = $1', ['user-123']);
      expect(result.text).toBe('NOT EXISTS (SELECT 1 FROM banned_users WHERE id = $1)');
      expect(result.values).toEqual(['user-123']);
    });
  });

  describe('complex scenarios', () => {
    it('handles complex nested conditions', () => {
      const result = and(
        eq('active', true),
        or(
          and(eq('role', 'admin'), isNull('deleted_at')),
          and(eq('role', 'user'), gt('login_count', 10)),
        ),
      );

      // Parameters should be correctly renumbered
      expect(result.values).toEqual([true, 'admin', 'user', 10]);
      expect(result.text).toContain('active = $1');
      expect(result.text).toContain('role = $2');
      expect(result.text).toContain('role = $3');
      expect(result.text).toContain('login_count > $4');
    });

    it('handles Date values', () => {
      const date = new Date('2024-01-01');
      const result = gt('created_at', date);
      expect(result.text).toBe('created_at > $1');
      expect(result.values).toEqual([date]);
    });

    it('handles null values', () => {
      const result = eq('deleted_at', null);
      expect(result.text).toBe('deleted_at = $1');
      expect(result.values).toEqual([null]);
    });

    it('handles boolean values', () => {
      const result = eq('active', true);
      expect(result.text).toBe('active = $1');
      expect(result.values).toEqual([true]);
    });
  });
});
