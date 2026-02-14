// main/server/db/src/builder/insert.test.ts
import { describe, expect, it } from 'vitest';

import { gt } from './conditions';
import { insert } from './insert';

describe('InsertBuilder', () => {
  describe('basic inserts', () => {
    it('generates simple INSERT', () => {
      const query = insert('users').values({ email: 'user@example.com', name: 'John' }).toSql();
      expect(query.text).toBe('INSERT INTO users (email, name) VALUES ($1, $2)');
      expect(query.values).toEqual(['user@example.com', 'John']);
    });

    it('handles single column insert', () => {
      const query = insert('users').values({ email: 'user@example.com' }).toSql();
      expect(query.text).toBe('INSERT INTO users (email) VALUES ($1)');
      expect(query.values).toEqual(['user@example.com']);
    });

    it('handles null values', () => {
      const query = insert('users').values({ email: 'user@example.com', name: null }).toSql();
      expect(query.text).toBe('INSERT INTO users (email, name) VALUES ($1, $2)');
      expect(query.values).toEqual(['user@example.com', null]);
    });

    it('handles Date values', () => {
      const date = new Date('2024-01-01');
      const query = insert('users')
        .values({ email: 'user@example.com', ['created_at']: date })
        .toSql();
      expect(query.values).toContain(date);
    });

    it('handles boolean values', () => {
      const query = insert('users').values({ email: 'user@example.com', active: true }).toSql();
      expect(query.values).toContain(true);
    });

    it('handles table with schema', () => {
      const query = insert({ name: 'users', schema: 'public' })
        .values({ email: 'user@example.com' })
        .toSql();
      expect(query.text).toBe('INSERT INTO public.users (email) VALUES ($1)');
    });
  });

  describe('multi-row inserts', () => {
    it('generates multi-row INSERT with values()', () => {
      const query = insert('users')
        .values({ email: 'a@example.com', name: 'Alice' })
        .values({ email: 'b@example.com', name: 'Bob' })
        .toSql();
      expect(query.text).toBe('INSERT INTO users (email, name) VALUES ($1, $2), ($3, $4)');
      expect(query.values).toEqual(['a@example.com', 'Alice', 'b@example.com', 'Bob']);
    });

    it('generates multi-row INSERT with valuesMany()', () => {
      const query = insert('users')
        .valuesMany([
          { email: 'a@example.com', name: 'Alice' },
          { email: 'b@example.com', name: 'Bob' },
        ])
        .toSql();
      expect(query.text).toBe('INSERT INTO users (email, name) VALUES ($1, $2), ($3, $4)');
      expect(query.values).toEqual(['a@example.com', 'Alice', 'b@example.com', 'Bob']);
    });

    it('throws error if rows have different columns', () => {
      expect(() => {
        insert('users')
          .values({ email: 'a@example.com', name: 'Alice' })
          .values({ email: 'b@example.com' }) // missing name
          .toSql();
      }).toThrow('All inserted rows must have the same columns');
    });
  });

  describe('RETURNING clause', () => {
    it('generates RETURNING with specific columns', () => {
      const query = insert('users')
        .values({ email: 'user@example.com' })
        .returning('id', 'created_at')
        .toSql();
      expect(query.text).toBe('INSERT INTO users (email) VALUES ($1) RETURNING id, created_at');
    });

    it('generates RETURNING * with returningAll()', () => {
      const query = insert('users').values({ email: 'user@example.com' }).returningAll().toSql();
      expect(query.text).toBe('INSERT INTO users (email) VALUES ($1) RETURNING *');
    });
  });

  describe('ON CONFLICT', () => {
    it('generates ON CONFLICT DO NOTHING', () => {
      const query = insert('users')
        .values({ email: 'user@example.com' })
        .onConflictDoNothing('email')
        .toSql();
      expect(query.text).toBe(
        'INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      );
    });

    it('generates ON CONFLICT DO NOTHING with multiple columns', () => {
      const query = insert('users')
        .values({ email: 'user@example.com', ['tenant_id']: 'tenant-1' })
        .onConflictDoNothing(['email', 'tenant_id'])
        .toSql();
      expect(query.text).toContain('ON CONFLICT (email, tenant_id) DO NOTHING');
    });

    it('generates ON CONFLICT DO NOTHING without columns', () => {
      const query = insert('users')
        .values({ email: 'user@example.com' })
        .onConflictDoNothing()
        .toSql();
      expect(query.text).toBe('INSERT INTO users (email) VALUES ($1) ON CONFLICT DO NOTHING');
    });

    it('generates ON CONFLICT ON CONSTRAINT DO NOTHING', () => {
      const query = insert('users')
        .values({ email: 'user@example.com' })
        .onConflictConstraintDoNothing('users_email_unique')
        .toSql();
      expect(query.text).toBe(
        'INSERT INTO users (email) VALUES ($1) ON CONFLICT ON CONSTRAINT users_email_unique DO NOTHING',
      );
    });

    it('generates ON CONFLICT DO UPDATE (upsert)', () => {
      const query = insert('users')
        .values({ email: 'user@example.com', name: 'John' })
        .onConflictDoUpdate('email', ['name'])
        .toSql();
      expect(query.text).toBe(
        'INSERT INTO users (email, name) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name',
      );
    });

    it('generates ON CONFLICT DO UPDATE with multiple columns', () => {
      const query = insert('users')
        .values({ email: 'user@example.com', name: 'John', ['updated_at']: new Date() })
        .onConflictDoUpdate('email', ['name', 'updated_at'])
        .toSql();
      expect(query.text).toContain(
        'DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at',
      );
    });

    it('generates ON CONFLICT DO UPDATE with WHERE clause', () => {
      const query = insert('users')
        .values({ email: 'user@example.com', name: 'John', version: 1 })
        .onConflictDoUpdate('email', ['name'], gt('EXCLUDED.version', 'users.version'))
        .toSql();
      expect(query.text).toContain('DO UPDATE SET name = EXCLUDED.name WHERE');
    });
  });

  describe('error handling', () => {
    it('throws error if no values provided', () => {
      expect(() => {
        insert('users').toSql();
      }).toThrow('INSERT requires at least one column and one row');
    });

    it('throws error if no columns provided', () => {
      expect(() => {
        insert('users').values({}).toSql();
      }).toThrow('INSERT requires at least one column and one row');
    });
  });

  describe('complete queries', () => {
    it('generates INSERT with all options', () => {
      const query = insert('users')
        .values({ email: 'user@example.com', name: 'John' })
        .onConflictDoUpdate('email', ['name'])
        .returning('id', 'email', 'name')
        .toSql();

      expect(query.text).toBe(
        'INSERT INTO users (email, name) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id, email, name',
      );
      expect(query.values).toEqual(['user@example.com', 'John']);
    });
  });
});
