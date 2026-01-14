// apps/server/src/modules/admin/handlers.ts
/**
 * Admin Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

import { ERROR_MESSAGES, SUCCESS_MESSAGES, type AppContext } from '../../shared';
import { extractAndVerifyToken, extractRequestInfo, type RequestWithCookies } from '../auth';

import { unlockUserAccount, UserNotFoundError } from './service';

import type { UnlockAccountRequest, UnlockAccountResponse } from '@abe-stack/contracts';
import type { FastifyRequest } from 'fastify';

/**
 * Unlock a user account (admin only)
 */
export async function handleAdminUnlock(
  ctx: AppContext,
  body: UnlockAccountRequest,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: UnlockAccountResponse }
  | { status: 401 | 403 | 404 | 500; body: { message: string } }
> {
  // Verify admin authentication
  const payload = extractAndVerifyToken(request, ctx.config.auth.jwt.secret);
  if (!payload) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  // Check if user is admin
  if (payload.role !== 'admin') {
    return { status: 403, body: { message: ERROR_MESSAGES.FORBIDDEN } };
  }

  try {
    const { ipAddress, userAgent } = extractRequestInfo(request as unknown as FastifyRequest);

    const result = await unlockUserAccount(
      ctx.db,
      body.email,
      payload.userId,
      ipAddress,
      userAgent,
    );

    ctx.log.info(
      { adminId: payload.userId, targetEmail: body.email },
      'Admin unlocked user account',
    );

    return {
      status: 200,
      body: {
        message: SUCCESS_MESSAGES.ACCOUNT_UNLOCKED,
        email: result.email,
      },
    };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
