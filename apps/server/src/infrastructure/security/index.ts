// apps/server/src/infrastructure/security/index.ts
/**
 * Security Infrastructure Layer
 *
 * Technical security capabilities:
 * - crypto: Native JWT implementation (HS256)
 * - permissions: Row-level permissions for realtime features
 * - rate-limit: Token bucket rate limiter
 */

// Crypto (JWT)
export {
  jwtDecode,
  JwtError,
  jwtSign,
  jwtVerify,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtSignOptions,
} from './crypto';

// JWT Rotation Support
export {
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation,
  type JwtRotationConfig,
  type RotatingJwtOptions,
} from './crypto';

// Permissions
export {
  allowed,
  createAdminRule,
  createCustomRule,
  createDefaultPermissionConfig,
  createMemberRule,
  createOwnerRule,
  createPermissionChecker,
  createPermissionMiddleware,
  createStandalonePermissionGuard,
  denied,
  getPermissionDenialReason,
  getRecordIdFromParams,
  getRecordKey,
  hasPermission,
  isAllowed,
  isDenied,
  parseRecordKey,
  PermissionChecker,
  PERMISSION_TYPES,
  type BatchRecordLoader,
  type CustomRule,
  type MembershipRule,
  type OwnershipRule,
  type PermissionAllowed,
  type PermissionCheck,
  type PermissionCheckerOptions,
  type PermissionConfig,
  type PermissionContext,
  type PermissionDenied,
  type PermissionGuardOptions,
  type PermissionMiddlewareOptions,
  type PermissionRecord,
  type PermissionResult,
  type PermissionRule,
  type PermissionRuleBase,
  type PermissionRuleType,
  type PermissionType,
  type PreHandlerHook,
  type RecordLoader,
  type RecordPointer,
  type RoleRule,
  type TablePermissionConfig,
} from './permissions';

// Rate Limiting
export {
  createRateLimiter,
  MemoryStore,
  RateLimiter,
  RateLimitPresets,
  type MemoryStoreStats,
  type RateLimitConfig,
  type RateLimiterStats,
  type RateLimitInfo,
} from './rate-limit';
