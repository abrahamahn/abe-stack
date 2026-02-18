// main/server/system/src/storage/providers/s3.client.wrapper.test.ts
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';

import { S3ClientWrapper } from './s3.client.wrapper';

const hoisted = vi.hoisted(() => {
  return {
    getSignedUrl: vi.fn(
      (_client: unknown, _command: unknown, _options: { expiresIn?: number } | undefined) =>
        Promise.resolve('signed-url'),
    ),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return { getSignedUrl: hoisted.getSignedUrl };
});

describe('storage/providers/s3-client-wrapper', () => {
  it('wraps upload/download/delete calls via client.send', async () => {
    const send = vi.fn((cmd: any) => {
      if (cmd instanceof GetObjectCommand) {
        return Promise.resolve({
          Body: {
            transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3])),
            *[Symbol.asyncIterator]() {
              yield new Uint8Array([1]);
            },
          },
        });
      }
      return Promise.resolve({});
    });

    const wrapper = new S3ClientWrapper({ send } as unknown as import('@aws-sdk/client-s3').S3Client);

    await expect(
      wrapper.uploadObject({ bucket: 'b', key: 'k', body: 'x', contentType: 'text/plain' }),
    ).resolves.toEqual({ success: true });
    const firstCall = send.mock.calls[0]?.[0];
    expect(firstCall).toBeInstanceOf(PutObjectCommand);
    if (firstCall instanceof PutObjectCommand) {
      expect(firstCall.input.Bucket).toBe('b');
    }

    const dl = await wrapper.downloadObject({ bucket: 'b', key: 'k' });
    expect(send.mock.calls.some(([c]) => c instanceof GetObjectCommand)).toBe(true);
    expect(dl.Body?.transformToByteArray).toBeTypeOf('function');

    await expect(wrapper.deleteObject({ bucket: 'b', key: 'k' })).resolves.toEqual({
      success: true,
    });
    expect(send.mock.calls.some(([c]) => c instanceof DeleteObjectCommand)).toBe(true);
  });

  it('delegates signed upload url creation to awsGetSignedUrl', async () => {
    const send = vi.fn(() => Promise.resolve({}));
    const wrapper = new S3ClientWrapper({ send } as unknown as import('@aws-sdk/client-s3').S3Client);

    const url = await wrapper.getSignedUploadUrl({ bucket: 'b', key: 'k', expiresIn: 123 });
    expect(url).toBe('signed-url');
    expect(hoisted.getSignedUrl).toHaveBeenCalledTimes(1);

    const args = hoisted.getSignedUrl.mock.calls[0] ?? [];
    expect(args[0]).toEqual({ send });
    expect(args[1]).toBeInstanceOf(PutObjectCommand);
    expect(args[2]).toEqual({ expiresIn: 123 });
  });
});
