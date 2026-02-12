// src/apps/server/src/http/middleware/security.ts
/**
 * HTTP Security Middleware
 *
 * Explicit security headers and CORS handling.
 * Replaces @fastify/helmet and @fastify/cors with framework-independent logic.
 *
 * Benefits:
 * - Full control over what headers are set
 * - No hidden defaults or unexpected behavior
 * - Easier to audit and understand
 */

import { HTTP_STATUS, SECONDS_PER_DAY } from '@abe-stack/shared';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Security Headers (Replaces @fastify/helmet)
// ============================================================================

/**
 * Apply security headers to the response.
 * We explicitly choose what we enable, rather than trusting plugin defaults.
 */
export interface SecurityHeaderOptions {
  /**
   * Enable Content Security Policy (CSP) header.
   *
   * CSP is a powerful defense against XSS attacks by restricting which resources
   * can be loaded. However, it requires careful configuration:
   *
   * - May break inline scripts/styles if not configured properly
   * - Requires 'unsafe-inline' for many CSS frameworks
   * - May need nonce-based script loading for dynamic content
   *
   * RECOMMENDATION: Enable in production after testing your application.
   * Use the getProductionSecurityDefaults() helper for sensible production defaults.
   *
   * Default: false (opt-in to avoid breaking existing applications)
   */
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableFrameOptions?: boolean;
  enableContentTypeOptions?: boolean;
  enableXSSProtection?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
  enableCrossOriginEmbedderPolicy?: boolean;
  enableCrossOriginOpenerPolicy?: boolean;
  enableCrossOriginResourcePolicy?: boolean;
  cspNonce?: string;
}

/**
 * Get recommended security header defaults for production environments.
 * These enable stricter security settings including CSP.
 *
 * @returns SecurityHeaderOptions configured for production
 *
 * @example
 * ```typescript
 * applySecurityHeaders(res, getProductionSecurityDefaults());
 * ```
 */
export function getProductionSecurityDefaults(): SecurityHeaderOptions {
  return {
    enableCSP: true,
    enableHSTS: true,
    enableFrameOptions: true,
    enableContentTypeOptions: true,
    enableXSSProtection: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
    enableCrossOriginEmbedderPolicy: false, // May break cross-origin resources
    enableCrossOriginOpenerPolicy: false, // May break OAuth popups
    enableCrossOriginResourcePolicy: false, // May break CDN resources
  };
}

/**
 * Apply security headers to a Fastify reply
 *
 * @param res - The Fastify reply object
 * @param options - Security header configuration options
 */
