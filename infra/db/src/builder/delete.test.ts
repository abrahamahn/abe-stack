// infra/db/src/builder/delete.test.ts
import { describe, expect, it } from 'vitest';

import { and, eq, lt } from './conditions';
import { del, deleteFrom, truncate, truncateCascade } from './delete';

describe('DeleteBuilder', () => {
  describe('basic deletes', () => {
    it('generates simple DELETE', () => {
      const query = deleteFrom('users').where(eq('id', 'user-123')).toSql();
      expect(query.text).toBe('DELETE FROM users WHERE id = $1');
      expect(query.values).toEqual(['user-123']);
    });

    it('del is alias for deleteFrom', () => {
      const query = del('users').where(eq('id', 'user-123')).toSql();
      expect(query.text).toBe('DELETE FROM users WHERE id = $1');
    });

    it('generates DELETE without WHERE (dangerous!)', () => {
      const query = deleteFrom('temp_table').toSql();
      expect(query.text).toBe('DELETE FROM temp_table');
      expect(query.values).toEqual([]);
    });

    it('handles table with schema', () => {
      const query = deleteFrom({ name: 'users', schema: 'public' })
        .where(eq('id', 'user-123'))
        .toSql();
      expect(query.text).toBe('DELETE FROM public.users WHERE id = $1');
    });

    it('handles table with alias', () => {
      const query = deleteFrom({ name: 'users', alias: 'u' }).where(eq('id', 'user-123')).toSql();
      expect(query.text).toBe('DELETE FROM users AS u WHERE id = $1');
    });
  });

  describe('WHERE clause', () => {
    it('generates WHERE with simple condition', () => {
      const query = deleteFrom('users').where(eq('active', false)).toSql();
      expect(query.text).toBe('DELETE FROM users WHERE active = $1');
      expect(query.values).toEqual([false]);
    });

    it('generates WHERE with AND conditions', () => {
      const query = deleteFrom('sessions')
        .where(and(eq('user_id', 'user-123'), lt('expires_at', new Date('2024-01-01'))))
        .toSql();
      expect(query.text).toBe('DELETE FROM sessions WHERE (user_id = $1 AND expires_at < $2)');
    });

    it('handles Date values', () => {
      const date = new Date('2024-01-01');
      const query = deleteFrom('sessions').where(lt('expires_at', date)).toSql();
      expect(query.values).toContain(date);
    });
  });

  describe('USING clause', () => {
    it('generates USING clause for joins', () => {
      const query = deleteFrom('orders')
        .using('users')
        .where(eq('orders.user_id', 'users.id'))
        .toSql();
      expect(query.text).toContain('USING users');
    });

    it('generates USING with multiple tables', () => {
      const query = deleteFrom('order_items')
        .using('orders')
        .using('users')
        .where(and(eq('order_items.order_id', 'orders.id'), eq('orders.user_id', 'users.id')))
        .toSql();
      expect(query.text).toContain('USING orders, users');
    });
  });

  describe('RETURNING clause', () => {
    it('generates RETURNING with specific columns', () => {
      const query = deleteFrom('users')
        .where(eq('id', 'user-123'))
        .returning('id', 'email')
        .toSql();
      expect(query.text).toBe('DELETE FROM users WHERE id = $1 RETURNING id, email');
    });

    it('generates RETURNING * with returningAll()', () => {
      const query = deleteFrom('users').where(eq('id', 'user-123')).returningAll().toSql();
      expect(query.text).toBe('DELETE FROM users WHERE id = $1 RETURNING *');
    });
  });

  describe('truncate', () => {
    it('generates TRUNCATE', () => {
      const query = truncate('temp_data');
      expect(query.text).toBe('TRUNCATE temp_data');
      expect(query.values).toEqual([]);
    });

    it('generates TRUNCATE with schema', () => {
      const query = truncate({ name: 'temp_data', schema: 'public' });
      expect(query.text).toBe('TRUNCATE public.temp_data');
    });

    it('generates TRUNCATE CASCADE', () => {
      const query = truncateCascade('parent_table');
      expect(query.text).toBe('TRUNCATE parent_table CASCADE');
    });
  });

  describe('complex queries', () => {
    it('generates DELETE with all options', () => {
      const query = deleteFrom('orders')
        .using('users')
        .where(and(eq('orders.user_id', 'users.id'), eq('users.active', false)))
        .returning('orders.id')
        .toSql();

      expect(query.text).toContain('DELETE FROM orders');
      expect(query.text).toContain('USING users');
      expect(query.text).toContain('WHERE');
      expect(query.text).toContain('RETURNING');
    });
  });
});
