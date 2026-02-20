// main/server/core/src/legal/handlers.ts
/**
 * Legal Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 * Framework-agnostic: uses narrow interfaces from types.ts instead
 * of binding to Fastify or any specific HTTP framework.
 */

import { HTTP_STATUS } from '@bslt/shared';

import { record } from '../audit/service';

import { getCurrentLegalDocuments, getUserAgreements, publishLegalDocument } from './service';

import type { LegalAppContext, LegalRequest } from './types';
import type {
  ConsentRecord as DbConsentRecord,
  LegalDocument as DbLegalDocument,
} from '../../../db/src';
import type { AuditRecordParams } from '../audit/types';

// ============================================================================
// Response Types
// ============================================================================

interface LegalDocumentResponse {
  id: string;
  type: string;
  title: string;
  content: string;
  version: number;
  effectiveAt: string;
  createdAt: string;
}

interface UserAgreementResponse {
  id: string;
  userId: string;
  documentId: string;
  agreedAt: string;
  ipAddress: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a database legal document record for API response.
 * Converts Date objects to ISO strings.
 *
 * @param doc - Database legal document record
 * @returns Formatted legal document for API response
 * @complexity O(1)
 */
function formatDocument(doc: DbLegalDocument): LegalDocumentResponse {
  return {
    id: doc.id,
    type: doc.type,
    title: doc.title,
    content: doc.content,
    version: doc.version,
    effectiveAt: doc.effectiveAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Format a database consent record (legal_document type) for API response.
 * Converts Date objects to ISO strings.
 *
 * @param agreement - Database consent record of type legal_document
 * @returns Formatted user agreement for API response
 * @complexity O(1)
 */
function formatAgreement(agreement: DbConsentRecord): UserAgreementResponse {
  return {
    id: agreement.id,
    userId: agreement.userId,
    documentId: agreement.documentId ?? '',
    agreedAt: agreement.createdAt.toISOString(),
    ipAddress: agreement.ipAddress,
  };
}

/**
 * Fire-and-forget an audit event. Silently swallows errors so audit
 * failures never affect legal operations.
 *
 * @param ctx - Application context (must have auditEvents on repos)
 * @param params - Audit event parameters
 * @complexity O(1)
 */
function tryAudit(ctx: LegalAppContext, params: AuditRecordParams): void {
  const auditEvents = ctx.repos.auditEvents;
  if (auditEvents === undefined) return;
  record({ auditEvents }, params).catch((err: unknown) => {
    ctx.log.warn({ err }, 'Failed to record audit event');
  });
}

/**
 * Map legal errors to appropriate HTTP status codes and messages.
 *
 * @param error - The caught error
 * @param ctx - Application context for logging
 * @returns Object with HTTP status code and error message body
 * @complexity O(1)
 */
function handleError(
  error: unknown,
  ctx: LegalAppContext,
): { status: number; body: { message: string } } {
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: error.message } };
    }
    if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      return { status: HTTP_STATUS.CONFLICT, body: { message: error.message } };
    }
    if (error.message.includes('required') || error.message.includes('invalid')) {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: error.message } };
    }
  }

  ctx.log.error(error instanceof Error ? error : new Error(String(error)));
  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    body: { message: 'An error occurred processing your request' },
  };
}

// ============================================================================
// Public Handlers
// ============================================================================

/**
 * Get current (latest version of each type) legal documents.
 * Public endpoint -- no auth required.
 *
 * @param ctx - Application context with legal repositories
 * @returns 200 response with array of current legal documents
 * @complexity O(n) where n is the number of document types
 */
export async function handleGetCurrentLegal(
  ctx: LegalAppContext,
  _body: unknown,
  _request: unknown,
): Promise<{
  status: number;
  body: { documents: LegalDocumentResponse[] } | { message: string };
}> {
  try {
    const documents = await getCurrentLegalDocuments(ctx.repos.legalDocuments);
    return {
      status: HTTP_STATUS.OK,
      body: { documents: documents.map(formatDocument) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

// ============================================================================
// User Handlers (Auth Required)
// ============================================================================

/**
 * Get the current user's legal agreements.
 *
 * @param ctx - Application context with legal repositories
 * @param request - HTTP request with authenticated user
 * @returns 200 response with array of user agreements
 * @complexity O(n) where n is the number of agreements
 */
export async function handleGetUserAgreements(
  ctx: LegalAppContext,
  _body: unknown,
  request: unknown,
): Promise<{
  status: number;
  body: { agreements: UserAgreementResponse[] } | { message: string };
}> {
  const req = request as LegalRequest;
  const user = req.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const agreements = await getUserAgreements(ctx.repos.consentRecords, user.userId);
    return {
      status: HTTP_STATUS.OK,
      body: { agreements: agreements.map(formatAgreement) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

// ============================================================================
// Admin Handlers
// ============================================================================

/**
 * Publish a new version of a legal document.
 * Admin-only endpoint.
 *
 * @param ctx - Application context with legal repositories
 * @param body - Publish request with type, title, content, effectiveAt
 * @param request - HTTP request with authenticated admin user
 * @returns 201 response with the created document, or error response
 * @complexity O(1) database insert
 */
export async function handlePublishLegal(
  ctx: LegalAppContext,
  body: unknown,
  request: unknown,
): Promise<{
  status: number;
  body: { document: LegalDocumentResponse } | { message: string };
}> {
  const req = request as LegalRequest;
  const user = req.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const data = body as {
      type?: string;
      title?: string;
      content?: string;
      effectiveAt?: string;
    };

    if (typeof data.type !== 'string' || data.type === '') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'type is required' } };
    }
    if (typeof data.title !== 'string' || data.title === '') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'title is required' } };
    }
    if (typeof data.content !== 'string' || data.content === '') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'content is required' } };
    }
    if (typeof data.effectiveAt !== 'string' || data.effectiveAt === '') {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'effectiveAt is required' } };
    }

    const effectiveAt = new Date(data.effectiveAt);
    if (isNaN(effectiveAt.getTime())) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: { message: 'effectiveAt must be a valid date' },
      };
    }

    const document = await publishLegalDocument(
      ctx.repos.legalDocuments,
      data.type,
      data.title,
      data.content,
      effectiveAt,
    );

    tryAudit(ctx, {
      actorId: user.userId,
      action: 'legal.document_published',
      resource: 'legal_document',
      resourceId: document.id,
      metadata: { type: data.type, version: document.version },
      ipAddress: req.requestInfo.ipAddress,
      userAgent: req.headers['user-agent'] ?? null,
    });

    return {
      status: HTTP_STATUS.CREATED,
      body: { document: formatDocument(document) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}
