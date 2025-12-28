import { QueryResult, PoolClient } from "pg";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("IDatabaseServer", () => {
  let mockDatabaseServer: any;

  beforeEach(() => {
    mockDatabaseServer = {
      initialize: vi.fn(),
      close: vi.fn(),
      query: vi.fn(),
      connect: vi.fn(),
      withClient: vi.fn(),
      withTransaction: vi.fn(),
      isConnected: vi.fn(),
      getStats: vi.fn(),
      resetMetrics: vi.fn(),
      reset: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
  });

  describe("interface implementation", () => {
    it("should have all required methods", () => {
      expect(mockDatabaseServer.initialize).toBeDefined();
      expect(mockDatabaseServer.close).toBeDefined();
      expect(mockDatabaseServer.query).toBeDefined();
      expect(mockDatabaseServer.connect).toBeDefined();
      expect(mockDatabaseServer.withClient).toBeDefined();
      expect(mockDatabaseServer.withTransaction).toBeDefined();
      expect(mockDatabaseServer.isConnected).toBeDefined();
      expect(mockDatabaseServer.getStats).toBeDefined();
      expect(mockDatabaseServer.resetMetrics).toBeDefined();
      expect(mockDatabaseServer.reset).toBeDefined();
      expect(mockDatabaseServer.createQueryBuilder).toBeDefined();
    });

    it("should have correct method signatures", async () => {
      // Test initialize
      await mockDatabaseServer.initialize();
      expect(mockDatabaseServer.initialize).toHaveBeenCalled();

      // Test close
      await mockDatabaseServer.close();
      expect(mockDatabaseServer.close).toHaveBeenCalled();

      // Test query
      const mockResult: QueryResult = {
        rows: [{ id: 1 }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      };
      mockDatabaseServer.query.mockResolvedValue(mockResult);
      const queryResult = await mockDatabaseServer.query("SELECT * FROM test");
      expect(queryResult).toEqual(mockResult);

      // Test connect
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
        connect: vi.fn(),
        copyFrom: vi.fn(),
        copyTo: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        once: vi.fn(),
        emit: vi.fn(),
        listeners: vi.fn(),
        listenerCount: vi.fn(),
        removeListener: vi.fn(),
        removeAllListeners: vi.fn(),
        setMaxListeners: vi.fn(),
        getMaxListeners: vi.fn(),
        rawListeners: vi.fn(),
        prependListener: vi.fn(),
        prependOnceListener: vi.fn(),
        eventNames: vi.fn(),
        addListener: vi.fn(),
        ref: vi.fn(),
        unref: vi.fn(),
        hasRef: vi.fn(),
      } as unknown as PoolClient;
      mockDatabaseServer.connect.mockResolvedValue(mockClient);
      const client = await mockDatabaseServer.connect();
      await client.query("SELECT 1");
      expect(mockDatabaseServer.connect).toHaveBeenCalled();

      // Test withClient
      mockDatabaseServer.withClient.mockImplementation(
        async (callback: (client: PoolClient) => Promise<any>) => {
          return callback(mockClient);
        },
      );
      await mockDatabaseServer.withClient(async (client: PoolClient) => {
        await client.query("SELECT 1");
      });
      expect(mockDatabaseServer.withClient).toHaveBeenCalled();

      // Test withTransaction
      mockDatabaseServer.withTransaction.mockImplementation(
        async (callback: (client: PoolClient) => Promise<any>) => {
          return callback(mockClient);
        },
      );
      await mockDatabaseServer.withTransaction(async (client: PoolClient) => {
        await client.query("BEGIN");
        await client.query("COMMIT");
      });
      expect(mockDatabaseServer.withTransaction).toHaveBeenCalled();

      // Test isConnected
      mockDatabaseServer.isConnected.mockReturnValue(true);
      expect(mockDatabaseServer.isConnected()).toBe(true);

      // Test getStats
      const mockStats = {
        totalCount: 10,
        idleCount: 5,
        activeCount: 5,
        waitingCount: 0,
        maxConnections: 10,
        utilization: 0.5,
        acquireCount: 100,
        acquireFailCount: 0,
        queryCount: 100,
        queryFailCount: 0,
      };
      mockDatabaseServer.getStats.mockReturnValue(mockStats);
      expect(mockDatabaseServer.getStats()).toEqual(mockStats);

      // Test resetMetrics
      mockDatabaseServer.resetMetrics();
      expect(mockDatabaseServer.resetMetrics).toHaveBeenCalled();

      // Test reset
      mockDatabaseServer.reset();
      expect(mockDatabaseServer.reset).toHaveBeenCalled();

      // Test createQueryBuilder
      const mockQueryBuilder = {
        select: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        offset: vi.fn(),
        execute: vi.fn(),
      };
      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");
      expect(queryBuilder).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should handle query errors", async () => {
      const error = new Error("Query failed");
      mockDatabaseServer.query.mockRejectedValue(error);

      await expect(
        mockDatabaseServer.query("SELECT * FROM test"),
      ).rejects.toThrow("Query failed");
    });

    it("should handle transaction errors", async () => {
      const error = new Error("Transaction failed");
      mockDatabaseServer.withTransaction.mockRejectedValue(error);

      await expect(
        mockDatabaseServer.withTransaction(async () => {}),
      ).rejects.toThrow("Transaction failed");
    });

    it("should handle client errors", async () => {
      const error = new Error("Client error");
      mockDatabaseServer.withClient.mockRejectedValue(error);

      await expect(
        mockDatabaseServer.withClient(async () => {}),
      ).rejects.toThrow("Client error");
    });
  });

  describe("connection management", () => {
    it("should track connection state", async () => {
      mockDatabaseServer.isConnected.mockReturnValue(false);
      expect(mockDatabaseServer.isConnected()).toBe(false);

      await mockDatabaseServer.initialize();
      mockDatabaseServer.isConnected.mockReturnValue(true);
      expect(mockDatabaseServer.isConnected()).toBe(true);

      await mockDatabaseServer.close();
      mockDatabaseServer.isConnected.mockReturnValue(false);
      expect(mockDatabaseServer.isConnected()).toBe(false);
    });

    it("should prevent operations when not connected", async () => {
      mockDatabaseServer.isConnected.mockReturnValue(false);
      mockDatabaseServer.query.mockRejectedValue(new Error("Not connected"));

      await expect(mockDatabaseServer.query("SELECT 1")).rejects.toThrow(
        "Not connected",
      );
    });
  });

  describe("metrics and statistics", () => {
    it("should track query statistics", async () => {
      const mockStats = {
        totalCount: 10,
        idleCount: 5,
        activeCount: 5,
        waitingCount: 0,
        maxConnections: 10,
        utilization: 0.5,
        acquireCount: 100,
        acquireFailCount: 0,
        queryCount: 100,
        queryFailCount: 0,
      };

      mockDatabaseServer.getStats.mockReturnValue(mockStats);
      expect(mockDatabaseServer.getStats()).toEqual(mockStats);

      mockDatabaseServer.resetMetrics();
      mockDatabaseServer.getStats.mockReturnValue({
        ...mockStats,
        queryCount: 0,
        queryFailCount: 0,
      });
      expect(mockDatabaseServer.getStats().queryCount).toBe(0);
    });

    it("should reset metrics correctly", () => {
      mockDatabaseServer.resetMetrics();
      expect(mockDatabaseServer.resetMetrics).toHaveBeenCalled();
    });
  });

  describe("query builder", () => {
    it("should create query builder with expected methods", () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        getOne: vi.fn().mockResolvedValue(null),
        getMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        getSql: vi.fn().mockReturnValue("SELECT * FROM test"),
        buildQuery: vi
          .fn()
          .mockReturnValue({ sql: "SELECT * FROM test", params: [] }),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      // Test each query builder method
      queryBuilder.select(["id", "name"]);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(["id", "name"]);

      queryBuilder.where("id = ?", 1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("id = ?", 1);

      queryBuilder.join("other_table", "other_table.id = test_table.other_id");
      expect(mockQueryBuilder.join).toHaveBeenCalledWith(
        "other_table",
        "other_table.id = test_table.other_id",
      );

      queryBuilder.leftJoin(
        "optional_table",
        "optional_table.id = test_table.optional_id",
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        "optional_table",
        "optional_table.id = test_table.optional_id",
      );

      queryBuilder.groupBy("category");
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith("category");

      queryBuilder.orderBy("name", "ASC");
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("name", "ASC");

      queryBuilder.limit(10);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);

      queryBuilder.offset(20);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(20);

      // Test execution methods
      queryBuilder.execute();
      expect(mockQueryBuilder.execute).toHaveBeenCalled();

      queryBuilder.getOne();
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();

      queryBuilder.getMany();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();

      queryBuilder.count();
      expect(mockQueryBuilder.count).toHaveBeenCalled();

      queryBuilder.getSql();
      expect(mockQueryBuilder.getSql).toHaveBeenCalled();

      queryBuilder.buildQuery();
      expect(mockQueryBuilder.buildQuery).toHaveBeenCalled();
    });

    it("should handle query execution with options", async () => {
      const mockResult = { rows: [{ id: 1, name: "Test" }], rowCount: 1 };
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
        getMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
        execute: vi.fn().mockResolvedValue(mockResult),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      const result = await queryBuilder
        .select(["id", "name"])
        .where("active = ?", true)
        .execute({ timeout: 5000 });

      expect(mockQueryBuilder.execute).toHaveBeenCalledWith({ timeout: 5000 });
      expect(result).toEqual(mockResult);
    });

    it("should handle getOne result properly", async () => {
      const mockItem = { id: 1, name: "Test" };
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        getMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
        getOne: vi.fn().mockResolvedValue(mockItem),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      const item = await queryBuilder
        .select(["id", "name"])
        .where("id = ?", 1)
        .getOne();

      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
      expect(item).toEqual(mockItem);
    });

    it("should handle getMany result properly", async () => {
      const mockItems = [
        { id: 1, name: "Test 1" },
        { id: 2, name: "Test 2" },
      ];
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        getOne: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
        getMany: vi.fn().mockResolvedValue(mockItems),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      const items = await queryBuilder
        .select(["id", "name"])
        .where("active = ?", true)
        .getMany();

      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(items).toEqual(mockItems);
      expect(items.length).toBe(2);
    });

    it("should handle count operations", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        getOne: vi.fn().mockResolvedValue(null),
        getMany: vi.fn().mockResolvedValue([]),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
        count: vi.fn().mockResolvedValue(42),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      const count = await queryBuilder.where("active = ?", true).count();

      expect(mockQueryBuilder.count).toHaveBeenCalled();
      expect(count).toBe(42);
    });

    it("should handle error in query execution", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
        getMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
        execute: vi.fn().mockRejectedValue(new Error("Query execution failed")),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      await expect(
        queryBuilder.select(["id", "name"]).where("id = ?", 1).execute(),
      ).rejects.toThrow("Query execution failed");
    });

    it("should handle error in getOne operation", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        getMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
        getOne: vi.fn().mockRejectedValue(new Error("GetOne operation failed")),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      await expect(
        queryBuilder.select(["id", "name"]).where("id = ?", 1).getOne(),
      ).rejects.toThrow("GetOne operation failed");
    });

    it("should handle error in getMany operation", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        getOne: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
        getMany: vi
          .fn()
          .mockRejectedValue(new Error("GetMany operation failed")),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      await expect(
        queryBuilder.select(["id", "name"]).where("id = ?", 1).getMany(),
      ).rejects.toThrow("GetMany operation failed");
    });

    it("should handle error in count operation", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        getOne: vi.fn().mockResolvedValue(null),
        getMany: vi.fn().mockResolvedValue([]),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
        count: vi.fn().mockRejectedValue(new Error("Count operation failed")),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      await expect(
        queryBuilder.where("active = ?", true).count(),
      ).rejects.toThrow("Count operation failed");
    });

    it("should properly handle array parameters in where clause", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        getOne: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
        getMany: vi.fn().mockResolvedValue([]),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");
      const ids = [1, 2, 3];

      await queryBuilder
        .select(["id", "name"])
        .where("id = ANY(?)", ids)
        .getMany();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith("id = ANY(?)", ids);
    });

    it("should handle complex chained query operations", async () => {
      const mockResult = { rows: [{ id: 1, name: "Test" }], rowCount: 1 };
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        join: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(mockResult),
        getOne: vi.fn().mockResolvedValue(null),
        getMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        getSql: vi.fn().mockReturnValue(""),
        buildQuery: vi.fn().mockReturnValue({ sql: "", params: [] }),
      };

      mockDatabaseServer.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryBuilder = mockDatabaseServer.createQueryBuilder("test_table");

      const result = await queryBuilder
        .select(["id", "name", "COUNT(orders.id) as order_count"])
        .join("orders", "orders.customer_id = test_table.id")
        .leftJoin("preferences", "preferences.customer_id = test_table.id")
        .where("test_table.active = ?", true)
        .groupBy("test_table.id")
        .orderBy("test_table.name", "ASC")
        .limit(10)
        .offset(20)
        .execute();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        "id",
        "name",
        "COUNT(orders.id) as order_count",
      ]);
      expect(mockQueryBuilder.join).toHaveBeenCalledWith(
        "orders",
        "orders.customer_id = test_table.id",
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        "preferences",
        "preferences.customer_id = test_table.id",
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "test_table.active = ?",
        true,
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith("test_table.id");
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "test_table.name",
        "ASC",
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe("transaction options", () => {
    let mockClient: PoolClient;

    beforeEach(() => {
      mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      } as unknown as PoolClient;
    });

    it("should handle transaction options correctly", async () => {
      const transactionOptions = {
        maxRetries: 3,
        retryDelay: 100,
        retryDelayMultiplier: 1.5,
        maxRetryDelay: 5000,
        isolationLevel: "SERIALIZABLE" as const,
        timeout: 1000,
        shouldRetry: (error: unknown) => error instanceof Error,
      };

      mockDatabaseServer.withTransaction.mockImplementation(
        async (
          callback: (client: PoolClient) => Promise<any>,
          options?: any,
        ) => {
          expect(options).toEqual(transactionOptions);
          return callback(mockClient);
        },
      );

      await mockDatabaseServer.withTransaction(async (client: PoolClient) => {
        await client.query("SELECT 1");
      }, transactionOptions);

      expect(mockDatabaseServer.withTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        transactionOptions,
      );
    });

    it("should pass transaction retry options correctly", async () => {
      const retryOptions = { maxRetries: 3, retryDelay: 0 };

      // Set up mock implementation to return a successful result
      mockDatabaseServer.withTransaction.mockResolvedValue("success");

      // Execute the transaction with retry options
      await mockDatabaseServer.withTransaction(async (_client: PoolClient) => {
        return "success";
      }, retryOptions);

      // Verify that the mock was called with the correct options
      expect(mockDatabaseServer.withTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining(retryOptions),
      );
    });
  });

  describe("query options", () => {
    it("should handle query timeout option", async () => {
      const queryOptions = {
        timeout: 5000,
        tag: "test-query",
      };

      await mockDatabaseServer.query("SELECT 1", [], queryOptions);
      expect(mockDatabaseServer.query).toHaveBeenCalledWith(
        "SELECT 1",
        [],
        queryOptions,
      );
    });

    it("should pass query retry options correctly", async () => {
      const retryOptions = {
        maxRetries: 2,
        timeout: 1000,
      };

      // Set up mock to return a successful result
      mockDatabaseServer.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      } as QueryResult);

      // Call query with retry options
      await mockDatabaseServer.query("SELECT 1", [], retryOptions);

      // Verify that options were passed to the query method
      expect(mockDatabaseServer.query).toHaveBeenCalledWith(
        "SELECT 1",
        [],
        expect.objectContaining(retryOptions),
      );
    });
  });

  describe("connection stats", () => {
    it("should track detailed connection metrics", () => {
      const detailedStats = {
        totalCount: 10,
        idleCount: 5,
        activeCount: 5,
        waitingCount: 0,
        maxConnections: 20,
        utilization: 0.25,
        acquireCount: 100,
        acquireFailCount: 2,
        avgAcquireTime: 150,
        maxAcquireTime: 500,
        queryCount: 1000,
        queryFailCount: 5,
        avgQueryTime: 50,
        maxQueryTime: 200,
      };

      mockDatabaseServer.getStats.mockReturnValue(detailedStats);
      const stats = mockDatabaseServer.getStats();

      expect(stats).toEqual(detailedStats);
      expect(stats.utilization).toBe(0.25);
      expect(stats.avgAcquireTime).toBe(150);
      expect(stats.maxQueryTime).toBe(200);
    });
  });
});
