// apps/server/src/infra/rbac/middleware.ts
/**
 * RBAC Middleware
 *
 * Fastify hooks for ability-based access control.
 * Attach abilities to requests and check permissions.
 */

import { type Ability, createEmptyAbility, defineAbility } from './ability';

import type { Action, Subject } from './ability';
import type { UserRole } from '../../shared';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface AbilityUser {
  userId: string;
  email: string;
  role: UserRole;
}

/** Function that creates abilities based on the authenticated user */
export type AbilityFactory = (user: AbilityUser) => Ability;

// ============================================================================
// Default Ability Factory
// ============================================================================

/**
 * Default ability factory based on user role
 * Override this in your application for custom rules
 */
export const defaultAbilityFactory: AbilityFactory = (user: AbilityUser): Ability => {
  return defineAbility((builder) => {
    // Admin can do everything
    if (user.role === 'admin') {
      builder.can('manage', 'all');
      return;
    }

    // Moderator permissions
    if (user.role === 'moderator') {
      builder.can('read', 'all');
      builder.can('update', 'Post');
      builder.can('delete', 'Comment');
      return;
    }

    // Regular user permissions
    // Can read public resources
    builder.can('read', 'Post');
    builder.can('read', 'User');

    // Can manage their own resources
    builder.can('create', 'Post');
    builder.can('update', 'Post', { authorId: user.userId });
    builder.can('delete', 'Post', { authorId: user.userId });

    builder.can('create', 'Comment');
    builder.can('update', 'Comment', { authorId: user.userId });
    builder.can('delete', 'Comment', { authorId: user.userId });

    // Can update own profile
    builder.can('update', 'User', { id: user.userId });
  });
};

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create middleware that attaches ability to request
 *
 * @example
 * // In server setup
 * app.addHook('preHandler', attachAbility(myAbilityFactory));
 *
 * // In route handler
 * const ability = req.ability;
 * if (ability.cannot('delete', 'Post', post)) {
 *   throw new ForbiddenError('Cannot delete this post');
 * }
 */
export function attachAbility(
  factory: AbilityFactory = defaultAbilityFactory,
): preHandlerHookHandler {
  return (request: FastifyRequest): void => {
    // If no user is authenticated, create empty ability
    if (!request.user) {
      request.ability = createEmptyAbility();
      return;
    }

    // Create ability based on user
    const user: AbilityUser = {
      userId: request.user.userId,
      email: request.user.email,
      role: request.user.role as UserRole,
    };

    request.ability = factory(user);
  };
}

/**
 * Create a guard middleware that checks a specific permission
 *
 * @example
 * app.get('/admin/users', {
 *   preHandler: [requireAuth, requireAbility('manage', 'User')],
 * }, handler);
 */
export function requireAbility(action: Action, subject: Subject): preHandlerHookHandler {
  return (request: FastifyRequest, reply: FastifyReply) => {
    const ability = request.ability;

    if (!ability) {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'No ability context available',
      });
      return;
    }

    if (ability.cannot(action, subject)) {
      reply.status(403).send({
        error: 'Forbidden',
        message: `You are not allowed to ${action} ${subject}`,
      });
      return;
    }
  };
}

/**
 * Helper to check ability within a handler
 * Throws ForbiddenError if not allowed
 *
 * @example
 * async function deletePost(req, reply) {
 *   const post = await db.getPost(id);
 *   assertAbility(req, 'delete', 'Post', post);
 *   await db.deletePost(id);
 * }
 */
export function assertAbility(
  request: FastifyRequest,
  action: Action,
  subject: Subject,
  instance?: Record<string, unknown>,
): void {
  const ability = request.ability;

  if (!ability || ability.cannot(action, subject, instance)) {
    const error = new Error(`Forbidden: Cannot ${action} ${subject}`) as Error & {
      statusCode: number;
    };
    error.statusCode = 403;
    throw error;
  }
}
