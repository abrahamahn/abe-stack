// main/server/db/src/builder/update.test.ts
import { describe, expect, it } from 'vitest';

import { and, eq, gt } from './conditions';
import { update } from './update';

describe('UpdateBuilder', () => {
  describe('basic updates', () => {
    it('generates simple UPDATE', () => {
      const query = update('users').set({ name: 'Jane' }).where(eq('id', 'user-123')).toSql();
      expect(query.text).toBe('UPDATE users SET name = $1 WHERE id = $2');
      expect(query.values).toEqual(['Jane', 'user-123']);
    });

    it('generates UPDATE with multiple columns', () => {
      const query = update('users')
        .set({ name: 'Jane', email: 'jane@example.com' })
        .where(eq('id', 'user-123'))
        .toSql();
      expect(query.text).toBe('UPDATE users SET name = $1, email = $2 WHERE id = $3');
      expect(query.values).toEqual(['Jane', 'jane@example.com', 'user-123']);
    });

    it('handles null values', () => {
      const query = update('users')
        .set({ ['deleted_at']: null })
        .where(eq('id', 'user-123'))
        .toSql();
      expect(query.values).toContain(null);
    });

    it('handles Date values', () => {
      const date = new Date('2024-01-01');
      const query = update('users')
        .set({ ['updated_at']: date })
        .where(eq('id', 'user-123'))
        .toSql();
      expect(query.values).toContain(date);
    });

    it('handles boolean values', () => {
      const query = update('users').set({ active: false }).where(eq('id', 'user-123')).toSql();
      expect(query.values).toContain(false);
    });

    it('handles table with schema', () => {
      const query = update({ name: 'users', schema: 'public' })
        .set({ name: 'Jane' })
        .where(eq('id', 'user-123'))
        .toSql();
      expect(query.text).toContain('UPDATE public.users');
    });
  });

  describe('WHERE clause', () => {
    it('generates WHERE with simple condition', () => {
      const query = update('users').set({ name: 'Jane' }).where(eq('id', 'user-123')).toSql();
      expect(query.text).toContain('WHERE id = ');
    });

    it('generates WHERE with AND conditions', () => {
      const query = update('users')
        .set({ name: 'Jane' })
        .where(and(eq('id', 'user-123'), eq('active', true)))
        .toSql();
      expect(query.text).toContain('WHERE (id = ');
      expect(query.text).toContain(' AND active = ');
    });

    it('generates UPDATE without WHERE', () => {
      const query = update('users').set({ name: 'Jane' }).toSql();
      expect(query.text).toBe('UPDATE users SET name = $1');
      expect(query.text).not.toContain('WHERE');
    });
  });

  describe('raw expressions', () => {
    it('setRaw generates raw SQL expression', () => {
      const query = update('users')
        .setRaw('version', 'version + 1')
        .where(eq('id', 'user-123'))
        .toSql();
      expect(query.text).toBe('UPDATE users SET version = version + 1 WHERE id = $1');
      expect(query.values).toEqual(['user-123']);
    });

    it('increment generates column + value', () => {
      const query = update('users').increment('login_count', 1).where(eq('id', 'user-123')).toSql();
      expect(query.text).toBe('UPDATE users SET login_count = login_count + $1 WHERE id = $2');
      expect(query.values).toEqual([1, 'user-123']);
    });

    it('increment defaults to 1', () => {
      const query = update('users').increment('login_count').where(eq('id', 'user-123')).toSql();
      expect(query.values[0]).toBe(1);
    });

    it('decrement generates column - value', () => {
      const query = update('users').decrement('balance', 100).where(eq('id', 'user-123')).toSql();
      expect(query.text).toBe('UPDATE users SET balance = balance - $1 WHERE id = $2');
      expect(query.values).toEqual([100, 'user-123']);
    });

    it('combines regular set with increment', () => {
      const query = update('users')
        .set({ name: 'Jane' })
        .increment('login_count', 1)
        .where(eq('id', 'user-123'))
        .toSql();
      expect(query.text).toContain('name = $1');
      expect(query.text).toContain('login_count = login_count + $2');
    });
  });

  describe('RETURNING clause', () => {
    it('generates RETURNING with specific columns', () => {
      const query = update('users')
        .set({ name: 'Jane' })
        .where(eq('id', 'user-123'))
        .returning('id', 'updated_at')
        .toSql();
      expect(query.text).toContain('RETURNING id, updated_at');
    });

    it('generates RETURNING * with returningAll()', () => {
      const query = update('users')
        .set({ name: 'Jane' })
        .where(eq('id', 'user-123'))
        .returningAll()
        .toSql();
      expect(query.text).toContain('RETURNING *');
    });
  });

  describe('FROM clause', () => {
    it('generates FROM clause for joins', () => {
      const query = update('orders')
        .set({ status: 'shipped' })
        .from('users')
        .where(eq('orders.user_id', 'users.id'))
        .toSql();
      expect(query.text).toContain('FROM users');
    });
  });

  describe('error handling', () => {
    it('throws error if no set values provided', () => {
      expect(() => {
        update('users').where(eq('id', 'user-123')).toSql();
      }).toThrow('UPDATE requires at least one column to set');
    });
  });

  describe('complex queries', () => {
    it('generates UPDATE with all options', () => {
      const query = update('users')
        .set({ name: 'Jane', email: 'jane@example.com' })
        .increment('version')
        .where(and(eq('id', 'user-123'), gt('version', 0)))
        .returning('id', 'name', 'email', 'version')
        .toSql();

      expect(query.text).toContain('UPDATE users SET');
      expect(query.text).toContain('name = ');
      expect(query.text).toContain('email = ');
      expect(query.text).toContain('version = version + ');
      expect(query.text).toContain('WHERE');
      expect(query.text).toContain('RETURNING');
    });

    it('maintains correct parameter order', () => {
      const query = update('users')
        .set({ name: 'Jane' })
        .increment('count', 5)
        .where(and(eq('id', 'user-123'), eq('active', true)))
        .toSql();

      // Order: name value, increment value, where conditions
      expect(query.values[0]).toBe('Jane');
      expect(query.values[1]).toBe(5);
      expect(query.values[2]).toBe('user-123');
      expect(query.values[3]).toBe(true);
    });
  });
});
