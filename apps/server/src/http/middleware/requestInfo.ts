// infra/src/http/middleware/requestInfo.ts
/**
 * Request Info Middleware
 *
 * Centralizes extraction of client information (IP address, user agent)
 * from incoming requests. This middleware decorates all requests with
 * a requestInfo property that handlers can use directly.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface RequestInfo {
  ipAddress: string;
  userAgent: string | undefined;
}

// Extend FastifyRequest to include requestInfo
declare module 'fastify' {
  interface FastifyRequest {
    requestInfo: RequestInfo;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract IP address from request
 * Relies on Fastify's built-in IP detection (configured via trustProxy)
 *
 * @param req - The Fastify request object
 * @returns The client IP address string, or 'unknown' if not available
 */
function extractIpAddress(req: FastifyRequest): string {
  // Fastify's req.ip respects trustProxy setting and handles X-Forwarded-For
  return req.ip !== '' ? req.ip : 'unknown';
}

/**
 * Extract user agent from request headers
 * Limits length to prevent log bloat
 *
 * @param req - The Fastify request object
 * @returns The user agent string, or undefined if not provided
 */
function extractUserAgent(req: FastifyRequest): string | undefined {
  const userAgent = req.headers['user-agent'];

  if (typeof userAgent !== 'string' || userAgent === '') {
    return undefined;
  }

  // Limit length to prevent log bloat
  const MAX_USER_AGENT_LENGTH = 500;
  return userAgent.substring(0, MAX_USER_AGENT_LENGTH);
}

// ============================================================================
// Middleware Registration
// ============================================================================

/**
 * Register the request info hook on the Fastify instance
 *
 * This hook runs on every request and decorates req.requestInfo with
 * the client's IP address and user agent. This centralizes the extraction
 * logic that was previously duplicated across handlers.
 *
 * @param app - The Fastify instance to register on
 *
 * @example
 * ```typescript
 * // In server setup:
 * registerRequestInfoHook(server);
 *
 * // In handlers:
 * const { ipAddress, userAgent } = request.requestInfo;
 * ```
 */
export function registerRequestInfoHook(app: FastifyInstance): void {
  app.addHook('onRequest', (req, _reply, done) => {
    req.requestInfo = {
      ipAddress: extractIpAddress(req),
      userAgent: extractUserAgent(req),
    };
    done();
  });
}
