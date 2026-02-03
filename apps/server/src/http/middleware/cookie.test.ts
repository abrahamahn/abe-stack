// infra/src/http/middleware/cookie.test.ts
import { describe, expect, test } from 'vitest';

import { parseCookies, serializeCookie, signCookie, unsignCookie } from './cookie';

describe('Cookie Utilities', () => {
  describe('parseCookies', () => {
    test('should parse empty string', () => {
      expect(parseCookies('')).toEqual({});
    });

    test('should parse undefined', () => {
      expect(parseCookies(undefined)).toEqual({});
    });

    test('should parse single cookie', () => {
      expect(parseCookies('name=value')).toEqual({ name: 'value' });
    });

    test('should parse multiple cookies', () => {
      expect(parseCookies('name=value; foo=bar; baz=qux')).toEqual({
        name: 'value',
        foo: 'bar',
        baz: 'qux',
      });
    });

    test('should handle cookies with spaces', () => {
      expect(parseCookies('name = value ; foo = bar')).toEqual({
        name: 'value',
        foo: 'bar',
      });
    });

    test('should handle quoted values', () => {
      expect(parseCookies('name="quoted value"')).toEqual({
        name: 'quoted value',
      });
    });

    test('should decode URI encoded values', () => {
      expect(parseCookies('name=hello%20world')).toEqual({
        name: 'hello world',
      });
    });

    test('should handle invalid URI encoding gracefully', () => {
      expect(parseCookies('name=%invalid')).toEqual({
        name: '%invalid',
      });
    });

    test('should skip entries without equals sign', () => {
      expect(parseCookies('invalid; name=value')).toEqual({
        name: 'value',
      });
    });

    test('should handle empty values', () => {
      expect(parseCookies('name=')).toEqual({
        name: '',
      });
    });

    test('should handle values with equals sign', () => {
      expect(parseCookies('name=value=with=equals')).toEqual({
        name: 'value=with=equals',
      });
    });
  });

  describe('signCookie / unsignCookie', () => {
    const secret = 'test-secret-key';

    test('should sign and unsign cookie value', () => {
      const value = 'my-cookie-value';
      const signed = signCookie(value, secret);

      expect(signed).toContain(value);
      expect(signed).toContain('.');

      const result = unsignCookie(signed, secret);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(value);
    });

    test('should return invalid for tampered signature', () => {
      const value = 'my-cookie-value';
      const signed = signCookie(value, secret);
      const tampered = signed.slice(0, -5) + 'xxxxx';

      const result = unsignCookie(tampered, secret);
      expect(result.valid).toBe(false);
      expect(result.value).toBeNull();
    });

    test('should return invalid for wrong secret', () => {
      const value = 'my-cookie-value';
      const signed = signCookie(value, secret);

      const result = unsignCookie(signed, 'wrong-secret');
      expect(result.valid).toBe(false);
      expect(result.value).toBeNull();
    });

    test('should return invalid for unsigned value', () => {
      const result = unsignCookie('no-signature-here', secret);
      expect(result.valid).toBe(false);
      expect(result.value).toBeNull();
    });

    test('should return invalid for empty value', () => {
      const result = unsignCookie('', secret);
      expect(result.valid).toBe(false);
      expect(result.value).toBeNull();
    });

    test('should handle values with dots', () => {
      const value = 'value.with.dots';
      const signed = signCookie(value, secret);

      const result = unsignCookie(signed, secret);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(value);
    });
  });

  describe('serializeCookie', () => {
    test('should serialize basic cookie', () => {
      const result = serializeCookie('name', 'value');
      expect(result).toBe('name=value');
    });

    test('should encode special characters', () => {
      const result = serializeCookie('name', 'hello world');
      expect(result).toBe('name=hello%20world');
    });

    test('should include Max-Age', () => {
      const result = serializeCookie('name', 'value', { maxAge: 3600 });
      expect(result).toContain('Max-Age=3600');
    });

    test('should include Expires', () => {
      const expires = new Date('2025-01-01T00:00:00Z');
      const result = serializeCookie('name', 'value', { expires });
      expect(result).toContain('Expires=Wed, 01 Jan 2025 00:00:00 GMT');
    });

    test('should include Path', () => {
      const result = serializeCookie('name', 'value', { path: '/api' });
      expect(result).toContain('Path=/api');
    });

    test('should include Domain', () => {
      const result = serializeCookie('name', 'value', { domain: 'example.com' });
      expect(result).toContain('Domain=example.com');
    });

    test('should include HttpOnly', () => {
      const result = serializeCookie('name', 'value', { httpOnly: true });
      expect(result).toContain('HttpOnly');
    });

    test('should not include HttpOnly when false', () => {
      const result = serializeCookie('name', 'value', { httpOnly: false });
      expect(result).not.toContain('HttpOnly');
    });

    test('should include Secure', () => {
      const result = serializeCookie('name', 'value', { secure: true });
      expect(result).toContain('Secure');
    });

    test('should include SameSite=Strict', () => {
      const result = serializeCookie('name', 'value', { sameSite: 'strict' });
      expect(result).toContain('SameSite=Strict');
    });

    test('should include SameSite=Lax', () => {
      const result = serializeCookie('name', 'value', { sameSite: 'lax' });
      expect(result).toContain('SameSite=Lax');
    });

    test('should include SameSite=None', () => {
      const result = serializeCookie('name', 'value', { sameSite: 'none' });
      expect(result).toContain('SameSite=None');
    });

    test('should combine all options', () => {
      const result = serializeCookie('session', 'abc123', {
        maxAge: 86400,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      expect(result).toContain('session=abc123');
      expect(result).toContain('Max-Age=86400');
      expect(result).toContain('Path=/');
      expect(result).toContain('HttpOnly');
      expect(result).toContain('Secure');
      expect(result).toContain('SameSite=Strict');
    });
  });
});
