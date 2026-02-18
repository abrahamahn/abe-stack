// main/apps/server/src/http/middleware/security.ts
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

import {
  generateSecurityHeaders,
  getProductionSecurityDefaults,
  type SecurityHeaderOptions,
} from '@bslt/server-system';
import {
  HTTP_STATUS,
  SECONDS_PER_DAY,
  hasDangerousKeys,
  sanitizePrototype,
} from '@bslt/shared';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Security Headers (Replaces @fastify/helmet)
// ============================================================================

export { getProductionSecurityDefaults, type SecurityHeaderOptions };

/**
 * Apply security headers to a Fastify reply
 *
 * @param res - The Fastify reply object
 * @param options - Security header configuration options
 */
export function applySecurityHeaders(res: FastifyReply, options: SecurityHeaderOptions = {}): void {
  const headers = generateSecurityHeaders(options);

  for (const [key, value] of Object.entries(headers)) {
    res.header(key, value);
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

export { hasDangerousKeys, sanitizePrototype };

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
        const sanitized = sanitizePrototype(parsed);

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
