// main/shared/src/system/http/multipart.test.ts
import { Buffer } from 'node:buffer';

import { describe, expect, test } from 'vitest';

import { parseMultipartFile } from './multipart';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function buildMultipartBodyWithParts(
  boundary: string,
  parts: Array<{ name: string; filename?: string; mime?: string; content: string }>,
): Buffer {
  let payload = '';
  for (const part of parts) {
    payload += `--${boundary}\r\n`;
    if (part.filename !== undefined) {
      payload += `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`;
      payload += `Content-Type: ${part.mime ?? 'application/octet-stream'}\r\n`;
    } else {
      payload += `Content-Disposition: form-data; name="${part.name}"\r\n`;
    }
    payload += `\r\n${part.content}\r\n`;
  }
  payload += `--${boundary}--\r\n`;
  return Buffer.from(payload, 'latin1');
}

// ---------------------------------------------------------------------------
// Original passing tests
// ---------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Adversarial — boundary extraction failures
  // -------------------------------------------------------------------------
  describe('adversarial — boundary extraction', () => {
    test('returns null for completely empty content-type', () => {
      const body = buildMultipartBody('b');
      expect(parseMultipartFile(body, '')).toBeNull();
    });

    test('returns null for content-type with boundary= but empty value', () => {
      const body = buildMultipartBody('b');
      expect(parseMultipartFile(body, 'multipart/form-data; boundary=')).toBeNull();
    });

    test('returns null for content-type with boundary= whitespace only', () => {
      const body = buildMultipartBody('b');
      expect(parseMultipartFile(body, 'multipart/form-data; boundary=   ')).toBeNull();
    });

    test('returns null when boundary in header does not match body boundary', () => {
      const body = buildMultipartBody('real-boundary');
      const parsed = parseMultipartFile(body, 'multipart/form-data; boundary=wrong-boundary');
      // Split on wrong boundary produces no valid parts
      expect(parsed).toBeNull();
    });

    test('handles quoted boundary value', () => {
      const boundary = 'quoted-bound';
      const body = buildMultipartBody(boundary);
      const parsed = parseMultipartFile(body, `multipart/form-data; boundary="${boundary}"`);
      expect(parsed?.filename).toBe('avatar.jpg');
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — empty / degenerate bodies
  // -------------------------------------------------------------------------
  describe('adversarial — degenerate bodies', () => {
    test('returns null for completely empty buffer', () => {
      expect(parseMultipartFile(Buffer.alloc(0), 'multipart/form-data; boundary=b')).toBeNull();
    });

    test('returns null for body containing only the boundary markers', () => {
      const boundary = 'empty';
      const body = Buffer.from(`--${boundary}\r\n--${boundary}--\r\n`, 'latin1');
      expect(parseMultipartFile(body, `multipart/form-data; boundary=${boundary}`)).toBeNull();
    });

    test('returns null when part has no header/body separator (missing double CRLF)', () => {
      const boundary = 'nosep';
      // Part with header block but no \r\n\r\n separator
      const raw =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="f"; filename="x.txt"\r\n` +
        `Content-Type: text/plain` +
        // No \r\n\r\n — no body separator
        `\r\n--${boundary}--\r\n`;
      expect(
        parseMultipartFile(Buffer.from(raw, 'latin1'), `multipart/form-data; boundary=${boundary}`),
      ).toBeNull();
    });

    test('skips form-data field parts without filename and returns null when no file exists', () => {
      const boundary = 'mixed';
      const body = buildMultipartBodyWithParts(boundary, [
        { name: 'username', content: 'alice' },
        { name: 'email', content: 'alice@example.com' },
      ]);
      expect(parseMultipartFile(body, `multipart/form-data; boundary=${boundary}`)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — filename edge cases
  // -------------------------------------------------------------------------
  describe('adversarial — filename edge cases', () => {
    test('skips parts with empty filename and returns null when no valid file exists', () => {
      const boundary = 'emptyname';
      const raw =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename=""\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n` +
        `content` +
        `\r\n--${boundary}--\r\n`;
      expect(
        parseMultipartFile(Buffer.from(raw, 'latin1'), `multipart/form-data; boundary=${boundary}`),
      ).toBeNull();
    });

    test('returns file when first non-file part is skipped and file part follows', () => {
      const boundary = 'mixed2';
      const body = buildMultipartBodyWithParts(boundary, [
        { name: 'description', content: 'a photo' },
        { name: 'photo', filename: 'pic.png', mime: 'image/png', content: 'PNG-BYTES' },
      ]);
      const parsed = parseMultipartFile(body, `multipart/form-data; boundary=${boundary}`);
      expect(parsed?.filename).toBe('pic.png');
    });

    test('handles very long filename (512 chars) without throwing', () => {
      const longName = `${'a'.repeat(500)}.jpg`;
      const body = buildMultipartBody('b', longName);
      const parsed = parseMultipartFile(body, 'multipart/form-data; boundary=b');
      expect(parsed?.filename).toBe(longName);
    });

    test('handles filename with special characters (spaces, parens)', () => {
      const name = 'my file (final).jpg';
      const body = buildMultipartBody('b', name);
      const parsed = parseMultipartFile(body, 'multipart/form-data; boundary=b');
      expect(parsed?.filename).toBe(name);
    });

    test('decodes percent-encoded characters in filename', () => {
      const boundary = 'pct';
      const raw =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="f"; filename="hello%20world.txt"\r\n` +
        `Content-Type: text/plain\r\n\r\n` +
        `data` +
        `\r\n--${boundary}--\r\n`;
      const parsed = parseMultipartFile(
        Buffer.from(raw, 'latin1'),
        `multipart/form-data; boundary=${boundary}`,
      );
      // %20 decoded to space
      expect(parsed?.filename).toBe('hello world.txt');
    });

    test('handles null byte in filename without crashing', () => {
      // Null bytes are not filtered by the parser — we verify no exception
      const name = 'file\x00.jpg';
      const body = buildMultipartBody('b', name);
      expect(() => parseMultipartFile(body, 'multipart/form-data; boundary=b')).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — content-disposition injection
  // -------------------------------------------------------------------------
  describe('adversarial — content-disposition injection', () => {
    test('ignores injected newline in content-disposition that would split headers', () => {
      // A crafted part where content-disposition contains \r\n — parseHeaders
      // splits on \r\n so an attacker could inject fake headers
      const boundary = 'inject';
      const raw =
        `--${boundary}\r\n` +
        // Injected \r\n in the middle of the disposition value
        `Content-Disposition: form-data; name="f"; filename="evil\r\nX-Injected: header"\r\n` +
        `Content-Type: text/plain\r\n\r\n` +
        `payload` +
        `\r\n--${boundary}--\r\n`;
      // Should not crash; filename will be truncated at injected CRLF
      expect(() =>
        parseMultipartFile(Buffer.from(raw, 'latin1'), `multipart/form-data; boundary=${boundary}`),
      ).not.toThrow();
    });

    test('does not expose header injection via specially crafted filename', () => {
      const boundary = 'inj2';
      const maliciousFilename = 'x"; name="injected-field';
      const body = buildMultipartBody(boundary, maliciousFilename);
      const parsed = parseMultipartFile(body, `multipart/form-data; boundary=${boundary}`);
      // The injected segment is captured literally inside the outer quotes
      if (parsed !== null) {
        expect(parsed.filename).not.toContain('injected-field');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — MIME type defaults
  // -------------------------------------------------------------------------
  describe('adversarial — mime type defaults', () => {
    test('defaults mimetype to application/octet-stream when content-type header is absent', () => {
      const boundary = 'nomime';
      const raw =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="f"; filename="blob.bin"\r\n` +
        `\r\n` +
        `binary` +
        `\r\n--${boundary}--\r\n`;
      const parsed = parseMultipartFile(
        Buffer.from(raw, 'latin1'),
        `multipart/form-data; boundary=${boundary}`,
      );
      expect(parsed?.mimetype).toBe('application/octet-stream');
    });

    test('preserves exact mimetype when provided', () => {
      const parsed = parseMultipartFile(
        buildMultipartBody('b', 'f.pdf', 'application/pdf'),
        'multipart/form-data; boundary=b',
      );
      expect(parsed?.mimetype).toBe('application/pdf');
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — binary content integrity
  // -------------------------------------------------------------------------
  describe('adversarial — binary content integrity', () => {
    test('preserves binary content exactly via latin1 round-trip', () => {
      const boundary = 'bin';
      const binaryContent = Buffer.from([0x00, 0x01, 0xfe, 0xff, 0x80, 0x7f]);
      const raw =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="f"; filename="raw.bin"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n` +
        binaryContent.toString('latin1') +
        `\r\n--${boundary}--\r\n`;
      const parsed = parseMultipartFile(
        Buffer.from(raw, 'latin1'),
        `multipart/form-data; boundary=${boundary}`,
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.buffer).toEqual(binaryContent);
    });

    test('size matches buffer length', () => {
      const parsed = parseMultipartFile(
        buildMultipartBody('b', 'f.jpg'),
        'multipart/form-data; boundary=b',
      );
      expect(parsed?.size).toBe(parsed?.buffer.length);
    });

    test('originalName matches filename', () => {
      const parsed = parseMultipartFile(
        buildMultipartBody('b', 'photo.png', 'image/png'),
        'multipart/form-data; boundary=b',
      );
      expect(parsed?.originalName).toBe(parsed?.filename);
    });
  });
});
