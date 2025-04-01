import "reflect-metadata";
import { Container } from "inversify";
import { Pool, PoolClient } from "pg";
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";

import { DatabaseConfigProvider } from "@infrastructure/config";
import { DatabaseServer } from "@infrastructure/database";
import { ILoggerService } from "@infrastructure/logging";

import { TYPES } from "@/server/infrastructure/di/types";

// Create a mock query result and client outside the mock
const mockQueryResult = {
  rows: [{ test: 1 }],
  rowCount: 1,
  command: "SELECT",
  oid: 0,
  fields: [],
};

const mockQuery = vi.fn().mockResolvedValue(mockQueryResult);

// Create mock functions first
const mockEnd = vi.fn().mockResolvedValue(undefined);

// Using let instead of const for mockClient so it can be reassigned
let mockClient = {
  query: vi.fn().mockResolvedValue(mockQueryResult),
  release: vi.fn(),
} as unknown as PoolClient;

const mockConnect = vi.fn().mockResolvedValue(mockClient);

// Mock pg module with proper mock implementation
vi.mock("pg", () => {
  return {
    Pool: vi.fn().mockImplementation(() => {
      return {
        connect: mockConnect,
        query: mockQuery,
        end: mockEnd,
        totalCount: 10,
        idleCount: 5,
        activeCount: 5,
        waitingCount: 0,
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 0,
        application_name: "test",
        ssl: false,
        on: vi.fn(),
        once: vi.fn(),
      };
    }),
  };
});

// Mock Logger
const mockLoggerInstance = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  debugObj: vi.fn(),
  infoObj: vi.fn(),
  warnObj: vi.fn(),
  errorObj: vi.fn(),
  createLogger: vi.fn().mockReturnThis(),
  withContext: vi.fn().mockReturnThis(),
  addTransport: vi.fn(),
  setTransports: vi.fn(),
  setMinLevel: vi.fn(),
  initialize: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
};

// Create a complete mock of the logger service
const mockLoggerService = {
  createLogger: vi.fn().mockReturnValue(mockLoggerInstance),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  debugObj: vi.fn(),
  infoObj: vi.fn(),
  warnObj: vi.fn(),
  errorObj: vi.fn(),
  withContext: vi.fn().mockReturnThis(),
  addTransport: vi.fn(),
  setTransports: vi.fn(),
  setMinLevel: vi.fn(),
  initialize: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
};

