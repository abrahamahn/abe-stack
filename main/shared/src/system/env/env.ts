// main/shared/src/system/env/env.ts
/**
 * Environment Configuration Utilities
 *
 * Validation for environment variables using createSchema.
 * Provides a single point of failure at startup if .env is misconfigured.
 *
 * @module Engine/Env
 */

import {
  createEnumSchema,
  createSchema,
  parseOptional,
  parseString,
} from '../../primitives/schema';
import { ConfigurationError } from '../errors';

import type { Schema } from '../../primitives/api';

// ============================================================================
// Base Environment Schema
// ============================================================================

const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;

/** Node environment enum schema */
const nodeEnvSchema = createEnumSchema(NODE_ENV_VALUES, 'NODE_ENV');

/** Base environment variables type */
export interface BaseEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_URL?: string | undefined;
}

/**
 * Base schema for commonly used environment variables.
 * Includes standard NODE_ENV and public keys.
 */
export const baseEnvSchema: Schema<BaseEnv> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  const rawNodeEnv = obj['NODE_ENV'];
  const NODE_ENV =
    rawNodeEnv !== undefined ? nodeEnvSchema.parse(rawNodeEnv) : ('development' as const);

  const NEXT_PUBLIC_APP_URL = parseOptional(obj['NEXT_PUBLIC_APP_URL'], (v) =>
    parseString(v, 'NEXT_PUBLIC_APP_URL', { url: true }),
  );

  return { NODE_ENV, NEXT_PUBLIC_APP_URL };
});

// ============================================================================
// Env Helpers
// ============================================================================

/**
 * Helper to get raw environment variables.
 * Pass an override for non-Node runtimes (e.g., Vite's import.meta.env, Cloudflare Workers).
 *
 * @param override - Custom env record (e.g., import.meta.env for Vite clients)
 * @returns Record of raw environment variable key-value pairs
 */
export function getRawEnv(
  override?: Record<string, string | undefined>,
): Record<string, string | undefined> {
  if (override !== undefined) return override;
  return typeof process !== 'undefined' ? process.env : {};
}

/**
 * Validates environment variables against a schema.
 *
 * @param schema - Schema to validate against
 * @param rawEnv - Optional env source override (e.g., import.meta.env for Vite clients)
 * @returns Validated environment object
 * @throws ConfigurationError if validation fails
 */
export function validateEnv<T>(schema: Schema<T>, rawEnv?: Record<string, string | undefined>): T {
  const result = schema.safeParse(getRawEnv(rawEnv));

  if (!result.success) {
    const message = `Environment validation failed: ${result.error.message}`;
    throw new ConfigurationError('env', message);
  }

  return result.data;
}
