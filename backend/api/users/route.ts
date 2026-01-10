/**
 * Users API Route
 * Contract + Handler colocated in single file
 */
import { users } from '@db/schema';
import { initContract } from '@ts-rest/core';
import { eq } from 'drizzle-orm';

import { verifyToken } from '../../server/lib/jwt';
import { errorResponseSchema, userResponseSchema } from '../_lib/schemas';

import type { UserResponse } from '../_lib/schemas';
import type { FastifyInstance } from 'fastify';

// ============================================
// Contract Definition
// ============================================

const c = initContract();

export const usersContract = c.router({
  me: {
    method: 'GET',
    path: '/api/users/me',
    responses: {
      200: userResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Get current user profile',
  },
});

// ============================================
// Handler Types
// ============================================

interface RequestWithAuth {
  headers: { authorization?: string };
  user?: { userId: string; email: string; role: string };
}

// ============================================
// Handlers
// ============================================

export async function handleMe(
  app: FastifyInstance,
  request: RequestWithAuth,
): Promise<
  { status: 200; body: UserResponse } | { status: 401 | 404 | 500; body: { message: string } }
> {
  // Verify token
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { status: 401, body: { message: 'Missing or invalid authorization header' } };
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    request.user = payload;
  } catch {
    return { status: 401, body: { message: 'Invalid or expired token' } };
  }

  // Fetch user
  try {
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, request.user.userId),
    });

    if (!user) {
      return { status: 404, body: { message: 'User not found' } };
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
    return { status: 500, body: { message: 'Internal server error' } };
  }
}

// ============================================
// Router Factory
// ============================================

type MeResult = Awaited<ReturnType<typeof handleMe>>;

export interface UsersRouter {
  me: (args: { request: RequestWithAuth }) => Promise<MeResult>;
}

export function createUsersRouter(app: FastifyInstance): UsersRouter {
  return {
    me: async ({ request }): Promise<MeResult> => handleMe(app, request),
  };
}
