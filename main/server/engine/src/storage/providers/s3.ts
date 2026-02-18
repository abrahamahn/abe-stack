// main/server/engine/src/storage/providers/s3.ts
import { S3Client } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';

import { normalizeStorageKey } from '../signing';

import { S3ClientWrapper } from './s3-client-wrapper';

import type { ReadableStreamLike } from '@bslt/shared';
import type { S3StorageConfig, StorageProvider } from '../index';

type AwsCredentials = ReturnType<typeof fromEnv> | { accessKeyId: string; secretAccessKey: string };

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3ClientWrapper;
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
    const s3Client = new S3Client(clientConfig);
    this.client = new S3ClientWrapper(s3Client);
    this.defaultExpires = config.presignExpiresInSeconds;
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    contentType: string,
  ): Promise<string> {
    const finalKey = normalizeStorageKey(key);
    await this.client.uploadObject({
      bucket: this.config.bucket,
      key: finalKey,
      body: data,
      contentType,
    });
    return finalKey;
  }

  async download(key: string): Promise<Buffer> {
    const result = await this.client.downloadObject({
      bucket: this.config.bucket,
      key: normalizeStorageKey(key),
    });

    const body = result.Body;
    if (body === undefined) {
      throw new Error(`Empty body returned for S3 key: ${key}`);
    }

    const byteArray: Uint8Array = await body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async downloadStream(key: string): Promise<ReadableStreamLike<Uint8Array>> {
    const result = await this.client.downloadObject({
      bucket: this.config.bucket,
      key: normalizeStorageKey(key),
    });

    const body = result.Body;
    if (body === undefined) {
      throw new Error(`Empty body returned for S3 key: ${key}`);
    }

    return {
      getReader: (): {
        read(): Promise<{ done: boolean; value?: Uint8Array }>;
        releaseLock(): void;
      } => {
        const iterator = body[Symbol.asyncIterator]();
        return {
          read: async (): Promise<{ done: boolean; value?: Uint8Array }> => {
            const chunk = await iterator.next();
            if (chunk.done === true) {
              return { done: true };
            }
            return { done: false, value: chunk.value };
          },
          releaseLock: (): void => {
            // Clean up the async iterator to release the underlying HTTP connection.
            // Without this, abandoned streams keep the S3 response socket open.
            if (typeof iterator.return === 'function') {
              void iterator.return(undefined);
            }
          },
        };
      },
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.deleteObject({
      bucket: this.config.bucket,
      key: normalizeStorageKey(key),
    });
  }

  async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return this.client.getSignedUploadUrl({
      bucket: this.config.bucket,
      key: normalizeStorageKey(key),
      expiresIn: expiresInSeconds ?? this.defaultExpires,
    });
  }
}
