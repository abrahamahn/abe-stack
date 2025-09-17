# 🚀 Cache System

## 📋 Purpose

The cache module provides a robust in-memory caching system for optimizing application performance by temporarily storing frequently accessed data. This reduces:

- Database queries
- External API calls
- Expensive calculations
- Response times for common requests

The implementation prioritizes speed, reliability, and a developer-friendly API to make caching seamless across the application.

## 🧩 Key Components

### 1️⃣ ICacheService Interface (`ICacheService.ts`)

Defines the contract for cache implementations with:

- Core operations: `get`, `set`, `delete`
- Batch operations: `getMultiple`, `setMultiple`, `deleteMultiple`
- Lifecycle hooks: `initialize`, `shutdown`
- Utility methods: `clear`/`flush`, `has`, `keys` (synchronous)
- Statistics tracking: `getStats` (includes hits, misses, size, and hit ratio)
- Function memoization with TTL and custom key generation

### 2️⃣ Cache Implementations

#### In-Memory Cache (`CacheService.ts`)

Default in-memory implementation featuring:

- TTL (Time-To-Live) expiration
- Background cleanup processes
- Performance tracking & statistics
- Validation and error handling
- Memory management

#### Redis Cache (`RedisCacheService.ts`)

Distributed cache implementation with:

- Shared cache across multiple instances
- Persistence options
- Redis-specific optimizations
- Same API as in-memory cache
- Prefix-based namespace support

### 3️⃣ Configuration

Configuration is managed through the central config system:

- **CacheConfigProvider** (`@/server/infrastructure/config/domain/CacheConfig.ts`): Provider selection (memory/Redis), Redis connection settings, cleanup intervals, and key prefixing
- Environment-based configuration with multiple cache providers
- Type-safe configuration access with validation

### 4️⃣ Startup Hooks (`startupHooks.ts`)

Manages lifecycle integration:

- `initializeCache()`: Sets up cache on application startup
- `shutdownCache()`: Properly terminates cache resources

### 5️⃣ Module Exports (`index.ts`)

Exposes the public API for the cache module, including configuration from the central config system.

## 🛠️ Usage Instructions

### Basic Operations

```typescript
// Get cache service from DI container
const cacheService = container.get<ICacheService>(TYPES.CacheService);

// Store value with 5-minute TTL
await cacheService.set("user:123", userData, 300);

// Retrieve value
const user = await cacheService.get("user:123");

// Delete value
await cacheService.delete("user:123");
```

### Function Memoization

```typescript
// Create cached version of expensive function
const getExpensiveData = cacheService.memoize(
  async (id: string, filter: string) => {
    return fetchDataFromDb(id, filter);
  },
  {
    ttl: 600, // 10 minutes
    keyFn: (id, filter) => `data:${id}:${filter}`,
  }
);

// First call executes function, subsequent calls with same params use cache
const data = await getExpensiveData("abc", "active");
```

### Batch Operations

```typescript
// Set multiple values at once
await cacheService.setMultiple(
  {
    "products:featured": featuredProducts,
    "products:recent": recentProducts,
  },
  1800 // 30 minutes TTL
);

// Get multiple values at once
const data = await cacheService.getMultiple([
  "products:featured",
  "products:recent",
]);
```

### Cache Statistics

```typescript
const stats = cacheService.getStats();
console.log(
  `Cache hits: ${stats.hits}, misses: ${stats.misses}, size: ${stats.size}, hit ratio: ${stats.hitRatio}`
);
```

## 🔄 Switching Cache Providers

### Configuration Via Environment Variables

By default, the application uses in-memory caching. To switch to Redis, use the following environment variables:

```
CACHE_PROVIDER=redis
CACHE_REDIS_HOST=localhost
CACHE_REDIS_PORT=6379
CACHE_REDIS_PASSWORD=optional-password
CACHE_REDIS_DB=0
CACHE_REDIS_KEY_PREFIX=cache:
CACHE_REDIS_TLS=false
CACHE_CLEANUP_INTERVAL=10
```

These environment variables can be configured in the environment files:

- `src/server/infrastructure/config/.env/.env.development` - Development environment configuration
- `src/server/infrastructure/config/.env/.env.production` - Production environment template
- `src/server/infrastructure/config/.env/.env.test` - Test environment configuration

You can modify these files or override them with environment variables specific to your deployment environment.

### Redis Requirements

To use Redis caching:

1. Install Redis server locally or use a cloud provider
2. Configure the Redis connection using environment variables
3. Ensure the `redis` npm package is installed:
   ```bash
   npm install redis
   ```

