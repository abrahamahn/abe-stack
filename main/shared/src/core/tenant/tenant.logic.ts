// main/shared/src/domain/tenant/tenant.logic.ts

/**
 * @file Tenant Domain Logic
 * @description Multi-tenant scoping logic, context guards, and workspace utilities.
 * @module Core/Tenant
 */

import { ERROR_CODES } from '../constants';

// ============================================================================
// Constants
// ============================================================================

export const WORKSPACE_ID_HEADER = 'x-workspace-id';
export const WORKSPACE_ROLE_HEADER = 'x-workspace-role';

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
  role?: 'owner' | 'admin' | 'member' | 'viewer' | undefined;
}

/**
 * Optional workspace context for operations that may or may not be scoped.
 */
export type MaybeWorkspaceContext = Partial<WorkspaceContext>;

// ============================================================================
// Custom Error (Simplified replacement for ForbiddenError)
// ============================================================================

export class ScopeError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'ScopeError';
  }
}

// ============================================================================
// Guards
// ============================================================================

/**
 * Assert that a workspace context has all required fields.
 * Throws ScopeError if workspaceId is missing.
 */
export function assertWorkspaceScope(
  context: MaybeWorkspaceContext | undefined,
  message = 'Workspace scope required for this operation',
): asserts context is WorkspaceContext {
  if (context?.workspaceId === undefined || context.workspaceId === '') {
    throw new ScopeError(message, ERROR_CODES.FORBIDDEN);
  }
  if (context.userId === undefined || context.userId === '') {
    throw new ScopeError('User context required for workspace operation', ERROR_CODES.UNAUTHORIZED);
  }
}

/**
 * Create a workspace-scoped context from request data.
 */
export function createWorkspaceContext(
  workspaceId: string | undefined,
  userId: string | undefined,
  role?: WorkspaceContext['role'],
): WorkspaceContext {
  if (workspaceId === undefined || workspaceId === '') {
    throw new ScopeError('Workspace scope required for this operation', ERROR_CODES.FORBIDDEN);
  }
  if (userId === undefined || userId === '') {
    throw new ScopeError('User context required for workspace operation', ERROR_CODES.UNAUTHORIZED);
  }
  const context: WorkspaceContext = { workspaceId, userId };
  if (role !== undefined) context.role = role;
  return context;
}

/**
 * Type guard to check if context is workspace-scoped.
 */
export function isWorkspaceScoped(
  context: MaybeWorkspaceContext | undefined,
): context is WorkspaceContext {
  return (
    context?.workspaceId !== undefined && context.workspaceId !== '' && context.userId !== undefined
  );
}

/**
 * Workspace role hierarchy for permission checks.
 */
const ROLE_HIERARCHY: Record<NonNullable<WorkspaceContext['role']>, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Get workspace context from request headers/user.
 */
export function getWorkspaceContext(
  user: { userId: string } | undefined,
  headers: Record<string, string | string[] | undefined>,
): WorkspaceContext | undefined {
  if (user === undefined) return undefined;

  const workspaceId = headers[WORKSPACE_ID_HEADER];
  const role = headers[WORKSPACE_ROLE_HEADER] as WorkspaceContext['role'];

  if (typeof workspaceId !== 'string' || workspaceId === '') return undefined;

  return {
    workspaceId,
    userId: user.userId,
    role: role ?? 'member',
  };
}

/**
 * Check if the user has at least the required role in the workspace.
 */
export function hasRequiredWorkspaceRole(
  context: WorkspaceContext,
  requiredRole: NonNullable<WorkspaceContext['role']>,
): boolean {
  const currentRole = context.role ?? 'member';
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if the user is an admin or owner of the workspace.
 */
export function isAdmin(context: WorkspaceContext): boolean {
  return hasRequiredWorkspaceRole(context, 'admin');
}

/**
 * Check if the user is the owner of the workspace.
 */
export function isOwner(context: WorkspaceContext): boolean {
  return hasRequiredWorkspaceRole(context, 'owner');
}
