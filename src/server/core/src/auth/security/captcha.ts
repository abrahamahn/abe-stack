// src/server/core/src/auth/security/captcha.ts
/**
 * CAPTCHA Verification Service
 *
 * Server-side verification of CAPTCHA tokens for bot protection.
 * Currently supports Cloudflare Turnstile. Designed for easy extension
 * to other providers (reCAPTCHA, hCaptcha).
 *
 * @module security/captcha
 */

import type { AuthConfig } from '@abe-stack/shared/config';

// ============================================================================
// Constants
// ============================================================================

/** Cloudflare Turnstile verification endpoint */
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Maximum time (ms) to wait for CAPTCHA verification response */
const VERIFY_TIMEOUT_MS = 10_000;

// ============================================================================
// Types
// ============================================================================

/**
 * Result of CAPTCHA token verification.
 *
 * @complexity O(1) per field access
 */
export interface CaptchaVerifyResult {
  /** Whether the CAPTCHA token is valid */
  readonly success: boolean;
  /** Error codes returned by the provider (empty on success) */
  readonly errorCodes: string[];
}

/**
 * Cloudflare Turnstile siteverify response shape.
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
interface TurnstileResponse {
  readonly success: boolean;
  readonly 'error-codes': string[];
  readonly challenge_ts?: string;
  readonly hostname?: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Verify a Cloudflare Turnstile CAPTCHA token.
 *
 * Makes an HTTP POST to the Turnstile siteverify endpoint with the
 * secret key and client-provided token.
 *
 * @param secretKey - Server-side Turnstile secret key
 * @param token - Client-provided CAPTCHA response token
 * @param remoteIp - Optional client IP address for additional validation
 * @returns Verification result with success flag and error codes
 * @throws Never — returns failure result instead of throwing
 * @complexity O(1) — single HTTP request
 */
export async function verifyTurnstileToken(
  secretKey: string,
  token: string,
  remoteIp?: string,
): Promise<CaptchaVerifyResult> {
  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (remoteIp !== undefined) {
      body.set('remoteip', remoteIp);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, VERIFY_TIMEOUT_MS);

    try {
      const response = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          success: false,
          errorCodes: [`http-error-${String(response.status)}`],
        };
      }

      const data = (await response.json()) as TurnstileResponse;

      return {
        success: data.success,
        errorCodes: data['error-codes'],
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return {
      success: false,
      errorCodes: ['network-error'],
    };
  }
}

/**
 * Verify a CAPTCHA token using the configured provider.
 *
 * Reads the CAPTCHA config to determine which provider to use,
 * then delegates to the appropriate verification function.
 *
 * @param config - Auth configuration containing CAPTCHA settings
 * @param token - Client-provided CAPTCHA response token
 * @param remoteIp - Optional client IP for additional validation
 * @returns Verification result
 * @complexity O(1)
 */
export async function verifyCaptchaToken(
  config: AuthConfig,
  token: string,
  remoteIp?: string,
): Promise<CaptchaVerifyResult> {
  const captchaConfig = config.captcha;

  // If CAPTCHA is not configured or disabled, pass through
  if (captchaConfig?.enabled !== true) {
    return { success: true, errorCodes: [] };
  }

  // Validate the token is not empty
  if (token === '') {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  // Route to the correct provider
  return verifyTurnstileToken(captchaConfig.secretKey, token, remoteIp);
}

/**
 * Check whether CAPTCHA verification is required based on config.
 *
 * @param config - Auth configuration
 * @returns True if CAPTCHA is enabled and configured
 * @complexity O(1)
 */
export function isCaptchaRequired(config: AuthConfig): boolean {
  return config.captcha?.enabled === true;
}
