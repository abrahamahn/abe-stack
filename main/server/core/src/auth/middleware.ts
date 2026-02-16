// main/server/core/src/auth/middleware.ts
/**
 * Authentication Middleware
 *
 * These functions are designed to be used as Fastify preHandler hooks.
 * They require the JWT secret to be passed when creating the guards.
 *
 * Uses a locally-defined AuthenticatedFastifyRequest to avoid relying on
 * global module augmentation, which can be fragile across package boundaries.
 *
 * @module middleware
 */

import {
  ForbiddenError,
  HTTP_STATUS,
  UnauthorizedError,
  extractBearerToken,
} from '@abe-stack/shared';

import { verifyToken, type TokenPayload } from './utils/jwt';

import type { Repositories } from '../../../db/src';
import type { UserRole } from '@abe-stack/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Fastify request with an attached user payload.
 * The auth middleware sets this after verifying the JWT token.
 * Uses an intersection type so it's compatible with FastifyRequest.
 */
type AuthenticatedFastifyRequest = FastifyRequest & {
  user?: TokenPayload;
};

// ============================================================================
// Token Extraction
// ============================================================================

/**
 * Extract and verify token from Authorization header.
 *
 * @param request - Fastify request object
 * @param secret - JWT signing secret
 * @returns Decoded token payload or null if invalid
 * @complexity O(1)
 */
export function extractTokenPayload(
  request: FastifyRequest,
  secret: string,
  options?: { clockToleranceSeconds?: number },
): TokenPayload | null {
  const token = extractBearerToken(request.headers.authorization);
  if (token == null) return null;

  try {
    return verifyToken(token, secret, options);
  } catch {
    return null;
  }
}

// ============================================================================
// Auth Guards
// ============================================================================

/**
 * Create an authentication guard that requires a valid access token.
 *
 * @param secret - JWT signing secret
 * @returns Fastify preHandler hook function
 * @complexity O(1)
 */
/**
 * Create an authentication guard that requires a valid access token.
 * performs a "Live Check" to ensure the user is not suspended/locked.
 *
 * @param secret - JWT signing secret
 * @param repos - Repositories for user lookup
 * @returns Fastify preHandler hook function
 * @complexity O(1)
 */
export function createRequireAuth(secret: string, repos?: Repositories) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const payload = extractTokenPayload(request, secret);

    if (payload == null) {
      await reply.status(HTTP_STATUS.UNAUTHORIZED).send({ message: 'Unauthorized' });
      return;
    }

    // Live Check: ensure user is active/not suspended when repositories are provided.
    // Some test harnesses pass only a secret/roles guard factory signature.
    if (repos !== undefined) {
      try {
        await assertUserActive(
          (id) => repos.users.findById(id),
          payload.userId,
          (id) => repos.users.unlockAccount(id),
        );
      } catch (error) {
        // If forbidden (suspended), map to 403. If unauthorized (not found), map to 401.
        if (error instanceof ForbiddenError) {
          await reply.status(HTTP_STATUS.FORBIDDEN).send({ message: error.message });
          return;
        }
        // Fallback for user not found
        await reply.status(HTTP_STATUS.UNAUTHORIZED).send({ message: 'Unauthorized' });
        return;
      }
    }

    (request as AuthenticatedFastifyRequest).user = payload;
  };
}

/**
 * Create a role-based authorization guard.
 *
 * @param secret - JWT signing secret
 * @param repos - Repositories for user lookup
 * @param allowedRoles - Roles permitted to access the endpoint
 * @returns Async Fastify preHandler hook function
 * @complexity O(n) where n is the number of allowed roles
 */