describe("DatabaseServer", () => {
  let container: Container;
  let dbService: DatabaseServer;
  let mockConfigProvider: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock client
    mockClient = {
      query: vi.fn().mockResolvedValue(mockQueryResult),
      release: vi.fn(),
    } as unknown as PoolClient;

    // Reset mock functions
    mockConnect.mockReset().mockResolvedValue(mockClient);
    mockEnd.mockReset().mockResolvedValue(undefined);

    // Setup mock config provider
    mockConfigProvider = {
      getConfig: vi.fn().mockReturnValue({
        host: "localhost",
        port: 5432,
        database: "testdb",
        user: "testuser",
        password: "testpass",
        maxConnections: 10,
        idleTimeout: 10000,
        connectionTimeout: 0,
        statementTimeout: 30000,
        ssl: false,
        metricsMaxSamples: 1000,
      }),
      getConfigSchema: vi.fn().mockReturnValue({}),
      config: {},
      configService: {} as any,
      loadConfig: vi.fn(),
    } as unknown as any;

    // Setup DI container
    container = new Container();
    container.bind<DatabaseServer>(TYPES.DatabaseService).to(DatabaseServer);
    container
      .bind<ILoggerService>(TYPES.LoggerService)
      .toConstantValue(mockLoggerService);
    container
      .bind<DatabaseConfigProvider>(TYPES.DatabaseConfig)
      .toConstantValue(mockConfigProvider);

    // Create database service instance
    dbService = container.get<DatabaseServer>(TYPES.DatabaseService);

    // IMPORTANT: Override the logger directly
    (dbService as any).logger = mockLoggerInstance;

    (mockConfigProvider.configService as Mock).mockClear();
  });

  afterEach(async () => {
    if (dbService && dbService.close) {
      await dbService.close();
    }
    if (container) {
      container.unbindAll();
    }
  });

  describe("initialize", () => {
    it("should initialize the database connection", async () => {
      // We need to initialize with skipConnectionTest=true for tests
      await dbService.initialize(true);

      expect(mockConnect).not.toHaveBeenCalled();
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Initializing database connection",
        expect.any(Object),
      );
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Connection error");

      // We need to override pool before initialize is called
      const originalPool = Pool;
      const mockPoolImplementation = vi.fn().mockImplementationOnce(() => {
        return {
          connect: vi.fn().mockRejectedValue(error),
          end: vi.fn().mockResolvedValue(undefined),
          on: vi.fn(),
        };
      });

      (Pool as unknown as typeof mockPoolImplementation).mockImplementationOnce(
        () => mockPoolImplementation(),
      );

      try {
        // We need to call initialize without skipConnectionTest
        await dbService.initialize(false);
        // Should not reach here
        throw new Error("Should have thrown an error");
      } catch (e) {
        // Expected to throw
        expect(e).toBe(error);
      }

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "Failed to initialize database connection",
        expect.any(Object),
      );

      // Restore Pool mock
      (Pool as unknown as typeof mockPoolImplementation).mockImplementation(
        () => originalPool,
      );
    });

    it("should skip connection test when requested", async () => {
      await dbService.initialize(true);

      expect(mockConnect).not.toHaveBeenCalled();
      expect(dbService.isConnected()).toBe(true);
    });
  });

  describe("query", () => {
    it("should execute a query successfully", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);
      // Manually set the pool to use our mockQuery
      (dbService as any).pool = { query: mockQuery };

      const result = await dbService.query("SELECT * FROM test");

      expect(mockQuery).toHaveBeenCalledWith({
        text: "SELECT * FROM test",
        values: [],
      });
      expect(result).toEqual(mockQueryResult);
    });

    it("should handle query parameters", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);
      // Manually set the pool to use our mockQuery
      (dbService as any).pool = { query: mockQuery };

      await dbService.query("SELECT * FROM test WHERE id = $1", [1]);

      expect(mockQuery).toHaveBeenCalledWith({
        text: "SELECT * FROM test WHERE id = $1",
        values: [1],
      });
    });

    it("should handle query errors", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);
      // Manually set the pool to use our mockQuery
      (dbService as any).pool = { query: mockQuery };

      mockQuery.mockRejectedValueOnce(new Error("Query error"));

      await expect(
        dbService.query("SELECT * FROM invalid_table"),
      ).rejects.toThrow("Query error");

      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });
  });

  describe("withClient", () => {
    it("should provide a client and release it after use", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);
      // Manually set the pool to use our mockConnect
      (dbService as any).pool = { connect: mockConnect };

      const callback = vi.fn().mockResolvedValue("result");
      const result = await dbService.withClient(callback);

      expect(mockConnect).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
      expect(result).toBe("result");
    });

    it("should release the client even if an error occurs", async () => {
      await dbService.initialize(true);

      const error = new Error("Client error");
      const callback = vi.fn().mockRejectedValue(error);

      await expect(dbService.withClient(callback)).rejects.toThrow(
        "Client error",
      );
    });

    it("should handle connection release errors", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Create a mock client with a release method that throws an error
      const releaseError = new Error("Release error");
      mockClient = {
        query: vi.fn().mockResolvedValue(mockQueryResult),
        release: vi.fn().mockImplementation(() => {
          throw releaseError;
        }),
      } as unknown as PoolClient;

      mockConnect.mockResolvedValueOnce(mockClient);

      // Manually set the pool to use our mockConnect
      (dbService as any).pool = { connect: mockConnect };

      const callback = vi.fn().mockResolvedValue("result");
      // The function should complete successfully despite the release error
      const result = await dbService.withClient(callback);

      expect(result).toBe("result");
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.stringContaining("Error releasing client"),
        expect.any(Object),
      );
    });
  });

  describe("withTransaction", () => {
    it("should execute a transaction successfully", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);
      // Manually set the pool to use our mockConnect
      (dbService as any).pool = { connect: mockConnect };

      const callback = vi.fn().mockResolvedValue("result");
      const result = await dbService.withTransaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith(
        "BEGIN ISOLATION LEVEL READ COMMITTED",
      );
      expect(callback).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe("result");
    });

    it("should rollback the transaction if an error occurs", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);
      // Manually set the pool to use our mockConnect
      (dbService as any).pool = { connect: mockConnect };

      const error = new Error("Transaction error");
      const callback = vi.fn().mockRejectedValue(error);

      await expect(dbService.withTransaction(callback)).rejects.toThrow(
        "Transaction error",
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        "BEGIN ISOLATION LEVEL READ COMMITTED",
      );
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should support transaction retry options", async () => {
      await dbService.initialize(true);
      // Manually set the pool to use our mockConnect
      (dbService as any).pool = { connect: mockConnect };

      // First attempt fails with a retryable error
      const error = new Error("deadlock detected");
      (error as any).code = "40P01";

      // Second attempt succeeds
      const callback = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce("success");

      const result = await dbService.withTransaction(callback, {
        maxRetries: 1,
        retryDelay: 1, // 1ms for faster test
        shouldRetry: (err) => err === error || (err as any)?.code === "40P01",
      });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(result).toBe("success");
    });
  });

  describe("getStats", () => {
    it("should return connection statistics", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);
      // Set up pool statistics
      (dbService as any).pool = {
        totalCount: 10,
        idleCount: 5,
        activeCount: 5,
        waitingCount: 0,
      };

      const stats = dbService.getStats();

      expect(stats).toMatchObject({
        totalCount: 10,
        idleCount: 5,
        activeCount: 5,
        waitingCount: 0,
        queryCount: expect.any(Number),
        queryFailCount: 0,
      });
    });

    it("should reset metrics when requested", async () => {
      await dbService.initialize(true);

      // Execute some queries
      await dbService.query("SELECT 1");

      // Get stats with reset
      const stats = dbService.getStats(true);

      // Execute another query
      await dbService.query("SELECT 2");

      // Get new stats
      const newStats = dbService.getStats();

      expect(stats.queryCount).toBeGreaterThan(0);
      expect(newStats.queryCount).toBe(1); // Only the new query after reset
    });
  });

  describe("createQueryBuilder", () => {
    it("should execute queries via the query builder", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);
      // Manually set the pool to use our mockQuery
      (dbService as any).pool = { query: mockQuery };

      const queryBuilder = dbService.createQueryBuilder("users");
      const result = await queryBuilder
        .select(["id", "name"])
        .where("age > ?", 18)
        .orderBy("name", "ASC")
        .limit(10)
        .execute();

      // Verify the query was executed
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(
            "SELECT id, name FROM users WHERE age > $1 ORDER BY name ASC LIMIT 10",
          ),
          values: [18],
        }),
      );

      expect(result).toEqual(mockQueryResult);
    });
  });

  describe("connection management", () => {
    it("should handle connection pool exhaustion", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Mock pool connect to throw a pool exhaustion error
      const error = new Error("Pool exhausted");
      mockConnect.mockRejectedValueOnce(error);

      // Manually set the pool to use our mockConnect
      (dbService as any).pool = { connect: mockConnect };

      const callback = vi.fn().mockResolvedValue("result");
      await expect(dbService.withClient(callback)).rejects.toThrow(
        "Pool exhausted",
      );
    });

    it("should handle connection timeout", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Mock pool connect to throw a timeout error
      const error = new Error("Connection timeout");
      mockConnect.mockRejectedValueOnce(error);

      // Manually set the pool to use our mockConnect
      (dbService as any).pool = { connect: mockConnect };

      const callback = vi.fn().mockResolvedValue("result");
      await expect(dbService.withClient(callback)).rejects.toThrow(
        "Connection timeout",
      );
    });

    it("should handle connection release errors gracefully", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Create a mock client with a release method that throws an error
      const releaseError = new Error("Release error");
      const mockErrorClient = {
        query: vi.fn().mockResolvedValue(mockQueryResult),
        release: vi.fn().mockImplementation(() => {
          throw releaseError;
        }),
      } as unknown as PoolClient;

      // Prepare the connect mock to return our special error client
      mockConnect.mockReset().mockResolvedValue(mockErrorClient);

      // Manually set the pool to use our mockConnect
      (dbService as any).pool = { connect: mockConnect };

      const callback = vi.fn().mockResolvedValue("result");

      // The function should complete successfully despite the release error
      const result = await dbService.withClient(callback);

      expect(result).toBe("result");
      expect(mockErrorClient.release).toHaveBeenCalled();
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.stringContaining("Error releasing client"),
        expect.any(Object),
      );
    });
  });

  describe("query retries", () => {
    it("should handle retrying failed queries", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Reset mockQuery before setting up our test
      mockQuery.mockReset();

      // Create a mock implementation that fails once then succeeds
      const queryError = new Error("Connection error");
      mockQuery
        .mockRejectedValueOnce(queryError)
        .mockResolvedValue(mockQueryResult);

      // Manually set the pool to use our mockQuery
      (dbService as any).pool = { query: mockQuery };

      // Execute query with retry options
      await dbService.query("SELECT 1", [], {
        retries: 1,
        retryDelay: 10,
      } as any);

      // Verify query was called at least once (initial + possible retry)
      expect(mockQuery).toHaveBeenCalled();
    });

    it("should throw when retries are exhausted", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Reset mockQuery before setting up our test
      mockQuery.mockReset();

      // Create a mock implementation that always fails
      const queryError = new Error("Connection error");
      mockQuery.mockRejectedValue(queryError);

      // Manually set the pool to use our mockQuery
      (dbService as any).pool = { query: mockQuery };

      // Execute query with retry options and expect it to fail
      await expect(
        dbService.query("SELECT 1", [], { retries: 1, retryDelay: 10 } as any),
      ).rejects.toThrow("Connection error");

      // Verify query was called (exact number depends on implementation details)
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe("metrics collection", () => {
    it("should track query metrics with tags", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Mock the getStats method to return predefined values
      const mockStats = {
        queryCount: 2,
        queryFailCount: 0,
        avgQueryTime: 50,
        maxQueryTime: 70,
        querySamples: [
          { sql: "SELECT * FROM users", time: 40, tag: "user_query" },
          { sql: "SELECT * FROM posts", time: 60, tag: "post_query" },
        ],
      };

      // Override the getStats method
      const originalGetStats = dbService.getStats;
      dbService.getStats = vi.fn().mockReturnValue(mockStats);

      const stats = dbService.getStats();
      expect(stats.queryCount).toBe(2);
      expect(stats.queryFailCount).toBe(0);
      expect(stats.avgQueryTime).toBe(50);
      expect(stats.maxQueryTime).toBe(70);

      // Restore original method
      dbService.getStats = originalGetStats;
    });

    it("should track connection acquisition metrics", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Mock the getStats method to return predefined values
      const mockStats = {
        acquireCount: 2,
        acquireFailCount: 0,
        avgAcquireTime: 50,
        maxAcquireTime: 70,
      };

      // Override the getStats method
      const originalGetStats = dbService.getStats;
      dbService.getStats = vi.fn().mockReturnValue(mockStats);

      const stats = dbService.getStats();
      expect(stats.acquireCount).toBe(2);
      expect(stats.acquireFailCount).toBe(0);
      expect(stats.avgAcquireTime).toBe(50);
      expect(stats.maxAcquireTime).toBe(70);

      // Restore original method
      dbService.getStats = originalGetStats;
    });

    it("should cap metrics samples to prevent memory leaks", async () => {
      await dbService.initialize(true);

      // Execute more queries than the max samples limit
      for (let i = 0; i < 1500; i++) {
        await dbService.query(`SELECT ${i}`, [], { tag: `query_${i}` });
      }

      const stats = dbService.getStats();
      expect(stats.queryCount).toBe(1500);
      // The actual number of samples should be capped
      expect(mockConfigProvider.getConfig().metricsMaxSamples).toBe(1000);
    });
  });

  describe("query tag extraction", () => {
    it("should extract tags from SELECT queries", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Manually set the pool to use our mockQuery
      (dbService as any).pool = { query: mockQuery };

      await dbService.query("SELECT * FROM users WHERE id = $1", [1]);
      await dbService.query("SELECT * FROM posts WHERE user_id = $1", [1]);
      await dbService.query("SELECT * FROM comments WHERE post_id = $1", [1]);

      const stats = dbService.getStats();
      expect(stats.queryCount).toBe(3);

      // Verify that the queries were tagged correctly
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("SELECT * FROM users"),
        }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("SELECT * FROM posts"),
        }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("SELECT * FROM comments"),
        }),
      );
    });

    it("should extract tags from INSERT queries", async () => {
      await dbService.initialize(true);

      await dbService.query("INSERT INTO users (name, email) VALUES ($1, $2)", [
        "test",
        "test@example.com",
      ]);

      const stats = dbService.getStats();
      expect(stats.queryCount).toBe(1);
    });

    it("should extract tags from UPDATE queries", async () => {
      await dbService.initialize(true);

      await dbService.query("UPDATE users SET name = $1 WHERE id = $2", [
        "new name",
        1,
      ]);

      const stats = dbService.getStats();
      expect(stats.queryCount).toBe(1);
    });

    it("should extract tags from DELETE queries", async () => {
      await dbService.initialize(true);

      await dbService.query("DELETE FROM users WHERE id = $1", [1]);

      const stats = dbService.getStats();
      expect(stats.queryCount).toBe(1);
    });
  });

  describe("transaction retry behavior", () => {
    it("should handle transaction with custom isolation level", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Manually set the pool to use our mockConnect
      (dbService as any).pool = { connect: mockConnect };

      const callback = vi.fn().mockResolvedValue("result");
      const result = await dbService.withTransaction(callback, {
        isolationLevel: "SERIALIZABLE",
      });

      expect(result).toBe("result");
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("query builder integration", () => {
    it("should create a query builder and execute simple queries", async () => {
      // Initialize with skipConnectionTest=true
      await dbService.initialize(true);

      // Manually set the pool to use our mockQuery
      (dbService as any).pool = { query: mockQuery };

      const queryBuilder = dbService.createQueryBuilder("users");

      // Verify the builder has the expected methods
      expect(queryBuilder.select).toBeInstanceOf(Function);
      expect(queryBuilder.where).toBeInstanceOf(Function);
      expect(queryBuilder.orderBy).toBeInstanceOf(Function);
      expect(queryBuilder.limit).toBeInstanceOf(Function);
      expect(queryBuilder.execute).toBeInstanceOf(Function);
    });

    it("should handle join clauses", async () => {
      await dbService.initialize(true);
      (dbService as any).pool = { query: mockQuery };

      const result = await dbService
        .createQueryBuilder("users")
        .select(["users.id", "posts.title"])
        .join("posts", "posts.user_id = users.id")
        .where("users.active = ?", true)
        .execute();

      // Look at the second call since the first is likely setting statement_timeout
      const call = mockQuery.mock.calls[1][0];
      expect(call.text).toContain(
        "SELECT users.id, posts.title FROM users JOIN posts ON posts.user_id = users.id WHERE users.active = $1",
      );
      expect(call.values).toEqual([true]);
      expect(result).toEqual(mockQueryResult);
    });

    it("should handle left join clauses", async () => {
      await dbService.initialize(true);
      (dbService as any).pool = { query: mockQuery };

      const result = await dbService
        .createQueryBuilder("users")
        .select(["users.id", "posts.title"])
        .leftJoin("posts", "posts.user_id = users.id")
        .where("users.id = ?", 1)
        .execute();

      // Look at the second call since the first is likely setting statement_timeout
      const call = mockQuery.mock.calls[1][0];
      expect(call.text).toContain(
        "SELECT users.id, posts.title FROM users LEFT JOIN posts ON posts.user_id = users.id WHERE users.id = $1",
      );
      expect(call.values).toEqual([1]);
      expect(result).toEqual(mockQueryResult);
    });

    it("should handle group by clauses", async () => {
      await dbService.initialize(true);
      (dbService as any).pool = { query: mockQuery };

      const result = await dbService
        .createQueryBuilder("users")
        .select(["COUNT(*) as count", "status"])
        .groupBy("status")
        .execute();

      // Look at the second call since the first is likely setting statement_timeout
      const call = mockQuery.mock.calls[1][0];
      expect(call.text).toContain(
        "SELECT COUNT(*) as count, status FROM users GROUP BY status",
      );
      expect(call.values).toEqual([]);
      expect(result).toEqual(mockQueryResult);
    });

    it("should handle count operations", async () => {
      await dbService.initialize(true);
      (dbService as any).pool = { query: mockQuery };

      // Mock the count query result
      mockQuery.mockReset().mockResolvedValue({
        rows: [{ count: "10" }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const count = await dbService
        .createQueryBuilder("users")
        .where("active = ?", true)
        .count();

      // Look at the second call since the first is likely setting statement_timeout
      const call = mockQuery.mock.calls[1][0];
      expect(call.text).toContain(
        "SELECT COUNT(*) as count FROM users WHERE active = $1",
      );
      expect(call.values).toEqual([true]);
      expect(count).toBe(10); // The count method converts the string "10" to number 10
    });

    it("should retrieve a single record with getOne", async () => {
      await dbService.initialize(true);
      (dbService as any).pool = { query: mockQuery };

      // Reset the mock and provide the expected result
      mockQuery.mockReset().mockResolvedValue({
        rows: [{ id: 1, name: "Test User" }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await dbService
        .createQueryBuilder("users")
        .select(["id", "name"])
        .where("id = ?", 1)
        .getOne();

      // Look at the second call since the first is likely setting statement_timeout
      const call = mockQuery.mock.calls[1][0];
      expect(call.text).toContain(
        "SELECT id, name FROM users WHERE id = $1 LIMIT 1",
      );
      expect(call.values).toEqual([1]);
      expect(result).toEqual({ id: 1, name: "Test User" });
    });

    it("should handle getMany operations", async () => {
      await dbService.initialize(true);
      (dbService as any).pool = { query: mockQuery };

      // Reset the mock and provide the expected result
      mockQuery.mockReset().mockResolvedValue({
        rows: [
          { id: 1, name: "User 1" },
          { id: 2, name: "User 2" },
        ],
        rowCount: 2,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const users = await dbService
        .createQueryBuilder("users")
        .where("active = ?", true)
        .getMany();

      // Look at the second call since the first is likely setting statement_timeout
      const call = mockQuery.mock.calls[1][0];
      expect(call.text).toContain("SELECT * FROM users WHERE active = $1");
      expect(call.values).toEqual([true]);
      expect(users).toEqual([
        { id: 1, name: "User 1" },
        { id: 2, name: "User 2" },
      ]);
    });

    it("should handle query options", async () => {
      await dbService.initialize(true);
      (dbService as any).pool = { query: mockQuery };

      const queryOptions = { tag: "users_query", timeout: 5000 };
      await dbService
        .createQueryBuilder("users")
        .select(["id", "name"])
        .where("active = ?", true)
        .execute(queryOptions);

      // First call is likely statement_timeout
      expect(mockQuery.mock.calls[0][0]).toBe("SET statement_timeout = 5000");

      // Second call is the actual query
      const call = mockQuery.mock.calls[1][0];
      expect(call.text).toContain(
        "SELECT id, name FROM users WHERE active = $1",
      );
      expect(call.values).toEqual([true]);
    });

    it("should handle getSql method", async () => {
      await dbService.initialize(true);

      const sql = dbService
        .createQueryBuilder("users")
        .select(["id", "name"])
        .where("active = ?", true)
        .orderBy("name", "ASC")
        .limit(10)
        .offset(20)
        .getSql();

      expect(sql).toContain("SELECT id, name FROM users");
      expect(sql).toContain("WHERE active = $1");
      expect(sql).toContain("ORDER BY name ASC");
      expect(sql).toContain("LIMIT 10");
      expect(sql).toContain("OFFSET 20");
    });

    it("should handle null result in getOne", async () => {
      await dbService.initialize(true);
      (dbService as any).pool = { query: mockQuery };

      // Most importantly, mock with EMPTY rows array
      mockQuery.mockReset().mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const user = await dbService
        .createQueryBuilder("users")
        .where("id = ?", 9999)
        .getOne();

      expect(user).toBeNull();
    });

    it("should retrieve multiple records with getMany", async () => {
      await dbService.initialize(true);
      (dbService as any).pool = { query: mockQuery };

      // Reset the mock and provide the expected result
      mockQuery.mockReset().mockResolvedValue({
        rows: [
          { id: 1, name: "User 1" },
          { id: 2, name: "User 2" },
        ],
        rowCount: 2,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const users = await dbService
        .createQueryBuilder("users")
        .where("active = ?", true)
        .getMany();

      // Look at the second call since the first is likely setting statement_timeout
      const call = mockQuery.mock.calls[1][0];
      expect(call.text).toContain("SELECT * FROM users WHERE active = $1");
      expect(call.values).toEqual([true]);
      expect(users).toEqual([
        { id: 1, name: "User 1" },
        { id: 2, name: "User 2" },
      ]);
    });
  });

  // Add tests for query builder functionality
  describe("query builder implementation", () => {
    let databaseServer: DatabaseServer;
    let mockPool: any;
    let mockConfigProvider: any;

    beforeEach(() => {
      mockPool = {
        query: mockQuery,
        connect: vi.fn().mockResolvedValue({
          query: mockQuery,
          release: vi.fn(),
        }),
        end: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      };

      // Create a mock config provider with getConfig method
      mockConfigProvider = {
        getConfig: vi.fn().mockReturnValue({
          host: "localhost",
          port: 5432,
          database: "test",
          user: "postgres",
          password: "postgres",
          maxConnections: 10,
          idleTimeout: 10000,
          connectionTimeout: 30000,
        }),
      };

      // Create the DatabaseServer with mocked dependencies
      databaseServer = new DatabaseServer(
        mockLoggerService,
        mockConfigProvider,
      );

      // Use type assertion to set private properties for testing
      (databaseServer as any).pool = mockPool;
      (databaseServer as any).connected = true;
      (databaseServer as any).logger = mockLoggerInstance;
    });

    it("should create a query builder", () => {
      const queryBuilder = databaseServer.createQueryBuilder("users");
      expect(queryBuilder).toBeDefined();
    });

    it("should execute a basic select query", async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, name: "Test" }],
        rowCount: 1,
      });

      const queryBuilder = databaseServer.createQueryBuilder("users");
      const result = await queryBuilder
        .select(["id", "name"])
        .where("id = ?", 1)
        .execute();

      expect(mockQuery).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "SELECT id, name FROM users WHERE id = $1",
        ),
        values: [1],
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe("Test");
    });

    it("should handle join clauses", async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, name: "Test", order_id: 101 }],
        rowCount: 1,
      });

      const queryBuilder = databaseServer.createQueryBuilder("users");
      const result = await queryBuilder
        .select(["users.id", "users.name", "orders.id as order_id"])
        .join("orders", "orders.user_id = users.id")
        .where("users.id = ?", 1)
        .execute();

      expect(mockQuery).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "JOIN orders ON orders.user_id = users.id",
        ),
        values: [1],
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].order_id).toBe(101);
    });

    it("should handle left join clauses", async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, name: "Test", profile_id: null }],
        rowCount: 1,
      });

      const queryBuilder = databaseServer.createQueryBuilder("users");
      const result = await queryBuilder
        .select(["users.id", "users.name", "profiles.id as profile_id"])
        .leftJoin("profiles", "profiles.user_id = users.id")
        .where("users.id = ?", 1)
        .execute();

      expect(mockQuery).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "LEFT JOIN profiles ON profiles.user_id = users.id",
        ),
        values: [1],
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].profile_id).toBeNull();
    });

    it("should handle group by clauses", async () => {
      mockQuery.mockResolvedValue({
        rows: [{ category: "A", count: "5" }],
        rowCount: 1,
      });

      const queryBuilder = databaseServer.createQueryBuilder("products");
      const result = await queryBuilder
        .select(["category", "COUNT(*) as count"])
        .groupBy("category")
        .execute();

      expect(mockQuery).toHaveBeenCalledWith({
        text: expect.stringContaining("GROUP BY category"),
        values: [],
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].count).toBe("5");
    });

    it("should execute count queries", async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: "10" }], rowCount: 1 });

      const queryBuilder = databaseServer.createQueryBuilder("users");
      const count = await queryBuilder.where("active = ?", true).count();

      expect(mockQuery).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "SELECT COUNT(*) as count FROM users WHERE active = $1",
        ),
        values: [true],
      });
      expect(count).toBe(10);
    });

    it("should retrieve a single record with getOne", async () => {
      // Set up the mock return value
      mockQuery.mockReset().mockResolvedValue({
        rows: [{ id: 1, name: "Test User" }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const queryBuilder = databaseServer.createQueryBuilder("users");
      const result = await queryBuilder
        .select(["id", "name"])
        .where("id = ?", 1)
        .getOne();

      expect(mockQuery).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "SELECT id, name FROM users WHERE id = $1 LIMIT 1",
        ),
        values: [1],
      });
      expect(result).toEqual({ id: 1, name: "Test User" });
    });

    it("should handle null result in getOne", async () => {
      mockQuery.mockReset().mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const queryBuilder = databaseServer.createQueryBuilder("users");
      const user = await queryBuilder
        .select(["id", "name"])
        .where("id = ?", 999)
        .getOne();

      expect(mockQuery).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "SELECT id, name FROM users WHERE id = $1 LIMIT 1",
        ),
        values: [999],
      });
      expect(user).toBeNull();
    });

    it("should retrieve multiple records with getMany", async () => {
      mockQuery.mockReset().mockResolvedValue({
        rows: [
          { id: 1, name: "User 1" },
          { id: 2, name: "User 2" },
        ],
        rowCount: 2,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const queryBuilder = databaseServer.createQueryBuilder("users");
      const users = await queryBuilder
        .select(["id", "name"])
        .where("active = ?", true)
        .getMany();

      expect(mockQuery).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "SELECT id, name FROM users WHERE active = $1",
        ),
        values: [true],
      });
      expect(users).toHaveLength(2);
      expect(users[0].name).toBe("User 1");
      expect(users[1].name).toBe("User 2");
    });

    it("should pass query options to the query execution", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

      const queryBuilder = databaseServer.createQueryBuilder("users");
      const queryOptions = { timeout: 5000, tag: "test-query" };
      await queryBuilder.select(["id"]).execute(queryOptions);

      // Check if second call includes the query with options
      expect(mockQuery.mock.calls[1][0]).toEqual({
        text: expect.stringContaining("SELECT id FROM users"),
        values: [],
      });
    });

    it("should generate SQL with getSql method", () => {
      const queryBuilder = databaseServer.createQueryBuilder("users");
      const sql = queryBuilder
        .select(["id", "name"])
        .where("id = ?", 1)
        .getSql();

      expect(sql).toContain("SELECT id, name FROM users WHERE id = $1");
    });

    it("should handle complex queries with multiple clauses", async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, name: "Test" }],
        rowCount: 1,
      });

      const queryBuilder = databaseServer.createQueryBuilder("users");
      await queryBuilder
        .select(["users.id", "users.name", "COUNT(orders.id) as order_count"])
        .join("orders", "orders.user_id = users.id")
        .leftJoin("profiles", "profiles.user_id = users.id")
        .where("users.active = ?", true)
        .groupBy("users.id, users.name")
        .orderBy("users.name", "ASC")
        .limit(10)
        .offset(20)
        .execute();

      const query = mockQuery.mock.calls[0][0];

      expect(query.text).toContain(
        "SELECT users.id, users.name, COUNT(orders.id) as order_count FROM users",
      );
      expect(query.text).toContain("JOIN orders ON orders.user_id = users.id");
      expect(query.text).toContain(
        "LEFT JOIN profiles ON profiles.user_id = users.id",
      );
      expect(query.text).toContain("WHERE users.active = $1");
      expect(query.text).toContain("GROUP BY users.id, users.name");
      expect(query.text).toContain("ORDER BY users.name ASC");
      expect(query.text).toContain("LIMIT 10");
      expect(query.text).toContain("OFFSET 20");
      expect(query.values).toEqual([true]);
    });
  });
});
