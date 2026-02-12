// src/server/core/src/auth/handlers/login.ts
/**
 * Login Handler
 *
 * Handles user authentication via email or username + password.
 *
 * @module handlers/login
 */

import { EmailNotVerifiedError, HTTP_STATUS, mapErrorToHttpResponse } from '@abe-stack/shared';

import {
  generateDeviceFingerprint,
  isCaptchaRequired,
  isKnownDevice,
  logNewDeviceLogin,
  recordDeviceAccess,
  sendNewLoginAlert,
  verifyCaptchaToken,
} from '../security';
import { authenticateUser, resendVerificationEmail } from '../service';
import { createErrorMapperLogger } from '../types';
import { setRefreshTokenCookie } from '../utils';

import type { AuthResult, SmsChallengeResult, TotpChallengeResult } from '../service';
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type {
  AuthResponse,
  HttpErrorResponse,
  LoginRequest,
  SmsChallengeResponse,
  TotpLoginChallengeResponse,
} from '@abe-stack/shared';

type LoginResult = AuthResult | TotpChallengeResult | SmsChallengeResult;

function isTotpChallenge(result: LoginResult): result is TotpChallengeResult {
  return 'requiresTotp' in result && result.requiresTotp;
}

function isSmsChallenge(result: LoginResult): result is SmsChallengeResult {
  return 'requiresSms' in result && result.requiresSms;
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
  | { status: 202; body: TotpLoginChallengeResponse | SmsChallengeResponse }
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
          status: HTTP_STATUS.BAD_REQUEST,
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
        status: HTTP_STATUS.ACCEPTED,
        body: {
          requiresTotp: true,
          challengeToken: result.challengeToken,
          message: result.message,
        },
      };
    }

    // SMS challenge — user must verify SMS code before getting tokens
    if (isSmsChallenge(result)) {
      return {
        status: HTTP_STATUS.ACCEPTED,
        body: {
          requiresSms: true,
          challengeToken: result.challengeToken,
          message: result.message,
        },
      };
    }

    // Enforce max concurrent sessions: evict oldest if limit reached
    const maxSessions = ctx.config.auth.sessions?.maxConcurrentSessions ?? 10;
    const activeFamilies = await ctx.repos.refreshTokenFamilies.findActiveByUserId(result.user.id);
    if (activeFamilies.length >= maxSessions) {
      // Sort by creation date ascending, revoke oldest
      const sorted = [...activeFamilies].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const toEvict = sorted.slice(0, activeFamilies.length - maxSessions + 1);
      for (const family of toEvict) {
        await ctx.repos.refreshTokenFamilies.revoke(family.id, 'Session limit exceeded');
      }
      ctx.log.info(
        { userId: result.user.id, evicted: toEvict.length },
        'Evicted oldest sessions due to max concurrent session limit',
      );
    }

    // Device fingerprint-based detection using trusted_devices table
    const fingerprint = generateDeviceFingerprint(ipAddress, userAgent ?? '');
    const isNewDevice = !(await isKnownDevice(ctx.repos, result.user.id, fingerprint));

    // Record device access (upserts: creates new or updates lastSeenAt)
    recordDeviceAccess(ctx.repos, result.user.id, fingerprint, ipAddress, userAgent ?? '').catch(
      (err: unknown) => {
        ctx.log.warn({ err }, 'Failed to record device access');
      },
    );

    if (isNewDevice) {
      ctx.log.info({ userId: result.user.id, ipAddress, userAgent }, 'New device login detected');
      // Fire-and-forget: log security event for new device
      logNewDeviceLogin(ctx.db, result.user.id, result.user.email, ipAddress, userAgent).catch(
        (err: unknown) => {
          ctx.log.warn({ err }, 'Failed to log new device login event');
        },
      );
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

    // Resolve default tenant for workspace context
    let defaultTenantId: string | undefined;
    try {
      const memberships = await ctx.repos.memberships.findByUserId(result.user.id);
      const first = memberships[0];
      if (first !== undefined) {
        defaultTenantId = first.tenantId;
      }
    } catch {
      // Non-fatal: client can fetch workspace list separately
    }

    return {
      status: HTTP_STATUS.OK,
      body: {
        token: result.accessToken,
        user: result.user,
        ...(isNewDevice ? { isNewDevice: true } : {}),
        ...(defaultTenantId !== undefined ? { defaultTenantId } : {}),
      },
    };
  } catch (error) {
    // Auto-resend verification email when login blocked by unverified email
    if (error instanceof EmailNotVerifiedError) {
      const baseUrl = ctx.config.server.appBaseUrl;
      resendVerificationEmail(
        ctx.db,
        ctx.repos,
        ctx.email,
        ctx.emailTemplates,
        error.email,
        baseUrl,
      ).catch((err: unknown) => {
        ctx.log.warn({ err, email: error.email }, 'Failed to resend verification email on login');
      });
    }
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
