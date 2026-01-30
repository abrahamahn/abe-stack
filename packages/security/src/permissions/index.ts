// packages/security/src/permissions/index.ts
/**
 * Permissions Module
 *
 * Row-level permission system for secure access control.
 * Supports ownership-based, membership-based, and role-based permissions.
 */

// Types
export {
  allowed,
  denied,
  getRecordKey,
  isAllowed,
  isDenied,
  parseRecordKey,
  PERMISSION_TYPES,
  type BatchRecordLoader,
  type CustomRule,
  type MembershipRule,
  type OwnershipRule,
  type PermissionAllowed,
  type PermissionCheck,
  type PermissionConfig,
  type PermissionContext,
  type PermissionDenied,
  type PermissionRecord,
  type PermissionResult,
  type PermissionRule,
  type PermissionRuleBase,
  type PermissionRuleType,
  type PermissionType,
  type RecordLoader,
  type RecordPointer,
  type RoleRule,
  type TablePermissionConfig,
} from './types';

// Checker
export {
  createAdminRule,
  createCustomRule,
  createDefaultPermissionConfig,
  createMemberRule,
  createOwnerRule,
  createPermissionChecker,
  PermissionChecker,
  type PermissionCheckerOptions,
} from './checker';

// Middleware
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
