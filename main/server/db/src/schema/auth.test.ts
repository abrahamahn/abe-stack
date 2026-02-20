// main/server/db/src/schema/auth.test.ts
import { describe, expect, test } from 'vitest';

import {
  AUTH_TOKEN_COLUMNS,
  AUTH_TOKENS_TABLE,
  type AuthToken,
  type AuthTokenType,
  type NewAuthToken,
  LOGIN_ATTEMPT_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  type LoginAttempt,
  type NewLoginAttempt,
  type NewSecurityEvent,
  type NewTotpBackupCode,
  SECURITY_EVENT_COLUMNS,
  SECURITY_EVENTS_TABLE,
  type SecurityEvent,
  type SecuritySeverity,
  type SecurityEventType,
  TOTP_BACKUP_CODES_TABLE,
  TOTP_BACKUP_CODE_COLUMNS,
  type TotpBackupCode,
  SMS_VERIFICATION_CODES_TABLE,
  SMS_VERIFICATION_CODE_COLUMNS,
  type SmsVerificationCode,
  type NewSmsVerificationCode,
  type UpdateSmsVerificationCode,
} from './auth';

describe('Auth Schema - Table Names', () => {
  test('should have correct table name for auth_tokens', () => {
    expect(AUTH_TOKENS_TABLE).toBe('auth_tokens');
  });

  test('should have correct table name for login_attempts', () => {
    expect(LOGIN_ATTEMPTS_TABLE).toBe('login_attempts');
  });

  test('should have correct table name for security_events', () => {
    expect(SECURITY_EVENTS_TABLE).toBe('security_events');
  });

  test('should have correct table name for totp_backup_codes', () => {
    expect(TOTP_BACKUP_CODES_TABLE).toBe('totp_backup_codes');
  });

  test('should have correct table name for sms_verification_codes', () => {
    expect(SMS_VERIFICATION_CODES_TABLE).toBe('sms_verification_codes');
  });

  test('table names should be unique', () => {
    const tableNames = [
      AUTH_TOKENS_TABLE,
      LOGIN_ATTEMPTS_TABLE,
      SECURITY_EVENTS_TABLE,
      TOTP_BACKUP_CODES_TABLE,
      SMS_VERIFICATION_CODES_TABLE,
    ];

    const uniqueNames = new Set(tableNames);
    expect(uniqueNames.size).toBe(tableNames.length);
  });

  test('table names should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;

    expect(AUTH_TOKENS_TABLE).toMatch(snakeCasePattern);
    expect(LOGIN_ATTEMPTS_TABLE).toMatch(snakeCasePattern);
    expect(SECURITY_EVENTS_TABLE).toMatch(snakeCasePattern);
    expect(TOTP_BACKUP_CODES_TABLE).toMatch(snakeCasePattern);
    expect(SMS_VERIFICATION_CODES_TABLE).toMatch(snakeCasePattern);
  });
});

