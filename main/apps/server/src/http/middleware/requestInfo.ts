// main/apps/server/src/http/middleware/requestInfo.ts
/**
 * Request Info Middleware
 *
 * Centralizes extraction of client information (IP address, user agent)
 * from incoming requests. This middleware decorates all requests with
 * a requestInfo property that handlers can use directly.
 */

import {
  extractIpAddress,
  extractUserAgent,
  type RequestInfo as SharedRequestInfo,
} from '@bslt/shared';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export type RequestInfo = SharedRequestInfo;

// Extend FastifyRequest to include requestInfo
declare module 'fastify' {
  interface FastifyRequest {
    requestInfo: RequestInfo;
  }
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
      userAgent: extractUserAgent(req.headers as Record<string, string | string[] | undefined>),
    };
    done();
  });
}
