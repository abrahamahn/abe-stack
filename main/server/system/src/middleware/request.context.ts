// main/server/system/src/middleware/request.context.ts
/**
 * Request Context Enrichment Middleware
 *
 * Fastify plugin that enriches every request with structured context data:
 * - API version (from the versioning middleware)
 * - Structured timing logs for the request lifecycle
 * - Conditional log severity based on response status code
 *
 * Designed to complement the existing logging middleware in
 * `apps/server/src/middleware/logging.ts` without replacing it.
 *
 * @module middleware/request-context
 */

import type { ApiVersion, ApiVersionInfo, ApiVersionSource } from '../routing/api.versioning.types';
import type { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/**
 * Log severity level derived from the HTTP response status code.
 */
export type RequestSeverity = 'debug' | 'info' | 'warn' | 'error';

/**
 * A single timing entry in the request lifecycle.
 */
export interface TimingEntry {
  /** Label describing this timing phase (e.g. "request_start", "request_end") */
  label: string;
  /** High-resolution timestamp in milliseconds (from `performance.now()` or `Date.now()`) */
  timestamp: number;
}

/**
 * Enriched request context attached to every Fastify request.
 */
export interface EnrichedRequestContext {
  /** Resolved API version for this request */
  apiVersion: ApiVersion;
  /** How the version was determined */
  apiVersionSource: ApiVersionSource;
  /** Ordered list of timing entries recorded during the request lifecycle */
  timings: TimingEntry[];
  /** Log severity computed from the response status code (set on response) */
  severity: RequestSeverity;
  /** High-resolution start time for duration calculation */
  startTime: number;
}

// ============================================================================
// Fastify Declaration Merging
// ============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    /** Enriched request context with versioning, timing, and severity */
    enrichedContext: EnrichedRequestContext;
  }
}

// ============================================================================
// Severity Mapping
// ============================================================================

/**
 * Derive a log severity level from an HTTP status code.
 *
 * - 5xx -> error
 * - 4xx -> warn
 * - 3xx -> info
 * - 2xx -> debug
 * - anything else -> info
 *
 * @param statusCode - HTTP response status code
 * @returns The appropriate log severity
 */
export function severityFromStatus(statusCode: number): RequestSeverity {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  if (statusCode >= 300) return 'info';
  if (statusCode >= 200) return 'debug';
  return 'info';
}

// ============================================================================
// Context Factory
// ============================================================================

/**
 * Create an initial EnrichedRequestContext for a new request.
 *
 * @param versionInfo - Resolved API version info (from the versioning middleware or default)
 * @returns A fresh context with the first "request_start" timing entry
 */
export function createEnrichedContext(
  versionInfo: ApiVersionInfo = { version: 1 as ApiVersion, source: 'default' },
): EnrichedRequestContext {
  const now = Date.now();
  return {
    apiVersion: versionInfo.version,
    apiVersionSource: versionInfo.source,
    timings: [{ label: 'request_start', timestamp: now }],
    severity: 'debug',
    startTime: now,
  };
}

/**
 * Add a timing entry to an enriched context.
 *
 * @param ctx - The enriched context to mutate
 * @param label - A descriptive label for this timing phase
 */
export function addTiming(ctx: EnrichedRequestContext, label: string): void {
  ctx.timings.push({ label, timestamp: Date.now() });
}

// ============================================================================
// Fastify Plugin
// ============================================================================

/**
 * Fastify plugin that attaches an `enrichedContext` to every request.
 *
 * The enriched context captures:
 * - The API version (reads from `request.apiVersionInfo` if available)
 * - Request start/end timing entries
 * - Response severity based on the final status code
 *
 * Should be registered **after** the `apiVersioningPlugin` so that
 * `request.apiVersionInfo` is already populated.
 *
 * @example
 * ```ts
 * import { apiVersioningPlugin } from './routing/api.versioning';
 * import { requestContextPlugin } from './middleware/request.context';
 *
 * app.register(apiVersioningPlugin);
 * app.register(requestContextPlugin);
 *
 * app.get('/test', (request, reply) => {
 *   console.log(request.enrichedContext.apiVersion);
 *   reply.send({ ok: true });
 * });
 * ```
 */
export const requestContextPlugin: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _opts: Record<string, unknown>,
  done: (err?: Error) => void,
) => {
  // Decorate with a default so Fastify can optimise the hidden class
  const defaultContext: EnrichedRequestContext = {
    apiVersion: 1 as ApiVersion,
    apiVersionSource: 'default',
    timings: [],
    severity: 'debug',
    startTime: 0,
  };

  // Runtime guard to prevent double-decoration when plugin is registered multiple times
  if (!fastify.hasRequestDecorator('enrichedContext')) {
    fastify.decorateRequest('enrichedContext', defaultContext);
  }

  // --- onRequest: initialise the enriched context ---
  fastify.addHook('onRequest', (request: FastifyRequest, _reply: FastifyReply): void => {
    // Read version info from the versioning plugin (if registered before us)
    const versionInfo: ApiVersionInfo | undefined = (
      request as { apiVersionInfo?: ApiVersionInfo }
    ).apiVersionInfo;

    request.enrichedContext = createEnrichedContext(versionInfo);
  });

  // --- onResponse: finalise timing and severity ---
  fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply): void => {
    const ctx: EnrichedRequestContext | undefined = request.enrichedContext;
    if (ctx === undefined) return;

    addTiming(ctx, 'request_end');
    ctx.severity = severityFromStatus(reply.statusCode);
  });

  done();
};
