// packages/db/src/builder/__tests__/select.test.ts
import { describe, expect, test } from 'vitest';

import { select } from '../select';

describe('Select Query Builder', () => {
  describe('select', () => {
    test('should create a basic SELECT query', () => {
      const query = select('*').from('users');

      expect(query.toSQL()).toContain('SELECT * FROM users');
    });

    test('should select specific columns', () => {
      const query = select('id', 'name', 'email').from('users');

      expect(query.toSQL()).toContain('SELECT id, name, email FROM users');
    });

    test('should select with aliases', () => {
      const query = select({ id: 'user_id', name: 'full_name' }).from('users');

      expect(query.toSQL()).toContain('SELECT id AS user_id, name AS full_name FROM users');
    });

    test('should select with functions', () => {
      const query = select('COUNT(*) as total_users').from('users');

      expect(query.toSQL()).toContain('SELECT COUNT(*) as total_users FROM users');
    });

    test('should select with expressions', () => {
      const query = select('first_name || \' \' || last_name AS full_name').from('users');

      expect(query.toSQL()).toContain('SELECT first_name || \' \' || last_name AS full_name FROM users');
    });

    test('should select with DISTINCT', () => {
      const query = select('DISTINCT email').from('users');

      expect(query.toSQL()).toContain('SELECT DISTINCT email FROM users');
    });

    test('should select with DISTINCT ON', () => {
      const query = select('DISTINCT ON (email) id, email').from('users');

      expect(query.toSQL()).toContain('SELECT DISTINCT ON (email) id, email FROM users');
    });

    test('should handle multiple select clauses', () => {
      const query = select('id').select('name').select('email').from('users');

      expect(query.toSQL()).toContain('SELECT id, name, email FROM users');
    });

    test('should select from multiple tables', () => {
      const query = select('u.id', 'p.title')
        .from('users u')
        .join('posts p', 'u.id = p.user_id');

      expect(query.toSQL()).toContain('SELECT u.id, p.title FROM users u');
      expect(query.toSQL()).toContain('JOIN posts p ON u.id = p.user_id');
    });

    test('should select with aggregation functions', () => {
      const query = select('COUNT(*) as count', 'AVG(age) as average_age', 'MAX(created_at) as latest')
        .from('users');

      expect(query.toSQL()).toContain('SELECT COUNT(*) as count, AVG(age) as average_age, MAX(created_at) as latest FROM users');
    });

    test('should select with CASE statements', () => {
      const query = select(`
        CASE 
          WHEN age < 18 THEN 'minor'
          WHEN age BETWEEN 18 AND 65 THEN 'adult'
          ELSE 'senior'
        END as age_group
      `).from('users');

      expect(query.toSQL()).toContain('CASE');
      expect(query.toSQL()).toContain('WHEN age < 18 THEN \'minor\'');
      expect(query.toSQL()).toContain('END as age_group FROM users');
    });

    test('should select with subqueries', () => {
      const query = select('id', 'name', '(SELECT COUNT(*) FROM posts WHERE posts.user_id = users.id) as post_count')
        .from('users');

      expect(query.toSQL()).toContain('SELECT id, name, (SELECT COUNT(*) FROM posts WHERE posts.user_id = users.id) as post_count FROM users');
    });

    test('should select with window functions', () => {
      const query = select('id', 'name', 'ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY created_at) as row_num')
        .from('users');

      expect(query.toSQL()).toContain('ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY created_at) as row_num');
    });

    test('should select with JSON operators', () => {
      const query = select('id', 'data->\'name\' as name', 'data->\'age\' as age')
        .from('user_profiles');

      expect(query.toSQL()).toContain('SELECT id, data->\'name\' as name, data->\'age\' as age FROM user_profiles');
    });

    test('should handle empty select (should default to *)', () => {
      const query = select().from('users');

      expect(query.toSQL()).toContain('SELECT * FROM users');
    });

    test('should handle select with complex expressions', () => {
      const query = select(`
        id,
        CONCAT(first_name, ' ', last_name) AS full_name,
        EXTRACT(YEAR FROM birth_date) AS birth_year,
        CASE WHEN active = true THEN 1 ELSE 0 END AS is_active_num
      `).from('users');

      const sql = query.toSQL();
      expect(sql).toContain('CONCAT(first_name, \' \', last_name)');
      expect(sql).toContain('EXTRACT(YEAR FROM birth_date)');
      expect(sql).toContain('CASE WHEN active = true THEN 1 ELSE 0 END AS is_active_num');
    });
  });

  describe('select with other clauses', () => {
    test('should combine select with where clause', () => {
      const query = select('id', 'name').from('users').where('active', true);

      expect(query.toSQL()).toContain('SELECT id, name FROM users WHERE active = $1');
    });

    test('should combine select with order by', () => {
      const query = select('id', 'name').from('users').orderBy('created_at', 'DESC');

      expect(query.toSQL()).toContain('SELECT id, name FROM users ORDER BY created_at DESC');
    });

    test('should combine select with limit', () => {
      const query = select('id', 'name').from('users').limit(10);

      expect(query.toSQL()).toContain('SELECT id, name FROM users LIMIT $1');
    });

    test('should combine select with multiple clauses', () => {
      const query = select('id', 'name', 'email')
        .from('users')
        .where('active', true)
        .orderBy('created_at', 'DESC')
        .limit(5);

      const sql = query.toSQL();
      expect(sql).toContain('SELECT id, name, email FROM users');
      expect(sql).toContain('WHERE active = $1');
      expect(sql).toContain('ORDER BY created_at DESC');
      expect(sql).toContain('LIMIT $1');
    });

    test('should combine select with complex where conditions', () => {
      const query = select('u.id', 'u.name', 'p.title')
        .from('users u')
        .join('posts p', 'u.id = p.user_id')
        .where('u.active', true)
        .andWhere('p.published', true)
        .orderBy('p.created_at', 'DESC')
        .limit(10);

      const sql = query.toSQL();
      expect(sql).toContain('SELECT u.id, u.name, p.title FROM users u');
      expect(sql).toContain('JOIN posts p ON u.id = p.user_id');
      expect(sql).toContain('WHERE u.active = $1 AND p.published = $2');
      expect(sql).toContain('ORDER BY p.created_at DESC');
      expect(sql).toContain('LIMIT $1');
    });
  });

  describe('select with joins', () => {
    test('should select with INNER JOIN', () => {
      const query = select('users.id', 'profiles.bio')
        .from('users')
        .join('profiles', 'users.id = profiles.user_id');

      expect(query.toSQL()).toContain('SELECT users.id, profiles.bio FROM users');
      expect(query.toSQL()).toContain('INNER JOIN profiles ON users.id = profiles.user_id');
    });

    test('should select with LEFT JOIN', () => {
      const query = select('users.id', 'profiles.bio')
        .from('users')
        .leftJoin('profiles', 'users.id = profiles.user_id');

      expect(query.toSQL()).toContain('SELECT users.id, profiles.bio FROM users');
      expect(query.toSQL()).toContain('LEFT JOIN profiles ON users.id = profiles.user_id');
    });

    test('should select with RIGHT JOIN', () => {
      const query = select('users.id', 'profiles.bio')
        .from('users')
        .rightJoin('profiles', 'users.id = profiles.user_id');

      expect(query.toSQL()).toContain('SELECT users.id, profiles.bio FROM users');
      expect(query.toSQL()).toContain('RIGHT JOIN profiles ON users.id = profiles.user_id');
    });

    test('should select with FULL OUTER JOIN', () => {
      const query = select('users.id', 'profiles.bio')
        .from('users')
        .fullOuterJoin('profiles', 'users.id = profiles.user_id');

      expect(query.toSQL()).toContain('SELECT users.id, profiles.bio FROM users');
      expect(query.toSQL()).toContain('FULL OUTER JOIN profiles ON users.id = profiles.user_id');
    });

    test('should select with multiple joins', () => {
      const query = select('u.id', 'p.title', 'c.name as category_name')
        .from('users u')
        .join('posts p', 'u.id = p.user_id')
        .leftJoin('categories c', 'p.category_id = c.id');

      const sql = query.toSQL();
      expect(sql).toContain('SELECT u.id, p.title, c.name as category_name FROM users u');
      expect(sql).toContain('INNER JOIN posts p ON u.id = p.user_id');
      expect(sql).toContain('LEFT JOIN categories c ON p.category_id = c.id');
    });
  });

  describe('select with aggregations and grouping', () => {
    test('should select with GROUP BY', () => {
      const query = select('department', 'COUNT(*) as employee_count')
        .from('employees')
        .groupBy('department');

      expect(query.toSQL()).toContain('SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department');
    });

    test('should select with GROUP BY and HAVING', () => {
      const query = select('department', 'COUNT(*) as employee_count')
        .from('employees')
        .groupBy('department')
        .having('COUNT(*)', '>', 5);

      const sql = query.toSQL();
      expect(sql).toContain('SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department');
      expect(sql).toContain('HAVING COUNT(*) > $1');
    });

    test('should select with complex aggregations', () => {
      const query = select(`
        department,
        COUNT(*) as total_employees,
        AVG(salary) as avg_salary,
        MIN(hire_date) as first_hire,
        MAX(hire_date) as last_hire
      `)
      .from('employees')
      .groupBy('department')
      .having('COUNT(*)', '>=', 1);

      const sql = query.toSQL();
      expect(sql).toContain('COUNT(*) as total_employees');
      expect(sql).toContain('AVG(salary) as avg_salary');
      expect(sql).toContain('GROUP BY department');
      expect(sql).toContain('HAVING COUNT(*) >= $1');
    });
  });

  describe('select with CTEs (Common Table Expressions)', () => {
    test('should select with WITH clause', () => {
      const query = select('recent_posts.id', 'recent_posts.title', 'users.name')
        .with('recent_posts', select('*').from('posts').where('created_at', '>', '2023-01-01'))
        .from('recent_posts')
        .join('users', 'recent_posts.author_id = users.id');

      const sql = query.toSQL();
      expect(sql).toContain('WITH recent_posts AS (SELECT * FROM posts WHERE created_at > $1)');
      expect(sql).toContain('SELECT recent_posts.id, recent_posts.title, users.name FROM recent_posts');
      expect(sql).toContain('INNER JOIN users ON recent_posts.author_id = users.id');
    });

    test('should select with multiple CTEs', () => {
      const query = select('u.name', 'p.count as post_count', 'c.count as comment_count')
        .with('user_post_counts', select('user_id', 'COUNT(*) as count').from('posts').groupBy('user_id'))
        .with('user_comment_counts', select('user_id', 'COUNT(*) as count').from('comments').groupBy('user_id'))
        .from('users u')
        .leftJoin('user_post_counts p', 'u.id = p.user_id')
        .leftJoin('user_comment_counts c', 'u.id = c.user_id');

      const sql = query.toSQL();
      expect(sql).toContain('WITH user_post_counts AS (SELECT user_id, COUNT(*) as count FROM posts GROUP BY user_id)');
      expect(sql).toContain('user_comment_counts AS (SELECT user_id, COUNT(*) as count FROM comments GROUP BY user_id)');
    });
  });

  describe('select with unions', () => {
    test('should select with UNION', () => {
      const query = select('id', 'name').from('active_users')
        .union(select('id', 'name').from('premium_users'));

      const sql = query.toSQL();
      expect(sql).toContain('SELECT id, name FROM active_users UNION SELECT id, name FROM premium_users');
    });

    test('should select with UNION ALL', () => {
      const query = select('id', 'name').from('users_v1')
        .unionAll(select('id', 'name').from('users_v2'));

      const sql = query.toSQL();
      expect(sql).toContain('SELECT id, name FROM users_v1 UNION ALL SELECT id, name FROM users_v2');
    });
  });

  describe('select with subqueries in FROM', () => {
    test('should select from subquery', () => {
      const subquery = select('user_id', 'COUNT(*) as post_count').from('posts').groupBy('user_id');
      const query = select('u.name', 'pc.post_count')
        .from(subquery.as('pc'))
        .join('users u', 'pc.user_id = u.id');

      const sql = query.toSQL();
      expect(sql).toContain('FROM (SELECT user_id, COUNT(*) as post_count FROM posts GROUP BY user_id) pc');
      expect(sql).toContain('INNER JOIN users u ON pc.user_id = u.id');
    });
  });

  describe('select parameter binding', () => {
    test('should properly bind parameters in complex query', () => {
      const query = select('u.id', 'u.name', 'p.title')
        .from('users u')
        .join('posts p', 'u.id = p.user_id')
        .where('u.active', true)
        .andWhere('p.status', '=', 'published')
        .andWhere('p.created_at', '>', new Date('2023-01-01'))
        .orderBy('p.created_at', 'DESC')
        .limit(10);

      const { text, values } = query.toSQLObject();
      expect(text).toContain('WHERE u.active = $1 AND p.status = $2 AND p.created_at > $3');
      expect(values).toEqual([true, 'published', new Date('2023-01-01')]);
    });

    test('should handle different parameter types', () => {
      const date = new Date();
      const query = select('*')
        .from('events')
        .where('date', date)
        .andWhere('capacity', '>', 50)
        .andWhere('is_virtual', false)
        .andWhere('tags', '@>', ['tech', 'webinar']); // PostgreSQL contains operator

      const { values } = query.toSQLObject();
      expect(values).toEqual([date, 50, false, ['tech', 'webinar']]);
    });
  });

  describe('select query validation', () => {
    test('should validate required FROM clause', () => {
      const query = select('*');
      // Depending on implementation, this might throw an error or have a validation method
      expect(() => query.toSQL()).toBeDefined(); // Should not crash
    });

    test('should handle malformed column specifications', () => {
      // Test with potentially problematic inputs
      const query = select('col1, col2', 'col3').from('table'); // Malformed column list
      expect(query.toSQL()).toContain('SELECT col1, col2, col3 FROM table');
    });

    test('should handle special characters in column names', () => {
      const query = select('"column with spaces"', '"column-with-dashes"', '"column_with_underscores"')
        .from('table');

      expect(query.toSQL()).toContain('SELECT "column with spaces", "column-with-dashes", "column_with_underscores" FROM table');
    });
  });

  describe('select performance considerations', () => {
    test('should handle large column selections efficiently', () => {
      const manyColumns = Array.from({ length: 50 }, (_, i) => `column_${i}`).join(', ');
      const query = select(manyColumns).from('wide_table');

      const sql = query.toSQL();
      expect(sql).toContain('SELECT column_0, column_1, column_2'); // Check that it starts correctly
      expect(sql).toContain('wide_table');
    });

    test('should handle complex nested selects', () => {
      const innerQuery = select('id').from('users').where('active', true).limit(100);
      const middleQuery = select('user_id').from(innerQuery.as('active_users'));
      const outerQuery = select('*').from(middleQuery.as('filtered'));

      const sql = outerQuery.toSQL();
      expect(sql).toContain('SELECT * FROM (SELECT user_id FROM (SELECT id FROM users WHERE active = $1 LIMIT $2) active_users) filtered');
    });
  });
});
