// main/shared/src/utils/security/input.test.ts

import { describe, expect, it } from 'vitest';

import {
  detectNoSQLInjection,
  detectSQLInjection,
  isValidInputKeyName,
  sanitizeString,
} from './input';

describe('input security helpers', () => {
  describe('sanitizeString', () => {
    it('neutralizes script tags', () => {
      expect(sanitizeString('<script>alert(1)</script>')).toBe('&lt;script>alert(1)&lt;/script>');
    });

    it('strips event handlers and dangerous schemes', () => {
      expect(sanitizeString('<img onerror=alert(1) src="javascript:evil()">')).toBe(
        '<img alert(1) src="evil()">',
      );
    });

    it('strips non-image data URLs', () => {
      expect(sanitizeString('data:text/html;base64,abc')).toBe('abc');
      expect(sanitizeString('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    });
  });

  describe('detectSQLInjection', () => {
    it('detects classic injection payloads', () => {
      expect(detectSQLInjection("' OR 1=1 --")).toBe(true);
      expect(detectSQLInjection('SELECT id FROM users')).toBe(true);
    });

    it('supports disabling detection', () => {
      expect(detectSQLInjection("' OR 1=1 --", { enabled: false })).toBe(false);
    });
  });

  describe('detectNoSQLInjection', () => {
    it('detects operator payloads in strings and objects', () => {
      expect(detectNoSQLInjection('{"$where":"evil"}')).toBe(true);
      expect(detectNoSQLInjection({ $ne: null })).toBe(true);
      expect(detectNoSQLInjection({ safe: true })).toBe(false);
    });
  });

  describe('isValidInputKeyName', () => {
    it('accepts safe keys and rejects dangerous/prototype keys', () => {
      expect(isValidInputKeyName('userName_1')).toBe(true);
      expect(isValidInputKeyName('__proto__')).toBe(false);
      expect(isValidInputKeyName('prototype')).toBe(false);
      expect(isValidInputKeyName('toString')).toBe(false);
      expect(isValidInputKeyName('not-valid-key')).toBe(false);
    });
  });
});
