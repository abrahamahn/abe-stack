# 🧪 Cache Unit Tests

## 📋 Overview

This directory contains unit tests for the cache infrastructure components. The tests validate the caching system's ability to store, retrieve, and manage data with appropriate lifetime controls, supporting both in-memory and Redis-based implementations.

## 🧩 Test Files

| File                                                     | Description                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [CacheService.test.ts](./CacheService.test.ts)           | Tests the in-memory implementation of the cache service                                  |
| [ICacheService.test.ts](./ICacheService.test.ts)         | Tests that implementations of the cache service interface correctly fulfill the contract |
| [RedisCacheService.test.ts](./RedisCacheService.test.ts) | Tests the Redis-backed implementation of the cache service                               |
| [RedisClient.test.ts](./RedisClient.test.ts)             | Tests the Redis client utilities for connection management and configuration             |
| [startupHooks.test.ts](./startupHooks.test.ts)           | Tests the integration of cache services with application lifecycle hooks                 |

## 🔍 Key Test Scenarios

### Storage and Retrieval

- Basic key-value storage across cache implementations
- Object serialization/deserialization
- Cache hits and misses tracking
- Default values

### Cache Lifetime Management

- TTL (Time-To-Live) enforcement
- Cache item expiration
- Manual invalidation
- Cache clearing

### Cache Implementations

- In-memory cache with efficient local storage
- Redis-backed cache for distributed environments
- Implementation-specific optimizations

### Redis Specific Features

- Connection management and error handling
- Redis transaction support for batch operations
- Prefix-based namespace isolation
- Redis configuration options

### Memory Management

- Memory usage tracking
- Cache size constraints

### Advanced Features

- Function result memoization with TTL support
- Custom key generation for complex data types
- Batch operations (getMultiple, setMultiple, deleteMultiple)
- Cache statistics and performance monitoring

## 🔧 Test Implementation Details

### Mocks and Stubs

- MockLogger for logging dependency
- Redis client mocking for isolated testing
- Time-dependent test utilities

### Common Patterns

```typescript
// Example pattern for TTL testing
it("should expire items after TTL", async () => {
  // Arrange
  const key = "expiring-key";
  const value = { test: "data" };
  const ttl = 100; // ms

  // Act
  await cacheService.set(key, value, ttl);

  // Fast-forward time
  await new Promise((resolve) => setTimeout(resolve, ttl + 10));

  // Assert
  const result = await cacheService.get(key);
  expect(result).toBeNull();
});
```

### Redis Testing Approach

```typescript
// Example of Redis command mocking
it("should set a value with TTL in Redis", async () => {
  // Setup Redis mock
  mockRedisClient.set.mockResolvedValueOnce("OK");

  // Execute the method
  const result = await redisCacheService.set("test-key", "value", 60);

  // Verify Redis was called correctly
  expect(mockRedisClient.set).toHaveBeenCalledWith(
    "cache:test-key",
    JSON.stringify("value"),
    { EX: 60 }
  );
  expect(result).toBe(true);
});
```

## 🔗 Related Components

- [Application Lifecycle](../lifecycle/README.md) - For startup hook testing
- [Logging](../logging/README.md) - For cache event logging
- [Configuration](../config/README.md) - For cache configuration loading
