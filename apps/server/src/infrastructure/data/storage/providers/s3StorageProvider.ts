// apps/server/src/infrastructure/data/storage/providers/s3StorageProvider.ts
import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { normalizeStorageKey } from '@data/storage/utils';

import type { S3StorageConfig, StorageProvider } from '@data/storage/types';

/** AWS credential provider type derived from fromEnv return type */
type AwsCredentials = ReturnType<typeof fromEnv> | { accessKeyId: string; secretAccessKey: string };

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly defaultExpires: number;

  constructor(private readonly config: S3StorageConfig) {
    const clientConfig: {
      region: string;
      endpoint?: string;
      forcePathStyle: boolean;
      credentials: AwsCredentials;
    } = {
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials:
        config.accessKeyId !== '' && config.secretAccessKey !== ''
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : fromEnv(),
    };
    if (config.endpoint !== undefined) {
      clientConfig.endpoint = config.endpoint;
    }
    this.client = new S3Client(clientConfig);
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
