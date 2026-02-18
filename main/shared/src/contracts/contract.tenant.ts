// main/shared/src/contracts/contract.tenant.ts
/**
 * Tenant/Workspace Contracts
 *
 * API contract definitions for workspace management (CRUD, settings, ownership).
 * @module Contracts/Tenant
 */

import {
  createTenantSchema,
  tenantActionResponseSchema,
  tenantListResponseSchema,
  tenantSchema,
  transferOwnershipSchema,
  updateTenantSchema,
} from '../core/tenant/tenant.schemas';
import {
  tenantSettingSchema,
  updateTenantSettingSchema,
} from '../core/tenant/tenant.settings.schemas';
import { errorResponseSchema, successResponseSchema } from '../engine/http';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const tenantContract = {
  create: {
    method: 'POST' as const,
    path: '/api/tenants',
    body: createTenantSchema,
    responses: {
      201: successResponseSchema(tenantActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Create a new workspace',
  },

  list: {
    method: 'GET' as const,
    path: '/api/tenants',
    responses: {
      200: successResponseSchema(tenantListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List workspaces for the authenticated user',
  },

  get: {
    method: 'GET' as const,
    path: '/api/tenants/:id',
    responses: {
      200: successResponseSchema(tenantSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get workspace details',
  },

  update: {
    method: 'POST' as const,
    path: '/api/tenants/:id/update',
    body: updateTenantSchema,
    responses: {
      200: successResponseSchema(tenantActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update workspace details',
  },

  delete: {
    method: 'DELETE' as const,
    path: '/api/tenants/:id',
    responses: {
      200: successResponseSchema(tenantActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Delete a workspace',
  },

  transferOwnership: {
    method: 'POST' as const,
    path: '/api/tenants/:id/transfer',
    body: transferOwnershipSchema,
    responses: {
      200: successResponseSchema(tenantActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Transfer workspace ownership to another member',
  },

  getSetting: {
    method: 'GET' as const,
    path: '/api/tenants/:id/settings/:key',
    responses: {
      200: successResponseSchema(tenantSettingSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a workspace setting by key',
  },

  updateSetting: {
    method: 'POST' as const,
    path: '/api/tenants/:id/settings/:key',
    body: updateTenantSettingSchema,
    responses: {
      200: successResponseSchema(tenantSettingSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update a workspace setting',
  },
} satisfies Contract;
