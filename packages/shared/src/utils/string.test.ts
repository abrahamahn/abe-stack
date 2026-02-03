// shared/src/utils/string.test.ts
import { describe, expect, it } from 'vitest';

import {
  capitalize,
  countCharactersNoWhitespace,
  countWords,
  escapeHtml,
  normalizeWhitespace,
  padLeft,
  slugify,
  stripControlChars,
  titleCase,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  truncate,
} from './string';

describe('string utilities', () => {
  // ==========================================================================
  // slugify
  // ==========================================================================
  describe('slugify', () => {
    it('converts basic strings to slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(slugify('Hello, World! How are you?')).toBe('hello-world-how-are-you');
    });

    it('handles multiple spaces and hyphens', () => {
      expect(slugify('hello   world---test')).toBe('hello-world-test');
    });

    it('trims leading/trailing hyphens', () => {
      expect(slugify('-hello world-')).toBe('hello-world');
    });

    it('returns empty string for empty input', () => {
      expect(slugify('')).toBe('');
    });

    it('handles underscores', () => {
      expect(slugify('hello_world test')).toBe('hello-world-test');
    });
  });

  // ==========================================================================
  // capitalize
  // ==========================================================================
  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('lowercases remaining letters', () => {
      expect(capitalize('hELLO')).toBe('Hello');
    });

    it('returns empty string for empty input', () => {
      expect(capitalize('')).toBe('');
    });
  });

  // ==========================================================================
  // titleCase
  // ==========================================================================
  describe('titleCase', () => {
    it('capitalizes each word', () => {
      expect(titleCase('hello world')).toBe('Hello World');
    });

    it('handles mixed case', () => {
      expect(titleCase('hELLO wORLD')).toBe('Hello World');
    });

    it('returns empty string for empty input', () => {
      expect(titleCase('')).toBe('');
    });
  });

  // ==========================================================================
  // truncate
  // ==========================================================================
  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('does not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('returns string as-is if exactly at max length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('returns empty string for empty input', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('supports custom suffix', () => {
      expect(truncate('Hello World', 8, '..')).toBe('Hello ..');
    });
  });

  // ==========================================================================
  // normalizeWhitespace
  // ==========================================================================
  describe('normalizeWhitespace', () => {
    it('collapses multiple spaces', () => {
      expect(normalizeWhitespace('hello   world')).toBe('hello world');
    });

    it('trims leading and trailing whitespace', () => {
      expect(normalizeWhitespace('  hello world  ')).toBe('hello world');
    });

    it('handles tabs and newlines', () => {
      expect(normalizeWhitespace('hello\t\n  world')).toBe('hello world');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeWhitespace('')).toBe('');
    });
  });

  // ==========================================================================
  // stripControlChars
  // ==========================================================================
  describe('stripControlChars', () => {
    it('removes null bytes', () => {
      expect(stripControlChars('hello\0world')).toBe('helloworld');
    });

    it('removes control characters', () => {
      expect(stripControlChars('hello\x01\x02world')).toBe('helloworld');
    });

    it('preserves tabs, newlines, and carriage returns', () => {
      expect(stripControlChars('hello\t\n\rworld')).toBe('hello\t\n\rworld');
    });

    it('handles non-string input', () => {
      expect(stripControlChars(42 as unknown as string)).toBe('');
    });
  });

  // ==========================================================================
  // escapeHtml
  // ==========================================================================
  describe('escapeHtml', () => {
    it('escapes HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
    });

    it('escapes ampersands', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#x27;s');
    });

    it('returns empty string for empty input', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  // ==========================================================================
  // toCamelCase
  // ==========================================================================
  describe('toCamelCase', () => {
    it('converts space-separated words', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
    });

    it('converts words with mixed casing', () => {
      expect(toCamelCase('Hello World')).toBe('helloWorld');
    });

    it('returns empty string for empty input', () => {
      expect(toCamelCase('')).toBe('');
    });
  });

  // ==========================================================================
  // toKebabCase
  // ==========================================================================
  describe('toKebabCase', () => {
    it('converts camelCase', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
    });

    it('converts PascalCase', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
    });

    it('converts spaces and underscores', () => {
      expect(toKebabCase('hello world_test')).toBe('hello-world-test');
    });

    it('returns empty string for empty input', () => {
      expect(toKebabCase('')).toBe('');
    });
  });

  // ==========================================================================
  // toPascalCase
  // ==========================================================================
  describe('toPascalCase', () => {
    it('converts space-separated words', () => {
      expect(toPascalCase('hello world')).toBe('HelloWorld');
    });

    it('returns empty string for empty input', () => {
      expect(toPascalCase('')).toBe('');
    });
  });

  // ==========================================================================
  // padLeft
  // ==========================================================================
  describe('padLeft', () => {
    it('pads string to target length', () => {
      expect(padLeft('5', 3, '0')).toBe('005');
    });

    it('does not pad if string is long enough', () => {
      expect(padLeft('hello', 3)).toBe('hello');
    });

    it('uses space as default pad character', () => {
      expect(padLeft('hi', 5)).toBe('   hi');
    });
  });

  // ==========================================================================
  // countWords
  // ==========================================================================
  describe('countWords', () => {
    it('counts words in a sentence', () => {
      expect(countWords('hello world foo')).toBe(3);
    });

    it('handles multiple spaces', () => {
      expect(countWords('hello   world')).toBe(2);
    });

    it('returns 0 for empty string', () => {
      expect(countWords('')).toBe(0);
    });

    it('handles single word', () => {
      expect(countWords('hello')).toBe(1);
    });
  });

  // ==========================================================================
  // countCharactersNoWhitespace
  // ==========================================================================
  describe('countCharactersNoWhitespace', () => {
    it('counts characters excluding whitespace', () => {
      expect(countCharactersNoWhitespace('hello world')).toBe(10);
    });

    it('returns 0 for empty string', () => {
      expect(countCharactersNoWhitespace('')).toBe(0);
    });

    it('handles tabs and newlines', () => {
      expect(countCharactersNoWhitespace('a\tb\nc')).toBe(3);
    });
  });
});
