// apps/server/src/modules/auth/__tests__/registration-edge-cases.test.ts
/**
 * Registration Flow Edge Cases Tests
 *
 * Tests edge cases for user registration including:
 * - Concurrent same-email registration
 * - UTF-8 names (emoji, CJK, Arabic, etc.)
 * - Password boundary conditions
 * - Email normalization
 * - SQL injection attempts
 * - XSS prevention
 */

import { randomBytes } from 'crypto';

import {
  EmailAlreadyExistsError,
  EmailSendError,
  validatePassword,
  WeakPasswordError,
} from '@abe-stack/core';
import { registerUser } from '@auth/service';
import { hashPassword } from '@auth/utils';
import { withTransaction, type DbClient, type EmailService } from '@infrastructure';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AuthConfig } from '@config';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@abe-stack/core', async () => {
  const actual = await vi.importActual('@abe-stack/core');
  return {
    ...actual,
    validatePassword: vi.fn(),
  };
});

vi.mock('@infrastructure', () => ({
  emailTemplates: {
    emailVerification: vi.fn((url: string) => ({
      to: '',
      subject: 'Verify Your Email Address',
      text: `Verification URL: ${url}`,
      html: `<a href="${url}">Verify</a>`,
    })),
  },
  emailVerificationTokens: {
    tokenHash: 'tokenHash',
    expiresAt: 'expiresAt',
    usedAt: 'usedAt',
    userId: 'userId',
  },
  users: {
    email: 'email',
    id: 'id',
    passwordHash: 'passwordHash',
    emailVerified: 'emailVerified',
    name: 'name',
    role: 'role',
  },
  withTransaction: vi.fn(),
}));

vi.mock('../utils', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  createAuthResponse: vi.fn((accessToken, refreshToken, user) => ({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('a'.repeat(64), 'hex')),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const TEST_CONFIG: AuthConfig = {
  jwt: {
    secret: 'test-secret-32-characters-long!!',
    accessTokenExpiry: '15m',
  },
  argon2: {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  },
  refreshToken: {
    expiryDays: 7,
    gracePeriodSeconds: 30,
  },
  lockout: {
    maxAttempts: 5,
    lockoutDurationMs: 30 * 60 * 1000,
    progressiveDelay: true,
    baseDelayMs: 1000,
  },
} as unknown as AuthConfig;

function createMockDb(): DbClient & {
  query: {
    users: { findFirst: ReturnType<typeof vi.fn> };
  };
  insert: ReturnType<typeof vi.fn>;
} {
  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  }));

  return {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: mockInsert,
  } as unknown as DbClient & {
    query: { users: { findFirst: ReturnType<typeof vi.fn> } };
    insert: ReturnType<typeof vi.fn>;
  };
}

function createMockEmailService(): EmailService {
  return {
    send: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-message-id' }),
  };
}

// ============================================================================
// Tests: Concurrent Same-Email Registration
// ============================================================================

describe('Concurrent Same-Email Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should reject second registration attempt when email already exists', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'duplicate@example.com';
    const password = 'SecurePassword123!';
    const baseUrl = 'http://localhost:5173';

    // First registration succeeds
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    const mockUser = {
      id: 'user-123',
      email,
      name: 'First User',
      role: 'user' as const,
      emailVerified: false,
    };

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    await registerUser(db, emailService, TEST_CONFIG, email, password, 'First User', baseUrl);

    // Second registration should return success (to prevent user enumeration)
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: 'user-123',
      email,
      name: 'First User',
      passwordHash: 'hash',
      role: 'user',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      email,
      password,
      'Second User',
      baseUrl,
    );
    expect(result.status).toBe('pending_verification');
    // Should send notification email to existing user
    expect(emailService.send).toHaveBeenCalledTimes(2); // First registration + notification
  });

  test('should handle race condition with database constraint', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'race@example.com';
    const password = 'SecurePassword123!';
    const baseUrl = 'http://localhost:5173';

    // Both check email availability simultaneously - both see null
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Race Winner',
      role: 'user' as const,
      emailVerified: false,
    };

    // First insert succeeds
    let insertCount = 0;
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      insertCount++;
      if (insertCount === 1) {
        return callback(db);
      }
      // Second insert fails with unique constraint violation
      throw new Error('duplicate key value violates unique constraint "users_email_unique"');
    });

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockUser]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    // First registration succeeds
    const result1 = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      email,
      password,
      'First',
      baseUrl,
    );
    expect(result1.status).toBe('pending_verification');

    // Second registration fails due to unique constraint
    await expect(
      registerUser(db, emailService, TEST_CONFIG, email, password, 'Second', baseUrl),
    ).rejects.toThrow('duplicate key value violates unique constraint');
  });

  test('should handle simultaneous registration attempts gracefully', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const baseUrl = 'http://localhost:5173';

    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    // Different emails should all succeed
    const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

    let userCounter = 0;
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockImplementation(
      () =>
        ({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: `user-${++userCounter}`,
                email: emails[userCounter - 1],
                name: `User ${userCounter}`,
                role: 'user',
                emailVerified: false,
              },
            ]),
          }),
        }) as never,
    );

    const results = await Promise.all(
      emails.map((email, i) =>
        registerUser(db, emailService, TEST_CONFIG, email, 'Password123!', `User ${i}`, baseUrl),
      ),
    );

    results.forEach((result, i) => {
      expect(result.status).toBe('pending_verification');
      expect(result.email).toBe(emails[i]);
    });
  });
});

