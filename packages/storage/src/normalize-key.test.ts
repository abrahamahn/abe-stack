// packages/storage/src/normalize-key.test.ts
import { describe, expect, it } from 'vitest';

import { normalizeStorageKey } from './signing';

describe('normalizeStorageKey', () => {
  describe('leading slash removal', () => {
    it('should strip a leading slash from the key', () => {
      expect(normalizeStorageKey('/path/to/file.txt')).toBe('path/to/file.txt');
    });

    it('should return the key unchanged if no leading slash', () => {
      expect(normalizeStorageKey('path/to/file.txt')).toBe('path/to/file.txt');
    });

    it('should strip all leading slashes', () => {
      expect(normalizeStorageKey('//double/slash')).toBe('double/slash');
    });

    it('should handle empty string', () => {
      expect(normalizeStorageKey('')).toBe('');
    });

    it('should handle just a slash', () => {
      expect(normalizeStorageKey('/')).toBe('');
    });
  });

  describe('parent reference stripping', () => {
    it('should not strip parent references by default', () => {
      expect(normalizeStorageKey('../parent/file.txt')).toBe('../parent/file.txt');
    });

    it('should strip parent references when stripParentRefs is true', () => {
      expect(normalizeStorageKey('../parent/file.txt', true)).toBe('parent/file.txt');
    });

    it('should strip multiple parent references and collapse slashes', () => {
      expect(normalizeStorageKey('../../path/../file.txt', true)).toBe('path/file.txt');
    });

    it('should strip leading slash and parent refs together', () => {
      expect(normalizeStorageKey('/../../../etc/passwd', true)).toBe('etc/passwd');
    });

    it('should handle key with only parent references', () => {
      expect(normalizeStorageKey('..', true)).toBe('');
    });

    it('should handle embedded parent references and collapse slashes', () => {
      expect(normalizeStorageKey('path/../file.txt', true)).toBe('path/file.txt');
    });
  });

  describe('edge cases', () => {
    it('should handle keys with special characters', () => {
      expect(normalizeStorageKey('/path/to/file name.txt')).toBe('path/to/file name.txt');
    });

    it('should handle keys with unicode characters', () => {
      expect(normalizeStorageKey('/path/to/file-\u00e9.txt')).toBe('path/to/file-\u00e9.txt');
    });

    it('should handle deeply nested paths', () => {
      const deepPath = '/a/b/c/d/e/f/g/h/i/j/k.txt';
      expect(normalizeStorageKey(deepPath)).toBe('a/b/c/d/e/f/g/h/i/j/k.txt');
    });
  });
});
