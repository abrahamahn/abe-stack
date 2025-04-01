import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { CacheService } from "@/server/infrastructure/cache/CacheService";

// Mock the dependencies to avoid issues with inversify
vi.mock("inversify", () => ({
  injectable: () => vi.fn(),
  inject: () => vi.fn(),
  optional: () => vi.fn(),
}));

describe("Cache Infrastructure Integration", () => {
  let cacheService: CacheService;
  let mockLogger: any;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    } as any;

    // Create real cache service instance with mock logger
    cacheService = new CacheService(mockLogger);
  });

  afterEach(async () => {
    // Clean up after each test
    await cacheService.flush();
  });

  describe("Lifecycle Methods", () => {
    it("should initialize and shutdown properly", async () => {
      await cacheService.initialize();
      expect(mockLogger.info).toHaveBeenCalledWith("Cache service initialized");

      await cacheService.shutdown();
      expect(mockLogger.info).toHaveBeenCalledWith("Cache service shut down");
    });
  });

  describe("Basic Cache Operations", () => {
    const testKey = "test-key";
    const testValue = { name: "Test", value: 42 };

    it("should set and get a value", async () => {
      await cacheService.set(testKey, testValue);
      const result = await cacheService.get(testKey);
      expect(result).toEqual(testValue);
    });

    it("should handle TTL correctly", async () => {
      await cacheService.set(testKey, testValue, 0.1); // 100ms TTL
      let result = await cacheService.get(testKey);
      expect(result).toEqual(testValue);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 200));
      result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });

    it("should delete a value", async () => {
      await cacheService.set(testKey, testValue);
      await cacheService.delete(testKey);
      const result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });

    it("should check if key exists", async () => {
      await cacheService.set(testKey, testValue);
      expect(await cacheService.has(testKey)).toBe(true);

      await cacheService.delete(testKey);
      expect(await cacheService.has(testKey)).toBe(false);
    });

    it("should return all keys", async () => {
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");

      const keys = cacheService.keys();
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });
  });

  describe("Bulk Operations", () => {
    const testEntries = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };

    it("should set multiple values", async () => {
      await cacheService.setMultiple(testEntries);

      for (const [key, value] of Object.entries(testEntries)) {
        const result = await cacheService.get(key);
        expect(result).toBe(value);
      }
    });

    it("should get multiple values", async () => {
      await cacheService.setMultiple(testEntries);

      const results = await cacheService.getMultiple(Object.keys(testEntries));
      expect(results).toEqual(testEntries);
    });

    it("should delete multiple values", async () => {
      await cacheService.setMultiple(testEntries);
      await cacheService.deleteMultiple(Object.keys(testEntries));

      for (const key of Object.keys(testEntries)) {
        expect(await cacheService.has(key)).toBe(false);
      }
    });
  });

  describe("Memoization", () => {
    it("should memoize function results", async () => {
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
      const fn = vi
        .fn()
        .mockImplementation(async (x: number, y: number) => x + y);
      const keyFn = (...args: unknown[]) => `sum:${args[0]}:${args[1]}`;

      const memoized = cacheService.memoize(fn, { keyFn });

      const result = await memoized(2, 3);
      expect(result).toBe(5);

      // Verify the custom key was used
      expect(await cacheService.has("sum:2:3")).toBe(true);
    });

    it("should support dynamic TTL based on result", async () => {
      const fn = vi.fn().mockImplementation(async (x: number) => x * 2);
      const ttlFn = (result: number) => result * 0.1; // TTL based on result value

      const memoized = cacheService.memoize(fn, { ttl: ttlFn });

      await memoized(5); // Result is 10, so TTL should be 1 second
      expect(fn).toHaveBeenCalledTimes(1);

      // Check before expiration
      await new Promise((resolve) => setTimeout(resolve, 500));
      await memoized(5);
      expect(fn).toHaveBeenCalledTimes(1);

      // Check after expiration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await memoized(5);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("Statistics", () => {
    it("should track cache hits and misses", async () => {
      const key = "stats-test";
      const value = "test-value";

      // Initial stats should be zero
      expect(cacheService.getStats()).toEqual({
        hits: 0,
        misses: 0,
        size: 0,
        hitRatio: 0,
      });

      // Miss
      await cacheService.get(key);

      // Hit
      await cacheService.set(key, value);
      await cacheService.get(key);

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRatio).toBe(0.5);
    });

    it("should reset statistics", async () => {
      await cacheService.set("key", "value");
      await cacheService.get("key");
      await cacheService.get("nonexistent");

      cacheService.resetStats();

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(1); // Size should remain unchanged
      expect(stats.hitRatio).toBe(0);
    });
  });

  describe("Cache Cleanup", () => {
    it("should clean up expired entries", async () => {
      await cacheService.set("short-ttl", "value1", 0.1); // 100ms TTL
      await cacheService.set("long-ttl", "value2", 1); // 1s TTL

      // Wait for first entry to expire
      await new Promise((resolve) => setTimeout(resolve, 200));

      // This should trigger cleanup
      const keys = cacheService.keys();
      expect(keys).not.toContain("short-ttl");
      expect(keys).toContain("long-ttl");

      // Verify cleanup was logged
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Removed 1 expired cache entries"),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid TTL values", async () => {
      await expect(cacheService.set("key", "value", -1)).rejects.toThrow();
      await expect(cacheService.set("key", "value", NaN)).rejects.toThrow();
      await expect(
        cacheService.set("key", "value", Infinity),
      ).rejects.toThrow();
    });

    it("should handle malformed cache keys", async () => {
      // @ts-expect-error Testing invalid key
      await expect(cacheService.set(null, "value")).rejects.toThrow();
      // @ts-expect-error Testing invalid key
      await expect(cacheService.set(undefined, "value")).rejects.toThrow();
      await expect(cacheService.set("", "value")).rejects.toThrow();
    });

    it("should handle concurrent modifications", async () => {
      const key = "concurrent-key";
      const value = "value";

      // Simulate concurrent operations
      const operations = Array(10)
        .fill(null)
        .map(() => cacheService.set(key, value));

      // All operations should complete without errors
      await expect(Promise.all(operations)).resolves.toBeDefined();

      // Verify final state
      const result = await cacheService.get(key);
      expect(result).toBe(value);
    });
  });

  describe("Performance", () => {
    it("should handle large datasets efficiently", async () => {
      const largeDataset = new Array(10000).fill(null).map((_, i) => ({
        key: `key-${i}`,
        value: `value-${i}`,
      }));

      const start = performance.now();

      // Set large dataset
      await Promise.all(
        largeDataset.map(({ key, value }) => cacheService.set(key, value)),
      );

      // Get large dataset
      const keys = largeDataset.map(({ key }) => key);
      await cacheService.getMultiple(keys);

      const end = performance.now();
      const duration = end - start;

      // Operation should complete within reasonable time (e.g., 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it("should clean up expired entries efficiently", async () => {
      // Set up many entries with different TTLs
      const entries = new Array(1000).fill(null).map((_, i) => ({
        key: `expire-${i}`,
        value: `value-${i}`,
        ttl: Math.random() * 2, // Random TTL between 0-2 seconds
      }));

      await Promise.all(
        entries.map(({ key, value, ttl }) => cacheService.set(key, value, ttl)),
      );

      // Wait for some entries to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const start = performance.now();
      await cacheService.keys(); // This triggers cleanup
      const end = performance.now();
      const duration = end - start;

      // Cleanup should complete within reasonable time (e.g., 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe("Type Safety", () => {
    it("should maintain type safety with generic types", async () => {
      interface TestType {
        id: number;
        name: string;
      }

      const testData: TestType = {
        id: 1,
        name: "test",
      };

      await cacheService.set<TestType>("typed-key", testData);
      const result = await cacheService.get<TestType>("typed-key");

      // TypeScript should infer correct types
      expect(result?.id).toBe(1);
      expect(result?.name).toBe("test");
      // @ts-expect-error Testing type safety
      expect(result?.invalid).toBeUndefined();
    });

    it("should handle type coercion correctly", async () => {
      const numberValue = 42;
      await cacheService.set("number-key", numberValue);

      // Should maintain number type
      const result = await cacheService.get<number>("number-key");
      expect(typeof result).toBe("number");
      expect(result).toBe(42);

      // Should not coerce types
      const stringResult = await cacheService.get<string>("number-key");
      expect(typeof stringResult).toBe("number");
    });
  });

  describe("Memory Management", () => {
    it("should not leak memory on repeated operations", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        await cacheService.set(`key-${i}`, `value-${i}`);
        await cacheService.get(`key-${i}`);
        await cacheService.delete(`key-${i}`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDiff = finalMemory - initialMemory;

      // Memory usage should not increase significantly
      expect(memoryDiff).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });

    it("should clean up memory on clear", async () => {
      // Fill cache with data
      for (let i = 0; i < 1000; i++) {
        await cacheService.set(`key-${i}`, `value-${i}`);
      }

      const beforeClear = process.memoryUsage().heapUsed;
      await cacheService.clear();
      const afterClear = process.memoryUsage().heapUsed;

      // Memory usage should decrease after clear
      expect(afterClear).toBeLessThan(beforeClear);
    });
  });
});
