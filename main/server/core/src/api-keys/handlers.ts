// main/server/core/src/api-keys/handlers.ts
/**
 * API Keys Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 * Uses narrow context interfaces from types.ts for decoupling.
 */

import { HTTP_STATUS } from '@abe-stack/shared';

import { record } from '../audit/service';

import { createApiKey, deleteApiKey, listApiKeys, revokeApiKey } from './service';

import type { CreateApiKeyParams } from './service';
import type { ApiKeyAppContext } from './types';
import type { ApiKey as DbApiKey } from '../../../db/src';
import type { HandlerContext } from '../../../engine/src';
import type { AuditRecordParams } from '../audit/types';
import type { AuthenticatedUser } from '@abe-stack/shared/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Response Types
// ============================================================================

/**
 * API key response object with sensitive fields removed.
 * The `keyHash` is never exposed to clients.
 */
interface ApiKeyResponse {
  readonly id: string;
  readonly tenantId: string | null;
  readonly userId: string;
  readonly name: string;
  readonly keyPrefix: string;
  readonly scopes: string[];
  readonly lastUsedAt: string | null;
  readonly expiresAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Narrow HandlerContext to ApiKeyAppContext.
 * The server composition root ensures the context implements ApiKeyAppContext.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed ApiKeyAppContext
 * @complexity O(1)
 */
function asAppContext(ctx: HandlerContext): ApiKeyAppContext {
  return ctx as unknown as ApiKeyAppContext;
}

/**
 * Convert a database API key record to a safe response object.
 * Strips the `keyHash` field and converts Date values to ISO strings.
 *
 * @param key - Database API key record
 * @returns Safe response object without keyHash
 * @complexity O(1)
 */
function toApiKeyResponse(key: DbApiKey): ApiKeyResponse {
  return {
    id: key.id,
    tenantId: key.tenantId,
    userId: key.userId,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
  };
}

/**
 * Extract authenticated user from a Fastify request.
 *
 * @param request - Fastify request with user set by auth middleware
 * @returns Authenticated user or undefined
 * @complexity O(1)
 */
function getUser(request: FastifyRequest): AuthenticatedUser | undefined {
  return (request as FastifyRequest & { user?: AuthenticatedUser }).user;
}

/**
 * Fire-and-forget an audit event. Silently swallows errors so audit
 * failures never affect API key operations.
 *
 * @param ctx - Application context (must have auditEvents on repos)
 * @param params - Audit event parameters
 * @complexity O(1)
 */
function tryAudit(ctx: ApiKeyAppContext, params: AuditRecordParams): void {
  const auditEvents = ctx.repos.auditEvents;
  if (auditEvents === undefined) return;
  record({ auditEvents }, params).catch((err: unknown) => {
    ctx.log.warn({ err }, 'Failed to record audit event');
  });
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Create a new API key for the authenticated user.
 *
 * @param ctx - Handler context narrowed to ApiKeyAppContext
 * @param body - Request body with { name, scopes?, expiresAt? }
 * @param request - Fastify request with authenticated user
 * @param _reply - Fastify reply (unused)
 * @returns 201 with the created key (masked) and plaintext, or error response
 * @complexity O(1)
 */
export async function handleCreateApiKey(
  ctx: HandlerContext,
  body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 201; body: { apiKey: ApiKeyResponse; plaintext: string } }
  | { status: 400; body: { message: string } }
  | { status: 401; body: { message: string } }
  | { status: 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  const parsed = body as { name?: string; scopes?: string[]; expiresAt?: string | null } | null;

  if (parsed === null || typeof parsed !== 'object') {
    return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'Request body is required' } };
  }

  const name = parsed.name;
  if (typeof name !== 'string' || name.trim() === '') {
    return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'Name is required' } };
  }

  try {
    const expiresAt = typeof parsed.expiresAt === 'string' ? new Date(parsed.expiresAt) : undefined;

    const createParams: CreateApiKeyParams = {
      name: name.trim(),
      ...(Array.isArray(parsed.scopes) ? { scopes: parsed.scopes } : {}),
      ...(expiresAt instanceof Date && !isNaN(expiresAt.getTime()) ? { expiresAt } : {}),
    };

    const result = await createApiKey(appCtx.repos.apiKeys, user.userId, createParams);

    appCtx.log.info({ userId: user.userId, keyId: result.apiKey.id }, 'API key created');

    tryAudit(appCtx, {
      actorId: user.userId,
      action: 'api_key.created',
      resource: 'api_key',
      resourceId: result.apiKey.id,
    });

    return {
      status: HTTP_STATUS.CREATED,
      body: {
        apiKey: toApiKeyResponse(result.apiKey),
        plaintext: result.plaintext,
      },
    };
  } catch (error: unknown) {
    appCtx.log.error(error instanceof Error ? error : new Error(String(error)));
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to create API key' },
    };
  }
}

