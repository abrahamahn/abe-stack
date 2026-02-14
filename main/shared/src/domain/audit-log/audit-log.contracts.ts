// main/shared/src/domain/audit-log/audit-log.contracts.ts
/**
 * Audit Log Contracts
 *
 * API Contract definitions for the Audit Log domain.
 * @module Domain/AuditLog
 */

import { errorResponseSchema, successResponseSchema } from '../../core/schemas';

import { auditLogFilterSchema, auditLogListResponseSchema } from './audit-log.schemas';

import type { Contract } from '../../core/api';

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
