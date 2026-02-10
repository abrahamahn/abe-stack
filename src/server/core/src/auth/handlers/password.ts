// src/server/core/src/auth/handlers/password.ts
/**
 * Password Handlers
 *
 * Handles forgot password, reset password, and set password flows.
 *
 * @module handlers/password
 */

import {
  AUTH_SUCCESS_MESSAGES as SUCCESS_MESSAGES,
  mapErrorToHttpResponse,
} from '@abe-stack/shared';

import { assertUserActive } from '../middleware';
import { sendPasswordChangedAlert } from '../security';
import { requestPasswordReset, resetPassword, setPassword } from '../service';
import { createErrorMapperLogger } from '../types';

import type { AppContext, RequestWithCookies } from '../types';
import type { HttpErrorResponse } from '@abe-stack/shared';

/**
 * Handle forgot password request.
 * Always returns success to prevent user enumeration.
 *
 * @param ctx - Application context
 * @param body - Request body with email
 * @returns Success response (always, for enumeration prevention)
 * @complexity O(1)
 */
export async function handleForgotPassword(
  ctx: AppContext,
  body: { email: string },
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const { email } = body;
    const baseUrl = ctx.config.server.appBaseUrl;
    await requestPasswordReset(ctx.db, ctx.repos, ctx.email, ctx.emailTemplates, email, baseUrl);

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT },
    };
  } catch (error) {
    // Email send failed - log but return success to prevent user enumeration
    // The user can retry the forgot password request
    // Use error.name check instead of instanceof for ESM compatibility
    if (error instanceof Error && error.name === 'EmailSendError') {
      const emailError = error as Error & { originalError?: Error };
      ctx.log.error(
        { email: body.email, originalError: emailError.originalError?.message },
        'Failed to send password reset email',
      );
      // Return success anyway to prevent enumeration (user can retry)
      return {
        status: 200,
        body: { message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT },
      };
    }

    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle password reset with token.
 *
 * @param ctx - Application context
 * @param body - Request body with token and new password
 * @param req - Request with cookies and request info
 * @returns Success response or error
 * @complexity O(1)
 */
export async function handleResetPassword(
  ctx: AppContext,
  body: { token: string; password: string },
  req: RequestWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const { token, password } = body;
    const email = await resetPassword(ctx.db, ctx.repos, ctx.config.auth, token, password);
    const { ipAddress, userAgent } = req.requestInfo;

    // Fire-and-forget: send "Was this you?" password changed alert
    sendPasswordChangedAlert(ctx.email, ctx.emailTemplates, {
      email,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    }).catch((err: unknown) => {
      ctx.log.warn({ err, email }, 'Failed to send password changed alert email');
    });

    return {
      status: 200,
      body: { message: 'Password reset successfully' },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle set password for magic-link-only users.
 *
 * @param ctx - Application context
 * @param body - Request body with new password
 * @param req - Request with auth info
 * @returns Success response or error
 * @complexity O(1)
 */
export async function handleSetPassword(
  ctx: AppContext,
  body: { password: string },
  req: RequestWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    // User ID comes from the authenticated request
    const userId = req.user?.userId;
    if (userId === undefined || userId === '') {
      return {
        status: 401,
        body: { message: 'Authentication required' },
      };
    }

    // Verify user account is not suspended
    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    const { password } = body;
    await setPassword(ctx.db, ctx.repos, ctx.config.auth, userId, password);

    return {
      status: 200,
      body: { message: 'Password set successfully' },
    };
  } catch (error) {
    // Handle specific error for user already having a password
    if (error instanceof Error && error.name === 'PasswordAlreadySetError') {
      return {
        status: 409,
        body: { message: error.message },
      };
    }
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
