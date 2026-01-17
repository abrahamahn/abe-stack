// apps/server/src/modules/admin/handlers.ts
/**
 * Admin Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

import { unlockUserAccount, UserNotFoundError } from '@admin/service';
import { extractRequestInfo, type RequestWithCookies } from '@modules/auth';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, type AppContext } from '@shared';

import type { UnlockAccountRequest, UnlockAccountResponse } from '@abe-stack/core';
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
  // User and role are already verified by middleware
  if (!request.user) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const { ipAddress, userAgent } = extractRequestInfo(request as unknown as FastifyRequest);

    const { email } = body;
    const result = await unlockUserAccount(
      ctx.db,
      email,
      request.user.userId,
      ipAddress,
      userAgent,
    );

    ctx.log.info(
      { adminId: request.user.userId, targetEmail: email },
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
