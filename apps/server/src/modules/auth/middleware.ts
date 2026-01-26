// apps/server/src/modules/auth/middleware.ts
/**
 * Authentication Middleware
 *
 * These functions are designed to be used as Fastify preHandler hooks.
 * They require the JWT secret to be passed when creating the guards.
 */

import { verifyToken, type TokenPayload } from '@auth/utils/jwt';

import type { UserRole } from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Extract and verify token from Authorization header
 */
export function extractTokenPayload(request: FastifyRequest, secret: string): TokenPayload | null {
  const authHeader = request.headers.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    return verifyToken(token, secret);
  } catch {
    return null;
  }
}

/**
 * Create an authentication guard that requires a valid access token
 */
export function createRequireAuth(secret: string) {
  return (request: FastifyRequest, reply: FastifyReply): void => {
    const payload = extractTokenPayload(request, secret);

    if (!payload) {
      reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    request.user = payload;
  };
}

/**
 * Create a role-based authorization guard
 */
export function createRequireRole(secret: string, ...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const payload = extractTokenPayload(request, secret);

    if (!payload) {
      void reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(payload.role)) {
      void reply.status(403).send({ message: 'Forbidden: insufficient permissions' });
      return;
    }

    request.user = payload;
  };
}

/**
 * Check if user has admin role
 */
export function isAdmin(request: FastifyRequest): boolean {
  return request.user?.role === 'admin';
}

type AuthHandler = (request: FastifyRequest, reply: FastifyReply) => void | Promise<void>;

/**
 * Create a preHandler hook that requires authentication and specific roles
 */
export function createAuthGuard(secret: string, ...allowedRoles: UserRole[]): AuthHandler {
  if (allowedRoles.length === 0) {
    return createRequireAuth(secret);
  }
  return createRequireRole(secret, ...allowedRoles);
}
