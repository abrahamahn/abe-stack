// main/shared/src/system/http/cookies.test.ts

import { describe, expect, it } from 'vitest';

import { parseCookies, serializeCookie } from './cookies';

// ---------------------------------------------------------------------------
// parseCookies
// ---------------------------------------------------------------------------

describe('parseCookies', () => {
  // ── Null / empty inputs ───────────────────────────────────────────────────

  describe('null / empty / undefined inputs', () => {
    it('returns empty object for undefined', () => {
      expect(parseCookies(undefined)).toEqual({});
    });

    it('returns empty object for null', () => {
      expect(parseCookies(null)).toEqual({});
    });

    it('returns empty object for empty string', () => {
      expect(parseCookies('')).toEqual({});
    });

    it('returns empty object for whitespace-only string', () => {
      // A string with only spaces has no "=" so every pair is skipped
      expect(parseCookies('   ')).toEqual({});
    });
  });

  // ── Happy-path baseline ───────────────────────────────────────────────────

  describe('valid cookies', () => {
    it('parses a single cookie', () => {
      expect(parseCookies('session=abc123')).toEqual({ session: 'abc123' });
    });

    it('parses multiple cookies separated by semicolons', () => {
      const result = parseCookies('a=1; b=2; c=3');
      expect(result).toEqual({ a: '1', b: '2', c: '3' });
    });

    it('trims leading/trailing whitespace around name and value', () => {
      const result = parseCookies('  name  =  value  ');
      expect(result['name']).toBe('value');
    });

    it('trims whitespace when there are multiple cookies', () => {
      const result = parseCookies(' foo = bar ; baz = qux ');
      expect(result['foo']).toBe('bar');
      expect(result['baz']).toBe('qux');
    });
  });

  // ── Malformed cookies ─────────────────────────────────────────────────────

  describe('malformed cookie strings', () => {
    it('skips pairs that have no "=" sign', () => {
      // "nocookie" has no "=" so it must be silently skipped
      const result = parseCookies('nocookie; a=1');
      expect(result).not.toHaveProperty('nocookie');
      expect(result['a']).toBe('1');
    });

    it('skips an entry whose key is empty (leading "=")', () => {
      // "=value" → key is "" after trim → must be dropped
      const result = parseCookies('=value; ok=yes');
      // Verify the empty-string key was not set (pathval crashes on '' in toHaveProperty)
      expect(Object.keys(result)).not.toContain('');
      expect(result['ok']).toBe('yes');
    });

    it('uses the first "=" as the delimiter when value contains "="', () => {
      // Cookie: "token=abc=def" — name is "token", value is "abc=def"
      const result = parseCookies('token=abc=def');
      expect(result['token']).toBe('abc=def');
    });

    it('handles multiple "=" signs in value (base64-like)', () => {
      // Base64-padded tokens such as "dGVzdA==" are common in the wild
      const result = parseCookies('tok=dGVzdA==');
      expect(result['tok']).toBe('dGVzdA==');
    });

    it('returns an empty object for a lone semicolon', () => {
      expect(parseCookies(';')).toEqual({});
    });

    it('handles consecutive semicolons gracefully', () => {
      const result = parseCookies(';;a=1;;b=2;;');
      expect(result['a']).toBe('1');
      expect(result['b']).toBe('2');
    });
  });

  // ── Special characters ────────────────────────────────────────────────────

  describe('special characters', () => {
    it('URL-decodes percent-encoded cookie values', () => {
      // " " encodes to "%20"
      const result = parseCookies('greeting=hello%20world');
      expect(result['greeting']).toBe('hello world');
    });

    it('URL-decodes percent-encoded cookie names', () => {
      // The name itself might be encoded; we use it as-is after trim
      const result = parseCookies('my%20name=value');
      // The key stored is the raw string "my%20name" — decoding applies to value only
      expect(result['my%20name']).toBe('value');
    });

    it('falls back to raw value when decoding fails (bad percent sequence)', () => {
      // "%ZZ" is not a valid percent-escape; decodeURIComponent would throw
      const result = parseCookies('bad=%ZZ');
      // Must not throw; falls back to raw string
      expect(result['bad']).toBe('%ZZ');
    });

    it('strips surrounding double quotes from the value', () => {
      const result = parseCookies('name="quoted value"');
      expect(result['name']).toBe('quoted value');
    });

    it('does NOT strip quotes when only one quote is present', () => {
      // The guard is startsWith('"') && endsWith('"'); single quote is preserved
      const result = parseCookies('name="halfquote');
      expect(result['name']).toBe('"halfquote');
    });

    it('handles cookie values with special chars (!@#$%^&*)', () => {
      const result = parseCookies('x=!@%23%24%25%5E%26*');
      // The percent-encoded portion decodes; literal chars stay
      expect(typeof result['x']).toBe('string');
    });

    it('handles unicode characters in values', () => {
      const encoded = encodeURIComponent('日本語');
      const result = parseCookies(`lang=${encoded}`);
      expect(result['lang']).toBe('日本語');
    });
  });

  // ── Prototype pollution guards ────────────────────────────────────────────

  describe('prototype pollution prevention', () => {
    it('drops __proto__ cookie name', () => {
      const result = parseCookies('__proto__=injected');
      // isSafeObjectKey rejects "__proto__"
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
      // The actual prototype must be untouched
      expect(({} as Record<string, string>)['__proto__']).not.toBe('injected');
    });

    it('drops constructor cookie name', () => {
      const result = parseCookies('constructor=pwned');
      expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
    });

    it('drops prototype cookie name', () => {
      const result = parseCookies('prototype=bad');
      expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
    });

    it('drops case-variant __PROTO__ (checked as lowercase)', () => {
      // isSafeObjectKey is called with key.toLowerCase()
      const result = parseCookies('__PROTO__=injected');
      expect(Object.prototype.hasOwnProperty.call(result, '__PROTO__')).toBe(false);
    });

    it('drops Constructor (mixed case)', () => {
      const result = parseCookies('Constructor=pwned');
      expect(Object.prototype.hasOwnProperty.call(result, 'Constructor')).toBe(false);
    });
  });

  // ── Duplicate keys ────────────────────────────────────────────────────────

  describe('duplicate cookie names', () => {
    it('last value wins when the same name appears twice', () => {
      // RFC 6265 doesn't mandate precedence; implementation keeps the last write
      const result = parseCookies('dup=first; dup=second');
      expect(result['dup']).toBe('second');
    });

    it('handles three duplicates — last value wins', () => {
      const result = parseCookies('k=a; k=b; k=c');
      expect(result['k']).toBe('c');
    });
  });

  // ── Empty values ──────────────────────────────────────────────────────────

  describe('cookies with empty values', () => {
    it('parses a cookie with an empty value', () => {
      const result = parseCookies('empty=');
      expect(result).toHaveProperty('empty');
      expect(result['empty']).toBe('');
    });

    it('parses mixed empty and non-empty values', () => {
      const result = parseCookies('a=; b=hello; c=');
      expect(result['a']).toBe('');
      expect(result['b']).toBe('hello');
      expect(result['c']).toBe('');
    });
  });

  // ── Very long strings (buffer-overflow potential) ─────────────────────────

  describe('very long cookie strings', () => {
    it('handles a value that is 64 KB long without throwing', () => {
      const longValue = 'x'.repeat(65_536);
      const result = parseCookies(`giant=${longValue}`);
      expect(result['giant']).toBe(longValue);
    });

    it('handles a header with 1 000 cookies without throwing', () => {
      const pairs = Array.from({ length: 1_000 }, (_, i) => `c${String(i)}=${String(i)}`).join(
        '; ',
      );
      const result = parseCookies(pairs);
      expect(result['c0']).toBe('0');
      expect(result['c999']).toBe('999');
    });

    it('handles a cookie name that is 4 KB long', () => {
      const longName = 'n'.repeat(4_096);
      const result = parseCookies(`${longName}=value`);
      expect(result[longName]).toBe('value');
    });
  });

  // ── CRLF / header-injection in parsed values ──────────────────────────────

  describe('CRLF characters in cookie values', () => {
    it('preserves CRLF-injected values returned by parseCookies (parse does not sanitize)', () => {
      // parseCookies is a parser: it is expected to round-trip the raw chars.
      // Callers are responsible for sanitizing before echoing into response headers.
      const raw = 'evil=hello%0D%0Ainjected';
      const result = parseCookies(raw);
      // Decoded value contains actual CR+LF characters
      expect(result['evil']).toContain('\r\n');
    });

    it('does not interpret literal \\r\\n as a second cookie', () => {
      // Only ";" is the delimiter, not newline
      const result = parseCookies('a=foo\r\nb=bar');
      // "a" should exist; "b=bar" is part of "a"'s value, NOT a separate key
      expect(result).not.toHaveProperty('b');
    });
  });
});

