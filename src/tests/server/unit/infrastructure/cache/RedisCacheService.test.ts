import { Container } from "inversify";
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";

import { RedisCacheService } from "@/server/infrastructure/cache/RedisCacheService";
import * as redisClient from "@/server/infrastructure/cache/RedisClient";
import { CacheError } from "@/server/infrastructure/errors";
import { ILoggerService } from "@/server/infrastructure/logging";

const TYPES = (global as any).__TEST_TYPES__;

// Mock the Redis client
vi.mock("@/server/infrastructure/cache/RedisClient", () => {
  return {
    getRedisClient: vi.fn(),
    closeRedisConnection: vi.fn(),
  };
});

describe("RedisCacheService", () => {
  let container: Container;
  let redisCacheService: RedisCacheService;
  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    debugObj: ReturnType<typeof vi.fn>;
    infoObj: ReturnType<typeof vi.fn>;
    warnObj: ReturnType<typeof vi.fn>;
    errorObj: ReturnType<typeof vi.fn>;
    createLogger: ReturnType<typeof vi.fn>;
    withContext: ReturnType<typeof vi.fn>;
    addTransport: ReturnType<typeof vi.fn>;
    setTransports: ReturnType<typeof vi.fn>;
    setMinLevel: ReturnType<typeof vi.fn>;
    initialize: ReturnType<typeof vi.fn>;
    shutdown: ReturnType<typeof vi.fn>;
  };
  let mockRedisClient: {
    on: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    mGet: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    scan: ReturnType<typeof vi.fn>;
    multi: ReturnType<typeof vi.fn>;
    flushAll: ReturnType<typeof vi.fn>;
  };
  let mockMulti: {
    set: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    container = new Container();

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      createLogger: vi.fn(),
      withContext: vi.fn(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn(),
      shutdown: vi.fn(),
    };

    // Create mock multi object for Redis transaction
    mockMulti = {
      set: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };

    // Create mock Redis client
    mockRedisClient = {
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      ping: vi.fn().mockResolvedValue("PONG"),
      get: vi.fn(),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      mGet: vi.fn(),
      exists: vi.fn(),
      keys: vi.fn().mockResolvedValue([]),
      scan: vi.fn().mockResolvedValue({ cursor: 0, keys: [] }),
      multi: vi.fn().mockReturnValue(mockMulti),
      flushAll: vi.fn(),
    };

    // Setup mocks
    vi.mocked(redisClient.getRedisClient).mockReturnValue(mockRedisClient);
    vi.mocked(redisClient.closeRedisConnection).mockResolvedValue();

    // Setup container
    container
      .bind<ILoggerService>(TYPES.LoggerService)
      .toConstantValue(mockLogger as unknown as ILoggerService);

    // Create the service instance
    redisCacheService = new RedisCacheService(
      mockLogger as unknown as ILoggerService
    );
  });

  afterEach(async () => {
    await redisCacheService.shutdown();
    container.unbindAll();
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    it("should initialize the Redis cache service", async () => {
      await redisCacheService.initialize();

      expect(redisClient.getRedisClient).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Redis cache service initialized"
      );
    });

    it("should handle initialization errors", async () => {
      // Setup getRedisClient to throw an error
      vi.mocked(redisClient.getRedisClient).mockImplementationOnce(() => {
        throw new Error("Connection failed");
      });

      await expect(redisCacheService.initialize()).rejects.toThrow(
        "Connection failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to initialize Redis cache service",
        { error: expect.any(Error) }
      );
    });
  });

  describe("shutdown", () => {
    it("should close the Redis connection on shutdown", async () => {
      // First initialize
      await redisCacheService.initialize();

      // Then shutdown
      await redisCacheService.shutdown();

      expect(redisClient.closeRedisConnection).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Redis cache service shut down"
      );
    });

    it("should do nothing if not initialized", async () => {
      // Shutdown without initialization
      await redisCacheService.shutdown();

      expect(redisClient.closeRedisConnection).not.toHaveBeenCalled();
    });
  });

  describe("basic operations", () => {
    beforeEach(async () => {
      await redisCacheService.initialize();
    });

    describe("get", () => {
      it("should get a value from Redis", async () => {
        const mockData = JSON.stringify({ test: "data" });
        mockRedisClient.get.mockResolvedValueOnce(mockData);

        const result = await redisCacheService.get("test-key");

        expect(mockRedisClient.get).toHaveBeenCalledWith("cache:test-key");
        expect(result).toEqual({ test: "data" });
      });

      it("should return null for non-existent key", async () => {
        mockRedisClient.get.mockResolvedValueOnce(null);

        const result = await redisCacheService.get("non-existent");

        expect(result).toBeNull();
      });

      it("should handle Redis errors", async () => {
        mockRedisClient.get.mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCacheService.get("test-key");

        expect(result).toBeNull();
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Error getting cache key test-key:",
          { error: expect.any(Error) }
        );
      });
    });

    describe("set", () => {
      it("should set a value in Redis", async () => {
        const result = await redisCacheService.set("test-key", {
          test: "data",
        });

        expect(mockRedisClient.set).toHaveBeenCalledWith(
          "cache:test-key",
          JSON.stringify({ test: "data" })
        );
        expect(result).toBe(true);
      });

      it("should set a value with TTL", async () => {
        const result = await redisCacheService.set("test-key", "value", 60);

        expect(mockRedisClient.set).toHaveBeenCalledWith(
          "cache:test-key",
          JSON.stringify("value"),
          { EX: 60 }
        );
        expect(result).toBe(true);
      });

      it("should validate the key", async () => {
        await expect(redisCacheService.set("", "value")).rejects.toThrow(
          "Cache key cannot be null, undefined, or an empty string"
        );
      });

      it("should validate TTL", async () => {
        await expect(
          redisCacheService.set("test", "value", -1)
        ).rejects.toThrow(
          "Invalid TTL value: -1. TTL must be a positive finite number."
        );
      });

      it("should handle Redis errors", async () => {
        mockRedisClient.set.mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCacheService.set("test-key", "value");

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Error setting cache key test-key:",
          { error: expect.any(Error) }
        );
      });
    });

    describe("delete", () => {
      it("should delete a value from Redis", async () => {
        mockRedisClient.del.mockResolvedValueOnce(1);

        const result = await redisCacheService.delete("test-key");

        expect(mockRedisClient.del).toHaveBeenCalledWith("cache:test-key");
        expect(result).toBe(true);
      });

      it("should return false when key doesn't exist", async () => {
        mockRedisClient.del.mockResolvedValueOnce(0);

        const result = await redisCacheService.delete("non-existent");

        expect(result).toBe(false);
      });

      it("should handle Redis errors", async () => {
        mockRedisClient.del.mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCacheService.delete("test-key");

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Error deleting cache key test-key:",
          { error: expect.any(Error) }
        );
      });
    });
  });

  describe("batch operations", () => {
    beforeEach(async () => {
      await redisCacheService.initialize();
    });

    describe("getMultiple", () => {
      it("should get multiple values from Redis", async () => {
        mockRedisClient.mGet.mockResolvedValueOnce([
          JSON.stringify("value1"),
          JSON.stringify("value2"),
          null,
        ]);

        const result = await redisCacheService.getMultiple([
          "key1",
          "key2",
          "key3",
        ]);

        expect(mockRedisClient.mGet).toHaveBeenCalledWith([
          "cache:key1",
          "cache:key2",
          "cache:key3",
        ]);
        expect(result).toEqual({
          key1: "value1",
          key2: "value2",
        });
      });

      it("should return empty object for no keys", async () => {
        const result = await redisCacheService.getMultiple([]);

        expect(result).toEqual({});
        expect(mockRedisClient.mGet).not.toHaveBeenCalled();
      });

      it("should handle Redis errors", async () => {
        mockRedisClient.mGet.mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCacheService.getMultiple(["key1", "key2"]);

        expect(result).toEqual({});
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Error getting multiple cache keys:",
          { error: expect.any(Error) }
        );
      });
    });

    describe("setMultiple", () => {
      it("should set multiple values in Redis", async () => {
        const entries = {
          key1: "value1",
          key2: "value2",
        };

        const result = await redisCacheService.setMultiple(entries);

        expect(mockRedisClient.multi).toHaveBeenCalled();
        expect(mockMulti.set).toHaveBeenCalledTimes(2);
        expect(mockMulti.set).toHaveBeenCalledWith(
          "cache:key1",
          JSON.stringify("value1")
        );
        expect(mockMulti.set).toHaveBeenCalledWith(
          "cache:key2",
          JSON.stringify("value2")
        );
        expect(mockMulti.exec).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it("should set multiple values with TTL", async () => {
        const entries = {
          key1: "value1",
          key2: "value2",
        };

        const result = await redisCacheService.setMultiple(entries, 60);

        expect(mockMulti.set).toHaveBeenCalledWith(
          "cache:key1",
          JSON.stringify("value1"),
          { EX: 60 }
        );
        expect(mockMulti.set).toHaveBeenCalledWith(
          "cache:key2",
          JSON.stringify("value2"),
          { EX: 60 }
        );
        expect(result).toBe(true);
      });

      it("should return true for empty entries", async () => {
        const result = await redisCacheService.setMultiple({});

        expect(result).toBe(true);
        expect(mockRedisClient.multi).not.toHaveBeenCalled();
      });

      it("should validate keys", async () => {
        await expect(
          redisCacheService.setMultiple({ "": "value" })
        ).rejects.toThrow(
          "Cache key cannot be null, undefined, or an empty string"
        );
      });

      it("should handle Redis errors", async () => {
        mockMulti.exec.mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCacheService.setMultiple({ key: "value" });

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Error setting multiple cache keys:",
          { error: expect.any(Error) }
        );
      });
    });

    describe("deleteMultiple", () => {
      it("should delete multiple values from Redis", async () => {
        mockRedisClient.del.mockResolvedValueOnce(2);

        const result = await redisCacheService.deleteMultiple(["key1", "key2"]);

        expect(mockRedisClient.del).toHaveBeenCalledWith([
          "cache:key1",
          "cache:key2",
        ]);
        expect(result).toBe(true);
      });

      it("should return true for empty keys array", async () => {
        const result = await redisCacheService.deleteMultiple([]);

        expect(result).toBe(true);
        expect(mockRedisClient.del).not.toHaveBeenCalled();
      });

      it("should handle Redis errors", async () => {
        mockRedisClient.del.mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCacheService.deleteMultiple(["key1", "key2"]);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Error deleting multiple cache keys:",
          { error: expect.any(Error) }
        );
      });
    });
  });

  describe("utility operations", () => {
    beforeEach(async () => {
      await redisCacheService.initialize();
    });

    describe("flush", () => {
      it("should clear all keys with prefix", async () => {
        // Setup mock keys to return keys with prefix
        mockRedisClient.keys.mockResolvedValueOnce([
          "cache:key1",
          "cache:key2",
          "cache:key3",
        ]);

        mockRedisClient.del.mockResolvedValueOnce(3);

        const result = await redisCacheService.flush();

        expect(mockRedisClient.keys).toHaveBeenCalledWith("cache:*");
        expect(mockRedisClient.del).toHaveBeenCalledWith([
          "cache:key1",
          "cache:key2",
          "cache:key3",
        ]);
        expect(result).toBe(true);
      });

      it("should handle Redis errors", async () => {
        mockRedisClient.keys.mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCacheService.flush();

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith("Error flushing cache:", {
          error: expect.any(Error),
        });
      });
    });

    describe("clear", () => {
      it("should be an alias for flush", async () => {
        const flushSpy = vi
          .spyOn(redisCacheService, "flush")
          .mockResolvedValue(true);

        const result = await redisCacheService.clear();

        expect(flushSpy).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });

    describe("has", () => {
      it("should check if key exists in Redis", async () => {
        mockRedisClient.exists.mockResolvedValueOnce(1);

        const result = await redisCacheService.has("test-key");

        expect(mockRedisClient.exists).toHaveBeenCalledWith("cache:test-key");
        expect(result).toBe(true);
      });

      it("should return false for non-existent key", async () => {
        mockRedisClient.exists.mockResolvedValueOnce(0);

        const result = await redisCacheService.has("non-existent");

        expect(result).toBe(false);
      });

      it("should handle Redis errors", async () => {
        mockRedisClient.exists.mockRejectedValueOnce(new Error("Redis error"));

        const result = await redisCacheService.has("test-key");

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Error checking cache key test-key:",
          { error: expect.any(Error) }
        );
      });
    });

    describe("keys", () => {
      it("should return an empty array and log warning", () => {
        const result = redisCacheService.keys();

        expect(result).toEqual([]);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          "keys() method is not supported in Redis cache service. Use scan() instead."
        );
      });
    });

    describe("getStats", () => {
      it("should return cache statistics", () => {
        // Set some stats values
        (redisCacheService as any).stats = {
          hits: 5,
          misses: 2,
          size: 10,
        };

        const stats = redisCacheService.getStats();

        expect(stats).toEqual({
          hits: 5,
          misses: 2,
          size: 10,
        });
      });
    });
  });

  describe("memoize", () => {
    beforeEach(async () => {
      await redisCacheService.initialize();
    });

    it("should cache function results", async () => {
      const fn = vi.fn().mockImplementation(async (x: number) => x * 2);

      // Setup Redis get to return null first (cache miss), then return cached value
      mockRedisClient.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(10));

      const memoized = redisCacheService.memoize(fn);

      // First call - should execute function
      const result1 = await memoized(5);
      expect(result1).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await memoized(5);
      expect(result2).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should use custom key function", async () => {
      const fn = vi
        .fn()
        .mockImplementation(async (obj: Record<string, any>) => obj.id);
      mockRedisClient.get.mockResolvedValueOnce(null);

      const memoized = redisCacheService.memoize(fn, {
        keyFn: (obj) => `custom:${(obj as Record<string, any>).id}`,
      });

      await memoized({ id: 123, name: "test" });

      // Check that the set was called with the correct key
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "cache:custom:123",
        "123"
      );
    });

    it("should support TTL function", async () => {
      const fn = vi.fn().mockImplementation(async (x: number) => x);
      const ttlFn = vi.fn().mockReturnValue(60);
      mockRedisClient.get.mockResolvedValueOnce(null);

      const memoized = redisCacheService.memoize(fn, { ttl: ttlFn });

      await memoized(5);

      // Verify TTL function was called with result and execution time
      expect(ttlFn).toHaveBeenCalledWith(5, expect.any(Number));

      // Verify set was called with TTL
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { EX: 60 }
      );
    });
  });

  describe("error handling", () => {
    it("should throw if methods are called before initialization", async () => {
      // Don't initialize
      await expect(redisCacheService.get("test")).rejects.toThrow(
        "Redis cache service not initialized"
      );
    });
  });
});
