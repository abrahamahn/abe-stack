// src/shared/src/utils/http/http.test.ts
import { describe, expect, it } from 'vitest';

import { parseCookies, serializeCookie } from './http';

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
});
