// main/shared/src/engine/files/storage.test.ts
import { describe, expect, it, vi } from 'vitest';

import {
  generateUniqueFilename,
  joinStoragePath,
  normalizeStoragePath,
  validateFileType,
} from './storage';

describe('storage utilities', () => {
  // ==========================================================================
  // normalizeStoragePath
  // ==========================================================================
  describe('normalizeStoragePath', () => {
    describe('basic normalization', () => {
      it('normalizes basic paths', () => {
        expect(normalizeStoragePath('foo/bar')).toBe('foo/bar');
        expect(normalizeStoragePath('/foo/bar')).toBe('foo/bar');
        expect(normalizeStoragePath('foo/bar/')).toBe('foo/bar');
        expect(normalizeStoragePath('/foo/bar/')).toBe('foo/bar');
      });

      it('handles single segments', () => {
        expect(normalizeStoragePath('foo')).toBe('foo');
        expect(normalizeStoragePath('/foo')).toBe('foo');
        expect(normalizeStoragePath('foo/')).toBe('foo');
        expect(normalizeStoragePath('/foo/')).toBe('foo');
      });

      it('normalizes mixed slashes', () => {
        expect(normalizeStoragePath('foo\\bar')).toBe('foo/bar');
        expect(normalizeStoragePath('\\foo\\bar')).toBe('foo/bar');
        expect(normalizeStoragePath('foo\\bar\\')).toBe('foo/bar');
      });
    });

    describe('path traversal prevention', () => {
      it('resolves .. segments', () => {
        expect(normalizeStoragePath('foo/../bar')).toBe('bar');
        expect(normalizeStoragePath('foo/bar/../baz')).toBe('foo/baz');
        expect(normalizeStoragePath('foo/./bar')).toBe('foo/bar');
      });

      it('does not allow traversal above root', () => {
        expect(normalizeStoragePath('../foo')).toBe('foo');
        expect(normalizeStoragePath('../../foo')).toBe('foo');
        expect(normalizeStoragePath('foo/../../bar')).toBe('bar');
      });
    });

    describe('invalid inputs', () => {
      it('handles empty strings', () => {
        expect(normalizeStoragePath('')).toBe('');
        expect(normalizeStoragePath('/')).toBe('');
        expect(normalizeStoragePath('\\')).toBe('');
      });

      it('handles whitespace', () => {
        expect(normalizeStoragePath('  ')).toBe('  ');
        expect(normalizeStoragePath(' foo/bar ')).toBe(' foo/bar ');
      });
    });
  });

  // ==========================================================================
  // joinStoragePath
  // ==========================================================================
  describe('joinStoragePath', () => {
    it('joins multiple segments into a normalized path', () => {
      expect(joinStoragePath('uploads', 'images', 'photo.jpg')).toBe('uploads/images/photo.jpg');
    });

    it('normalizes the joined result', () => {
      expect(joinStoragePath('/uploads/', '/images/', 'photo.jpg')).toBe(
        'uploads/images/photo.jpg',
      );
    });

    it('resolves .. in joined segments', () => {
      expect(joinStoragePath('uploads', 'temp', '..', 'images', 'photo.jpg')).toBe(
        'uploads/images/photo.jpg',
      );
    });

    it('handles single segment', () => {
      expect(joinStoragePath('uploads')).toBe('uploads');
    });

    it('handles empty segments', () => {
      expect(joinStoragePath('', 'uploads', '', 'photo.jpg')).toBe('uploads/photo.jpg');
    });

    it('handles Windows-style backslashes in segments', () => {
      expect(joinStoragePath('uploads\\images', 'photo.jpg')).toBe('uploads/images/photo.jpg');
    });
  });

  // ==========================================================================
  // generateUniqueFilename
  // ==========================================================================
  describe('generateUniqueFilename', () => {
    it('appends timestamp to filename by default', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      const result = generateUniqueFilename('photo.jpg');
      expect(result).toBe('photo_1700000000000.jpg');
      vi.restoreAllMocks();
    });

    it('preserves the file extension', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      const result = generateUniqueFilename('document.pdf');
      expect(result).toBe('document_1700000000000.pdf');
      vi.restoreAllMocks();
    });

    it('handles filenames without extension', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      const result = generateUniqueFilename('README');
      expect(result).toBe('README_1700000000000');
      vi.restoreAllMocks();
    });

    it('handles filenames with multiple dots', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      const result = generateUniqueFilename('archive.tar.gz');
      expect(result).toBe('archive.tar_1700000000000.gz');
      vi.restoreAllMocks();
    });

    it('uses secure ID when appendTimestamp is false', () => {
      const result = generateUniqueFilename('photo.jpg', false);
      // Format: photo_<8-char-alphanumeric>.jpg
      expect(result).toMatch(/^photo_[A-Za-z0-9]{8}\.jpg$/);
    });

    it('returns empty string for empty filename', () => {
      expect(generateUniqueFilename('')).toBe('');
    });
  });

  // ==========================================================================
  // validateFileType
  // ==========================================================================
  describe('validateFileType', () => {
    describe('extension-based validation', () => {
      it('validates filename against allowed extensions', () => {
        expect(validateFileType('photo.jpg', ['jpg', 'png'])).toBe(true);
        expect(validateFileType('photo.png', ['jpg', 'png'])).toBe(true);
      });

      it('rejects disallowed extensions', () => {
        expect(validateFileType('script.exe', ['jpg', 'png'])).toBe(false);
      });

      it('matches extensions with dot prefix', () => {
        expect(validateFileType('photo.jpg', ['.jpg', '.png'])).toBe(true);
      });

      it('is case-insensitive', () => {
        expect(validateFileType('Photo.JPG', ['jpg'])).toBe(true);
        expect(validateFileType('photo.jpg', ['JPG'])).toBe(true);
      });
    });

    describe('MIME-type validation', () => {
      it('validates exact MIME types', () => {
        expect(validateFileType('image/jpeg', ['image/jpeg', 'image/png'])).toBe(true);
        expect(validateFileType('image/gif', ['image/jpeg', 'image/png'])).toBe(false);
      });

      it('supports wildcard MIME types', () => {
        expect(validateFileType('image/jpeg', ['image/*'])).toBe(true);
        expect(validateFileType('image/png', ['image/*'])).toBe(true);
        expect(validateFileType('text/plain', ['image/*'])).toBe(false);
      });

      it('is case-insensitive for MIME types', () => {
        expect(validateFileType('Image/JPEG', ['image/jpeg'])).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('returns false for empty filename', () => {
        expect(validateFileType('', ['jpg'])).toBe(false);
      });

      it('returns false for empty allowed types', () => {
        expect(validateFileType('photo.jpg', [])).toBe(false);
      });

      it('returns false for filename with no extension and non-MIME types', () => {
        expect(validateFileType('README', ['jpg', 'png'])).toBe(false);
      });
    });
  });
});
