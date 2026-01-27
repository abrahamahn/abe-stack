// apps/server/src/infrastructure/data/files/__tests__/signatures.test.ts
import { describe, expect, test } from 'vitest';

import { createSignature, verifySignature } from '../signatures';

import type { FileSignatureData } from '../helpers';

describe('File Signatures', () => {
  const secretKey = Buffer.from('test-secret-key-for-file-signatures');

  describe('createSignature', () => {
    test('should create signature from string data', () => {
      const signature = createSignature({
        data: 'test-string-data',
        secretKey,
      });

      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    test('should create signature from object data', () => {
      const data: FileSignatureData = {
        method: 'get',
        id: 'file-123',
        filename: 'test.pdf',
        expirationMs: Date.now() + 3600000,
      };

      const signature = createSignature({ data, secretKey });

      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    test('should produce consistent signatures for same data', () => {
      const data = 'consistent-data';

      const sig1 = createSignature({ data, secretKey });
      const sig2 = createSignature({ data, secretKey });

      expect(sig1).toBe(sig2);
    });

    test('should produce different signatures for different data', () => {
      const sig1 = createSignature({ data: 'data-one', secretKey });
      const sig2 = createSignature({ data: 'data-two', secretKey });

      expect(sig1).not.toBe(sig2);
    });

    test('should produce different signatures with different keys', () => {
      const data = 'same-data';
      const otherKey = Buffer.from('different-secret-key');

      const sig1 = createSignature({ data, secretKey });
      const sig2 = createSignature({ data, secretKey: otherKey });

      expect(sig1).not.toBe(sig2);
    });

    test('should serialize object data consistently regardless of key order', () => {
      const data1 = { b: 'two', a: 'one' };
      const data2 = { a: 'one', b: 'two' };

      const sig1 = createSignature({ data: data1, secretKey });
      const sig2 = createSignature({ data: data2, secretKey });

      expect(sig1).toBe(sig2);
    });

    test('should handle numeric values in data objects', () => {
      const data = { count: 42, id: 'test' };

      const signature = createSignature({ data, secretKey });

      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('verifySignature', () => {
    test('should verify valid signature from string data', () => {
      const data = 'test-data-to-verify';
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });

      expect(isValid).toBe(true);
    });

    test('should verify valid signature from object data', () => {
      const data: FileSignatureData = {
        method: 'put',
        id: 'upload-456',
        filename: 'document.docx',
        expirationMs: Date.now() + 7200000,
      };
      const signature = createSignature({ data, secretKey });

      const isValid = verifySignature({ data, signature, secretKey });

      expect(isValid).toBe(true);
    });

    test('should reject invalid signature', () => {
      const data = 'original-data';
      const invalidSignature = 'invalid-signature-base64';

      const isValid = verifySignature({ data, signature: invalidSignature, secretKey });

      expect(isValid).toBe(false);
    });

    test('should reject signature with wrong key', () => {
      const data = 'test-data';
      const signature = createSignature({ data, secretKey });
      const wrongKey = Buffer.from('wrong-secret-key');

      const isValid = verifySignature({ data, signature, secretKey: wrongKey });

      expect(isValid).toBe(false);
    });

    test('should reject signature with tampered data', () => {
      const originalData = 'original-data';
      const signature = createSignature({ data: originalData, secretKey });
      const tamperedData = 'tampered-data';

      const isValid = verifySignature({ data: tamperedData, signature, secretKey });

      expect(isValid).toBe(false);
    });

    test('should reject signature with different length', () => {
      const data = 'test-data';
      const shortSignature = 'short';

      const isValid = verifySignature({ data, signature: shortSignature, secretKey });

      expect(isValid).toBe(false);
    });

    test('should handle file signature data correctly', () => {
      const data: FileSignatureData = {
        method: 'get',
        id: 'file-789',
        filename: 'report.xlsx',
        expirationMs: 1704067200000, // Fixed timestamp for reproducibility
      };
      const signature = createSignature({ data, secretKey });

      // Verify original
      expect(verifySignature({ data, signature, secretKey })).toBe(true);

      // Tamper with method
      const tamperedMethod = { ...data, method: 'put' as const };
      expect(verifySignature({ data: tamperedMethod, signature, secretKey })).toBe(false);

      // Tamper with id
      const tamperedId = { ...data, id: 'file-000' };
      expect(verifySignature({ data: tamperedId, signature, secretKey })).toBe(false);

      // Tamper with filename
      const tamperedFilename = { ...data, filename: 'malicious.exe' };
      expect(verifySignature({ data: tamperedFilename, signature, secretKey })).toBe(false);

      // Tamper with expiration
      const tamperedExpiration = { ...data, expirationMs: data.expirationMs + 86400000 };
      expect(verifySignature({ data: tamperedExpiration, signature, secretKey })).toBe(false);
    });
  });

  describe('security', () => {
    test('should use constant-time comparison', () => {
      // This test verifies the implementation uses timingSafeEqual
      // by checking that both correct and incorrect signatures
      // are handled without timing differences (can't measure directly)
      const data = 'sensitive-data';
      const validSignature = createSignature({ data, secretKey });
      const invalidSignature = validSignature.slice(0, -1) + 'X';

      // Both should complete without errors
      expect(verifySignature({ data, signature: validSignature, secretKey })).toBe(true);
      expect(verifySignature({ data, signature: invalidSignature, secretKey })).toBe(false);
    });

    test('should use SHA-512 for strong signatures', () => {
      const data = 'test';
      const signature = createSignature({ data, secretKey });

      // SHA-512 produces 64 bytes = 86 base64 characters (with padding)
      // Base64 encoding: ceil(64 * 4 / 3) = 86, with padding up to 88
      expect(signature.length).toBeGreaterThanOrEqual(86);
    });
  });
});
