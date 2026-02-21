// main/server/system/src/routing/api.versioning.ts
/**
 * API Versioning Middleware
 *
 * Supports version negotiation via:
 * 1. URL prefix: /api/v2/auth/login
 * 2. Accept header: Accept: application/json; version=2
 * 3. Custom header: X-API-Version: 2
 *
 * Falls back to the current version when no version is specified.
 *
 * Registered as a Fastify plugin so it runs as an onRequest hook,
 * decorating every request with `apiVersion` and `apiVersionInfo`.
 *
 * @module routing/api-versioning
 */

import {
  CURRENT_API_VERSION,
  SUPPORTED_API_VERSIONS,
  type ApiVersion,
  type ApiVersionInfo,
  type ApiVersionSource,
} from './api.versioning.types';

import type { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Public Constants
// ============================================================================

/**
 * All API versions the server currently supports.
 * Re-exported for convenience so consumers can import from one place.
 */
export const API_VERSIONS: readonly ApiVersion[] = SUPPORTED_API_VERSIONS;

// ============================================================================
// Fastify Declaration Merging
// ============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    /** Resolved API version number for this request */
    apiVersion: ApiVersion;
    /** Full version negotiation result (version + source) */
    apiVersionInfo: ApiVersionInfo;
  }
}

// ============================================================================
// Version Extraction Helpers
// ============================================================================

/** Pattern that matches `/api/v<N>/` in a URL path */
const URL_VERSION_RE = /\/api\/v(\d+)(?:\/|$)/;

/** Pattern that matches `version=<N>` inside an Accept header value */
const ACCEPT_VERSION_RE = /\bversion\s*=\s*(\d+)/;

/** Custom header used for explicit version negotiation */
const VERSION_HEADER = 'x-api-version';

/**
 * Attempt to parse a raw value into a supported ApiVersion.
 *
 * @returns The ApiVersion if valid and supported, otherwise `undefined`.
 */
function toSupportedVersion(raw: number): ApiVersion | undefined {
  if (SUPPORTED_API_VERSIONS.includes(raw as ApiVersion)) {
    return raw as ApiVersion;
  }
  return undefined;
}

/**
 * Extract the API version from the URL path.
 *
 * Looks for patterns like `/api/v1/...` or `/api/v2/...`.
 *
 * @returns ApiVersionInfo if a version segment was found, otherwise `undefined`.
 */
function extractFromUrl(url: string): ApiVersionInfo | undefined {
  const match = URL_VERSION_RE.exec(url);
  if (match?.[1] === undefined) return undefined;

  const version = toSupportedVersion(Number(match[1]));
  if (version === undefined) return undefined;

  return { version, source: 'url' as ApiVersionSource };
}

/**
 * Extract the API version from the Accept header.
 *
 * Looks for `version=N` in the Accept header value,
 * e.g. `Accept: application/json; version=2`.
 *
 * @returns ApiVersionInfo if the header contained a valid version, otherwise `undefined`.
 */
function extractFromAcceptHeader(
  headers: Record<string, string | string[] | undefined>,
): ApiVersionInfo | undefined {
  const accept = headers['accept'];
  if (accept === undefined) return undefined;

  const value = Array.isArray(accept) ? accept[0] : accept;
  if (value === undefined) return undefined;

  const match = ACCEPT_VERSION_RE.exec(value);
  if (match?.[1] === undefined) return undefined;

  const version = toSupportedVersion(Number(match[1]));
  if (version === undefined) return undefined;

  return { version, source: 'accept-header' as ApiVersionSource };
}

/**
 * Extract the API version from the custom `X-API-Version` header.
 *
 * @returns ApiVersionInfo if the header contained a valid version, otherwise `undefined`.
 */
function extractFromCustomHeader(
  headers: Record<string, string | string[] | undefined>,
): ApiVersionInfo | undefined {
  const raw = headers[VERSION_HEADER];
  if (raw === undefined) return undefined;

  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return undefined;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;

  const version = toSupportedVersion(parsed);
  if (version === undefined) return undefined;

  return { version, source: 'custom-header' as ApiVersionSource };
}

// ============================================================================
// Public Extraction Utility
// ============================================================================

/**
 * Extract the API version from a Fastify request.
 *
 * Resolution order (first match wins):
 * 1. URL path prefix (`/api/v2/...`)
 * 2. Accept header (`application/json; version=2`)
 * 3. Custom header (`X-API-Version: 2`)
 * 4. Default to CURRENT_API_VERSION
 *
 * This function is side-effect-free and can be called outside the plugin
 * (e.g. in tests or custom middleware).
 *
 * @param request - The incoming Fastify request
 * @returns The resolved ApiVersionInfo
 */
export function extractApiVersion(request: {
  url: string;
  headers: Record<string, string | string[] | undefined>;
}): ApiVersionInfo {
  return (
    extractFromUrl(request.url) ??
    extractFromAcceptHeader(request.headers) ??
    extractFromCustomHeader(request.headers) ?? {
      version: CURRENT_API_VERSION,
      source: 'default' as ApiVersionSource,
    }
  );
}

// ============================================================================
// Fastify Plugin
// ============================================================================

/**
 * Fastify plugin that decorates every request with the resolved API version.
 *
 * After registration the following properties are available on every request:
 * - `request.apiVersion`     — the resolved version number (e.g. `1`)
 * - `request.apiVersionInfo` — full info including the negotiation source
 *
 * The response includes an `X-API-Version` header echoing the resolved version.
 *
 * @example
 * ```ts
 * import { apiVersioningPlugin } from '@bslt/server-system/routing';
 *
 * app.register(apiVersioningPlugin);
 *
 * app.get('/api/test', (request, reply) => {
 *   reply.send({ version: request.apiVersion });
 * });
 * ```
 */
export const apiVersioningPlugin: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _opts: Record<string, unknown>,
  done: (err?: Error) => void,
) => {
  // Decorate request with defaults so Fastify can optimise the hidden class
  const defaultInfo: ApiVersionInfo = {
    version: CURRENT_API_VERSION,
    source: 'default',
  };

  if (!fastify.hasRequestDecorator('apiVersion')) {
    fastify.decorateRequest('apiVersion', CURRENT_API_VERSION);
  }
  if (!fastify.hasRequestDecorator('apiVersionInfo')) {
    fastify.decorateRequest('apiVersionInfo', defaultInfo);
  }

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const info = extractApiVersion(request);
    request.apiVersion = info.version;
    request.apiVersionInfo = info;

    // Echo the resolved version back in the response
    reply.header('x-api-version', String(info.version));
  });

  done();
};
