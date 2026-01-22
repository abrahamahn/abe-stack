// apps/server/src/infrastructure/cache/index.ts
/**
 * Cache Infrastructure
 *
 * Production-ready cache layer with memory provider.
 */

// Factory
export { createCache, createCacheFromEnv, createMemoryCache } from './cache-factory';

// Providers
export { MemoryCacheProvider } from './memory-provider';

// Types (re-export core types for convenience)
export type {
  BaseCacheConfig,
  CacheDeleteOptions,
  CacheEntry,
  CacheEntryMetadata,
  CacheGetOptions,
  CacheProvider,
  CacheSetOptions,
  CacheStats,
  MemoryCacheConfig,
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
