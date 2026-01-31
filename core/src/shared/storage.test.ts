// core/src/shared/storage.test.ts
import { describe, expect, it } from 'vitest';

import { normalizeStorageKey } from './storage';

describe('normalizeStorageKey', () => {
  describe('basic normalization', () => {
    it('should strip leading slash', () => {
      expect(normalizeStorageKey('/path/to/file')).toBe('path/to/file');
    });

    it('should not modify paths without leading slash', () => {
      expect(normalizeStorageKey('path/to/file')).toBe('path/to/file');
    });

    it('should handle single slash', () => {
      expect(normalizeStorageKey('/')).toBe('');
    });

    it('should handle empty string', () => {
      expect(normalizeStorageKey('')).toBe('');
    });

    it('should only strip first leading slash', () => {
      expect(normalizeStorageKey('//path/to/file')).toBe('/path/to/file');
    });
  });

  describe('with stripParentRefs disabled (default)', () => {
    it('should preserve parent refs by default', () => {
      expect(normalizeStorageKey('/path/../to/file')).toBe('path/../to/file');
      expect(normalizeStorageKey('../parent/file')).toBe('../parent/file');
    });

    it('should preserve multiple parent refs', () => {
      expect(normalizeStorageKey('/../../path')).toBe('../../path');
    });
  });

  describe('with stripParentRefs enabled', () => {
    it('should remove parent refs', () => {
      // Function replaces ".." with empty string, leaving slashes
      expect(normalizeStorageKey('/path/../to/file', true)).toBe('path//to/file');
    });

    it('should remove multiple parent refs', () => {
      // Removes ".." leaving "//parent/file"
      expect(normalizeStorageKey('../../parent/file', true)).toBe('//parent/file');
    });

    it('should remove consecutive parent refs', () => {
      // "/path/../../to/file" -> "path///to/file"
      expect(normalizeStorageKey('/path/../../to/file', true)).toBe('path///to/file');
    });

    it('should handle only parent refs', () => {
      // "../.." -> "/" (leading slash stripped, ".." replaced with empty)
      expect(normalizeStorageKey('../..', true)).toBe('/');
    });
  });

  describe('edge cases', () => {
    it('should handle paths with dots that are not parent refs', () => {
      expect(normalizeStorageKey('/path/to/.hidden')).toBe('path/to/.hidden');
      expect(normalizeStorageKey('/file.txt')).toBe('file.txt');
    });

    it('should handle paths with multiple slashes', () => {
      expect(normalizeStorageKey('/path//to///file')).toBe('path//to///file');
    });

    it('should handle Windows-style paths', () => {
      // Note: this function doesn't convert backslashes
      expect(normalizeStorageKey('/path\\to\\file')).toBe('path\\to\\file');
    });

    it('should handle special characters', () => {
      expect(normalizeStorageKey('/path with spaces/file')).toBe('path with spaces/file');
      expect(normalizeStorageKey('/path%20encoded/file')).toBe('path%20encoded/file');
    });
  });
});
