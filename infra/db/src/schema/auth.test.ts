// infra/db/src/schema/auth.test.ts
import { describe, expect, test } from 'vitest';

import {
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  EMAIL_VERIFICATION_TOKENS_TABLE,
  type EmailVerificationToken,
  LOGIN_ATTEMPT_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  type LoginAttempt,
  type NewEmailVerificationToken,
  type NewLoginAttempt,
  type NewPasswordResetToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  PASSWORD_RESET_TOKEN_COLUMNS,
  PASSWORD_RESET_TOKENS_TABLE,
  type PasswordResetToken,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKEN_FAMILY_COLUMNS,
  type RefreshTokenFamily,
  SECURITY_EVENT_COLUMNS,
  SECURITY_EVENTS_TABLE,
  type SecurityEvent,
  type SecurityEventSeverity,
  type SecurityEventType,
} from './auth.js';

describe('Auth Schema - Table Names', () => {
  test('should have correct table name for refresh_token_families', () => {
    expect(REFRESH_TOKEN_FAMILIES_TABLE).toBe('refresh_token_families');
  });

  test('should have correct table name for login_attempts', () => {
    expect(LOGIN_ATTEMPTS_TABLE).toBe('login_attempts');
  });

  test('should have correct table name for password_reset_tokens', () => {
    expect(PASSWORD_RESET_TOKENS_TABLE).toBe('password_reset_tokens');
  });

  test('should have correct table name for email_verification_tokens', () => {
    expect(EMAIL_VERIFICATION_TOKENS_TABLE).toBe('email_verification_tokens');
  });

  test('should have correct table name for security_events', () => {
    expect(SECURITY_EVENTS_TABLE).toBe('security_events');
  });

  test('table names should be unique', () => {
    const tableNames = [
      REFRESH_TOKEN_FAMILIES_TABLE,
      LOGIN_ATTEMPTS_TABLE,
      PASSWORD_RESET_TOKENS_TABLE,
      EMAIL_VERIFICATION_TOKENS_TABLE,
      SECURITY_EVENTS_TABLE,
    ];

    const uniqueNames = new Set(tableNames);
    expect(uniqueNames.size).toBe(tableNames.length);
  });

  test('table names should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;

    expect(REFRESH_TOKEN_FAMILIES_TABLE).toMatch(snakeCasePattern);
    expect(LOGIN_ATTEMPTS_TABLE).toMatch(snakeCasePattern);
    expect(PASSWORD_RESET_TOKENS_TABLE).toMatch(snakeCasePattern);
    expect(EMAIL_VERIFICATION_TOKENS_TABLE).toMatch(snakeCasePattern);
    expect(SECURITY_EVENTS_TABLE).toMatch(snakeCasePattern);
  });
});

