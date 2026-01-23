// apps/server/src/scripts/__tests__/seed.test.ts
/**
 * Tests for Database Seed Script
 *
 * Tests the seed script behavior including:
 * - Production environment safety check
 * - User seeding logic
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module
const mockLoadConfig = vi.fn();
const mockBuildConnectionString = vi.fn();
const mockCreateDbClient = vi.fn();
const mockExecute = vi.fn();
const mockHashPassword = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoNothing = vi.fn();
const mockToSql = vi.fn();

vi.mock('@config', () => ({
  loadConfig: mockLoadConfig,
}));

vi.mock('@database', () => ({
  buildConnectionString: mockBuildConnectionString,
  createDbClient: mockCreateDbClient,
  USERS_TABLE: 'users',
  insert: mockInsert,
}));

vi.mock('@modules/auth/utils/password', () => ({
  hashPassword: mockHashPassword,
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
      throw new Error(`process.exit(${code})`);
    }) as never;

    // Setup default mocks
    mockLoadConfig.mockReturnValue({
      auth: {
        argon2: {
          type: 2,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        },
      },
    });

    mockBuildConnectionString.mockReturnValue('postgresql://localhost:5432/test');

    // Mock the query builder chain for insert()
    mockToSql.mockReturnValue({ text: 'INSERT INTO users...', values: [] });
    mockOnConflictDoNothing.mockReturnValue({ toSql: mockToSql });
    mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
    mockInsert.mockReturnValue({ values: mockValues });

    // Mock db client with execute method
    mockExecute.mockResolvedValue(1);
    mockCreateDbClient.mockReturnValue({ execute: mockExecute });

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
      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(1)');

      expect(exitCode).toBe(1);
      expect(
        consoleErrors.some((msg) => msg.includes('Cannot run seed script in production')),
      ).toBe(true);
    });

    it('should display security warning in production', async () => {
      process.env.NODE_ENV = 'production';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(1)');

      expect(consoleErrors.some((msg) => msg.includes('hardcoded test passwords'))).toBe(true);
      expect(consoleErrors.some((msg) => msg.includes('development environments only'))).toBe(true);
    });
  });

  describe('successful seeding', () => {
    it('should seed users in development environment', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(exitCode).toBe(0);
      expect(mockLoadConfig).toHaveBeenCalled();
      expect(mockBuildConnectionString).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should seed all three test users', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      // Should have called execute 3 times (once for each user)
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should hash passwords with argon2 config', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(mockHashPassword).toHaveBeenCalledTimes(3);
      expect(mockHashPassword).toHaveBeenCalledWith('password123', {
        type: 2,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
    });

    it('should seed admin user with admin role', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          password_hash: '$argon2id$hashed',
        }),
      );
    });

    it('should seed regular users with user role', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          name: 'Test User',
          role: 'user',
        }),
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'demo@example.com',
          name: 'Demo User',
          role: 'user',
        }),
      );
    });

    it('should use onConflictDoNothing for existing users', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(3);
      expect(mockOnConflictDoNothing).toHaveBeenCalledWith('email');
    });

    it('should display success message after seeding', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(consoleOutput.some((msg) => msg.includes('Database seeded successfully'))).toBe(true);
      expect(consoleOutput.some((msg) => msg.includes('Test credentials'))).toBe(true);
    });

    it('should display seeding progress', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(consoleOutput.some((msg) => msg.includes('Starting database seed'))).toBe(true);
      expect(consoleOutput.some((msg) => msg.includes('Seeding users'))).toBe(true);
    });

    it('should run with undefined NODE_ENV (defaults to non-production)', async () => {
      delete process.env.NODE_ENV;

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle unique constraint errors gracefully', async () => {
      process.env.NODE_ENV = 'development';

      // First user succeeds, second throws unique error
      let callCount = 0;
      mockExecute.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('unique constraint violation'));
        }
        return Promise.resolve(1);
      });

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      expect(consoleOutput.some((msg) => msg.includes('already exists'))).toBe(true);
    });

    it('should rethrow non-unique errors', async () => {
      process.env.NODE_ENV = 'development';

      mockExecute.mockRejectedValue(new Error('Connection refused'));

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('Connection refused');
    });

    it('should handle database connection errors', async () => {
      process.env.NODE_ENV = 'development';

      mockCreateDbClient.mockImplementation(() => {
        throw new Error('Cannot connect to database');
      });

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('Cannot connect to database');
    });

    it('should handle config loading errors', async () => {
      process.env.NODE_ENV = 'development';

      mockLoadConfig.mockImplementation(() => {
        throw new Error('Invalid config');
      });

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('Invalid config');
    });

    it('should handle password hashing errors', async () => {
      process.env.NODE_ENV = 'development';

      mockHashPassword.mockRejectedValue(new Error('Hashing failed'));

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('Hashing failed');
    });
  });

  describe('test users configuration', () => {
    it('should use expected test credentials', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      // Verify all expected users are seeded
      const calls = mockValues.mock.calls.map((call) => call[0]);

      expect(calls).toContainEqual(
        expect.objectContaining({
          email: 'admin@example.com',
          role: 'admin',
        }),
      );

      expect(calls).toContainEqual(
        expect.objectContaining({
          email: 'user@example.com',
          role: 'user',
        }),
      );

      expect(calls).toContainEqual(
        expect.objectContaining({
          email: 'demo@example.com',
          role: 'user',
        }),
      );
    });

    it('should use the same password for all test users', async () => {
      process.env.NODE_ENV = 'development';

      const { seed } = await import('../seed.js');

      await expect(seed()).rejects.toThrow('process.exit(0)');

      // All calls should use 'password123'
      expect(mockHashPassword).toHaveBeenNthCalledWith(1, 'password123', expect.any(Object));
      expect(mockHashPassword).toHaveBeenNthCalledWith(2, 'password123', expect.any(Object));
      expect(mockHashPassword).toHaveBeenNthCalledWith(3, 'password123', expect.any(Object));
    });
  });

  describe('TEST_USERS export', () => {
    it('should export TEST_USERS array with correct structure', async () => {
      const { TEST_USERS } = await import('../seed.js');

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
      const { TEST_USERS } = await import('../seed.js');

      const adminUser = TEST_USERS.find((u) => u.email === 'admin@example.com');
      expect(adminUser).toBeDefined();
      expect(adminUser?.role).toBe('admin');
    });

    it('should have user and demo with user role', async () => {
      const { TEST_USERS } = await import('../seed.js');

      const testUser = TEST_USERS.find((u) => u.email === 'user@example.com');
      const demoUser = TEST_USERS.find((u) => u.email === 'demo@example.com');

      expect(testUser?.role).toBe('user');
      expect(demoUser?.role).toBe('user');
    });
  });

  describe('SeedUser interface', () => {
    it('should export SeedUser type for external use', async () => {
      // This test verifies the type is exported and usable
      const seedModule = await import('../seed.js');
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
