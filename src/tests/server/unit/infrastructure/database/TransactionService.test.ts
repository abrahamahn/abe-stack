import { Container } from "inversify";
import { QueryResult } from "pg";

import { IDatabaseServer } from "@infrastructure/database";
import {
  TransactionService,
  TransactionOptions,
  IsolationLevel,
} from "@infrastructure/database/TransactionService";
import { TYPES } from "@infrastructure/di/types";
import { ILoggerService } from "@infrastructure/logging";

describe("TransactionService", () => {
  let container: Container;
  let transactionService: TransactionService;
  let mockLogger: jest.Mocked<ILoggerService>;
  let mockDatabaseService: jest.Mocked<IDatabaseServer>;
  let mockClient: any; // Using any type to avoid TypeScript errors
  let mockQueryResult: QueryResult;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

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
      query: jest.fn().mockResolvedValue(mockQueryResult),
      release: jest.fn(),
    };

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      }),
    } as unknown as jest.Mocked<ILoggerService>;

    // Setup mock database service
    mockDatabaseService = {
      withTransaction: jest.fn().mockImplementation((callback) => callback()),
      withClient: jest.fn(),
      query: jest.fn(),
      initialize: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      close: jest.fn(),
      getStats: jest.fn(),
      resetMetrics: jest.fn(),
      reset: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<IDatabaseServer>;

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
      // Setup
      const callback = jest.fn().mockResolvedValue("result");

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

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
      // Setup
      const callback = jest.fn().mockResolvedValue("result");
      const options: TransactionOptions = {
        isolation: IsolationLevel.SERIALIZABLE,
        readOnly: true,
      };

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

      // Exercise
      await transactionService.execute(callback, options);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith(
        "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
      );
    });

    it("should set statement timeout if provided", async () => {
      // Setup
      const callback = jest.fn().mockResolvedValue("result");
      const options: TransactionOptions = {
        timeout: 5000,
      };

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

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

    it("should handle transaction errors and roll back", async () => {
      // Setup
      const error = new Error("Transaction error");
      const callback = jest.fn().mockRejectedValue(error);

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

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
      // Setup
      const transactionError = new Error("Transaction error");
      const rollbackError = new Error("Rollback error");

      const callback = jest.fn().mockRejectedValue(transactionError);

      // Make rollback fail
      mockClient.query.mockImplementation(async (query: string) => {
        if (query === "ROLLBACK") {
          throw rollbackError;
        }
        return mockQueryResult;
      });

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

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
      // Setup
      const operation1 = jest.fn().mockResolvedValue("result1");
      const operation2 = jest.fn().mockResolvedValue("result2");

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

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
      // Setup
      const operation1 = jest.fn().mockResolvedValue("result1");
      const error = new Error("Operation error");
      const operation2 = jest.fn().mockRejectedValue(error);

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

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
      // Setup
      const callback = jest.fn().mockResolvedValue("result");

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

      // Exercise
      await transactionService.readTransaction(callback);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith(
        "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY",
      );
    });

    it("should support custom isolation levels for read transactions", async () => {
      // Setup
      const callback = jest.fn().mockResolvedValue("result");

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

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
      // Setup
      const queries = [
        { text: "INSERT INTO users (name) VALUES ($1)", values: ["User 1"] },
        { text: "INSERT INTO users (name) VALUES ($1)", values: ["User 2"] },
      ];

      // Configure withTransaction to call the callback with a client
      mockDatabaseService.withTransaction.mockImplementation(async (cb) => {
        return await cb(mockClient);
      });

      // Configure query results
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
  });

  describe("withTransaction", () => {
    it("should delegate to the database service", async () => {
      const operation = jest.fn().mockResolvedValue("result");

      await transactionService.withTransaction(operation);

      expect(mockDatabaseService.withTransaction).toHaveBeenCalledWith(
        operation,
      );
    });
  });
});
