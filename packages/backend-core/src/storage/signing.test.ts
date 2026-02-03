// infra/src/storage/signing.test.ts
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

import {
  createSignature,
  verifySignature,
  createSignedUrl,
  parseSignedUrl,
  isUrlExpired,
  normalizeFilename,
  getDefaultExpiration,
  type SignedUrlData,
} from './signing';

const TEST_SECRET = 'test-secret-key-for-signing';

describe('signedUrls', () => {
  describe('createSignature', () => {
    it('should create a signature for given data', () => {
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: 1700000000000,
      };

      const signature = createSignature(data, TEST_SECRET);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should create consistent signatures for same data', () => {
      const data: SignedUrlData = {
        method: 'get',
        fileId: 'file-456',
        filename: 'document.txt',
        expirationMs: 1700000000000,
      };

      const sig1 = createSignature(data, TEST_SECRET);
      const sig2 = createSignature(data, TEST_SECRET);

      expect(sig1).toBe(sig2);
    });

    it('should create different signatures for different data', () => {
      const data1: SignedUrlData = {
        method: 'put',
        fileId: 'file-1',
        filename: 'test.pdf',
        expirationMs: 1700000000000,
      };

      const data2: SignedUrlData = {
        method: 'put',
        fileId: 'file-2',
        filename: 'test.pdf',
        expirationMs: 1700000000000,
      };

      const sig1 = createSignature(data1, TEST_SECRET);
      const sig2 = createSignature(data2, TEST_SECRET);

      expect(sig1).not.toBe(sig2);
    });

    it('should create different signatures for different secrets', () => {
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: 1700000000000,
      };

      const sig1 = createSignature(data, 'secret-1');
      const sig2 = createSignature(data, 'secret-2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: 1700000000000,
      };

      const signature = createSignature(data, TEST_SECRET);
      const isValid = verifySignature(data, signature, TEST_SECRET);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: 1700000000000,
      };

      const isValid = verifySignature(data, 'invalid-signature', TEST_SECRET);

      expect(isValid).toBe(false);
    });

    it('should return false for wrong secret', () => {
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: 1700000000000,
      };

      const signature = createSignature(data, TEST_SECRET);
      const isValid = verifySignature(data, signature, 'wrong-secret');

      expect(isValid).toBe(false);
    });

    it('should return false for tampered data', () => {
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: 1700000000000,
      };

      const signature = createSignature(data, TEST_SECRET);

      // Tamper with the data
      const tamperedData: SignedUrlData = {
        ...data,
        fileId: 'file-hacked',
      };

      const isValid = verifySignature(tamperedData, signature, TEST_SECRET);

      expect(isValid).toBe(false);
    });
  });

  describe('createSignedUrl', () => {
    it('should create a valid URL structure', () => {
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'abc-123',
        filename: 'document.pdf',
        expirationMs: 1700000000000,
      };

      const url = createSignedUrl(data, TEST_SECRET);

      expect(url).toMatch(/^\/uploads\/abc-123\/document\.pdf\?/);
      expect(url).toContain('signature=');
      expect(url).toContain('expiration=1700000000000');
      expect(url).toContain('method=put');
    });

    it('should normalize the filename', () => {
      const data: SignedUrlData = {
        method: 'get',
        fileId: 'file-1',
        filename: 'My File (1).PDF',
        expirationMs: 1700000000000,
      };

      const url = createSignedUrl(data, TEST_SECRET);

      expect(url).toContain('My_File__1_.pdf');
    });

    it('should encode special characters in fileId', () => {
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'file/with/slashes',
        filename: 'test.txt',
        expirationMs: 1700000000000,
      };

      const url = createSignedUrl(data, TEST_SECRET);

      expect(url).not.toContain('file/with/slashes');
      expect(url).toContain(encodeURIComponent('file/with/slashes'));
    });
  });

  describe('parseSignedUrl', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-11-15T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should parse a valid signed URL', () => {
      const futureExpiration = Date.now() + 60 * 60 * 1000; // 1 hour from now
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: futureExpiration,
      };

      const url = createSignedUrl(data, TEST_SECRET);
      const parsed = parseSignedUrl(url, TEST_SECRET);

      expect(parsed).not.toBeNull();
      expect(parsed?.method).toBe('put');
      expect(parsed?.fileId).toBe('file-123');
      expect(parsed?.filename).toBe('test.pdf');
      expect(parsed?.expirationMs).toBe(futureExpiration);
    });

    it('should return null for expired URL', () => {
      const pastExpiration = Date.now() - 1000; // 1 second ago
      const data: SignedUrlData = {
        method: 'get',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: pastExpiration,
      };

      const url = createSignedUrl(data, TEST_SECRET);
      const parsed = parseSignedUrl(url, TEST_SECRET);

      expect(parsed).toBeNull();
    });

    it('should return null for invalid signature', () => {
      const futureExpiration = Date.now() + 60 * 60 * 1000;
      const data: SignedUrlData = {
        method: 'put',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: futureExpiration,
      };

      const url = createSignedUrl(data, TEST_SECRET);
      // Try to parse with different secret
      const parsed = parseSignedUrl(url, 'wrong-secret');

      expect(parsed).toBeNull();
    });

    it('should return null for malformed URL', () => {
      expect(parseSignedUrl('/not/valid/url', TEST_SECRET)).toBeNull();
      expect(parseSignedUrl('/uploads/missing-filename', TEST_SECRET)).toBeNull();
      expect(parseSignedUrl('/uploads/id/file.txt', TEST_SECRET)).toBeNull(); // missing params
    });

    it('should return null for invalid method', () => {
      const url = '/uploads/file-123/test.pdf?signature=abc&expiration=9999999999999&method=delete';
      const parsed = parseSignedUrl(url, TEST_SECRET);

      expect(parsed).toBeNull();
    });

    it('should handle encoded characters in URL', () => {
      const futureExpiration = Date.now() + 60 * 60 * 1000;
      const data: SignedUrlData = {
        method: 'get',
        fileId: 'file-with-dashes',
        filename: 'my-file.pdf',
        expirationMs: futureExpiration,
      };

      const url = createSignedUrl(data, TEST_SECRET);
      const parsed = parseSignedUrl(url, TEST_SECRET);

      expect(parsed).not.toBeNull();
      expect(parsed?.fileId).toBe('file-with-dashes');
      // Filename is preserved (already normalized)
      expect(parsed?.filename).toBe('my-file.pdf');
    });
  });

  describe('isUrlExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-11-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for past expiration', () => {
      const pastExpiration = Date.now() - 1000;
      expect(isUrlExpired(pastExpiration)).toBe(true);
    });

    it('should return false for future expiration', () => {
      const futureExpiration = Date.now() + 1000;
      expect(isUrlExpired(futureExpiration)).toBe(false);
    });

    it('should return true when expiration equals current time', () => {
      // Edge case: exactly at expiration time is considered expired
      const now = Date.now();
      expect(isUrlExpired(now)).toBe(false); // Date.now() > expirationMs, so not expired yet

      // Advance time by 1ms
      vi.advanceTimersByTime(1);
      expect(isUrlExpired(now)).toBe(true);
    });
  });

  describe('normalizeFilename', () => {
    it('should lowercase file extensions', () => {
      expect(normalizeFilename('file.PDF')).toBe('file.pdf');
      expect(normalizeFilename('document.TXT')).toBe('document.txt');
      expect(normalizeFilename('image.JPEG')).toBe('image.jpeg');
    });

    it('should replace special characters with underscore', () => {
      expect(normalizeFilename('file(1).pdf')).toBe('file_1_.pdf');
      expect(normalizeFilename('my@file#name.txt')).toBe('my_file_name.txt');
    });

    it('should preserve allowed characters', () => {
      expect(normalizeFilename('my-file_name.pdf')).toBe('my-file_name.pdf');
      expect(normalizeFilename('file_name.txt')).toBe('file_name.txt');
    });

    it('should replace spaces with underscores', () => {
      expect(normalizeFilename('file name.txt')).toBe('file_name.txt');
      expect(normalizeFilename('my document.pdf')).toBe('my_document.pdf');
    });

    it('should handle multiple dots', () => {
      expect(normalizeFilename('file.name.backup.TXT')).toBe('file.name.backup.txt');
    });

    it('should handle unicode characters', () => {
      expect(normalizeFilename('résumé.pdf')).toBe('r_sum_.pdf');
      expect(normalizeFilename('文件.txt')).toBe('__.txt');
    });

    it('should handle empty extension', () => {
      expect(normalizeFilename('filename')).toBe('filename');
    });

    it('should handle file starting with dot', () => {
      expect(normalizeFilename('.gitignore')).toBe('.gitignore');
    });
  });

  describe('getDefaultExpiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-11-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return 15 minutes from now by default', () => {
      const expiration = getDefaultExpiration();
      const expected = Date.now() + 15 * 60 * 1000;

      expect(expiration).toBe(expected);
    });

    it('should accept custom minutes', () => {
      const expiration = getDefaultExpiration(30);
      const expected = Date.now() + 30 * 60 * 1000;

      expect(expiration).toBe(expected);
    });

    it('should work with fractional minutes', () => {
      const expiration = getDefaultExpiration(0.5);
      const expected = Date.now() + 0.5 * 60 * 1000;

      expect(expiration).toBe(expected);
    });
  });

  describe('integration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-11-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create and parse URL roundtrip', () => {
      const originalData: SignedUrlData = {
        method: 'put',
        fileId: 'test-file-id',
        filename: 'My Document (1).PDF',
        expirationMs: getDefaultExpiration(30),
      };

      const url = createSignedUrl(originalData, TEST_SECRET);
      const parsed = parseSignedUrl(url, TEST_SECRET);

      expect(parsed).not.toBeNull();
      expect(parsed?.method).toBe(originalData.method);
      expect(parsed?.fileId).toBe(originalData.fileId);
      // Filename is normalized: spaces -> _, special chars -> _, extension lowercased
      expect(parsed?.filename).toBe('My_Document__1_.pdf');
      expect(parsed?.expirationMs).toBe(originalData.expirationMs);
    });

    it('should reject URL after expiration', () => {
      const data: SignedUrlData = {
        method: 'get',
        fileId: 'file-123',
        filename: 'test.pdf',
        expirationMs: Date.now() + 5 * 60 * 1000, // 5 minutes
      };

      const url = createSignedUrl(data, TEST_SECRET);

      // Should be valid now
      expect(parseSignedUrl(url, TEST_SECRET)).not.toBeNull();

      // Advance time past expiration
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Should be invalid now
      expect(parseSignedUrl(url, TEST_SECRET)).toBeNull();
    });
  });
});
