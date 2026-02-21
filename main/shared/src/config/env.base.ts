// main/shared/src/config/env.base.ts
/**
 * Base Environment Configuration
 *
 * Constants, trueFalseSchema utility, BaseEnv, and JwtEnv.
 * trueFalseSchema is exported for reuse by domain env files.
 *
 * @module config/env.base
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

import type { Schema } from '../primitives/schema';

// ============================================================================
// Constants
// ============================================================================

export const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENV_VALUES)[number];

const nodeEnvSchema = createEnumSchema(['development', 'production', 'test'] as const, 'NODE_ENV');
export const trueFalseSchema = createEnumSchema(['true', 'false'] as const, 'boolean flag');

// ============================================================================
// Base
// ============================================================================

/** Base environment variables */
export interface BaseEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  APP_PUBLIC_URL?: string | undefined;
}

export const BaseEnvSchema: Schema<BaseEnv> = createSchema<BaseEnv>((data: unknown) => {
  const obj = parseObject(data, 'BaseEnv');
  return {
    NODE_ENV: nodeEnvSchema.parse(withDefault(obj['NODE_ENV'], 'development')),
    PORT: coerceNumber(withDefault(obj['PORT'], 8080), 'PORT'),
    APP_PUBLIC_URL: parseOptional(
      obj['APP_PUBLIC_URL'] ?? obj['NEXT_PUBLIC_APP_URL'],
      (v: unknown) => parseString(v, 'APP_PUBLIC_URL', { url: true }),
    ),
  };
});

/** @deprecated Use BaseEnvSchema */
export const baseEnvSchema = BaseEnvSchema;

// ============================================================================
// JWT
// ============================================================================

/** JWT environment variables */
export interface JwtEnv {
  JWT_SECRET: string;
  JWT_SECRET_PREVIOUS?: string | undefined;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
}
