import { describe, it, expect, beforeEach, vi } from "vitest";

import { ICacheService } from "@/server/infrastructure/cache/ICacheService";

// Define a mock implementation of the ICacheService interface for testing
class MockCacheService implements ICacheService {
  private cache: Map<string, any> = new Map();
  private expirations: Map<string, number> = new Map();
  private _stats = { hits: 0, misses: 0, size: 0 };

  async initialize(): Promise<void> {
    // Nothing to initialize for the mock
    return Promise.resolve();
  }

  async shutdown(): Promise<void> {
    await this.clear();
    return Promise.resolve();
  }

  async get<T>(key: string): Promise<T | null> {
    // Check if key exists and not expired
    if (this.cache.has(key)) {
      const expiry = this.expirations.get(key);

      if (!expiry || expiry > Date.now()) {
        this._stats.hits++;
        return this.cache.get(key) as T;
      } else {
        // Expired
        this.cache.delete(key);
        this.expirations.delete(key);
      }
    }

    this._stats.misses++;
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    this.cache.set(key, value);

    if (ttl) {
      this.expirations.set(key, Date.now() + ttl * 1000);
    } else {
      this.expirations.delete(key);
    }

    this._stats.size = this.cache.size;
    return true;
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.expirations.delete(key);
    this._stats.size = this.cache.size;
    return existed;
  }

