// apps/server/legacy-tests/infrastructure/data/database/utils/__tests__/test-utils.test.ts
import { describe, expect, test } from 'vitest';

import { asMockDb, createMockDb, createMockDbWithData } from '../test-utils';

describe('createMockDb', () => {
  test('should return an object with query, queryOne, execute, and raw properties', () => {
    const mockDb = createMockDb();

    expect(mockDb).toHaveProperty('query');
    expect(mockDb).toHaveProperty('queryOne');
    expect(mockDb).toHaveProperty('execute');
    expect(mockDb).toHaveProperty('raw');
  });

  test('should have query function that resolves to empty array by default', async () => {
    const mockDb = createMockDb();

    const result = await mockDb.query({ text: 'SELECT * FROM users', values: [] });

    expect(result).toEqual([]);
  });

  test('should have queryOne function that resolves to null by default', async () => {
    const mockDb = createMockDb();

    const result = await mockDb.queryOne({
      text: 'SELECT * FROM users WHERE id = $1',
      values: ['1'],
    });

    expect(result).toBeNull();
  });

  test('should have execute function that resolves to 0 by default', async () => {
    const mockDb = createMockDb();

    const result = await mockDb.execute({ text: 'DELETE FROM users', values: [] });

    expect(result).toBe(0);
  });

  test('should have raw function that resolves to empty array by default', async () => {
    const mockDb = createMockDb();

    const result = await mockDb.raw('SELECT NOW()');

    expect(result).toEqual([]);
  });

  test('should track calls to query', () => {
    const mockDb = createMockDb();

    void mockDb.query({ text: 'SELECT 1', values: [] });
    void mockDb.query({ text: 'SELECT 2', values: [] });
    void mockDb.query({ text: 'SELECT 3', values: [] });

    expect(mockDb.query).toHaveBeenCalledTimes(3);
  });

  test('should track calls to queryOne', () => {
    const mockDb = createMockDb();

    void mockDb.queryOne({ text: 'SELECT 1', values: [] });
    void mockDb.queryOne({ text: 'SELECT 2', values: [] });

    expect(mockDb.queryOne).toHaveBeenCalledTimes(2);
  });

  test('should track calls to execute', () => {
    const mockDb = createMockDb();

    void mockDb.execute({ text: 'INSERT INTO users VALUES (1)', values: [] });
    void mockDb.execute({ text: 'INSERT INTO users VALUES (2)', values: [] });
    void mockDb.execute({ text: 'INSERT INTO users VALUES (3)', values: [] });
    void mockDb.execute({ text: 'INSERT INTO users VALUES (4)', values: [] });

    expect(mockDb.execute).toHaveBeenCalledTimes(4);
  });

  test('should track calls to raw', () => {
    const mockDb = createMockDb();

    void mockDb.raw('SELECT NOW()');

    expect(mockDb.raw).toHaveBeenCalledTimes(1);
  });

  test('should allow mocking query to return custom value', async () => {
    const mockDb = createMockDb();
    const mockUsers = [
      { id: '1', name: 'User 1', email: 'user1@example.com' },
      { id: '2', name: 'User 2', email: 'user2@example.com' },
    ];

    mockDb.query.mockResolvedValueOnce(mockUsers);

    const result = await mockDb.query({ text: 'SELECT * FROM users', values: [] });

    expect(result).toEqual(mockUsers);
  });

  test('should allow mocking queryOne to return custom value', async () => {
    const mockDb = createMockDb();
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };

    mockDb.queryOne.mockResolvedValueOnce(mockUser);

    const result = await mockDb.queryOne({
      text: 'SELECT * FROM users WHERE id = $1',
      values: ['1'],
    });

    expect(result).toEqual(mockUser);
  });

  test('should allow mocking execute to return custom count', async () => {
    const mockDb = createMockDb();

    mockDb.execute.mockResolvedValueOnce(5);

    const result = await mockDb.execute({
      text: 'DELETE FROM users WHERE created_at < NOW()',
      values: [],
    });

    expect(result).toBe(5);
  });

  test('should allow mocking raw to return custom result', async () => {
    const mockDb = createMockDb();
    const mockTables = [{ tablename: 'users' }, { tablename: 'posts' }];

    mockDb.raw.mockResolvedValueOnce(mockTables);

    const result = await mockDb.raw('SELECT tablename FROM pg_tables');

    expect(result).toEqual(mockTables);
  });

  test('should create independent mock instances', () => {
    const mockDb1 = createMockDb();
    const mockDb2 = createMockDb();

    void mockDb1.query({ text: 'SELECT 1', values: [] });
    void mockDb1.query({ text: 'SELECT 2', values: [] });
    void mockDb1.query({ text: 'SELECT 3', values: [] });

    void mockDb2.query({ text: 'SELECT 1', values: [] });

    expect(mockDb1.query).toHaveBeenCalledTimes(3);
    expect(mockDb2.query).toHaveBeenCalledTimes(1);
  });

  test('should be usable with vi.fn type assertions', () => {
    const mockDb = createMockDb();

    // Verify the functions are vi.fn() instances by checking mock methods
    expect(typeof mockDb.query.mockReturnValue).toBe('function');
    expect(typeof mockDb.queryOne.mockReturnValue).toBe('function');
    expect(typeof mockDb.execute.mockReturnValue).toBe('function');
    expect(typeof mockDb.raw.mockReturnValue).toBe('function');
  });
});

