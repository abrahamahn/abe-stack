// main/server/core/src/admin/handlers.ts
/**
 * Admin Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../auth';

import { unlockUserAccount, UserNotFoundError } from './service';

import type { AdminAppContext, AdminRequest } from './types';
import type { UnlockAccountRequest, UnlockAccountResponse } from '@bslt/shared';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/**
 * Unlock a user account (admin only)
 */
export async function handleAdminUnlock(
  ctx: AdminAppContext,
  body: UnlockAccountRequest,
  request: AdminRequest,
): Promise<
  | { status: 200; body: UnlockAccountResponse }
  | { status: 400 | 401 | 403 | 404 | 500; body: { message: string } }
> {
  // User and role are already verified by middleware
  const user = request.user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const requestInfo = request.requestInfo;
    const ipAddress = requestInfo.ipAddress;
    const userAgent = requestInfo.userAgent;

    const { email, reason } = body;
    if (email === undefined || email === '') {
      return { status: 400, body: { message: 'Email is required' } };
    }
    const result = await unlockUserAccount(
      ctx.db,
      email,
      user.userId,
      reason,
      ipAddress,
      userAgent,
    );

    ctx.log.info({ adminId: user.userId, targetEmail: email }, 'Admin unlocked user account');

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

    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
