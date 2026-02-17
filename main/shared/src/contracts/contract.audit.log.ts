// src/contracts/contract.audit.log.ts
/**
 * Audit Log Contracts
 *
 * API Contract definitions for the Audit Log domain.
 * @module Domain/AuditLog
 */

import { errorResponseSchema, successResponseSchema } from '../engine/http';

import { tenantIdSchema } from '../primitives/schema/ids';
import { auditLogFilterSchema, auditLogListResponseSchema } from '../engine/audit-log/audit.log';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const auditLogContract = {
  /**
   * List/Query audit logs with pagination and filters.
   * Access typically restricted to admins or workspace owners.
   */
  listLogs: {
    method: 'GET' as const,
    path: '/api/admin/audit-events',
    query: auditLogFilterSchema,
    responses: {
      200: successResponseSchema(auditLogListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Query audit logs (Admin/Owner only)',
  },

  /**
   * List/Query workspace-scoped audit logs with pagination and filters.
   */
  listTenantLogs: {
    method: 'GET' as const,
    path: '/api/tenants/:id/audit-events',
    pathParams: {
      id: tenantIdSchema,
    },
    query: auditLogFilterSchema,
    responses: {
      200: successResponseSchema(auditLogListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Query workspace audit logs',
  },
} satisfies Contract;
