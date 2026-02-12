// src/server/media/src/validation.test.ts
/**
 * Tests for server-specific validation functions.
 *
 * Pure validation utility tests (sanitizeFilename, generateFileId,
 * validateUploadConfig) are in @abe-stack/shared
 * (src/shared/src/domain/media/media.validation.test.ts)
 */

import { describe, expect, test, vi } from 'vitest';

import { validateMediaFile } from './validation';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
  },
}));

// Mock file-type module
vi.mock('./file-type', () => ({
  detectFileTypeFromFile: vi.fn(),
  isAllowedFileType: vi.fn(),
}));

describe('validateMediaFile', () => {
  test('should validate a valid media file', async () => {
    const fs = await import('fs');
    const fileType = await import('./file-type');

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1024 } as never);
    vi.mocked(fileType.detectFileTypeFromFile).mockResolvedValue({
      ext: 'jpg',
      mime: 'image/jpeg',
    });
    vi.mocked(fileType.isAllowedFileType).mockReturnValue(true);

    const result = await validateMediaFile('/test/image.jpg', {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*'],
      extractMetadata: true,
    });

    expect(result.valid).toBe(true);
    expect(result.fileType).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
  });

  test('should reject file exceeding max size', async () => {
    const fs = await import('fs');

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 20 * 1024 * 1024 } as never);

    const result = await validateMediaFile('/test/large.jpg', {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*'],
      extractMetadata: true,
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
      extractMetadata: true,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('File is empty');
  });

  test('should reject file with undetectable type', async () => {
    const fs = await import('fs');
    const fileType = await import('./file-type');

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1024 } as never);
    vi.mocked(fileType.detectFileTypeFromFile).mockResolvedValue(null);

    const result = await validateMediaFile('/test/unknown', {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*'],
      extractMetadata: true,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Unable to determine file type');
  });

  test('should reject file with disallowed type', async () => {
    const fs = await import('fs');
    const fileType = await import('./file-type');

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1024 } as never);
    vi.mocked(fileType.detectFileTypeFromFile).mockResolvedValue({
      ext: 'exe',
      mime: 'application/x-msdownload',
    });
    vi.mocked(fileType.isAllowedFileType).mockReturnValue(false);

    const result = await validateMediaFile('/test/malware.exe', {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*'],
      extractMetadata: true,
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
      extractMetadata: true,
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
      extractMetadata: true,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Validation failed');
    expect(result.error).toContain('String error');
  });
});