  async getMultiple<T>(keys: string[]): Promise<Record<string, T>> {
    const result: Record<string, T> = {};

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  async setMultiple<T>(
    entries: Record<string, T>,
    ttl?: number
  ): Promise<boolean> {
    for (const key in entries) {
      await this.set(key, entries[key], ttl);
    }

    return true;
  }

  async deleteMultiple(keys: string[]): Promise<boolean> {
    let allDeleted = true;

    for (const key of keys) {
      const result = await this.delete(key);
      allDeleted = allDeleted && result;
    }

    return allDeleted;
  }

  async clear(): Promise<boolean> {
    return this.flush();
  }

  async flush(): Promise<boolean> {
    this.cache.clear();
    this.expirations.clear();
    this._stats.size = 0;
    return true;
  }

  async has(key: string): Promise<boolean> {
    if (!this.cache.has(key)) {
      return false;
    }

    const expiry = this.expirations.get(key);
    if (expiry && expiry <= Date.now()) {
      this.cache.delete(key);
      this.expirations.delete(key);
      return false;
    }

    return true;
  }

  keys(): string[] {
    // Clean expired entries before returning keys
    for (const [key, expiry] of this.expirations.entries()) {
      if (expiry && expiry <= Date.now()) {
        this.cache.delete(key);
        this.expirations.delete(key);
      }
    }
    return Array.from(this.cache.keys());
  }

  memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: {
      ttl?:
        | number
        | ((result: Awaited<ReturnType<T>>, executionTime: number) => number);
      keyFn?: (...args: any[]) => string;
    } = {}
  ): T {
    return (async (...args: any[]): Promise<any> => {
      const key = options.keyFn
        ? options.keyFn(...args)
        : `memoize:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute the function
      const start = performance.now();
      const result = await fn(...args);
      const executionTime = performance.now() - start;

      // Determine TTL
      let ttl: number | undefined;
      if (typeof options.ttl === "function") {
        ttl = options.ttl(result, executionTime);
      } else {
        ttl = options.ttl;
      }

      // Cache the result
      await this.set(key, result, ttl);
      return result;
    }) as T;
  }

  getStats(): { hits: number; misses: number; size: number } {
    return { ...this._stats };
  }
}

describe("ICacheService Interface", () => {
  let cacheService: ICacheService;

  beforeEach(() => {
    cacheService = new MockCacheService();
  });

  it("should initialize and shutdown properly", async () => {
    await expect(cacheService.initialize()).resolves.not.toThrow();
    await expect(cacheService.shutdown()).resolves.not.toThrow();
  });

  it("should store and retrieve values", async () => {
    const testKey = "test-key";
    const testValue = { name: "Test Value", count: 42 };

    await cacheService.set(testKey, testValue);
    const retrieved = await cacheService.get<typeof testValue>(testKey);

    expect(retrieved).toEqual(testValue);
  });

  it("should respect TTL for cached values", async () => {
    const testKey = "ttl-test";
    const testValue = "expire-soon";

    // Set with a very short TTL
    await cacheService.set(testKey, testValue, 0.01); // 10ms

    // Value should be available immediately
    expect(await cacheService.get(testKey)).toBe(testValue);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Value should be gone
    expect(await cacheService.get(testKey)).toBeNull();
  });

  it("should properly check if keys exist", async () => {
    const existingKey = "existing-key";
    const nonExistingKey = "non-existing-key";

    await cacheService.set(existingKey, "test");

    expect(await cacheService.has(existingKey)).toBe(true);
    expect(await cacheService.has(nonExistingKey)).toBe(false);
  });

  it("should delete keys", async () => {
    const testKey = "delete-me";

    await cacheService.set(testKey, "to-be-deleted");
    expect(await cacheService.has(testKey)).toBe(true);

    await cacheService.delete(testKey);
    expect(await cacheService.has(testKey)).toBe(false);
  });

  it("should handle multiple keys in batch operations", async () => {
    const entries = {
      "batch-1": "value-1",
      "batch-2": "value-2",
      "batch-3": "value-3",
    };

    // Set multiple
    await cacheService.setMultiple(entries);

    // Get multiple
    const retrieved = await cacheService.getMultiple<string>(
      Object.keys(entries)
    );
    expect(retrieved).toEqual(entries);

    // Delete multiple
    await cacheService.deleteMultiple(["batch-1", "batch-3"]);
    expect(await cacheService.has("batch-1")).toBe(false);
    expect(await cacheService.has("batch-2")).toBe(true);
    expect(await cacheService.has("batch-3")).toBe(false);
  });

  it("should clear all cache entries", async () => {
    await cacheService.set("clear-1", "value-1");
    await cacheService.set("clear-2", "value-2");

    await cacheService.clear();

    expect(await cacheService.has("clear-1")).toBe(false);
    expect(await cacheService.has("clear-2")).toBe(false);
    expect(cacheService.keys().length).toBe(0);
  });

  it("should flush the cache (same as clear)", async () => {
    await cacheService.set("flush-1", "value-1");
    await cacheService.set("flush-2", "value-2");

    await cacheService.flush();

    expect(await cacheService.has("flush-1")).toBe(false);
    expect(await cacheService.has("flush-2")).toBe(false);
    expect(cacheService.keys().length).toBe(0);
  });

  it("should return all cache keys", async () => {
    await cacheService.flush(); // Clear cache first

    await cacheService.set("key1", "value1");
    await cacheService.set("key2", "value2");

    const keys = cacheService.keys();
    expect(keys).toHaveLength(2);
    expect(keys).toContain("key1");
    expect(keys).toContain("key2");
  });

  it("should not include expired keys in keys()", async () => {
    await cacheService.flush();

    await cacheService.set("permanent", "value");
    await cacheService.set("temporary", "value", 0.01); // 10ms TTL

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 20));

    const keys = cacheService.keys();
    expect(keys).toHaveLength(1);
    expect(keys).toContain("permanent");
    expect(keys).not.toContain("temporary");
  });

  it("should memoize functions", async () => {
    const expensiveOperation = vi
      .fn()
      .mockImplementation(async (a: number, b: number) => {
        return a + b;
      });

    const memoizedFn = cacheService.memoize(expensiveOperation, { ttl: 10 });

    // First call should execute the function
    expect(await memoizedFn(5, 3)).toBe(8);
    expect(expensiveOperation).toHaveBeenCalledTimes(1);

    // Second call with same args should use cache
    expect(await memoizedFn(5, 3)).toBe(8);
    expect(expensiveOperation).toHaveBeenCalledTimes(1);

    // Different args should execute the function again
    expect(await memoizedFn(2, 2)).toBe(4);
    expect(expensiveOperation).toHaveBeenCalledTimes(2);
  });

  it("should support custom key function in memoize", async () => {
    const mockFn = vi
      .fn()
      .mockImplementation(async (obj: Record<string, unknown>) => {
        return JSON.stringify(obj);
      });

    const memoizedFn = cacheService.memoize(mockFn, {
      keyFn: (obj) => `custom:${(obj as Record<string, unknown>).id}`,
    });

    // First call
    expect(await memoizedFn({ id: 1, name: "test" })).toBe(
      '{"id":1,"name":"test"}'
    );
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Different object with same ID should use cache
    expect(await memoizedFn({ id: 1, name: "different" })).toBe(
      '{"id":1,"name":"test"}'
    );
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Different ID should call function again
    expect(await memoizedFn({ id: 2, name: "test" })).toBe(
      '{"id":2,"name":"test"}'
    );
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("should support dynamic TTL function in memoize", async () => {
    const mockFn = vi.fn().mockImplementation(async (x: number) => x);
    const ttlFn = vi.fn().mockImplementation((result: number) => result / 100); // TTL = result/100 seconds

    const memoizedFn = cacheService.memoize(mockFn, { ttl: ttlFn });

    // Result is 10, so TTL should be 0.1 seconds
    expect(await memoizedFn(10)).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(ttlFn).toHaveBeenCalledTimes(1);

    // Wait for 0.05 seconds (< 0.1s TTL)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should still be cached
    expect(await memoizedFn(10)).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Wait for another 0.1 seconds (total > 0.1s TTL)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should execute function again due to expiration
    expect(await memoizedFn(10)).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("should track cache statistics", async () => {
    // Flush to reset cache
    await cacheService.flush();

    // Initially all stats should be 0
    expect(cacheService.getStats()).toEqual({ hits: 0, misses: 0, size: 0 });

    // Add an item, size should be 1
    await cacheService.set("stats-test", "value");
    expect(cacheService.getStats().size).toBe(1);

    // Get existing item, hits should increase
    await cacheService.get("stats-test");
    expect(cacheService.getStats().hits).toBe(1);

    // Get non-existing item, misses should increase
    await cacheService.get("non-existing");
    expect(cacheService.getStats().misses).toBe(1);
  });
});
