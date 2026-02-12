// src/server/core/src/consent/handlers.ts
/**
 * Consent Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 * Framework-agnostic: uses narrow interfaces from types.ts instead
 * of binding to Fastify or any specific HTTP framework.
 */


import { record } from '../audit/service';

import { getUserConsent, updateUserConsent } from './service';

import type { ConsentAppContext, ConsentRequest, UpdateConsentInput } from './types';
import type { AuditRecordParams } from '../audit/types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fire-and-forget an audit event. Silently swallows errors so audit
 * failures never affect consent operations.
 *
 * @param ctx - Application context (must have auditEvents on repos)
 * @param params - Audit event parameters
 * @complexity O(1)
 */
function tryAudit(ctx: ConsentAppContext, params: AuditRecordParams): void {
  const auditEvents = ctx.repos.auditEvents;
  if (auditEvents === undefined) return;
  record({ auditEvents }, params).catch((err: unknown) => {
    ctx.log.warn({ err }, 'Failed to record audit event');
  });
}

/**
 * Map consent errors to appropriate HTTP status codes and messages.
 *
 * @param error - The caught error
 * @param ctx - Application context for logging
 * @returns Object with HTTP status code and error message body
 * @complexity O(1)
 */
function handleError(
  error: unknown,
  ctx: ConsentAppContext,
): { status: number; body: { message: string } } {
  if (error instanceof Error) {
    if (error.message.includes('required') || error.message.includes('invalid')) {
      return { status: 400, body: { message: error.message } };
    }
  }

  ctx.log.error(error instanceof Error ? error : new Error(String(error)));
  return { status: 500, body: { message: 'An error occurred processing your request' } };
}

// ============================================================================
// User Handlers (Auth Required)
// ============================================================================

/**
 * Get the current user's consent preferences.
 *
 * @param ctx - Application context with consent repositories
 * @param request - HTTP request with authenticated user
 * @returns 200 response with consent preferences
 * @complexity O(k) where k is the number of consent types
 */
export async function handleGetConsent(
  ctx: ConsentAppContext,
  _body: unknown,
  request: unknown,
): Promise<{
  status: number;
  body: { preferences: Record<string, boolean | null> } | { message: string };
}> {
  const req = request as ConsentRequest;
  const user = req.user;
  if (user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  try {
    const preferences = await getUserConsent(ctx.repos.consentLogs, user.userId);
    return {
      status: 200,
      body: { preferences },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Update the current user's consent preferences.
 *
 * @param ctx - Application context with consent repositories
 * @param body - Consent preferences to update
 * @param request - HTTP request with authenticated user
 * @returns 200 response with updated preferences, or error response
 * @complexity O(k) where k is the number of changed preferences
 */
export async function handleUpdateConsent(
  ctx: ConsentAppContext,
  body: unknown,
  request: unknown,
): Promise<{
  status: number;
  body: { preferences: Record<string, boolean | null>; updated: number } | { message: string };
}> {
  const req = request as ConsentRequest;
  const user = req.user;
  if (user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  try {
    const data = body as UpdateConsentInput;

    // Validate that at least one preference is provided
    const hasAny =
      data.analytics !== undefined ||
      data.marketing_email !== undefined ||
      data.third_party_sharing !== undefined ||
      data.profiling !== undefined;

    if (!hasAny) {
      return {
        status: 400,
        body: { message: 'At least one consent preference must be specified' },
      };
    }

    const ipAddress = req.requestInfo.ipAddress;
    const userAgent = req.headers['user-agent'] ?? null;

    const entries = await updateUserConsent(
      ctx.repos.consentLogs,
      user.userId,
      data,
      ipAddress,
      userAgent,
    );

    tryAudit(ctx, {
      actorId: user.userId,
      action: 'consent.preferences_updated',
      resource: 'consent',
      metadata: {
        changes: entries.map((e) => ({
          type: e.consentType,
          granted: e.granted,
        })),
      },
      ipAddress,
      userAgent,
    });

    // Return current state after update
    const preferences = await getUserConsent(ctx.repos.consentLogs, user.userId);

    return {
      status: 200,
      body: { preferences, updated: entries.length },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}
