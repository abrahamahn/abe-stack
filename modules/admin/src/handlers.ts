// modules/admin/src/handlers.ts
/**
 * Admin Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../modules/auth/src';

import { unlockUserAccount, UserNotFoundError } from './service';

import type { UnlockAccountRequest, UnlockAccountResponse } from '@abe-stack/core';
import type { AdminAppContext, AdminRequest } from './types';

/**
 * Unlock a user account (admin only)
 */
export async function handleAdminUnlock(
  ctx: AdminAppContext,
  body: UnlockAccountRequest,
  request: AdminRequest,
): Promise<
  | { status: 200; body: UnlockAccountResponse }
  | { status: 401 | 403 | 404 | 500; body: { message: string } }
> {
  // User and role are already verified by middleware
  if (request.user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const { ipAddress, userAgent } = request.requestInfo;

    const { email, reason } = body;
    const result = await unlockUserAccount(
      ctx.db,
      email,
      request.user.userId,
      reason,
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
