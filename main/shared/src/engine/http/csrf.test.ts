// main/shared/src/engine/http/csrf.test.ts
import { describe, expect, it } from 'vitest';

import { extractCsrfToken } from './csrf';

describe('extractCsrfToken', () => {
  // ==========================================================================
  // Header extraction — happy paths
  // ==========================================================================
  describe('when a valid token is present in the default header', () => {
    it('returns the token from x-csrf-token header', () => {
      const headers = { 'x-csrf-token': 'abc123' };
      expect(extractCsrfToken(headers, null)).toBe('abc123');
    });

    it('returns the token when header name is upper-cased in lookup (lowercased fallback)', () => {
      // The implementation does `headers[headerName] ?? headers[headerName.toLowerCase()]`
      // Both keys are the same when the default is already lowercase, so test explicit
      // custom headerName that differs from its lowercase form.
      const headers = { 'x-csrf-token': 'tok' };
      expect(extractCsrfToken(headers, null, 'X-CSRF-TOKEN')).toBe('tok');
    });

    it('returns the token from a custom header name', () => {
      const headers = { 'x-my-csrf': 'custom-token' };
      expect(extractCsrfToken(headers, null, 'x-my-csrf')).toBe('custom-token');
    });
  });

  // ==========================================================================
  // Failure: missing / absent header
  // ==========================================================================
  describe('when the CSRF header is absent', () => {
    it('returns undefined when headers object is empty and body is null', () => {
      expect(extractCsrfToken({}, null)).toBeUndefined();
    });

    it('returns undefined when the header key is absent and body has no _csrf', () => {
      const headers = { 'content-type': 'application/json' };
      expect(extractCsrfToken(headers, null)).toBeUndefined();
    });

    it('returns undefined when the header value is undefined', () => {
      const headers: Record<string, string | string[] | undefined> = {
        'x-csrf-token': undefined,
      };
      expect(extractCsrfToken(headers, null)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Failure: empty header value
  // ==========================================================================
  describe('when the CSRF header is present but empty', () => {
    it('falls through to body when header is empty string', () => {
      // Empty string must NOT be returned — the function should skip it and
      // check the body instead.
      const headers = { 'x-csrf-token': '' };
      expect(extractCsrfToken(headers, null)).toBeUndefined();
    });

    it('falls through to body _csrf when header is empty and body has token', () => {
      const headers = { 'x-csrf-token': '' };
      const body = { _csrf: 'body-token' };
      expect(extractCsrfToken(headers, body)).toBe('body-token');
    });
  });

  // ==========================================================================
  // Failure: array header — multiple tokens
  // ==========================================================================
  describe('when the header value is an array (multiple tokens)', () => {
    it('returns only the first element of the array', () => {
      const headers: Record<string, string | string[] | undefined> = {
        'x-csrf-token': ['first-token', 'second-token'],
      };
      expect(extractCsrfToken(headers, null)).toBe('first-token');
    });

    it('falls through to body when the array is empty (first element is undefined)', () => {
      // An empty array: rawHeaderToken[0] === undefined, so headerToken is undefined
      const headers: Record<string, string | string[] | undefined> = {
        'x-csrf-token': [],
      };
      const body = { _csrf: 'body-fallback' };
      expect(extractCsrfToken(headers, body)).toBe('body-fallback');
    });

    it('returns the first token and ignores remaining ones even when they differ', () => {
      const headers: Record<string, string | string[] | undefined> = {
        'x-csrf-token': ['real', 'attacker-injected'],
      };
      expect(extractCsrfToken(headers, null)).toBe('real');
    });
  });

  // ==========================================================================
  // Whitespace tokens — the function does NOT trim; callers must be aware
  // ==========================================================================
  describe('when the token contains leading/trailing whitespace', () => {
    it('returns the token as-is without trimming whitespace', () => {
      // Adversarial: a whitespace-only token is NOT empty string — it passes
      // the != '' check and gets returned verbatim.
      const headers = { 'x-csrf-token': '   ' };
      expect(extractCsrfToken(headers, null)).toBe('   ');
    });

    it('returns a token with embedded whitespace unchanged', () => {
      const headers = { 'x-csrf-token': 'tok en with spaces' };
      expect(extractCsrfToken(headers, null)).toBe('tok en with spaces');
    });
  });

  // ==========================================================================
  // Very long token — no length guard in the implementation
  // ==========================================================================
  describe('when the token is extremely long', () => {
    it('returns the full token regardless of length', () => {
      const longToken = 'a'.repeat(100_000);
      const headers = { 'x-csrf-token': longToken };
      expect(extractCsrfToken(headers, null)).toBe(longToken);
    });
  });

  // ==========================================================================
  // Body fallback
  // ==========================================================================
  describe('body _csrf fallback', () => {
    it('returns _csrf from body when header is absent', () => {
      const body = { _csrf: 'body-csrf-value' };
      expect(extractCsrfToken({}, body)).toBe('body-csrf-value');
    });

    it('returns undefined when body is null', () => {
      expect(extractCsrfToken({}, null)).toBeUndefined();
    });

    it('returns undefined when body is a primitive (number)', () => {
      expect(extractCsrfToken({}, 42)).toBeUndefined();
    });

    it('returns undefined when body is a string (no _csrf property)', () => {
      expect(extractCsrfToken({}, 'raw-string-body')).toBeUndefined();
    });

    it('returns undefined when body._csrf is undefined', () => {
      const body = { _csrf: undefined };
      expect(extractCsrfToken({}, body)).toBeUndefined();
    });

    it('header takes priority over body even when both are present', () => {
      const headers = { 'x-csrf-token': 'header-token' };
      const body = { _csrf: 'body-token' };
      expect(extractCsrfToken(headers, body)).toBe('header-token');
    });

    it('returns undefined when body is an empty object', () => {
      expect(extractCsrfToken({}, {})).toBeUndefined();
    });
  });

  // ==========================================================================
  // Header name case sensitivity
  // ==========================================================================
  describe('header name lookup semantics', () => {
    it('does not find a token stored under a differently-cased key when custom headerName matches neither', () => {
      // headerName = 'X-CSRF-TOKEN', looks up headers['X-CSRF-TOKEN'] then
      // headers['x-csrf-token']. If the stored key is 'X-Csrf-Token' it won't match.
      const headers = { 'X-Csrf-Token': 'mixed-case-value' };
      expect(extractCsrfToken(headers, null, 'X-CSRF-TOKEN')).toBeUndefined();
    });

    it('finds the token via the lowercase fallback lookup path', () => {
      // headers['X-CSRF-TOKEN'] is undefined, but headers['x-csrf-token'] exists.
      const headers = { 'x-csrf-token': 'lowercase-key-token' };
      expect(extractCsrfToken(headers, null, 'X-CSRF-TOKEN')).toBe('lowercase-key-token');
    });
  });
});
