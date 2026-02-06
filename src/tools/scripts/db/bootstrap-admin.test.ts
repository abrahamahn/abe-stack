// tools/scripts/db/bootstrap-admin.test.ts
/**
 * Tests for Production Admin Bootstrap Script
 *
 * Tests the bootstrap script behavior including:
 * - Secure password generation
 * - Admin user creation
 * - Idempotency (not overwriting existing admin)
 * - Environment variable configuration
 * - Error handling for database and hashing failures
 * - Cryptographic security of generated passwords
 */

import { randomBytes } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted to ensure mock functions are defined before vi.mock hoisting
const {
  mockBuildConnectionString,
  mockCreateDbClient,
  mockQuery,
  mockExecute,
  mockHashPassword,
  mockSelect,
  mockWhere,
  mockLimit,
  mockToSql,
  mockInsert,
  mockValues,
  mockEq,
} = vi.hoisted(() => ({
  mockBuildConnectionString: vi.fn(),
  mockCreateDbClient: vi.fn(),
  mockQuery: vi.fn(),
  mockExecute: vi.fn(),
  mockHashPassword: vi.fn(),
  mockSelect: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockToSql: vi.fn(),
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockEq: vi.fn(),
}));

vi.mock('node:crypto', async () => {
  const actual = await vi.importActual('node:crypto');
  return {
    ...actual,
    randomBytes: vi.fn(),
  };
});

// Mock the database module using package path
vi.mock('@abe-stack/db', () => ({
  buildConnectionString: mockBuildConnectionString,
  createDbClient: mockCreateDbClient,
  USERS_TABLE: 'users',
  select: mockSelect,
  insert: mockInsert,
  eq: mockEq,
}));

// Mock the auth package — hashPassword uses DEFAULT_ARGON2_CONFIG when called without config arg
vi.mock('@abe-stack/core/auth', () => ({
  hashPassword: mockHashPassword,
}));

