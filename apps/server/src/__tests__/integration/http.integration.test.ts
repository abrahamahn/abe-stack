// apps/server/src/__tests__/integration/http.integration.test.ts
/**
 * HTTP Infrastructure Integration Tests
 *
 * Tests security headers, CORS, CSRF, correlation IDs, and rate limiting
 * using fastify.inject() without starting an actual HTTP server.
 */

import {
  applyCors,
  applySecurityHeaders,
  getProductionSecurityDefaults,
  registerCookies,
  registerCorrelationIdHook,
  registerCsrf,
  registerPrototypePollutionProtection,
} from '@http/index';
import { RateLimiter } from '@rate-limit/index';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Security Headers Tests
// ============================================================================

describe('Security Headers', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });

    server.addHook('onRequest', async (_req, res) => {
      applySecurityHeaders(res);
    });

    server.get('/test', () => ({ message: 'hello' }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should set X-Frame-Options header to DENY', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  test('should set X-Content-Type-Options header to nosniff', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('should set X-XSS-Protection header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
  });

  test('should set Strict-Transport-Security (HSTS) header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });

  test('should set Referrer-Policy header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('should set Permissions-Policy header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()');
  });

  test('should remove X-Powered-By header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    // Header is either undefined or empty string depending on Fastify version
    const poweredBy = response.headers['x-powered-by'];
    expect(poweredBy === undefined || poweredBy === '').toBe(true);
  });
});

describe('Production Security Headers', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });

    server.addHook('onRequest', async (_req, res) => {
      applySecurityHeaders(res, getProductionSecurityDefaults());
    });

    server.get('/test', () => ({ message: 'hello' }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should set Content-Security-Policy header in production', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });
});

// ============================================================================
// CORS Configuration Tests
// ============================================================================

describe('CORS Configuration', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });

    server.addHook('onRequest', async (req, res) => {
      applyCors(req, res, {
        origin: 'https://app.example.com, https://admin.example.com',
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        maxAge: 86400,
      });

      if (req.method === 'OPTIONS') {
        res.status(204).send();
        return;
      }
    });

    server.get('/api/test', () => ({ data: 'test' }));
    server.post('/api/test', () => ({ data: 'created' }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should allow requests from whitelisted origin', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: {
        origin: 'https://app.example.com',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  test('should allow requests from second whitelisted origin', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: {
        origin: 'https://admin.example.com',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://admin.example.com');
  });

  test('should not set CORS header for non-whitelisted origin', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: {
        origin: 'https://evil.com',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('should set credentials header when enabled', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: {
        origin: 'https://app.example.com',
      },
    });

    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  test('should handle preflight OPTIONS request', async () => {
    const response = await server.inject({
      method: 'OPTIONS',
      url: '/api/test',
      headers: {
        origin: 'https://app.example.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'Content-Type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-methods']).toBeDefined();
    expect(response.headers['access-control-allow-headers']).toBeDefined();
  });

  test('should set max-age header for caching preflight', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: {
        origin: 'https://app.example.com',
      },
    });

    expect(response.headers['access-control-max-age']).toBe('86400');
  });
});

describe('CORS with Wildcard Origin', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });

    server.addHook('onRequest', async (req, res) => {
      applyCors(req, res, {
        origin: '*',
        credentials: false,
      });
    });

    server.get('/api/public', () => ({ data: 'public' }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should allow any origin with wildcard', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/public',
      headers: {
        origin: 'https://any-origin.com',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://any-origin.com');
  });

  test('should use * when no origin header present', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/public',
    });

    expect(response.headers['access-control-allow-origin']).toBe('*');
  });
});

// ============================================================================
// CSRF Protection Tests
// ============================================================================

