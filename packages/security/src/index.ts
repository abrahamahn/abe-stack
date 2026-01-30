// packages/security/src/index.ts
/**
 * Security Infrastructure Package
 *
 * Technical security capabilities:
 * - crypto: JWT rotation support for secret key rotation
 * - permissions: Row-level permissions for realtime features
 * - rate-limit: Token bucket rate limiter
 */

// ============================================================================
// Crypto (JWT Rotation)
// ============================================================================

export {
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation,
  type JwtRotationConfig,
  type JwtRotationHandler,
  type RotatingJwtOptions,
} from './crypto';

// ============================================================================
// Permissions
// ============================================================================

export {
  // Types & helpers
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
  // Checker
  createAdminRule,
  createCustomRule,
  createDefaultPermissionConfig,
  createMemberRule,
  createOwnerRule,
  createPermissionChecker,
  PermissionChecker,
  type PermissionCheckerOptions,
  // Middleware
  createPermissionMiddleware,
  createStandalonePermissionGuard,
  getPermissionDenialReason,
  getRecordIdFromParams,
  hasPermission,
  type PermissionGuardOptions,
  type PermissionMiddlewareOptions,
  type PreHandlerHook,
} from './permissions';

// ============================================================================
// Rate Limiting
// ============================================================================

export {
  createRateLimiter,
  MemoryStore,
  RateLimiter,
  RateLimitPresets,
  type MemoryStoreConfig,
  type MemoryStoreStats,
  type RateLimitConfig,
  type RateLimiterStats,
  type RateLimitInfo,
} from './rate-limit';
