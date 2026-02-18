// main/shared/src/system/security/input.test.ts

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

  // ============================================================================
  // Adversarial Tests — proving the code must handle these or documenting limits
  // ============================================================================

  describe('adversarial: sanitizeString XSS bypass variants', () => {
    it('blocks svg onload vector', () => {
      const payload = '<svg onload=alert(1)>';
      const result = sanitizeString(payload);
      // onload= attribute must be stripped by stripEventHandlers
      expect(result).not.toMatch(/onload\s*=/i);
    });

    it('blocks iframe srcdoc vector', () => {
      const payload = '<iframe srcdoc="<script>alert(1)</script>">';
      const result = sanitizeString(payload);
      // script tag inside srcdoc must be neutralized
      expect(result).not.toMatch(/<script/i);
    });

    it('blocks mixed-case script tag', () => {
      // Browser parsers are case-insensitive: <ScRiPt> is equivalent to <script>
      const result = sanitizeString('<ScRiPt>alert(1)</ScRiPt>');
      expect(result).not.toMatch(/<ScRiPt/i);
    });

    it('blocks double-encoded script angle bracket (pre-decoded input)', () => {
      // sanitizeString operates on the already-decoded string representation
      const result = sanitizeString('<script>alert(1)</script>');
      expect(result).not.toMatch(/<script>/i);
    });

    it('blocks javascript: scheme in href context', () => {
      const payload = 'javascript:alert(1)';
      const result = sanitizeString(payload);
      expect(result).not.toMatch(/javascript:/i);
    });

    it('blocks vbscript: scheme', () => {
      const payload = 'vbscript:msgbox(1)';
      const result = sanitizeString(payload);
      expect(result).not.toMatch(/vbscript:/i);
    });

    it('blocks javascript: with intervening whitespace characters', () => {
      // Whitespace injection between letters to fool naive regex
      const payload = 'j\ta\nv\ra\u0000s\u0000c\u0000r\u0000i\u0000p\u0000t\u0000:alert(1)';
      const result = sanitizeString(payload);
      expect(result).not.toMatch(/javascript:/i);
    });

    it('blocks data:text/html URI', () => {
      const payload = 'data:text/html,<script>alert(1)</script>';
      const result = sanitizeString(payload);
      expect(result).not.toMatch(/data:text\/html/i);
    });

    it('blocks data:application/javascript URI', () => {
      const payload = 'data:application/javascript,alert(1)';
      const result = sanitizeString(payload);
      expect(result).not.toMatch(/data:application\/javascript/i);
    });

    it('preserves legitimate image data URIs', () => {
      const payload = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      const result = sanitizeString(payload);
      expect(result).toContain('data:image/png;base64,');
    });

    it('blocks onmouseover event handler', () => {
      const payload = '<div onmouseover=alert(1)>hover</div>';
      const result = sanitizeString(payload);
      expect(result).not.toMatch(/onmouseover\s*=/i);
    });

    it('blocks onerror with padding whitespace before equals sign', () => {
      const payload = '<img onerror   =alert(1)>';
      const result = sanitizeString(payload);
      expect(result).not.toMatch(/onerror\s*=/i);
    });

    it('returns empty string for non-string input', () => {
      // @ts-expect-error intentional type violation for adversarial test
      expect(sanitizeString(null)).toBe('');
      // @ts-expect-error intentional type violation for adversarial test
      expect(sanitizeString(undefined)).toBe('');
      // @ts-expect-error intentional type violation for adversarial test
      expect(sanitizeString(42)).toBe('');
    });

    it('removes null bytes and control characters below 0x20', () => {
      // Null bytes and control chars (except tab/lf/cr) are stripped
      const payload = 'hello\x00world\x01\x02\x03';
      const result = sanitizeString(payload);
      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x01');
      expect(result).not.toContain('\x02');
    });

    it('blocks polyglot combining javascript scheme and onload event', () => {
      // Polyglot that tries js scheme + event handler simultaneously
      const polyglot = 'javascript:/*onload=alert(1)*/alert(2)';
      const result = sanitizeString(polyglot);
      expect(result).not.toMatch(/javascript:/i);
      expect(result).not.toMatch(/onload\s*=/i);
    });
  });

  describe('adversarial: detectSQLInjection coverage', () => {
    it('detects UNION SELECT attack', () => {
      expect(detectSQLInjection('1 UNION SELECT username, password FROM users--')).toBe(true);
    });

    it('detects UNION ALL SELECT variant', () => {
      expect(
        detectSQLInjection('1 UNION ALL SELECT table_name FROM information_schema.tables'),
      ).toBe(true);
    });

    it('detects stacked query with semicolon separator — DROP TABLE', () => {
      expect(detectSQLInjection('1; DROP TABLE users--')).toBe(true);
    });

    it('detects stacked query with semicolon separator — INSERT', () => {
      expect(detectSQLInjection("'; INSERT INTO users VALUES ('hacked')--")).toBe(true);
    });

    it('detects SELECT ... FROM pattern', () => {
      expect(detectSQLInjection('SELECT * FROM secrets')).toBe(true);
    });

    it('detects DROP TABLE', () => {
      expect(detectSQLInjection('DROP TABLE users')).toBe(true);
      expect(detectSQLInjection('DROP DATABASE production')).toBe(true);
    });

    it('detects DELETE FROM', () => {
      expect(detectSQLInjection('DELETE FROM sessions WHERE 1=1')).toBe(true);
    });

    it("detects UPDATE ... SET pattern", () => {
      expect(detectSQLInjection("UPDATE users SET role='admin' WHERE 1=1")).toBe(true);
    });

    it('detects comment sequence --', () => {
      expect(detectSQLInjection("admin'--")).toBe(true);
    });

    it('detects block comment /*', () => {
      expect(detectSQLInjection("admin'/*")).toBe(true);
    });

    it('detects hex-encoded comment sequences', () => {
      expect(detectSQLInjection('admin\\x27\\x2D\\x2D')).toBe(true);
    });

    it('detects boolean-based blind injection OR 1=1', () => {
      expect(detectSQLInjection("' OR 1=1")).toBe(true);
    });

    it('detects AND-based blind injection', () => {
      expect(detectSQLInjection("' AND 1=1")).toBe(true);
    });

    it("detects OR with string quoting bypass", () => {
      expect(detectSQLInjection("' OR '1'='1")).toBe(true);
    });

    it('does not flag plain text as injection (no false positives)', () => {
      expect(detectSQLInjection('John')).toBe(false);
      expect(detectSQLInjection('hello world')).toBe(false);
      expect(detectSQLInjection('user@example.com')).toBe(false);
    });

    it('returns false when detection is disabled', () => {
      expect(detectSQLInjection('UNION SELECT * FROM users', { enabled: false })).toBe(false);
      expect(detectSQLInjection("'; DROP TABLE users--", { enabled: false })).toBe(false);
    });

    it('detects case-insensitive union select', () => {
      expect(detectSQLInjection('union select password from users')).toBe(true);
      expect(detectSQLInjection('UNION   SELECT   id   FROM   tbl')).toBe(true);
    });
  });

  describe('adversarial: detectNoSQLInjection coverage', () => {
    it('detects $where operator in string', () => {
      expect(detectNoSQLInjection('$where')).toBe(true);
    });

    it('detects $regex operator at top level', () => {
      expect(detectNoSQLInjection({ $regex: '.*', $options: 'i' })).toBe(true);
    });

    it('detects top-level $gt operator', () => {
      expect(detectNoSQLInjection({ $gt: '' })).toBe(true);
    });

    it('detects $ prefix — $in and $nin at top level', () => {
      expect(detectNoSQLInjection({ $in: [1, 2, 3] })).toBe(true);
      expect(detectNoSQLInjection({ $nin: ['a', 'b'] })).toBe(true);
    });

    it('detects $nor at top level', () => {
      expect(detectNoSQLInjection({ $nor: [{ x: 1 }] })).toBe(true);
    });

    it('detects constructor key in object (top-level own enumerable key)', () => {
      // Use a plain object literal — 'constructor' here is a literal string key
      const obj = Object.create(null) as Record<string, unknown>;
      obj['constructor'] = 'evil';
      expect(detectNoSQLInjection(obj)).toBe(true);
    });

    it('detects prototype key in object', () => {
      const obj: Record<string, unknown> = { prototype: 'evil' };
      expect(detectNoSQLInjection(obj)).toBe(true);
    });

    it('detects $ in string payload used for operator injection', () => {
      expect(detectNoSQLInjection('$ne')).toBe(true);
      expect(detectNoSQLInjection('{$eq:1}')).toBe(true);
    });

    it('returns false for number and boolean primitives', () => {
      expect(detectNoSQLInjection(42)).toBe(false);
      expect(detectNoSQLInjection(true)).toBe(false);
    });

    it('returns false for null', () => {
      expect(detectNoSQLInjection(null)).toBe(false);
    });

    it('returns false for safe flat objects', () => {
      expect(detectNoSQLInjection({ name: 'alice', age: 30 })).toBe(false);
    });

    it('returns false for deeply nested safe objects (only top-level keys checked)', () => {
      // The implementation only checks top-level own keys for $ prefix
      const deep = { a: { b: { c: { d: 'value' } } } };
      expect(detectNoSQLInjection(deep)).toBe(false);
    });

    it('exposes limitation: __proto__ bracket-assignment is invisible to Object.keys()', () => {
      // When assigned via bracket notation, __proto__ sets the actual prototype.
      // Object.keys() only returns own enumerable keys — so '__proto__' set this way
      // is NOT detected by detectNoSQLInjection. This documents the real behavior.
      const obj: Record<string, unknown> = {};
      obj['__proto__'] = { admin: true };

      // Own enumerable check confirms __proto__ is not a real own key
      expect(Object.prototype.hasOwnProperty.call(obj, '__proto__')).toBe(false);

      // detectNoSQLInjection uses Object.keys() so it cannot detect this form
      expect(detectNoSQLInjection(obj)).toBe(false); // documents the limitation
    });

    it('detects __proto__ when explicitly set as own enumerable property via defineProperty', () => {
      // Only Object.defineProperty on a null-prototype object produces an own enumerable __proto__ key
      const obj = Object.create(null) as Record<string, unknown>;
      Object.defineProperty(obj, '__proto__', { value: {}, enumerable: true, configurable: true });
      expect(Object.prototype.hasOwnProperty.call(obj, '__proto__')).toBe(true);
      expect(detectNoSQLInjection(obj)).toBe(true);
    });
  });

  describe('adversarial: isValidInputKeyName — edge cases', () => {
    it('rejects keys starting with a digit', () => {
      expect(isValidInputKeyName('1field')).toBe(false);
      expect(isValidInputKeyName('0abc')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidInputKeyName('')).toBe(false);
    });

    it('rejects keys with dot notation (property traversal)', () => {
      expect(isValidInputKeyName('a.b')).toBe(false);
    });

    it('rejects keys with bracket notation', () => {
      expect(isValidInputKeyName('a[0]')).toBe(false);
    });

    it('rejects keys with spaces', () => {
      expect(isValidInputKeyName('field name')).toBe(false);
    });

    it('rejects keys with SQL/shell injection characters', () => {
      expect(isValidInputKeyName("field'")).toBe(false);
      expect(isValidInputKeyName('field"')).toBe(false);
      expect(isValidInputKeyName('field;')).toBe(false);
    });

    it('rejects __proto__ (own regex + blocklist)', () => {
      expect(isValidInputKeyName('__proto__')).toBe(false);
    });

    it('rejects constructor regardless of casing', () => {
      expect(isValidInputKeyName('constructor')).toBe(false);
      expect(isValidInputKeyName('Constructor')).toBe(false);
      expect(isValidInputKeyName('CONSTRUCTOR')).toBe(false);
    });

    it('rejects toString regardless of casing', () => {
      expect(isValidInputKeyName('toString')).toBe(false);
      expect(isValidInputKeyName('ToString')).toBe(false);
      expect(isValidInputKeyName('TOSTRING')).toBe(false);
    });

    it('rejects valueOf regardless of casing', () => {
      expect(isValidInputKeyName('valueOf')).toBe(false);
      expect(isValidInputKeyName('ValueOf')).toBe(false);
      expect(isValidInputKeyName('VALUEOF')).toBe(false);
    });

    it('accepts $ as valid identifier start (JS allows $)', () => {
      expect(isValidInputKeyName('$field')).toBe(true);
    });

    it('accepts underscore-prefixed keys that are not dangerous', () => {
      expect(isValidInputKeyName('_private')).toBe(true);
      expect(isValidInputKeyName('_id')).toBe(true);
    });

    it('accepts alphanumeric camelCase keys', () => {
      expect(isValidInputKeyName('firstName')).toBe(true);
      expect(isValidInputKeyName('userId123')).toBe(true);
    });
  });
});
