// src/server/core/src/auth/handlers/email-change.ts
/**
 * Email Change Handlers
 *
 * HTTP layer for initiating and confirming email changes.
 *
 * @module handlers/email-change
 */

import { mapErrorToHttpResponse } from '@abe-stack/shared';

import {
  confirmEmailChange,
  createEmailChangeRevertToken,
  initiateEmailChange,
  revertEmailChange,
} from '../email-change';
import { assertUserActive } from '../middleware';
import { sendEmailChangedAlert } from '../security';
import { createErrorMapperLogger } from '../types';

import type { AppContext, RequestWithCookies } from '../types';
import type {
  HttpErrorResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  RevertEmailChangeRequest,
  RevertEmailChangeResponse,
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

    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

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
 *
 * @param ctx - Application context
 * @param body - Request body with confirmation token
 * @param req - Request with cookies and request info
 * @returns Success response with new email or error
 * @complexity O(1)
 */
export async function handleConfirmEmailChange(
  ctx: AppContext,
  body: ConfirmEmailChangeRequest,
  req: RequestWithCookies,
): Promise<{ status: 200; body: ConfirmEmailChangeResponse } | HttpErrorResponse> {
  try {
    const result = await confirmEmailChange(ctx.db, ctx.repos, body.token);
    const { ipAddress, userAgent } = req.requestInfo;
    const { userId, previousEmail, ...response } = result;

    const revertToken = await createEmailChangeRevertToken(
      ctx.db,
      userId,
      previousEmail,
      result.email,
    );
    const baseUrl = ctx.config.server.appBaseUrl;
    const revertUrl = `${baseUrl}/auth/change-email/revert?token=${revertToken}`;

    // Fire-and-forget: send "Was this you?" alert to the OLD email
    sendEmailChangedAlert(ctx.email, ctx.emailTemplates, {
      email: previousEmail,
      newEmail: result.email,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      revertUrl,
    }).catch((err: unknown) => {
      ctx.log.warn({ err, previousEmail }, 'Failed to send email changed alert');
    });

    return { status: 200, body: response };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle email change reversion ("This wasn't me").
 */
export async function handleRevertEmailChange(
  ctx: AppContext,
  body: RevertEmailChangeRequest,
): Promise<{ status: 200; body: RevertEmailChangeResponse } | HttpErrorResponse> {
  try {
    const result = await revertEmailChange(ctx.db, ctx.repos, body.token);
    return { status: 200, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
