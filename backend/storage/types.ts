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

export interface UploadParams {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array | string;
}

export interface StorageProvider {
  upload(params: UploadParams): Promise<{ key: string }>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