// ============================================================================
// Tests: UTF-8 Names
// ============================================================================

describe('UTF-8 Names', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSuccessfulRegistration = (db: ReturnType<typeof createMockDb>, name: string) => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@example.com',
            name,
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );
  };

  test('should accept names with emoji', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = 'John Doe 🎉';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'emoji@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept Chinese names', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = '张三丰';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'chinese@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept Japanese names', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = '田中太郎';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'japanese@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept Korean names', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = '김철수';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'korean@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept Arabic names', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = 'محمد أحمد';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'arabic@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept Hebrew names', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = 'דוד כהן';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'hebrew@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept names with diacritics', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = 'José García Martínez';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'diacritics@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept mixed script names', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = 'John 田中 Müller 김 😊';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'mixed@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept Cyrillic names', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = 'Иван Петров';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'cyrillic@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept Thai names', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const name = 'สมชาย ใจดี';
    const baseUrl = 'http://localhost:5173';

    setupSuccessfulRegistration(db, name);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'thai@example.com',
      'SecurePassword123!',
      name,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });
});

// ============================================================================
// Tests: Password Boundary Conditions
// ============================================================================

describe('Password Boundary Conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupRegistrationMocks = (db: ReturnType<typeof createMockDb>, passwordValid: boolean) => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: passwordValid,
      errors: passwordValid ? [] : ['Password too weak'],
      score: passwordValid ? 4 : 1,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: passwordValid ? 'centuries' : 'instant',
    });

    if (passwordValid) {
      vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test',
              role: 'user',
              emailVerified: false,
            },
          ]),
        }),
      } as never);

      const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
        Buffer.from(mockTokenHex, 'hex'),
      );
    }
  };

  test('should accept password at exactly minimum length (8 characters)', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const password = 'Abc123!@'; // Exactly 8 characters
    const baseUrl = 'http://localhost:5173';

    setupRegistrationMocks(db, true);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'min@example.com',
      password,
      'Test',
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
    expect(validatePassword).toHaveBeenCalledWith(password, ['min@example.com', 'Test']);
  });

  test('should accept password at exactly maximum length (64 characters)', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const password = 'Abc123!@' + 'x'.repeat(56); // Exactly 64 characters
    const baseUrl = 'http://localhost:5173';

    setupRegistrationMocks(db, true);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'max@example.com',
      password,
      'Test',
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should reject password below minimum length', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const password = 'Abc12!@'; // 7 characters - below minimum
    const baseUrl = 'http://localhost:5173';

    setupRegistrationMocks(db, false);

    await expect(
      registerUser(db, emailService, TEST_CONFIG, 'short@example.com', password, 'Test', baseUrl),
    ).rejects.toThrow(WeakPasswordError);
  });

  test('should accept Unicode passwords', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const password = '密码Пароль🔐123!'; // Unicode with emoji
    const baseUrl = 'http://localhost:5173';

    setupRegistrationMocks(db, true);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'unicode@example.com',
      password,
      'Test',
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
    expect(hashPassword).toHaveBeenCalledWith(password, TEST_CONFIG.argon2);
  });

  test('should accept passwords with all special characters', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const password = 'Test!@#$%^&*()_+-=[]{}|;:,.<>?';
    const baseUrl = 'http://localhost:5173';

    setupRegistrationMocks(db, true);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'special@example.com',
      password,
      'Test',
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should accept passwords with whitespace', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const password = 'Pass word 123!'; // Contains spaces
    const baseUrl = 'http://localhost:5173';

    setupRegistrationMocks(db, true);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'space@example.com',
      password,
      'Test',
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should hash passwords consistently', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const password = 'SecurePassword123!';
    const baseUrl = 'http://localhost:5173';

    setupRegistrationMocks(db, true);

    await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'hash@example.com',
      password,
      'Test',
      baseUrl,
    );

    expect(hashPassword).toHaveBeenCalledWith(password, TEST_CONFIG.argon2);
  });
});

