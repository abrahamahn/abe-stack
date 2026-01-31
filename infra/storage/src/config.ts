// infra/storage/src/config.ts
import { resolve } from 'node:path';

import type {
  FullEnv,
  LocalStorageConfig,
  S3StorageConfig,
  StorageConfig,
  StorageProviderName,
} from '@abe-stack/core/config';

/**
 * Load File Storage Configuration.
 *
 * **Strategies**:
 * - **Local**: Stores files on disk (default in dev). Root path is configurable.
 * - **S3**: Uses parameters compatible with AWS S3, Cloudflare R2, MinIO, or DigitalOcean Spaces.
 *
 * @param env - Environment variables
 * @returns Complete storage configuration
 * @complexity O(1)
 */
export function loadStorageConfig(env: FullEnv): StorageConfig {
  const provider = env.STORAGE_PROVIDER as StorageProviderName;

  if (provider === 's3') {
    const config: S3StorageConfig = {
      provider: 's3',
      bucket: env.S3_BUCKET ?? '',
      region: env.S3_REGION ?? '',
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      // Path-style is required for MinIO and some S3-compatible services
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      // Default presigned URLs to 1 hour
      presignExpiresInSeconds: env.S3_PRESIGN_EXPIRES_IN_SECONDS ?? 3600,
    };
    // Custom endpoint for S3-compatible services (MinIO, R2, Spaces)
    if (env.S3_ENDPOINT !== undefined) {
      config.endpoint = env.S3_ENDPOINT;
    }
    return config;
  }

  // Local filesystem storage (development default)
  // Use process.cwd() for portability — not tied to the config file's location
  const defaultPath = resolve(process.cwd(), 'uploads');

  const config: LocalStorageConfig = {
    provider: 'local',
    rootPath: env.STORAGE_ROOT_PATH != null && env.STORAGE_ROOT_PATH !== '' ? resolve(process.cwd(), env.STORAGE_ROOT_PATH) : defaultPath,
  };
  // Public URL for serving files (e.g., http://localhost:8080/uploads)
  if (env.STORAGE_PUBLIC_BASE_URL !== undefined) {
    config.publicBaseUrl = env.STORAGE_PUBLIC_BASE_URL;
  }
  return config;
}

/**
 * Validates storage configuration for production readiness.
 *
 * @param config - Storage configuration to validate
 * @param isProd - Whether the application is running in production
 * @returns Array of validation error messages (empty if valid)
 * @complexity O(1)
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
