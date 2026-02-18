// main/server/core/src/auth/handlers/sudo.ts
/**
 * Sudo Mode Handler
 *
 * Re-authenticates the user and issues a short-lived sudo JWT (5 min TTL).
 * Required before sensitive operations like account deletion or ownership transfer.
 *
 * @module handlers/sudo
 */

import { AUTH_EXPIRY, HTTP_STATUS, mapErrorToHttpResponse } from '@bslt/shared';

import { sign, verify } from '../../../../engine/src';
import { assertUserActive } from '../middleware';
import { verifyTotpCode } from '../totp';
import { createErrorMapperLogger } from '../types';
import { verifyPasswordSafe } from '../utils/password';

import type { HttpErrorResponse } from '@bslt/shared';
import type { AppContext, RequestWithCookies } from '../types';

/** Sudo token TTL in minutes */
export const SUDO_TOKEN_TTL_MINUTES = AUTH_EXPIRY.SUDO_MINUTES;

/** Sudo token type claim */
const SUDO_TOKEN_TYPE = 'sudo';

/** Sudo request body */
export interface SudoElevateRequest {
  password?: string;
  totpCode?: string;
}

/** Sudo response body */
export interface SudoElevateResponse {
  sudoToken: string;
  expiresAt: string;
}

/**
 * Handle sudo elevation: verify password (or TOTP), return short-lived sudo JWT.
 */
export async function handleSudoElevate(
  ctx: AppContext,
  body: SudoElevateRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: SudoElevateResponse } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
    }

    // Verify user account is not suspended before allowing sudo elevation
    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    const user = await ctx.repos.users.findById(userId);
    if (user === null) {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: 'User not found' } };
    }

    // Verify password
    if (body.password !== undefined) {
      const valid = await verifyPasswordSafe(body.password, user.passwordHash);
      if (!valid) {
        ctx.log.warn({ userId }, 'Sudo elevation failed: invalid password');
        return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Invalid credentials' } };
      }
    } else if (body.totpCode !== undefined) {
      if (!user.totpEnabled) {
        return {
          status: HTTP_STATUS.BAD_REQUEST,
          body: { message: 'TOTP is not enabled for this account' },
        };
      }
      if (user.totpSecret === null) {
        return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'TOTP is not configured' } };
      }
      const isValid = verifyTotpCode(user.totpSecret, body.totpCode, 1);
      if (!isValid) {
        ctx.log.warn({ userId }, 'Sudo elevation failed: invalid TOTP code');
        return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Invalid TOTP code' } };
      }
    } else {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: { message: 'Either password or totpCode is required' },
      };
    }

    // Issue sudo token
    const expiresIn = `${String(SUDO_TOKEN_TTL_MINUTES)}m`;
    const sudoToken = sign({ userId, type: SUDO_TOKEN_TYPE }, ctx.config.auth.jwt.secret, {
      expiresIn,
    });

    const expiresAt = new Date(Date.now() + SUDO_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

    ctx.log.info({ userId }, 'Sudo elevation granted');

    return {
      status: HTTP_STATUS.OK,
      body: { sudoToken, expiresAt },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Verify a sudo token and return the user ID.
 * Returns null if the token is invalid or expired.
 */
export function verifySudoToken(token: string, jwtSecret: string): { userId: string } | null {
  try {
    const payload = verify(token, jwtSecret);
    if (payload['type'] !== SUDO_TOKEN_TYPE || typeof payload['userId'] !== 'string') {
      return null;
    }
    return { userId: payload['userId'] };
  } catch {
    return null;
  }
}