// ============================================================================
// Tests: Email Normalization
// ============================================================================

describe('Email Normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should treat emails as case-sensitive during lookup', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const baseUrl = 'http://localhost:5173';

    // Email lookup should be performed as provided
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'TEST@EXAMPLE.COM',
            name: 'Test',
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'TEST@EXAMPLE.COM',
      'SecurePassword123!',
      'Test',
      baseUrl,
    );

    expect(result.email).toBe('TEST@EXAMPLE.COM');
  });

  test('should handle plus-addressed emails', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'test+tag@example.com';
    const baseUrl = 'http://localhost:5173';

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email,
            name: 'Test',
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      email,
      'SecurePassword123!',
      'Test',
      baseUrl,
    );

    expect(result.email).toBe(email);
  });

  test('should handle internationalized email domains', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'user@münchen.example'; // Internationalized domain
    const baseUrl = 'http://localhost:5173';

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email,
            name: 'Test',
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      email,
      'SecurePassword123!',
      'Test',
      baseUrl,
    );

    expect(result.email).toBe(email);
  });
});

// ============================================================================
// Tests: SQL Injection Prevention
// ============================================================================

describe('SQL Injection Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupRegistrationWithMaliciousInput = (db: ReturnType<typeof createMockDb>) => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test',
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );
  };

  test('should safely handle SQL injection in email', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const maliciousEmail = "test@example.com'; DROP TABLE users; --";
    const baseUrl = 'http://localhost:5173';

    setupRegistrationWithMaliciousInput(db);

    // The ORM/parameterized queries should safely handle this
    // In a real scenario, the email validation would reject this format
    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      maliciousEmail,
      'SecurePassword123!',
      'Test',
      baseUrl,
    );

    // Registration should proceed normally (ORM escapes the input)
    expect(result.status).toBe('pending_verification');
  });

  test('should safely handle SQL injection in name field', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const maliciousName = "Robert'); DROP TABLE users;--";
    const baseUrl = 'http://localhost:5173';

    setupRegistrationWithMaliciousInput(db);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'test@example.com',
      'SecurePassword123!',
      maliciousName,
      baseUrl,
    );

    // Registration should succeed with escaped name
    expect(result.status).toBe('pending_verification');
  });

  test('should safely handle SQL injection in password', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const maliciousPassword = "Pass123!'; DELETE FROM users; --";
    const baseUrl = 'http://localhost:5173';

    setupRegistrationWithMaliciousInput(db);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'test@example.com',
      maliciousPassword,
      'Test',
      baseUrl,
    );

    // Password gets hashed, so injection is neutralized
    expect(result.status).toBe('pending_verification');
    expect(hashPassword).toHaveBeenCalledWith(maliciousPassword, TEST_CONFIG.argon2);
  });

  test('should safely handle UNION-based SQL injection', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const maliciousEmail = "' UNION SELECT * FROM users WHERE '1'='1";
    const baseUrl = 'http://localhost:5173';

    setupRegistrationWithMaliciousInput(db);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      maliciousEmail,
      'SecurePassword123!',
      'Test',
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });
});

// ============================================================================
// Tests: XSS Prevention
// ============================================================================

