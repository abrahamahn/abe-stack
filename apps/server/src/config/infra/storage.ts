// apps/server/src/config/infra/storage.ts
/**
 * Storage Configuration Loader
 *
 * Supports local filesystem (development) and S3-compatible providers (production).
 * Works with AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces.
 */

import type { StorageConfig, StorageProviderName } from '@abe-stack/core/contracts/config';
import type { FullEnv } from '@abe-stack/core/contracts/config/environment';

/**
 * Loads file storage configuration from environment variables.
 */
export function loadStorage(env: FullEnv): StorageConfig {
  const provider = (env.STORAGE_PROVIDER || 'local') as StorageProviderName;

  if (provider === 's3') {
    return {
      provider: 's3',
      bucket: env.S3_BUCKET || '',
      region: env.S3_REGION || '',
      accessKeyId: env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY || '',
      // Custom endpoint for S3-compatible services (MinIO, R2, Spaces)
      endpoint: env.S3_ENDPOINT,
      // Path-style is required for MinIO and some S3-compatible services
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      // Default presigned URLs to 1 hour
      presignExpiresInSeconds: env.S3_PRESIGN_EXPIRES_IN_SECONDS ?? 3600,
    };
  }

  // Local filesystem storage (development default)
  return {
    provider: 'local',
    // In a monorepo, keep uploads in a known data directory
    rootPath: env.STORAGE_ROOT_PATH || '.data/uploads',
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
    if (!config.bucket) errors.push('S3_BUCKET is required for S3 storage');
    if (!config.region) errors.push('S3_REGION is required for S3 storage');
    if (isProd && !config.accessKeyId) {
      errors.push('S3_ACCESS_KEY_ID is required in production');
    }
    if (isProd && !config.secretAccessKey) {
      errors.push('S3_SECRET_ACCESS_KEY is required in production');
    }
  }

  return errors;
}
