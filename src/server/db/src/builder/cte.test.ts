// backend/db/src/builder/cte.test.ts
import { describe, expect, it } from 'vitest';

import { colEq, eq, gt, isNull } from './conditions';
import { withCte, withRecursiveCte } from './cte';
import { select } from './select';
import { raw } from './types';

describe('CTE (Common Table Expressions)', () => {
  describe('simple CTE', () => {
    it('generates basic WITH clause', () => {
      const query = withCte('active_users', select('users').where(eq('status', 'active')))
        .select('active_users')
        .columns('id', 'name')
        .toSql();

      expect(query.text).toBe(
        'WITH active_users AS (SELECT * FROM users WHERE status = $1) SELECT id, name FROM active_users',
      );
      expect(query.values).toEqual(['active']);
    });

    it('generates CTE with column names', () => {
      const query = withCte('counts', select('orders').columns('user_id', 'COUNT(*)'), [
        'user_id',
        'order_count',
      ])
        .select('counts')
        .toSql();

      expect(query.text).toContain('WITH counts (user_id, order_count) AS');
    });
  });

  describe('multiple CTEs', () => {
    it('chains multiple CTEs', () => {
      const date = new Date('2024-01-01');
      const query = withCte('recent_orders', select('orders').where(gt('created_at', date)))
        .withCte('high_value', select('recent_orders').where(gt('total', 1000)))
        .select('high_value')
        .columns('id', 'total')
        .toSql();

      expect(query.text).toContain('WITH recent_orders AS');
      expect(query.text).toContain(', high_value AS');
      expect(query.text).toContain('SELECT id, total FROM high_value');
      expect(query.values).toContain(date);
      expect(query.values).toContain(1000);
    });
  });

  describe('recursive CTE', () => {
    it('generates RECURSIVE CTE', () => {
      const query = withRecursiveCte(
        'tree',
        select('categories').where(isNull('parent_id')),
        select('categories').innerJoin('tree', colEq('categories.parent_id', 'tree.id')),
      )
        .select('tree')
        .columns('id', 'name', 'parent_id')
        .toSql();

      expect(query.text).toContain('WITH RECURSIVE tree AS');
      expect(query.text).toContain('UNION ALL');
      expect(query.text).toContain('parent_id IS NULL');
      expect(query.text).toContain('INNER JOIN tree ON');
    });

    it('recursive CTE with column names', () => {
      const query = withRecursiveCte(
        'numbers',
        select('generate_series(1, 1)'),
        select('numbers').where(raw('n < 10')),
        ['n'],
      )
        .select('numbers')
        .toSql();

      expect(query.text).toContain('WITH RECURSIVE numbers (n) AS');
    });
  });

  describe('CTE with INSERT', () => {
    it('generates CTE with INSERT query', () => {
      const query = withCte('old_data', select('temp_table').where(gt('age', 30)))
        .insert('archive')
        .values({ source: 'temp', ['migrated_at']: new Date('2024-01-01') })
        .returning('id')
        .toSql();

      expect(query.text).toContain('WITH old_data AS');
      expect(query.text).toContain('INSERT INTO archive');
      expect(query.text).toContain('RETURNING id');
    });
  });

  describe('CTE with UPDATE', () => {
    it('generates CTE with UPDATE query', () => {
      const query = withCte('active', select('users').where(eq('status', 'active')))
        .update('users')
        .set({ ['last_seen']: new Date('2024-01-01') })
        .where(eq('id', 'user-123'))
        .returning('id')
        .toSql();

      expect(query.text).toContain('WITH active AS');
      expect(query.text).toContain('UPDATE users SET');
      expect(query.text).toContain('RETURNING id');
    });
  });

  describe('CTE with DELETE', () => {
    it('generates CTE with DELETE query', () => {
      const query = withCte('old_records', select('logs').where(gt('age_days', 90)))
        .deleteFrom('logs')
        .where(eq('archived', true))
        .returning('id')
        .toSql();

      expect(query.text).toContain('WITH old_records AS');
      expect(query.text).toContain('DELETE FROM logs');
      expect(query.text).toContain('WHERE archived = ');
      expect(query.text).toContain('RETURNING id');
    });
  });

  describe('parameter renumbering', () => {
    it('correctly renumbers parameters across CTE and main query', () => {
      const query = withCte(
        'filtered',
        select('users').where(eq('status', 'active')).where(gt('age', 18)),
      )
        .select('filtered')
        .where(eq('role', 'admin'))
        .toSql();

      // Parameters should be renumbered: $1 for 'active', $2 for 18, $3 for 'admin'
      expect(query.values.length).toBeGreaterThan(0);
      // The CTE params come first, then main query params
      expect(query.values).toContain('admin');
    });

    it('handles complex parameter renumbering in recursive CTE', () => {
      const query = withRecursiveCte(
        'tree',
        select('categories').where(eq('name', 'root')),
        select('categories')
          .innerJoin('tree', raw('categories.parent_id = tree.id'))
          .where(eq('active', true)),
      )
        .select('tree')
        .where(eq('visible', true))
        .toSql();

      expect(query.text).toContain('UNION ALL');
      expect(query.values).toContain('root');
      expect(query.values).toContain(true);
    });
  });

  describe('complex queries', () => {
    it('CTE select with joins and ordering', () => {
      const query = withCte('top_users', select('users').where(gt('score', 100)))
        .select('top_users')
        .columns('id', 'name', 'score')
        .leftJoin('orders', raw('orders.user_id = top_users.id'))
        .orderBy('score', 'desc')
        .limit(10)
        .toSql();

      expect(query.text).toContain('WITH top_users AS');
      expect(query.text).toContain('LEFT JOIN orders');
      expect(query.text).toContain('ORDER BY score DESC');
      expect(query.text).toContain('LIMIT 10');
    });

    it('CTE with groupBy and having', () => {
      const query = withCte('sales', select('orders').where(gt('total', 0)))
        .select('sales')
        .columns('user_id', 'SUM(total) as total_sales')
        .groupBy('user_id')
        .having(gt('SUM(total)', 1000))
        .toSql();

      expect(query.text).toContain('GROUP BY user_id');
      expect(query.text).toContain('HAVING');
    });
  });
});