describe('CSRF Protection', () => {
  let server: FastifyInstance;
  const secret = 'test-csrf-secret-key-32-chars-long';

  beforeEach(async () => {
    server = Fastify({ logger: false });
    registerCookies(server, { secret });
    registerCsrf(server, {
      secret,
      cookieOpts: { httpOnly: true, secure: false, sameSite: 'lax' },
    });

    server.get('/csrf-token', async (_req, reply) => {
      const token = reply.generateCsrf();
      return { token };
    });

    server.post('/protected', () => ({ success: true }));
    server.get('/safe', () => ({ message: 'safe' }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should require CSRF token for POST requests', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/protected',
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('Forbidden');
  });

  test('should allow POST with valid CSRF token', async () => {
    // Get CSRF token
    const tokenResponse = await server.inject({
      method: 'GET',
      url: '/csrf-token',
    });

    const { token } = parseJsonResponse<{ token: string }>(tokenResponse);
    const cookies = tokenResponse.headers['set-cookie'];
    const csrfCookie = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith('_csrf='))
      : cookies;

    expect(csrfCookie).toBeDefined();

    // Make POST with CSRF token
    const response = await server.inject({
      method: 'POST',
      url: '/protected',
      headers: {
        'x-csrf-token': token,
        cookie: csrfCookie?.split(';')[0],
      },
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(200);
  });

  test('should not require CSRF for GET requests', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/safe',
    });

    expect(response.statusCode).toBe(200);
  });

  test('should reject POST with invalid CSRF token', async () => {
    // Get valid cookie
    const tokenResponse = await server.inject({
      method: 'GET',
      url: '/csrf-token',
    });

    const cookies = tokenResponse.headers['set-cookie'];
    const csrfCookie = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith('_csrf='))
      : cookies;

    // Use wrong token
    const response = await server.inject({
      method: 'POST',
      url: '/protected',
      headers: {
        'x-csrf-token': 'invalid-token',
        cookie: csrfCookie?.split(';')[0],
      },
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(403);
  });

  test('should reject POST with token from different session', async () => {
    // Get token from first session
    const tokenResponse1 = await server.inject({
      method: 'GET',
      url: '/csrf-token',
    });
    const { token } = parseJsonResponse<{ token: string }>(tokenResponse1);

    // Get cookie from different session
    const tokenResponse2 = await server.inject({
      method: 'GET',
      url: '/csrf-token',
    });
    const cookies = tokenResponse2.headers['set-cookie'];
    const csrfCookie = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith('_csrf='))
      : cookies;

    // Try to use mismatched token and cookie
    const response = await server.inject({
      method: 'POST',
      url: '/protected',
      headers: {
        'x-csrf-token': token,
        cookie: csrfCookie?.split(';')[0],
      },
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('CSRF with Encrypted Tokens (Production Mode)', () => {
  let server: FastifyInstance;
  const secret = 'test-csrf-secret-key-32-chars-long';

  beforeEach(async () => {
    server = Fastify({ logger: false });
    registerCookies(server, { secret });
    registerCsrf(server, {
      secret,
      encrypted: true, // Production mode
      cookieOpts: { httpOnly: true, secure: false, sameSite: 'strict', signed: true },
    });

    server.get('/csrf-token', async (_req, reply) => {
      const token = reply.generateCsrf();
      return { token };
    });

    server.post('/protected', () => ({ success: true }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should generate encrypted CSRF tokens', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/csrf-token',
    });

    expect(response.statusCode).toBe(200);
    const { token } = parseJsonResponse<{ token: string }>(response);
    expect(token).toBeDefined();
    // Encrypted tokens should be longer due to IV and auth tag
    expect(token.length).toBeGreaterThan(32);
  });

  test('should validate encrypted tokens successfully', async () => {
    const tokenResponse = await server.inject({
      method: 'GET',
      url: '/csrf-token',
    });

    const { token } = parseJsonResponse<{ token: string }>(tokenResponse);
    const cookies = tokenResponse.headers['set-cookie'];
    const csrfCookie = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith('_csrf='))
      : cookies;

    const response = await server.inject({
      method: 'POST',
      url: '/protected',
      headers: {
        'x-csrf-token': token,
        cookie: csrfCookie?.split(';')[0],
      },
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(200);
  });
});

// ============================================================================
// Correlation ID Middleware Tests
// ============================================================================

describe('Correlation ID Middleware', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });
    registerCorrelationIdHook(server);

    server.get('/test', (req) => ({
      correlationId: req.correlationId,
    }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should generate correlation ID when not provided', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(200);

    // Check response header
    expect(response.headers['x-correlation-id']).toBeDefined();
    expect(response.headers['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    // Check body
    const body = parseJsonResponse<{ correlationId: string }>(response);
    expect(body.correlationId).toBe(response.headers['x-correlation-id']);
  });

  test('should generate unique correlation IDs for each request', async () => {
    const response1 = await server.inject({ method: 'GET', url: '/test' });
    const response2 = await server.inject({ method: 'GET', url: '/test' });

    expect(response1.headers['x-correlation-id']).not.toBe(response2.headers['x-correlation-id']);
  });
});

describe('Correlation ID with Trust Proxy', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });
    registerCorrelationIdHook(server, { trustProxy: true });

    server.get('/test', (req) => ({
      correlationId: req.correlationId,
    }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should use provided correlation ID when trusting proxy', async () => {
    const providedId = 'my-custom-correlation-id-123';

    const response = await server.inject({
      method: 'GET',
      url: '/test',
      headers: {
        'x-correlation-id': providedId,
      },
    });

    expect(response.headers['x-correlation-id']).toBe(providedId);

    const body = parseJsonResponse<{ correlationId: string }>(response);
    expect(body.correlationId).toBe(providedId);
  });

  test('should reject invalid correlation ID (header injection attempt)', async () => {
    const maliciousId = 'malicious\r\nX-Injected: true';

    const response = await server.inject({
      method: 'GET',
      url: '/test',
      headers: {
        'x-correlation-id': maliciousId,
      },
    });

    // Should generate a new valid ID instead of using the malicious one
    expect(response.headers['x-correlation-id']).not.toBe(maliciousId);
    expect(response.headers['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe('Correlation ID without Trust Proxy', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });
    registerCorrelationIdHook(server, { trustProxy: false });

    server.get('/test', (req) => ({
      correlationId: req.correlationId,
    }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should ignore provided correlation ID when not trusting proxy', async () => {
    const providedId = 'external-correlation-id';

    const response = await server.inject({
      method: 'GET',
      url: '/test',
      headers: {
        'x-correlation-id': providedId,
      },
    });

    // Should generate new ID, not use provided one
    expect(response.headers['x-correlation-id']).not.toBe(providedId);
    expect(response.headers['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe('Rate Limiting', () => {
  let server: FastifyInstance;
  let limiter: RateLimiter;

  beforeEach(async () => {
    vi.useFakeTimers();
    limiter = new RateLimiter({ windowMs: 60000, max: 5 });

    server = Fastify({ logger: false });

    server.addHook('onRequest', async (req, res) => {
      const result = await limiter.check(req.ip);

      res.header('X-RateLimit-Limit', String(result.limit));
      res.header('X-RateLimit-Remaining', String(result.remaining));
      res.header('X-RateLimit-Reset', String(Math.ceil(result.resetMs / 1000)));

      if (!result.allowed) {
        res.status(429).send({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(result.resetMs / 1000),
        });
        return;
      }
    });

    server.get('/test', () => ({ message: 'ok' }));

    await server.ready();
  });

  afterEach(async () => {
    await limiter.destroy();
    await server.close();
    vi.useRealTimers();
  });

  test('should allow requests under the rate limit', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-ratelimit-limit']).toBe('5');
    expect(response.headers['x-ratelimit-remaining']).toBe('4');
  });

  test('should include rate limit headers in response', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });

  test('should block requests when rate limit exceeded', async () => {
    // Make requests up to limit
    for (let i = 0; i < 5; i++) {
      await server.inject({ method: 'GET', url: '/test' });
    }

    // This should be blocked
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(429);
    const body = parseJsonResponse<{ error: string; message: string }>(response);
    expect(body.error).toBe('Too Many Requests');
    expect(response.headers['x-ratelimit-remaining']).toBe('0');
  });

  test('should allow requests after rate limit window resets', async () => {
    // Exhaust rate limit
    for (let i = 0; i < 5; i++) {
      await server.inject({ method: 'GET', url: '/test' });
    }

    // Should be blocked
    const blockedResponse = await server.inject({
      method: 'GET',
      url: '/test',
    });
    expect(blockedResponse.statusCode).toBe(429);

    // Advance time past the window
    vi.advanceTimersByTime(61000);

    // Should be allowed again
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(200);
  });
});

// ============================================================================
// Prototype Pollution Protection Tests
// ============================================================================

describe('Prototype Pollution Protection', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });
    registerPrototypePollutionProtection(server);

    server.post('/echo', async (req) => {
      return { received: req.body };
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should sanitize __proto__ from request body', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ safe: 'value', __proto__: { isAdmin: true } }),
    });

    expect(response.statusCode).toBe(200);
    const body = parseJsonResponse<{ received: Record<string, unknown> }>(response);
    expect(body.received).toEqual({ safe: 'value' });
    expect(body.received).not.toHaveProperty('__proto__');
  });

  test('should sanitize constructor from request body', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ safe: 'value', constructor: { dangerous: true } }),
    });

    expect(response.statusCode).toBe(200);
    const body = parseJsonResponse<{ received: Record<string, unknown> }>(response);
    expect(body.received).toEqual({ safe: 'value' });
  });

  test('should sanitize prototype from request body', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ safe: 'value', prototype: { polluted: true } }),
    });

    expect(response.statusCode).toBe(200);
    const body = parseJsonResponse<{ received: Record<string, unknown> }>(response);
    expect(body.received).toEqual({ safe: 'value' });
  });

  test('should sanitize nested dangerous keys', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        outer: {
          inner: {
            __proto__: { bad: true },
            safe: 'nested',
          },
        },
      }),
    });

    expect(response.statusCode).toBe(200);
    const body = parseJsonResponse<{ received: { outer: { inner: Record<string, unknown> } } }>(
      response,
    );
    expect(body.received.outer.inner).toEqual({ safe: 'nested' });
  });

  test('should reject invalid JSON with 400', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{invalid json}',
    });

    expect(response.statusCode).toBe(400);
  });

  test('should pass through safe JSON unchanged', async () => {
    const safePayload = {
      name: 'test',
      nested: { value: 123 },
      array: [1, 2, 3],
    };

    const response = await server.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify(safePayload),
    });

    expect(response.statusCode).toBe(200);
    const body = parseJsonResponse<{ received: typeof safePayload }>(response);
    expect(body.received).toEqual(safePayload);
  });
});

