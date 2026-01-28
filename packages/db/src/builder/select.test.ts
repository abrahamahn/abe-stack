// packages/db/src/builder/select.test.ts
import { describe, expect, test } from 'vitest';

import { select } from './select';
import { fragment, raw } from './types';

describe('Select Query Builder', () => {
  describe('select', () => {
    test('should create a basic SELECT query', () => {
      const query = select('users');

      expect(query.toSql().text).toContain('SELECT * FROM users');
    });

    test('should select specific columns', () => {
      const query = select('users').columns('id', 'name', 'email');

      expect(query.toSql().text).toContain('SELECT id, name, email FROM users');
    });

    test('should select with aliases', () => {
      const query = select('users')
        .columns() // Clear default *
        .column(raw('id'), 'user_id')
        .column(raw('name'), 'full_name');

      expect(query.toSql().text).toContain('SELECT id AS user_id, name AS full_name FROM users');
    });

    test('should select with functions', () => {
      const query = select('users').columns().column(raw('COUNT(*)'), 'total_users');

      expect(query.toSql().text).toContain('SELECT COUNT(*) AS total_users FROM users');
    });

    test('should select with expressions', () => {
      const query = select('users')
        .columns()
        .column(raw("first_name || ' ' || last_name"), 'full_name');

      expect(query.toSql().text).toContain(
        "SELECT first_name || ' ' || last_name AS full_name FROM users",
      );
    });

    test('should select with DISTINCT', () => {
      const query = select('users').distinct().columns('email');

      expect(query.toSql().text).toContain('SELECT DISTINCT email FROM users');
    });

    test('should select from multiple tables (implicit join handled via from?)', () => {
      // Simple alias test via table name
      const query = select('users as u').columns('u.id');
      // 'users as u' contains spaces, so it IS quoted by escapeIdentifier
      expect(query.toSql().text).toContain('SELECT "u.id" FROM "users as u"');
    });

    test('should select with aggregation functions', () => {
      const query = select('users')
        .columns()
        .column(raw('COUNT(*)'), 'count')
        .column(raw('AVG(age)'), 'average_age')
        .column(raw('MAX(created_at)'), 'latest');

      expect(query.toSql().text).toContain(
        'SELECT COUNT(*) AS count, AVG(age) AS average_age, MAX(created_at) AS latest FROM users',
      );
    });

    test('should select with subqueries', () => {
      // Use .columns() to clear default * for inner query to avoid SELECT *
      const sub = select('posts')
        .columns()
        .column(raw('COUNT(*)'))
        .where(raw('posts.user_id = users.id'));
      const query = select('users').columns('id', 'name').columnSubquery(sub, 'post_count');

      expect(query.toSql().text).toContain(
        'SELECT id, name, (SELECT COUNT(*) FROM posts WHERE posts.user_id = users.id) AS post_count FROM users',
      );
    });
  });

  describe('select with other clauses', () => {
    test('should combine select with where clause', () => {
      const query = select('users')
        .columns('id', 'name')
        .where(fragment('active = $1', [true]));

      const sql = query.toSql();
      expect(sql.text).toContain('SELECT id, name FROM users WHERE active = $1');
      expect(sql.values).toEqual([true]);
    });

    test('should combine select with order by', () => {
      const query = select('users').columns('id', 'name').orderBy('created_at', 'desc');

      expect(query.toSql().text).toContain('SELECT id, name FROM users ORDER BY created_at DESC');
    });

    test('should combine select with limit', () => {
      const query = select('users').columns('id', 'name').limit(10);

      expect(query.toSql().text).toContain('SELECT id, name FROM users LIMIT 10');
    });

    test('should combine select with multiple clauses', () => {
      const query = select('users')
        .columns('id', 'name', 'email')
        .where(fragment('active = $1', [true]))
        .orderBy('created_at', 'desc')
        .limit(5);

      const sql = query.toSql();
      expect(sql.text).toContain('SELECT id, name, email FROM users');
      expect(sql.text).toContain('WHERE active = $1');
      expect(sql.text).toContain('ORDER BY created_at DESC');
      expect(sql.text).toContain('LIMIT 5');
    });
  });

  describe('select with joins', () => {
    test('should select with INNER JOIN', () => {
      const query = select('users')
        .columns('users.id', 'profiles.bio')
        .innerJoin('profiles', raw('users.id = profiles.user_id'));

      const sql = query.toSql();
      expect(sql.text).toContain('SELECT "users.id", "profiles.bio" FROM users');
      expect(sql.text).toContain('INNER JOIN profiles ON users.id = profiles.user_id');
    });

    test('should select with LEFT JOIN', () => {
      const query = select('users')
        .columns('users.id', 'profiles.bio')
        .leftJoin('profiles', raw('users.id = profiles.user_id'));

      expect(query.toSql().text).toContain('LEFT JOIN profiles ON users.id = profiles.user_id');
    });

    test('should select with RIGHT JOIN', () => {
      const query = select('users')
        .columns('users.id', 'profiles.bio')
        .rightJoin('profiles', raw('users.id = profiles.user_id'));

      expect(query.toSql().text).toContain('RIGHT JOIN profiles ON users.id = profiles.user_id');
    });

    test('should select with FULL OUTER JOIN', () => {
      const query = select('users')
        .columns('users.id', 'profiles.bio')
        .fullJoin('profiles', raw('users.id = profiles.user_id'));

      expect(query.toSql().text).toContain('FULL JOIN profiles ON users.id = profiles.user_id');
    });
  });

  describe('select with aggregations and grouping', () => {
    test('should select with GROUP BY', () => {
      const query = select('employees')
        .columns('department')
        .column(raw('COUNT(*)'), 'employee_count')
        .groupBy('department');

      expect(query.toSql().text).toContain(
        'SELECT department, COUNT(*) AS employee_count FROM employees GROUP BY department',
      );
    });

    test('should select with GROUP BY and HAVING', () => {
      const query = select('employees')
        .columns('department')
        .column(raw('COUNT(*)'), 'employee_count')
        .groupBy('department')
        .having(fragment('COUNT(*) > $1', [5]));

      const sql = query.toSql();
      expect(sql.text).toContain('GROUP BY department');
      expect(sql.text).toContain('HAVING COUNT(*) > $1');
      expect(sql.values).toEqual([5]);
    });
  });

  describe('select parameter binding', () => {
    test('should properly bind parameters in complex query', () => {
      const date = new Date('2023-01-01');
      const query = select('users') // using simple table name to avoid quoting issues test
        .innerJoin('posts p', raw('u.id = p.user_id'))
        .where(fragment('u.active = $1 AND p.status = $2', [true, 'published']))
        .having(fragment('p.created_at > $1', [date]))
        .limit(10);

      // select('users') -> table is 'users' (no quote)
      // innerJoin inputs are raw/string
      const sql = query.toSql();
      // Parameters order depends on traverse order. where -> having
      expect(sql.values).toHaveLength(3);
      expect(sql.values).toEqual([true, 'published', date]);
    });

    test('should handle different parameter types', () => {
      const date = new Date();
      const query = select('events').where(fragment('date = $1', [date]));

      const { values } = query.toSql();
      expect(values).toEqual([date]);
    });
  });

  describe('select with CTEs (Common Table Expressions)', () => {
    test('should select with WITH clause', () => {
      // API: .with(alias, subquery)
      const sub = select('posts').where(fragment('created_at > $1', ['2023-01-01']));
      const query = select('recent_posts')
        .with('recent_posts', sub)
        .columns('recent_posts.id', 'recent_posts.title', 'users.name')
        .innerJoin('users', raw('recent_posts.author_id = users.id'));

      const sql = query.toSql();
      expect(sql.text).toContain(
        'WITH recent_posts AS (SELECT * FROM posts WHERE created_at > $1)',
      );
      expect(sql.text).toContain(
        'SELECT "recent_posts.id", "recent_posts.title", "users.name" FROM recent_posts',
      );
      expect(sql.text).toContain('INNER JOIN users ON recent_posts.author_id = users.id');
    });

    test('should select with multiple CTEs', () => {
      const postsSub = select('posts')
        .columns('user_id')
        .column(raw('COUNT(*)'), 'count')
        .groupBy('user_id');
      const commentsSub = select('comments')
        .columns('user_id')
        .column(raw('COUNT(*)'), 'count')
        .groupBy('user_id');

      const query = select('users as u')
        .with('user_post_counts', postsSub)
        .with('user_comment_counts', commentsSub)
        .columns('u.name')
        .column(raw('p.count'), 'post_count')
        .column(raw('c.count'), 'comment_count')
        .leftJoin('user_post_counts p', raw('u.id = p.user_id'))
        .leftJoin('user_comment_counts c', raw('u.id = c.user_id'));

      const sql = query.toSql();
      // Order of CTEs matters in output but builder maintains insertion order
      expect(sql.text).toContain('WITH user_post_counts AS (');
      expect(sql.text).toContain('user_comment_counts AS (');
      expect(sql.text).toContain(
        'SELECT "u.name", p.count AS post_count, c.count AS comment_count FROM "users as u"',
      );
    });
  });

  describe('select with unions', () => {
    test('should select with UNION', () => {
      const query = select('active_users')
        .columns('id', 'name')
        .union(select('premium_users').columns('id', 'name'));

      const sql = query.toSql();
      // Implementation detail: UNION usually wraps second query? Or appends?
      // Standard SQL: SELECT ... UNION SELECT ...
      expect(sql.text).toContain(
        'SELECT id, name FROM active_users UNION SELECT id, name FROM premium_users',
      );
    });

    test('should select with UNION ALL', () => {
      const query = select('users_v1')
        .columns('id', 'name')
        .unionAll(select('users_v2').columns('id', 'name'));

      const sql = query.toSql();
      expect(sql.text).toContain(
        'SELECT id, name FROM users_v1 UNION ALL SELECT id, name FROM users_v2',
      );
    });
  });

  describe('select with subqueries in FROM', () => {
    test('should select from subquery', () => {
      const subquery = select('posts')
        .columns('user_id')
        .column(raw('COUNT(*)'), 'post_count')
        .groupBy('user_id');
      const query = select(subquery.as('pc'))
        .columns('u.name', 'pc.post_count')
        .innerJoin({ name: 'users', alias: 'u' }, raw('pc.user_id = u.id'));

      const sql = query.toSql();
      expect(sql.text).toContain(
        'FROM (SELECT user_id, COUNT(*) AS post_count FROM posts GROUP BY user_id) AS pc',
      );
      expect(sql.text).toContain('INNER JOIN users AS u ON pc.user_id = u.id');
    });
  });
});
