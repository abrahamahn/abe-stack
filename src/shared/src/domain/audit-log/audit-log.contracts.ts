// src/shared/src/domain/audit-log/audit-log.contracts.ts
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
    path: '/api/audit-logs',
    query: auditLogFilterSchema,
    responses: {
      200: successResponseSchema(auditLogListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Query audit logs (Admin/Owner only)',
  },
} satisfies Contract;
