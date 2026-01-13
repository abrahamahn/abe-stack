// apps/server/src/infra/storage/s3StorageProvider.ts
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { normalizeStorageKey } from './utils/normalizeKey';

import type { S3StorageConfig, StorageProvider, UploadParams } from './types';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly defaultExpires: number;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : fromEnv(),
    });
    this.defaultExpires = config.presignExpiresInSeconds ?? 900; // 15 minutes
  }

  async upload(params: UploadParams): Promise<{ key: string }> {
    const key = normalizeStorageKey(params.key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
    return { key };
  }

  async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: normalizeStorageKey(key),
    });
    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds ?? this.defaultExpires,
    });
  }
}
