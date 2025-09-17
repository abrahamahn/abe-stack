import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";

import { CacheService } from "@/server/infrastructure/cache/CacheService";
import { ICacheService } from "@/server/infrastructure/cache/ICacheService";
import { RedisCacheService } from "@/server/infrastructure/cache/RedisCacheService";
import * as redisClient from "@/server/infrastructure/cache/RedisClient";
import {
  initializeCache,
  shutdownCache,
} from "@/server/infrastructure/cache/startupHooks";
import { container } from "@/server/infrastructure/di";
import { TYPES } from "@/server/infrastructure/di/types";

// Mock the Redis client to avoid real Redis dependency
vi.mock("@/server/infrastructure/cache/RedisClient", () => {
  // Create an in-memory store to simulate Redis operations with TTL support
  const store = new Map<string, { value: string; expiry?: number }>();

  const mockRedisClient = {
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue("PONG"),
    get: vi.fn().mockImplementation((key: string) => {
      const entry = store.get(key);
      if (!entry) return null;

      // Check if expired
      if (entry.expiry && Date.now() > entry.expiry) {
        store.delete(key);
        return null;
      }

      return entry.value;
    }),
    set: vi
      .fn()
      .mockImplementation((key: string, value: string, options?: any) => {
        const entry: { value: string; expiry?: number } = { value };

        // Handle TTL
        if (options && options.EX) {
          entry.expiry = Date.now() + options.EX * 1000;
        }

        store.set(key, entry);
        return "OK";
      }),
    del: vi.fn().mockImplementation((key: string | string[]) => {
      if (Array.isArray(key)) {
        let deleted = 0;
        key.forEach((k) => {
          if (store.delete(k)) deleted++;
        });
        return deleted;
      } else {
        return store.delete(key) ? 1 : 0;
      }
    }),
    mGet: vi.fn().mockImplementation((keys: string[]) => {
      return keys.map((key) => {
        const entry = store.get(key);
        if (!entry) return null;

        // Check if expired
        if (entry.expiry && Date.now() > entry.expiry) {
          store.delete(key);
          return null;
        }

        return entry.value;
      });
    }),
    exists: vi.fn().mockImplementation((key: string) => {
      const entry = store.get(key);
      if (!entry) return 0;

      // Check if expired
      if (entry.expiry && Date.now() > entry.expiry) {
        store.delete(key);
        return 0;
      }

      return 1;
    }),
    keys: vi.fn().mockImplementation((pattern: string) => {
      const prefix = pattern.replace("*", "");
      const validKeys: string[] = [];

      for (const [key, entry] of store.entries()) {
        if (key.startsWith(prefix)) {
          // Check if expired
          if (entry.expiry && Date.now() > entry.expiry) {
            store.delete(key);
          } else {
            validKeys.push(key);
          }
        }
      }

      return validKeys;
    }),
    scan: vi
      .fn()
      .mockImplementation((cursor: string | number, options: any) => {
        // Simple implementation to return all keys with matching prefix
        const match = options.MATCH || "*";
        const prefix = match.endsWith("*") ? match.slice(0, -1) : match;
        const validKeys: string[] = [];

        for (const [key, entry] of store.entries()) {
          if (key.startsWith(prefix)) {
            // Check if expired
            if (entry.expiry && Date.now() > entry.expiry) {
              store.delete(key);
            } else {
              validKeys.push(key);
            }
          }
        }

        return { cursor: 0, keys: validKeys };
      }),
    multi: vi.fn().mockReturnValue({
      set: vi
        .fn()
        .mockImplementation((key: string, value: string, options?: any) => {
          const entry: { value: string; expiry?: number } = { value };

          // Handle TTL
          if (options && options.EX) {
            entry.expiry = Date.now() + options.EX * 1000;
          }

          store.set(key, entry);
          return mockRedisClient.multi();
        }),
      exec: vi.fn().mockImplementation(() => {
        return Promise.resolve([]);
      }),
    }),
  };

  return {
    getRedisClient: vi.fn().mockReturnValue(mockRedisClient),
    closeRedisConnection: vi.fn().mockResolvedValue(undefined),
    createRedisClient: vi.fn().mockReturnValue(mockRedisClient),
    DEFAULT_REDIS_OPTIONS: {
      host: "localhost",
      port: 6379,
      db: 0,
      connectTimeout: 10000,
      tls: false,
      keyPrefix: "",
    },
  };
});

