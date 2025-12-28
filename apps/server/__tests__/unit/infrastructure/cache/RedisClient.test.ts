import { RedisClientType } from "redis";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  getRedisClient,
  closeRedisConnection,
  createRedisClient,
} from "@/server/infrastructure/cache/RedisClient";

// Mock the redis module
vi.mock("redis", () => {
  // Create mock functions that can be spied on
  const mockConnect = vi.fn().mockImplementation(async () => {
    return undefined;
  });
  const mockOn = vi.fn();
  const mockPing = vi.fn().mockResolvedValue("PONG");
  const mockQuit = vi.fn().mockImplementation(async () => {
    return undefined;
  });
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockDel = vi.fn();
  const mockMGet = vi.fn();
  const mockKeys = vi.fn().mockResolvedValue([]);
  const mockExists = vi.fn().mockResolvedValue(0);

  const mockClient = {
    connect: mockConnect,
    on: mockOn,
    ping: mockPing,
    quit: mockQuit,
    get: mockGet,
    set: mockSet,
    del: mockDel,
    mGet: mockMGet,
    multi: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
    keys: mockKeys,
    exists: mockExists,
  };

  return {
    createClient: vi.fn().mockReturnValue(mockClient),
    __mockClient: mockClient, // Export for testing
  };
});

// Get the mocked functions for testing
const { createClient } = await import("redis");
const mockCreateClient = createClient as any;
const mockClient = (createClient as any).__mockClient;

describe("RedisClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.quit.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Clean up any existing client after each test
    try {
      await closeRedisConnection();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("getRedisClient", () => {
    it("should create a new client if one doesn't exist", async () => {
      const client = await getRedisClient();
      expect(client).toBeDefined();
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("should reuse existing client on subsequent calls", async () => {
      const client1 = await getRedisClient();
      const client2 = await getRedisClient();
      expect(client1).toBe(client2);
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it("should handle connection errors", async () => {
      const error = new Error("Connection failed");
      mockClient.connect.mockRejectedValueOnce(error);
      await expect(getRedisClient()).rejects.toThrow("Connection failed");
    });
  });

  describe("closeRedisConnection", () => {
    it("should close the Redis connection", async () => {
      await getRedisClient();
      await closeRedisConnection();
      expect(mockClient.quit).toHaveBeenCalled();
    });

    it("should handle errors when closing connection", async () => {
      await getRedisClient(); // Ensure we have a client to close
      const error = new Error("Failed to close");
      mockClient.quit.mockRejectedValueOnce(error);
      await expect(closeRedisConnection()).rejects.toThrow("Failed to close");
    });
  });

  describe("createRedisClient", () => {
    it("should create a new client with default options", async () => {
      const client = await createRedisClient();
      expect(client).toBeDefined();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it("should create a new client with custom options", async () => {
      const options = {
        host: "custom",
        port: 6379,
        password: "custom-password",
      };
      const client = await createRedisClient(options);
      expect(client).toBeDefined();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it("should handle connection errors", async () => {
      const error = new Error("Connection failed");
      mockClient.connect.mockRejectedValueOnce(error);
      await expect(createRedisClient()).rejects.toThrow("Connection failed");
    });
  });
});
