// backend/server/src/infra/security/index.ts
/**
 * Security infrastructure
 * Consolidates JWT, password hashing, and account protection
 */

import type { DbClient } from '@db';
import type { UserRole } from '@abe-stack/shared';

import type { AuthConfig } from '../config/auth';
import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
  type TokenPayload,
} from './jwt';
import { hashPassword, verifyPassword, verifyPasswordSafe, needsRehash } from './password';
import {
  logLoginAttempt,
  isAccountLocked,
  getProgressiveDelay,
  applyProgressiveDelay,
  getAccountLockoutStatus,
  unlockAccount,
  type LockoutStatus,
} from './account-lockout';

export type { TokenPayload } from './jwt';
export type { LockoutStatus } from './account-lockout';

/**
 * Security service interface
 * Provides all security-related functionality through a single API
 */
export interface SecurityService {
  // JWT operations
  createAccessToken(userId: string, email: string, role: UserRole): string;
  createRefreshToken(): string;
  verifyToken(token: string): TokenPayload;
  getRefreshTokenExpiry(): Date;

  // Password operations
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  verifyPasswordSafe(password: string, hash: string | null | undefined): Promise<boolean>;
  needsRehash(hash: string): boolean;

  // Account lockout operations (require db)
  logLoginAttempt(
    db: DbClient,
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string,
  ): Promise<void>;
  isAccountLocked(db: DbClient, email: string): Promise<boolean>;
  getProgressiveDelay(db: DbClient, email: string): Promise<number>;
  applyProgressiveDelay(db: DbClient, email: string): Promise<void>;
  getAccountLockoutStatus(db: DbClient, email: string): Promise<LockoutStatus>;
  unlockAccount(
    db: DbClient,
    email: string,
    adminUserId: string,
    logSecurityEvent: (
      userId: string,
      email: string,
      adminUserId: string,
      ipAddress?: string,
      userAgent?: string,
    ) => Promise<void>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void>;
}

/**
 * Create security service with the provided auth config
 */
export function createSecurityService(authConfig: AuthConfig): SecurityService {
  return {
    // JWT operations - bound to authConfig
    createAccessToken: (userId: string, email: string, role: UserRole) =>
      createAccessToken(authConfig, userId, email, role),
    createRefreshToken,
    verifyToken,
    getRefreshTokenExpiry: () => getRefreshTokenExpiry(authConfig),

    // Password operations - bound to authConfig
    hashPassword: (password: string) => hashPassword(authConfig, password),
    verifyPassword,
    verifyPasswordSafe,
    needsRehash: (hash: string) => needsRehash(authConfig, hash),

    // Account lockout operations - bound to authConfig
    logLoginAttempt,
    isAccountLocked: (db: DbClient, email: string) => isAccountLocked(db, authConfig, email),
    getProgressiveDelay: (db: DbClient, email: string) =>
      getProgressiveDelay(db, authConfig, email),
    applyProgressiveDelay: (db: DbClient, email: string) =>
      applyProgressiveDelay(db, authConfig, email),
    getAccountLockoutStatus: (db: DbClient, email: string) =>
      getAccountLockoutStatus(db, authConfig, email),
    unlockAccount,
  };
}

// Re-export individual functions for direct use during migration
export {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
  hashPassword,
  verifyPassword,
  verifyPasswordSafe,
  needsRehash,
  logLoginAttempt,
  isAccountLocked,
  getProgressiveDelay,
  applyProgressiveDelay,
  getAccountLockoutStatus,
  unlockAccount,
};
