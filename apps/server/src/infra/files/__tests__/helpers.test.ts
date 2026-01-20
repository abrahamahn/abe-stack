// apps/server/src/infra/files/__tests__/helpers.test.ts
import { describe, expect, test } from 'vitest';

import { normalizeFilename } from '../helpers';

describe('normalizeFilename', () => {
  describe('basic normalization', () => {
    test('should return simple filename unchanged', () => {
      expect(normalizeFilename('document.pdf')).toBe('document.pdf');
    });

    test('should lowercase file extension', () => {
      expect(normalizeFilename('document.PDF')).toBe('document.pdf');
      expect(normalizeFilename('image.PNG')).toBe('image.png');
      expect(normalizeFilename('archive.ZIP')).toBe('archive.zip');
    });

    test('should handle mixed case extensions', () => {
      expect(normalizeFilename('file.JpG')).toBe('file.jpg');
      expect(normalizeFilename('document.DocX')).toBe('document.docx');
    });
  });

  describe('special character handling', () => {
    test('should replace special characters with underscores', () => {
      expect(normalizeFilename('my@file#name.txt')).toBe('my_file_name.txt');
      expect(normalizeFilename('file!with$symbols.pdf')).toBe('file_with_symbols.pdf');
    });

    test('should preserve allowed characters', () => {
      expect(normalizeFilename('my-file_name.txt')).toBe('my-file_name.txt');
      expect(normalizeFilename('document 2024.pdf')).toBe('document 2024.pdf');
    });

    test('should handle multiple consecutive special characters', () => {
      expect(normalizeFilename('file###name.txt')).toBe('file_name.txt');
      expect(normalizeFilename('bad@@@chars.pdf')).toBe('bad_chars.pdf');
    });

    test('should handle unicode characters', () => {
      // Regex replaces consecutive non-alphanumeric chars with single underscore
      expect(normalizeFilename('café.txt')).toBe('caf_.txt');
      expect(normalizeFilename('日本語.pdf')).toBe('_.pdf'); // 3 consecutive chars -> 1 underscore
      expect(normalizeFilename('日a語.pdf')).toBe('_a_.pdf'); // Separated by 'a'
    });
  });

  describe('edge cases', () => {
    test('should handle files without extension', () => {
      expect(normalizeFilename('README')).toBe('README');
      expect(normalizeFilename('Makefile')).toBe('Makefile');
    });

    test('should handle files with multiple dots', () => {
      expect(normalizeFilename('archive.tar.GZ')).toBe('archive.tar.gz');
      expect(normalizeFilename('my.file.name.TXT')).toBe('my.file.name.txt');
    });

    test('should handle dotfiles', () => {
      expect(normalizeFilename('.gitignore')).toBe('.gitignore');
      expect(normalizeFilename('.env.LOCAL')).toBe('.env.local');
    });

    test('should handle empty extension', () => {
      expect(normalizeFilename('file.')).toBe('file.');
    });

    test('should preserve alphanumeric characters', () => {
      expect(normalizeFilename('file123ABC.txt')).toBe('file123ABC.txt');
    });
  });
});
