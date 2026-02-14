// main/server/core/src/tenants/middleware/index.ts

export {
  buildAuthContext,
  createPermissionGuard,
  createWorkspaceRoleGuard,
  createWorkspaceScopeMiddleware,
  getRequestWorkspaceContext,
  requireRequestWorkspaceContext,
  type WorkspaceScopedRequest,
} from './workspace-scope';
