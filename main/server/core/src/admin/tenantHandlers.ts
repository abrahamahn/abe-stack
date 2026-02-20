// main/server/core/src/admin/tenantHandlers.ts
/**
 * Admin Tenant Handlers
 *
 * HTTP handlers for administrative tenant/workspace operations.
 * All handlers expect admin role (enforced by route middleware).
 */

import { ERROR_MESSAGES } from '../auth';

import {
  getTenantDetail,
  listAllTenants,
  suspendTenant,
  TenantNotFoundError,
  unsuspendTenant,
} from './tenantService';

import type {
  AdminTenantDetail,
  AdminTenantListResponse,
  TenantSuspendResult,
} from './tenantService';
import type { AdminAppContext } from './types';
import type { HttpReply, HttpRequest } from '../../../system/src';
import type { AdminSuspendTenantRequest } from '@bslt/shared';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

// ============================================================================
// List All Tenants Handler
// ============================================================================

/**
 * Handle GET /api/admin/tenants
 */
export async function handleListAllTenants(
  ctx: AdminAppContext,
  _body: undefined,
  request: HttpRequest,
  _reply: HttpReply,
): Promise<{ status: number; body: AdminTenantListResponse | { message: string } }> {
  const user = (request as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const query = request.query as Record<string, unknown>;

    const limit =
      query['limit'] !== undefined && query['limit'] !== null ? Number(query['limit']) : 20;
    const offset =
      query['offset'] !== undefined && query['offset'] !== null ? Number(query['offset']) : 0;
    const search = typeof query['search'] === 'string' ? query['search'] : undefined;

    const result = await listAllTenants(ctx.db, ctx.repos, { limit, offset, search });

    ctx.log.info(
      { adminId: user.userId, resultCount: result.tenants.length, total: result.total },
      'Admin listed tenants',
    );

    return { status: 200, body: result };
  } catch (error) {
    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Get Tenant Detail Handler
// ============================================================================

/**
 * Handle GET /api/admin/tenants/:id
 */
export async function handleGetTenantDetail(
  ctx: AdminAppContext,
  _body: undefined,
  request: HttpRequest,
  _reply: HttpReply,
): Promise<{ status: number; body: AdminTenantDetail | { message: string } }> {
  const user = (request as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const params = request.params as { id: string };
    const tenantId = params.id;

    if (tenantId === '') {
      return { status: 404, body: { message: 'Tenant not found' } };
    }

    const detail = await getTenantDetail(ctx.repos, tenantId);

    ctx.log.info({ adminId: user.userId, tenantId }, 'Admin retrieved tenant detail');

    return { status: 200, body: detail };
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return { status: 404, body: { message: 'Tenant not found' } };
    }

    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Suspend Tenant Handler
// ============================================================================

/**
 * Handle POST /api/admin/tenants/:id/suspend
 */
export async function handleSuspendTenant(
  ctx: AdminAppContext,
  body: AdminSuspendTenantRequest,
  request: HttpRequest,
  _reply: HttpReply,
): Promise<{ status: number; body: TenantSuspendResult | { message: string } }> {
  const user = (request as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const params = request.params as { id: string };
    const tenantId = params.id;

    if (tenantId === '') {
      return { status: 404, body: { message: 'Tenant not found' } };
    }

    const result = await suspendTenant(ctx.repos, tenantId, body.reason);

    ctx.log.info({ adminId: user.userId, tenantId, reason: body.reason }, 'Admin suspended tenant');

    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return { status: 404, body: { message: 'Tenant not found' } };
    }

    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Unsuspend Tenant Handler
// ============================================================================

/**
 * Handle POST /api/admin/tenants/:id/unsuspend
 */
export async function handleUnsuspendTenant(
  ctx: AdminAppContext,
  _body: undefined,
  request: HttpRequest,
  _reply: HttpReply,
): Promise<{ status: number; body: TenantSuspendResult | { message: string } }> {
  const user = (request as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const params = request.params as { id: string };
    const tenantId = params.id;

    if (tenantId === '') {
      return { status: 404, body: { message: 'Tenant not found' } };
    }

    const result = await unsuspendTenant(ctx.repos, tenantId);

    ctx.log.info({ adminId: user.userId, tenantId }, 'Admin unsuspended tenant');

    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return { status: 404, body: { message: 'Tenant not found' } };
    }

    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
