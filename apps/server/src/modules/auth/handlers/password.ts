// apps/server/src/modules/auth/handlers/password.ts
/**
 * Password Handlers
 *
 * Handles forgot password and reset password flows.
 */

import { requestPasswordReset, resetPassword } from '@auth/service';
import { EmailSendError, mapErrorToResponse, SUCCESS_MESSAGES, type AppContext } from '@shared';

export async function handleForgotPassword(
  ctx: AppContext,
  body: { email: string },
): Promise<
  { status: 200; body: { message: string } } | { status: number; body: { message: string } }
> {
  try {
    const { email } = body;
    const baseUrl = ctx.config.server.appBaseUrl;
    await requestPasswordReset(ctx.db, ctx.email, email, baseUrl);

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT },
    };
  } catch (error) {
    // Email send failed - log but return success to prevent user enumeration
    // The user can retry the forgot password request
    if (error instanceof EmailSendError) {
      ctx.log.error(
        { email: body.email, originalError: error.originalError?.message },
        'Failed to send password reset email',
      );
      // Return success anyway to prevent enumeration (user can retry)
      return {
        status: 200,
        body: { message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT },
      };
    }

    return mapErrorToResponse(error, ctx);
  }
}

export async function handleResetPassword(
  ctx: AppContext,
  body: { token: string; password: string },
): Promise<
  { status: 200; body: { message: string } } | { status: number; body: { message: string } }
> {
  try {
    const { token, password } = body;
    await resetPassword(ctx.db, ctx.config.auth, token, password);

    return {
      status: 200,
      body: { message: 'Password reset successfully' },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}
