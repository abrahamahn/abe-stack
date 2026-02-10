// src/server/core/src/auth/security/captcha.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isCaptchaRequired, verifyCaptchaToken, verifyTurnstileToken } from './captcha';

import type { AuthConfig } from '@abe-stack/shared/config';

// ============================================================================
// Helpers
// ============================================================================

function createAuthConfig(captcha?: AuthConfig['captcha']): AuthConfig {
  return { captcha } as AuthConfig;
}

// ============================================================================
// Tests: isCaptchaRequired
// ============================================================================

describe('isCaptchaRequired', () => {
  it('returns false when captcha config is undefined', () => {
    expect(isCaptchaRequired(createAuthConfig(undefined))).toBe(false);
  });

  it('returns false when captcha is disabled', () => {
    expect(
      isCaptchaRequired(
        createAuthConfig({
          enabled: false,
          provider: 'turnstile',
          siteKey: 'sk',
          secretKey: 'secret',
        }),
      ),
    ).toBe(false);
  });

  it('returns true when captcha is enabled', () => {
    expect(
      isCaptchaRequired(
        createAuthConfig({
          enabled: true,
          provider: 'turnstile',
          siteKey: 'sk',
          secretKey: 'secret',
        }),
      ),
    ).toBe(true);
  });
});

// ============================================================================
// Tests: verifyCaptchaToken
// ============================================================================

describe('verifyCaptchaToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when captcha is disabled', async () => {
    const config = createAuthConfig(undefined);
    const result = await verifyCaptchaToken(config, '');
    expect(result).toEqual({ success: true, errorCodes: [] });
  });

  it('returns success when captcha enabled=false', async () => {
    const config = createAuthConfig({
      enabled: false,
      provider: 'turnstile',
      siteKey: 'sk',
      secretKey: 'secret',
    });
    const result = await verifyCaptchaToken(config, '');
    expect(result).toEqual({ success: true, errorCodes: [] });
  });

  it('returns failure for empty token when captcha is enabled', async () => {
    const config = createAuthConfig({
      enabled: true,
      provider: 'turnstile',
      siteKey: 'sk',
      secretKey: 'secret',
    });
    const result = await verifyCaptchaToken(config, '');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('missing-input-response');
  });
});

// ============================================================================
// Tests: verifyTurnstileToken
// ============================================================================

describe('verifyTurnstileToken', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns success for valid token verification', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          'error-codes': [],
        }),
    });

    const result = await verifyTurnstileToken('test-secret', 'valid-token', '127.0.0.1');

    expect(result).toEqual({ success: true, errorCodes: [] });
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it('returns failure for invalid token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
    });

    const result = await verifyTurnstileToken('test-secret', 'bad-token');

    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('invalid-input-response');
  });

  it('returns failure on HTTP error response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const result = await verifyTurnstileToken('test-secret', 'some-token');

    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('http-error-500');
  });

  it('returns failure on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));

    const result = await verifyTurnstileToken('test-secret', 'some-token');

    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('network-error');
  });

  it('returns failure on fetch abort (timeout)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const result = await verifyTurnstileToken('test-secret', 'some-token');

    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('network-error');
  });
});
