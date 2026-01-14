// apps/server/src/config/storage.config.ts
/**
 * Storage Configuration
 * Settings for file storage (local or S3)
 */

// ============================================================================
// Types
// ============================================================================

export type StorageProviderName = 'local' | 's3';

export interface StorageConfigBase {
  provider: StorageProviderName;
}

export interface LocalStorageConfig extends StorageConfigBase {
  provider: 'local';
  rootPath: string;
  publicBaseUrl?: string;
}

export interface S3StorageConfig extends StorageConfigBase {
  provider: 's3';
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  presignExpiresInSeconds?: number;
}

export type StorageConfig = LocalStorageConfig | S3StorageConfig;

// ============================================================================
// Config Loader
// ============================================================================

/**
 * Load storage configuration from environment variables
 */
export function loadStorageConfig(env: Record<string, string | undefined>): StorageConfig {
  if (env.STORAGE_PROVIDER === 's3') {
    if (!env.S3_BUCKET || !env.S3_REGION) {
      throw new Error('S3_BUCKET and S3_REGION are required when STORAGE_PROVIDER=s3');
    }
    return {
      provider: 's3',
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      presignExpiresInSeconds: env.S3_PRESIGN_EXPIRES_IN_SECONDS
        ? parseInt(env.S3_PRESIGN_EXPIRES_IN_SECONDS, 10)
        : undefined,
    };
  }

  return {
    provider: 'local',
    rootPath: env.STORAGE_ROOT_PATH ?? './uploads',
    publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
  };
}
