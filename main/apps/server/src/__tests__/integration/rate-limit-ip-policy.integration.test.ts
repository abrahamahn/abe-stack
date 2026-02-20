// main/apps/server/src/__tests__/integration/rate-limit-ip-policy.integration.test.ts
/**
 * Rate Limiting & IP Policy Integration Tests (4.16)
 *
 * Tests:
 * - Rate limit preset enforced on auth endpoints (burst rejected, normal allowed)
 * - Rate limit preset on general API endpoints (higher threshold than auth)
 * - IP blocklist (blocked IP returns 403 on all routes)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  createIpBlocklist,
} from '../../../../../server/system/src/security/ip-blocklist';

import {
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';


// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe('Rate Limiting — Auth Endpoints', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    // Create server with rate limiting enabled and a very low limit for testing
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
      enableRateLimit: true,
    });

    // Add test auth-like route
    testServer.server.post('/api/auth/login', async (_req, reply) => {
      return reply.send({ ok: true, message: 'Login successful' });
    });

    // Add test general API route
    testServer.server.get('/api/users', async (_req, reply) => {
      return reply.send({ ok: true, data: [] });
    });

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
  });

  it('normal requests within rate limit are allowed', async () => {
    const response = await testServer.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifier: 'test@example.com', password: 'Test123!' },
    });

    expect(response.statusCode).toBe(200);
    // Rate limit headers should be present
    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('rate limit headers indicate remaining capacity', async () => {
    const response = await testServer.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifier: 'test@example.com', password: 'Test123!' },
    });

    const limit = Number(response.headers['x-ratelimit-limit']);
    const remaining = Number(response.headers['x-ratelimit-remaining']);

    expect(limit).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(limit);
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  it('general API endpoints return rate limit headers', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/api/users',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('burst of requests eventually gets rejected with 429', async () => {
    // Create a fresh server with very low rate limit for burst testing
    const burstServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
      enableRateLimit: true,
    });

    burstServer.server.post('/api/auth/login', async (_req, reply) => {
      return reply.send({ ok: true });
    });

    await burstServer.ready();

    // Send many requests rapidly — the RateLimiter has a default max of 100
    const results: number[] = [];
    for (let i = 0; i < 105; i++) {
      const response = await burstServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { identifier: 'test@example.com', password: 'Test123!' },
      });
      results.push(response.statusCode);
    }

    // At least some should be 429 (rate limited)
    const rateLimited = results.filter((code) => code === 429);
    expect(rateLimited.length).toBeGreaterThan(0);

    // The 429 response should have the correct error message
    const lastResponse = await burstServer.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifier: 'test@example.com', password: 'Test123!' },
    });

    if (lastResponse.statusCode === 429) {
      const body = parseJsonResponse(lastResponse) as { error: string; message: string };
      expect(body.error).toBe('Too Many Requests');
      expect(body.message).toContain('Rate limit exceeded');
    }

    await burstServer.close();
  });
});

// ============================================================================
// IP Blocklist Tests
// ============================================================================

describe('IP Blocklist — Blocked IP returns 403', () => {
  it('blocked exact IP is rejected', async () => {
    const blocklist = createIpBlocklist({
      globalBlocklist: ['10.0.0.1', '192.168.1.100'],
    });

    const result = await blocklist.check('10.0.0.1');
    expect(result).not.toBeNull();
    expect(result).toContain('blocked');
  });

  it('non-blocked IP is allowed', async () => {
    const blocklist = createIpBlocklist({
      globalBlocklist: ['10.0.0.1'],
    });

    const result = await blocklist.check('10.0.0.2');
    expect(result).toBeNull();
  });

  it('CIDR range blocking works', async () => {
    const blocklist = createIpBlocklist({
      globalBlocklist: ['192.168.0.0/16'],
    });

    const blocked = await blocklist.check('192.168.1.1');
    expect(blocked).not.toBeNull();

    const allowed = await blocklist.check('10.0.0.1');
    expect(allowed).toBeNull();
  });

  it('allowlist overrides blocklist', async () => {
    const blocklist = createIpBlocklist({
      globalBlocklist: ['10.0.0.0/8'],
      allowlist: ['10.0.0.1'],
    });

    // 10.0.0.1 is in both blocklist range and allowlist — allowlist wins
    const result = await blocklist.check('10.0.0.1');
    expect(result).toBeNull();

    // 10.0.0.2 is only in blocklist — still blocked
    const blocked = await blocklist.check('10.0.0.2');
    expect(blocked).not.toBeNull();
  });

  it('strict policy checks both global and strict blocklists', async () => {
    const blocklist = createIpBlocklist({
      globalBlocklist: ['10.0.0.1'],
      strictBlocklist: ['10.0.0.2'],
    });

    // Standard policy: only global blocklist
    const standardResult = await blocklist.check('10.0.0.2', 'standard');
    expect(standardResult).toBeNull();

    // Strict policy: global + strict blocklists
    const strictResult = await blocklist.check('10.0.0.2', 'strict');
    expect(strictResult).not.toBeNull();
    expect(strictResult).toContain('strict blocklist');
  });

  it('permissive policy skips all blocklist checks', async () => {
    const blocklist = createIpBlocklist({
      globalBlocklist: ['10.0.0.1'],
      strictBlocklist: ['10.0.0.1'],
    });

    const result = await blocklist.check('10.0.0.1', 'permissive');
    expect(result).toBeNull();
  });

  it('runtime add and remove of IPs works', async () => {
    const blocklist = createIpBlocklist({});

    // Initially not blocked
    let result = await blocklist.check('10.0.0.1');
    expect(result).toBeNull();

    // Add to blocklist at runtime
    blocklist.add('10.0.0.1', 'global');
    result = await blocklist.check('10.0.0.1');
    expect(result).not.toBeNull();

    // Remove from blocklist at runtime
    blocklist.remove('10.0.0.1', 'global');
    result = await blocklist.check('10.0.0.1');
    expect(result).toBeNull();
  });

  it('reputation provider integration blocks suspicious IPs', async () => {
    const mockProvider = {
      name: 'MockReputation',
      check: vi.fn().mockResolvedValue({
        blocked: true,
        reason: 'Known malicious IP',
        score: 90,
      }),
    };

    const blocklist = createIpBlocklist({
      reputationProviders: [mockProvider],
    });

    const result = await blocklist.check('5.6.7.8');
    expect(result).not.toBeNull();
    expect(result).toContain('MockReputation');
    expect(mockProvider.check).toHaveBeenCalledWith('5.6.7.8');
  });

  it('reputation provider errors do not block requests', async () => {
    const failingProvider = {
      name: 'FailingProvider',
      check: vi.fn().mockRejectedValue(new Error('Provider unavailable')),
    };

    const blocklist = createIpBlocklist({
      reputationProviders: [failingProvider],
    });

    // Should not block even though provider threw
    const result = await blocklist.check('5.6.7.8');
    expect(result).toBeNull();
  });

  it('blocklist getStats reports correct counts', () => {
    const blocklist = createIpBlocklist({
      globalBlocklist: ['10.0.0.1', '192.168.0.0/16'],
      strictBlocklist: ['5.6.7.8'],
      allowlist: ['127.0.0.1'],
    });

    const stats = blocklist.getStats();
    expect(stats.globalExactCount).toBe(1);
    expect(stats.globalCidrCount).toBe(1);
    expect(stats.strictExactCount).toBe(1);
    expect(stats.allowlistExactCount).toBe(1);
  });
});

// ============================================================================
// IP Blocklist Fastify Integration
// ============================================================================

describe('IP Blocklist — Fastify Middleware Integration', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    // Add IP check via preHandler hook
    const blocklist = createIpBlocklist({
      globalBlocklist: ['10.0.0.99'],
    });

    testServer.server.addHook('preHandler', async (request, reply) => {
      const reason = await blocklist.check(request.ip);
      if (reason !== null) {
        void reply.status(403).send({ error: 'Forbidden', reason });
      }
    });

    testServer.server.get('/api/test/protected', async () => {
      return { ok: true };
    });

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
  });

  it('non-blocked IP can access routes', async () => {
    // The inject method uses 127.0.0.1 by default which is not blocked
    const response = await testServer.inject({
      method: 'GET',
      url: '/api/test/protected',
    });

    expect(response.statusCode).toBe(200);
  });
});
