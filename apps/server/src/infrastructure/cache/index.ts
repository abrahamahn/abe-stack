// apps/server/src/infrastructure/cache/index.ts
/**
 * Cache Infrastructure
 *
 * Production-ready cache layer with memory and Redis providers.
 */

// Factory
export { createCache, createCacheFromEnv, createMemoryCache, createRedisCache } from './cache-factory';

// Providers
export { MemoryCacheProvider } from './memory-provider';
export { RedisCacheProvider } from './redis-provider';
export type { RedisClient, RedisClientFactory } from './redis-provider';

// Types (re-export core types for convenience)
export type {
  BaseCacheConfig,
  CacheConfig,
  CacheDeleteOptions,
  CacheEntry,
  CacheEntryMetadata,
  CacheGetOptions,
  CacheProvider,
  CacheProviderType,
  CacheSetOptions,
  CacheStats,
  MemoryCacheConfig,
  RedisCacheConfig,
} from './types';

// Server-specific types
export type {
  CacheLogger,
  CacheOperationResult,
  CreateCacheOptions,
  EvictionReason,
  LRUNode,
  MemoizedFunction,
  MemoizeOptions,
  MemoizeStats,
} from './types';

// Utils
export { memoize, memoizeMethod } from './utils';
