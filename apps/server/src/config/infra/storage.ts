// apps/server/src/config/infra/storage.ts
import type { FullEnv, StorageConfig, StorageProviderName } from '@abe-stack/core/config';

import { resolve } from 'node:path';

/**
 * Storage Configuration Loader
 *
 * Supports local filesystem (development) and S3-compatible providers (production).
 * Works with AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces.
 */

/**
 * Loads file storage configuration from environment variables.
 */
/**
 * Load File Storage Configuration.
 *
 * **Strategies**:
 * - **Local**: Stores files on disk (default in dev). Root path is configurable.
 * - **S3**: Uses parameters compatible with AWS S3, Cloudflare R2, MinIO, or DigitalOcean Spaces.
 *
 * @param env - Environment variables.
 */
export function loadStorageConfig(env: FullEnv): StorageConfig {
  const provider = env.STORAGE_PROVIDER as StorageProviderName;

  if (provider === 's3') {
    return {
      provider: 's3',
      bucket: env.S3_BUCKET ?? '',
      region: env.S3_REGION ?? '',
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      // Custom endpoint for S3-compatible services (MinIO, R2, Spaces)
      endpoint: env.S3_ENDPOINT,
      // Path-style is required for MinIO and some S3-compatible services
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      // Default presigned URLs to 1 hour
      presignExpiresInSeconds: env.S3_PRESIGN_EXPIRES_IN_SECONDS ?? 3600,
    };
  }

  // Local filesystem storage (development default)
  // Ensure we use an absolute path relative to the specific app root,
  // not the CWD (which might be the monorepo root)
  const defaultPath = resolve(__dirname, '../../../uploads');

  return {
    provider: 'local',
    // In a monorepo, keep uploads in a known data directory
    rootPath: env.STORAGE_ROOT_PATH != null && env.STORAGE_ROOT_PATH !== '' ? resolve(process.cwd(), env.STORAGE_ROOT_PATH) : defaultPath,
    // Public URL for serving files (e.g., http://localhost:8080/uploads)
    publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
  };
}

/**
 * Validates storage configuration for production readiness.
 */
export function validateStorage(config: StorageConfig, isProd: boolean): string[] {
  const errors: string[] = [];

  if (config.provider === 's3') {
    if (config.bucket === '') errors.push('S3_BUCKET is required for S3 storage');
    if (config.region === '') errors.push('S3_REGION is required for S3 storage');
    if (isProd && config.accessKeyId === '') {
      errors.push('S3_ACCESS_KEY_ID is required in production');
    }
    if (isProd && config.secretAccessKey === '') {
      errors.push('S3_SECRET_ACCESS_KEY is required in production');
    }
  }

  return errors;
}
