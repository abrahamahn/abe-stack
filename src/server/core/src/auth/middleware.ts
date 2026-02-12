// src/server/core/src/auth/middleware.ts
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
export function createRequireAuth(secret: string) {
  return (request: FastifyRequest, reply: FastifyReply): void => {
    const payload = extractTokenPayload(request, secret);

    if (payload == null) {
      reply.status(HTTP_STATUS.UNAUTHORIZED).send({ message: 'Unauthorized' });
      return;
    }

    (request as AuthenticatedFastifyRequest).user = payload;
  };
}

/**
 * Create a role-based authorization guard.
 *
 * @param secret - JWT signing secret
 * @param allowedRoles - Roles permitted to access the endpoint
 * @returns Async Fastify preHandler hook function
 * @complexity O(n) where n is the number of allowed roles
 */
export function createRequireRole(secret: string, ...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const payload = extractTokenPayload(request, secret);

    if (payload == null) {
      void reply.status(HTTP_STATUS.UNAUTHORIZED).send({ message: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(payload.role)) {
      void reply
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

/**
 * Create a preHandler hook that requires authentication and specific roles.
 *
 * @param secret - JWT signing secret
 * @param allowedRoles - Roles permitted to access (empty = any authenticated)
 * @returns Fastify preHandler hook function
 * @complexity O(1)
 */
export function createAuthGuard(secret: string, ...allowedRoles: UserRole[]): AuthHandler {
  if (allowedRoles.length === 0) {
    return createRequireAuth(secret);
  }
  return createRequireRole(secret, ...allowedRoles);
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