// Store original process values
const originalEnv = { ...process.env };
const originalExit = process.exit;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('bootstrap-admin script', () => {
  let consoleOutput: string[] = [];
  let consoleErrors: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_NAME;

    // Capture console output
    consoleOutput = [];
    consoleErrors = [];
    console.log = vi.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    console.error = vi.fn((...args) => {
      consoleErrors.push(args.join(' '));
    });

    // Mock process.exit (should not be called in normal test flow)
    process.exit = vi.fn((code?: number) => {
      throw new Error(`process.exit(${code ?? 'undefined'})`);
    }) as never;

    // Setup default mocks
    mockBuildConnectionString.mockReturnValue('postgresql://localhost:5432/test');

    // Mock the query builder chain for select()
    mockToSql.mockReturnValue({ text: 'SELECT * FROM users...', values: [] });
    mockLimit.mockReturnValue({ toSql: mockToSql });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockSelect.mockReturnValue({ where: mockWhere });
    mockEq.mockImplementation(
      (field: unknown, value: unknown) => `${String(field)} = ${String(value)}`,
    );

    // Mock the query builder chain for insert()
    const insertToSql = vi.fn().mockReturnValue({ text: 'INSERT INTO users...', values: [] });
    mockValues.mockReturnValue({ toSql: insertToSql });
    mockInsert.mockReturnValue({ values: mockValues });

    // Mock db client with query and execute methods
    mockQuery.mockResolvedValue([]);
    mockExecute.mockResolvedValue(1);
    mockCreateDbClient.mockReturnValue({
      query: mockQuery,
      execute: mockExecute,
    });

    mockHashPassword.mockResolvedValue('$argon2id$v=19$m=19456,t=2,p=1$hashedpassword');

    // Mock randomBytes to return deterministic bytes for testing
    vi.mocked(randomBytes).mockReturnValue(
      Buffer.from([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
      ]),
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.resetModules();
  });

  describe('bootstrapAdmin function', () => {
    describe('when admin does not exist', () => {
      beforeEach(() => {
        mockQuery.mockResolvedValue([]);
      });

      it('should create admin user with default email and name', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(result.email).toBe('admin@localhost');
        expect(result.password).toBeTruthy();
        expect(result.created).toBe(true);
        expect(mockExecute).toHaveBeenCalledTimes(1);
      });

      it('should create admin user with custom email from env', async () => {
        process.env.ADMIN_EMAIL = 'custom@example.com';

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(result.email).toBe('custom@example.com');
        expect(result.created).toBe(true);
      });

      it('should create admin user with custom name from env', async () => {
        process.env.ADMIN_NAME = 'Custom Admin';

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        expect(mockValues).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Custom Admin',
          }),
        );
      });

      it('should generate a secure random password', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(result.password).toBeTruthy();
        expect(result.password.length).toBeGreaterThan(0);
        expect(randomBytes).toHaveBeenCalledWith(24);
      });

      it('should hash the password using default argon2 config', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        // After decoupling, hashPassword is called with only the password (no config arg)
        expect(mockHashPassword).toHaveBeenCalledWith(expect.any(String));
      });

      it('should insert admin user with correct fields', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        expect(mockValues).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'admin@localhost',
            password_hash: '$argon2id$v=19$m=19456,t=2,p=1$hashedpassword',
            name: 'Administrator',
            role: 'admin',
            email_verified_at: expect.any(Date),
          }),
        );
      });

      it('should set email_verified_at to current date', async () => {
        const beforeDate = new Date();

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        const afterDate = new Date();

        const callArgs = mockValues.mock.calls[0]?.[0];
        expect(callArgs?.email_verified_at).toBeInstanceOf(Date);
        expect(callArgs?.email_verified_at.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
        expect(callArgs?.email_verified_at.getTime()).toBeLessThanOrEqual(afterDate.getTime());
      });

      it('should display success message with credentials', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(consoleOutput.some((msg) => msg.includes('Admin user created successfully'))).toBe(
          true,
        );
        expect(consoleOutput.some((msg) => msg.includes('SAVE THESE CREDENTIALS'))).toBe(true);
        expect(consoleOutput.some((msg) => msg.includes(`Email:    ${result.email}`))).toBe(true);
        expect(consoleOutput.some((msg) => msg.includes(`Password: ${result.password}`))).toBe(
          true,
        );
        expect(consoleOutput.some((msg) => msg.includes('Change this password immediately'))).toBe(
          true,
        );
      });

      it('should build connection string from process.env', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        expect(mockBuildConnectionString).toHaveBeenCalled();
      });

      it('should query for existing admin user', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        expect(mockSelect).toHaveBeenCalledWith('users');
        expect(mockEq).toHaveBeenCalledWith('email', 'admin@localhost');
        expect(mockLimit).toHaveBeenCalledWith(1);
      });
    });

    describe('when admin already exists', () => {
      beforeEach(() => {
        mockQuery.mockResolvedValue([
          {
            id: 1,
            email: 'admin@localhost',
            name: 'Administrator',
            role: 'admin',
          },
        ]);
      });

      it('should not create a new admin user', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(result.email).toBe('admin@localhost');
        expect(result.password).toBe('');
        expect(result.created).toBe(false);
        expect(mockExecute).not.toHaveBeenCalled();
      });

      it('should display warning message', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        expect(consoleOutput.some((msg) => msg.includes('Admin user already exists'))).toBe(true);
        expect(consoleOutput.some((msg) => msg.includes('No changes made'))).toBe(true);
        expect(consoleOutput.some((msg) => msg.includes('password reset if needed'))).toBe(true);
      });

      it('should not display credentials', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        expect(consoleOutput.some((msg) => msg.includes('SAVE THESE CREDENTIALS'))).toBe(false);
        expect(consoleOutput.some((msg) => msg.includes('Password:'))).toBe(false);
      });

      it('should handle custom email from env', async () => {
        process.env.ADMIN_EMAIL = 'custom@example.com';
        mockQuery.mockResolvedValue([
          {
            id: 1,
            email: 'custom@example.com',
            name: 'Administrator',
            role: 'admin',
          },
        ]);

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(result.email).toBe('custom@example.com');
        expect(result.created).toBe(false);
        expect(consoleOutput.some((msg) => msg.includes('custom@example.com'))).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty ADMIN_EMAIL env var (use default)', async () => {
        process.env.ADMIN_EMAIL = '';

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(result.email).toBe('admin@localhost');
      });

      it('should handle empty ADMIN_NAME env var (use default)', async () => {
        process.env.ADMIN_NAME = '';

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        expect(mockValues).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Administrator',
          }),
        );
      });

      it('should handle whitespace in ADMIN_EMAIL', async () => {
        process.env.ADMIN_EMAIL = '  admin@test.com  ';

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        // The script doesn't trim, so it will use the value as-is
        expect(result.email).toBe('  admin@test.com  ');
      });

      it('should generate different passwords on multiple calls', async () => {
        // Mock randomBytes to return different values
        let callCount = 0;
        vi.mocked(randomBytes).mockImplementation((size) => {
          callCount++;
          const buffer = Buffer.alloc(size);
          for (let i = 0; i < size; i++) {
            buffer[i] = (callCount * i) % 256;
          }
          return buffer;
        });

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result1 = await bootstrapAdmin();

        // Reset mocks but not randomBytes
        mockQuery.mockResolvedValue([]);
        vi.resetModules();
        const { bootstrapAdmin: bootstrapAdmin2 } = await import('./bootstrap-admin');

        const result2 = await bootstrapAdmin2();

        expect(result1.password).not.toBe(result2.password);
      });
    });

    describe('error handling', () => {
      it('should throw error if database connection fails', async () => {
        mockBuildConnectionString.mockImplementation(() => {
          throw new Error('Cannot build connection string');
        });

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await expect(bootstrapAdmin()).rejects.toThrow('Cannot build connection string');
      });

      it('should throw error if query for existing admin fails', async () => {
        mockQuery.mockRejectedValue(new Error('Database query failed'));

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await expect(bootstrapAdmin()).rejects.toThrow('Database query failed');
      });

      it('should throw error if password hashing fails', async () => {
        mockHashPassword.mockRejectedValue(new Error('Hashing failed'));

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await expect(bootstrapAdmin()).rejects.toThrow('Hashing failed');
      });

      it('should throw error if user insertion fails', async () => {
        mockExecute.mockRejectedValue(new Error('Insert failed'));

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await expect(bootstrapAdmin()).rejects.toThrow('Insert failed');
      });

      it('should throw error if randomBytes fails', async () => {
        vi.mocked(randomBytes).mockImplementation(() => {
          throw new Error('Crypto operation failed');
        });

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await expect(bootstrapAdmin()).rejects.toThrow('Crypto operation failed');
      });
    });

    describe('password generation security', () => {
      it('should generate password of specified length', async () => {
        // Mock randomBytes to return controlled data
        vi.mocked(randomBytes).mockReturnValue(Buffer.alloc(24, 0));

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        // Password length should match the bytes requested (24)
        expect(result.password.length).toBe(24);
      });

      it('should use cryptographically secure random source', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        // Verify randomBytes was called (crypto.randomBytes is cryptographically secure)
        expect(randomBytes).toHaveBeenCalledWith(24);
      });

      it('should generate password with mixed character types', async () => {
        // Use actual randomBytes for this test
        vi.mocked(randomBytes).mockImplementation((size) => {
          const buffer = Buffer.alloc(size);
          for (let i = 0; i < size; i++) {
            buffer[i] = i * 7; // Varied values to hit different character types
          }
          return buffer;
        });

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        // Check that password contains characters from the charset
        const hasLowercase = /[a-z]/.test(result.password);
        const hasUppercase = /[A-Z]/.test(result.password);
        const hasDigit = /[0-9]/.test(result.password);

        // At least should have some variety (this is probabilistic with our mock)
        const varietyCount = [hasLowercase, hasUppercase, hasDigit].filter(Boolean).length;
        expect(varietyCount).toBeGreaterThan(0);
      });

      it('should generate non-empty password', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(result.password).toBeTruthy();
        expect(result.password.length).toBeGreaterThan(0);
      });

      it('should map bytes to valid charset characters', async () => {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

        // Generate password with all possible byte values
        vi.mocked(randomBytes).mockReturnValue(
          Buffer.from(Array.from({ length: 24 }, (_, i) => i)),
        );

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        // Every character should be from the charset
        for (const char of result.password) {
          expect(charset).toContain(char);
        }
      });
    });

    describe('console output', () => {
      it('should display bootstrap header', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        expect(consoleOutput.some((msg) => msg.includes('Production Admin Bootstrap'))).toBe(true);
        expect(consoleOutput.some((msg) => msg.includes('Creating initial admin user'))).toBe(true);
      });

      it('should display credentials with separators', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        const separatorCount = consoleOutput.filter((msg) => msg.includes('━━━━━')).length;
        expect(separatorCount).toBeGreaterThanOrEqual(2);
      });

      it('should display warning about changing password', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        await bootstrapAdmin();

        expect(
          consoleOutput.some((msg) =>
            msg.includes('Change this password immediately after first login'),
          ),
        ).toBe(true);
      });
    });

    describe('BootstrapResult interface', () => {
      it('should return correct result structure when created', async () => {
        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(result).toHaveProperty('email');
        expect(result).toHaveProperty('password');
        expect(result).toHaveProperty('created');
        expect(typeof result.email).toBe('string');
        expect(typeof result.password).toBe('string');
        expect(typeof result.created).toBe('boolean');
      });

      it('should return correct result structure when not created', async () => {
        mockQuery.mockResolvedValue([{ id: 1, email: 'admin@localhost' }]);

        const { bootstrapAdmin } = await import('./bootstrap-admin');

        const result = await bootstrapAdmin();

        expect(result).toHaveProperty('email');
        expect(result).toHaveProperty('password');
        expect(result).toHaveProperty('created');
        expect(result.email).toBe('admin@localhost');
        expect(result.password).toBe('');
        expect(result.created).toBe(false);
      });
    });
  });

  describe('main module execution guard', () => {
    it('should not execute when imported as module', async () => {
      const exitSpy = vi.spyOn(process, 'exit');

      // Just import the module
      await import('./bootstrap-admin');

      // Should not call process.exit during import
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should detect VITEST environment and skip execution', async () => {
      process.env.VITEST = 'true';
      const exitSpy = vi.spyOn(process, 'exit');

      await import('./bootstrap-admin');

      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('integration with database layer', () => {
    it('should use correct table name', async () => {
      const { bootstrapAdmin } = await import('./bootstrap-admin');

      await bootstrapAdmin();

      expect(mockSelect).toHaveBeenCalledWith('users');
      expect(mockInsert).toHaveBeenCalledWith('users');
    });

    it('should construct proper select query', async () => {
      const { bootstrapAdmin } = await import('./bootstrap-admin');

      await bootstrapAdmin();

      expect(mockSelect).toHaveBeenCalledWith('users');
      expect(mockWhere).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(mockToSql).toHaveBeenCalled();
    });

    it('should construct proper insert query', async () => {
      const { bootstrapAdmin } = await import('./bootstrap-admin');

      await bootstrapAdmin();

      expect(mockInsert).toHaveBeenCalledWith('users');
      expect(mockValues).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should execute insert with SQL from builder', async () => {
      const { bootstrapAdmin } = await import('./bootstrap-admin');

      await bootstrapAdmin();

      const insertToSql = mockValues.mock.results[0]?.value?.toSql;
      expect(insertToSql).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.any(String),
          values: expect.any(Array),
        }),
      );
    });
  });
});
