// apps/server/src/infrastructure/data/database/schema/__tests__/auth.test.ts
import { getTableName } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';

import {
  emailVerificationTokens,
  loginAttempts,
  passwordResetTokens,
  refreshTokenFamilies,
  securityEvents,
} from '../auth';

// ============================================================================
// Tests: refreshTokenFamilies schema
// ============================================================================

describe('refreshTokenFamilies schema', () => {
  test('should have correct table name', () => {
    expect(getTableName(refreshTokenFamilies)).toBe('refresh_token_families');
  });

  test('should have id column as primary key', () => {
    const idColumn = refreshTokenFamilies.id;
    expect(idColumn.name).toBe('id');
    // Drizzle reports 'string' for uuid columns at runtime
    expect(idColumn.dataType).toBe('string');
    expect(idColumn.columnType).toBe('PgUUID');
    expect(idColumn.notNull).toBe(true);
    expect(idColumn.primary).toBe(true);
  });

  test('should have userId column with foreign key', () => {
    const userIdColumn = refreshTokenFamilies.userId;
    expect(userIdColumn.name).toBe('user_id');
    expect(userIdColumn.dataType).toBe('string');
    expect(userIdColumn.columnType).toBe('PgUUID');
    expect(userIdColumn.notNull).toBe(true);
  });

  test('should have createdAt column with default', () => {
    const createdAtColumn = refreshTokenFamilies.createdAt;
    expect(createdAtColumn.name).toBe('created_at');
    expect(createdAtColumn.dataType).toBe('date');
    expect(createdAtColumn.notNull).toBe(true);
    expect(createdAtColumn.hasDefault).toBe(true);
  });

  test('should have revokedAt column as nullable', () => {
    const revokedAtColumn = refreshTokenFamilies.revokedAt;
    expect(revokedAtColumn.name).toBe('revoked_at');
    expect(revokedAtColumn.dataType).toBe('date');
    expect(revokedAtColumn.notNull).toBe(false);
  });

  test('should have revokeReason column as nullable', () => {
    const revokeReasonColumn = refreshTokenFamilies.revokeReason;
    expect(revokeReasonColumn.name).toBe('revoke_reason');
    expect(revokeReasonColumn.dataType).toBe('string');
    expect(revokeReasonColumn.notNull).toBe(false);
  });
});

// ============================================================================
// Tests: loginAttempts schema
// ============================================================================

describe('loginAttempts schema', () => {
  test('should have correct table name', () => {
    expect(getTableName(loginAttempts)).toBe('login_attempts');
  });

  test('should have id column as primary key', () => {
    const idColumn = loginAttempts.id;
    expect(idColumn.name).toBe('id');
    expect(idColumn.dataType).toBe('string');
    expect(idColumn.columnType).toBe('PgUUID');
    expect(idColumn.primary).toBe(true);
  });

  test('should have email column as required', () => {
    const emailColumn = loginAttempts.email;
    expect(emailColumn.name).toBe('email');
    expect(emailColumn.dataType).toBe('string');
    expect(emailColumn.notNull).toBe(true);
  });

  test('should have ipAddress column as nullable', () => {
    const ipAddressColumn = loginAttempts.ipAddress;
    expect(ipAddressColumn.name).toBe('ip_address');
    expect(ipAddressColumn.notNull).toBe(false);
  });

  test('should have userAgent column as nullable', () => {
    const userAgentColumn = loginAttempts.userAgent;
    expect(userAgentColumn.name).toBe('user_agent');
    expect(userAgentColumn.dataType).toBe('string');
    expect(userAgentColumn.notNull).toBe(false);
  });

  test('should have success column as required boolean', () => {
    const successColumn = loginAttempts.success;
    expect(successColumn.name).toBe('success');
    expect(successColumn.dataType).toBe('boolean');
    expect(successColumn.notNull).toBe(true);
  });

  test('should have failureReason column as nullable', () => {
    const failureReasonColumn = loginAttempts.failureReason;
    expect(failureReasonColumn.name).toBe('failure_reason');
    expect(failureReasonColumn.dataType).toBe('string');
    expect(failureReasonColumn.notNull).toBe(false);
  });

  test('should have createdAt column with default', () => {
    const createdAtColumn = loginAttempts.createdAt;
    expect(createdAtColumn.name).toBe('created_at');
    expect(createdAtColumn.dataType).toBe('date');
    expect(createdAtColumn.notNull).toBe(true);
    expect(createdAtColumn.hasDefault).toBe(true);
  });
});