export function createRequireRole(
  secret: string,
  repos: Repositories | undefined,
  ...allowedRoles: UserRole[]
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const payload = extractTokenPayload(request, secret);

    if (payload == null) {
      await reply.status(HTTP_STATUS.UNAUTHORIZED).send({ message: 'Unauthorized' });
      return;
    }

    // Live Check: ensure user is active/not suspended when repositories are provided.
    if (repos !== undefined) {
      try {
        await assertUserActive(
          (id) => repos.users.findById(id),
          payload.userId,
          (id) => repos.users.unlockAccount(id),
        );
      } catch (error) {
        if (error instanceof ForbiddenError) {
          await reply.status(HTTP_STATUS.FORBIDDEN).send({ message: error.message });
          return;
        }
        await reply.status(HTTP_STATUS.UNAUTHORIZED).send({ message: 'Unauthorized' });
        return;
      }
    }

    if (!allowedRoles.includes(payload.role)) {
      await reply
        .status(HTTP_STATUS.FORBIDDEN)
        .send({ message: 'Forbidden: insufficient permissions' });
      return;
    }

    (request as AuthenticatedFastifyRequest).user = payload;
  };
}

/**
 * Check if user has admin role.
 *
 * @param request - Fastify request object
 * @returns True if user is an admin
 * @complexity O(1)
 */
export function isAdmin(request: FastifyRequest): boolean {
  return (request as AuthenticatedFastifyRequest).user?.role === 'admin';
}

/** Fastify preHandler hook type */
type AuthHandler = (request: FastifyRequest, reply: FastifyReply) => void | Promise<void>;

function isRepositories(value: Repositories | UserRole | undefined): value is Repositories {
  return typeof value === 'object' && 'users' in value;
}

/**
 * Create a preHandler hook that requires authentication and specific roles.
 *
 * @param secret - JWT signing secret
 * @param allowedRoles - Roles permitted to access (empty = any authenticated)
 * @returns Fastify preHandler hook function
 * @complexity O(1)
 */
export function createAuthGuard(
  secret: string,
  reposOrFirstRole: Repositories | UserRole | undefined,
  ...allowedRolesOrRest: UserRole[]
): AuthHandler {
  const hasRepos = isRepositories(reposOrFirstRole);
  const repos = hasRepos ? reposOrFirstRole : undefined;
  const allowedRoles = hasRepos
    ? allowedRolesOrRest
    : reposOrFirstRole === undefined
      ? allowedRolesOrRest
      : [reposOrFirstRole, ...allowedRolesOrRest];

  if (allowedRoles.length === 0) {
    return createRequireAuth(secret, repos);
  }
  return createRequireRole(secret, repos, ...allowedRoles);
}

// ============================================================================
// Active User Assertion
// ============================================================================

/**
 * Assert that a user account is active (not suspended/banned).
 * Call this in sensitive handlers (password change, TOTP, sudo, admin actions)
 * to prevent zombie access tokens from being used after account suspension.
 *
 * If the lock has expired (lockedUntil is in the past), the account is
 * auto-unlocked by clearing the lock fields via the provided unlock callback.
 *
 * @param getUserById - Repository function to look up user by ID
 * @param userId - The user ID to check
 * @param onAutoUnlock - Optional callback to clear expired lock fields in the database
 * @throws {UnauthorizedError} If user not found
 * @throws {ForbiddenError} If user account is suspended (lockedUntil in the future)
 */
export async function assertUserActive(
  getUserById: (
    id: string,
  ) => Promise<{ lockedUntil: Date | null; lockReason: string | null } | null>,
  userId: string,
  onAutoUnlock?: (userId: string) => Promise<void>,
): Promise<void> {
  const user = await getUserById(userId);
  if (user === null) {
    throw new UnauthorizedError('User not found');
  }
  if (user.lockedUntil !== null) {
    if (user.lockedUntil > new Date()) {
      // Account is still locked -- include lock reason in the error message
      const reason = user.lockReason ?? 'Account suspended';
      throw new ForbiddenError(`Account locked: ${reason}`, 'ACCOUNT_SUSPENDED');
    }
    // Lock has expired -- auto-unlock
    if (onAutoUnlock !== undefined) {
      await onAutoUnlock(userId);
    }
  }
}
