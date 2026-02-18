// main/apps/server/src/__tests__/integration/auth.real-db.test.ts
/**
 * Auth API Integration Tests (Real DB)
 *
 * Verifies auth flows against a real isolated database.
 * Tests complex stateful behaviors like token rotation and revocation.
 */

import { authRoutes, createAuthGuard } from '@bslt/core/auth';
import { createRepositories } from '@bslt/db';
import { registerRouteMap } from '@bslt/server-system';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDbHarness, type DbHarness } from './db-harness';
import { seedTestUser } from './seed-helpers';
import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@bslt/server-system';

describe.skip('Auth API Integration (Real DB)', () => {
  let testServer: TestServer;
  let dbHarness: DbHarness;
  let repos: any;

  beforeAll(async () => {
    // 0. Set required env vars for consistency check and valid local DB
    process.env['PUBLIC_API_URL'] = 'http://localhost:3001';
    process.env['VITE_API_URL'] = 'http://localhost:3001';
    process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/postgres';

    // 1. Create isolated test database
    dbHarness = await createDbHarness();
    await dbHarness.migrate();

    // 2. Initialize real repositories
    repos = createRepositories(dbHarness.db);

    // 3. Setup test server
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    // 4. Wire auth routes with real DB/Repos
    const ctx = {
      db: repos.db, // RepositoryContext has db client
      repos: repos,
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: vi.fn().mockReturnThis(),
      },
      email: testServer.email,
      emailTemplates: {
        emailVerification: vi.fn().mockReturnValue({ subject: 'test', html: 'test', to: 'test' }),
        passwordReset: vi.fn().mockReturnValue({ subject: 'test', html: 'test', to: 'test' }),
        passwordChangedAlert: vi
          .fn()
          .mockReturnValue({ subject: 'test', html: 'test', to: 'test' }),
      },
      config: testServer.config,
    };

    registerRouteMap(testServer.server, ctx as never, authRoutes, {
      prefix: '/api',
      jwtSecret: testServer.config.auth.jwt.secret,
      authGuardFactory: createAuthGuard as unknown as AuthGuardFactory,
    });

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
    await dbHarness.destroy();
  });

  beforeEach(async () => {
    // Clean tables between tests (optional, but good for isolation)
    // For now we'll rely on unique emails or explicit cleanup
    await repos.db.execute('TRUNCATE users CASCADE');
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates token and rejects old token on reuse', async () => {
      const email = 'rotation@example.com';
      const password = 'TestPassword123!';
      await seedTestUser(dbHarness.connectionString, { email, password });

      // 1. Login to get initial tokens
      const loginResponse = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { identifier: email, password },
      });

      expect(loginResponse.statusCode).toBe(200);
      const loginCookies = loginResponse.headers['set-cookie'];
      const refreshToken = Array.isArray(loginCookies)
        ? loginCookies
            .find((c) => c.startsWith('refreshToken='))
            ?.split(';')[0]
            ?.split('=')[1]
        : loginCookies?.split(';')[0]?.split('=')[1];

      expect(refreshToken).toBeDefined();

      // 2. Refresh for the first time
      const refresh1 = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: `refreshToken=${String(refreshToken)}`,
        },
      });

      expect(refresh1.statusCode).toBe(200);
      const refresh1Cookies = refresh1.headers['set-cookie'];
      const nextToken = Array.isArray(refresh1Cookies)
        ? refresh1Cookies
            .find((c) => c.startsWith('refreshToken='))
            ?.split(';')[0]
            ?.split('=')[1]
        : refresh1Cookies?.split(';')[0]?.split('=')[1];

      expect(nextToken).toBeDefined();
      expect(nextToken).not.toBe(refreshToken);

      // 3. Attempt to use old token (reuse attack)
      const reuseAttempt = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: `refreshToken=${String(refreshToken)}`,
        },
      });

      // Should be rejected
      expect(reuseAttempt.statusCode).toBe(401);

      // 4. Verify that even the NEW token is now revoked (family revocation)
      const invalidNext = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: `refreshToken=${String(nextToken)}`,
        },
      });

      expect(invalidNext.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout-all', () => {
    it('revokes all families except current', async () => {
      const email = 'logout-all@example.com';
      const password = 'TestPassword123!';
      await seedTestUser(dbHarness.connectionString, { email, password });

      // 1. Create multiple sessions
      const session1 = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { identifier: email, password },
      });

      const session2 = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { identifier: email, password },
      });

      const token1 = (session1.headers['set-cookie'] as string[])
        .find((c) => c.startsWith('refreshToken='))
        ?.split(';')[0]
        ?.split('=')[1];
      const token2 = (session2.headers['set-cookie'] as string[])
        .find((c) => c.startsWith('refreshToken='))
        ?.split(';')[0]
        ?.split('=')[1];
      const accessToken2 = String((parseJsonResponse(session2) as { token: unknown }).token);

      // 2. Call logout-all from session 2
      const logoutAllResponse = await testServer.inject({
        method: 'POST',
        url: '/api/auth/logout-all',
        headers: {
          authorization: `Bearer ${accessToken2}`,
          cookie: `refreshToken=${String(token2)}`,
        },
      });

      expect(logoutAllResponse.statusCode).toBe(200);

      // 3. Verify session 1 is revoked
      const refresh1 = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: `refreshToken=${String(token1)}`,
        },
      });
      expect(refresh1.statusCode).toBe(401);

      // 4. Verify session 2 is STILL ACTIVE
      const refresh2 = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: `refreshToken=${String(token2)}`,
        },
      });
      expect(refresh2.statusCode).toBe(200);
    });
  });
});
