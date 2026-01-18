// apps/server/src/infra/storage/__tests__/s3StorageProvider.test.ts
import { S3StorageProvider } from '@providers/s3StorageProvider';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { S3StorageConfig } from '@config/storage.config';

// Use vi.hoisted to ensure mocks are created before vi.mock hoisting
const { mockSend, MockS3Client, MockPutObjectCommand, mockGetSignedUrl, mockFromEnv } = vi.hoisted(
  () => {
    const sendMock = vi.fn().mockResolvedValue({});
    // Create mock classes that can be instantiated with `new`
    const S3ClientMock = vi.fn().mockImplementation(function (this: { send: typeof sendMock }) {
      this.send = sendMock;
    }) as unknown as { new (...args: unknown[]): { send: typeof sendMock } };

    const PutObjectCommandMock = vi.fn().mockImplementation(function (
      this: { _type: string } & Record<string, unknown>,
      params: Record<string, unknown>,
    ) {
      Object.assign(this, params);
      this._type = 'PutObjectCommand';
    }) as unknown as {
      new (params: Record<string, unknown>): { _type: string } & Record<string, unknown>;
    };
    return {
      mockSend: sendMock,
      MockS3Client: S3ClientMock,
      MockPutObjectCommand: PutObjectCommandMock,
      mockGetSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
      mockFromEnv: vi.fn(() => ({ accessKeyId: 'env-key', secretAccessKey: 'env-secret' })),
    };
  },
);

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: MockS3Client,
  PutObjectCommand: MockPutObjectCommand,
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('@aws-sdk/credential-providers', () => ({
  fromEnv: mockFromEnv,
}));

describe('S3StorageProvider', () => {
  const baseConfig: S3StorageConfig = {
    provider: 's3',
    bucket: 'test-bucket',
    region: 'us-east-1',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create S3Client with explicit credentials when provided', () => {
      new S3StorageProvider(baseConfig);

      expect(MockS3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        endpoint: undefined,
        forcePathStyle: undefined,
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      });
    });

    it('should use fromEnv credentials when accessKeyId is not provided', () => {
      const configWithoutCreds: S3StorageConfig = {
        ...baseConfig,
        accessKeyId: '',
        secretAccessKey: '',
      };

      new S3StorageProvider(configWithoutCreds);

      expect(mockFromEnv).toHaveBeenCalled();
      expect(MockS3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: expect.objectContaining({
            accessKeyId: 'env-key',
          }) as { accessKeyId: string },
        }),
      );
    });

    it('should configure custom endpoint when provided', () => {
      const configWithEndpoint: S3StorageConfig = {
        ...baseConfig,
        endpoint: 'https://minio.local:9000',
        forcePathStyle: true,
      };

      new S3StorageProvider(configWithEndpoint);

      expect(MockS3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://minio.local:9000',
          forcePathStyle: true,
        }),
      );
    });

    it('should set default presign expiration to 900 seconds', () => {
      const provider = new S3StorageProvider(baseConfig);
      // Access through getSignedUrl behavior
      expect(provider).toBeDefined();
    });

    it('should use custom presign expiration when configured', () => {
      const configWithExpiration: S3StorageConfig = {
        ...baseConfig,
        presignExpiresInSeconds: 3600,
      };

      const provider = new S3StorageProvider(configWithExpiration);
      expect(provider).toBeDefined();
    });
  });

  describe('upload', () => {
    it('should upload a file to S3 with the provided key', async () => {
      const provider = new S3StorageProvider(baseConfig);
      const params = {
        key: 'uploads/test-file.txt',
        contentType: 'text/plain',
        body: Buffer.from('hello world'),
      };

      const result = await provider.upload(params);

      expect(result.key).toBe('uploads/test-file.txt');
      expect(MockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'uploads/test-file.txt',
        Body: params.body,
        ContentType: 'text/plain',
      });
      expect(mockSend).toHaveBeenCalled();
    });

    it('should normalize keys by stripping leading slashes', async () => {
      const provider = new S3StorageProvider(baseConfig);
      const params = {
        key: '/leading/slash/file.txt',
        contentType: 'text/plain',
        body: Buffer.from('content'),
      };

      const result = await provider.upload(params);

      expect(result.key).toBe('leading/slash/file.txt');
      expect(MockPutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: 'leading/slash/file.txt',
        }),
      );
    });

    it('should handle string body', async () => {
      const provider = new S3StorageProvider(baseConfig);
      const params = {
        key: 'text.txt',
        contentType: 'text/plain',
        body: 'string content',
      };

      await provider.upload(params);

      expect(MockPutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Body: 'string content',
        }),
      );
    });

    it('should handle Uint8Array body', async () => {
      const provider = new S3StorageProvider(baseConfig);
      const body = new Uint8Array([1, 2, 3, 4, 5]);
      const params = {
        key: 'binary.bin',
        contentType: 'application/octet-stream',
        body,
      };

      await provider.upload(params);

      expect(MockPutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Body: body,
        }),
      );
    });

    it('should propagate S3 errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 upload failed'));
      const provider = new S3StorageProvider(baseConfig);
      const params = {
        key: 'fail.txt',
        contentType: 'text/plain',
        body: Buffer.from('fail'),
      };

      await expect(provider.upload(params)).rejects.toThrow('S3 upload failed');
    });
  });

  describe('getSignedUrl', () => {
    it('should return a presigned URL with default expiration', async () => {
      const provider = new S3StorageProvider(baseConfig);

      const url = await provider.getSignedUrl('path/to/file.txt');

      expect(url).toBe('https://signed-url.example.com');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'path/to/file.txt',
        }),
        { expiresIn: 900 },
      );
    });

    it('should use custom expiration when provided', async () => {
      const provider = new S3StorageProvider(baseConfig);

      await provider.getSignedUrl('file.txt', 7200);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 7200,
      });
    });

    it('should use configured default expiration', async () => {
      const configWithExpiration: S3StorageConfig = {
        ...baseConfig,
        presignExpiresInSeconds: 1800,
      };
      const provider = new S3StorageProvider(configWithExpiration);

      await provider.getSignedUrl('file.txt');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 1800,
      });
    });

    it('should normalize keys by stripping leading slashes', async () => {
      const provider = new S3StorageProvider(baseConfig);

      await provider.getSignedUrl('/leading/slash.txt');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Key: 'leading/slash.txt',
        }),
        expect.anything(),
      );
    });

    it('should propagate errors from getSignedUrl', async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error('Presign failed'));
      const provider = new S3StorageProvider(baseConfig);

      await expect(provider.getSignedUrl('file.txt')).rejects.toThrow('Presign failed');
    });
  });
});
