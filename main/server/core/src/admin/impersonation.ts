// main/server/core/src/admin/impersonation.ts
/**
 * Admin Impersonation Service
 *
 * Allows admin/support to impersonate a specific user for debugging.
 * Issues a scoped JWT token with impersonator and target user info.
 *
 * Safety guards:
 * - Cannot impersonate other admins
 * - Cannot impersonate self
 * - Rate limited per admin per hour
 * - Short-lived tokens (30 min default)
 */

import { AUTH_EXPIRY, ForbiddenError, QUOTAS, TooManyRequestsError } from '@bslt/shared';

import { sign as jwtSign, verify as jwtVerify } from '../../../system/src';

import type { AdminUser, AppRole } from '@bslt/shared';
import type { UserRepository } from '../../../db/src';

// ============================================================================
// Constants
// ============================================================================

/** Default TTL for impersonation tokens in minutes */
const DEFAULT_TTL_MINUTES = AUTH_EXPIRY.IMPERSONATION_MINUTES;

/** Default max impersonations per admin per hour */
const DEFAULT_MAX_PER_HOUR = QUOTAS.IMPERSONATION_MAX_PER_HOUR;

/** Token type claim for impersonation tokens */
const IMPERSONATION_TOKEN_TYPE = 'impersonation';

// ============================================================================
// Types
// ============================================================================

/** Configuration for the impersonation service */
export interface ImpersonationConfig {
  /** JWT signing secret (min 32 chars) */
  readonly jwtSecret: string;
  /** Token TTL in minutes (default: 30) */
  readonly ttlMinutes?: number | undefined;
  /** Max impersonations per admin per hour (default: 5) */
  readonly maxPerHour?: number | undefined;
}

/** Result of starting an impersonation session */
export interface ImpersonationStartResult {
  /** Scoped JWT token for impersonation */
  token: string;
  /** Token expiration timestamp (ISO 8601) */
  expiresAt: string;
  /** Target user info */
  targetUser: AdminUser;
}

/** Result of ending an impersonation session */
export interface ImpersonationEndResult {
  /** Human-readable message */
  message: string;
}

/** Decoded impersonation token payload */
export interface ImpersonationTokenPayload {
  /** Admin user who initiated the impersonation */
  impersonatorId: string;
  /** User being impersonated */
  targetUserId: string;
}

/** Repositories required by the impersonation service */
export interface ImpersonationRepositories {
  readonly users: UserRepository;
}

/** Audit event logger function */
export interface ImpersonationAuditLogger {
  (event: {
    actorId: string;
    action: string;
    resource: string;
    resourceId: string;
    category: 'security';
    severity: 'warn';
    metadata: Record<string, unknown>;
  }): Promise<void>;
}

// ============================================================================
// Errors
// ============================================================================

/** Error thrown when the target user cannot be impersonated */
export class ImpersonationForbiddenError extends ForbiddenError {
  constructor(message: string) {
    super(message, 'IMPERSONATION_FORBIDDEN');
  }
}

/** Error thrown when the rate limit is exceeded */
export class ImpersonationRateLimitError extends TooManyRequestsError {
  constructor(message: string) {
    super(message, 'IMPERSONATION_RATE_LIMITED');
  }
}

// ============================================================================
// Rate Limiting (In-Memory)
// ============================================================================

/** Rate limit tracking entry */
interface RateLimitEntry {
  timestamps: number[];
}

/** In-memory rate limit store keyed by admin user ID */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check and record a rate limit event for an admin user.
 * Returns true if the action is allowed, false if rate-limited.
 */
function checkRateLimit(adminUserId: string, maxPerHour: number): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const cutoff = now - windowMs;

  let entry = rateLimitStore.get(adminUserId);
  if (entry === undefined) {
    entry = { timestamps: [] };
    rateLimitStore.set(adminUserId, entry);
  }

  // Prune old entries
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  if (entry.timestamps.length >= maxPerHour) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}

/**
 * Reset rate limit store. Exposed for testing only.
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

// ============================================================================
// Helper: Convert DB user to AdminUser
// ============================================================================

/**
 * Convert a database user to the AdminUser API format.
 * Duplicated here to avoid circular imports with userService.
 */
