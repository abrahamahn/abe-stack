// backend/server/src/modules/admin/services/admin.service.ts
/**
 * Admin service
 * Business logic for administrative operations
 */

import { users } from '@db';
import { eq } from 'drizzle-orm';

import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../common/constants';
import { extractRequestInfo } from '../../../common/middleware/request-utils';
import { logAccountUnlockedEvent } from '../../../infra/logger/security-events';

import type { FastifyRequest, FastifyInstance } from 'fastify';
import type { ServerEnvironment } from '../../../env';
import type { RequestWithCookies } from '../../../common/types';
import type { UnlockAccountRequest, UnlockAccountResponse } from '@abe-stack/shared';

type AdminResult<T> =
  | { status: 200; body: T }
  | { status: 401 | 403 | 404 | 500; body: { message: string } };

/**
 * Handle admin account unlock
 */
export async function handleAdminUnlock(
  env: ServerEnvironment,
  app: FastifyInstance,
  body: UnlockAccountRequest,
  request: RequestWithCookies,
): Promise<AdminResult<UnlockAccountResponse>> {
  try {
    // Verify admin authentication
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const token = authHeader.substring(7);
    let payload;
    try {
      payload = env.security.verifyToken(token);
    } catch {
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN } };
    }

    // Check if user is admin
    if (payload.role !== 'admin') {
      return { status: 403, body: { message: ERROR_MESSAGES.FORBIDDEN } };
    }

    // Check if the target user exists
    const targetUser = await env.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!targetUser) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    // Extract request info for audit logging
    const { ipAddress, userAgent } = extractRequestInfo(
      request as unknown as FastifyRequest,
      env.config,
    );

    // Unlock the account
    await env.security.unlockAccount(
      env.db,
      body.email,
      payload.userId,
      async (userId, email, adminUserId, ip, ua) => {
        await logAccountUnlockedEvent(env.db, userId, email, adminUserId, ip ?? undefined, ua ?? undefined);
      },
      ipAddress,
      userAgent,
    );

    app.log.info(
      { adminId: payload.userId, targetEmail: body.email },
      'Admin unlocked user account',
    );

    return {
      status: 200,
      body: {
        message: SUCCESS_MESSAGES.ACCOUNT_UNLOCKED,
        email: body.email,
      },
    };
  } catch (error) {
    app.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
