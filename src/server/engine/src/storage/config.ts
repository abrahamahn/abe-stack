// src/server/engine/src/storage/config.ts
import type { LocalStorageConfig, S3StorageConfig, StorageConfig } from './types';

/**
 * Load storage configuration from environment variables
 */
export function loadStorageConfig(): StorageConfig {
  const providerEnv = process.env['STORAGE_PROVIDER'];
  const provider = providerEnv === 's3' ? 's3' : 'local';

  if (provider === 's3') {
    const s3Config: S3StorageConfig = {
      provider: 's3',
      bucket: process.env['S3_BUCKET'] ?? '',
      region: process.env['S3_REGION'] ?? 'us-east-1',
      accessKeyId: process.env['S3_ACCESS_KEY_ID'] ?? '',
      secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'] ?? '',
      forcePathStyle: process.env['S3_FORCE_PATH_STYLE'] === 'true',
      presignExpiresInSeconds: 3600,
      maxFileSize: 10 * 1024 * 1024, // 10MB default
      allowedTypes: ['*'], // Allow all types by default
    };
    const endpoint = process.env['S3_ENDPOINT'];
    if (endpoint !== undefined) {
      s3Config.endpoint = endpoint;
    }
    return s3Config;
  }

  const localConfig: LocalStorageConfig = {
    provider: 'local',
    rootPath: process.env['STORAGE_ROOT_PATH'] ?? './storage',
    maxFileSize: 10 * 1024 * 1024, // 10MB default
    allowedTypes: ['*'], // Allow all types by default
  };
  const publicBaseUrl = process.env['STORAGE_PUBLIC_BASE_URL'];
  if (publicBaseUrl !== undefined) {
    localConfig.publicBaseUrl = publicBaseUrl;
  }
  return localConfig;
}

/**
 * Validate storage configuration
 */
export function validateStorage(config: StorageConfig): void {
  if (config.provider === 's3') {
    if (config.bucket === '') throw new Error('S3_BUCKET is required');
    if (config.accessKeyId === '') throw new Error('S3_ACCESS_KEY_ID is required');
    if (config.secretAccessKey === '') throw new Error('S3_SECRET_ACCESS_KEY is required');
  } else {
    if (config.rootPath === '') throw new Error('STORAGE_ROOT_PATH is required');
  }
}
