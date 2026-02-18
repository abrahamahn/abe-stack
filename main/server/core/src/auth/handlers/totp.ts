// main/server/core/src/auth/handlers/totp.ts
/**
 * TOTP (2FA) Handlers
 *
 * HTTP layer for TOTP setup, enable, disable, and status.
 *
 * @module handlers/totp
 */

import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  InvalidTokenError,
  mapErrorToHttpResponse,
  type AuthResponse,
  type HttpErrorResponse,
  type TotpLoginVerifyRequest,
  type TotpSetupResponse,
  type TotpStatusResponse,
  type TotpVerifyRequest,
  type TotpVerifyResponse,
} from '@bslt/shared';

import { withTransaction } from '../../../../db/src';
import { JwtError, verify as jwtVerify } from '../../../../system/src';
import { assertUserActive } from '../middleware';
import { disableTotp, enableTotp, getTotpStatus, setupTotp, verifyTotpForLogin } from '../totp';
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

/**
 * Handle TOTP setup — generate secret and backup codes.
 */
export async function handleTotpSetup(
  ctx: AppContext,
  _body: unknown,
  request: RequestWithCookies,
): Promise<{ status: 200; body: TotpSetupResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
      };
    }

    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    const email = request.user?.email ?? '';
    const result = await setupTotp(ctx.db, userId, email, ctx.config.auth);

    return { status: HTTP_STATUS.OK, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle TOTP enable — verify code and activate 2FA.
 */
export async function handleTotpEnable(
  ctx: AppContext,
  body: TotpVerifyRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: TotpVerifyResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
      };
    }

    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    const result = await enableTotp(ctx.db, userId, body.code, ctx.config.auth);

    if (!result.success) {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: result.message } };
    }

    return { status: HTTP_STATUS.OK, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle TOTP disable — verify code and deactivate 2FA.
 */
export async function handleTotpDisable(
  ctx: AppContext,
  body: TotpVerifyRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: TotpVerifyResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
      };
    }

    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    const result = await disableTotp(ctx.db, userId, body.code, ctx.config.auth);

    if (!result.success) {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: result.message } };
    }

    return { status: HTTP_STATUS.OK, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle TOTP status check.
 */
export async function handleTotpStatus(
  ctx: AppContext,
  _body: unknown,
  request: RequestWithCookies,
): Promise<{ status: 200; body: TotpStatusResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
      };
    }

    const result = await getTotpStatus(ctx.db, userId);
    return { status: HTTP_STATUS.OK, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Handle TOTP login verification — verify challenge token + TOTP code, return auth tokens.
 *
 * This is called after login returns a 202 TOTP challenge. The client sends back
 * the challenge JWT and the 6-digit TOTP code. On success, full auth tokens are issued.
 *
 * @param ctx - Application context
 * @param body - Challenge token and TOTP code
 * @param _request - Request with cookies (unused)
 * @param reply - Reply with cookie support
 * @returns Auth response with tokens or error
 * @complexity O(1)
 */
export async function handleTotpLoginVerify(
  ctx: AppContext,
  body: TotpLoginVerifyRequest,
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
    if (payload['purpose'] !== 'totp_challenge' || typeof payload['userId'] !== 'string') {
      throw new InvalidTokenError('Invalid challenge token');
    }

    const userId = payload['userId'];

    // Verify TOTP code
    const isValid = await verifyTotpForLogin(ctx.db, userId, body.code, ctx.config.auth);
    if (!isValid) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Invalid TOTP code' } };
    }

    // Fetch user for token creation
    const user = await ctx.repos.users.findById(userId);
    if (user === null) {
      throw new InvalidTokenError('User not found');
    }

    // Create tokens
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
