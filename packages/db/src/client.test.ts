// packages/db/src/__tests__/client.test.ts
import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

import { createRawDb, type RawDb } from '../client';

// Mock postgres module
vi.mock('postgres', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      const tx = {
        unsafe: vi.fn().mockResolvedValue([]),
      };

      return {
        unsafe: vi.fn().mockResolvedValue([]),
        end: vi.fn().mockResolvedValue(undefined),
        begin: vi
          .fn()
          .mockImplementation(async (_isolation: string, cb: (tx: unknown) => unknown) => {
            return cb(tx);
          }),
      };
    }),
  };
});

const { default: postgres } = await import('postgres');
const postgresMock = postgres as unknown as Mock;
type Tx = { unsafe: ReturnType<typeof vi.fn> };

describe('Database Client', () => {
  const mockConnectionString = 'postgresql://user:pass@localhost:5432/testdb';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRawDb', () => {
    test('should create a database client with connection string', () => {
      const client = createRawDb(mockConnectionString);

      expect(client).toBeDefined();
      expect(postgres).toHaveBeenCalledWith(mockConnectionString, expect.any(Object));
    });

    test('should configure postgres with appropriate options', () => {
      createRawDb(mockConnectionString);

      expect(postgres).toHaveBeenCalledWith(mockConnectionString, {
        max: 10,
        idle_timeout: 30000,
        connect_timeout: 10000,
        ssl: undefined,
      });
    });

    test('should handle different connection strings', () => {
      const differentConnectionString = 'postgresql://admin:secret@prod-server:5432/proddb';

      const client = createRawDb(differentConnectionString);

      expect(client).toBeDefined();
      expect(postgres).toHaveBeenCalledWith(differentConnectionString, expect.any(Object));
    });

    test('should return client with required methods', () => {
      const client = createRawDb(mockConnectionString);

      expect(client.execute).toBeTypeOf('function');
      expect(client.query).toBeTypeOf('function');
      expect(client.queryOne).toBeTypeOf('function');
      expect(client.raw).toBeTypeOf('function');
      expect(client.transaction).toBeTypeOf('function');
    });

    test('should handle connection errors gracefully', () => {
      postgresMock.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      expect(() => createRawDb(mockConnectionString)).toThrow('Connection failed');
    });
  });

  describe('DbClient interface', () => {
    let dbClient: RawDb;

    beforeEach(() => {
      dbClient = createRawDb(mockConnectionString);
    });

    describe('execute', () => {
      test('should execute a query with parameters', async () => {
        const mockResult = { count: 1 };
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(mockResult),
        }));

        const query = { text: 'SELECT * FROM users WHERE id = $1', values: [1] };
        const result = await dbClient.execute(query);

        expect(result).toEqual(1);
        expect(postgres().unsafe).toHaveBeenCalledWith(query.text, query.values);
      });

      test('should handle execute with empty result', async () => {
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue({ count: 0 }),
        }));

        const query = { text: 'SELECT * FROM users WHERE id = $1', values: [999] };
        const result = await dbClient.execute(query);

        expect(result).toEqual(0);
      });

      test('should handle execute errors', async () => {
        const error = new Error('Query failed');
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockRejectedValue(error),
        }));

        const query = { text: 'INVALID SQL', values: [] };

        await expect(dbClient.execute(query)).rejects.toThrow('Query failed');
      });

      test('should handle execute with complex query', async () => {
        const complexResult = { count: 2 };
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(complexResult),
        }));

        const query = {
          text: 'SELECT id, name, created_at, active FROM users WHERE active = $1 ORDER BY created_at DESC LIMIT $2',
          values: [true, 10],
        };
        const result = await dbClient.execute(query);

        expect(result).toEqual(2);
      });
    });

    describe('query', () => {
      test('should execute a select query and return results', async () => {
        const mockResults = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ];
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(mockResults),
        }));

        const result = await dbClient.query({ text: 'SELECT * FROM users', values: [] });

        expect(result).toEqual(mockResults);
        expect(postgres().unsafe).toHaveBeenCalledWith('SELECT * FROM users', []);
      });

      test('should handle query with parameters', async () => {
        const mockResults = [{ id: 1, name: 'Alice' }];
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(mockResults),
        }));

        const result = await dbClient.query({
          text: 'SELECT * FROM users WHERE id = $1',
          values: [1],
        });

        expect(result).toEqual(mockResults);
        expect(postgres().unsafe).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      });

      test('should handle empty query results', async () => {
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue([]),
        }));

        const result = await dbClient.query({
          text: 'SELECT * FROM users WHERE id = $1',
          values: [999],
        });

        expect(result).toEqual([]);
      });

      test('should handle query errors', async () => {
        const error = new Error('Invalid query');
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockRejectedValue(error),
        }));

        await expect(dbClient.query({ text: 'INVALID QUERY', values: [] })).rejects.toThrow(
          'Invalid query',
        );
      });

      test('should handle complex query with multiple parameters', async () => {
        const mockResults = [
          { id: 1, name: 'Alice', email: 'alice@example.com', created_at: new Date() },
        ];
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(mockResults),
        }));

        const result = await dbClient.query({
          text: 'SELECT * FROM users WHERE name = $1 AND email LIKE $2 AND created_at > $3',
          values: ['Alice', '%@example.com', '2023-01-01'],
        });

        expect(result).toEqual(mockResults);
      });
    });

    describe('queryOne', () => {
      test('should return first result from query', async () => {
        const mockResults = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ];
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(mockResults),
        }));

        const result = await dbClient.queryOne({
          text: 'SELECT * FROM users WHERE name = $1',
          values: ['Alice'],
        });

        expect(result).toEqual({ id: 1, name: 'Alice' });
        expect(postgres().unsafe).toHaveBeenCalledWith('SELECT * FROM users WHERE name = $1', [
          'Alice',
        ]);
      });

      test('should return null for empty results', async () => {
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue([]),
        }));

        const result = await dbClient.queryOne({
          text: 'SELECT * FROM users WHERE id = $1',
          values: [999],
        });

        expect(result).toBeNull();
      });

      test('should handle queryOne errors', async () => {
        const error = new Error('Query failed');
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockRejectedValue(error),
        }));

        await expect(dbClient.queryOne({ text: 'INVALID QUERY', values: [] })).rejects.toThrow(
          'Query failed',
        );
      });

      test('should handle queryOne with no parameters', async () => {
        const mockResult = { id: 1, name: 'Alice' };
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue([mockResult]),
        }));

        const result = await dbClient.queryOne({ text: 'SELECT * FROM users LIMIT 1', values: [] });

        expect(result).toEqual(mockResult);
      });

      test('should handle queryOne with complex result', async () => {
        const complexResult = {
          id: 1,
          name: 'Alice',
          profile: { bio: 'Software engineer', skills: ['TypeScript', 'React'] },
          settings: { theme: 'dark', notifications: true },
        };
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue([complexResult]),
        }));

        const result = await dbClient.queryOne({
          text: 'SELECT * FROM users WHERE id = $1',
          values: [1],
        });

        expect(result).toEqual(complexResult);
      });
    });

    describe('raw', () => {
      test('should execute raw SQL query', async () => {
        const mockResult = [
          { column1: 'value1', column2: 'value2' },
          { column1: 'value3', column2: 'value4' },
        ];
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(mockResult),
        }));

        const result = await dbClient.raw('SELECT column1, column2 FROM some_table');

        expect(result).toEqual(mockResult);
        expect(postgres().unsafe).toHaveBeenCalledWith(
          'SELECT column1, column2 FROM some_table',
          [],
        );
      });

      test('should handle raw query with parameters', async () => {
        const mockResult = [{ id: 1, name: 'Test' }];
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(mockResult),
        }));

        const result = await dbClient.raw('SELECT * FROM users WHERE id = $1', [1]);

        expect(result).toEqual(mockResult);
        expect(postgres().unsafe).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      });

      test('should handle raw query with no results', async () => {
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue([]),
        }));

        const result = await dbClient.raw('SELECT * FROM empty_table');

        expect(result).toEqual([]);
      });

      test('should handle raw query errors', async () => {
        const error = new Error('Raw query failed');
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockRejectedValue(error),
        }));

        await expect(dbClient.raw('INVALID RAW QUERY')).rejects.toThrow('Raw query failed');
      });

      test('should handle raw query with complex SQL', async () => {
        const mockResult = [{ user_id: 1, total_orders: 5, avg_amount: 99.99 }];
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(mockResult),
        }));

        const sql = `
          SELECT 
            u.id as user_id,
            COUNT(o.id) as total_orders,
            AVG(o.amount) as avg_amount
          FROM users u
          LEFT JOIN orders o ON u.id = o.user_id
          WHERE u.active = true
          GROUP BY u.id
          HAVING COUNT(o.id) > 0
          ORDER BY avg_amount DESC
        `;

        const result = await dbClient.raw(sql);

        expect(result).toEqual(mockResult);
      });
    });

    describe('transaction support', () => {
      test('should support transaction blocks', async () => {
        const beginSpy = vi
          .fn()
          .mockImplementation(async (_isolation: string, cb: (tx: Tx) => unknown) => {
            const tx = { unsafe: vi.fn().mockResolvedValue([]) };
            return cb(tx);
          });

        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue([]),
          end: vi.fn().mockResolvedValue(undefined),
          begin: beginSpy,
        }));

        const client = createRawDb(mockConnectionString);
        const result = await client.transaction(async () => 'committed');

        expect(result).toBe('committed');
        expect(beginSpy).toHaveBeenCalledWith(
          'isolation level read committed',
          expect.any(Function),
        );
      });

      test('should apply transaction options', async () => {
        const txUnsafe = vi.fn().mockResolvedValue([]);
        const beginSpy = vi
          .fn()
          .mockImplementation(async (_isolation: string, cb: (tx: Tx) => unknown) => {
            const tx = { unsafe: txUnsafe };
            return cb(tx);
          });

        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue([]),
          end: vi.fn().mockResolvedValue(undefined),
          begin: beginSpy,
        }));

        const client = createRawDb(mockConnectionString);
        await client.transaction(async () => 'ok', { readOnly: true, deferrable: true });

        expect(txUnsafe).toHaveBeenCalledWith('SET TRANSACTION READ ONLY DEFERRABLE');
      });

      test('should fall back to savepoint when begin is unavailable', async () => {
        const savepointSpy = vi
          .fn()
          .mockImplementation(async (cb: (tx: { unsafe: () => Promise<unknown[]> }) => unknown) => {
            const tx = { unsafe: vi.fn().mockResolvedValue([]) };
            return cb(tx);
          });

        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue([]),
          end: vi.fn().mockResolvedValue(undefined),
          savepoint: savepointSpy,
        }));

        const client = createRawDb(mockConnectionString);
        const result = await client.transaction(async () => 'nested');

        expect(result).toBe('nested');
        expect(savepointSpy).toHaveBeenCalled();
      });
    });

    describe('connection management', () => {
      test('should handle client closing', async () => {
        const mockClose = vi.fn().mockResolvedValue(undefined);
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue([]),
          end: mockClose,
        }));

        const client = createRawDb(mockConnectionString);
        // Assuming there's a way to close the client
        // This depends on the actual implementation
        await client.close();
        expect(mockClose).toHaveBeenCalled();
      });
    });

    describe('health checks', () => {
      test('should handle health check queries', async () => {
        const healthResult = [{ ok: 1 }];
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(healthResult),
          end: vi.fn().mockResolvedValue(undefined),
          begin: vi
            .fn()
            .mockImplementation(async (_isolation: string, cb: (tx: Tx) => unknown) =>
              cb({ unsafe: vi.fn() }),
            ),
        }));

        const result = await dbClient.query({ text: 'SELECT 1 as health_check', values: [] });

        expect(result).toEqual(healthResult);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty('ok');
        }
      });

      test('should handle ping-style queries', async () => {
        const pingResult = [{ now: new Date() }];
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(pingResult),
          end: vi.fn().mockResolvedValue(undefined),
          begin: vi
            .fn()
            .mockImplementation(async (_isolation: string, cb: (tx: Tx) => unknown) =>
              cb({ unsafe: vi.fn() }),
            ),
        }));

        const result = await dbClient.query({ text: 'SELECT NOW() as now', values: [] });

        expect(result).toEqual(pingResult);
        expect(result[0]).toHaveProperty('now');
      });
    });

    describe('concurrent operations', () => {
      test('should handle multiple concurrent queries', async () => {
        const mockResults = [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
          { id: 3, name: 'User 3' },
        ];

        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockImplementation((sql: string) => {
            // Simulate different results based on query
            if (sql.includes('WHERE id = 1')) return Promise.resolve([mockResults[0]]);
            if (sql.includes('WHERE id = 2')) return Promise.resolve([mockResults[1]]);
            return Promise.resolve([mockResults[2]]);
          }),
        }));

        const [result1, result2, result3] = await Promise.all([
          dbClient.query({ text: 'SELECT * FROM users WHERE id = $1', values: [1] }),
          dbClient.query({ text: 'SELECT * FROM users WHERE id = $1', values: [2] }),
          dbClient.query({ text: 'SELECT * FROM users WHERE id = $1', values: [3] }),
        ]);

        expect(result1).toEqual([mockResults[0]]);
        expect(result2).toEqual([mockResults[1]]);
        expect(result3).toEqual([mockResults[2]]);
      });

      test('should handle concurrent execute operations', async () => {
        const mockExecuteResult = { count: 1 };
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockResolvedValue(mockExecuteResult),
        }));

        const queries = [
          { text: 'UPDATE users SET name = $1 WHERE id = $2', values: ['New Name 1', 1] },
          { text: 'UPDATE users SET name = $1 WHERE id = $2', values: ['New Name 2', 2] },
          { text: 'UPDATE users SET name = $1 WHERE id = $2', values: ['New Name 3', 3] },
        ];

        const results = await Promise.all(queries.map((query) => dbClient.execute(query)));

        expect(results).toHaveLength(3);
        expect(results.every((r) => r === 1)).toBe(true);
      });
    });

    describe('error handling', () => {
      test('should handle connection errors', async () => {
        const connectionError = new Error('Connection refused');
        postgresMock.mockImplementation(() => {
          throw connectionError;
        });

        expect(() => createRawDb('invalid://connection')).toThrow('Connection refused');
      });

      test('should handle query syntax errors', async () => {
        const syntaxError = new Error('Syntax error in SQL');
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockRejectedValue(syntaxError),
        }));

        await expect(dbClient.query({ text: 'INVALID SQL SYNTAX', values: [] })).rejects.toThrow(
          'Syntax error in SQL',
        );
      });

      test('should handle constraint violation errors', async () => {
        const constraintError = new Error('Unique constraint violation');
        postgresMock.mockImplementation(() => ({
          unsafe: vi.fn().mockRejectedValue(constraintError),
        }));

        await expect(
          dbClient.execute({
            text: 'INSERT INTO users (email) VALUES ($1)',
            values: ['duplicate@example.com'],
          }),
        ).rejects.toThrow('Unique constraint violation');
      });
    });
  });

  describe('configuration options', () => {
    test('should accept custom configuration options', () => {
      const client = createRawDb({
        connectionString: mockConnectionString,
        maxConnections: 20,
        idleTimeout: 60000,
        connectTimeout: 20000,
      });

      // Verify that the client was created with expected defaults
      expect(client).toBeDefined();
    });
  });
});
