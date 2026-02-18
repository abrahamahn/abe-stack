// main/shared/src/config/env.cache.ts
/**
 * Cache Environment Configuration
 *
 * Cache types, env interface, and validation schema.
 * Merged from config/types/infra.ts (cache section) and config/env.ts.
 *
 * @module config/env.cache
 */

import {
  coerceNumber,
  createEnumSchema,
  createSchema,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../primitives/schema';

import { trueFalseSchema } from './env.base';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Types
// ============================================================================

/**
 * Application cache configuration.
 * Supports in-memory caching with optional Redis backend for scaling.
 */
export interface CacheConfig {
  ttl: number;
  maxSize: number;
  useExternalProvider: boolean;
  externalConfig?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    tls?: boolean;
  };
}

// ============================================================================
// Env Interface
// ============================================================================

/** Cache environment variables */
export interface CacheEnv {
  CACHE_PROVIDER?: 'local' | 'redis' | undefined;
  CACHE_TTL_MS: number;
  CACHE_MAX_SIZE: number;
  CACHE_USE_REDIS?: 'true' | 'false' | undefined;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string | undefined;
  REDIS_DB?: number | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

export const CacheEnvSchema: Schema<CacheEnv> = createSchema<CacheEnv>((data: unknown) => {
  const obj = parseObject(data, 'CacheEnv');
  return {
    CACHE_PROVIDER: parseOptional(obj['CACHE_PROVIDER'], (v: unknown) =>
      createEnumSchema(['local', 'redis'] as const, 'CACHE_PROVIDER').parse(v),
    ),
    CACHE_TTL_MS: coerceNumber(withDefault(obj['CACHE_TTL_MS'], 300000), 'CACHE_TTL_MS'),
    CACHE_MAX_SIZE: coerceNumber(withDefault(obj['CACHE_MAX_SIZE'], 1000), 'CACHE_MAX_SIZE'),
    CACHE_USE_REDIS: parseOptional(obj['CACHE_USE_REDIS'], (v: unknown) =>
      trueFalseSchema.parse(v),
    ),
    REDIS_HOST: parseString(withDefault(obj['REDIS_HOST'], 'localhost'), 'REDIS_HOST'),
    REDIS_PORT: coerceNumber(withDefault(obj['REDIS_PORT'], 6379), 'REDIS_PORT'),
    REDIS_PASSWORD: parseOptional(obj['REDIS_PASSWORD'], (v: unknown) =>
      parseString(v, 'REDIS_PASSWORD'),
    ),
    REDIS_DB: parseOptional(obj['REDIS_DB'], (v: unknown) => coerceNumber(v, 'REDIS_DB')),
  };
});
