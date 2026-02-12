// src/server/core/src/auth/handlers/verify.ts
/**
 * Email Verification Handlers
 *
 * Handles email verification and resend verification flows.
 *
 * @module handlers/verify
 */

import {
  AUTH_SUCCESS_MESSAGES as SUCCESS_MESSAGES,
  HTTP_STATUS,
  mapErrorToHttpResponse,
} from '@abe-stack/shared';

import { createTenant } from '../../tenants';
import { resendVerificationEmail, verifyEmail } from '../service';
import { createErrorMapperLogger } from '../types';
import { setRefreshTokenCookie } from '../utils';

import type { AppContext, ReplyWithCookies } from '../types';
import type { AuthResponse, HttpErrorResponse } from '@abe-stack/shared';

/**
 * Handle email verification.
 * Verifies the token and returns auth credentials for auto-login.
 *
 * @param ctx - Application context
 * @param body - Request body with verification token
 * @param reply - Reply with cookie support
 * @returns Auth response with verified flag or error
 * @complexity O(1)
 */
export async function handleVerifyEmail(
  ctx: AppContext,
  body: { token: string },
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: AuthResponse & { verified: boolean } } | HttpErrorResponse> {
  try {
    const { token } = body;
    const result = await verifyEmail(ctx.db, ctx.repos, ctx.config.auth, token);

    // Set refresh token as HTTP-only cookie for auto-login
    setRefreshTokenCookie(reply, result.refreshToken, ctx.config.auth);

    // Fire-and-forget: create default workspace for users with no memberships
    const userId = result.user.id;
    const username = result.user.username;
    ctx.repos.memberships
      .findByUserId(userId)
      .then((memberships) => {
        if (memberships.length === 0) {
          const workspaceName = `${username}'s Workspace`;
          return createTenant(ctx.db, ctx.repos, userId, { name: workspaceName });
        }
        return undefined;
      })
      .catch((err: unknown) => {
        ctx.log.warn(
          { err, userId },
          'Failed to create default workspace after email verification',
        );
      });

    return {
      status: HTTP_STATUS.OK,
      body: {
        verified: true,
        token: result.accessToken,
        user: result.user,
      },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle resend verification email.
 * Creates a new verification token and sends the email.
 *
 * @param ctx - Application context
 * @param body - Request body with email
 * @returns Success response or error
 * @complexity O(1)
 */
export async function handleResendVerification(
  ctx: AppContext,
  body: { email: string },
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const { email } = body;
    const baseUrl = ctx.config.server.appBaseUrl;
    await resendVerificationEmail(ctx.db, ctx.repos, ctx.email, ctx.emailTemplates, email, baseUrl);

    return {
      status: HTTP_STATUS.OK,
      body: { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT },
    };
  } catch (error) {
    // Use error mapper with default EmailSendError handling (returns 503)
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
