// main/shared/src/config/env.storage.ts
/**
 * Storage Environment Configuration
 *
 * Storage types, env interface, and validation schema.
 * Merged from config/types/infra.ts (storage section) and config/env.ts.
 *
 * @module config/env.storage
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

export type StorageProviderName = 'local' | 's3';

/** Base storage configuration shared by all providers. */
export interface StorageConfigBase {
  provider: StorageProviderName;
}

/** Local filesystem storage configuration. */
export interface LocalStorageConfig extends StorageConfigBase {
  provider: 'local';
  rootPath: string;
  publicBaseUrl?: string;
}

/** S3-compatible storage configuration. */
export interface S3StorageConfig extends StorageConfigBase {
  provider: 's3';
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  presignExpiresInSeconds: number;
}

export type StorageConfig = LocalStorageConfig | S3StorageConfig;

// ============================================================================
// Env Interface
// ============================================================================

/** Storage environment variables */
export interface StorageEnv {
  STORAGE_PROVIDER: 'local' | 's3';
  STORAGE_ROOT_PATH?: string | undefined;
  STORAGE_PUBLIC_BASE_URL?: string | undefined;
  S3_ACCESS_KEY_ID?: string | undefined;
  S3_SECRET_ACCESS_KEY?: string | undefined;
  S3_BUCKET?: string | undefined;
  S3_REGION?: string | undefined;
  S3_ENDPOINT?: string | undefined;
  S3_FORCE_PATH_STYLE?: 'true' | 'false' | undefined;
  S3_PRESIGN_EXPIRES_IN_SECONDS?: number | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

export const StorageEnvSchema: Schema<StorageEnv> = createSchema<StorageEnv>((data: unknown) => {
  const obj = parseObject(data, 'StorageEnv');
  return {
    STORAGE_PROVIDER: createEnumSchema(['local', 's3'] as const, 'STORAGE_PROVIDER').parse(
      withDefault(obj['STORAGE_PROVIDER'], 'local'),
    ),
    STORAGE_ROOT_PATH: parseOptional(obj['STORAGE_ROOT_PATH'], (v: unknown) =>
      parseString(v, 'STORAGE_ROOT_PATH'),
    ),
    STORAGE_PUBLIC_BASE_URL: parseOptional(obj['STORAGE_PUBLIC_BASE_URL'], (v: unknown) =>
      parseString(v, 'STORAGE_PUBLIC_BASE_URL', { url: true }),
    ),
    S3_ACCESS_KEY_ID: parseOptional(obj['S3_ACCESS_KEY_ID'], (v: unknown) =>
      parseString(v, 'S3_ACCESS_KEY_ID'),
    ),
    S3_SECRET_ACCESS_KEY: parseOptional(obj['S3_SECRET_ACCESS_KEY'], (v: unknown) =>
      parseString(v, 'S3_SECRET_ACCESS_KEY'),
    ),
    S3_BUCKET: parseOptional(obj['S3_BUCKET'], (v: unknown) => parseString(v, 'S3_BUCKET')),
    S3_REGION: parseOptional(obj['S3_REGION'], (v: unknown) => parseString(v, 'S3_REGION')),
    S3_ENDPOINT: parseOptional(obj['S3_ENDPOINT'], (v: unknown) =>
      parseString(v, 'S3_ENDPOINT', { url: true }),
    ),
    S3_FORCE_PATH_STYLE: parseOptional(obj['S3_FORCE_PATH_STYLE'], (v: unknown) =>
      trueFalseSchema.parse(v),
    ),
    S3_PRESIGN_EXPIRES_IN_SECONDS: parseOptional(
      obj['S3_PRESIGN_EXPIRES_IN_SECONDS'],
      (v: unknown) => coerceNumber(v, 'S3_PRESIGN_EXPIRES_IN_SECONDS'),
    ),
  };
});