// ============================================================================
// Tests: passwordResetTokens schema
// ============================================================================

describe('passwordResetTokens schema', () => {
  test('should have correct table name', () => {
    expect(getTableName(passwordResetTokens)).toBe('password_reset_tokens');
  });

  test('should have id column as primary key', () => {
    const idColumn = passwordResetTokens.id;
    expect(idColumn.name).toBe('id');
    expect(idColumn.dataType).toBe('string');
    expect(idColumn.columnType).toBe('PgUUID');
    expect(idColumn.primary).toBe(true);
  });

  test('should have userId column with foreign key', () => {
    const userIdColumn = passwordResetTokens.userId;
    expect(userIdColumn.name).toBe('user_id');
    expect(userIdColumn.dataType).toBe('string');
    expect(userIdColumn.columnType).toBe('PgUUID');
    expect(userIdColumn.notNull).toBe(true);
  });

  test('should have tokenHash column as unique', () => {
    const tokenHashColumn = passwordResetTokens.tokenHash;
    expect(tokenHashColumn.name).toBe('token_hash');
    expect(tokenHashColumn.dataType).toBe('string');
    expect(tokenHashColumn.notNull).toBe(true);
    expect(tokenHashColumn.isUnique).toBe(true);
  });

  test('should have expiresAt column as required', () => {
    const expiresAtColumn = passwordResetTokens.expiresAt;
    expect(expiresAtColumn.name).toBe('expires_at');
    expect(expiresAtColumn.dataType).toBe('date');
    expect(expiresAtColumn.notNull).toBe(true);
  });

  test('should have usedAt column as nullable', () => {
    const usedAtColumn = passwordResetTokens.usedAt;
    expect(usedAtColumn.name).toBe('used_at');
    expect(usedAtColumn.dataType).toBe('date');
    expect(usedAtColumn.notNull).toBe(false);
  });

  test('should have createdAt column with default', () => {
    const createdAtColumn = passwordResetTokens.createdAt;
    expect(createdAtColumn.name).toBe('created_at');
    expect(createdAtColumn.notNull).toBe(true);
    expect(createdAtColumn.hasDefault).toBe(true);
  });
});

// ============================================================================
// Tests: emailVerificationTokens schema
// ============================================================================

describe('emailVerificationTokens schema', () => {
  test('should have correct table name', () => {
    expect(getTableName(emailVerificationTokens)).toBe('email_verification_tokens');
  });

  test('should have id column as primary key', () => {
    const idColumn = emailVerificationTokens.id;
    expect(idColumn.name).toBe('id');
    expect(idColumn.dataType).toBe('string');
    expect(idColumn.columnType).toBe('PgUUID');
    expect(idColumn.primary).toBe(true);
  });

  test('should have userId column with foreign key', () => {
    const userIdColumn = emailVerificationTokens.userId;
    expect(userIdColumn.name).toBe('user_id');
    expect(userIdColumn.dataType).toBe('string');
    expect(userIdColumn.columnType).toBe('PgUUID');
    expect(userIdColumn.notNull).toBe(true);
  });

  test('should have tokenHash column as unique', () => {
    const tokenHashColumn = emailVerificationTokens.tokenHash;
    expect(tokenHashColumn.name).toBe('token_hash');
    expect(tokenHashColumn.dataType).toBe('string');
    expect(tokenHashColumn.notNull).toBe(true);
    expect(tokenHashColumn.isUnique).toBe(true);
  });

  test('should have expiresAt column as required', () => {
    const expiresAtColumn = emailVerificationTokens.expiresAt;
    expect(expiresAtColumn.name).toBe('expires_at');
    expect(expiresAtColumn.dataType).toBe('date');
    expect(expiresAtColumn.notNull).toBe(true);
  });

  test('should have usedAt column as nullable', () => {
    const usedAtColumn = emailVerificationTokens.usedAt;
    expect(usedAtColumn.name).toBe('used_at');
    expect(usedAtColumn.dataType).toBe('date');
    expect(usedAtColumn.notNull).toBe(false);
  });

  test('should have createdAt column with default', () => {
    const createdAtColumn = emailVerificationTokens.createdAt;
    expect(createdAtColumn.name).toBe('created_at');
    expect(createdAtColumn.notNull).toBe(true);
    expect(createdAtColumn.hasDefault).toBe(true);
  });
});