The application will automatically connect to Redis based on the environment configuration.

## 🧪 Testing

### Unit Tests

The cache system has comprehensive unit tests for both in-memory and Redis implementations:

- **In-Memory Cache**: Tests cover basic operations, TTL handling, batch operations, memoization, and statistics tracking.
- **Redis Cache**: Tests verify Redis-specific functionality, connection handling, serialization, and error recovery. Redis operations are mocked to avoid requiring an actual Redis server for testing.
- **Interface Compliance**: Tests ensure all implementations correctly fulfill the `ICacheService` contract.

### Running Tests

```bash
# Run all cache tests
npm run test:unit -- --filter="cache"

# Run specific cache implementation tests
npm run test:unit -- --filter="CacheService"
npm run test:unit -- --filter="RedisCacheService"
```

### Key Testing Approaches

#### TTL Testing

```typescript
// Test expiring cache entries
it("should expire items after TTL", async () => {
  await cacheService.set("test-key", "value", 0.1); // 100ms TTL

  // Initial read should succeed
  expect(await cacheService.get("test-key")).toBe("value");

  // Wait for expiration
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Entry should be expired now
  expect(await cacheService.get("test-key")).toBeNull();
});
```

#### Redis Mocking

```typescript
// Mock Redis client for testing
vi.mock("@/server/infrastructure/cache/redisClient", () => ({
  getRedisClient: vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue(JSON.stringify("mockedValue")),
    set: vi.fn().mockResolvedValue("OK"),
    // Other Redis methods...
  }),
  closeRedisConnection: vi.fn(),
}));
```

#### Statistics Verification

```typescript
// Test cache statistics tracking
it("should track hits and misses", async () => {
  await cacheService.set("key", "value");
  await cacheService.get("key"); // hit
  await cacheService.get("missing"); // miss

  const stats = cacheService.getStats();
  expect(stats.hits).toBe(1);
  expect(stats.misses).toBe(1);
});
```

## 🏗️ Architecture Decisions

### Multiple Cache Implementations

- **Decision**: Support both in-memory and Redis caching through a common interface.
- **Rationale**: Flexibility for different environments (development, testing, production).
- **Implementation**: Common `ICacheService` interface, dependency injection for provider selection.

### In-Memory Implementation

- **Decision**: Start with in-memory caching using JavaScript `Map`.
- **Rationale**: Provides low-latency access with simple implementation.
- **Tradeoffs**: Limited by server memory and not shared between instances.

### Redis Implementation

- **Decision**: Add Redis support for distributed environments.
- **Rationale**: Enables shared cache across multiple application instances.
- **Benefits**: Persistence, shared state, horizontal scalability.

### Background Cleanup

- **Decision**: Use interval-based background cleanup rather than checking on each access.
- **Rationale**: Prevents performance impact on cache reads for large caches.
- **Implementation**: Cleanup interval is configurable (default: 10 seconds).

### TTL-Based Expiration

- **Decision**: Support both global and per-item TTL for flexible caching policies.
- **Rationale**: Different data types have different freshness requirements.
- **Enhancement**: Support for dynamic TTL calculation based on result size or execution time.

### Dependency Injection

- **Decision**: Use Inversify container for dependency management.
- **Rationale**: Allows for easy service location and testing.
- **Benefit**: Simplifies switching cache implementations without code changes.

### Memoization Support

- **Decision**: Built-in function result caching with key generation.
- **Rationale**: Common pattern made easier with first-class support.
- **Features**: Supports custom key generation and dynamic TTL calculation.

## ⚙️ Setup and Configuration Notes

### Initialization

The cache service must be initialized at application startup:

```typescript
// In your application startup code
import { initializeCache } from "@/server/infrastructure/cache";

async function startApp() {
  // Initialize cache before services that depend on it
  await initializeCache();

  // Start other app components
  // ...
}
```

### Shutdown

Properly shut down the cache to release resources:

```typescript
// In your application shutdown code
import { shutdownCache } from "@/server/infrastructure/cache";

async function stopApp() {
  // Shut down the cache service
  await shutdownCache();

  // Shut down other app components
  // ...
}
```

### DI Container Registration

The cache service is automatically registered in the DI container, and the implementation will be chosen based on your configuration.

```typescript
// The container setup is done automatically in the infrastructure
// You can access the cache service like this:
const cacheService = container.get<ICacheService>(TYPES.CacheService);
```