export function applySecurityHeaders(res: FastifyReply, options: SecurityHeaderOptions = {}): void {
  const {
    enableCSP = false, // Default false for backwards compatibility; use getProductionSecurityDefaults() in production
    enableHSTS = true,
    enableFrameOptions = true,
    enableContentTypeOptions = true,
    enableXSSProtection = true,
    enableReferrerPolicy = true,
    enablePermissionsPolicy = true,
    enableCrossOriginEmbedderPolicy = false,
    enableCrossOriginOpenerPolicy = false,
    enableCrossOriginResourcePolicy = false,
    cspNonce,
  } = options;

  // Prevent clickjacking - deny all framing
  if (enableFrameOptions) {
    res.header('X-Frame-Options', 'DENY');
  }

  // Prevent MIME type sniffing attacks
  if (enableContentTypeOptions) {
    res.header('X-Content-Type-Options', 'nosniff');
  }

  // Basic XSS protection for older browsers
  if (enableXSSProtection) {
    res.header('X-XSS-Protection', '1; mode=block');
  }

  // HTTP Strict Transport Security (HSTS) - 1 year with subdomains and preload
  if (enableHSTS) {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Control referrer information sent with requests
  if (enableReferrerPolicy) {
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  // Restrict browser features/APIs
  if (enablePermissionsPolicy) {
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  // Content Security Policy with nonce-based script execution
  if (enableCSP) {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'", // Allow inline styles for now
      "img-src 'self' data: https:", // Allow data URLs and HTTPS images
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'self'",
      "object-src 'none'", // Block plugins
      "frame-src 'none'", // Block iframes
      "base-uri 'self'",
      "form-action 'self'",
    ];

    if (cspNonce != null && cspNonce !== '') {
      // Insert nonce-based script-src if nonce is provided
      cspDirectives[1] = `script-src 'self' 'nonce-${cspNonce}'`;
    }

    res.header('Content-Security-Policy', cspDirectives.join('; '));
  }

  // Cross-Origin Embedder Policy - prevents loading cross-origin resources
  if (enableCrossOriginEmbedderPolicy) {
    res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  }

  // Cross-Origin Opener Policy - isolates the browsing context
  if (enableCrossOriginOpenerPolicy) {
    res.header('Cross-Origin-Opener-Policy', 'same-origin');
  }

  // Cross-Origin Resource Policy - blocks cross-origin requests
  if (enableCrossOriginResourcePolicy) {
    res.header('Cross-Origin-Resource-Policy', 'same-origin');
  }

  // Remove server information (don't advertise technology stack)
  res.header('X-Powered-By', undefined);
  res.header('Server', undefined);
}

/**
 * Apply Cache-Control headers to prevent sensitive data from being cached.
 * Should be applied to API routes only (not static assets).
 *
 * Prevents back-button data leak: after logout, pressing back won't show
 * cached authenticated responses.
 */
export function applyApiCacheHeaders(res: FastifyReply): void {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.header('Pragma', 'no-cache');
}

// ============================================================================
// CORS Headers (Replaces @fastify/cors)
// ============================================================================

export interface CorsOptions {
  origin: string;
  credentials?: boolean;
  allowedHeaders?: string[];
  allowedMethods?: string[];
  maxAge?: number;
}

const DEFAULT_CORS_OPTIONS: Required<Omit<CorsOptions, 'origin'>> = {
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  maxAge: SECONDS_PER_DAY,
};

/**
 * Apply CORS headers to the response.
 * Handles origin validation and header setting.
 *
 * @param req - The Fastify request object
 * @param res - The Fastify reply object
 * @param options - CORS configuration options
 */
export function applyCors(req: FastifyRequest, res: FastifyReply, options: CorsOptions): void {
  const {
    origin: allowedOrigin,
    credentials,
    allowedHeaders,
    allowedMethods,
    maxAge,
  } = {
    ...DEFAULT_CORS_OPTIONS,
    ...options,
  };

  const requestOrigin = req.headers.origin;
  let allowOrigin: string | null = null;

  if (allowedOrigin === '*') {
    // Wildcard origin: use literal '*' only, never reflect arbitrary origins.
    // Credentials cannot be used with wildcard origin per the CORS spec.
    allowOrigin = '*';
  } else if (requestOrigin === allowedOrigin) {
    // Exact match: use the configured value (not the request header) to avoid reflection
    allowOrigin = allowedOrigin;
  } else if (requestOrigin != null) {
    // Multi-origin: check if request origin matches one in the configured allowlist
    const matched = findAllowedOrigin(requestOrigin, allowedOrigin);
    if (matched !== undefined) {
      allowOrigin = matched;
    }
  }

  if (allowOrigin != null) {
    res.header('Access-Control-Allow-Origin', allowOrigin);
    if (allowOrigin !== '*') {
      res.header('Vary', 'Origin');
    }
  }

  if (credentials && allowOrigin != null && allowOrigin !== '*') {
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  // Allowed headers and methods
  res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  res.header('Access-Control-Allow-Methods', allowedMethods.join(', '));

  // Cache preflight response
  res.header('Access-Control-Max-Age', String(maxAge));
}

/**
 * Find a matching origin from a comma-separated allowlist.
 * Returns the configured origin value (not the request header) to avoid origin reflection.
 *
 * @param origin - The request origin to check
 * @param allowedOrigins - Comma-separated list of allowed origins
 * @returns The matched configured origin, or undefined if not found
 */
function findAllowedOrigin(origin: string, allowedOrigins: string): string | undefined {
  const origins = allowedOrigins.split(',').map((o) => o.trim());
  return origins.find((o) => o === origin);
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns true if the request was a preflight and was handled.
 *
 * @param req - The Fastify request object
 * @param res - The Fastify reply object
 * @returns true if the request was a preflight OPTIONS request
 */
export function handlePreflight(req: FastifyRequest, res: FastifyReply): boolean {
  if (req.method === 'OPTIONS') {
    res.status(HTTP_STATUS.NO_CONTENT).send();
    return true;
  }
  return false;
}

// ============================================================================
// Prototype Pollution Protection
// ============================================================================

/**
 * Keys that can be exploited for prototype pollution attacks.
 * These keys allow attackers to modify Object.prototype or other prototypes
 * through JSON input, potentially leading to security vulnerabilities.
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Recursively sanitize an object by removing dangerous prototype pollution keys.
 * This prevents attacks where malicious JSON payloads attempt to modify
 * Object.prototype through __proto__, constructor, or prototype properties.
 *
 * @param obj - The value to sanitize (can be any JSON-parseable value)
 * @returns The sanitized value with dangerous keys removed
 *
 * @example
 * ```typescript
 * // Malicious input: { "__proto__": { "isAdmin": true } }
 * // After sanitization: {}
 * ```
 */
export function sanitizeObject(obj: unknown): unknown {
  // Primitives and null pass through unchanged
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Arrays: recursively sanitize each element
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  // Objects: filter out dangerous keys and recursively sanitize values
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!DANGEROUS_KEYS.includes(key)) {
      result[key] = sanitizeObject(value);
    }
  }
  return result;
}

/**
 * Check if an object contains any dangerous prototype pollution keys.
 * This can be used for validation/logging before sanitization.
 *
 * @param obj - The value to check
 * @returns true if the object contains dangerous keys at any depth
 */
export function hasDangerousKeys(obj: unknown): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  if (Array.isArray(obj)) {
    return obj.some(hasDangerousKeys);
  }

  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.includes(key)) {
      return true;
    }
    if (hasDangerousKeys((obj as Record<string, unknown>)[key])) {
      return true;
    }
  }

  return false;
}

/**
 * Create a custom JSON parser for Fastify that sanitizes prototype pollution keys.
 * This integrates with Fastify's content type parser to automatically sanitize
 * all incoming JSON request bodies.
 *
 * @param server - The Fastify instance to register the parser on
 *
 * @example
 * ```typescript
 * const server = Fastify();
 * registerPrototypePollutionProtection(server);
 * ```
 */
export function registerPrototypePollutionProtection(server: FastifyInstance): void {
  // Remove the default JSON parser and add our sanitizing version
  server.removeContentTypeParser('application/json');

  server.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req: FastifyRequest, body: string, done: (err: Error | null, body?: unknown) => void) => {
      try {
        // Handle empty body
        if (body === '' || body.trim() === '') {
          done(null, undefined);
          return;
        }

        // Parse JSON
        const parsed: unknown = JSON.parse(body);

        // Sanitize to remove prototype pollution vectors
        const sanitized = sanitizeObject(parsed);

        done(null, sanitized);
      } catch (err) {
        // Re-throw parse errors with appropriate status
        const error = err instanceof Error ? err : new Error('Invalid JSON');
        (error as Error & { statusCode: number }).statusCode = 400;
        done(error);
      }
    },
  );
}
