// apps/server/src/lib/auth.ts
import { verifyToken, type TokenPayload } from './jwt';

import type { UserRole } from '@abe-stack/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Extract and verify token from Authorization header
 */
export function extractTokenPayload(request: FastifyRequest): TokenPayload | null {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Authentication guard - requires valid access token
 */
export function requireAuth(request: FastifyRequest, reply: FastifyReply): void {
  const payload = extractTokenPayload(request);

  if (!payload) {
    reply.status(401).send({ message: 'Unauthorized' });
    return;
  }

  request.user = payload;
}

/**
 * Role-based authorization guard
 * Use after requireAuth to check user roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const payload = extractTokenPayload(request);

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
export function authGuard(...allowedRoles: UserRole[]): AuthHandler {
  if (allowedRoles.length === 0) {
    return requireAuth;
  }
  return requireRole(...allowedRoles);
}
