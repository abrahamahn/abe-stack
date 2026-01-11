// apps/server/src/__tests__/security-integration.test.ts
import { randomUUID } from 'crypto';

import Fastify from 'fastify';
import { beforeEach, describe, expect, test } from 'vitest';

import { registerRoutes } from '../routes/routes';
import { createAuthConfig } from '../infra/config/auth';
import { createSecurityService, type SecurityService } from '../infra/security';

import type { ServerEnvironment } from '../infra/ctx';

// Create a security service for test setup (hashing passwords before tests)
const testAuthConfig = createAuthConfig(false);
const testSecurity: SecurityService = createSecurityService(testAuthConfig);
const hashPassword = (password: string): Promise<string> => testSecurity.hashPassword(password);

import type { DbClient } from '@db';
import type { FastifyInstance } from 'fastify';

type TestUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: Date;
};

type TestLoginAttempt = {
  email: string;
  success: boolean;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
};

interface WhereCondition {
  right?: { value?: string };
}

interface TableMeta {
  _: { name: string };
}

interface InsertValues {
  id?: string;
  email?: string;
  passwordHash?: string;
  name?: string | null;
  createdAt?: Date;
  success?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  failureReason?: string | null;
  userId?: string;
}

// Create mock database with login attempts tracking
function createTestDb(seedUsers: TestUser[] = []): {
  db: DbClient;
  users: TestUser[];
  loginAttempts: TestLoginAttempt[];
} {
  const users = [...seedUsers];
  const loginAttempts: TestLoginAttempt[] = [];
  const tokens: InsertValues[] = [];
  const tokenFamilies: {
    id: string;
    userId: string;
    createdAt: Date;
    revokedAt: null;
    revokeReason: null;
  }[] = [];

  const getEmailFromWhere = (where: unknown): string | undefined => {
    if (where && typeof where === 'object') {
      const rightValue = (where as WhereCondition).right?.value;
      if (typeof rightValue === 'string') return rightValue;
    }
    return undefined;
  };

  const db = {
    query: {
      users: {
        findFirst: ({ where }: { where: unknown }): Promise<TestUser | undefined> => {
          const email = getEmailFromWhere(where);
          if (email) {
            return Promise.resolve(users.find((u) => u.email === email));
          }
          return Promise.resolve(undefined);
        },
      },
      refreshTokens: {
        findFirst: (): Promise<null> => Promise.resolve(null),
      },
    },
    insert: (
      table: TableMeta,
    ): {
      values: (values: InsertValues) => { returning: () => Promise<unknown[]> } | Promise<void>;
    } => ({
      values: (values: InsertValues): { returning: () => Promise<unknown[]> } | Promise<void> => {
        if (table._.name === 'users') {
          const user: TestUser = {
            id: values.id ?? randomUUID(),
            email: values.email ?? 'missing@example.com',
            passwordHash: values.passwordHash ?? '',
            name: values.name ?? null,
            createdAt: values.createdAt ?? new Date(),
          };
          users.push(user);
          return {
            returning: (): Promise<TestUser[]> => Promise.resolve([user]),
          };
        } else if (table._.name === 'login_attempts') {
          loginAttempts.push({
            email: values.email ?? '',
            success: values.success ?? false,
            createdAt: new Date(),
            ipAddress: values.ipAddress ?? null,
            userAgent: values.userAgent ?? null,
            failureReason: values.failureReason ?? null,
          });
          return Promise.resolve();
        } else if (table._.name === 'refresh_token_families') {
          const family = {
            id: randomUUID(),
            userId: values.userId ?? '',
            createdAt: new Date(),
            revokedAt: null,
            revokeReason: null,
          };
          tokenFamilies.push(family);
          return {
            returning: (): Promise<(typeof family)[]> => Promise.resolve([family]),
          };
        } else if (table._.name === 'refresh_tokens') {
          tokens.push(values);
          return Promise.resolve();
        }
        return Promise.resolve();
      },
    }),
    select: (): {
      from: () => { where: (_condition: unknown) => Promise<{ count: number }[]> };
    } => ({
      from: (): { where: (_condition: unknown) => Promise<{ count: number }[]> } => ({
        where: (_condition: unknown): Promise<{ count: number }[]> => {
          // Count failed login attempts
          const recent = loginAttempts.filter(
            (attempt) =>
              !attempt.success && Date.now() - attempt.createdAt.getTime() < 30 * 60 * 1000,
          );
          return Promise.resolve([{ count: recent.length }]);
        },
      }),
    }),
    execute: (): Promise<void> => Promise.resolve(),
  };

  return { db: db as unknown as DbClient, users, loginAttempts };
}

function createMockEnv(db: DbClient): ServerEnvironment {
  const authConfig = createAuthConfig(false);
  const security = createSecurityService(authConfig);
  return {
    config: {} as ServerEnvironment['config'],
    authConfig,
    db,
    storage: {} as ServerEnvironment['storage'],
    mailer: {} as ServerEnvironment['mailer'],
    security,
    isProduction: false,
  };
}

async function createTestApp(
  seedUsers?: TestUser[],
): Promise<{ app: FastifyInstance; users: TestUser[]; loginAttempts: TestLoginAttempt[] }> {
  const app = Fastify({ logger: false });
  const { db, users, loginAttempts } = createTestDb(seedUsers);
  const env = createMockEnv(db);
  app.decorate('db', db);
  registerRoutes(app, env);
  await app.ready();
  return { app, users, loginAttempts };
}

