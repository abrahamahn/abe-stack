// src/server/core/src/auth/handlers/sms-challenge.ts
/**
 * SMS 2FA Challenge Handlers
 *
 * HTTP layer for SMS-based 2FA during login flow.
 * Follows the same challenge token pattern as TOTP login verification.
 *
 * @module handlers/sms-challenge
 */

import { withTransaction } from '@abe-stack/db';
import { verify as jwtVerify, JwtError } from '@abe-stack/server-engine';
import {
  HTTP_STATUS,
  InvalidTokenError,
  mapErrorToHttpResponse,
  type AuthResponse,
  type HttpErrorResponse,
} from '@abe-stack/shared';

import { checkSmsRateLimit } from '../sms-2fa/rate-limit';
import { sendSms2faCode, verifySms2faCode } from '../sms-2fa/service';
import {
  createErrorMapperLogger,
  type AppContext,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '../types';
import {
  createAccessToken,
  createAuthResponse,
  createRefreshTokenFamily,
  setRefreshTokenCookie,
} from '../utils';

import type { SmsChallengeRequest, SmsVerifyRequest } from '../sms-2fa/types';

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle sending an SMS code during the login challenge flow.
 *
 * POST /api/auth/sms/send
 * Called after login returns a challenge token indicating SMS 2FA is required.
 * Sends a verification code to the user's verified phone number.
 */
export async function handleSendSmsCode(
  ctx: AppContext,
  body: SmsChallengeRequest,
  _request: RequestWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    // Verify the challenge JWT
    let payload: Record<string, unknown>;
    try {
      payload = jwtVerify(body.challengeToken, ctx.config.auth.jwt.secret) as Record<
        string,
        unknown
      >;
    } catch (error) {
      if (error instanceof JwtError) {
        throw new InvalidTokenError('Challenge token is invalid or expired');
      }
      throw error;
    }

    // Validate challenge token purpose and extract userId
    if (
      (payload['purpose'] !== 'sms_challenge' && payload['purpose'] !== 'totp_challenge') ||
      typeof payload['userId'] !== 'string'
    ) {
      throw new InvalidTokenError('Invalid challenge token');
    }

    const userId = payload['userId'];

    // Get user's verified phone
    const userResult = await ctx.repos.users.findById(userId);
    if (userResult === null) {
      throw new InvalidTokenError('User not found');
    }

    const phone = userResult.phone;
    const phoneVerified = userResult.phoneVerified;

    if (phone === null || phoneVerified !== true) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: { message: 'No verified phone number on account' },
      };
    }

    // Check rate limit
    const rateLimit = await checkSmsRateLimit(ctx.db, userId);
    if (!rateLimit.allowed) {
      return {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        body: { message: 'Too many SMS requests. Please try again later.' },
      };
    }

    // Get the SMS provider from context (may not be configured)
    if (ctx.sms === undefined) {
      ctx.log.error('SMS provider not configured');
      return {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        body: { message: 'SMS service unavailable' },
      };
    }
    const smsProvider = ctx.sms;

    // Send code
    const result = await sendSms2faCode(ctx.db, smsProvider, userId, phone);

    if (!result.success) {
      ctx.log.error({ error: result.error }, 'Failed to send SMS challenge code');
      return {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        body: { message: 'Failed to send verification code' },
      };
    }

    return { status: HTTP_STATUS.OK, body: { message: 'Verification code sent' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle verifying an SMS code during the login challenge flow.
 *
 * POST /api/auth/sms/verify
 * Verifies the SMS code and issues auth tokens on success.
 * Follows the same pattern as handleTotpLoginVerify.
 */
export async function handleVerifySmsCode(
  ctx: AppContext,
  body: SmsVerifyRequest,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: AuthResponse } | HttpErrorResponse> {
  try {
    const { ipAddress, userAgent } = request.requestInfo;

    // Verify the challenge JWT
    let payload: Record<string, unknown>;
    try {
      payload = jwtVerify(body.challengeToken, ctx.config.auth.jwt.secret) as Record<
        string,
        unknown
      >;
    } catch (error) {
      if (error instanceof JwtError) {
        throw new InvalidTokenError('Challenge token is invalid or expired');
      }
      throw error;
    }

    // Validate challenge token purpose and extract userId
    if (
      (payload['purpose'] !== 'sms_challenge' && payload['purpose'] !== 'totp_challenge') ||
      typeof payload['userId'] !== 'string'
    ) {
      throw new InvalidTokenError('Invalid challenge token');
    }

    const userId = payload['userId'];

    // Verify SMS code
    const verifyResult = await verifySms2faCode(ctx.db, userId, body.code);
    if (!verifyResult.valid) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: verifyResult.message } };
    }

    // Fetch user for token creation
    const user = await ctx.repos.users.findById(userId);
    if (user === null) {
      throw new InvalidTokenError('User not found');
    }

    // Create tokens (same pattern as TOTP login verify)
    const { token: refreshToken } = await withTransaction(ctx.db, async (tx) => {
      const sessionMeta: { ipAddress?: string; userAgent?: string } = { ipAddress };
      if (userAgent !== undefined) {
        sessionMeta.userAgent = userAgent;
      }
      return createRefreshTokenFamily(
        tx,
        user.id,
        ctx.config.auth.refreshToken.expiryDays,
        sessionMeta,
      );
    });

    const accessToken = createAccessToken(
      user.id,
      user.email,
      user.role,
      ctx.config.auth.jwt.secret,
      ctx.config.auth.jwt.accessTokenExpiry,
    );

    // Set refresh token cookie
    setRefreshTokenCookie(reply, refreshToken, ctx.config.auth);

    const authResponse = createAuthResponse(accessToken, refreshToken, user);

    return {
      status: HTTP_STATUS.OK,
      body: {
        token: authResponse.accessToken,
        user: authResponse.user,
      },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