describe('XSS Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupRegistrationWithXSSInput = (db: ReturnType<typeof createMockDb>, name: string) => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@example.com',
            name, // Store the input as-is (sanitization happens at render)
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );
  };

  test('should store script tags in name field (sanitization at render)', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const xssName = '<script>alert("XSS")</script>';
    const baseUrl = 'http://localhost:5173';

    setupRegistrationWithXSSInput(db, xssName);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'xss@example.com',
      'SecurePassword123!',
      xssName,
      baseUrl,
    );

    // Registration succeeds - XSS prevention is at the rendering layer
    expect(result.status).toBe('pending_verification');
  });

  test('should handle event handler injection in name', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const xssName = '<img src="x" onerror="alert(1)">';
    const baseUrl = 'http://localhost:5173';

    setupRegistrationWithXSSInput(db, xssName);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'event@example.com',
      'SecurePassword123!',
      xssName,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should handle JavaScript URI in name', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const xssName = 'javascript:alert("XSS")';
    const baseUrl = 'http://localhost:5173';

    setupRegistrationWithXSSInput(db, xssName);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'jsuri@example.com',
      'SecurePassword123!',
      xssName,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should handle HTML entity encoding bypass', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const xssName = '&#60;script&#62;alert("XSS")&#60;/script&#62;';
    const baseUrl = 'http://localhost:5173';

    setupRegistrationWithXSSInput(db, xssName);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'entity@example.com',
      'SecurePassword123!',
      xssName,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should handle SVG-based XSS in name', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const xssName = '<svg onload="alert(1)">';
    const baseUrl = 'http://localhost:5173';

    setupRegistrationWithXSSInput(db, xssName);

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'svg@example.com',
      'SecurePassword123!',
      xssName,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });
});

// ============================================================================
// Tests: Email Service Failures
// ============================================================================

describe('Email Service Failures During Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should throw EmailSendError when verification email fails', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const baseUrl = 'http://localhost:5173';

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test',
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    // Email service fails
    vi.mocked(emailService.send).mockRejectedValue(new Error('SMTP connection refused'));

    await expect(
      registerUser(
        db,
        emailService,
        TEST_CONFIG,
        'test@example.com',
        'SecurePassword123!',
        'Test',
        baseUrl,
      ),
    ).rejects.toThrow(EmailSendError);
  });

  test('should include original error in EmailSendError', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const baseUrl = 'http://localhost:5173';

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test',
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    const originalError = new Error('SMTP timeout');
    vi.mocked(emailService.send).mockRejectedValue(originalError);

    try {
      await registerUser(
        db,
        emailService,
        TEST_CONFIG,
        'test@example.com',
        'SecurePassword123!',
        'Test',
        baseUrl,
      );
      expect.fail('Should have thrown EmailSendError');
    } catch (error) {
      expect(error).toBeInstanceOf(EmailSendError);
      expect((error as EmailSendError).originalError?.message).toBe('SMTP timeout');
    }
  });
});

// ============================================================================
// Tests: Edge Cases
// ============================================================================

describe('Registration Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should require baseUrl for registration', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test',
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    // Missing baseUrl
    await expect(
      registerUser(
        db,
        emailService,
        TEST_CONFIG,
        'test@example.com',
        'SecurePassword123!',
        'Test',
        undefined,
      ),
    ).rejects.toThrow('baseUrl is required');
  });

  test('should handle registration without optional name', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const baseUrl = 'http://localhost:5173';

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email: 'test@example.com',
            name: null,
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    const result = await registerUser(
      db,
      emailService,
      TEST_CONFIG,
      'noname@example.com',
      'SecurePassword123!',
      undefined,
      baseUrl,
    );

    expect(result.status).toBe('pending_verification');
  });

  test('should pass email and name to password validation for dictionary checks', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'john@example.com';
    const name = 'John Doe';
    const baseUrl = 'http://localhost:5173';

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'user-123',
            email,
            name,
            role: 'user',
            emailVerified: false,
          },
        ]),
      }),
    } as never);

    const mockTokenHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    (vi.mocked(randomBytes) as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from(mockTokenHex, 'hex'),
    );

    await registerUser(db, emailService, TEST_CONFIG, email, 'SecurePassword123!', name, baseUrl);

    // Verify password validation includes user inputs for dictionary check
    expect(validatePassword).toHaveBeenCalledWith('SecurePassword123!', [email, name]);
  });

  test('should reject weak password that contains email', async () => {
    const db = createMockDb();
    const emailService = createMockEmailService();
    const email = 'john@example.com';
    const password = 'john@example.com123!'; // Contains email
    const baseUrl = 'http://localhost:5173';

    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: false,
      errors: ['Password must not contain your email'],
      score: 1,
      feedback: { warning: 'Password contains personal info', suggestions: [] },
      crackTimeDisplay: 'instant',
    });

    await expect(
      registerUser(db, emailService, TEST_CONFIG, email, password, 'John', baseUrl),
    ).rejects.toThrow(WeakPasswordError);
  });
});
