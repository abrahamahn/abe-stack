// src/server/core/src/auth/handlers/login.ts
/**
 * Login Handler
 *
 * Handles user authentication via email or username + password.
 *
 * @module handlers/login
 */

import { mapErrorToHttpResponse } from '@abe-stack/shared';

import { isCaptchaRequired, sendNewLoginAlert, verifyCaptchaToken } from '../security';
import { authenticateUser } from '../service';
import { createErrorMapperLogger } from '../types';
import { setRefreshTokenCookie } from '../utils';

import type { AuthResult, TotpChallengeResult } from '../service';
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type {
  AuthResponse,
  HttpErrorResponse,
  LoginRequest,
  TotpLoginChallengeResponse,
} from '@abe-stack/shared';

/**
 * Type guard that determines whether the login result requires TOTP verification.
 *
 * @param result - The result from authenticateUser
 * @returns True if the result is a TOTP challenge, false if it's a normal auth result
 * @complexity O(1)
 */
function isTotpChallenge(result: AuthResult | TotpChallengeResult): result is TotpChallengeResult {
  return 'requiresTotp' in result && result.requiresTotp;
}

/**
 * Handle user login via identifier (email or username) and password.
 *
 * @param ctx - Application context
 * @param body - Login request body (identifier + password)
 * @param request - Request with cookies and request info
 * @param reply - Reply with cookie support
 * @returns Auth response with tokens or error response
 * @complexity O(1)
 */
export async function handleLogin(
  ctx: AppContext,
  body: LoginRequest,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  | { status: 200; body: AuthResponse }
  | { status: 202; body: TotpLoginChallengeResponse }
  | HttpErrorResponse
> {
  const { ipAddress, userAgent } = request.requestInfo;

  try {
    // Verify CAPTCHA token if enabled
    if (isCaptchaRequired(ctx.config.auth)) {
      const captchaToken = body.captchaToken ?? '';
      const captchaResult = await verifyCaptchaToken(ctx.config.auth, captchaToken, ipAddress);
      if (!captchaResult.success) {
        return {
          status: 400,
          body: { message: 'CAPTCHA verification failed' },
        };
      }
    }

    const { identifier, password } = body;
    const result = await authenticateUser(
      ctx.db,
      ctx.repos,
      ctx.config.auth,
      identifier,
      password,
      ctx.log,
      ipAddress,
      userAgent,
      (userId) => {
        // Log success - errors are already logged by the service
        ctx.log.info({ userId }, 'Password hash upgraded');
      },
    );

    // TOTP challenge — user must verify 2FA code before getting tokens
    if (isTotpChallenge(result)) {
      return {
        status: 202,
        body: {
          requiresTotp: true,
          challengeToken: result.challengeToken,
          message: result.message,
        },
      };
    }

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(reply, result.refreshToken, ctx.config.auth);

    // Fire-and-forget: send "Was this you?" new login alert email
    sendNewLoginAlert(ctx.email, ctx.emailTemplates, {
      email: result.user.email,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    }).catch((err: unknown) => {
      ctx.log.warn({ err, email: result.user.email }, 'Failed to send new login alert email');
    });

    return {
      status: 200,
      body: {
        token: result.accessToken,
        user: result.user,
      },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