/**
 * List all API keys for the authenticated user.
 *
 * @param ctx - Handler context narrowed to ApiKeyAppContext
 * @param _body - Unused request body
 * @param request - Fastify request with authenticated user
 * @param _reply - Fastify reply (unused)
 * @returns 200 with list of API keys (keyHash stripped), or error response
 * @complexity O(n) where n is the number of keys
 */
export async function handleListApiKeys(
  ctx: HandlerContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { apiKeys: ApiKeyResponse[] } }
  | { status: 401; body: { message: string } }
  | { status: 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const keys = await listApiKeys(appCtx.repos.apiKeys, user.userId);

    return {
      status: HTTP_STATUS.OK,
      body: {
        apiKeys: keys.map(toApiKeyResponse),
      },
    };
  } catch (error: unknown) {
    appCtx.log.error(error instanceof Error ? error : new Error(String(error)));
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to list API keys' },
    };
  }
}

/**
 * Revoke an API key for the authenticated user.
 *
 * @param ctx - Handler context narrowed to ApiKeyAppContext
 * @param _body - Unused request body
 * @param request - Fastify request with authenticated user and :id param
 * @param _reply - Fastify reply (unused)
 * @returns 200 with revoked key, or error response
 * @complexity O(1)
 */
export async function handleRevokeApiKey(
  ctx: HandlerContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { apiKey: ApiKeyResponse } }
  | { status: 400; body: { message: string } }
  | { status: 401; body: { message: string } }
  | { status: 404; body: { message: string } }
  | { status: 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  const params = request.params as { id?: string };
  const keyId = params.id ?? '';

  if (keyId === '') {
    return { status: HTTP_STATUS.NOT_FOUND, body: { message: 'API key not found' } };
  }

  try {
    const revoked = await revokeApiKey(appCtx.repos.apiKeys, user.userId, keyId);

    appCtx.log.info({ userId: user.userId, keyId }, 'API key revoked');

    tryAudit(appCtx, {
      actorId: user.userId,
      action: 'api_key.revoked',
      resource: 'api_key',
      resourceId: keyId,
    });

    return {
      status: HTTP_STATUS.OK,
      body: {
        apiKey: toApiKeyResponse(revoked),
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'API key not found') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: 'API key not found' } };
    }
    if (error instanceof Error && error.message === 'API key is already revoked') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'API key is already revoked' } };
    }
    appCtx.log.error(error instanceof Error ? error : new Error(String(error)));
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to revoke API key' },
    };
  }
}

/**
 * Delete an API key permanently for the authenticated user.
 *
 * @param ctx - Handler context narrowed to ApiKeyAppContext
 * @param _body - Unused request body
 * @param request - Fastify request with authenticated user and :id param
 * @param _reply - Fastify reply (unused)
 * @returns 200 with success message, or error response
 * @complexity O(1)
 */
export async function handleDeleteApiKey(
  ctx: HandlerContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { message: string } }
  | { status: 401; body: { message: string } }
  | { status: 404; body: { message: string } }
  | { status: 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  const params = request.params as { id?: string };
  const keyId = params.id ?? '';

  if (keyId === '') {
    return { status: HTTP_STATUS.NOT_FOUND, body: { message: 'API key not found' } };
  }

  try {
    await deleteApiKey(appCtx.repos.apiKeys, user.userId, keyId);

    appCtx.log.info({ userId: user.userId, keyId }, 'API key deleted');

    tryAudit(appCtx, {
      actorId: user.userId,
      action: 'api_key.deleted',
      resource: 'api_key',
      resourceId: keyId,
    });

    return {
      status: 200,
      body: { message: 'API key deleted' },
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'API key not found') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: 'API key not found' } };
    }
    appCtx.log.error(error instanceof Error ? error : new Error(String(error)));
    return { status: 500, body: { message: 'Failed to delete API key' } };
  }
}
