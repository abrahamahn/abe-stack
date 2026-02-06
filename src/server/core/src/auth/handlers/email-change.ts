// backend/core/src/auth/handlers/email-change.ts
/**
 * Email Change Handlers
 *
 * HTTP layer for initiating and confirming email changes.
 *
 * @module handlers/email-change
 */

import { mapErrorToHttpResponse } from '@abe-stack/shared';

import { confirmEmailChange, initiateEmailChange } from '../email-change';
import { createErrorMapperLogger } from '../types';

import type { AppContext, RequestWithCookies } from '../types';
import type {
  HttpErrorResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
} from '@abe-stack/shared';

/**
 * Handle email change initiation.
 */
export async function handleChangeEmail(
  ctx: AppContext,
  body: ChangeEmailRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: ChangeEmailResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    const result = await initiateEmailChange(
      ctx.db,
      ctx.repos,
      ctx.email,
      ctx.emailTemplates,
      ctx.config.auth,
      userId,
      body.newEmail,
      body.password,
      ctx.config.server.appBaseUrl,
      ctx.log,
    );

    return { status: 200, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle email change confirmation.
 */
export async function handleConfirmEmailChange(
  ctx: AppContext,
  body: ConfirmEmailChangeRequest,
): Promise<{ status: 200; body: ConfirmEmailChangeResponse } | HttpErrorResponse> {
  try {
    const result = await confirmEmailChange(ctx.db, ctx.repos, body.token);
    return { status: 200, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
