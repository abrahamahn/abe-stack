// apps/server/src/modules/auth/magic-link/handlers.ts
/**
 * Magic Link Handlers
 *
 * HTTP handlers for magic link authentication.
 * Thin layer that calls services and formats responses.
 */

import {
  EmailSendError,
  mapErrorToResponse,
  SUCCESS_MESSAGES,
  type AppContext,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '@shared';

import { setRefreshTokenCookie } from '../utils';

import { requestMagicLink, verifyMagicLink } from './service';

import type { AuthResponse, MagicLinkRequest, MagicLinkRequestResponse } from '@abe-stack/core';

/**
 * Handle magic link request
 *
 * Always returns success to prevent email enumeration.
 * Rate limiting is handled by the service.
 */
export async function handleMagicLinkRequest(
  ctx: AppContext,
  body: MagicLinkRequest,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: MagicLinkRequestResponse }
  | { status: number; body: { message: string; code?: string } }
> {
  const { ipAddress, userAgent } = request.requestInfo;

  try {
    const { email } = body;
    const baseUrl = ctx.config.server.appBaseUrl;

    const result = await requestMagicLink(ctx.db, ctx.email, email, baseUrl, ipAddress, userAgent);

    return {
      status: 200,
      body: result,
    };
  } catch (error) {
    // Email send failed - log but return success to prevent user enumeration
    if (error instanceof EmailSendError) {
      ctx.log.error(
        { email: body.email, originalError: error.originalError?.message },
        'Failed to send magic link email',
      );
      // Return success anyway to prevent enumeration (user can retry)
      return {
        status: 200,
        body: {
          success: true,
          message: SUCCESS_MESSAGES.MAGIC_LINK_SENT,
        },
      };
    }

    return mapErrorToResponse(error, ctx);
  }
}

/**
 * Handle magic link verification
 *
 * Verifies the token and returns auth credentials on success.
 */
export async function handleMagicLinkVerify(
  ctx: AppContext,
  body: { token: string },
  _request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: AuthResponse } | { status: number; body: { message: string; code?: string } }
> {
  try {
    const { token } = body;

    const result = await verifyMagicLink(ctx.db, ctx.config.auth, token);

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(reply, result.refreshToken, ctx.config.auth);

    return {
      status: 200,
      body: {
        token: result.accessToken,
        user: result.user,
      },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}
