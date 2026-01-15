// apps/server/src/infra/rbac/index.ts
/**
 * Role-Based Access Control (RBAC) with Attribute-Based Access Control (ABAC)
 *
 * A custom, lightweight permission system without external dependencies.
 *
 * Features:
 * - Action-based permissions (create, read, update, delete, manage)
 * - Subject/entity-based permissions (Post, User, etc.)
 * - Attribute-based conditions (authorId: user.id)
 * - Fastify middleware integration
 *
 * @example
 * // Define abilities
 * const ability = defineAbility((builder) => {
 *   if (user.role === 'admin') {
 *     builder.can('manage', 'all');
 *   }
 *   builder.can('read', 'Post');
 *   builder.can('update', 'Post', { authorId: user.id });
 * });
 *
 * // Check permissions
 * if (ability.can('update', 'Post', { authorId: post.authorId })) {
 *   // User can update this post
 * }
 *
 * // Use as middleware
 * app.get('/admin', { preHandler: requireAbility('manage', 'User') }, handler);
 */

// Core ability system
export { Ability, defineAbility, createEmptyAbility, createAdminAbility } from './ability';

export type { Action, Subject, Condition, Rule, AbilityBuilder, AbilityDefiner } from './ability';

// Middleware
export { attachAbility, requireAbility, assertAbility, defaultAbilityFactory } from './middleware';

export type { AbilityUser, AbilityFactory } from './middleware';