// ============================================================================
// Integration Test: Full HTTP Stack
// ============================================================================

describe('Full HTTP Stack Integration', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createTestServer({
      enableCsrf: true,
      enableRateLimit: true,
      enableCors: true,
      enableSecurityHeaders: true,
    });

    // Add test routes
    testServer.server.get('/api/public', () => ({ data: 'public' }));
    testServer.server.post('/api/protected', () => ({ data: 'protected' }));
  });

  afterEach(async () => {
    await testServer.close();
  });

  test('should include all security headers', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/api/public',
    });

    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBeDefined();
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['referrer-policy']).toBeDefined();
  });

  test('should include correlation ID in response', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/api/public',
    });

    expect(response.headers['x-correlation-id']).toBeDefined();
  });

  test('should include rate limit headers in response', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/api/public',
    });

    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
  });

  test('should require CSRF for POST requests', async () => {
    const response = await testServer.inject({
      method: 'POST',
      url: '/api/protected',
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(403);
  });

  test('should allow POST with valid CSRF token', async () => {
    const csrf = await testServer.getCsrfToken();

    const response = await testServer.inject({
      method: 'POST',
      url: '/api/protected',
      headers: {
        'x-csrf-token': csrf.token,
        cookie: csrf.cookie,
      },
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(200);
  });
});
