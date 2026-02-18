// main/server/core/src/auth/magic-link/handlers.ts
/**
 * Magic Link Handlers
 *
 * HTTP handlers for magic link authentication.
 * Thin layer that calls services and formats responses.
 *
 * @module magic-link/handlers
 */

import {
  AUTH_SUCCESS_MESSAGES as SUCCESS_MESSAGES,
  mapErrorToHttpResponse,
} from '@bslt/shared';
import { isStrategyEnabled } from '@bslt/shared/config';

import { getMetricsCollector } from '../../../../engine/src';
import {
  logMagicLinkFailedEvent,
  logMagicLinkRequestEvent,
  logMagicLinkVerifiedEvent,
} from '../security';
import { createErrorMapperLogger } from '../types';
import { setRefreshTokenCookie } from '../utils';

import { requestMagicLink, verifyMagicLink } from './service';

import type {
  AuthResponse,
  EmailSendError,
  HttpErrorResponse,
  MagicLinkRequest,
  MagicLinkRequestResponse,
} from '@bslt/shared';
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';

/**
 * Handle magic link request.
 * Always returns success to prevent email enumeration.
 * Rate limiting is handled by the service.
 *
 * @param ctx - Application context
 * @param body - Request body with email
 * @param request - Request with cookies and request info
 * @returns Magic link request response or error
 * @complexity O(1)
 */
export async function handleMagicLinkRequest(
  ctx: AppContext,
  body: MagicLinkRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: MagicLinkRequestResponse } | HttpErrorResponse> {
  // Check if magic link authentication is enabled
  if (!isStrategyEnabled(ctx.config.auth, 'magic')) {
    return {
      status: 404,
      body: { message: 'Magic link authentication is not enabled', code: 'NOT_FOUND' },
    };
  }

  const { ipAddress, userAgent } = request.requestInfo;

  try {
    const { email } = body;
    const baseUrl = ctx.config.server.appBaseUrl;

    // Use config values for magic link settings
    const magicLinkConfig = ctx.config.auth.magicLink;

    const result = await requestMagicLink(
      ctx.db,
      ctx.repos,
      ctx.email,
      ctx.emailTemplates,
      email,
      baseUrl,
      ipAddress,
      userAgent,
      {
        tokenExpiryMinutes: magicLinkConfig.tokenExpiryMinutes,
        maxAttemptsPerEmail: magicLinkConfig.maxAttempts,
      },
    );

    // Log the request event (fire and forget - don't block response)
    void logMagicLinkRequestEvent(ctx.db, email.toLowerCase(), ipAddress, userAgent);

    return {
      status: 200,
      body: result,
    };
  } catch (error) {
    // Email send failed - log but return success to prevent user enumeration
    // Use name-based check for cross-module boundary compatibility
    if (
      error !== null &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'EmailSendError'
    ) {
      const emailError = error as EmailSendError;
      ctx.log.error(
        { email: body.email, originalError: emailError.originalError?.message },
        'Failed to send magic link email',
      );
      // Return success anyway to prevent enumeration (user can retry)
      const responseBody: MagicLinkRequestResponse = {
        message: SUCCESS_MESSAGES.MAGIC_LINK_SENT,
      };
      return { status: 200 as const, body: responseBody };
    }

    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle magic link verification.
 * Verifies the token and returns auth credentials on success.
 *
 * @param ctx - Application context
 * @param body - Request body with token
 * @param request - Request with cookies and request info
 * @param reply - Reply with cookie support
 * @returns Auth response or error
 * @complexity O(1)
 */
export async function handleMagicLinkVerify(
  ctx: AppContext,
  body: { token: string },
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: AuthResponse } | HttpErrorResponse> {
  // Check if magic link authentication is enabled
  if (!isStrategyEnabled(ctx.config.auth, 'magic')) {
    return {
      status: 404,
      body: { message: 'Magic link authentication is not enabled', code: 'NOT_FOUND' },
    };
  }

  const { ipAddress, userAgent } = request.requestInfo;
  const metrics = getMetricsCollector();
  const provider = 'magic';

  try {
    const { token } = body;
    metrics.recordLoginAttempt(provider);

    const result = await verifyMagicLink(ctx.db, ctx.repos, ctx.config.auth, token);

    // Record success
    metrics.recordLoginSuccess(provider);

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(reply, result.refreshToken, ctx.config.auth);

    // Log successful verification (fire and forget)
    // isNewUser is approximated - new users have the default firstName "User"
    const isNewUser = result.user.firstName === 'User' && result.user.lastName === '';
    void logMagicLinkVerifiedEvent(
      ctx.db,
      result.user.id,
      result.user.email,
      isNewUser,
      ipAddress,
      userAgent,
    );

    return {
      status: 200,
      body: {
        token: result.accessToken,
        user: result.user,
      },
    };
  } catch (error) {
    // Record failure
    metrics.recordLoginFailure(provider);

    // Log failed verification attempt
    // Use name-based check for cross-module boundary compatibility
    if (
      error !== null &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'InvalidTokenError'
    ) {
      void logMagicLinkFailedEvent(
        ctx.db,
        undefined, // email unknown for invalid tokens
        'Invalid or expired magic link',
        ipAddress,
        userAgent,
      );
    }

    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
