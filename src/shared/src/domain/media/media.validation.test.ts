// src/shared/src/domain/media/media.validation.test.ts
/**
 * Tests for pure media validation utilities
 * (sanitizeFilename, generateFileId, validateUploadConfig).
 */

import { describe, expect, test } from 'vitest';

import { generateFileId, sanitizeFilename, validateUploadConfig } from './media.validation';

describe('sanitizeFilename', () => {
  describe('basic sanitization', () => {
    test('should return valid filename unchanged', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf');
      expect(sanitizeFilename('my-file_name.txt')).toBe('my-file_name.txt');
    });

    test('should replace path separators with underscores', () => {
      expect(sanitizeFilename('path/to/file.txt')).toBe('path_to_file.txt');
      expect(sanitizeFilename('path\\to\\file.txt')).toBe('path_to_file.txt');
    });

    test('should replace special characters', () => {
      expect(sanitizeFilename('file:name.txt')).toBe('file_name.txt');
      expect(sanitizeFilename('file*name.txt')).toBe('file_name.txt');
      expect(sanitizeFilename('file?name.txt')).toBe('file_name.txt');
      expect(sanitizeFilename('file"name.txt')).toBe('file_name.txt');
      expect(sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
      expect(sanitizeFilename('file|name.txt')).toBe('file_name.txt');
    });
  });

  describe('whitespace and dots', () => {
    test('should trim whitespace', () => {
      expect(sanitizeFilename('  file.txt  ')).toBe('file.txt');
      expect(sanitizeFilename('\tfile.txt\n')).toBe('_file.txt_');
    });

    test('should remove leading and trailing dots', () => {
      expect(sanitizeFilename('...file.txt')).toBe('file.txt');
      expect(sanitizeFilename('file.txt...')).toBe('file.txt');
    });

    test('should preserve internal dots', () => {
      expect(sanitizeFilename('archive.tar.gz')).toBe('archive.tar.gz');
    });
  });

  describe('length limits', () => {
    test('should truncate filenames over 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith('.txt')).toBe(true);
    });

    test('should preserve extension when truncating', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const result = sanitizeFilename(longName);
      expect(result.endsWith('.pdf')).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should return "file" for empty input', () => {
      expect(sanitizeFilename('')).toBe('file');
    });

    test('should return "file" for only special characters', () => {
      expect(sanitizeFilename('...')).toBe('file');
      expect(sanitizeFilename('   ')).toBe('file');
    });

    test('should handle control characters', () => {
      const withControlChars = 'file\x00name\x1f.txt';
      const result = sanitizeFilename(withControlChars);
      const hasControlChars = result
        .split('')
        .some((char: string) => char.charCodeAt(0) >= 0 && char.charCodeAt(0) < 32);
      expect(hasControlChars).toBe(false);
    });
  });
});

describe('generateFileId', () => {
  test('should generate non-empty string', () => {
    const id = generateFileId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('should generate ID with max 32 characters', () => {
    const id = generateFileId();
    expect(id.length).toBeLessThanOrEqual(32);
  });

  test('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateFileId());
    }
    expect(ids.size).toBe(100);
  });

  test('should only contain alphanumeric characters', () => {
    const id = generateFileId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});

describe('validateUploadConfig', () => {
  describe('maxFileSize validation', () => {
    test('should accept valid maxFileSize', () => {
      const result = validateUploadConfig({ maxFileSize: 10 * 1024 * 1024 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject negative maxFileSize', () => {
      const result = validateUploadConfig({ maxFileSize: -1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxFileSize must be positive');
    });

    test('should accept zero maxFileSize (falsy check short-circuits)', () => {
      const result = validateUploadConfig({ maxFileSize: 0 });
      expect(result.valid).toBe(true);
    });

    test('should reject maxFileSize over 1GB', () => {
      const result = validateUploadConfig({ maxFileSize: 1001 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxFileSize cannot exceed 1GB');
    });

    test('should accept maxFileSize at 1GB boundary', () => {
      const result = validateUploadConfig({ maxFileSize: 1000 * 1024 * 1024 });
      expect(result.valid).toBe(true);
    });
  });

  describe('chunkSize validation', () => {
    test('should accept valid chunkSize', () => {
      const result = validateUploadConfig({ chunkSize: 1024 * 1024 });
      expect(result.valid).toBe(true);
    });

    test('should reject negative chunkSize', () => {
      const result = validateUploadConfig({ chunkSize: -100 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('chunkSize must be positive');
    });

    test('should reject chunkSize over 10MB', () => {
      const result = validateUploadConfig({ chunkSize: 11 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('chunkSize cannot exceed 10MB');
    });
  });

  describe('timeout validation', () => {
    test('should accept valid timeout', () => {
      const result = validateUploadConfig({ timeout: 60000 });
      expect(result.valid).toBe(true);
    });

    test('should reject negative timeout', () => {
      const result = validateUploadConfig({ timeout: -1000 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('timeout must be positive');
    });

    test('should reject timeout over 1 hour', () => {
      const result = validateUploadConfig({ timeout: 3600001 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('timeout cannot exceed 1 hour');
    });
  });

  describe('allowedTypes validation', () => {
    test('should accept non-empty allowedTypes', () => {
      const result = validateUploadConfig({ allowedTypes: ['image/jpeg', 'image/png'] });
      expect(result.valid).toBe(true);
    });

    test('should reject empty allowedTypes array', () => {
      const result = validateUploadConfig({ allowedTypes: [] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('allowedTypes cannot be empty');
    });
  });

  describe('multiple validations', () => {
    test('should collect all errors', () => {
      const result = validateUploadConfig({
        maxFileSize: -1,
        chunkSize: -1,
        timeout: -1,
        allowedTypes: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });

    test('should accept valid complete config', () => {
      const result = validateUploadConfig({
        maxFileSize: 50 * 1024 * 1024,
        chunkSize: 5 * 1024 * 1024,
        timeout: 300000,
        allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
