// main/server/core/src/api-keys/middleware.ts
/**
 * API Key Authentication Middleware
 *
 * Fastify preHandler hooks for authenticating requests via
 * `Authorization: Bearer <api-key>` and enforcing scope-based access control.
 *
 * Design:
 * - If the Authorization header is absent, the middleware does nothing
 *   (falls through to JWT auth or other guards).
 * - If a Bearer token is present, it is treated as an API key: hashed,
 *   looked up, validated, and the resolved identity is attached to the request.
 * - Scope enforcement is a separate guard that runs after authentication.
 *
 * @module api-keys/middleware
 */

import { createHash, timingSafeEqual } from 'node:crypto';

import { HTTP_STATUS, extractBearerToken } from '@bslt/shared';

import type { ApiKeyRepository } from '../../../db/src';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/**
 * Context attached to `request.apiKeyContext` after successful API key auth.
 *
 * Downstream handlers and scope guards read this to identify the caller
 * and check allowed scopes.
 */
export interface ApiKeyContext {
  /** ID of the API key record */
  readonly keyId: string;
  /** User who owns the key */
  readonly userId: string;
  /** Tenant scope (null for personal keys) */
  readonly tenantId: string | null;
  /** Scopes granted to this key */
  readonly scopes: readonly string[];
}

/** Fastify request with an optional API key context */
export interface ApiKeyAuthenticatedRequest extends FastifyRequest {
  apiKeyContext?: ApiKeyContext | undefined;
}

/** Dependencies required by the API key auth middleware */
export interface ApiKeyAuthMiddlewareOptions {
  /** API key repository for lookups */
  readonly apiKeys: ApiKeyRepository;
}

// ============================================================================
// Middleware Factories
// ============================================================================

/**
 * Create a preHandler hook that authenticates requests using an API key
 * in the `Authorization: Bearer <key>` header.
 *
 * Behaviour:
 * 1. If no Authorization header or it is not a Bearer token, skip silently
 *    (allows other auth strategies to run).
 * 2. Hash the token with SHA-256, look it up via `findByKeyHash`.
 * 3. If the key is not found, return 401.
 * 4. If the key is expired, return 401.
 * 5. Use timing-safe comparison of the computed hash against the stored hash
 *    to guard against timing side-channels.
 * 6. Attach `apiKeyContext` to the request.
 * 7. Fire-and-forget `updateLastUsed`.
 *
 * @param options - Middleware dependencies
 * @returns Fastify preHandler hook
 * @complexity O(1) per request (single DB lookup + hash)
 */
export function createApiKeyAuthMiddleware(options: ApiKeyAuthMiddlewareOptions) {
  const { apiKeys } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;

    // Step 1: Skip if no Bearer token present
    const token = extractBearerToken(authHeader);
    if (token == null) return;

    // Step 2: Hash the token and look it up
    const computedHash = createHash('sha256').update(token).digest('hex');
    const apiKey = await apiKeys.findByKeyHash(computedHash);

    // Step 3: Key not found (findByKeyHash already excludes revoked keys)
    if (apiKey === null) {
      reply.code(HTTP_STATUS.UNAUTHORIZED).send({ message: 'Invalid API key' });
      return;
    }

    // Step 4: Check expiration
    if (apiKey.expiresAt !== null && apiKey.expiresAt <= new Date()) {
      reply.code(HTTP_STATUS.UNAUTHORIZED).send({ message: 'API key has expired' });
      return;
    }

    // Step 5: Timing-safe comparison of the hash to prevent timing attacks.
    // Both buffers are the same length (SHA-256 hex = 64 chars) since the
    // stored hash was produced by the same algorithm.
    const storedBuffer = Buffer.from(apiKey.keyHash, 'utf8');
    const computedBuffer = Buffer.from(computedHash, 'utf8');

    if (
      storedBuffer.length !== computedBuffer.length ||
      !timingSafeEqual(storedBuffer, computedBuffer)
    ) {
      reply.code(HTTP_STATUS.UNAUTHORIZED).send({ message: 'Invalid API key' });
      return;
    }

    // Step 6: Attach context to request
    const authenticatedRequest = request as ApiKeyAuthenticatedRequest;
    authenticatedRequest.apiKeyContext = {
      keyId: apiKey.id,
      userId: apiKey.userId,
      tenantId: apiKey.tenantId,
      scopes: apiKey.scopes,
    };

    // Also attach a user-like object so downstream handlers
    // that read `request.user` can work transparently
    (request as ApiKeyAuthenticatedRequest & { user?: { userId: string; role: string } }).user = {
      userId: apiKey.userId,
      role: 'user', // Default role for API key access
    };

    // Step 7: Update lastUsedAt (fire-and-forget — never block the request)
    apiKeys.updateLastUsed(apiKey.id).catch(() => {
      // Silently swallow — usage tracking must never fail a request
    });
  };
}

/**
 * Create a preHandler hook that checks whether the authenticated API key
 * has the required scope.
 *
 * Must be registered AFTER `createApiKeyAuthMiddleware` in the hook chain.
 * If the request was not authenticated via API key (no `apiKeyContext`),
 * this guard passes silently (the request may have been authenticated
 * via JWT instead).
 *
 * @param requiredScope - The scope string the key must include
 * @returns Fastify preHandler hook
 * @complexity O(n) where n is the number of scopes on the key
 */
export function createScopeGuard(requiredScope: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const apiKeyRequest = request as ApiKeyAuthenticatedRequest;
    const ctx = apiKeyRequest.apiKeyContext;

    // If not authenticated via API key, skip (may be JWT-authenticated)
    if (ctx === undefined) {
      return;
    }

    // If the key has no scopes defined, treat as full access
    if (ctx.scopes.length === 0) {
      return;
    }

    // Check if the required scope is present
    if (!ctx.scopes.includes(requiredScope)) {
      reply.code(HTTP_STATUS.FORBIDDEN).send({
        message: `API key lacks required scope: ${requiredScope}`,
        code: 'INSUFFICIENT_SCOPE',
      });
    }
  };
}

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Extract API key context from a request.
 *
 * @param request - Fastify request (must have been processed by API key auth middleware)
 * @returns ApiKeyContext or undefined if the request was not API-key-authenticated
 * @complexity O(1)
 */
export function getApiKeyContext(request: FastifyRequest): ApiKeyContext | undefined {
  return (request as ApiKeyAuthenticatedRequest).apiKeyContext;
}
