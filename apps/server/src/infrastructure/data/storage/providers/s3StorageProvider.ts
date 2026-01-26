// apps/server/src/infrastructure/data/storage/providers/s3StorageProvider.ts
import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { normalizeStorageKey } from '@storage/utils';

import type { S3StorageConfig, StorageProvider } from '@storage/types';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly defaultExpires: number;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials:
         (config.accessKeyId !== '' && config.secretAccessKey !== '')
           ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : fromEnv(),
    });
    this.defaultExpires = config.presignExpiresInSeconds;
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    contentType: string,
  ): Promise<string> {
    const finalKey = normalizeStorageKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: finalKey,
        Body: data,
        ContentType: contentType,
      }),
    );
    return finalKey;
  }

  async download(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: normalizeStorageKey(key),
      }),
    );

    if (result.Body == null) {
      throw new Error(`Empty body returned for S3 key: ${key}`);
    }

    const byteArray = await result.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: normalizeStorageKey(key),
      }),
    );
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