// Mock inversify container
vi.mock("@/server/infrastructure/di", () => {
  let serviceInstance: ICacheService | null = null;

  const mockContainer = {
    get: vi.fn((type: symbol) => {
      if (type === (TYPES as any).CacheService) {
        return serviceInstance;
      }
      return null;
    }),
    bind: vi.fn().mockReturnValue({
      to: vi.fn().mockReturnValue({
        inSingletonScope: vi.fn(),
      }),
    }),
    setupCacheInstance: (instance: ICacheService) => {
      serviceInstance = instance;
    },
  };

  return {
    container: mockContainer,
  };
});

// Mock TYPES
vi.mock("@/server/infrastructure/di/types", () => ({
  TYPES: {
    CacheService: Symbol.for("CacheService"),
    LoggerService: Symbol.for("LoggerService"),
    ConfigService: Symbol.for("ConfigService"),
  },
}));

// Mock the inversify decorators
vi.mock("inversify", () => ({
  injectable: () => vi.fn(),
  inject: () => vi.fn(),
  optional: () => vi.fn(),
}));

describe("Cache Infrastructure Integration", () => {
  let mockLogger: any;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      createLogger: vi.fn(),
      withContext: vi.fn().mockReturnThis(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn(),
      shutdown: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("In-Memory Cache Implementation", () => {
    let cacheService: CacheService;

    beforeEach(async () => {
      // Create real cache service instance with mock logger
      cacheService = new CacheService(mockLogger);
      await cacheService.initialize();
    });

    afterEach(async () => {
      // Clean up after each test
      await cacheService.flush();
      await cacheService.shutdown();
    });

    runCacheTests(() => cacheService);

    it("should handle background cleanup correctly", async () => {
      // Set items with short TTL
      await cacheService.set("expire-soon-1", "value1", 0.1); // 100ms TTL
      await cacheService.set("expire-soon-2", "value2", 0.1); // 100ms TTL
      await cacheService.set("stay-longer", "persist", 10); // 10s TTL

      // Wait for short TTL items to expire
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Force cleanup by getting all keys
      const keys = cacheService.keys();

      // Verify cleanup happened
      expect(keys).not.toContain("expire-soon-1");
      expect(keys).not.toContain("expire-soon-2");
      expect(keys).toContain("stay-longer");
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Removed")
      );
    });
  });

  describe("Redis Cache Implementation", () => {
    let redisCacheService: RedisCacheService;

    beforeEach(async () => {
      // Create Redis cache service instance with mock logger
      redisCacheService = new RedisCacheService(mockLogger);
      await redisCacheService.initialize();
    });

    afterEach(async () => {
      // Clean up after each test - only flush if initialized
      if (redisCacheService && (redisCacheService as any).initialized) {
        await redisCacheService.flush();
      }
      await redisCacheService.shutdown();
    });

    runCacheTests(() => redisCacheService);

    it("should add prefix to all Redis keys", async () => {
      // Get the mock client directly from the mocked module
      const mockClient = await redisClient.getRedisClient();

      await redisCacheService.set("test-key", "test-value");

      // Check if prefix was added to the key
      expect(mockClient.set).toHaveBeenCalledWith(
        "cache:test-key",
        '"test-value"'
      );
    });

    it("should handle Redis errors gracefully", async () => {
      // Get the mock client directly from the mocked module
      const mockClient = await redisClient.getRedisClient();

      // Mock a Redis error - use vi.mocked to properly type the mock
      vi.mocked(mockClient.get).mockRejectedValueOnce(
        new Error("Redis connection error")
      );

      // Operation should not throw but return null
      const result = await redisCacheService.get("some-key");
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error getting cache key"),
        expect.any(Object)
      );
    });
  });

  describe("Startup Hooks", () => {
    let cacheService: CacheService;

    beforeAll(() => {
      cacheService = new CacheService(mockLogger);
      (container as any).setupCacheInstance(cacheService);
    });

    afterAll(async () => {
      await cacheService.shutdown();
    });

    it("should initialize cache through startup hook", async () => {
      const initSpy = vi.spyOn(cacheService, "initialize");

      await initializeCache();

      expect(container.get).toHaveBeenCalledWith(TYPES.CacheService);
      expect(initSpy).toHaveBeenCalled();
    });

    it("should shutdown cache through shutdown hook", async () => {
      const shutdownSpy = vi.spyOn(cacheService, "shutdown");

      await shutdownCache();

      expect(container.get).toHaveBeenCalledWith(TYPES.CacheService);
      expect(shutdownSpy).toHaveBeenCalled();
    });

    it("should handle startup hook errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const initSpy = vi
        .spyOn(cacheService, "initialize")
        .mockRejectedValueOnce(new Error("Init failed"));

      await expect(initializeCache()).rejects.toThrow("Init failed");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to initialize cache service"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should handle shutdown hook errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const shutdownSpy = vi
        .spyOn(cacheService, "shutdown")
        .mockRejectedValueOnce(new Error("Shutdown failed"));

      await expect(shutdownCache()).rejects.toThrow("Shutdown failed");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to shutdown cache service"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});

/**
 * Reusable test suite that runs against any ICacheService implementation
 */
function runCacheTests(getCacheService: () => ICacheService) {
  describe("Lifecycle Methods", () => {
    it("should initialize and shutdown properly", async () => {
      const cacheService = getCacheService();

      // Initialize first
      await cacheService.initialize();

      // We can't easily verify log messages in a generic way
      // Instead, let's just verify we can call these methods without errors
      await cacheService.shutdown();
      await cacheService.initialize();
      await cacheService.shutdown();
    });
  });

  describe("Basic Cache Operations", () => {
    const testKey = "test-key";
    const testValue = { name: "Test", value: 42 };

    it("should set and get a value", async () => {
      const cacheService = getCacheService();
      await cacheService.set(testKey, testValue);
      const result = await cacheService.get(testKey);
      expect(result).toEqual(testValue);
    });

    it("should handle TTL correctly", async () => {
      const cacheService = getCacheService();
      await cacheService.set(testKey, testValue, 0.1); // 100ms TTL
      let result = await cacheService.get(testKey);
      expect(result).toEqual(testValue);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 200));
      result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });

    it("should delete a value", async () => {
      const cacheService = getCacheService();
      await cacheService.set(testKey, testValue);
      await cacheService.delete(testKey);
      const result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });

    it("should check if key exists", async () => {
      const cacheService = getCacheService();
      await cacheService.set(testKey, testValue);
      expect(await cacheService.has(testKey)).toBe(true);

      await cacheService.delete(testKey);
      expect(await cacheService.has(testKey)).toBe(false);
    });
  });

  describe("Bulk Operations", () => {
    const testEntries = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };

    it("should set multiple values", async () => {
      const cacheService = getCacheService();
      await cacheService.setMultiple(testEntries);

      for (const [key, value] of Object.entries(testEntries)) {
        const result = await cacheService.get(key);
        expect(result).toBe(value);
      }
    });

    it("should get multiple values", async () => {
      const cacheService = getCacheService();
      await cacheService.setMultiple(testEntries);

      const results = await cacheService.getMultiple(Object.keys(testEntries));
      expect(results).toEqual(testEntries);
    });

    it("should delete multiple values", async () => {
      const cacheService = getCacheService();
      await cacheService.setMultiple(testEntries);
      await cacheService.deleteMultiple(Object.keys(testEntries));

      for (const key of Object.keys(testEntries)) {
        expect(await cacheService.has(key)).toBe(false);
      }
    });

    it("should set multiple values with TTL", async () => {
      const cacheService = getCacheService();
      await cacheService.setMultiple(testEntries, 0.1); // 100ms TTL

      // Verify values exist
      let results = await cacheService.getMultiple(Object.keys(testEntries));
      expect(Object.keys(results).length).toBe(3);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify all values expired
      results = await cacheService.getMultiple(Object.keys(testEntries));
      expect(Object.keys(results).length).toBe(0);
    });
  });

  describe("Memoization", () => {
    it("should memoize function results", async () => {
      const cacheService = getCacheService();
      const fn = vi.fn().mockImplementation(async (x: number) => x * 2);
      const memoized = cacheService.memoize(fn);

      // First call should execute function
      const result1 = await memoized(5);
      expect(result1).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await memoized(5);
      expect(result2).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should respect TTL in memoization", async () => {
      const cacheService = getCacheService();
      const fn = vi.fn().mockImplementation(async (x: number) => x * 2);
      const memoized = cacheService.memoize(fn, { ttl: 0.1 }); // 100ms TTL

      await memoized(5);
      expect(fn).toHaveBeenCalledTimes(1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 200));

      await memoized(5);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should use custom key function", async () => {
      const cacheService = getCacheService();
      const fn = vi
        .fn()
        .mockImplementation(async (x: number, y: number) => x + y);
      const keyFn = (...args: unknown[]) => `sum:${args[0]}:${args[1]}`;

      const memoized = cacheService.memoize(fn, { keyFn });

      await memoized(2, 3);
      expect(fn).toHaveBeenCalledTimes(1);

      // Call with same values
      await memoized(2, 3);
      expect(fn).toHaveBeenCalledTimes(1);

      // Call with different values
      await memoized(3, 4);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("Cache Management", () => {
    it("should clear all cache entries", async () => {
      const cacheService = getCacheService();

      // Add some entries
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");

      // Clear the cache
      await cacheService.clear();

      // Verify all entries are gone
      expect(await cacheService.get("key1")).toBeNull();
      expect(await cacheService.get("key2")).toBeNull();
    });

    it("should flush all cache entries (alias for clear)", async () => {
      const cacheService = getCacheService();

      // Add some entries
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");

      // Flush the cache
      await cacheService.flush();

      // Verify all entries are gone
      expect(await cacheService.get("key1")).toBeNull();
      expect(await cacheService.get("key2")).toBeNull();
    });

    it("should handle invalid cache keys", async () => {
      const cacheService = getCacheService();

      await expect(cacheService.set("", "value")).rejects.toThrow();
      await expect(cacheService.set("null", null as any)).resolves.toBeTruthy();
      await expect(
        cacheService.set("undefined", undefined as any)
      ).resolves.toBeTruthy();
    });

    it("should handle invalid TTL values", async () => {
      const cacheService = getCacheService();

      await expect(cacheService.set("key", "value", -1)).rejects.toThrow();
      await expect(cacheService.set("key", "value", NaN)).rejects.toThrow();
      await expect(
        cacheService.set("key", "value", Infinity)
      ).rejects.toThrow();
    });
  });

  describe("Statistics", () => {
    it("should track hits and misses", async () => {
      const cacheService = getCacheService();

      // First access should be a miss
      await cacheService.get("missing-key");

      // Set a value and access it (hit)
      await cacheService.set("test-key", "test-value");
      await cacheService.get("test-key");

      // Get stats
      const stats = cacheService.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });

    it("should reset statistics", async () => {
      const cacheService = getCacheService();

      // Generate some activity
      await cacheService.set("key", "value");
      await cacheService.get("key");
      await cacheService.get("missing");

      // Reset stats
      if ("resetStats" in cacheService) {
        (cacheService as any).resetStats();
      }

      // Verify reset
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
}
