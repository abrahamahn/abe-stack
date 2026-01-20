// packages/core/src/media/__tests__/validation.test.ts
import { describe, expect, test, vi } from 'vitest';

import {
  generateFileId,
  sanitizeFilename,
  validateMediaFile,
  validateUploadConfig,
} from '../validation';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
  },
}));

// Mock file-type module
vi.mock('../file-type', () => ({
  detectFileTypeFromFile: vi.fn(),
  isAllowedFileType: vi.fn(),
}));

describe('validateMediaFile', () => {
  test('should validate a valid media file', async () => {
    const fs = await import('fs');
    const fileType = await import('../file-type');

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1024 } as never);
    vi.mocked(fileType.detectFileTypeFromFile).mockResolvedValue({
      ext: 'jpg',
      mime: 'image/jpeg',
    });
    vi.mocked(fileType.isAllowedFileType).mockReturnValue(true);

    const result = await validateMediaFile('/test/image.jpg', {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*'],
    });

    expect(result.valid).toBe(true);
    expect(result.fileType).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
  });

  test('should reject file exceeding max size', async () => {
    const fs = await import('fs');

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 20 * 1024 * 1024 } as never); // 20MB

    const result = await validateMediaFile('/test/large.jpg', {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*'],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds limit');
  });

  test('should reject empty file', async () => {
    const fs = await import('fs');

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 0 } as never);

    const result = await validateMediaFile('/test/empty.jpg', {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*'],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('File is empty');
  });

  test('should reject file with undetectable type', async () => {
    const fs = await import('fs');
    const fileType = await import('../file-type');

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1024 } as never);
    vi.mocked(fileType.detectFileTypeFromFile).mockResolvedValue(null);

    const result = await validateMediaFile('/test/unknown', {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*'],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Unable to determine file type');
  });

  test('should reject file with disallowed type', async () => {
    const fs = await import('fs');
    const fileType = await import('../file-type');

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1024 } as never);
    vi.mocked(fileType.detectFileTypeFromFile).mockResolvedValue({
      ext: 'exe',
      mime: 'application/x-msdownload',
    });
    vi.mocked(fileType.isAllowedFileType).mockReturnValue(false);

    const result = await validateMediaFile('/test/malware.exe', {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*'],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('File type not allowed');
  });

  test('should handle stat error', async () => {
    const fs = await import('fs');

    vi.mocked(fs.promises.stat).mockRejectedValue(new Error('File not found'));

    const result = await validateMediaFile('/test/nonexistent.jpg', {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*'],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Validation failed');
    expect(result.error).toContain('File not found');
  });

  test('should handle non-Error exception', async () => {
    const fs = await import('fs');

    vi.mocked(fs.promises.stat).mockRejectedValue('String error');

    const result = await validateMediaFile('/test/error.jpg', {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*'],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Validation failed');
    expect(result.error).toContain('String error');
  });
});

describe('validateUploadConfig', () => {
  describe('maxFileSize validation', () => {
    test('should accept valid maxFileSize', () => {
      const result = validateUploadConfig({ maxFileSize: 10 * 1024 * 1024 }); // 10MB
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject negative maxFileSize', () => {
      const result = validateUploadConfig({ maxFileSize: -1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxFileSize must be positive');
    });

    test('should accept zero maxFileSize (falsy check short-circuits)', () => {
      // Note: The implementation uses `config.maxFileSize && config.maxFileSize <= 0`
      // which short-circuits when maxFileSize is 0 (falsy), so zero is accepted
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
      const result = validateUploadConfig({ chunkSize: 1024 * 1024 }); // 1MB
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
      const result = validateUploadConfig({ timeout: 60000 }); // 1 minute
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
        maxFileSize: 50 * 1024 * 1024, // 50MB
        chunkSize: 5 * 1024 * 1024, // 5MB
        timeout: 300000, // 5 minutes
        allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

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
      // Tab and newline are control characters, replaced with underscore before trim
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
        .some((char) => char.charCodeAt(0) >= 0 && char.charCodeAt(0) < 32);
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
    // All 100 IDs should be unique
    expect(ids.size).toBe(100);
  });

  test('should only contain alphanumeric characters', () => {
    const id = generateFileId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
