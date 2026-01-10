import type { StorageConfig } from './types';
import type { ServerEnv } from '../api';

/**
 * Convert server environment variables to StorageConfig
 */
export function toStorageConfig(env: ServerEnv): StorageConfig {
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
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      presignExpiresInSeconds: env.S3_PRESIGN_EXPIRES_IN_SECONDS,
    };
  }

  return {
    provider: 'local',
    rootPath: env.STORAGE_ROOT_PATH,
    publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
  };
}
