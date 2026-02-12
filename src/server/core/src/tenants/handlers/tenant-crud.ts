// src/server/core/src/tenants/handlers/tenant-crud.ts
/**
 * Tenant CRUD Handlers
 *
 * HTTP handlers for workspace/tenant management operations.
 *
 * @module handlers/tenant-crud
 */

import { HTTP_STATUS, mapErrorToHttpResponse } from '@abe-stack/shared';

import { logActivity } from '../../activities';
import { record } from '../../audit/service';
import {
  createTenant,
  deleteTenant,
  getTenantById,
  getUserTenants,
  updateTenant,
} from '../service';
import { ERROR_MESSAGES, type TenantsModuleDeps, type TenantsRequest } from '../types';

import type { HttpErrorResponse } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

interface CreateTenantBody {
  name: string;
  slug?: string | undefined;
}

interface UpdateTenantBody {
  name?: string | undefined;
  logoUrl?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle creating a new tenant/workspace.
 * POST /api/tenants
 */
export async function handleCreateTenant(
  deps: TenantsModuleDeps,
  body: CreateTenantBody,
  request: TenantsRequest,
): Promise<{ status: 201; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const tenant = await createTenant(deps.db, deps.repos, userId, {
      name: body.name,
      slug: body.slug,
    });

    // Fire-and-forget audit logging
    const tenantResult = tenant as { id?: string };
    const tenantId = tenantResult.id ?? '';
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'workspace.created',
        resource: 'tenant',
        resourceId: tenantId,
        metadata: { name: body.name },
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'tenant.created',
      resourceType: 'tenant',
      resourceId: tenantId,
      tenantId,
      metadata: { name: body.name },
    }).catch(() => {});

    return { status: HTTP_STATUS.CREATED, body: tenant };
  } catch (error) {
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}

/**
 * Handle listing all tenants for the authenticated user.
 * GET /api/tenants
 */
export async function handleListTenants(
  deps: TenantsModuleDeps,
  request: TenantsRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const tenants = await getUserTenants(deps.db, userId);
    return { status: HTTP_STATUS.OK, body: tenants };
  } catch (error) {
    deps.log.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to list tenants',
    );
    return { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Handle getting a single tenant by ID.
 * GET /api/tenants/:id
 */
export async function handleGetTenant(
  deps: TenantsModuleDeps,
  tenantId: string,
  request: TenantsRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const tenant = await getTenantById(deps.repos, tenantId, userId);
    return { status: HTTP_STATUS.OK, body: tenant };
  } catch (error) {
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}

/**
 * Handle updating a tenant.
 * PATCH /api/tenants/:id
 */
export async function handleUpdateTenant(
  deps: TenantsModuleDeps,
  tenantId: string,
  body: UpdateTenantBody,
  request: TenantsRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const tenant = await updateTenant(deps.repos, tenantId, userId, body);

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'workspace.updated',
        resource: 'tenant',
        resourceId: tenantId,
        tenantId,
        metadata: { fields: Object.keys(body) },
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'tenant.updated',
      resourceType: 'tenant',
      resourceId: tenantId,
      tenantId,
      metadata: { fields: Object.keys(body) },
    }).catch(() => {});

    return { status: HTTP_STATUS.OK, body: tenant };
  } catch (error) {
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}

/**
 * Handle deleting a tenant.
 * DELETE /api/tenants/:id
 */
export async function handleDeleteTenant(
  deps: TenantsModuleDeps,
  tenantId: string,
  request: TenantsRequest,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    await deleteTenant(deps.db, deps.repos, tenantId, userId);

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'workspace.deleted',
        resource: 'tenant',
        resourceId: tenantId,
        tenantId,
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'tenant.deleted',
      resourceType: 'tenant',
      resourceId: tenantId,
      tenantId,
    }).catch(() => {});

    return { status: HTTP_STATUS.OK, body: { message: 'Workspace deleted' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}
