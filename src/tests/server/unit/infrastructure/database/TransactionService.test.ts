import { Container } from "inversify";
import { QueryResult, PoolClient } from "pg";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { TYPES } from "@di/types";
import {
  TransactionOptions,
  IDatabaseServer,
  TransactionService,
  IsolationLevel,
} from "@infrastructure/database";
import { ILoggerService } from "@infrastructure/logging";

// Extend TransactionOptions to include missing properties
interface ExtendedTransactionOptions extends TransactionOptions {
  isolation?: IsolationLevel;
  readOnly?: boolean;
  deferrable?: boolean;
}

type TransactionCallback = (client: PoolClient) => Promise<any>;

describe("TransactionService", () => {
  let container: Container;
  let transactionService: TransactionService;
  let mockLogger: any;
  let mockDatabaseService: any;
  let mockClient: any; // Using any type to avoid TypeScript errors
  let mockQueryResult: QueryResult;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    container = new Container();

    // Setup mock query result
    mockQueryResult = {
      rows: [{ id: 1 }],
      rowCount: 1,
      command: "SELECT",
      oid: 0,
      fields: [],
    };

    // Setup mock client
    mockClient = {
      query: vi.fn().mockResolvedValue(mockQueryResult),
      release: vi.fn(),
    };

    // Setup mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      createLogger: vi.fn().mockReturnValue({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      }),
    } as unknown as any;

    // Setup mock database service
    mockDatabaseService = {
      withTransaction: vi
        .fn()
        .mockImplementation((callback: TransactionCallback) =>
          callback(mockClient),
        ),
      withClient: vi.fn(),
      query: vi.fn(),
      initialize: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
      close: vi.fn(),
      getStats: vi.fn(),
      resetMetrics: vi.fn(),
      reset: vi.fn(),
      createQueryBuilder: vi.fn(),
    } as unknown as IDatabaseServer;

    // Bind services
    container
      .bind<ILoggerService>(TYPES.LoggerService)
      .toConstantValue(mockLogger);
    container
      .bind<IDatabaseServer>(TYPES.DatabaseService)
      .toConstantValue(mockDatabaseService);
    container
      .bind<TransactionService>(TYPES.TransactionManager)
      .to(TransactionService);

    // Get service instance
    transactionService = container.get<TransactionService>(
      TYPES.TransactionManager,
    );
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe("execute", () => {
    it("should execute a callback within a transaction", async () => {
      const callback = vi.fn().mockResolvedValue("result");
      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise
      const result = await transactionService.execute(callback);

      // Verify
      expect(mockDatabaseService.withTransaction).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(result).toBe("result");
    });

    it("should execute a transaction with custom isolation level", async () => {
      const callback = vi.fn().mockResolvedValue("result");
      const options: ExtendedTransactionOptions = {
        isolation: IsolationLevel.SERIALIZABLE,
        readOnly: true,
      };

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise
      await transactionService.execute(callback, options);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith(
        "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
      );
    });

    it("should include DEFERRABLE when provided with SERIALIZABLE isolation", async () => {
      const callback = vi.fn().mockResolvedValue("result");
      const options: ExtendedTransactionOptions = {
        isolation: IsolationLevel.SERIALIZABLE,
        deferrable: true,
      };

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise
      await transactionService.execute(callback, options);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith(
        "BEGIN ISOLATION LEVEL SERIALIZABLE DEFERRABLE",
      );
    });

    it("should not include DEFERRABLE when isolation is not SERIALIZABLE", async () => {
      const callback = vi.fn().mockResolvedValue("result");
      const options: ExtendedTransactionOptions = {
        isolation: IsolationLevel.READ_COMMITTED,
        deferrable: true, // This should be ignored
      };

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise
      await transactionService.execute(callback, options);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith(
        "BEGIN ISOLATION LEVEL READ COMMITTED",
      );
      // Ensure DEFERRABLE was not included
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining("DEFERRABLE"),
      );
    });

    it("should set statement timeout if provided", async () => {
      const callback = vi.fn().mockResolvedValue("result");
      const options: ExtendedTransactionOptions = {
        timeout: 5000,
      };

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise
      await transactionService.execute(callback, options);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith(
        "SET statement_timeout = 5000",
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        "SET statement_timeout TO DEFAULT",
      );
    });

    it("should log warning if resetting statement timeout fails", async () => {
      const callback = vi.fn().mockResolvedValue("result");
      const options: ExtendedTransactionOptions = {
        timeout: 5000,
      };
      const resetError = new Error("Failed to reset timeout");

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql === "SET statement_timeout TO DEFAULT") {
          throw resetError;
        }
        return mockQueryResult;
      });

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise
      await transactionService.execute(callback, options);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith(
        "SET statement_timeout = 5000",
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        "SET statement_timeout TO DEFAULT",
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to reset statement timeout",
        { error: resetError },
      );
    });

    it("should handle transaction errors and roll back", async () => {
      const error = new Error("Transaction error");
      const callback = vi.fn().mockRejectedValue(error);

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise & Verify
      await expect(transactionService.execute(callback)).rejects.toThrow(
        "Transaction error",
      );
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Transaction rolled back due to error",
        expect.any(Object),
      );
    });

    it("should handle rollback errors", async () => {
      const transactionError = new Error("Transaction error");
      const rollbackError = new Error("Rollback error");

      const callback = vi.fn().mockRejectedValue(transactionError);

      mockClient.query.mockImplementation(async (query: string) => {
        if (query === "ROLLBACK") {
          throw rollbackError;
        }
        return mockQueryResult;
      });

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise & Verify
      await expect(transactionService.execute(callback)).rejects.toThrow(
        "Transaction error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to rollback transaction",
        expect.any(Object),
      );
    });
  });

  describe("multiOperationTransaction", () => {
    it("should execute multiple operations within a transaction", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi.fn().mockResolvedValue("result2");

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise
      const results = await transactionService.multiOperationTransaction([
        operation1,
        operation2,
      ]);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(operation1).toHaveBeenCalledWith(mockClient);
      expect(operation2).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(results).toEqual(["result1", "result2"]);
    });

    it("should roll back if any operation fails", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const error = new Error("Operation error");
      const operation2 = vi.fn().mockRejectedValue(error);

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise & Verify
      await expect(
        transactionService.multiOperationTransaction([operation1, operation2]),
      ).rejects.toThrow("Operation error");

      expect(operation1).toHaveBeenCalledWith(mockClient);
      expect(operation2).toHaveBeenCalledWith(mockClient);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Operation failed within multi-operation transaction",
        expect.any(Object),
      );
    });
  });

  describe("readTransaction", () => {
    it("should execute a read-only transaction", async () => {
      const callback = vi.fn().mockResolvedValue("result");

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise
      await transactionService.readTransaction(callback);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith(
        "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",
      );
    });

    it("should support custom isolation levels for read transactions", async () => {
      const callback = vi.fn().mockResolvedValue("result");

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      // Exercise
      await transactionService.readTransaction(
        callback,
        IsolationLevel.SERIALIZABLE,
      );

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith(
        "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
      );
    });
  });

  describe("executeBatch", () => {
    it("should execute multiple queries in a transaction", async () => {
      const queries = [
        { text: "INSERT INTO users (name) VALUES ($1)", values: ["User 1"] },
        { text: "INSERT INTO users (name) VALUES ($1)", values: ["User 2"] },
      ];

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      const results = [
        { ...mockQueryResult, rowCount: 1 },
        { ...mockQueryResult, rowCount: 1 },
      ];

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult) // BEGIN
        .mockResolvedValueOnce(results[0])
        .mockResolvedValueOnce(results[1])
        .mockResolvedValueOnce(mockQueryResult); // COMMIT

      // Exercise
      const batchResults = await transactionService.executeBatch(queries);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith(
        queries[0].text,
        queries[0].values,
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        queries[1].text,
        queries[1].values,
      );
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(batchResults.length).toBe(2);
    });
  });

  describe("savepoint methods", () => {
    it("should create a savepoint", async () => {
      await transactionService.createSavepoint(mockClient, "test_savepoint");
      expect(mockClient.query).toHaveBeenCalledWith("SAVEPOINT test_savepoint");
    });

    it("should rollback to a savepoint", async () => {
      await transactionService.rollbackToSavepoint(
        mockClient,
        "test_savepoint",
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        "ROLLBACK TO SAVEPOINT test_savepoint",
      );
    });

    it("should release a savepoint", async () => {
      await transactionService.releaseSavepoint(mockClient, "test_savepoint");
      expect(mockClient.query).toHaveBeenCalledWith(
        "RELEASE SAVEPOINT test_savepoint",
      );
    });

    it("should handle savepoint creation errors", async () => {
      const error = new Error("Savepoint creation failed");
      mockClient.query.mockRejectedValueOnce(error);

      await expect(
        transactionService.createSavepoint(mockClient, "test_savepoint"),
      ).rejects.toThrow("Savepoint creation failed");
    });

    it("should handle rollback to savepoint errors", async () => {
      const error = new Error("Rollback to savepoint failed");
      mockClient.query.mockRejectedValueOnce(error);

      await expect(
        transactionService.rollbackToSavepoint(mockClient, "test_savepoint"),
      ).rejects.toThrow("Rollback to savepoint failed");
    });

    it("should handle savepoint release errors", async () => {
      const error = new Error("Savepoint release failed");
      mockClient.query.mockRejectedValueOnce(error);

      await expect(
        transactionService.releaseSavepoint(mockClient, "test_savepoint"),
      ).rejects.toThrow("Savepoint release failed");
    });
  });

  describe("withTransaction", () => {
    it("should delegate to the database service", async () => {
      const operation = vi.fn().mockResolvedValue("result");

      await transactionService.withTransaction(operation);

      expect(mockDatabaseService.withTransaction).toHaveBeenCalledWith(
        operation,
      );
    });

    it("should handle operation errors", async () => {
      const error = new Error("Operation failed");
      const operation = vi.fn().mockRejectedValue(error);

      await expect(
        transactionService.withTransaction(operation),
      ).rejects.toThrow("Operation failed");
    });

    it("should pass through the operation result", async () => {
      const expectedResult = { data: "test" };
      const operation = vi.fn().mockResolvedValue(expectedResult);

      const result = await transactionService.withTransaction(operation);

      expect(result).toEqual(expectedResult);
    });
  });

  describe("transaction with savepoints", () => {
    it("should handle transaction failure after savepoint creation", async () => {
      const error = new Error("Transaction failed");
      const callback = vi.fn().mockImplementation(async (client) => {
        await transactionService.createSavepoint(client, "test_savepoint");
        throw error;
      });

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      await expect(transactionService.execute(callback)).rejects.toThrow(
        "Transaction failed",
      );
      expect(mockClient.query).toHaveBeenCalledWith("SAVEPOINT test_savepoint");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });

    it("should handle transaction failure after savepoint rollback", async () => {
      const error = new Error("Transaction failed");
      const callback = vi.fn().mockImplementation(async (client) => {
        await transactionService.createSavepoint(client, "test_savepoint");
        await transactionService.rollbackToSavepoint(client, "test_savepoint");
        throw error;
      });

      mockDatabaseService.withTransaction.mockImplementation(
        async (cb: TransactionCallback) => {
          return await cb(mockClient);
        },
      );

      await expect(transactionService.execute(callback)).rejects.toThrow(
        "Transaction failed",
      );
      expect(mockClient.query).toHaveBeenCalledWith("SAVEPOINT test_savepoint");
      expect(mockClient.query).toHaveBeenCalledWith(
        "ROLLBACK TO SAVEPOINT test_savepoint",
      );
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });
  });
});
