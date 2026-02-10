// src/server/core/src/tenants/handlers/tenant-crud.ts
/**
 * Tenant CRUD Handlers
 *
 * HTTP handlers for workspace/tenant management operations.
 *
 * @module handlers/tenant-crud
 */

import { mapErrorToHttpResponse } from '@abe-stack/shared';

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
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const tenant = await createTenant(deps.db, deps.repos, userId, {
      name: body.name,
      slug: body.slug,
    });

    return { status: 201, body: tenant };
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
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const tenants = await getUserTenants(deps.repos, userId);
    return { status: 200, body: tenants };
  } catch (error) {
    deps.log.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to list tenants',
    );
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
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
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const tenant = await getTenantById(deps.repos, tenantId, userId);
    return { status: 200, body: tenant };
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
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const tenant = await updateTenant(deps.repos, tenantId, userId, body);
    return { status: 200, body: tenant };
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
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    await deleteTenant(deps.db, deps.repos, tenantId, userId);
    return { status: 200, body: { message: 'Workspace deleted' } };
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
