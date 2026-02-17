import { Buffer } from 'node:buffer';

import { describe, expect, test } from 'vitest';

import { parseMultipartFile } from './multipart';

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

describe('parseMultipartFile', () => {
  test('extracts file metadata and buffer', () => {
    const boundary = 'test-boundary';
    const body = buildMultipartBody(boundary);
    const parsed = parseMultipartFile(body, `multipart/form-data; boundary=${boundary}`);

    expect(parsed).not.toBeNull();
    expect(parsed?.filename).toBe('avatar.jpg');
    expect(parsed?.mimetype).toBe('image/jpeg');
    expect(parsed?.size).toBeGreaterThan(0);
    expect(parsed?.buffer.toString('latin1')).toContain('abc123-binary-content');
  });

  test('returns null when boundary is missing', () => {
    const body = buildMultipartBody('ignored');
    const parsed = parseMultipartFile(body, 'multipart/form-data');
    expect(parsed).toBeNull();
  });
});
