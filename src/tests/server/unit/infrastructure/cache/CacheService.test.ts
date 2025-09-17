import { Container } from "inversify";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { CacheService } from "@/server/infrastructure/cache/CacheService";
import { ILoggerService } from "@/server/infrastructure/logging";

const TYPES = (global as any).__TEST_TYPES__;

describe("CacheService", () => {
  let container: Container;
  let cacheService: CacheService;
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

  beforeEach(() => {
    container = new Container();
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
    container
      .bind<ILoggerService>(TYPES.LoggerService)
      .toConstantValue(mockLogger as unknown as ILoggerService);
    cacheService = new CacheService(mockLogger as unknown as ILoggerService);
  });

  afterEach(async () => {
    await cacheService.shutdown();
    container.unbindAll();
  });

  describe("initialize", () => {
    it("should initialize the cache service", async () => {
      await cacheService.initialize();
      expect(mockLogger.info).toHaveBeenCalledWith("Cache service initialized");
    });
  });

  describe("shutdown", () => {
    it("should clear the cache and log shutdown message", async () => {
      await cacheService.set("test", "value");
      await cacheService.shutdown();
      expect(mockLogger.info).toHaveBeenCalledWith("Cache service shut down");
      expect(await cacheService.get("test")).toBeNull();
    });
  });

  describe("get", () => {
    it("should return null for non-existent key", async () => {
      const result = await cacheService.get("non-existent");
      expect(result).toBeNull();
    });

    it("should return cached value for existing key", async () => {
      await cacheService.set("test", "value");
      const result = await cacheService.get("test");
      expect(result).toBe("value");
    });

    it("should return null for expired key", async () => {
      await cacheService.set("test", "value", 1); // 1 second TTL
      await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait for expiration
      const result = await cacheService.get("test");
      expect(result).toBeNull();
    });

    it("should handle different value types", async () => {
      const testData = {
        string: "test",
        number: 42,
        boolean: true,
        object: { key: "value" },
        array: [1, 2, 3],
      };

      for (const [key, value] of Object.entries(testData)) {
        await cacheService.set(key, value);
        const result = await cacheService.get(key);
        expect(result).toEqual(value);
      }
    });
  });

  describe("set", () => {
    it("should store value without TTL", async () => {
      const result = await cacheService.set("test", "value");
      expect(result).toBe(true);
      expect(await cacheService.get("test")).toBe("value");
    });

    it("should store value with TTL", async () => {
      await cacheService.set("test", "value", 1);
      expect(await cacheService.get("test")).toBe("value");
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(await cacheService.get("test")).toBeNull();
    });

    it("should update existing value", async () => {
      await cacheService.set("test", "old");
      await cacheService.set("test", "new");
      expect(await cacheService.get("test")).toBe("new");
    });
  });

  describe("delete", () => {
    it("should delete existing key", async () => {
      await cacheService.set("test", "value");
      const result = await cacheService.delete("test");
      expect(result).toBe(true);
      expect(await cacheService.get("test")).toBeNull();
    });

    it("should return false for non-existent key", async () => {
      const result = await cacheService.delete("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("getMultiple", () => {
    it("should return empty object for no keys", async () => {
      const result = await cacheService.getMultiple([]);
      expect(result).toEqual({});
    });

    it("should return multiple values", async () => {
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");
      const result = await cacheService.getMultiple(["key1", "key2"]);
      expect(result).toEqual({
        key1: "value1",
        key2: "value2",
      });
    });

    it("should skip non-existent keys", async () => {
      await cacheService.set("key1", "value1");
      const result = await cacheService.getMultiple(["key1", "non-existent"]);
      expect(result).toEqual({
        key1: "value1",
      });
    });
  });

  describe("setMultiple", () => {
    it("should set multiple values", async () => {
      const entries = {
        key1: "value1",
        key2: "value2",
      };
      const result = await cacheService.setMultiple(entries);
      expect(result).toBe(true);
      expect(await cacheService.get("key1")).toBe("value1");
      expect(await cacheService.get("key2")).toBe("value2");
    });

    it("should set multiple values with TTL", async () => {
      const entries = {
        key1: "value1",
        key2: "value2",
      };
      await cacheService.setMultiple(entries, 1);
      expect(await cacheService.get("key1")).toBe("value1");
      expect(await cacheService.get("key2")).toBe("value2");
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(await cacheService.get("key1")).toBeNull();
      expect(await cacheService.get("key2")).toBeNull();
    });
  });

  describe("deleteMultiple", () => {
    it("should delete multiple keys", async () => {
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");
      const result = await cacheService.deleteMultiple(["key1", "key2"]);
      expect(result).toBe(true);
      expect(await cacheService.get("key1")).toBeNull();
      expect(await cacheService.get("key2")).toBeNull();
    });

    it("should handle non-existent keys", async () => {
      await cacheService.set("key1", "value1");
      const result = await cacheService.deleteMultiple([
        "key1",
        "non-existent",
      ]);
      expect(result).toBe(true);
      expect(await cacheService.get("key1")).toBeNull();
    });
  });

  describe("flush", () => {
    it("should clear all cache entries", async () => {
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");
      const result = await cacheService.flush();
      expect(result).toBe(true);
      expect(await cacheService.get("key1")).toBeNull();
      expect(await cacheService.get("key2")).toBeNull();
    });
  });

  describe("has", () => {
    it("should return true for existing key", async () => {
      await cacheService.set("test", "value");
      const result = await cacheService.has("test");
      expect(result).toBe(true);
    });

    it("should return false for non-existent key", async () => {
      const result = await cacheService.has("non-existent");
      expect(result).toBe(false);
    });

    it("should return false for expired key", async () => {
      await cacheService.set("test", "value", 1);
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const result = await cacheService.has("test");
      expect(result).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should track hits and misses", async () => {
      await cacheService.set("test", "value");
      await cacheService.get("test"); // hit
      await cacheService.get("non-existent"); // miss
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it("should track cache size", async () => {
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");
      const stats = cacheService.getStats();
      expect(stats.size).toBe(2);
    });

    it("should update stats after expiration", async () => {
      await cacheService.set("test", "value", 1);
      await cacheService.get("test"); // hit
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await cacheService.get("test"); // miss due to expiration
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(0);
    });

    it("should calculate correct hitRatio", async () => {
      await cacheService.flush(); // Clear cache and reset stats
      await cacheService.set("key1", "value1");
      await cacheService.get("key1"); // hit
      await cacheService.get("key1"); // hit
      await cacheService.get("missing"); // miss
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRatio).toBe(0.67); // 2/3 = 0.6666... rounded to 0.67
    });
  });

  describe("resetStats", () => {
    it("should reset all statistics", async () => {
      await cacheService.set("key1", "value1");
      await cacheService.get("key1"); // hit
      await cacheService.get("missing"); // miss

      cacheService.resetStats();

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRatio).toBe(0);
      // Size should still reflect actual cache size
      expect(stats.size).toBe(1);
    });
  });

  describe("keys", () => {
    it("should return all cache keys", async () => {
      await cacheService.flush();
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");

      const keys = cacheService.keys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });

    it("should not include expired keys", async () => {
      await cacheService.flush();
      await cacheService.set("permanent", "value");
      await cacheService.set("temporary", "value", 1);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const keys = cacheService.keys();
      expect(keys).toHaveLength(1);
      expect(keys).toContain("permanent");
      expect(keys).not.toContain("temporary");
    });
  });

  describe("size", () => {
    it("should return the number of cache entries", async () => {
      await cacheService.flush();
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");

      expect(cacheService.size()).toBe(2);
    });

    it("should not count expired entries", async () => {
      await cacheService.flush();
      await cacheService.set("permanent", "value");
      await cacheService.set("temporary", "value", 1);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(cacheService.size()).toBe(1);
    });
  });

  describe("memoize", () => {
    it("should cache function results", async () => {
      const mockFn = vi.fn().mockImplementation(async (x: number) => x * 2);
      const memoized = cacheService.memoize(mockFn);

      // First call should execute the function
      expect(await memoized(5)).toBe(10);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Second call with same args should use cache
      expect(await memoized(5)).toBe(10);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Call with different args should execute function again
      expect(await memoized(10)).toBe(20);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should respect TTL option", async () => {
      const mockFn = vi.fn().mockImplementation(async (x: number) => x * 2);
      const memoized = cacheService.memoize(mockFn, { ttl: 1 });

      // First call
      expect(await memoized(5)).toBe(10);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Call again, should execute function due to expiration
      expect(await memoized(5)).toBe(10);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should use custom key function", async () => {
      const mockFn = vi
        .fn()
        .mockImplementation(async (obj: Record<string, unknown>) =>
          JSON.stringify(obj)
        );

      const memoized = cacheService.memoize(mockFn, {
        keyFn: (obj) => `custom:${(obj as Record<string, unknown>).id}`,
      });

      // First call
      expect(await memoized({ id: 1, name: "test" })).toBe(
        '{"id":1,"name":"test"}'
      );
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Different object with same ID should use cache
      expect(await memoized({ id: 1, name: "different" })).toBe(
        '{"id":1,"name":"test"}'
      );
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Different ID should call function again
      expect(await memoized({ id: 2, name: "test" })).toBe(
        '{"id":2,"name":"test"}'
      );
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should support dynamic TTL function", async () => {
      const mockFn = vi.fn().mockImplementation(async (x: number) => x);
      const ttlFn = vi.fn().mockImplementation((result: number) => result / 10);

      const memoized = cacheService.memoize(mockFn, { ttl: ttlFn });

      // First call - result is 1, so TTL should be 0.1 seconds
      expect(await memoized(1)).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(ttlFn).toHaveBeenCalledTimes(1);

      // Wait for 0.2 seconds (> 0.1s TTL)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Call again, should execute function due to expiration
      expect(await memoized(1)).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(ttlFn).toHaveBeenCalledTimes(2);

      // Second call - result is 5, so TTL should be 0.5 seconds
      expect(await memoized(5)).toBe(5);
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(ttlFn).toHaveBeenCalledTimes(3);

      // Wait for 0.2 seconds (< 0.5s TTL)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Call again, should use cache as TTL hasn't expired
      expect(await memoized(5)).toBe(5);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe("clear", () => {
    it("should be an alias for flush", async () => {
      await cacheService.set("test", "value");
      await cacheService.clear();
      expect(await cacheService.get("test")).toBeNull();
    });
  });
});
