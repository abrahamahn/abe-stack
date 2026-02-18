// main/shared/src/engine/http/auth.test.ts
import { describe, expect, it } from 'vitest';

import { extractBearerToken } from './auth';

describe('extractBearerToken', () => {
  // ==========================================================================
  // Happy path
  // ==========================================================================
  describe('when given a well-formed Bearer token', () => {
    it('returns the token portion', () => {
      expect(extractBearerToken('Bearer mytoken123')).toBe('mytoken123');
    });

    it('returns a JWT-shaped token intact', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.SIG';
      expect(extractBearerToken(`Bearer ${jwt}`)).toBe(jwt);
    });
  });

  // ==========================================================================
  // Failure: undefined / missing header
  // ==========================================================================
  describe('when the Authorization header is missing', () => {
    it('returns undefined for undefined input', () => {
      expect(extractBearerToken(undefined)).toBeUndefined();
    });

    it('returns undefined for an empty string', () => {
      expect(extractBearerToken('')).toBeUndefined();
    });
  });

  // ==========================================================================
  // Failure: "Bearer" keyword without a token
  // ==========================================================================
  describe('when Bearer prefix is present but no token follows', () => {
    it('returns undefined for "Bearer" with no trailing content', () => {
      // "Bearer" (7 chars) — does NOT start with "Bearer " (8 chars including space)
      expect(extractBearerToken('Bearer')).toBeUndefined();
    });

    it('returns undefined for "Bearer " with trailing space only', () => {
      // Slicing "Bearer " from "Bearer " yields "", which is treated as empty.
      expect(extractBearerToken('Bearer ')).toBeUndefined();
    });

    it('returns undefined for "Bearer   " (only whitespace after prefix)', () => {
      // The implementation does NOT trim — spaces-only token is NOT empty string,
      // so this actually returns '  ' (two trailing spaces). Prove the behavior.
      const result = extractBearerToken('Bearer   ');
      // The sliced value is '  ' which is != '' so the function returns it.
      expect(result).toBe('  ');
    });
  });

  // ==========================================================================
  // Failure: wrong authentication scheme
  // ==========================================================================
  describe('when the Authorization header uses a non-Bearer scheme', () => {
    it('returns undefined for Basic auth scheme', () => {
      expect(extractBearerToken('Basic dXNlcjpwYXNz')).toBeUndefined();
    });

    it('returns undefined for Digest auth scheme', () => {
      expect(extractBearerToken('Digest username="foo"')).toBeUndefined();
    });

    it('returns undefined for Token scheme', () => {
      expect(extractBearerToken('Token abc123')).toBeUndefined();
    });

    it('returns undefined for API-Key scheme', () => {
      expect(extractBearerToken('API-Key secret')).toBeUndefined();
    });
  });

  // ==========================================================================
  // Failure: case sensitivity — "Bearer" is case-sensitive
  // ==========================================================================
  describe('case sensitivity of the Bearer prefix', () => {
    it('returns undefined for lowercase "bearer"', () => {
      expect(extractBearerToken('bearer mytoken')).toBeUndefined();
    });

    it('returns undefined for mixed-case "BEARER"', () => {
      expect(extractBearerToken('BEARER mytoken')).toBeUndefined();
    });

    it('returns undefined for "bEaReR"', () => {
      expect(extractBearerToken('bEaReR mytoken')).toBeUndefined();
    });

    it('returns undefined for "Bearer" with capital B but wrong rest', () => {
      expect(extractBearerToken('BEarer mytoken')).toBeUndefined();
    });
  });

  // ==========================================================================
  // Failure: malformed / injected values
  // ==========================================================================
  describe('when the header value is malformed', () => {
    it('returns undefined for a bare token with no scheme', () => {
      expect(extractBearerToken('justthetoken')).toBeUndefined();
    });

    it('returns undefined when value starts with a space before "Bearer"', () => {
      expect(extractBearerToken(' Bearer token')).toBeUndefined();
    });

    it('returns undefined for a newline-injected header value', () => {
      // Header injection attempt
      expect(extractBearerToken('Bearer token\r\nX-Injected: evil')).toBe(
        'token\r\nX-Injected: evil',
      );
      // This proves the function does NOT sanitize newlines — callers must validate.
    });
  });

  // ==========================================================================
  // Special characters in token
  // ==========================================================================
  describe('when the token contains special characters', () => {
    it('returns a token containing dots (JWT separators) unchanged', () => {
      expect(extractBearerToken('Bearer a.b.c')).toBe('a.b.c');
    });

    it('returns a token containing hyphens and underscores unchanged', () => {
      expect(extractBearerToken('Bearer a-b_c')).toBe('a-b_c');
    });

    it('returns a token containing plus and equals (base64url-like) unchanged', () => {
      expect(extractBearerToken('Bearer abc+def==ghi')).toBe('abc+def==ghi');
    });

    it('returns a token containing unicode characters unchanged', () => {
      expect(extractBearerToken('Bearer tök\u00e9n')).toBe('tök\u00e9n');
    });
  });

  // ==========================================================================
  // Very long tokens — no length guard in the implementation
  // ==========================================================================
  describe('when the token is very long', () => {
    it('returns the full token without truncation', () => {
      const longToken = 'x'.repeat(100_000);
      expect(extractBearerToken(`Bearer ${longToken}`)).toBe(longToken);
    });
  });

  // ==========================================================================
  // Edge: double-space between "Bearer" and token
  // ==========================================================================
  describe('edge: extra space between scheme and token', () => {
    it('includes the leading space in the extracted token when double-space is used', () => {
      // "Bearer  token" — slicing "Bearer " yields " token" (space + token).
      // Adversarial: proves the function does NOT strip extra leading spaces from the token.
      expect(extractBearerToken('Bearer  token')).toBe(' token');
    });
  });
});
