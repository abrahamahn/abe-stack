// apps/server/src/infra/http/security.ts
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

import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Security Headers (Replaces @fastify/helmet)
// ============================================================================

/**
 * Apply security headers to the response.
 * We explicitly choose what we enable, rather than trusting plugin defaults.
 */
export function applySecurityHeaders(res: FastifyReply): void {
  // Prevent clickjacking - deny all framing
  res.header('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing attacks
  res.header('X-Content-Type-Options', 'nosniff');

  // Basic XSS protection for older browsers
  res.header('X-XSS-Protection', '1; mode=block');

  // HTTP Strict Transport Security (HSTS) - 1 year with subdomains
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Control referrer information sent with requests
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features/APIs
  res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
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
  maxAge: 86400, // 24 hours
};

/**
 * Apply CORS headers to the response.
 * Handles origin validation and header setting.
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

  // Determine if origin should be allowed
  if (allowedOrigin === '*') {
    // Wildcard - allow any origin (development only)
    res.header('Access-Control-Allow-Origin', requestOrigin || '*');
  } else if (requestOrigin === allowedOrigin) {
    // Exact match
    res.header('Access-Control-Allow-Origin', requestOrigin);
  } else if (requestOrigin && isOriginAllowed(requestOrigin, allowedOrigin)) {
    // Pattern match (comma-separated origins)
    res.header('Access-Control-Allow-Origin', requestOrigin);
  }
  // If no match, don't set the header (browser will block the request)

  // Credentials
  if (credentials) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  // Allowed headers and methods
  res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  res.header('Access-Control-Allow-Methods', allowedMethods.join(', '));

  // Cache preflight response
  res.header('Access-Control-Max-Age', String(maxAge));
}

/**
 * Check if origin is in a comma-separated list of allowed origins
 */
function isOriginAllowed(origin: string, allowedOrigins: string): boolean {
  const origins = allowedOrigins.split(',').map((o) => o.trim());
  return origins.includes(origin);
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns true if the request was a preflight and was handled.
 */
export function handlePreflight(req: FastifyRequest, res: FastifyReply): boolean {
  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return true;
  }
  return false;
}
