// main/tools/scripts/db/seed.test.ts
/**
 * Tests for Database Seed Script
 *
 * Tests the seed script behavior including:
 * - Production environment safety check
 * - User seeding logic
 * - Error handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted() to ensure mock functions are available when vi.mock factory runs
const { mockBuildConnectionString, mockCreateDbClient, mockExecute, mockClose, mockHashPassword } =
  vi.hoisted(() => ({
    mockBuildConnectionString: vi.fn(),
    mockCreateDbClient: vi.fn(),
    mockExecute: vi.fn(),
    mockClose: vi.fn(),
    mockHashPassword: vi.fn(),
  }));

// Mock the database module using package path
vi.mock('@bslt/db', () => ({
  buildConnectionString: mockBuildConnectionString,
  createDbClient: mockCreateDbClient,
  USERS_TABLE: 'users',
}));

// Mock the auth package — hashPassword uses DEFAULT_ARGON2_CONFIG when called without config arg
vi.mock('@bslt/core/auth', () => ({
  hashPassword: mockHashPassword,
}));

// Mock canonicalizeEmail — just lowercase for tests
vi.mock('@bslt/shared', () => ({
  canonicalizeEmail: (email: string) => email.toLowerCase(),
}));

// Mock server-system env loader
vi.mock('@bslt/server-system', () => ({
  loadServerEnv: vi.fn(),
}));

// Store original process values
const originalEnv = { ...process.env };
const originalExit = process.exit;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('seed script', () => {
  let consoleOutput: string[] = [];
  let consoleErrors: string[] = [];
  let exitCode: number | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;

    // Capture console output
    consoleOutput = [];
    consoleErrors = [];
    console.log = vi.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    console.error = vi.fn((...args) => {
      consoleErrors.push(args.join(' '));
    });

    // Mock process.exit
    exitCode = undefined;
    process.exit = vi.fn((code?: number) => {
      exitCode = code;
      throw new Error(`process.exit(${code ?? 'undefined'})`);
    }) as never;

    // Setup default mocks
    mockBuildConnectionString.mockReturnValue('postgresql://localhost:5432/test');

    // Mock db client with execute method
    mockExecute.mockResolvedValue(1);
    mockClose.mockResolvedValue(undefined);
    mockCreateDbClient.mockReturnValue({ execute: mockExecute, close: mockClose });

    mockHashPassword.mockResolvedValue('$argon2id$hashed');
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.resetModules();
  });

  describe('production safety check', () => {
    it('should refuse to run in production environment', async () => {
      process.env.NODE_ENV = 'production';

      // Import the seed function directly
      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(1)');

      expect(exitCode).toBe(1);
      expect(
        consoleErrors.some((msg) => msg.includes('Cannot run seed script in production')),
      ).toBe(true);
    });

    it('should display security warning in production', async () => {
      process.env.NODE_ENV = 'production';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(1)');

      expect(consoleErrors.some((msg) => msg.includes('hardcoded test passwords'))).toBe(true);
      expect(consoleErrors.some((msg) => msg.includes('development environments only'))).toBe(true);
    });
  });

  describe('successful seeding', () => {
    it('should seed users in development environment', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(exitCode).toBe(0);
      expect(mockBuildConnectionString).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should seed all three test users', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      // Should have called execute 3 times (once for each user)
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should hash passwords using default argon2 config', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(mockHashPassword).toHaveBeenCalledTimes(3);
      // After decoupling, hashPassword is called with only the password (no config arg)
      expect(mockHashPassword).toHaveBeenCalledWith('password123');
    });

    it('should include canonical_email in INSERT', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      // Each execute call should include SQL with canonical_email
      const firstCall = mockExecute.mock.calls[0]?.[0] as { text: string; values: string[] };
      expect(firstCall.text).toContain('canonical_email');
      expect(firstCall.values).toContain('admin@example.com'); // canonical form
    });

    it('should include email_verified in INSERT', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      const firstCall = mockExecute.mock.calls[0]?.[0] as { text: string };
      expect(firstCall.text).toContain('email_verified');
      expect(firstCall.text).toContain('true');
    });

    it('should seed admin user with correct values', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      const adminCall = mockExecute.mock.calls[0]?.[0] as { values: string[] };
      expect(adminCall.values).toContain('admin@example.com');
      expect(adminCall.values).toContain('$argon2id$hashed');
      expect(adminCall.values).toContain('Admin User');
      expect(adminCall.values).toContain('admin');
    });

    it('should seed regular users with user role', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      const userCall = mockExecute.mock.calls[1]?.[0] as { values: string[] };
      expect(userCall.values).toContain('user@example.com');
      expect(userCall.values).toContain('user');

      const demoCall = mockExecute.mock.calls[2]?.[0] as { values: string[] };
      expect(demoCall.values).toContain('demo@example.com');
      expect(demoCall.values).toContain('user');
    });

    it('should use ON CONFLICT DO UPDATE to backfill existing users', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      const firstCall = mockExecute.mock.calls[0]?.[0] as { text: string };
      expect(firstCall.text).toContain('ON CONFLICT');
      expect(firstCall.text).toContain('DO UPDATE SET');
      expect(firstCall.text).toContain('canonical_email');
    });

    it('should display success message after seeding', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(consoleOutput.some((msg) => msg.includes('Database seeded successfully'))).toBe(true);
      expect(consoleOutput.some((msg) => msg.includes('Test credentials'))).toBe(true);
    });

    it('should display seeding progress', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(consoleOutput.some((msg) => msg.includes('Starting database seed'))).toBe(true);
      expect(consoleOutput.some((msg) => msg.includes('Seeding users'))).toBe(true);
    });

    it('should run with undefined NODE_ENV (defaults to non-production)', async () => {
      delete process.env.NODE_ENV;

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should fail seed when any user insert fails', async () => {
      process.env.NODE_ENV = 'development';

      // Second user throws error
      let callCount = 0;
      mockExecute.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('unique constraint violation'));
        }
        return Promise.resolve(1);
      });

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('Seed failed for 1 user(s): user@example.com');
      // 3 calls: first and third succeed, second throws
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should handle database connection errors', async () => {
      process.env.NODE_ENV = 'development';

      mockCreateDbClient.mockImplementation(() => {
        throw new Error('Cannot connect to database');
      });

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('Cannot connect to database');
    });

    it('should handle password hashing errors', async () => {
      process.env.NODE_ENV = 'development';

      mockHashPassword.mockRejectedValue(new Error('Hashing failed'));

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow(
        'Seed failed for 3 user(s): admin@example.com, user@example.com, demo@example.com',
      );
    });
  });

  describe('test users configuration', () => {
    it('should use expected test credentials', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      // Verify all expected users are seeded via execute calls
      const emails = mockExecute.mock.calls.map(
        (call) => (call[0] as { values: string[] }).values[0],
      );

      expect(emails).toContain('admin@example.com');
      expect(emails).toContain('user@example.com');
      expect(emails).toContain('demo@example.com');
    });

    it('should use the same password for all test users', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('./seed');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      // All calls should use 'password123' (no config arg after decoupling)
      expect(mockHashPassword).toHaveBeenNthCalledWith(1, 'password123');
      expect(mockHashPassword).toHaveBeenNthCalledWith(2, 'password123');
      expect(mockHashPassword).toHaveBeenNthCalledWith(3, 'password123');
    });
  });

  describe('TEST_USERS export', () => {
    it('should export TEST_USERS array with correct structure', async () => {
      const { TEST_USERS } = await import('./seed');

      expect(TEST_USERS).toHaveLength(3);

      for (const user of TEST_USERS) {
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('password');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('role');
        expect(['user', 'admin']).toContain(user.role);
      }
    });

    it('should have admin user with admin role', async () => {
      const { TEST_USERS } = await import('./seed');

      const adminUser = TEST_USERS.find((u) => u.email === 'admin@example.com');
      expect(adminUser).toBeDefined();
      expect(adminUser?.role).toBe('admin');
    });

    it('should have user and demo with user role', async () => {
      const { TEST_USERS } = await import('./seed');

      const testUser = TEST_USERS.find((u) => u.email === 'user@example.com');
      const demoUser = TEST_USERS.find((u) => u.email === 'demo@example.com');

      expect(testUser?.role).toBe('user');
      expect(demoUser?.role).toBe('user');
    });
  });

  describe('SeedUser interface', () => {
    it('should export SeedUser type for external use', async () => {
      // This test verifies the type is exported and usable
      const seedModule = await import('./seed');
      type SeedUserType = (typeof seedModule.TEST_USERS)[number];

      const testUser: SeedUserType = {
        email: 'test@test.com',
        password: 'test',
        name: 'Test',
        role: 'user',
      };

      expect(testUser).toBeDefined();
      // Also verify the export exists at runtime
      expect(seedModule.TEST_USERS).toBeDefined();
    });
  });
});
