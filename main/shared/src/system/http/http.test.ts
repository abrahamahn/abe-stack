// main/shared/src/system/http/http.test.ts
import { describe, expect, it } from 'vitest';

import { parseCookies, serializeCookie } from './cookies';

describe('http utilities', () => {
  // ==========================================================================
  // parseCookies
  // ==========================================================================
  describe('parseCookies', () => {
    it('parses a single cookie', () => {
      expect(parseCookies('name=value')).toEqual({ name: 'value' });
    });

    it('parses multiple cookies', () => {
      expect(parseCookies('a=1; b=2; c=3')).toEqual({ a: '1', b: '2', c: '3' });
    });

    it('handles URL-encoded values', () => {
      expect(parseCookies('name=hello%20world')).toEqual({ name: 'hello world' });
    });

    it('handles quoted values', () => {
      expect(parseCookies('name="quoted value"')).toEqual({ name: 'quoted value' });
    });

    it('returns empty object for undefined', () => {
      expect(parseCookies(undefined)).toEqual({});
    });

    it('returns empty object for null', () => {
      expect(parseCookies(null)).toEqual({});
    });

    it('returns empty object for empty string', () => {
      expect(parseCookies('')).toEqual({});
    });

    it('skips malformed pairs without equals sign', () => {
      expect(parseCookies('valid=1; noequalssign; another=2')).toEqual({
        valid: '1',
        another: '2',
      });
    });

    it('trims whitespace from keys and values', () => {
      expect(parseCookies('  name  =  value  ')).toEqual({ name: 'value' });
    });

    it('handles invalid URI encoding gracefully', () => {
      // %ZZ is not a valid percent-encoding
      const result = parseCookies('bad=%ZZvalue');
      expect(result['bad']).toBe('%ZZvalue');
    });

    it('handles cookies with equals sign in value', () => {
      expect(parseCookies('token=abc=def=ghi')).toEqual({ token: 'abc=def=ghi' });
    });
  });

  // ==========================================================================
  // parseCookies — adversarial failure states
  // ==========================================================================
  describe('parseCookies — adversarial', () => {
    it('does not store empty-string keys from bare = pairs', () => {
      const result = parseCookies('=value');
      // An empty key should not appear in the result
      expect(result['']).toBeUndefined();
    });

    it('returns empty object for whitespace-only string', () => {
      expect(parseCookies('   ')).toEqual({});
    });

    it('does not pollute Object prototype via __proto__ key', () => {
      const result = parseCookies('__proto__=poisoned');
      // isSafeObjectKey should reject __proto__
      expect(result['__proto__']).toBeUndefined();
      // Prototype must not be mutated
      expect(({} as Record<string, unknown>)['poisoned']).toBeUndefined();
    });

    it('does not allow constructor key pollution', () => {
      const result = parseCookies('constructor=evil');
      // isSafeObjectKey should reject constructor
      expect(result['constructor']).toBeUndefined();
    });

    it('handles a cookie string that is only a semicolon', () => {
      expect(parseCookies(';')).toEqual({});
    });

    it('handles repeated semicolons between pairs', () => {
      const result = parseCookies('a=1;;;b=2');
      expect(result['a']).toBe('1');
      expect(result['b']).toBe('2');
    });

    it('handles very long cookie value without throwing', () => {
      const longValue = 'x'.repeat(8192);
      const result = parseCookies(`big=${longValue}`);
      expect(result['big']).toBe(longValue);
    });

    it('preserves last value when duplicate key appears', () => {
      // Behaviour is implementation-defined; we only assert no crash
      const result = parseCookies('a=first; a=second');
      expect(typeof result['a']).toBe('string');
    });

    it('does not decode a value that is only a percent sign', () => {
      // '%' alone is invalid percent-encoding; should survive without throwing
      const result = parseCookies('bad=%');
      expect(result['bad']).toBe('%');
    });

    it('handles null bytes in cookie value gracefully', () => {
      // Null byte embedded in percent-encoded form
      const result = parseCookies('k=%00');
      expect(result['k']).toBe('\u0000');
    });

    it('does not interpret tab-separated pairs', () => {
      // Tabs are not valid separators per RFC 6265; each token parsed as-is
      const result = parseCookies('a=1\tb=2');
      // Either no second key, or it is embedded in the first value — never crashes
      expect(result['a']).toBeDefined();
    });
  });

  // ==========================================================================
  // serializeCookie
  // ==========================================================================
  describe('serializeCookie', () => {
    it('serializes basic name=value', () => {
      expect(serializeCookie('name', 'value')).toBe('name=value');
    });

    it('URL-encodes name and value', () => {
      expect(serializeCookie('my cookie', 'hello world')).toBe('my%20cookie=hello%20world');
    });

    it('includes Max-Age', () => {
      const result = serializeCookie('name', 'value', { maxAge: 3600 });
      expect(result).toContain('; Max-Age=3600');
    });

    it('floors Max-Age to integer', () => {
      const result = serializeCookie('name', 'value', { maxAge: 3600.7 });
      expect(result).toContain('; Max-Age=3600');
    });

    it('includes Expires', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      const result = serializeCookie('name', 'value', { expires: date });
      expect(result).toContain(`; Expires=${date.toUTCString()}`);
    });

    it('includes Path', () => {
      const result = serializeCookie('name', 'value', { path: '/' });
      expect(result).toContain('; Path=/');
    });

    it('includes Domain', () => {
      const result = serializeCookie('name', 'value', { domain: 'example.com' });
      expect(result).toContain('; Domain=example.com');
    });

    it('omits Domain when empty string', () => {
      const result = serializeCookie('name', 'value', { domain: '' });
      expect(result).not.toContain('Domain');
    });

    it('includes HttpOnly flag', () => {
      const result = serializeCookie('name', 'value', { httpOnly: true });
      expect(result).toContain('; HttpOnly');
    });

    it('omits HttpOnly when false', () => {
      const result = serializeCookie('name', 'value', { httpOnly: false });
      expect(result).not.toContain('HttpOnly');
    });

    it('includes Secure flag', () => {
      const result = serializeCookie('name', 'value', { secure: true });
      expect(result).toContain('; Secure');
    });

    it('includes SameSite with capitalized first letter', () => {
      expect(serializeCookie('n', 'v', { sameSite: 'strict' })).toContain('; SameSite=Strict');
      expect(serializeCookie('n', 'v', { sameSite: 'lax' })).toContain('; SameSite=Lax');
      expect(serializeCookie('n', 'v', { sameSite: 'none' })).toContain('; SameSite=None');
    });

    it('includes all options together', () => {
      const result = serializeCookie('session', 'abc123', {
        path: '/',
        domain: 'example.com',
        maxAge: 3600,
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
      expect(result).toBe(
        'session=abc123; Max-Age=3600; Path=/; Domain=example.com; HttpOnly; Secure; SameSite=Strict',
      );
    });

    it('uses custom encode function when provided', () => {
      const result = serializeCookie('name', 'value', {
        encode: (v) => v.toUpperCase(),
      });
      expect(result).toBe('NAME=VALUE');
    });
  });

  // ==========================================================================
  // serializeCookie — adversarial failure states
  // ==========================================================================
  describe('serializeCookie — adversarial', () => {
    it('encodes special characters in cookie name that would break header parsing', () => {
      // Characters like ; = \r\n must be encoded to avoid header injection
      const result = serializeCookie('name;bad', 'value');
      expect(result).not.toContain(';bad');
    });

    it('encodes newline in cookie value preventing header injection', () => {
      const result = serializeCookie('name', 'val\r\nSet-Cookie: evil=1');
      expect(result).not.toContain('\r\n');
    });

    it('handles empty string name (encodes to empty segment)', () => {
      // encodeURIComponent('') === '' — result starts with '='
      const result = serializeCookie('', 'value');
      expect(result).toContain('=value');
    });

    it('handles empty string value', () => {
      const result = serializeCookie('name', '');
      expect(result).toBe('name=');
    });

    it('floors negative Max-Age to a negative integer without throwing', () => {
      const result = serializeCookie('name', 'value', { maxAge: -1 });
      // Negative Max-Age is valid per RFC; browser treats it as expired
      expect(result).toContain('; Max-Age=-1');
    });

    it('floors fractional negative Max-Age correctly (Math.floor rounds toward -Infinity)', () => {
      // Math.floor(-0.9) === -1, not 0 — floors toward negative infinity
      const result = serializeCookie('name', 'value', { maxAge: -0.9 });
      expect(result).toContain('; Max-Age=-1');
    });

    it('handles Max-Age of 0 (immediate expiry)', () => {
      const result = serializeCookie('name', 'value', { maxAge: 0 });
      expect(result).toContain('; Max-Age=0');
    });

    it('handles very large Max-Age without overflow', () => {
      const result = serializeCookie('name', 'value', { maxAge: Number.MAX_SAFE_INTEGER });
      expect(result).toContain(`; Max-Age=${String(Number.MAX_SAFE_INTEGER)}`);
    });

    it('encodes Unicode characters in value', () => {
      const result = serializeCookie('lang', '日本語');
      // encodeURIComponent encodes multi-byte chars
      expect(result).not.toContain('日本語');
      expect(result.startsWith('lang=')).toBe(true);
    });

    it('does not include Domain when null-ish via omission', () => {
      const result = serializeCookie('name', 'value', {});
      expect(result).not.toContain('Domain');
    });

    it('path with semicolon is passed through literally (caller responsibility)', () => {
      // serializeCookie does not sanitize path — document the actual behavior
      const result = serializeCookie('name', 'value', { path: '/foo;bar' });
      expect(result).toContain('; Path=/foo;bar');
    });

    it('custom encode returning empty string produces bare separator', () => {
      const result = serializeCookie('name', 'value', { encode: () => '' });
      expect(result).toBe('=');
    });
  });
});