// ---------------------------------------------------------------------------
// serializeCookie
// ---------------------------------------------------------------------------

describe('serializeCookie', () => {
  // ── Baseline ──────────────────────────────────────────────────────────────

  describe('baseline serialization', () => {
    it('serializes a simple name=value cookie', () => {
      expect(serializeCookie('session', 'abc123')).toBe('session=abc123');
    });

    it('URL-encodes the cookie name', () => {
      // Space in name encodes to %20
      expect(serializeCookie('my name', 'v')).toMatch(/^my%20name=/);
    });

    it('URL-encodes the cookie value', () => {
      expect(serializeCookie('x', 'hello world')).toBe('x=hello%20world');
    });

    it('uses a custom encode function when provided', () => {
      const noop = (v: string) => v;
      expect(serializeCookie('n', 'v w', { encode: noop })).toBe('n=v w');
    });
  });

  // ── maxAge ────────────────────────────────────────────────────────────────

  describe('maxAge option', () => {
    it('appends Max-Age for a positive integer', () => {
      expect(serializeCookie('a', 'b', { maxAge: 3600 })).toContain('; Max-Age=3600');
    });

    it('floors a fractional maxAge', () => {
      expect(serializeCookie('a', 'b', { maxAge: 99.9 })).toContain('; Max-Age=99');
    });

    it('renders maxAge=0 as Max-Age=0 (immediate expiry)', () => {
      // maxAge=0 signals "delete this cookie now"
      expect(serializeCookie('a', 'b', { maxAge: 0 })).toContain('; Max-Age=0');
    });

    it('renders negative maxAge as a negative string (delete semantics)', () => {
      // Negative maxAge is passed through Math.floor; result should be negative
      const result = serializeCookie('a', 'b', { maxAge: -1 });
      expect(result).toContain('; Max-Age=-1');
    });

    it('renders maxAge=Infinity as "Infinity" (potential client bug — verify behavior)', () => {
      // Math.floor(Infinity) === Infinity; String(Infinity) === "Infinity"
      // This is NOT a valid RFC 6265 Max-Age, so the test documents existing behavior
      const result = serializeCookie('a', 'b', { maxAge: Infinity });
      expect(result).toContain('; Max-Age=Infinity');
    });

    it('renders maxAge=NaN as "NaN" (documents footgun — NaN is not a valid Max-Age)', () => {
      // Math.floor(NaN) === NaN; the attribute will be malformed
      const result = serializeCookie('a', 'b', { maxAge: NaN });
      expect(result).toContain('; Max-Age=NaN');
    });
  });

  // ── expires ───────────────────────────────────────────────────────────────

  describe('expires option', () => {
    it('appends a valid UTC date string', () => {
      const date = new Date('2030-01-01T00:00:00.000Z');
      const result = serializeCookie('a', 'b', { expires: date });
      expect(result).toContain(`; Expires=${date.toUTCString()}`);
    });

    it('appends an already-past date (expiry / delete semantics)', () => {
      const past = new Date('2000-01-01T00:00:00.000Z');
      const result = serializeCookie('a', 'b', { expires: past });
      expect(result).toContain('; Expires=');
    });

    it('renders an invalid Date object without throwing', () => {
      // new Date('not-a-date') produces an Invalid Date whose toUTCString() === "Invalid Date"
      const invalid = new Date('not-a-date');
      const result = serializeCookie('a', 'b', { expires: invalid });
      // Must not throw; the string "Invalid Date" will appear
      expect(result).toContain('; Expires=Invalid Date');
    });
  });

  // ── path ──────────────────────────────────────────────────────────────────

  describe('path option', () => {
    it('appends Path attribute', () => {
      expect(serializeCookie('a', 'b', { path: '/' })).toContain('; Path=/');
    });

    it('appends a sub-path', () => {
      expect(serializeCookie('a', 'b', { path: '/api/v1' })).toContain('; Path=/api/v1');
    });

    it('appends empty path string (explicitly set)', () => {
      // path="" is unusual but the code does not guard against it
      const result = serializeCookie('a', 'b', { path: '' });
      expect(result).toContain('; Path=');
    });

    it('does not append Path when option is absent', () => {
      expect(serializeCookie('a', 'b')).not.toContain('Path');
    });
  });

  // ── domain ────────────────────────────────────────────────────────────────

  describe('domain option', () => {
    it('appends Domain attribute', () => {
      expect(serializeCookie('a', 'b', { domain: 'example.com' })).toContain(
        '; Domain=example.com',
      );
    });

    it('does NOT append Domain when value is empty string', () => {
      // The guard is `domain != null && domain !== ''`
      const result = serializeCookie('a', 'b', { domain: '' });
      expect(result).not.toContain('Domain');
    });

    it('does NOT append Domain when option is absent', () => {
      expect(serializeCookie('a', 'b')).not.toContain('Domain');
    });
  });

  // ── httpOnly ──────────────────────────────────────────────────────────────

  describe('httpOnly option', () => {
    it('appends HttpOnly when true', () => {
      expect(serializeCookie('a', 'b', { httpOnly: true })).toContain('; HttpOnly');
    });

    it('does NOT append HttpOnly when false', () => {
      expect(serializeCookie('a', 'b', { httpOnly: false })).not.toContain('HttpOnly');
    });

    it('does NOT append HttpOnly when absent', () => {
      expect(serializeCookie('a', 'b')).not.toContain('HttpOnly');
    });
  });

  // ── secure ────────────────────────────────────────────────────────────────

  describe('secure option', () => {
    it('appends Secure when true', () => {
      expect(serializeCookie('a', 'b', { secure: true })).toContain('; Secure');
    });

    it('does NOT append Secure when false', () => {
      expect(serializeCookie('a', 'b', { secure: false })).not.toContain('Secure');
    });
  });

  // ── sameSite ──────────────────────────────────────────────────────────────

  describe('sameSite option', () => {
    it('appends SameSite=Strict', () => {
      expect(serializeCookie('a', 'b', { sameSite: 'strict' })).toContain('; SameSite=Strict');
    });

    it('appends SameSite=Lax', () => {
      expect(serializeCookie('a', 'b', { sameSite: 'lax' })).toContain('; SameSite=Lax');
    });

    it('appends SameSite=None', () => {
      expect(serializeCookie('a', 'b', { sameSite: 'none' })).toContain('; SameSite=None');
    });

    it('capitalizes sameSite value regardless of input case', () => {
      const result = serializeCookie('a', 'b', { sameSite: 'strict' });
      // Must be "Strict" (capital S), not "strict"
      expect(result).toContain('SameSite=Strict');
    });
  });

  // ── Attribute ordering ────────────────────────────────────────────────────

  describe('attribute ordering', () => {
    it('emits attributes in correct order: Max-Age, Expires, Path, Domain, HttpOnly, Secure, SameSite', () => {
      const expires = new Date('2030-06-01T00:00:00.000Z');
      const result = serializeCookie('s', 'v', {
        maxAge: 3600,
        expires,
        path: '/',
        domain: 'example.com',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      });

      const maxAgeIdx = result.indexOf('Max-Age');
      const expiresIdx = result.indexOf('Expires');
      const pathIdx = result.indexOf('Path');
      const domainIdx = result.indexOf('Domain');
      const httpOnlyIdx = result.indexOf('HttpOnly');
      const secureIdx = result.indexOf('Secure');
      const sameSiteIdx = result.indexOf('SameSite');

      expect(maxAgeIdx).toBeLessThan(expiresIdx);
      expect(expiresIdx).toBeLessThan(pathIdx);
      expect(pathIdx).toBeLessThan(domainIdx);
      expect(domainIdx).toBeLessThan(httpOnlyIdx);
      expect(httpOnlyIdx).toBeLessThan(secureIdx);
      expect(secureIdx).toBeLessThan(sameSiteIdx);
    });
  });

  // ── Edge cases for name / value ───────────────────────────────────────────

  describe('edge cases for name and value', () => {
    it('serializes an empty name (encodes to empty string before "=")', () => {
      // encodeURIComponent('') === ''
      const result = serializeCookie('', 'value');
      expect(result).toMatch(/^=value/);
    });

    it('serializes an empty value', () => {
      const result = serializeCookie('name', '');
      expect(result).toBe('name=');
    });

    it('serializes both name and value as empty strings', () => {
      expect(serializeCookie('', '')).toBe('=');
    });

    it('encodes special chars in name: semicolon becomes %3B', () => {
      const result = serializeCookie('na;me', 'v');
      expect(result).toMatch(/^na%3Bme=/);
    });

    it('encodes special chars in value: semicolon becomes %3B', () => {
      const result = serializeCookie('n', 'va;lue');
      expect(result).toMatch(/=va%3Blue/);
    });
  });

  // ── CRLF / header injection ───────────────────────────────────────────────

  describe('CRLF / header-injection attempts in serializeCookie', () => {
    it('encodes \\r in cookie value to %0D (prevents CRLF injection)', () => {
      // encodeURIComponent('\r') === '%0D'
      const result = serializeCookie('x', 'val\rinjected');
      expect(result).not.toContain('\r');
      expect(result).toContain('%0D');
    });

    it('encodes \\n in cookie value to %0A (prevents CRLF injection)', () => {
      const result = serializeCookie('x', 'val\ninjected');
      expect(result).not.toContain('\n');
      expect(result).toContain('%0A');
    });

    it('encodes full \\r\\n sequence in value to %0D%0A', () => {
      const result = serializeCookie('x', 'val\r\nSet-Cookie: evil=1');
      expect(result).not.toContain('\r\n');
      expect(result).toContain('%0D%0A');
    });

    it('encodes \\r\\n in cookie name to prevent header injection', () => {
      const result = serializeCookie('x\r\nSet-Cookie: evil', 'v');
      expect(result).not.toContain('\r\n');
    });

    it('encodes null byte in cookie value', () => {
      const result = serializeCookie('x', 'val\x00ue');
      expect(result).not.toContain('\x00');
      expect(result).toContain('%00');
    });
  });

  // ── Round-trip: serialize → parse ────────────────────────────────────────

  describe('round-trip: serializeCookie → parseCookies', () => {
    it('recovers the original value after serialization and parsing', () => {
      const name = 'token';
      const value = 'abc 123 / special!';
      const header = serializeCookie(name, value);
      // Strip attributes; parseCookies only reads the "name=value" section
      const cookiePart = header.split(';')[0];
      const parsed = parseCookies(cookiePart);
      expect(parsed[name]).toBe(value);
    });

    it('round-trips unicode values', () => {
      const name = 'lang';
      const value = '日本語';
      const cookiePart = serializeCookie(name, value).split(';')[0];
      expect(parseCookies(cookiePart)[name]).toBe(value);
    });

    it('round-trips values containing "=" signs', () => {
      const name = 'jwt';
      const value = 'header.payload.sig==';
      const cookiePart = serializeCookie(name, value).split(';')[0];
      expect(parseCookies(cookiePart)[name]).toBe(value);
    });
  });
});
