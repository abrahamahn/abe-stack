// main/server/system/src/storage/providers/s3-client-wrapper.ts
/**
 * S3 Client Wrapper
 *
 * Wraps AWS SDK S3 client to provide type-safe interfaces that ESLint can resolve.
 * This is necessary because ESLint's TypeScript parser has difficulty resolving
 * types from external packages in monorepo configurations.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Result of an S3 upload operation.
 */
export interface S3UploadResult {
  success: true;
}

/**
 * Body stream from S3 with transform capability.
 */
export interface S3BodyStream {
  transformToByteArray: () => Promise<Uint8Array>;
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
}

/**
 * Result of an S3 download operation.
 */
export interface S3DownloadResult {
  Body?: S3BodyStream;
}

/**
 * Result of an S3 delete operation.
 */
export interface S3DeleteResult {
  success: true;
}

/**
 * Wrapper for S3Client that provides type-safe methods.
 */
export class S3ClientWrapper {
  constructor(private readonly client: S3Client) {}

  async uploadObject(params: {
    bucket: string;
    key: string;
    body: Buffer | Uint8Array | string;
    contentType: string;
  }): Promise<S3UploadResult> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    });
    await this.client.send(command);
    return { success: true };
  }

  async downloadObject(params: { bucket: string; key: string }): Promise<S3DownloadResult> {
    const command = new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });
    const result = await this.client.send(command);
    const downloadResult: S3DownloadResult = {};
    if (result.Body !== undefined) {
      downloadResult.Body = result.Body as S3BodyStream;
    }
    return downloadResult;
  }

  async deleteObject(params: { bucket: string; key: string }): Promise<S3DeleteResult> {
    const command = new DeleteObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });
    await this.client.send(command);
    return { success: true };
  }

  async getSignedUploadUrl(params: {
    bucket: string;
    key: string;
    expiresIn: number;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });
    return awsGetSignedUrl(this.client, command, {
      expiresIn: params.expiresIn,
    });
  }

  getUnderlyingClient(): S3Client {
    return this.client;
  }
}
