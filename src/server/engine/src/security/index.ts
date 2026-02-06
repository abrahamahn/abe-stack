// backend/engine/src/security/index.ts
/**
 * Security Infrastructure Package
 *
 * Technical security capabilities:
 * - crypto: JWT rotation support for secret key rotation
 * - token: CSRF token generation, signing, encryption, and validation
 * - permissions: Row-level permissions for realtime features
 * - rate-limit: Token bucket rate limiter
 *
 * Note: Fastify-specific permission middleware has been moved to
 * apps/server/src/middleware/permissions/.
 */

// ============================================================================
// Crypto (JWT Rotation)
// ============================================================================

export {
  JwtError,
  checkTokenSecret,
  createJwtRotationHandler,
  decode,
  sign,
  signWithRotation,
  verify,
  verifyWithRotation,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtRotationConfig,
  type JwtRotationHandler,
  type RotatingJwtOptions,
  type SignOptions,
} from './crypto';

// ============================================================================
// Token (CSRF generation, signing, encryption, validation)
// ============================================================================

export {
  TOKEN_LENGTH,
  decryptToken,
  encryptToken,
  generateToken,
  signToken,
  validateCsrfToken,
  verifyToken,
  type CsrfValidationOptions,
} from './token';

// ============================================================================
// Permissions (checker and types only — middleware is in apps/server)
// ============================================================================

export {
  PERMISSION_TYPES,
  PermissionChecker,
  allowed,
  createAdminRule,
  createCustomRule,
  createDefaultPermissionConfig,
  createMemberRule,
  createOwnerRule,
  createPermissionChecker,
  denied,
  getRecordKey,
  isAllowed,
  isDenied,
  parseRecordKey,
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
} from './permissions';

// ============================================================================
// Rate Limiting
// ============================================================================

export {
  MemoryStore,
  RateLimitPresets,
  RateLimiter,
  createRateLimiter,
  type MemoryStoreConfig,
  type MemoryStoreStats,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimiterStats,
} from './rate-limit';
