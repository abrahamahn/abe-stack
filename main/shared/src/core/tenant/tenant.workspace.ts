// main/shared/src/core/tenant/tenant.workspace.ts

/**
 * @file Workspace/Tenant Scoping Types
 * @description Types and helpers for multi-tenant workspace scoping.
 * @module Core/Tenant
 */

import { ForbiddenError } from '../../system/errors';

// ============================================================================
// Types
// ============================================================================

/**
 * Workspace context for scoped operations.
 * Required for repository functions that operate on tenant-scoped data.
 */
export interface WorkspaceContext {
  /** Workspace/Tenant identifier */
  workspaceId: string;
  /** Acting user ID within the workspace */
  userId: string;
  /** User's role within this workspace */
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

/**
 * Optional workspace context for operations that may or may not be scoped.
 */
export type MaybeWorkspaceContext = Partial<WorkspaceContext>;

// ============================================================================
// Guards
// ============================================================================

/**
 * Assert that a workspace context has all required fields.
 * Throws ForbiddenError if workspaceId is missing.
 *
 * @param context - Potentially partial workspace context
 * @param message - Custom error message
 * @throws ForbiddenError if workspaceId or userId is missing
 * @complexity O(1)
 */
export function assertWorkspaceScope(
  context: MaybeWorkspaceContext | undefined,
  message = 'Workspace scope required for this operation',
): asserts context is WorkspaceContext {
  if (context?.workspaceId === undefined || context.workspaceId === '') {
    throw new ForbiddenError(message, 'WORKSPACE_REQUIRED');
  }
  if (context.userId === undefined || context.userId === '') {
    throw new ForbiddenError('User context required for workspace operation', 'USER_REQUIRED');
  }
}

/**
 * Create a workspace-scoped context from request data.
 * Validates that workspaceId is present before returning.
 *
 * @param workspaceId - Workspace identifier
 * @param userId - Acting user identifier
 * @param role - Optional role within workspace
 * @returns Validated WorkspaceContext
 * @throws ForbiddenError if workspaceId or userId is missing
 * @complexity O(1)
 */
export function createWorkspaceContext(
  workspaceId: string | undefined,
  userId: string | undefined,
  role?: WorkspaceContext['role'],
): WorkspaceContext {
  if (workspaceId === undefined || workspaceId === '') {
    throw new ForbiddenError('Workspace scope required for this operation', 'WORKSPACE_REQUIRED');
  }
  if (userId === undefined || userId === '') {
    throw new ForbiddenError('User context required for workspace operation', 'USER_REQUIRED');
  }
  const context: WorkspaceContext = { workspaceId, userId };
  if (role !== undefined) context.role = role;
  return context;
}

/**
 * Type guard to check if context is workspace-scoped.
 *
 * @param context - Potentially partial workspace context
 * @returns True if context has both workspaceId and userId
 * @complexity O(1)
 */
export function isWorkspaceScoped(
  context: MaybeWorkspaceContext | undefined,
): context is WorkspaceContext {
  return (
    context?.workspaceId !== undefined &&
    context.workspaceId !== '' &&
    context.userId !== undefined &&
    context.userId !== ''
  );
}
