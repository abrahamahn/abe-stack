// main/server/core/src/auth/handlers/tos.ts
/**
 * Terms of Service Handlers
 *
 * HTTP layer for ToS acceptance and status checking.
 *
 * @module handlers/tos
 */

import { ERROR_MESSAGES, HTTP_STATUS, mapErrorToHttpResponse } from '@bslt/shared';

import { acceptTos, checkTosAcceptance } from '../tos-gating';
import { createErrorMapperLogger } from '../types';

import type {
  AcceptTosRequest,
  AcceptTosResponse,
  HttpErrorResponse,
  TosStatusResponse,
} from '@bslt/shared';
import type { AppContext, RequestWithCookies } from '../types';

/**
 * Handle ToS acceptance.
 *
 * Records that the authenticated user has accepted a specific
 * Terms of Service document version.
 *
 * @param ctx - Application context
 * @param body - Request body with documentId
 * @param request - Request with cookies and request info
 * @returns Acceptance timestamp or error
 * @complexity O(1) — single DB insert
 */
export async function handleAcceptTos(
  ctx: AppContext,
  body: AcceptTosRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: AcceptTosResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
      };
    }

    const { ipAddress } = request.requestInfo;
    const result = await acceptTos(ctx.repos, userId, body.documentId, ipAddress);

    return {
      status: HTTP_STATUS.OK,
      body: { agreedAt: result.agreedAt.toISOString() },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle ToS status check.
 *
 * Returns whether the authenticated user has accepted the latest
 * Terms of Service document.
 *
 * @param ctx - Application context
 * @param _body - Unused (GET request)
 * @param request - Request with cookies and request info
 * @returns ToS acceptance status or error
 * @complexity O(1) — two indexed DB lookups
 */
export async function handleTosStatus(
  ctx: AppContext,
  _body: unknown,
  request: RequestWithCookies,
): Promise<{ status: 200; body: TosStatusResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
      };
    }

    const status = await checkTosAcceptance(ctx.repos, userId);

    return {
      status: HTTP_STATUS.OK,
      body: {
        accepted: status.accepted,
        requiredVersion: status.requiredVersion,
        documentId: status.documentId,
      },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
