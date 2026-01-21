// apps/server/src/infrastructure/data/database/utils/__tests__/test-utils.test.ts
import { describe, expect, test } from 'vitest';

import { createMockDb } from '../test-utils';

describe('createMockDb', () => {
  test('should return an object with insert, select, and query properties', () => {
    const mockDb = createMockDb();

    expect(mockDb).toHaveProperty('insert');
    expect(mockDb).toHaveProperty('select');
    expect(mockDb).toHaveProperty('query');
  });

  test('should have insert function that returns chainable values method', async () => {
    const mockDb = createMockDb();

    // Access the mock as a callable function
    const insert = mockDb.insert as unknown as () => { values: (data: unknown) => Promise<void> };
    const insertResult = insert();
    expect(insertResult).toHaveProperty('values');

    const valuesResult = insertResult.values({});
    await expect(valuesResult).resolves.toBeUndefined();
  });

  test('should have select function that returns chainable from.where.orderBy.limit methods', () => {
    const mockDb = createMockDb();

    const select = mockDb.select as unknown as () => {
      from: (table: unknown) => {
        where: (condition: unknown) => {
          orderBy: (order: unknown) => {
            limit: (n: number) => Promise<unknown[]>;
          };
        };
      };
    };
    const selectResult = select();
    expect(selectResult).toHaveProperty('from');

    const fromResult = selectResult.from({});
    expect(fromResult).toHaveProperty('where');

    const whereResult = fromResult.where({});
    expect(whereResult).toHaveProperty('orderBy');

    const orderByResult = whereResult.orderBy({});
    expect(orderByResult).toHaveProperty('limit');
  });

  test('should have select chain that resolves to empty array', async () => {
    const mockDb = createMockDb();

    const select = mockDb.select as unknown as () => {
      from: (table: unknown) => {
        where: (condition: unknown) => {
          orderBy: (order: unknown) => {
            limit: (n: number) => Promise<unknown[]>;
          };
        };
      };
    };
    const result = await select().from({}).where({}).orderBy({}).limit(10);

    expect(result).toEqual([]);
  });

  test('should have query.securityEvents.findMany that resolves to empty array', async () => {
    const mockDb = createMockDb();

    const findMany = mockDb.query.securityEvents.findMany as unknown as (
      query: unknown,
    ) => Promise<unknown[]>;
    const result = await findMany({});

    expect(result).toEqual([]);
  });

  test('should have query.users.findFirst that resolves to null', async () => {
    const mockDb = createMockDb();

    const findFirst = mockDb.query.users.findFirst as unknown as (query: unknown) => Promise<null>;
    const result = await findFirst({});

    expect(result).toBeNull();
  });

  test('should track calls to insert', () => {
    const mockDb = createMockDb();

    const insert = mockDb.insert as unknown as () => unknown;
    insert();
    insert();
    insert();

    expect(mockDb.insert).toHaveBeenCalledTimes(3);
  });

  test('should track calls to select', () => {
    const mockDb = createMockDb();

    const select = mockDb.select as unknown as () => unknown;
    select();
    select();

    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });

  test('should track calls to query.securityEvents.findMany', () => {
    const mockDb = createMockDb();

    const findMany = mockDb.query.securityEvents.findMany as unknown as (
      query: unknown,
    ) => Promise<unknown[]>;
    void findMany({});
    void findMany({});

    expect(mockDb.query.securityEvents.findMany).toHaveBeenCalledTimes(2);
  });

  test('should track calls to query.users.findFirst', () => {
    const mockDb = createMockDb();

    const findFirst = mockDb.query.users.findFirst as unknown as (query: unknown) => Promise<null>;
    void findFirst({});

    expect(mockDb.query.users.findFirst).toHaveBeenCalledTimes(1);
  });

  test('should allow mocking insert.values to return custom value', async () => {
    const mockDb = createMockDb();
    const customReturn = { id: 'test-id' };

    const insert = mockDb.insert as unknown as () => {
      values: { mockResolvedValueOnce: (value: unknown) => void } & ((
        data: unknown,
      ) => Promise<unknown>);
    };
    insert().values.mockResolvedValueOnce(customReturn);

    const insertResult = insert();
    const result = await insertResult.values({ name: 'test' });

    expect(result).toEqual(customReturn);
  });

  test('should allow mocking query.users.findFirst to return custom value', async () => {
    const mockDb = createMockDb();
    const mockUser = { id: 'user-1', name: 'Test User', email: 'test@example.com' };

    (
      mockDb.query.users.findFirst as unknown as { mockResolvedValueOnce: (value: unknown) => void }
    ).mockResolvedValueOnce(mockUser);

    const findFirst = mockDb.query.users.findFirst as unknown as (
      query: unknown,
    ) => Promise<unknown>;
    const result = await findFirst({ where: { id: 'user-1' } });

    expect(result).toEqual(mockUser);
  });

  test('should allow mocking query.securityEvents.findMany to return custom value', async () => {
    const mockDb = createMockDb();
    const mockEvents = [
      { id: 'event-1', type: 'login' },
      { id: 'event-2', type: 'logout' },
    ];

    (
      mockDb.query.securityEvents.findMany as unknown as {
        mockResolvedValueOnce: (value: unknown) => void;
      }
    ).mockResolvedValueOnce(mockEvents);

    const findMany = mockDb.query.securityEvents.findMany as unknown as (
      query: unknown,
    ) => Promise<unknown[]>;
    const result = await findMany({});

    expect(result).toEqual(mockEvents);
  });

  test('should create independent mock instances', () => {
    const mockDb1 = createMockDb();
    const mockDb2 = createMockDb();

    const insert1 = mockDb1.insert as unknown as () => unknown;
    const insert2 = mockDb2.insert as unknown as () => unknown;

    insert1();
    insert1();
    insert1();

    insert2();

    expect(mockDb1.insert).toHaveBeenCalledTimes(3);
    expect(mockDb2.insert).toHaveBeenCalledTimes(1);
  });

  test('should be usable with vi.fn type assertions', () => {
    const mockDb = createMockDb();

    // Verify the functions are vi.fn() instances by checking mock methods
    expect(typeof (mockDb.insert as unknown as { mockReturnValue: unknown }).mockReturnValue).toBe(
      'function',
    );
    expect(typeof (mockDb.select as unknown as { mockReturnValue: unknown }).mockReturnValue).toBe(
      'function',
    );
    expect(
      typeof (mockDb.query.securityEvents.findMany as unknown as { mockReturnValue: unknown })
        .mockReturnValue,
    ).toBe('function');
    expect(
      typeof (mockDb.query.users.findFirst as unknown as { mockReturnValue: unknown })
        .mockReturnValue,
    ).toBe('function');
  });
});
