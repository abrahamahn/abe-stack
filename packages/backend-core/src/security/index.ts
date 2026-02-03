// infra/src/security/index.ts
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
    JwtError, checkTokenSecret,
    createJwtRotationHandler,
    decode, sign,
    signWithRotation,
    verify,
    verifyWithRotation,
    type JwtErrorCode,
    type JwtHeader,
    type JwtPayload,
    type JwtRotationConfig,
    type JwtRotationHandler,
    type RotatingJwtOptions,
    type SignOptions
} from './crypto';

// ============================================================================
// Permissions
// ============================================================================

export {
    PERMISSION_TYPES, PermissionChecker,
    // Types & helpers
    allowed,
    // Checker
    createAdminRule,
    createCustomRule,
    createDefaultPermissionConfig,
    createMemberRule,
    createOwnerRule,
    createPermissionChecker,
    // Middleware
    createPermissionMiddleware,
    createStandalonePermissionGuard, denied, getPermissionDenialReason,
    getRecordIdFromParams, getRecordKey, hasPermission, isAllowed,
    isDenied,
    parseRecordKey, type BatchRecordLoader,
    type CustomRule,
    type MembershipRule,
    type OwnershipRule,
    type PermissionAllowed,
    type PermissionCheck, type PermissionCheckerOptions, type PermissionConfig,
    type PermissionContext,
    type PermissionDenied, type PermissionGuardOptions,
    type PermissionMiddlewareOptions, type PermissionRecord,
    type PermissionResult,
    type PermissionRule,
    type PermissionRuleBase,
    type PermissionRuleType,
    type PermissionType, type PreHandlerHook, type RecordLoader,
    type RecordPointer,
    type RoleRule,
    type TablePermissionConfig
} from './permissions';

// ============================================================================
// Rate Limiting
// ============================================================================

export {
    MemoryStore, RateLimitPresets, RateLimiter, createRateLimiter, type MemoryStoreConfig,
    type MemoryStoreStats,
    type RateLimitConfig, type RateLimitInfo, type RateLimiterStats
} from './rate-limit';

