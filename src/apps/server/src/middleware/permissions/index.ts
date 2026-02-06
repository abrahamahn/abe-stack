// apps/server/src/middleware/permissions/index.ts
/**
 * Permission Middleware
 *
 * Fastify-specific permission guards for route-level access control.
 * Uses the permission checker from @abe-stack/server-engine.
 */

export {
  createPermissionMiddleware,
  createStandalonePermissionGuard,
  getPermissionDenialReason,
  getRecordIdFromParams,
  hasPermission,
  type PermissionGuardOptions,
  type PermissionMiddlewareOptions,
  type PreHandlerHook,
} from './middleware';
