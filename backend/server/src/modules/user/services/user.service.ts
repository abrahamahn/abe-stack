// backend/server/src/modules/user/services/user.service.ts
/**
 * User service
 * Business logic for user operations
 */

import { users } from '@db';
import { eq } from 'drizzle-orm';

import { ERROR_MESSAGES } from '../../../common/constants';

import type { FastifyInstance } from 'fastify';
import type { ServerEnvironment } from '../../../infra/ctx';
import type { RequestWithCookies } from '../../../common/types';
import type { UserResponse } from '@abe-stack/shared';

type UserResult =
  | { status: 200; body: UserResponse }
  | { status: 401 | 404 | 500; body: { message: string } };

/**
 * Handle get current user
 */
export async function handleMe(
  env: ServerEnvironment,
  app: FastifyInstance,
  request: RequestWithCookies,
): Promise<UserResult> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { status: 401, body: { message: ERROR_MESSAGES.MISSING_AUTH_HEADER } };
    }

    const token = authHeader.substring(7);
    let payload;
    try {
      payload = env.security.verifyToken(token);
      request.user = payload;
    } catch {
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN } };
    }

    const user = await env.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    return {
      status: 200,
      body: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  } catch (error) {
    app.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