describe('Auth Schema - Refresh Token Family Columns', () => {
  test('should have correct column mappings', () => {
    expect(REFRESH_TOKEN_FAMILY_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      createdAt: 'created_at',
      revokedAt: 'revoked_at',
      revokeReason: 'revoke_reason',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(REFRESH_TOKEN_FAMILY_COLUMNS.userId).toBe('user_id');
    expect(REFRESH_TOKEN_FAMILY_COLUMNS.ipAddress).toBe('ip_address');
    expect(REFRESH_TOKEN_FAMILY_COLUMNS.userAgent).toBe('user_agent');
    expect(REFRESH_TOKEN_FAMILY_COLUMNS.createdAt).toBe('created_at');
    expect(REFRESH_TOKEN_FAMILY_COLUMNS.revokedAt).toBe('revoked_at');
    expect(REFRESH_TOKEN_FAMILY_COLUMNS.revokeReason).toBe('revoke_reason');
  });

  test('should have all required columns', () => {
    const requiredColumns = ['id', 'userId', 'ipAddress', 'userAgent', 'createdAt', 'revokedAt', 'revokeReason'];
    const actualColumns = Object.keys(REFRESH_TOKEN_FAMILY_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(REFRESH_TOKEN_FAMILY_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });

  test('should be immutable (as const assertion)', () => {
    // TypeScript enforces immutability via 'as const' at compile time
    // We can verify the object structure is correctly defined
    const columns = REFRESH_TOKEN_FAMILY_COLUMNS;

    // Verify the object exists and has the expected shape
    expect(columns).toBeDefined();
    expect(typeof columns).toBe('object');
    expect(Object.keys(columns).length).toBeGreaterThan(0);

    // The 'as const' assertion makes properties readonly in TypeScript
    // Attempting to modify would be a compile-time error
    type IsReadonly = typeof columns extends { readonly id: string } ? true : false;
    const isReadonly: IsReadonly = true;
    expect(isReadonly).toBe(true);
  });
});

describe('Auth Schema - Login Attempt Columns', () => {
  test('should have correct column mappings', () => {
    expect(LOGIN_ATTEMPT_COLUMNS).toEqual({
      id: 'id',
      email: 'email',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      success: 'success',
      failureReason: 'failure_reason',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(LOGIN_ATTEMPT_COLUMNS.ipAddress).toBe('ip_address');
    expect(LOGIN_ATTEMPT_COLUMNS.userAgent).toBe('user_agent');
    expect(LOGIN_ATTEMPT_COLUMNS.failureReason).toBe('failure_reason');
    expect(LOGIN_ATTEMPT_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = ['id', 'email', 'ipAddress', 'userAgent', 'success', 'failureReason', 'createdAt'];
    const actualColumns = Object.keys(LOGIN_ATTEMPT_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(LOGIN_ATTEMPT_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });
});

describe('Auth Schema - Password Reset Token Columns', () => {
  test('should have correct column mappings', () => {
    expect(PASSWORD_RESET_TOKEN_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      tokenHash: 'token_hash',
      expiresAt: 'expires_at',
      usedAt: 'used_at',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(PASSWORD_RESET_TOKEN_COLUMNS.userId).toBe('user_id');
    expect(PASSWORD_RESET_TOKEN_COLUMNS.tokenHash).toBe('token_hash');
    expect(PASSWORD_RESET_TOKEN_COLUMNS.expiresAt).toBe('expires_at');
    expect(PASSWORD_RESET_TOKEN_COLUMNS.usedAt).toBe('used_at');
    expect(PASSWORD_RESET_TOKEN_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = ['id', 'userId', 'tokenHash', 'expiresAt', 'usedAt', 'createdAt'];
    const actualColumns = Object.keys(PASSWORD_RESET_TOKEN_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(PASSWORD_RESET_TOKEN_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });
});

describe('Auth Schema - Email Verification Token Columns', () => {
  test('should have correct column mappings', () => {
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      tokenHash: 'token_hash',
      expiresAt: 'expires_at',
      usedAt: 'used_at',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS.userId).toBe('user_id');
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS.tokenHash).toBe('token_hash');
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS.expiresAt).toBe('expires_at');
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS.usedAt).toBe('used_at');
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = ['id', 'userId', 'tokenHash', 'expiresAt', 'usedAt', 'createdAt'];
    const actualColumns = Object.keys(EMAIL_VERIFICATION_TOKEN_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(EMAIL_VERIFICATION_TOKEN_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });

  test('should have same structure as password reset token columns', () => {
    // Both email verification and password reset tokens should have identical structure
    expect(Object.keys(EMAIL_VERIFICATION_TOKEN_COLUMNS)).toEqual(Object.keys(PASSWORD_RESET_TOKEN_COLUMNS));
  });
});

describe('Auth Schema - Security Event Columns', () => {
  test('should have correct column mappings', () => {
    expect(SECURITY_EVENT_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      email: 'email',
      eventType: 'event_type',
      severity: 'severity',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      metadata: 'metadata',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(SECURITY_EVENT_COLUMNS.userId).toBe('user_id');
    expect(SECURITY_EVENT_COLUMNS.eventType).toBe('event_type');
    expect(SECURITY_EVENT_COLUMNS.ipAddress).toBe('ip_address');
    expect(SECURITY_EVENT_COLUMNS.userAgent).toBe('user_agent');
    expect(SECURITY_EVENT_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = ['id', 'userId', 'email', 'eventType', 'severity', 'ipAddress', 'userAgent', 'metadata', 'createdAt'];
    const actualColumns = Object.keys(SECURITY_EVENT_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(SECURITY_EVENT_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });
});

describe('Auth Schema - RefreshTokenFamily Type', () => {
  test('should accept valid refresh token family object', () => {
    const validFamily: RefreshTokenFamily = {
      id: 'family-123',
      userId: 'user-456',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
      revokedAt: null,
      revokeReason: null,
    };

    expect(validFamily).toBeDefined();
    expect(validFamily.id).toBe('family-123');
    expect(validFamily.userId).toBe('user-456');
  });

  test('should handle null values for optional fields', () => {
    const familyWithNulls: RefreshTokenFamily = {
      id: 'family-123',
      userId: 'user-456',
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      revokedAt: null,
      revokeReason: null,
    };

    expect(familyWithNulls.ipAddress).toBeNull();
    expect(familyWithNulls.userAgent).toBeNull();
    expect(familyWithNulls.revokedAt).toBeNull();
    expect(familyWithNulls.revokeReason).toBeNull();
  });

  test('should accept revoked token family', () => {
    const revokedFamily: RefreshTokenFamily = {
      id: 'family-123',
      userId: 'user-456',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date('2024-01-01'),
      revokedAt: new Date('2024-01-02'),
      revokeReason: 'Token reuse detected',
    };

    expect(revokedFamily.revokedAt).toBeInstanceOf(Date);
    expect(revokedFamily.revokeReason).toBe('Token reuse detected');
  });
});

describe('Auth Schema - NewRefreshTokenFamily Type', () => {
  test('should accept minimal new refresh token family', () => {
    const newFamily: NewRefreshTokenFamily = {
      userId: 'user-456',
    };

    expect(newFamily.userId).toBe('user-456');
  });

  test('should accept new refresh token family with all optional fields', () => {
    const newFamily: NewRefreshTokenFamily = {
      id: 'family-123',
      userId: 'user-456',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
      revokedAt: null,
      revokeReason: null,
    };

    expect(newFamily).toBeDefined();
    expect(Object.keys(newFamily).length).toBeGreaterThan(1);
  });

  test('should accept new refresh token family with partial fields', () => {
    const newFamily: NewRefreshTokenFamily = {
      userId: 'user-456',
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120.0',
    };

    expect(newFamily.ipAddress).toBe('192.168.1.1');
    expect(newFamily.userAgent).toBe('Chrome/120.0');
  });
});

describe('Auth Schema - LoginAttempt Type', () => {
  test('should accept valid successful login attempt', () => {
    const successfulAttempt: LoginAttempt = {
      id: 'attempt-123',
      email: 'user@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      success: true,
      failureReason: null,
      createdAt: new Date(),
    };

    expect(successfulAttempt.success).toBe(true);
    expect(successfulAttempt.failureReason).toBeNull();
  });

  test('should accept valid failed login attempt', () => {
    const failedAttempt: LoginAttempt = {
      id: 'attempt-456',
      email: 'user@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      success: false,
      failureReason: 'Invalid password',
      createdAt: new Date(),
    };

    expect(failedAttempt.success).toBe(false);
    expect(failedAttempt.failureReason).toBe('Invalid password');
  });

  test('should handle null values for optional fields', () => {
    const attemptWithNulls: LoginAttempt = {
      id: 'attempt-789',
      email: 'user@example.com',
      ipAddress: null,
      userAgent: null,
      success: true,
      failureReason: null,
      createdAt: new Date(),
    };

    expect(attemptWithNulls.ipAddress).toBeNull();
    expect(attemptWithNulls.userAgent).toBeNull();
  });
});

describe('Auth Schema - NewLoginAttempt Type', () => {
  test('should accept minimal new login attempt', () => {
    const newAttempt: NewLoginAttempt = {
      email: 'user@example.com',
      success: true,
    };

    expect(newAttempt.email).toBe('user@example.com');
    expect(newAttempt.success).toBe(true);
  });

  test('should accept new login attempt with all fields', () => {
    const newAttempt: NewLoginAttempt = {
      id: 'attempt-123',
      email: 'user@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      success: false,
      failureReason: 'Account locked',
      createdAt: new Date(),
    };

    expect(newAttempt.failureReason).toBe('Account locked');
    expect(newAttempt.createdAt).toBeInstanceOf(Date);
  });

  test('should accept failed attempt with reason', () => {
    const failedAttempt: NewLoginAttempt = {
      email: 'user@example.com',
      success: false,
      failureReason: 'Invalid credentials',
    };

    expect(failedAttempt.success).toBe(false);
    expect(failedAttempt.failureReason).toBe('Invalid credentials');
  });
});

describe('Auth Schema - PasswordResetToken Type', () => {
  test('should accept valid unused password reset token', () => {
    const token: PasswordResetToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      createdAt: new Date(),
    };

    expect(token.usedAt).toBeNull();
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('should accept valid used password reset token', () => {
    const usedToken: PasswordResetToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: new Date(),
      createdAt: new Date(Date.now() - 1800000),
    };

    expect(usedToken.usedAt).toBeInstanceOf(Date);
    expect(usedToken.usedAt).toBeDefined();
  });

  test('should accept expired token', () => {
    const expiredToken: PasswordResetToken = {
      id: 'token-789',
      userId: 'user-456',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() - 3600000),
      usedAt: null,
      createdAt: new Date(Date.now() - 7200000),
    };

    expect(expiredToken.expiresAt.getTime()).toBeLessThan(Date.now());
  });
});

describe('Auth Schema - NewPasswordResetToken Type', () => {
  test('should accept minimal new password reset token', () => {
    const newToken: NewPasswordResetToken = {
      userId: 'user-456',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 3600000),
    };

    expect(newToken.userId).toBe('user-456');
    expect(newToken.tokenHash).toBe('hashed-token-value');
    expect(newToken.expiresAt).toBeInstanceOf(Date);
  });

  test('should accept new token with all optional fields', () => {
    const newToken: NewPasswordResetToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      createdAt: new Date(),
    };

    expect(newToken.id).toBe('token-123');
    expect(newToken.usedAt).toBeNull();
    expect(newToken.createdAt).toBeInstanceOf(Date);
  });
});

describe('Auth Schema - EmailVerificationToken Type', () => {
  test('should accept valid unused email verification token', () => {
    const token: EmailVerificationToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      createdAt: new Date(),
    };

    expect(token.usedAt).toBeNull();
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('should accept valid used email verification token', () => {
    const usedToken: EmailVerificationToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: new Date(),
      createdAt: new Date(Date.now() - 3600000),
    };

    expect(usedToken.usedAt).toBeInstanceOf(Date);
  });

  test('should have same structure as password reset token', () => {
    const emailToken: EmailVerificationToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-value',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
    };

    const passwordToken: PasswordResetToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-value',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
    };

    expect(Object.keys(emailToken).sort()).toEqual(Object.keys(passwordToken).sort());
  });
});

describe('Auth Schema - NewEmailVerificationToken Type', () => {
  test('should accept minimal new email verification token', () => {
    const newToken: NewEmailVerificationToken = {
      userId: 'user-456',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 86400000),
    };

    expect(newToken.userId).toBe('user-456');
    expect(newToken.tokenHash).toBe('hashed-token-value');
    expect(newToken.expiresAt).toBeInstanceOf(Date);
  });

  test('should accept new token with all optional fields', () => {
    const newToken: NewEmailVerificationToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      createdAt: new Date(),
    };

    expect(newToken.id).toBe('token-123');
    expect(newToken.usedAt).toBeNull();
    expect(newToken.createdAt).toBeInstanceOf(Date);
  });
});

describe('Auth Schema - SecurityEvent Type', () => {
  test('should accept valid security event', () => {
    const event: SecurityEvent = {
      id: 'event-123',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'login_success',
      severity: 'low',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: JSON.stringify({ device: 'Desktop' }),
      createdAt: new Date(),
    };

    expect(event.eventType).toBe('login_success');
    expect(event.severity).toBe('low');
  });

  test('should handle null values for optional fields', () => {
    const eventWithNulls: SecurityEvent = {
      id: 'event-456',
      userId: null,
      email: null,
      eventType: 'suspicious_activity',
      severity: 'high',
      ipAddress: null,
      userAgent: null,
      metadata: null,
      createdAt: new Date(),
    };

    expect(eventWithNulls.userId).toBeNull();
    expect(eventWithNulls.email).toBeNull();
    expect(eventWithNulls.ipAddress).toBeNull();
    expect(eventWithNulls.userAgent).toBeNull();
    expect(eventWithNulls.metadata).toBeNull();
  });

  test('should accept all severity levels', () => {
    const severities: SecurityEventSeverity[] = ['low', 'medium', 'high', 'critical'];

    severities.forEach((severity, index) => {
      const event: SecurityEvent = {
        id: `event-${String(index)}`,
        userId: 'user-456',
        email: 'user@example.com',
        eventType: 'test_event',
        severity,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: null,
        createdAt: new Date(),
      };

      expect(event.severity).toBe(severity);
    });
  });

  test('should accept all event types', () => {
    const eventTypes: SecurityEventType[] = [
      'token_reuse',
      'account_locked',
      'account_unlocked',
      'password_changed',
      'password_reset_requested',
      'password_reset_completed',
      'email_verification_sent',
      'email_verified',
      'login_success',
      'login_failure',
      'logout',
      'suspicious_activity',
    ];

    eventTypes.forEach((eventType, index) => {
      const event: SecurityEvent = {
        id: `event-${String(index)}`,
        userId: 'user-456',
        email: 'user@example.com',
        eventType,
        severity: 'low',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: null,
        createdAt: new Date(),
      };

      expect(event.eventType).toBe(eventType);
    });
  });

  test('should accept metadata as JSON string', () => {
    const metadata = {
      device: 'Desktop',
      browser: 'Chrome',
      os: 'Windows',
      location: 'US',
    };

    const event: SecurityEvent = {
      id: 'event-123',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'login_success',
      severity: 'low',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: JSON.stringify(metadata),
      createdAt: new Date(),
    };

    expect(event.metadata).toBe(JSON.stringify(metadata));
    if (event.metadata !== null) {
      expect(JSON.parse(event.metadata)).toEqual(metadata);
    }
  });
});

describe('Auth Schema - NewSecurityEvent Type', () => {
  test('should accept minimal new security event', () => {
    const newEvent: NewSecurityEvent = {
      eventType: 'login_success',
      severity: 'low',
    };

    expect(newEvent.eventType).toBe('login_success');
    expect(newEvent.severity).toBe('low');
  });

  test('should accept new security event with all fields', () => {
    const newEvent: NewSecurityEvent = {
      id: 'event-123',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'password_changed',
      severity: 'medium',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: JSON.stringify({ reason: 'User requested' }),
      createdAt: new Date(),
    };

    expect(newEvent).toBeDefined();
    expect(newEvent.userId).toBe('user-456');
    expect(newEvent.email).toBe('user@example.com');
  });

  test('should accept critical severity events', () => {
    const criticalEvent: NewSecurityEvent = {
      eventType: 'token_reuse',
      severity: 'critical',
      userId: 'user-456',
      metadata: JSON.stringify({ familyId: 'family-123' }),
    };

    expect(criticalEvent.severity).toBe('critical');
    expect(criticalEvent.eventType).toBe('token_reuse');
  });
});

describe('Auth Schema - SecurityEventSeverity Type', () => {
  test('should only allow valid severity values', () => {
    const validSeverities: SecurityEventSeverity[] = ['low', 'medium', 'high', 'critical'];

    validSeverities.forEach((severity) => {
      const event: Pick<SecurityEvent, 'severity'> = { severity };
      expect(event.severity).toBe(severity);
    });
  });

  test('should have exactly 4 severity levels', () => {
    const severities: SecurityEventSeverity[] = ['low', 'medium', 'high', 'critical'];
    const uniqueSeverities = new Set(severities);

    expect(uniqueSeverities.size).toBe(4);
  });
});

describe('Auth Schema - SecurityEventType Type', () => {
  test('should only allow valid event type values', () => {
    const validEventTypes: SecurityEventType[] = [
      'token_reuse',
      'account_locked',
      'account_unlocked',
      'password_changed',
      'password_reset_requested',
      'password_reset_completed',
      'email_verification_sent',
      'email_verified',
      'login_success',
      'login_failure',
      'logout',
      'suspicious_activity',
    ];

    validEventTypes.forEach((eventType) => {
      const event: Pick<SecurityEvent, 'eventType'> = { eventType };
      expect(event.eventType).toBe(eventType);
    });
  });

  test('should have exactly 12 event types', () => {
    const eventTypes: SecurityEventType[] = [
      'token_reuse',
      'account_locked',
      'account_unlocked',
      'password_changed',
      'password_reset_requested',
      'password_reset_completed',
      'email_verification_sent',
      'email_verified',
      'login_success',
      'login_failure',
      'logout',
      'suspicious_activity',
    ];
    const uniqueEventTypes = new Set(eventTypes);

    expect(uniqueEventTypes.size).toBe(12);
  });

  test('all event types should be in snake_case', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const eventTypes: SecurityEventType[] = [
      'token_reuse',
      'account_locked',
      'account_unlocked',
      'password_changed',
      'password_reset_requested',
      'password_reset_completed',
      'email_verification_sent',
      'email_verified',
      'login_success',
      'login_failure',
      'logout',
      'suspicious_activity',
    ];

    eventTypes.forEach((eventType) => {
      expect(eventType).toMatch(snakeCasePattern);
    });
  });
});

describe('Auth Schema - Type Consistency', () => {
  test('New* types should be compatible with their base types', () => {
    const newFamily: NewRefreshTokenFamily = {
      userId: 'user-123',
      ipAddress: '192.168.1.1',
    };

    // Should be able to spread New* into full type with additional fields
    const fullFamily: RefreshTokenFamily = {
      id: 'family-123',
      createdAt: new Date(),
      revokedAt: null,
      revokeReason: null,
      userAgent: null,
      ...newFamily,
    };

    expect(fullFamily.userId).toBe(newFamily.userId);
    expect(fullFamily.ipAddress).toBe(newFamily.ipAddress);
  });

  test('Column constants should cover all type properties', () => {
    // Create sample objects to validate column mappings
    const tokenFamily: RefreshTokenFamily = {
      id: 'id',
      userId: 'userId',
      ipAddress: 'ipAddress',
      userAgent: 'userAgent',
      createdAt: new Date(),
      revokedAt: null,
      revokeReason: null,
    };

    const tokenFamilyKeys = Object.keys(tokenFamily);
    const columnKeys = Object.keys(REFRESH_TOKEN_FAMILY_COLUMNS);

    expect(columnKeys.sort()).toEqual(tokenFamilyKeys.sort());
  });

  test('Date fields should be consistently named', () => {
    // All date fields should follow *At naming convention
    expect(REFRESH_TOKEN_FAMILY_COLUMNS.createdAt).toMatch(/_at$/);
    expect(REFRESH_TOKEN_FAMILY_COLUMNS.revokedAt).toMatch(/_at$/);
    expect(LOGIN_ATTEMPT_COLUMNS.createdAt).toMatch(/_at$/);
    expect(PASSWORD_RESET_TOKEN_COLUMNS.createdAt).toMatch(/_at$/);
    expect(PASSWORD_RESET_TOKEN_COLUMNS.expiresAt).toMatch(/_at$/);
    expect(PASSWORD_RESET_TOKEN_COLUMNS.usedAt).toMatch(/_at$/);
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS.createdAt).toMatch(/_at$/);
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS.expiresAt).toMatch(/_at$/);
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS.usedAt).toMatch(/_at$/);
    expect(SECURITY_EVENT_COLUMNS.createdAt).toMatch(/_at$/);
  });

  test('All tables should have id and createdAt fields', () => {
    expect(REFRESH_TOKEN_FAMILY_COLUMNS).toHaveProperty('id');
    expect(REFRESH_TOKEN_FAMILY_COLUMNS).toHaveProperty('createdAt');

    expect(LOGIN_ATTEMPT_COLUMNS).toHaveProperty('id');
    expect(LOGIN_ATTEMPT_COLUMNS).toHaveProperty('createdAt');

    expect(PASSWORD_RESET_TOKEN_COLUMNS).toHaveProperty('id');
    expect(PASSWORD_RESET_TOKEN_COLUMNS).toHaveProperty('createdAt');

    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS).toHaveProperty('id');
    expect(EMAIL_VERIFICATION_TOKEN_COLUMNS).toHaveProperty('createdAt');

    expect(SECURITY_EVENT_COLUMNS).toHaveProperty('id');
    expect(SECURITY_EVENT_COLUMNS).toHaveProperty('createdAt');
  });
});

describe('Auth Schema - Edge Cases', () => {
  test('should handle empty string values', () => {
    const event: SecurityEvent = {
      id: '',
      userId: '',
      email: '',
      eventType: '',
      severity: '',
      ipAddress: '',
      userAgent: '',
      metadata: '',
      createdAt: new Date(),
    };

    expect(event.id).toBe('');
    expect(event.userId).toBe('');
  });

  test('should handle very long string values', () => {
    const longString = 'a'.repeat(10000);
    const event: SecurityEvent = {
      id: longString,
      userId: longString,
      email: `${longString}@example.com`,
      eventType: 'login_success',
      severity: 'low',
      ipAddress: '192.168.1.1',
      userAgent: longString,
      metadata: longString,
      createdAt: new Date(),
    };

    expect(event.id).toHaveLength(10000);
  });

  test('should handle special characters in strings', () => {
    const specialChars = "'; DROP TABLE users; --";
    const event: SecurityEvent = {
      id: 'event-123',
      userId: 'user-456',
      email: 'test@example.com',
      eventType: 'suspicious_activity',
      severity: 'critical',
      ipAddress: '192.168.1.1',
      userAgent: specialChars,
      metadata: JSON.stringify({ note: specialChars }),
      createdAt: new Date(),
    };

    expect(event.userAgent).toBe(specialChars);
  });

  test('should handle future dates', () => {
    const futureDate = new Date('2099-12-31');
    const token: PasswordResetToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hash',
      expiresAt: futureDate,
      usedAt: null,
      createdAt: new Date(),
    };

    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('should handle past dates', () => {
    const pastDate = new Date('2000-01-01');
    const token: PasswordResetToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hash',
      expiresAt: pastDate,
      usedAt: null,
      createdAt: pastDate,
    };

    expect(token.expiresAt.getTime()).toBeLessThan(Date.now());
  });

  test('should handle IPv6 addresses', () => {
    const ipv6Address = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    const event: SecurityEvent = {
      id: 'event-123',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'login_success',
      severity: 'low',
      ipAddress: ipv6Address,
      userAgent: 'Mozilla/5.0',
      metadata: null,
      createdAt: new Date(),
    };

    expect(event.ipAddress).toBe(ipv6Address);
  });

  test('should handle various user agent strings', () => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'curl/7.68.0',
      'PostmanRuntime/7.26.8',
      'Mobile Safari/604.1',
      '',
    ];

    userAgents.forEach((userAgent, index) => {
      const attempt: LoginAttempt = {
        id: `attempt-${index}`,
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: userAgent === '' ? null : userAgent,
        success: true,
        failureReason: null,
        createdAt: new Date(),
      };

      expect(attempt.userAgent).toBe(userAgent === '' ? null : userAgent);
    });
  });
});

