// main/server/system/src/security/headers.ts
/**
 * Security Headers Utility
 *
 * Provides a framework-independent way to generate recommended
 * security headers for HTTP responses.
 */

export interface SecurityHeaderOptions {
  /** Content Security Policy (CSP) */
  csp?: string;
  /** HSTS duration in seconds (default: 1 year) */
  hstsMaxAge?: number;
  /** Whether to include HSTS includeSubDomains directive */
  hstsIncludeSubDomains?: boolean;
  /** Whether to include HSTS preload directive */
  hstsPreload?: boolean;
  /** X-Frame-Options (default: DENY) */
  frameOptions?: 'DENY' | 'SAMEORIGIN';
  /** X-Content-Type-Options (default: nosniff) */
  contentTypeOptions?: 'nosniff';
  /** Referrer-Policy (default: strict-origin-when-cross-origin) */
  referrerPolicy?: string;
  /** Permissions-Policy */
  permissionsPolicy?: string;
}

export type SecurityHeaders = Record<string, string>;

/**
 * Generate standard security headers based on options.
 *
 * @param options - Configuration for security headers
 * @returns Object containing header names and values
 */
export function generateSecurityHeaders(options: SecurityHeaderOptions = {}): SecurityHeaders {
  const headers: SecurityHeaders = {};

  // Content-Security-Policy
  if (options.csp != null) {
    headers['Content-Security-Policy'] = options.csp;
  }

  // Strict-Transport-Security (HSTS)
  const hstsMaxAge = options.hstsMaxAge ?? 31536000; // 1 year
  let hstsValue = `max-age=${hstsMaxAge}`;
  if (options.hstsIncludeSubDomains !== false) hstsValue += '; includeSubDomains';
  if (options.hstsPreload === true) hstsValue += '; preload';
  headers['Strict-Transport-Security'] = hstsValue;

  // X-Frame-Options
  headers['X-Frame-Options'] = options.frameOptions ?? 'DENY';

  // X-Content-Type-Options
  headers['X-Content-Type-Options'] = options.contentTypeOptions ?? 'nosniff';

  // Referrer-Policy
  headers['Referrer-Policy'] = options.referrerPolicy ?? 'strict-origin-when-cross-origin';

  // X-XSS-Protection (Legacy but good practice to set to 0 to disable buggy filters)
  headers['X-XSS-Protection'] = '0';

  // Permissions-Policy
  if (options.permissionsPolicy != null) {
    headers['Permissions-Policy'] = options.permissionsPolicy;
  }

  return headers;
}

/**
 * Get recommended security defaults for production environments.
 *
 * @returns Production-ready security header options
 */
export function getProductionSecurityDefaults(): SecurityHeaderOptions {
  return {
    // Basic restrictive CSP - override this in the app if needed
    csp: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; object-src 'none';",
    hstsMaxAge: 31536000,
    hstsIncludeSubDomains: true,
    hstsPreload: true,
    frameOptions: 'DENY',
    contentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
  };
}