// ============================================================================
// Tests: securityEvents schema
// ============================================================================

describe('securityEvents schema', () => {
  test('should have correct table name', () => {
    expect(getTableName(securityEvents)).toBe('security_events');
  });

  test('should have id column as primary key', () => {
    const idColumn = securityEvents.id;
    expect(idColumn.name).toBe('id');
    expect(idColumn.dataType).toBe('string');
    expect(idColumn.columnType).toBe('PgUUID');
    expect(idColumn.primary).toBe(true);
  });

  test('should have userId column as nullable (for user-less events)', () => {
    const userIdColumn = securityEvents.userId;
    expect(userIdColumn.name).toBe('user_id');
    expect(userIdColumn.dataType).toBe('string');
    expect(userIdColumn.columnType).toBe('PgUUID');
    expect(userIdColumn.notNull).toBe(false);
  });

  test('should have email column as nullable', () => {
    const emailColumn = securityEvents.email;
    expect(emailColumn.name).toBe('email');
    expect(emailColumn.dataType).toBe('string');
    expect(emailColumn.notNull).toBe(false);
  });

  test('should have eventType column as required', () => {
    const eventTypeColumn = securityEvents.eventType;
    expect(eventTypeColumn.name).toBe('event_type');
    expect(eventTypeColumn.dataType).toBe('string');
    expect(eventTypeColumn.notNull).toBe(true);
  });

  test('should have severity column as required', () => {
    const severityColumn = securityEvents.severity;
    expect(severityColumn.name).toBe('severity');
    expect(severityColumn.dataType).toBe('string');
    expect(severityColumn.notNull).toBe(true);
  });

  test('should have ipAddress column as nullable', () => {
    const ipAddressColumn = securityEvents.ipAddress;
    expect(ipAddressColumn.name).toBe('ip_address');
    expect(ipAddressColumn.notNull).toBe(false);
  });

  test('should have userAgent column as nullable', () => {
    const userAgentColumn = securityEvents.userAgent;
    expect(userAgentColumn.name).toBe('user_agent');
    expect(userAgentColumn.dataType).toBe('string');
    expect(userAgentColumn.notNull).toBe(false);
  });

  test('should have metadata column as nullable', () => {
    const metadataColumn = securityEvents.metadata;
    expect(metadataColumn.name).toBe('metadata');
    expect(metadataColumn.dataType).toBe('string');
    expect(metadataColumn.notNull).toBe(false);
  });

  test('should have createdAt column with default', () => {
    const createdAtColumn = securityEvents.createdAt;
    expect(createdAtColumn.name).toBe('created_at');
    expect(createdAtColumn.notNull).toBe(true);
    expect(createdAtColumn.hasDefault).toBe(true);
  });
});

// ============================================================================
// Tests: Type exports
// ============================================================================

describe('type exports', () => {
  test('should export inferred types (compile-time check)', () => {
    // These imports verify the types are exported correctly
    // The actual type checking happens at compile time
    const refreshTokenFamily: import('../auth').RefreshTokenFamily = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      createdAt: new Date(),
      revokedAt: null,
      revokeReason: null,
    };
    expect(refreshTokenFamily.id).toBeDefined();

    const loginAttempt: import('../auth').LoginAttempt = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      email: 'test@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      success: true,
      failureReason: null,
      createdAt: new Date(),
    };
    expect(loginAttempt.email).toBe('test@example.com');

    const passwordResetToken: import('../auth').PasswordResetToken = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      tokenHash: 'hash123',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
    };
    expect(passwordResetToken.tokenHash).toBe('hash123');

    const emailVerificationToken: import('../auth').EmailVerificationToken = {
      id: '123e4567-e89b-12d3-a456-426614174004',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      tokenHash: 'hash456',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
    };
    expect(emailVerificationToken.tokenHash).toBe('hash456');

    const securityEvent: import('../auth').SecurityEvent = {
      id: '123e4567-e89b-12d3-a456-426614174005',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      email: 'test@example.com',
      eventType: 'token_reuse',
      severity: 'high',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: JSON.stringify({ details: 'test' }),
      createdAt: new Date(),
    };
    expect(securityEvent.eventType).toBe('token_reuse');
  });
});
