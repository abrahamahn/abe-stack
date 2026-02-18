// main/server/core/src/tenants/middleware/workspace-scope.ts
/**
 * Workspace Scope Middleware
 *
 * Fastify preHandler that extracts `x-workspace-id` from request headers,
 * validates the user's membership in that workspace, and attaches a
 * validated WorkspaceContext to the request.
 *
 * @module middleware/workspace-scope
 */

import {
  can,
  ERROR_MESSAGES,
  ForbiddenError,
  HTTP_STATUS,
  ROLE_LEVELS,
  WORKSPACE_ID_HEADER,
} from '@bslt/shared';

import type {
  AuthContext,
  PolicyAction,
  PolicyResource,
  TenantRole,
  WorkspaceContext,
} from '@bslt/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Repositories } from '../../../../db/src';

// ============================================================================
// Types
// ============================================================================

/** Extended request with workspace context */
export interface WorkspaceScopedRequest extends FastifyRequest {
  workspaceContext?: WorkspaceContext | undefined;
}

/** Options for workspace scope middleware */
interface WorkspaceScopeOptions {
  /** Repository access for membership lookups */
  repos: Repositories;
  /** Whether the workspace header is required (default: true) */
  required?: boolean | undefined;
}

/** Options for workspace role guard */
interface WorkspaceRoleGuardOptions {
  /** Minimum role required */
  requiredRole: TenantRole;
}

/** Options for permission guard */
interface PermissionGuardOptions {
  /** Action to check */
  action: PolicyAction;
  /** Resource to check */
  resource: PolicyResource;
  /** Whether the user is the owner of the specific resource (default: false) */
  isOwner?: ((request: FastifyRequest) => boolean) | undefined;
}

// ============================================================================
// Middleware Factories
// ============================================================================

/**
 * Create a preHandler hook that extracts and validates workspace scope.
 *
 * Reads `x-workspace-id` from request headers, verifies the authenticated
 * user is a member of that workspace, and attaches the workspace context
 * (including role) to the request.
 *
 * @param options - Middleware configuration
 * @returns Fastify preHandler hook
 */
export function createWorkspaceScopeMiddleware(options: WorkspaceScopeOptions) {
  const { repos, required = true } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const workspaceId = request.headers[WORKSPACE_ID_HEADER];

    // If no workspace header, either skip or reject based on `required`
    if (typeof workspaceId !== 'string' || workspaceId === '') {
      if (required) {
        reply.code(HTTP_STATUS.BAD_REQUEST).send({
          message: 'Missing x-workspace-id header',
          code: 'WORKSPACE_REQUIRED',
        });
        return;
      }
      // Optional: skip without attaching context
      return;
    }

    // Get authenticated user from request
    const user = (request as WorkspaceScopedRequest & { user?: { userId: string } }).user;
    if (user?.userId === undefined) {
      reply
        .code(HTTP_STATUS.UNAUTHORIZED)
        .send({ message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED });
      return;
    }

    // Validate membership
    const membership = await repos.memberships.findByTenantAndUser(workspaceId, user.userId);
    if (membership === null) {
      reply.code(HTTP_STATUS.FORBIDDEN).send({
        message: 'You are not a member of this workspace',
        code: 'NOT_MEMBER',
      });
      return;
    }

    // Attach validated workspace context to request
    const scopedRequest = request as WorkspaceScopedRequest;
    scopedRequest.workspaceContext = {
      workspaceId,
      userId: user.userId,
      role: membership.role,
    };
  };
}

/**
 * Create a preHandler hook that enforces a minimum workspace role.
 *
 * Must be used AFTER `createWorkspaceScopeMiddleware` in the hook chain
 * so that `workspaceContext` is already attached.
 *
 * @param options - Role guard configuration
 * @returns Fastify preHandler hook
 */
export function createWorkspaceRoleGuard(options: WorkspaceRoleGuardOptions) {
  const requiredLevel = ROLE_LEVELS[options.requiredRole];

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const scopedRequest = request as WorkspaceScopedRequest;
    const ctx = scopedRequest.workspaceContext;

    if (ctx === undefined) {
      reply.code(HTTP_STATUS.BAD_REQUEST).send({
        message: 'Workspace scope required',
        code: 'WORKSPACE_REQUIRED',
      });
      return;
    }

    const currentRole: TenantRole = ctx.role ?? 'viewer';
    const currentLevel = ROLE_LEVELS[currentRole];

    if (currentLevel < requiredLevel) {
      reply.code(HTTP_STATUS.FORBIDDEN).send({
        message: `Requires at least ${options.requiredRole} role`,
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }
  };
}

/**
 * Create a preHandler hook that enforces a policy-based permission.
 *
 * Uses the centralized `can()` policy engine from @bslt/shared
 * to check if the user can perform the specified action on the resource.
 *
 * Must be used AFTER `createWorkspaceScopeMiddleware` in the hook chain.
 *
 * @param options - Permission guard configuration
 * @returns Fastify preHandler hook
 */
export function createPermissionGuard(options: PermissionGuardOptions) {
  const { action, resource, isOwner } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authCtx = buildAuthContext(request, isOwner);

    if (!can(authCtx, action, resource)) {
      reply.code(HTTP_STATUS.FORBIDDEN).send({
        message: `You do not have permission to ${action} this ${resource}`,
        code: 'PERMISSION_DENIED',
      });
    }
  };
}

// ============================================================================
// Auth Context Builder
// ============================================================================

/**
 * Build an AuthContext from a Fastify request.
 *
 * Combines the user's app role with their workspace role (from workspace context)
 * and optional resource ownership into a single authorization context for the
 * `can()` policy engine.
 *
 * @param request - Fastify request with optional workspace context
 * @param isOwner - Optional function to determine resource ownership
 * @returns AuthContext for the can() policy engine
 */
export function buildAuthContext(
  request: FastifyRequest,
  isOwner?: (request: FastifyRequest) => boolean,
): AuthContext {
  const user = (request as WorkspaceScopedRequest & { user?: { userId: string; role?: string } })
    .user;
  const workspaceCtx = getRequestWorkspaceContext(request);

  const appRole = user?.role ?? 'user';
  const tenantRole: TenantRole | undefined =
    workspaceCtx?.role !== undefined ? (workspaceCtx.role as TenantRole) : undefined;
  const ownerFlag = isOwner !== undefined ? isOwner(request) : undefined;

  const ctx: AuthContext = {
    appRole,
    tenantRole: tenantRole ?? null,
  };

  if (ownerFlag !== undefined) {
    ctx.isOwner = ownerFlag;
  }

  return ctx;
}

/**
 * Extract workspace context from a request.
 * Returns undefined if not scoped.
 *
 * @param request - Fastify request (must have been processed by workspace scope middleware)
 * @returns WorkspaceContext or undefined
 */
export function getRequestWorkspaceContext(request: FastifyRequest): WorkspaceContext | undefined {
  return (request as WorkspaceScopedRequest).workspaceContext;
}

/**
 * Extract and assert workspace context from a request.
 * Throws ForbiddenError if not scoped.
 *
 * @param request - Fastify request
 * @returns Validated WorkspaceContext
 * @throws ForbiddenError if workspace context is missing
 */
export function requireRequestWorkspaceContext(request: FastifyRequest): WorkspaceContext {
  const ctx = getRequestWorkspaceContext(request);
  if (ctx === undefined) {
    throw new ForbiddenError('Workspace scope required for this operation', 'WORKSPACE_REQUIRED');
  }
  return ctx;
}