describe('createMockDbWithData', () => {
  test('should create mock with custom query result', async () => {
    const mockUsers = [{ id: '1', name: 'Test' }];
    const mockDb = createMockDbWithData({ queryResult: mockUsers });

    const result = await mockDb.query({ text: 'SELECT * FROM users', values: [] });

    expect(result).toEqual(mockUsers);
  });

  test('should create mock with custom queryOne result', async () => {
    const mockUser = { id: '1', name: 'Test' };
    const mockDb = createMockDbWithData({ queryOneResult: mockUser });

    const result = await mockDb.queryOne({
      text: 'SELECT * FROM users WHERE id = $1',
      values: ['1'],
    });

    expect(result).toEqual(mockUser);
  });

  test('should create mock with custom execute result', async () => {
    const mockDb = createMockDbWithData({ executeResult: 10 });

    const result = await mockDb.execute({ text: 'DELETE FROM users', values: [] });

    expect(result).toBe(10);
  });

  test('should create mock with custom raw result', async () => {
    const mockTables = [{ tablename: 'users' }];
    const mockDb = createMockDbWithData({ rawResult: mockTables });

    const result = await mockDb.raw('SELECT tablename FROM pg_tables');

    expect(result).toEqual(mockTables);
  });

  test('should use default values when options not provided', async () => {
    const mockDb = createMockDbWithData({});

    expect(await mockDb.query({ text: 'SELECT 1', values: [] })).toEqual([]);
    expect(await mockDb.queryOne({ text: 'SELECT 1', values: [] })).toBeNull();
    expect(await mockDb.execute({ text: 'SELECT 1', values: [] })).toBe(0);
    expect(await mockDb.raw('SELECT 1')).toEqual([]);
  });
});

describe('asMockDb', () => {
  test('should cast MockDbClient to RawDb type', () => {
    const mockDb = createMockDb();
    const db = asMockDb(mockDb);

    // Should be usable in functions expecting RawDb
    expect(db).toBeDefined();
  });

  test('should preserve mock functionality after casting', async () => {
    const mockDb = createMockDb();
    mockDb.queryOne.mockResolvedValueOnce({ id: '1', count: 5 });

    const db = asMockDb(mockDb);
    const result = await db.queryOne<{ count: number }>({
      text: 'SELECT COUNT(*) as count FROM users',
      values: [],
    });

    expect(result?.count).toBe(5);
    expect(mockDb.queryOne).toHaveBeenCalledTimes(1);
  });
});
