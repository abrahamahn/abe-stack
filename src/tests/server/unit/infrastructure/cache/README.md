# 🧪 Cache Unit Tests

## 📋 Overview

This directory contains unit tests for the cache infrastructure components. The tests validate the caching system's ability to store, retrieve, and manage data with appropriate lifetime controls.

## 🧩 Test Files

| File                                             | Description                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| [CacheService.test.ts](./CacheService.test.ts)   | Tests the implementation of the cache service, including storage, retrieval, TTL handling, and memory management |
| [ICacheService.test.ts](./ICacheService.test.ts) | Tests that implementations of the cache service interface correctly fulfill the contract                         |
| [startupHooks.test.ts](./startupHooks.test.ts)   | Tests the integration of cache services with application lifecycle hooks                                         |

## 🔍 Key Test Scenarios

### Storage and Retrieval

- Basic key-value storage
- Object serialization/deserialization
- Cache hits and misses
- Default values

### Cache Lifetime Management

- TTL (Time-To-Live) enforcement
- Cache item expiration
- Manual invalidation
- Cache clearing

### Memory Management

- Memory usage limits
- LRU (Least Recently Used) eviction
- Cache size constraints

### Concurrency

- Concurrent read/write operations
- Race condition handling
- Atomic operations

## 🔧 Test Implementation Details

### Mocks and Stubs

- MockLogger for logging dependency
- Clock mocking for time-dependent tests
- Memory monitoring stubs

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
  jest.advanceTimersByTime(ttl + 10);

  // Assert
  const result = await cacheService.get(key);
  expect(result).toBeUndefined();
});
```

## 🔗 Related Components

- [Application Lifecycle](../lifecycle/README.md) - For startup hook testing
- [Logging](../logging/README.md) - For cache event logging
