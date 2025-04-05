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
- Utility methods: `clear`/`flush`, `has`, `keys`, `getStats`
- Function memoization

### 2️⃣ CacheService Implementation (`CacheService.ts`)

Provides an in-memory implementation featuring:

- TTL (Time-To-Live) expiration
- Background cleanup processes
- Performance tracking & statistics
- Validation and error handling
- Memory management

### 3️⃣ Startup Hooks (`startupHooks.ts`)

Manages lifecycle integration:

- `initializeCache()`: Sets up cache on application startup
- `shutdownCache()`: Properly terminates cache resources

### 4️⃣ Module Exports (`index.ts`)

Exposes the public API for the cache module.

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
  },
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
  1800, // 30 minutes TTL
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
  `Cache hits: ${stats.hits}, misses: ${stats.misses}, size: ${stats.size}`,
);
```

## 🏗️ Architecture Decisions

### In-Memory Implementation

- **Decision**: Start with in-memory caching using JavaScript `Map`.
- **Rationale**: Provides low-latency access with simple implementation.
- **Tradeoffs**: Limited by server memory and not shared between instances.
- **Future**: Designed with interface that allows for distributed cache providers.

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

Ensure the cache service is registered in your DI container:

```typescript
// In your container setup
import { Container } from "inversify";
import { TYPES } from "@/server/infrastructure/di/types";
import { CacheService } from "@/server/infrastructure/cache";

export function setupContainer(container: Container): void {
  container.bind(TYPES.CacheService).to(CacheService).inSingletonScope();
  // Other bindings...
}
```

### Cache Configuration

Currently, cache configuration is set through code constants in `CacheService.ts`:

- `cleanupInterval`: Time between cleanup runs (default: 10 seconds)
- Default TTL settings can be modified in the service implementation

A future enhancement will include a configuration provider to allow for environment-specific settings.
