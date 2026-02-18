// main/apps/server/src/http/middleware/correlationId.ts
/**
 * Correlation ID Middleware
 *
 * Adds unique correlation IDs to requests for distributed tracing and error tracking.
 * Correlation IDs help trace requests across services and make debugging easier
 * by linking log entries and error reports to specific requests.
 *
 * The correlation ID is:
 * 1. Extracted from the incoming `x-correlation-id` header (if present)
 * 2. Or generated as a new UUID if not provided
 * 3. Set on the response headers for client-side tracking
 * 4. Available on the request object for use in handlers and error responses
 */

import { generateCorrelationId, isValidCorrelationId } from '@bslt/shared';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export { generateCorrelationId };

// ============================================================================
// Types
// ============================================================================

export interface CorrelationIdOptions {
  /** Header name for incoming correlation ID (default: 'x-correlation-id') */
  headerName?: string;
  /** Whether to always generate a new ID, ignoring incoming headers (default: false) */
  trustProxy?: boolean;
}

// Extend FastifyRequest to include correlationId
declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_HEADER_NAME = 'x-correlation-id';

// ============================================================================
// Middleware Registration
// ============================================================================

/**
 * Register the correlation ID hook on the Fastify instance.
 *
 * This hook runs on every request and:
 * 1. Extracts or generates a correlation ID
 * 2. Attaches it to the request object (req.correlationId)
 * 3. Sets it in the response headers
 *
 * @param app - The Fastify instance to register on
 * @param options - Configuration options for correlation ID behavior
 *
 * @example
 * ```typescript
 * // In server setup:
 * registerCorrelationIdHook(server);
 *
 * // In handlers:
 * const correlationId = request.correlationId;
 * logger.info({ correlationId }, 'Processing request');
 *
 * // In error responses:
 * reply.send({
 *   error: 'Something went wrong',
 *   correlationId: request.correlationId,
 * });
 * ```
 */
export function registerCorrelationIdHook(
  app: FastifyInstance,
  options: CorrelationIdOptions = {},
): void {
  const { headerName = DEFAULT_HEADER_NAME, trustProxy = true } = options;
  const headerNameLower = headerName.toLowerCase();

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    // Extract existing correlation ID from headers if trusting proxy
    let correlationId: string | undefined;

    if (trustProxy) {
      const headerValue = req.headers[headerNameLower];
      if (typeof headerValue === 'string' && isValidCorrelationId(headerValue)) {
        correlationId = headerValue;
      }
    }

    // Generate new ID if not provided or not trusted
    correlationId ??= generateCorrelationId();

    // Attach to request for use in handlers
    req.correlationId = correlationId;

    // Set in response headers for client tracking
    reply.header(headerName, correlationId);
  });
}
