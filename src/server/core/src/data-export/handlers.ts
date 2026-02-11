// src/server/core/src/data-export/handlers.ts
/**
 * Data Export Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 * Framework-agnostic: uses narrow interfaces from types.ts instead
 * of binding to Fastify or any specific HTTP framework.
 */

import { record } from '../audit/service';

import { getExportStatus, requestDataExport } from './service';

import type { DataExportAppContext, DataExportRequest } from './types';
import type { AuditRecordParams } from '../audit/types';
import type { DataExportRequest as DbDataExportRequest } from '@abe-stack/db';

// ============================================================================
// Response Types
// ============================================================================

interface DataExportRequestResponse {
  id: string;
  userId: string;
  type: string;
  status: string;
  format: string;
  downloadUrl: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a database data export request record for API response.
 * Converts Date objects to ISO strings.
 *
 * @param request - Database data export request record
 * @returns Formatted data export request for API response
 * @complexity O(1)
 */
function formatExportRequest(request: DbDataExportRequest): DataExportRequestResponse {
  return {
    id: request.id,
    userId: request.userId,
    type: request.type,
    status: request.status,
    format: request.format,
    downloadUrl: request.downloadUrl,
    expiresAt: request.expiresAt?.toISOString() ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    errorMessage: request.errorMessage,
    createdAt: request.createdAt.toISOString(),
  };
}

/**
 * Fire-and-forget an audit event. Silently swallows errors so audit
 * failures never affect data export operations.
 *
 * @param ctx - Application context (must have auditEvents on repos)
 * @param params - Audit event parameters
 * @complexity O(1)
 */
function tryAudit(ctx: DataExportAppContext, params: AuditRecordParams): void {
  const auditEvents = ctx.repos.auditEvents;
  if (auditEvents === undefined) return;
  record({ auditEvents }, params).catch((err: unknown) => {
    ctx.log.warn({ err }, 'Failed to record audit event');
  });
}

/**
 * Map data export errors to appropriate HTTP status codes and messages.
 *
 * @param error - The caught error
 * @param ctx - Application context for logging
 * @returns Object with HTTP status code and error message body
 * @complexity O(1)
 */
function handleError(
  error: unknown,
  ctx: DataExportAppContext,
): { status: number; body: { message: string } } {
  if (error instanceof Error) {
    if (error.name === 'DataExportNotFoundError') {
      return { status: 404, body: { message: error.message } };
    }
    if (error.name === 'DataExportAlreadyPendingError') {
      return { status: 409, body: { message: error.message } };
    }
  }

  ctx.log.error(error instanceof Error ? error : new Error(String(error)));
  return { status: 500, body: { message: 'An error occurred processing your request' } };
}

// ============================================================================
// User Handlers (Auth Required)
// ============================================================================

/**
 * Request a data export for the current user.
 *
 * Creates a new pending export request. This endpoint should require
 * sudo/elevated authentication in production (via middleware).
 *
 * @param ctx - Application context with data export repositories
 * @param request - HTTP request with authenticated user
 * @returns 201 response with the created export request, or error response
 * @complexity O(n) where n is the number of user's existing requests
 */
export async function handleRequestExport(
  ctx: DataExportAppContext,
  _body: unknown,
  request: unknown,
): Promise<{
  status: number;
  body: { exportRequest: DataExportRequestResponse } | { message: string };
}> {
  const req = request as DataExportRequest;
  const user = req.user;
  if (user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  try {
    const exportRequest = await requestDataExport(ctx.repos.dataExportRequests, user.userId);

    tryAudit(ctx, {
      actorId: user.userId,
      action: 'data_export.requested',
      resource: 'data_export',
      resourceId: exportRequest.id,
      ipAddress: req.requestInfo.ipAddress,
      userAgent: req.headers['user-agent'] ?? null,
    });

    return {
      status: 201,
      body: { exportRequest: formatExportRequest(exportRequest) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Get the status of a data export request.
 *
 * Validates that the request belongs to the authenticated user.
 *
 * @param ctx - Application context with data export repositories
 * @param request - HTTP request with authenticated user and params.id
 * @returns 200 response with the export request status, or error response
 * @complexity O(1) database lookup by primary key
 */
export async function handleGetExportStatus(
  ctx: DataExportAppContext,
  _body: unknown,
  request: unknown,
): Promise<{
  status: number;
  body: { exportRequest: DataExportRequestResponse } | { message: string };
}> {
  const req = request as DataExportRequest;
  const user = req.user;
  if (user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  try {
    const requestId = (request as { params?: { id?: string } }).params?.id ?? '';
    if (requestId === '') {
      return { status: 400, body: { message: 'Export request ID is required' } };
    }

    const exportRequest = await getExportStatus(
      ctx.repos.dataExportRequests,
      requestId,
      user.userId,
    );

    return {
      status: 200,
      body: { exportRequest: formatExportRequest(exportRequest) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}