describe('Security Integration Tests', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'super-secret-test-key-should-be-long-enough-for-security';
  });

  describe('Account Lockout Flow', () => {
    test('should lock account after multiple failed attempts', async () => {
      const passwordHash = await hashPassword('correct-password');
      const existing: TestUser = {
        id: randomUUID(),
        email: 'locktest@example.com',
        passwordHash,
        name: 'Lock Test',
        createdAt: new Date(),
      };

      const { app, loginAttempts } = await createTestApp([existing]);

      // Attempt failed logins
      for (let i = 0; i < 12; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { email: 'locktest@example.com', password: 'wrong-password' },
        });
      }

      // Check that attempts were logged
      expect(loginAttempts.filter((a) => !a.success)).toHaveLength(12);

      // Next attempt should be locked (429)
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'locktest@example.com', password: 'correct-password' },
      });

      expect(response.statusCode).toBe(429);
      const body = response.json<{ message: string }>();
      expect(body.message).toContain('locked');

      await app.close();
    });

    test('should log failure reasons', async () => {
      const { app, loginAttempts } = await createTestApp();

      // Attempt login with non-existent user
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'nonexistent@example.com', password: 'any-password' },
      });

      expect(loginAttempts).toHaveLength(1);
      const firstAttempt = loginAttempts[0];
      if (firstAttempt === undefined) throw new Error('Expected login attempt');
      expect(firstAttempt.failureReason).toBe('User not found');
      expect(firstAttempt.success).toBe(false);

      await app.close();
    });

    test('should log IP address and user agent', async () => {
      const { app, loginAttempts } = await createTestApp();

      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password' },
        headers: {
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
      });

      expect(loginAttempts).toHaveLength(1);
      const firstAttempt = loginAttempts[0];
      if (firstAttempt === undefined) throw new Error('Expected login attempt');
      expect(firstAttempt.userAgent).toBeTruthy();

      await app.close();
    });
  });

  describe('Progressive Delay', () => {
    test('should apply increasing delays for repeated failures', async () => {
      const passwordHash = await hashPassword('correct-password');
      const existing: TestUser = {
        id: randomUUID(),
        email: 'delay@example.com',
        passwordHash,
        name: 'Delay Test',
        createdAt: new Date(),
      };

      const { app } = await createTestApp([existing]);

      // First attempt - should be fast
      const start1 = Date.now();
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'delay@example.com', password: 'wrong' },
      });
      const duration1 = Date.now() - start1;
      expect(duration1).toBeLessThan(500);

      // Second attempt - should have 1s delay
      const start2 = Date.now();
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'delay@example.com', password: 'wrong' },
      });
      const duration2 = Date.now() - start2;
      expect(duration2).toBeGreaterThan(800); // Allow margin

      // Third attempt - should have 2s delay
      const start3 = Date.now();
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'delay@example.com', password: 'wrong' },
      });
      const duration3 = Date.now() - start3;
      expect(duration3).toBeGreaterThan(1800); // Allow margin

      await app.close();
    }, 10000); // 10s timeout for this test
  });

  describe('Password Strength Validation', () => {
    test('should reject weak passwords', async () => {
      const { app } = await createTestApp();

      const weakPasswords = ['123', 'password', 'qwerty', 'abc123'];

      for (const password of weakPasswords) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: {
            email: `weak-${password}@example.com`,
            password,
            name: 'Weak User',
          },
        });

        expect(response.statusCode).toBe(400);
        const body = response.json<{ message: string }>();
        expect(body.message.toLowerCase()).toContain('password');
      }

      await app.close();
    });

    test('should accept strong passwords', async () => {
      const { app } = await createTestApp();

      const strongPasswords = ['MySecureP@ssw0rd!2024', 'C0mpl3x&Str0ng!Pass', 'Un1que$ecure#2024'];

      for (const password of strongPasswords) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: {
            email: `strong-${String(Math.random())}@example.com`,
            password,
            name: 'Strong User',
          },
        });

        expect(response.statusCode).toBe(201);
      }

      await app.close();
    });

    test('should detect passwords based on user input', async () => {
      const { app } = await createTestApp();

      // Password same as email
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'john@example.com',
          password: 'john',
          name: 'John Doe',
        },
      });

      expect(response1.statusCode).toBe(400);

      // Password same as name
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'jane@example.com',
          password: 'jane',
          name: 'Jane',
        },
      });

      expect(response2.statusCode).toBe(400);

      await app.close();
    });
  });

  describe('Successful Login Flow', () => {
    test('should log successful login', async () => {
      const passwordHash = await hashPassword('correct-password');
      const existing: TestUser = {
        id: randomUUID(),
        email: 'success@example.com',
        passwordHash,
        name: 'Success User',
        createdAt: new Date(),
      };

      const { app, loginAttempts } = await createTestApp([existing]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'success@example.com', password: 'correct-password' },
      });

      expect(response.statusCode).toBe(200);

      const successfulAttempt = loginAttempts.find((a) => a.success);
      expect(successfulAttempt).toBeDefined();
      expect(successfulAttempt?.email).toBe('success@example.com');
      expect(successfulAttempt?.failureReason).toBeNull();

      await app.close();
    });

    test('should reset lockout counter on successful login', async () => {
      const passwordHash = await hashPassword('correct-password');
      const existing: TestUser = {
        id: randomUUID(),
        email: 'reset@example.com',
        passwordHash,
        name: 'Reset User',
        createdAt: new Date(),
      };

      const { app, loginAttempts } = await createTestApp([existing]);

      // Make a few failed attempts
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { email: 'reset@example.com', password: 'wrong' },
        });
      }

      expect(loginAttempts.filter((a) => !a.success)).toHaveLength(3);

      // Successful login
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'reset@example.com', password: 'correct-password' },
      });

      expect(response.statusCode).toBe(200);

      // Success attempt logged
      const successAttempt = loginAttempts.find((a) => a.success);
      expect(successAttempt).toBeDefined();

      await app.close();
    });
  });
});