describe('Auth Schema - Integration Scenarios', () => {
  test('should support token reuse detection workflow', () => {
    // Create token family
    const family: RefreshTokenFamily = {
      id: 'family-123',
      userId: 'user-456',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
      revokedAt: null,
      revokeReason: null,
    };

    // Revoke family on reuse detection
    const revokedFamily: RefreshTokenFamily = {
      ...family,
      revokedAt: new Date(),
      revokeReason: 'Token reuse detected',
    };

    // Create security event
    const event: SecurityEvent = {
      id: 'event-123',
      userId: family.userId,
      email: 'user@example.com',
      eventType: 'token_reuse',
      severity: 'critical',
      ipAddress: family.ipAddress,
      userAgent: family.userAgent,
      metadata: JSON.stringify({ familyId: family.id }),
      createdAt: new Date(),
    };

    expect(revokedFamily.revokedAt).toBeDefined();
    expect(event.eventType).toBe('token_reuse');
    expect(event.severity).toBe('critical');
  });

  test('should support login attempt rate limiting workflow', () => {
    // Create failed login attempts
    const attempts: LoginAttempt[] = Array.from({ length: 5 }, (_, index) => ({
      id: `attempt-${index}`,
      email: 'user@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      success: false,
      failureReason: 'Invalid password',
      createdAt: new Date(Date.now() + index * 1000),
    }));

    // Create account locked event
    const lockEvent: SecurityEvent = {
      id: 'event-locked',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'account_locked',
      severity: 'high',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: JSON.stringify({ attemptCount: attempts.length }),
      createdAt: new Date(),
    };

    expect(attempts.every((a) => a.success === false)).toBe(true);
    expect(lockEvent.eventType).toBe('account_locked');
    expect(lockEvent.severity).toBe('high');
  });

  test('should support password reset workflow', () => {
    // Create security event for reset request
    const requestEvent: SecurityEvent = {
      id: 'event-request',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'password_reset_requested',
      severity: 'low',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: null,
      createdAt: new Date(),
    };

    // Create password reset token
    const token: PasswordResetToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      createdAt: new Date(),
    };

    // Mark token as used
    const usedToken: PasswordResetToken = {
      ...token,
      usedAt: new Date(),
    };

    // Create security event for reset completion
    const completeEvent: SecurityEvent = {
      id: 'event-complete',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'password_reset_completed',
      severity: 'medium',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: JSON.stringify({ tokenId: token.id }),
      createdAt: new Date(),
    };

    expect(requestEvent.eventType).toBe('password_reset_requested');
    expect(usedToken.usedAt).toBeDefined();
    expect(completeEvent.eventType).toBe('password_reset_completed');
  });

  test('should support email verification workflow', () => {
    // Create email verification token
    const token: EmailVerificationToken = {
      id: 'token-123',
      userId: 'user-456',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      createdAt: new Date(),
    };

    // Create security event for verification sent
    const sentEvent: SecurityEvent = {
      id: 'event-sent',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'email_verification_sent',
      severity: 'low',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: null,
      createdAt: new Date(),
    };

    // Mark token as used
    const usedToken: EmailVerificationToken = {
      ...token,
      usedAt: new Date(),
    };

    // Create security event for verification completed
    const verifiedEvent: SecurityEvent = {
      id: 'event-verified',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'email_verified',
      severity: 'low',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: JSON.stringify({ tokenId: token.id }),
      createdAt: new Date(),
    };

    expect(sentEvent.eventType).toBe('email_verification_sent');
    expect(usedToken.usedAt).toBeDefined();
    expect(verifiedEvent.eventType).toBe('email_verified');
  });
});
