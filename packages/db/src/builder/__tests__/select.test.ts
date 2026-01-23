// packages/db/src/builder/__tests__/select.test.ts
import { describe, expect, it } from 'vitest';

import { and, eq, gt, isNull, or } from '../conditions';
import { select, selectCount, selectExists } from '../select';
import { raw } from '../types';
import { orderBy, partitionBy, rowNumber, sum } from '../window';

describe('SelectBuilder', () => {
  describe('basic queries', () => {
    it('generates simple SELECT *', () => {
      const query = select('users').toSql();
      expect(query.text).toBe('SELECT * FROM users');
      expect(query.values).toEqual([]);
    });

    it('generates SELECT with specific columns', () => {
      const query = select('users').columns('id', 'email', 'name').toSql();
      expect(query.text).toBe('SELECT id, email, name FROM users');
      expect(query.values).toEqual([]);
    });

    it('generates SELECT DISTINCT', () => {
      const query = select('users').distinct().columns('role').toSql();
      expect(query.text).toBe('SELECT DISTINCT role FROM users');
      expect(query.values).toEqual([]);
    });

    it('handles table with schema', () => {
      const query = select({ name: 'users', schema: 'public' }).toSql();
      expect(query.text).toBe('SELECT * FROM public.users');
    });

    it('handles table with alias', () => {
      const query = select({ name: 'users', alias: 'u' }).toSql();
      expect(query.text).toBe('SELECT * FROM users AS u');
    });
  });

  describe('WHERE clause', () => {
    it('generates WHERE with simple condition', () => {
      const query = select('users').where(eq('id', 'user-123')).toSql();
      expect(query.text).toBe('SELECT * FROM users WHERE id = $1');
      expect(query.values).toEqual(['user-123']);
    });

    it('generates WHERE with AND conditions', () => {
      const query = select('users').where(and(eq('active', true), gt('age', 18))).toSql();
      expect(query.text).toBe('SELECT * FROM users WHERE (active = $1 AND age > $2)');
      expect(query.values).toEqual([true, 18]);
    });

    it('generates WHERE with OR conditions', () => {
      const query = select('users')
        .where(or(eq('role', 'admin'), eq('role', 'moderator')))
        .toSql();
      expect(query.text).toBe('SELECT * FROM users WHERE (role = $1 OR role = $2)');
      expect(query.values).toEqual(['admin', 'moderator']);
    });

    it('generates WHERE with nested conditions', () => {
      const query = select('users')
        .where(and(eq('active', true), or(eq('role', 'admin'), isNull('deleted_at'))))
        .toSql();
      expect(query.text).toBe(
        'SELECT * FROM users WHERE (active = $1 AND (role = $2 OR deleted_at IS NULL))',
      );
      expect(query.values).toEqual([true, 'admin']);
    });
  });

  describe('ORDER BY clause', () => {
    it('generates ORDER BY ascending', () => {
      const query = select('users').orderBy('created_at', 'asc').toSql();
      expect(query.text).toBe('SELECT * FROM users ORDER BY created_at ASC');
    });

    it('generates ORDER BY descending', () => {
      const query = select('users').orderBy('created_at', 'desc').toSql();
      expect(query.text).toBe('SELECT * FROM users ORDER BY created_at DESC');
    });

    it('generates ORDER BY with NULLS FIRST', () => {
      const query = select('users').orderBy('deleted_at', 'asc', 'first').toSql();
      expect(query.text).toBe('SELECT * FROM users ORDER BY deleted_at ASC NULLS FIRST');
    });

    it('generates ORDER BY with multiple columns', () => {
      const query = select('users')
        .orderBy('role', 'asc')
        .orderBy('created_at', 'desc')
        .toSql();
      expect(query.text).toBe('SELECT * FROM users ORDER BY role ASC, created_at DESC');
    });
  });

  describe('LIMIT and OFFSET', () => {
    it('generates LIMIT', () => {
      const query = select('users').limit(10).toSql();
      expect(query.text).toBe('SELECT * FROM users LIMIT 10');
    });

    it('generates LIMIT and OFFSET', () => {
      const query = select('users').limit(10).offset(20).toSql();
      expect(query.text).toBe('SELECT * FROM users LIMIT 10 OFFSET 20');
    });
  });

  describe('GROUP BY and HAVING', () => {
    it('generates GROUP BY', () => {
      const query = select('orders').columns('user_id', 'COUNT(*)').groupBy('user_id').toSql();
      expect(query.text).toBe('SELECT user_id, "COUNT(*)" FROM orders GROUP BY user_id');
    });

    it('generates GROUP BY with multiple columns', () => {
      const query = select('orders')
        .columns('user_id', 'status', 'COUNT(*)')
        .groupBy('user_id', 'status')
        .toSql();
      expect(query.text).toBe(
        'SELECT user_id, status, "COUNT(*)" FROM orders GROUP BY user_id, status',
      );
    });

    it('generates GROUP BY with HAVING', () => {
      const query = select('orders')
        .columns('user_id', 'COUNT(*) as count')
        .groupBy('user_id')
        .having(gt('COUNT(*)', 5))
        .toSql();
      expect(query.text).toContain('GROUP BY user_id');
      expect(query.text).toContain('HAVING');
      expect(query.values).toContain(5);
    });
  });

  describe('JOINs', () => {
    it('generates INNER JOIN', () => {
      const query = select('users')
        .innerJoin('orders', raw('orders.user_id = users.id'))
        .toSql();
      expect(query.text).toBe(
        'SELECT * FROM users INNER JOIN orders ON orders.user_id = users.id',
      );
    });

    it('generates LEFT JOIN', () => {
      const query = select('users')
        .leftJoin('orders', raw('orders.user_id = users.id'))
        .toSql();
      expect(query.text).toBe(
        'SELECT * FROM users LEFT JOIN orders ON orders.user_id = users.id',
      );
    });

    it('generates RIGHT JOIN', () => {
      const query = select('users')
        .rightJoin('orders', raw('orders.user_id = users.id'))
        .toSql();
      expect(query.text).toBe(
        'SELECT * FROM users RIGHT JOIN orders ON orders.user_id = users.id',
      );
    });

    it('generates FULL JOIN', () => {
      const query = select('users')
        .fullJoin('orders', raw('orders.user_id = users.id'))
        .toSql();
      expect(query.text).toBe(
        'SELECT * FROM users FULL JOIN orders ON orders.user_id = users.id',
      );
    });

    it('generates multiple JOINs', () => {
      const query = select('users')
        .innerJoin('orders', raw('orders.user_id = users.id'))
        .leftJoin('payments', raw('payments.order_id = orders.id'))
        .toSql();
      expect(query.text).toContain('INNER JOIN orders ON orders.user_id = users.id');
      expect(query.text).toContain('LEFT JOIN payments ON payments.order_id = orders.id');
    });

    it('generates JOIN with alias', () => {
      const query = select({ name: 'users', alias: 'u' })
        .innerJoin({ name: 'orders', alias: 'o' }, raw('o.user_id = u.id'))
        .toSql();
      expect(query.text).toBe(
        'SELECT * FROM users AS u INNER JOIN orders AS o ON o.user_id = u.id',
      );
    });
  });

  describe('locking', () => {
    it('generates FOR UPDATE', () => {
      const query = select('users').where(eq('id', 'user-123')).forUpdate().toSql();
      expect(query.text).toBe('SELECT * FROM users WHERE id = $1 FOR UPDATE');
    });

    it('generates FOR SHARE', () => {
      const query = select('users').where(eq('id', 'user-123')).forShare().toSql();
      expect(query.text).toBe('SELECT * FROM users WHERE id = $1 FOR SHARE');
    });
  });

  describe('helper functions', () => {
    it('selectCount generates COUNT query', () => {
      const query = selectCount('users').where(eq('active', true)).toSql();
      expect(query.text).toContain('COUNT(*)');
      expect(query.text).toContain('WHERE active = $1');
      expect(query.values).toEqual([true]);
    });

    it('selectExists wraps subquery', () => {
      const subquery = select('users').where(eq('email', 'test@example.com')).toSql();
      const query = selectExists(subquery);
      expect(query.text).toBe('SELECT EXISTS (SELECT * FROM users WHERE email = $1)');
      expect(query.values).toEqual(['test@example.com']);
    });
  });

  describe('complex queries', () => {
    it('generates complete query with all clauses', () => {
      const query = select('users')
        .columns('id', 'email', 'name')
        .where(and(eq('active', true), gt('age', 18)))
        .orderBy('created_at', 'desc')
        .limit(10)
        .offset(20)
        .toSql();

      expect(query.text).toBe(
        'SELECT id, email, name FROM users WHERE (active = $1 AND age > $2) ORDER BY created_at DESC LIMIT 10 OFFSET 20',
      );
      expect(query.values).toEqual([true, 18]);
    });

    it('maintains correct parameter order with joins and where', () => {
      const query = select('users')
        .columns('users.id', 'orders.total')
        .innerJoin('orders', eq('orders.user_id', 'user-123'))
        .where(gt('orders.total', 100))
        .toSql();

      // Parameters should be in order: join condition, where condition
      expect(query.values[0]).toBe('user-123');
      expect(query.values[1]).toBe(100);
    });
  });

  describe('computed columns (window functions)', () => {
    it('adds window function with column()', () => {
      const query = select('orders')
        .columns('id', 'user_id', 'total')
        .column(rowNumber().over(partitionBy('user_id').orderBy('created_at', 'desc')), 'rn')
        .toSql();

      expect(query.text).toContain('id, user_id, total');
      expect(query.text).toContain(
        'ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn',
      );
    });

    it('adds aggregate window function', () => {
      const query = select('sales')
        .columns('id', 'region', 'amount')
        .column(sum('amount').over(partitionBy('region')), 'region_total')
        .toSql();

      expect(query.text).toContain('SUM(amount) OVER (PARTITION BY region) AS region_total');
    });

    it('handles multiple computed columns', () => {
      const query = select('data')
        .columns('id', 'value')
        .column(rowNumber().over(orderBy('value')), 'rn')
        .column(sum('value').over(), 'running_total')
        .toSql();

      expect(query.text).toContain('ROW_NUMBER()');
      expect(query.text).toContain('SUM(value)');
    });

    it('uses alias from window expression as() method', () => {
      const expr = rowNumber().over(orderBy('created_at')).as('row_num');
      const query = select('items').columns('id').column(expr).toSql();

      expect(query.text).toContain('ROW_NUMBER() OVER (ORDER BY created_at ASC) AS row_num');
    });

    it('explicit alias overrides expression alias', () => {
      const expr = rowNumber().over(orderBy('created_at')).as('row_num');
      const query = select('items').columns('id').column(expr, 'different_alias').toSql();

      expect(query.text).toContain('AS different_alias');
      expect(query.text).not.toContain('AS row_num');
    });

    it('handles computed column with parameterized values', () => {
      const query = select('products')
        .columns('id')
        .column(sum('price').over(partitionBy('category')), 'total')
        .where(eq('active', true))
        .toSql();

      expect(query.values).toContain(true);
    });

    it('adds subquery with columnSubquery()', () => {
      const subquery = select('orders').columns('COUNT(*)').where(eq('status', 'completed'));
      const query = select('users').columns('id', 'name').columnSubquery(subquery, 'order_count').toSql();

      expect(query.text).toContain('(SELECT');
      expect(query.text).toContain(') AS order_count');
      expect(query.values).toContain('completed');
    });

    it('correctly renumbers parameters in subquery', () => {
      const subquery = select('orders').columns('SUM(total)').where(eq('user_id', 'users.id'));
      const query = select('users')
        .columns('id')
        .columnSubquery(subquery, 'total_spent')
        .where(eq('active', true))
        .toSql();

      // Subquery param comes first (in computed columns), then WHERE param
      expect(query.values[0]).toBe('users.id');
      expect(query.values[1]).toBe(true);
    });
  });
});