function toAdminUser(user: {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  lockedUntil: Date | null;
  lockReason: string | null;
  failedLoginAttempts: number;
  phone: string | null;
  phoneVerified: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    lockReason: user.lockReason ?? null,
    failedLoginAttempts: user.failedLoginAttempts,
    phone: user.phone ?? null,
    phoneVerified: user.phoneVerified ?? false,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Start an impersonation session.
 *
 * Validates the admin has the admin role, the target is not an admin,
 * the admin is not impersonating themselves, and rate limits are respected.
 * Generates a scoped JWT with short TTL and logs an audit event.
 *
 * @param repos - Repository layer with user access
 * @param adminUserId - ID of the admin initiating impersonation
 * @param targetUserId - ID of the user to impersonate
 * @param config - Impersonation configuration (JWT secret, TTL, rate limit)
 * @param logAuditEvent - Audit event logger
 * @returns Impersonation start result with token and target user info
 * @throws {ImpersonationForbiddenError} If the action is not allowed
 * @throws {ImpersonationRateLimitError} If the rate limit is exceeded
 */
export async function startImpersonation(
  repos: ImpersonationRepositories,
  adminUserId: string,
  targetUserId: string,
  config: ImpersonationConfig,
  logAuditEvent: ImpersonationAuditLogger,
): Promise<ImpersonationStartResult> {
  // Safety: cannot impersonate self
  if (adminUserId === targetUserId) {
    throw new ImpersonationForbiddenError('Cannot impersonate yourself');
  }

  // Validate admin exists and has admin role
  const adminUser = await repos.users.findById(adminUserId);
  if (adminUser === null) {
    throw new ImpersonationForbiddenError('Admin user not found');
  }
  if (adminUser.role !== 'admin') {
    throw new ImpersonationForbiddenError('Only admins can impersonate users');
  }

  // Validate target exists
  const targetUser = await repos.users.findById(targetUserId);
  if (targetUser === null) {
    throw new ImpersonationForbiddenError('Target user not found');
  }

  // Safety: cannot impersonate other admins
  if (targetUser.role === 'admin') {
    throw new ImpersonationForbiddenError('Cannot impersonate admin users');
  }

  // Rate limit check
  const maxPerHour = config.maxPerHour ?? DEFAULT_MAX_PER_HOUR;
  if (!checkRateLimit(adminUserId, maxPerHour)) {
    throw new ImpersonationRateLimitError(
      `Rate limit exceeded: max ${String(maxPerHour)} impersonations per hour`,
    );
  }

  // Generate scoped JWT
  const ttlMinutes = config.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  const expiresIn = `${String(ttlMinutes)}m`;

  const token = jwtSign(
    {
      type: IMPERSONATION_TOKEN_TYPE,
      impersonatorId: adminUserId,
      targetUserId,
    },
    config.jwtSecret,
    { expiresIn },
  );

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  // Log audit event
  await logAuditEvent({
    actorId: adminUserId,
    action: 'admin_impersonation_start',
    resource: 'user',
    resourceId: targetUserId,
    category: 'security',
    severity: 'warn',
    metadata: {
      targetEmail: targetUser.email,
      ttlMinutes,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
    targetUser: toAdminUser(targetUser),
  };
}

/**
 * End an impersonation session.
 *
 * Logs an audit event indicating the impersonation has ended.
 * The token itself will expire naturally, but this allows explicit cleanup
 * and creates an audit trail.
 *
 * @param adminUserId - ID of the admin ending the impersonation
 * @param targetUserId - ID of the user that was being impersonated
 * @param logAuditEvent - Audit event logger
 * @returns End result with confirmation message
 */
export async function endImpersonation(
  adminUserId: string,
  targetUserId: string,
  logAuditEvent: ImpersonationAuditLogger,
): Promise<ImpersonationEndResult> {
  await logAuditEvent({
    actorId: adminUserId,
    action: 'admin_impersonation_end',
    resource: 'user',
    resourceId: targetUserId,
    category: 'security',
    severity: 'warn',
    metadata: {
      endedAt: new Date().toISOString(),
    },
  });

  return {
    message: 'Impersonation session ended',
  };
}

/**
 * Validate an impersonation token.
 *
 * Verifies the JWT signature, checks expiry, and ensures the token
 * has the correct type claim.
 *
 * @param token - JWT token to validate
 * @param config - Configuration with JWT secret
 * @returns Decoded payload with impersonator and target user IDs, or null if invalid
 */
export function validateImpersonationToken(
  token: string,
  config: Pick<ImpersonationConfig, 'jwtSecret'>,
): ImpersonationTokenPayload | null {
  try {
    const payload = jwtVerify(token, config.jwtSecret);

    if (
      payload['type'] !== IMPERSONATION_TOKEN_TYPE ||
      typeof payload['impersonatorId'] !== 'string' ||
      typeof payload['targetUserId'] !== 'string'
    ) {
      return null;
    }

    return {
      impersonatorId: payload['impersonatorId'],
      targetUserId: payload['targetUserId'],
    };
  } catch {
    return null;
  }
}