describe('Auth Schema - Auth Token Columns', () => {
  test('should have correct column mappings', () => {
    expect(AUTH_TOKEN_COLUMNS).toEqual({
      id: 'id',
      type: 'type',
      userId: 'user_id',
      email: 'email',
      tokenHash: 'token_hash',
      expiresAt: 'expires_at',
      usedAt: 'used_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      metadata: 'metadata',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(AUTH_TOKEN_COLUMNS.userId).toBe('user_id');
    expect(AUTH_TOKEN_COLUMNS.tokenHash).toBe('token_hash');
    expect(AUTH_TOKEN_COLUMNS.expiresAt).toBe('expires_at');
    expect(AUTH_TOKEN_COLUMNS.usedAt).toBe('used_at');
    expect(AUTH_TOKEN_COLUMNS.ipAddress).toBe('ip_address');
    expect(AUTH_TOKEN_COLUMNS.userAgent).toBe('user_agent');
    expect(AUTH_TOKEN_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'id',
      'type',
      'userId',
      'email',
      'tokenHash',
      'expiresAt',
      'usedAt',
      'ipAddress',
      'userAgent',
      'metadata',
      'createdAt',
    ];
    const actualColumns = Object.keys(AUTH_TOKEN_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(AUTH_TOKEN_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });

  test('should be immutable (as const assertion)', () => {
    const columns = AUTH_TOKEN_COLUMNS;

    expect(columns).toBeDefined();
    expect(typeof columns).toBe('object');
    expect(Object.keys(columns).length).toBeGreaterThan(0);

    type IsReadonly = typeof columns extends { readonly id: string } ? true : false;
    const isReadonly: IsReadonly = true;
    expect(isReadonly).toBe(true);
  });
});

describe('Auth Schema - AuthToken Type', () => {
  test('should accept valid unused password_reset token', () => {
    const token: AuthToken = {
      id: 'token-123',
      type: 'password_reset',
      userId: 'user-456',
      email: null,
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(token.type).toBe('password_reset');
    expect(token.usedAt).toBeNull();
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('should accept valid used email_verification token', () => {
    const usedToken: AuthToken = {
      id: 'token-123',
      type: 'email_verification',
      userId: 'user-456',
      email: null,
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: new Date(),
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(Date.now() - 3600000),
    };

    expect(usedToken.type).toBe('email_verification');
    expect(usedToken.usedAt).toBeInstanceOf(Date);
  });

  test('should accept email_change token with metadata', () => {
    const changeToken: AuthToken = {
      id: 'token-abc',
      type: 'email_change',
      userId: 'user-456',
      email: null,
      tokenHash: 'sha256-hash',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: { newEmail: 'new@example.com' },
      createdAt: new Date(),
    };

    expect(changeToken.type).toBe('email_change');
    expect(changeToken.metadata['newEmail']).toBe('new@example.com');
  });

  test('should accept email_change_revert token with metadata', () => {
    const revertToken: AuthToken = {
      id: 'token-xyz',
      type: 'email_change_revert',
      userId: 'user-456',
      email: null,
      tokenHash: 'sha256-hash',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: { oldEmail: 'old@example.com', newEmail: 'new@example.com' },
      createdAt: new Date(),
    };

    expect(revertToken.type).toBe('email_change_revert');
    expect(revertToken.metadata['oldEmail']).toBe('old@example.com');
  });

  test('should accept magic_link token with null userId (pre-account)', () => {
    const magicToken: AuthToken = {
      id: 'token-ml-1',
      type: 'magic_link',
      userId: null,
      email: 'user@example.com',
      tokenHash: 'sha256-hash',
      expiresAt: new Date(Date.now() + 900000),
      usedAt: null,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: {},
      createdAt: new Date(),
    };

    expect(magicToken.type).toBe('magic_link');
    expect(magicToken.userId).toBeNull();
    expect(magicToken.email).toBe('user@example.com');
    expect(magicToken.ipAddress).toBe('192.168.1.1');
  });

  test('should accept expired token', () => {
    const expiredToken: AuthToken = {
      id: 'token-789',
      type: 'password_reset',
      userId: 'user-456',
      email: null,
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() - 3600000),
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(Date.now() - 7200000),
    };

    expect(expiredToken.expiresAt.getTime()).toBeLessThan(Date.now());
  });

  test('safeParse-like: all 5 token types are valid AuthTokenType values', () => {
    const types: AuthTokenType[] = [
      'password_reset',
      'email_verification',
      'email_change',
      'email_change_revert',
      'magic_link',
    ];

    types.forEach((type) => {
      const token: Pick<AuthToken, 'type'> = { type };
      expect(token.type).toBe(type);
    });
  });
});

describe('Auth Schema - NewAuthToken Type', () => {
  test('should accept minimal new password_reset token', () => {
    const newToken: NewAuthToken = {
      type: 'password_reset',
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 3600000),
    };

    expect(newToken.type).toBe('password_reset');
    expect(newToken.tokenHash).toBe('hashed-token-value');
    expect(newToken.expiresAt).toBeInstanceOf(Date);
  });

  test('should accept new email_verification token with userId', () => {
    const newToken: NewAuthToken = {
      type: 'email_verification',
      userId: 'user-456',
      tokenHash: 'hash-value',
      expiresAt: new Date(Date.now() + 86400000),
    };

    expect(newToken.userId).toBe('user-456');
  });

  test('should accept new magic_link token with email and ip context', () => {
    const newToken: NewAuthToken = {
      type: 'magic_link',
      email: 'user@example.com',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 900000),
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120',
    };

    expect(newToken.email).toBe('user@example.com');
    expect(newToken.ipAddress).toBe('192.168.1.1');
  });

  test('should accept new email_change token with metadata', () => {
    const newToken: NewAuthToken = {
      type: 'email_change',
      userId: 'user-456',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 3600000),
      metadata: { newEmail: 'new@example.com' },
    };

    expect(newToken.metadata?.['newEmail']).toBe('new@example.com');
  });

  test('should accept new token with all optional fields', () => {
    const newToken: NewAuthToken = {
      id: 'token-123',
      type: 'password_reset',
      userId: 'user-456',
      email: null,
      tokenHash: 'hashed-token-value',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(newToken.id).toBe('token-123');
    expect(newToken.usedAt).toBeNull();
    expect(newToken.createdAt).toBeInstanceOf(Date);
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
    const requiredColumns = [
      'id',
      'email',
      'ipAddress',
      'userAgent',
      'success',
      'failureReason',
      'createdAt',
    ];
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
    const requiredColumns = [
      'id',
      'userId',
      'email',
      'eventType',
      'severity',
      'ipAddress',
      'userAgent',
      'metadata',
      'createdAt',
    ];
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
      metadata: { device: 'Desktop' },
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
    const severities: SecuritySeverity[] = ['low', 'medium', 'high', 'critical'];

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

  test('should accept all event types (legacy + current)', () => {
    const eventTypes: SecurityEventType[] = [
      // Token events
      'token_reuse',
      'token_reuse_detected',
      'token_family_revoked',
      // Account lifecycle
      'account_locked',
      'account_unlocked',
      // Password events
      'password_changed',
      'password_reset_requested',
      'password_reset_completed',
      // Email events
      'email_verification_sent',
      'email_verified',
      'email_changed',
      // Login/session events
      'login_success',
      'login_failure',
      'logout',
      'suspicious_activity',
      'suspicious_login',
      // Magic link events
      'magic_link_requested',
      'magic_link_verified',
      'magic_link_failed',
      // OAuth events
      'oauth_login_success',
      'oauth_login_failure',
      'oauth_account_created',
      'oauth_link_success',
      'oauth_link_failure',
      'oauth_unlink_success',
      'oauth_unlink_failure',
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

  test('should accept metadata as JSONB object', () => {
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
      metadata,
      createdAt: new Date(),
    };

    expect(event.metadata).toEqual(metadata);
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
      metadata: { reason: 'User requested' },
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
      metadata: { familyId: 'family-123' },
    };

    expect(criticalEvent.severity).toBe('critical');
    expect(criticalEvent.eventType).toBe('token_reuse');
  });
});

describe('Auth Schema - SecurityEventSeverity Type', () => {
  test('should only allow valid severity values', () => {
    const validSeverities: SecuritySeverity[] = ['low', 'medium', 'high', 'critical'];

    validSeverities.forEach((severity) => {
      const event: Pick<SecurityEvent, 'severity'> = { severity };
      expect(event.severity).toBe(severity);
    });
  });

  test('should have exactly 4 severity levels', () => {
    const severities: SecuritySeverity[] = ['low', 'medium', 'high', 'critical'];
    const uniqueSeverities = new Set(severities);

    expect(uniqueSeverities.size).toBe(4);
  });
});

describe('Auth Schema - SecurityEventType Type', () => {
  /** All 26 known security event types (legacy + current). */
  const ALL_EVENT_TYPES: SecurityEventType[] = [
    // Token events
    'token_reuse',
    'token_reuse_detected',
    'token_family_revoked',
    // Account lifecycle
    'account_locked',
    'account_unlocked',
    // Password events
    'password_changed',
    'password_reset_requested',
    'password_reset_completed',
    // Email events
    'email_verification_sent',
    'email_verified',
    'email_changed',
    // Login/session events
    'login_success',
    'login_failure',
    'logout',
    'suspicious_activity',
    'suspicious_login',
    // Magic link events
    'magic_link_requested',
    'magic_link_verified',
    'magic_link_failed',
    // OAuth events
    'oauth_login_success',
    'oauth_login_failure',
    'oauth_account_created',
    'oauth_link_success',
    'oauth_link_failure',
    'oauth_unlink_success',
    'oauth_unlink_failure',
  ];

  test('should only allow valid event type values', () => {
    ALL_EVENT_TYPES.forEach((eventType) => {
      const event: Pick<SecurityEvent, 'eventType'> = { eventType };
      expect(event.eventType).toBe(eventType);
    });
  });

  test('should have exactly 26 event types', () => {
    const uniqueEventTypes = new Set(ALL_EVENT_TYPES);
    expect(uniqueEventTypes.size).toBe(26);
  });

  test('all event types should be in snake_case', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;

    ALL_EVENT_TYPES.forEach((eventType) => {
      expect(eventType).toMatch(snakeCasePattern);
    });
  });
});

describe('Auth Schema - Type Consistency', () => {
  test('Date fields should be consistently named', () => {
    // All date fields should follow *At naming convention
    expect(AUTH_TOKEN_COLUMNS.createdAt).toMatch(/_at$/);
    expect(AUTH_TOKEN_COLUMNS.expiresAt).toMatch(/_at$/);
    expect(AUTH_TOKEN_COLUMNS.usedAt).toMatch(/_at$/);
    expect(LOGIN_ATTEMPT_COLUMNS.createdAt).toMatch(/_at$/);
    expect(SECURITY_EVENT_COLUMNS.createdAt).toMatch(/_at$/);
  });

  test('All tables should have id and createdAt fields', () => {
    expect(AUTH_TOKEN_COLUMNS).toHaveProperty('id');
    expect(AUTH_TOKEN_COLUMNS).toHaveProperty('createdAt');

    expect(LOGIN_ATTEMPT_COLUMNS).toHaveProperty('id');
    expect(LOGIN_ATTEMPT_COLUMNS).toHaveProperty('createdAt');

    expect(SECURITY_EVENT_COLUMNS).toHaveProperty('id');
    expect(SECURITY_EVENT_COLUMNS).toHaveProperty('createdAt');
  });

  test('AuthToken type discriminator covers all flows', () => {
    const allTypes: AuthTokenType[] = [
      'password_reset',
      'email_verification',
      'email_change',
      'email_change_revert',
      'magic_link',
    ];

    const uniqueTypes = new Set(allTypes);
    expect(uniqueTypes.size).toBe(5);
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
      metadata: {},
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
      metadata: { value: longString },
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
      metadata: { note: specialChars },
      createdAt: new Date(),
    };

    expect(event.userAgent).toBe(specialChars);
  });

  test('should handle future dates for token expiry', () => {
    const futureDate = new Date('2099-12-31');
    const token: AuthToken = {
      id: 'token-123',
      type: 'password_reset',
      userId: 'user-456',
      email: null,
      tokenHash: 'hash',
      expiresAt: futureDate,
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('should handle past dates for expired tokens', () => {
    const pastDate = new Date('2000-01-01');
    const token: AuthToken = {
      id: 'token-123',
      type: 'email_verification',
      userId: 'user-456',
      email: null,
      tokenHash: 'hash',
      expiresAt: pastDate,
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
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
        id: `attempt-${String(index)}`,
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
    // Create security event for token reuse
    const event: SecurityEvent = {
      id: 'event-123',
      userId: 'user-456',
      email: 'user@example.com',
      eventType: 'token_reuse',
      severity: 'critical',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { familyId: 'family-123' },
      createdAt: new Date(),
    };

    expect(event.eventType).toBe('token_reuse');
    expect(event.severity).toBe('critical');
    expect(event.metadata?.['familyId']).toBe('family-123');
  });

  test('should support login attempt rate limiting workflow', () => {
    // Create failed login attempts
    const attempts: LoginAttempt[] = Array.from({ length: 5 }, (_, index) => ({
      id: `attempt-${String(index)}`,
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
      metadata: { attemptCount: attempts.length },
      createdAt: new Date(),
    };

    expect(attempts.every((a) => !a.success)).toBe(true);
    expect(lockEvent.eventType).toBe('account_locked');
    expect(lockEvent.severity).toBe('high');
  });

  test('should support password reset workflow with unified AuthToken', () => {
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

    // Create auth token for password reset
    const token: AuthToken = {
      id: 'token-123',
      type: 'password_reset',
      userId: 'user-456',
      email: null,
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    // Mark token as used
    const usedToken: AuthToken = {
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
      metadata: { tokenId: token.id },
      createdAt: new Date(),
    };

    expect(requestEvent.eventType).toBe('password_reset_requested');
    expect(token.type).toBe('password_reset');
    expect(usedToken.usedAt).toBeDefined();
    expect(completeEvent.eventType).toBe('password_reset_completed');
  });

  test('should support email verification workflow with unified AuthToken', () => {
    // Create auth token for email verification
    const token: AuthToken = {
      id: 'token-123',
      type: 'email_verification',
      userId: 'user-456',
      email: null,
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
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
    const usedToken: AuthToken = {
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
      metadata: { tokenId: token.id },
      createdAt: new Date(),
    };

    expect(token.type).toBe('email_verification');
    expect(sentEvent.eventType).toBe('email_verification_sent');
    expect(usedToken.usedAt).toBeDefined();
    expect(verifiedEvent.eventType).toBe('email_verified');
  });

  test('should support magic link workflow with rate-limiting data', () => {
    const magicToken: AuthToken = {
      id: 'ml-123',
      type: 'magic_link',
      userId: null,
      email: 'user@example.com',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 900000),
      usedAt: null,
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120',
      metadata: {},
      createdAt: new Date(),
    };

    // Rate-limiting uses ipAddress and email on the same type
    expect(magicToken.type).toBe('magic_link');
    expect(magicToken.userId).toBeNull();
    expect(magicToken.email).toBe('user@example.com');
    expect(magicToken.ipAddress).toBe('192.168.1.1');
  });

  test('killer test — expired + unused token with SQL-injection payload in metadata', () => {
    const maliciousPayload = "'; DROP TABLE auth_tokens; --";
    const token: AuthToken = {
      id: 'token-999',
      type: 'email_change',
      userId: 'user-456',
      email: null,
      tokenHash: maliciousPayload,
      expiresAt: new Date(Date.now() - 3600000), // already expired
      usedAt: null,
      ipAddress: null,
      userAgent: null,
      metadata: { newEmail: maliciousPayload },
      createdAt: new Date(Date.now() - 7200000),
    };

    expect(token.expiresAt.getTime()).toBeLessThan(Date.now());
    expect(token.usedAt).toBeNull();
    expect(token.metadata['newEmail']).toBe(maliciousPayload);
  });
});

// ============================================================================
// TOTP Backup Code Tests
// ============================================================================

describe('Auth Schema - TOTP Backup Code Columns', () => {
  test('should have correct column mappings', () => {
    expect(TOTP_BACKUP_CODE_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      codeHash: 'code_hash',
      usedAt: 'used_at',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(TOTP_BACKUP_CODE_COLUMNS.userId).toBe('user_id');
    expect(TOTP_BACKUP_CODE_COLUMNS.codeHash).toBe('code_hash');
    expect(TOTP_BACKUP_CODE_COLUMNS.usedAt).toBe('used_at');
    expect(TOTP_BACKUP_CODE_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = ['id', 'userId', 'codeHash', 'usedAt', 'createdAt'];
    const actualColumns = Object.keys(TOTP_BACKUP_CODE_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(TOTP_BACKUP_CODE_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });
});

describe('Auth Schema - TotpBackupCode Type', () => {
  test('should accept valid unused backup code', () => {
    const code: TotpBackupCode = {
      id: 'tbc-123',
      userId: 'user-456',
      codeHash: 'sha256-code-hash',
      usedAt: null,
      createdAt: new Date(),
    };

    expect(code.usedAt).toBeNull();
    expect(code.codeHash).toBe('sha256-code-hash');
  });

  test('should accept valid used backup code', () => {
    const usedCode: TotpBackupCode = {
      id: 'tbc-123',
      userId: 'user-456',
      codeHash: 'sha256-code-hash',
      usedAt: new Date(),
      createdAt: new Date(Date.now() - 3600000),
    };

    expect(usedCode.usedAt).toBeInstanceOf(Date);
  });

  test('should support batch of 10 backup codes', () => {
    const codes: TotpBackupCode[] = Array.from({ length: 10 }, (_, index) => ({
      id: `tbc-${String(index)}`,
      userId: 'user-456',
      codeHash: `hash-${String(index)}`,
      usedAt: null,
      createdAt: new Date(),
    }));

    expect(codes.length).toBe(10);
    expect(codes.every((c) => c.usedAt === null)).toBe(true);
    expect(codes.every((c) => c.userId === 'user-456')).toBe(true);
  });
});

describe('Auth Schema - NewTotpBackupCode Type', () => {
  test('should accept minimal new backup code', () => {
    const newCode: NewTotpBackupCode = {
      userId: 'user-456',
      codeHash: 'sha256-code-hash',
    };

    expect(newCode.userId).toBe('user-456');
    expect(newCode.codeHash).toBe('sha256-code-hash');
  });

  test('should accept new backup code with all optional fields', () => {
    const newCode: NewTotpBackupCode = {
      id: 'tbc-123',
      userId: 'user-456',
      codeHash: 'sha256-code-hash',
      usedAt: null,
      createdAt: new Date(),
    };

    expect(newCode.id).toBe('tbc-123');
    expect(newCode.usedAt).toBeNull();
    expect(newCode.createdAt).toBeInstanceOf(Date);
  });
});

describe('Auth Schema - SMS Verification Code Columns', () => {
  test('should have correct column mappings', () => {
    expect(SMS_VERIFICATION_CODE_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      phone: 'phone',
      code: 'code',
      expiresAt: 'expires_at',
      verified: 'verified',
      attempts: 'attempts',
      createdAt: 'created_at',
    });
  });

  test('should map userId to snake_case', () => {
    expect(SMS_VERIFICATION_CODE_COLUMNS.userId).toBe('user_id');
  });

  test('should map expiresAt to snake_case', () => {
    expect(SMS_VERIFICATION_CODE_COLUMNS.expiresAt).toBe('expires_at');
  });

  test('should map createdAt to snake_case', () => {
    expect(SMS_VERIFICATION_CODE_COLUMNS.createdAt).toBe('created_at');
  });
});

describe('Auth Schema - SmsVerificationCode Type', () => {
  test('should accept valid SMS verification code', () => {
    const code: SmsVerificationCode = {
      id: 'sms-123',
      userId: 'user-456',
      phone: '+15551234567',
      code: '123456',
      expiresAt: new Date(Date.now() + 300000),
      verified: false,
      attempts: 0,
      createdAt: new Date(),
    };

    expect(code.phone).toBe('+15551234567');
    expect(code.verified).toBe(false);
    expect(code.attempts).toBe(0);
  });

  test('should accept verified code with attempts', () => {
    const code: SmsVerificationCode = {
      id: 'sms-789',
      userId: 'user-456',
      phone: '+15559876543',
      code: '654321',
      expiresAt: new Date(Date.now() + 300000),
      verified: true,
      attempts: 2,
      createdAt: new Date(),
    };

    expect(code.verified).toBe(true);
    expect(code.attempts).toBe(2);
  });
});

describe('Auth Schema - NewSmsVerificationCode Type', () => {
  test('should accept minimal new SMS code (defaults for optional fields)', () => {
    const newCode: NewSmsVerificationCode = {
      userId: 'user-456',
      phone: '+15551234567',
      code: '123456',
      expiresAt: new Date(Date.now() + 300000),
    };

    expect(newCode.userId).toBe('user-456');
    expect(newCode.phone).toBe('+15551234567');
    expect(newCode.verified).toBeUndefined();
    expect(newCode.attempts).toBeUndefined();
  });

  test('should accept all fields including optional', () => {
    const newCode: NewSmsVerificationCode = {
      id: 'sms-001',
      userId: 'user-456',
      phone: '+15551234567',
      code: '123456',
      expiresAt: new Date(Date.now() + 300000),
      verified: false,
      attempts: 0,
      createdAt: new Date(),
    };

    expect(newCode.id).toBe('sms-001');
    expect(newCode.verified).toBe(false);
  });
});

describe('Auth Schema - UpdateSmsVerificationCode Type', () => {
  test('should accept empty update', () => {
    const update: UpdateSmsVerificationCode = {};

    expect(update.verified).toBeUndefined();
    expect(update.attempts).toBeUndefined();
  });

  test('should accept verified flag only', () => {
    const update: UpdateSmsVerificationCode = { verified: true };

    expect(update.verified).toBe(true);
  });

  test('should accept attempts increment', () => {
    const update: UpdateSmsVerificationCode = { attempts: 3 };

    expect(update.attempts).toBe(3);
  });

  test('should accept both verified and attempts', () => {
    const update: UpdateSmsVerificationCode = { verified: true, attempts: 1 };

    expect(update.verified).toBe(true);
    expect(update.attempts).toBe(1);
  });
});
