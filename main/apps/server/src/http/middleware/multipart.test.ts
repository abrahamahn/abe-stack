// main/apps/server/src/http/middleware/multipart.test.ts
import { describe, expect, test, vi } from 'vitest';

import { parseMultipartFile, registerMultipartFormParser } from './multipart';

import type { FastifyInstance } from 'fastify';

function buildMultipartBody(
  boundary: string,
  filename = 'avatar.jpg',
  mime = 'image/jpeg',
): Buffer {
  const payload =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="avatar"; filename="${filename}"\r\n` +
    `Content-Type: ${mime}\r\n\r\n` +
    'abc123-binary-content' +
    `\r\n--${boundary}--\r\n`;
  return Buffer.from(payload, 'latin1');
}

describe('multipart middleware', () => {
  test('parseMultipartFile extracts file metadata and buffer', () => {
    const boundary = 'test-boundary';
    const body = buildMultipartBody(boundary);
    const parsed = parseMultipartFile(body, `multipart/form-data; boundary=${boundary}`);

    expect(parsed).not.toBeNull();
    expect(parsed?.filename).toBe('avatar.jpg');
    expect(parsed?.mimetype).toBe('image/jpeg');
    expect(parsed?.size).toBeGreaterThan(0);
    expect(parsed?.buffer.toString('latin1')).toContain('abc123-binary-content');
  });

  test('parseMultipartFile returns null when boundary is missing', () => {
    const body = buildMultipartBody('ignored');
    const parsed = parseMultipartFile(body, 'multipart/form-data');
    expect(parsed).toBeNull();
  });

  test('registerMultipartFormParser registers parser that normalizes request body', () => {
    type MultipartParser = (
      request: { headers: Record<string, string> },
      body: Buffer,
      done: (err: Error | null, body?: unknown) => void,
    ) => void;

    let parser: MultipartParser | null = null;

    const server = {
      addContentTypeParser: vi.fn((_, __, handler) => {
        parser = handler as MultipartParser;
      }),
    } as unknown as FastifyInstance;

    registerMultipartFormParser(server);
    expect(parser).not.toBeNull();
    if (parser === null) throw new Error('Parser was not registered');
    const multipartParser: MultipartParser = parser;

    const body = buildMultipartBody('x-boundary');
    let parsedBody: unknown = null;
    multipartParser(
      { headers: { 'content-type': 'multipart/form-data; boundary=x-boundary' } },
      body,
      (err: Error | null, parsed?: unknown) => {
        expect(err).toBeNull();
        parsedBody = parsed;
      },
    );

    expect(parsedBody).toMatchObject({
      filename: 'avatar.jpg',
      mimetype: 'image/jpeg',
    });
  });
});
