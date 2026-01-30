// apps/server/src/modules/auth/handlers/verify.ts
/**
 * Email Verification Handlers
 *
 * Handles email verification and resend verification flows.
 */

import { resendVerificationEmail, verifyEmail } from '../service';
import {
  mapErrorToResponse,
  SUCCESS_MESSAGES,
  type AppContext,
  type ReplyWithCookies,
} from '@shared';

import { setRefreshTokenCookie } from '../utils';

import type { AuthResponse } from '@abe-stack/core';

export async function handleVerifyEmail(
  ctx: AppContext,
  body: { token: string },
  reply: ReplyWithCookies,
): Promise<
  | { status: 200; body: AuthResponse & { verified: boolean } }
  | { status: number; body: { message: string } }
> {
  try {
    const { token } = body;
    const result = await verifyEmail(ctx.db, ctx.repos, ctx.config.auth, token);

    // Set refresh token as HTTP-only cookie for auto-login
    setRefreshTokenCookie(reply, result.refreshToken, ctx.config.auth);

    return {
      status: 200,
      body: {
        verified: true,
        token: result.accessToken,
        user: result.user,
      },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}

export async function handleResendVerification(
  ctx: AppContext,
  body: { email: string },
): Promise<
  { status: 200; body: { message: string } } | { status: number; body: { message: string } }
> {
  try {
    const { email } = body;
    const baseUrl = ctx.config.server.appBaseUrl;
    await resendVerificationEmail(ctx.db, ctx.repos, ctx.email, email, baseUrl);

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT },
    };
  } catch (error) {
    // Use error mapper with default EmailSendError handling (returns 503)
    return mapErrorToResponse(error, ctx);
  }
}
