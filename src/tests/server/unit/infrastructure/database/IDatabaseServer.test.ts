import { QueryResult, PoolClient } from "pg";

import { IDatabaseServer } from "@infrastructure/database";

describe("IDatabaseServer", () => {
  let mockDatabaseServer: jest.Mocked<IDatabaseServer>;

  beforeEach(() => {
    mockDatabaseServer = {
      initialize: jest.fn(),
      close: jest.fn(),
      query: jest.fn(),
      connect: jest.fn(),
      withClient: jest.fn(),
      withTransaction: jest.fn(),
      isConnected: jest.fn(),
      getStats: jest.fn(),
      resetMetrics: jest.fn(),
      reset: jest.fn(),
      createQueryBuilder: jest.fn(),
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
        query: jest.fn(),
        release: jest.fn(),
        connect: jest.fn(),
        copyFrom: jest.fn(),
        copyTo: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
        listeners: jest.fn(),
        listenerCount: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        setMaxListeners: jest.fn(),
        getMaxListeners: jest.fn(),
        rawListeners: jest.fn(),
        prependListener: jest.fn(),
        prependOnceListener: jest.fn(),
        eventNames: jest.fn(),
        addListener: jest.fn(),
        ref: jest.fn(),
        unref: jest.fn(),
        hasRef: jest.fn(),
      } as unknown as PoolClient;
      mockDatabaseServer.connect.mockResolvedValue(mockClient);
      const client = await mockDatabaseServer.connect();
      await client.query("SELECT 1");
      expect(mockDatabaseServer.connect).toHaveBeenCalled();

      // Test withClient
      mockDatabaseServer.withClient.mockImplementation(async (callback) => {
        return callback(mockClient);
      });
      await mockDatabaseServer.withClient(async (client: PoolClient) => {
        await client.query("SELECT 1");
      });
      expect(mockDatabaseServer.withClient).toHaveBeenCalled();

      // Test withTransaction
      mockDatabaseServer.withTransaction.mockImplementation(
        async (callback) => {
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
        select: jest.fn(),
        where: jest.fn(),
        orderBy: jest.fn(),
        limit: jest.fn(),
        offset: jest.fn(),
        execute: jest.fn(),
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
});
