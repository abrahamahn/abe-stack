// main/shared/src/logger/correlation.ts
/**
 * Correlation ID Utilities
 *
 * Framework-agnostic correlation ID generation and extraction
 * for distributed request tracing. These pure functions have no
 * dependency on Fastify, pino, or any HTTP framework.
 */

import { STANDARD_HEADERS } from '../primitives/constants';

import type { RequestContext } from './types';

/**
 * Validate that a correlation ID is safe to use in headers/logs.
 * Prevents header injection attacks by limiting characters and length.
 *
 * @param id - The correlation ID string to validate
 * @returns true if the ID is safe to use
 * @complexity O(n)
 */
export function isValidCorrelationId(id: string): boolean {
  if (id === '' || id.length > 128) {
    return false;
  }

  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Generate a unique correlation ID using crypto.randomUUID().
 *
 * @returns A UUID v4 string for request correlation
 * @complexity O(1)
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Extract correlation ID from headers or generate a new one.
 * Checks headers in priority order:
 * 1. \`${STANDARD_HEADERS.CORRELATION_ID}\` - Explicit correlation header
 * 2. \`${STANDARD_HEADERS.REQUEST_ID}\` - Common request ID header
 * 3. `traceparent` - W3C Trace Context (extracts trace-id portion)
 * 4. Falls back to generating a new UUID
 *
 * @param headers - Record of header name to value (case-sensitive, lowercase keys expected)
 * @returns The correlation ID string
 * @complexity O(1)
 */
export function getOrCreateCorrelationId(headers: Record<string, string | undefined>): string {
  const correlationId = headers[STANDARD_HEADERS.CORRELATION_ID];
  if (
    correlationId != null &&
    correlationId !== '' &&
    typeof correlationId === 'string' &&
    isValidCorrelationId(correlationId)
  ) {
    return correlationId;
  }

  const requestId = headers[STANDARD_HEADERS.REQUEST_ID];
  if (
    requestId != null &&
    requestId !== '' &&
    typeof requestId === 'string' &&
    isValidCorrelationId(requestId)
  ) {
    return requestId;
  }

  // Handle W3C Trace Context (traceparent header)
  // Format: version-traceid-parentid-traceflags (e.g., 00-abc123-def456-01)
  const traceparent = headers['traceparent'];
  if (traceparent != null && traceparent !== '' && typeof traceparent === 'string') {
    const parts = traceparent.split('-');
    if (parts.length >= 2 && parts[1] != null && parts[1] !== '') {
      return parts[1]; // trace-id is the second segment
    }
  }

  return generateCorrelationId();
}

/**
 * Create a request context object from request metadata.
 * Assembles all relevant request information into a structured
 * context suitable for logging and tracing.
 *
 * @param correlationId - The correlation ID for the request
 * @param request - Request metadata containing id, method, url, ip, and headers
 * @param userId - Optional user ID if the request is authenticated
 * @returns A fully populated RequestContext object
 * @complexity O(1)
 */
export function createRequestContext(
  correlationId: string,
  request: {
    id: string;
    method: string;
    url: string;
    ip: string;
    headers: Record<string, string | undefined>;
  },
  userId?: string,
): RequestContext {
  const context: RequestContext = {
    correlationId,
    requestId: request.id,
    method: request.method,
    path: request.url,
    ip: request.ip,
  };
  const userAgent = request.headers['user-agent'];
  if (userAgent !== undefined) {
    context.userAgent = userAgent;
  }
  if (userId !== undefined) {
    context.userId = userId;
  }
  return context;
}
