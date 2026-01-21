// apps/server/src/__tests__/integration/middleware.integration.test.ts
/**
 * Middleware Integration Tests
 *
 * Tests the middleware behavior using Fastify's inject method.
 * Covers CORS, rate limiting, request logging, and cookie handling.
 */

import {
  applyCors,
  applySecurityHeaders,
  registerCookies,
  registerCorrelationIdHook,
  registerRequestInfoHook,
} from '@http/index';
import { RateLimiter } from '@rate-limit/index';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// CORS Headers Tests
// ============================================================================

describe('CORS Headers', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });

    server.addHook('onRequest', async (req, res) => {
      applyCors(req, res, {
        origin: 'https://app.example.com, https://admin.example.com',
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
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

  describe('Origin Handling', () => {
    it('should set Access-Control-Allow-Origin for allowed origin', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: {
          origin: 'https://app.example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
    });

    it('should set CORS header for second allowed origin', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: {
          origin: 'https://admin.example.com',
        },
      });

      expect(response.headers['access-control-allow-origin']).toBe('https://admin.example.com');
    });

    it('should not set CORS header for disallowed origin', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: {
          origin: 'https://malicious.com',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle request without origin header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Credentials', () => {
    it('should set Access-Control-Allow-Credentials when enabled', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: {
          origin: 'https://app.example.com',
        },
      });

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Preflight Requests', () => {
    it('should handle OPTIONS preflight request', async () => {
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

    it('should set Access-Control-Max-Age header', async () => {
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

  it('should allow any origin with wildcard', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/public',
      headers: {
        origin: 'https://any-domain.com',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://any-domain.com');
  });

  it('should use * when no origin header is present', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/public',
    });

    expect(response.headers['access-control-allow-origin']).toBe('*');
  });
});

// ============================================================================
// Rate Limiting Behavior Tests
// ============================================================================

describe('Rate Limiting Behavior', () => {
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

    server.get('/api/test', () => ({ data: 'ok' }));

    await server.ready();
  });

  afterEach(async () => {
    await limiter.destroy();
    await server.close();
    vi.useRealTimers();
  });

  describe('Rate Limit Headers', () => {
    it('should include X-RateLimit-Limit header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
      });

      expect(response.headers['x-ratelimit-limit']).toBe('5');
    });

    it('should include X-RateLimit-Remaining header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
      });

      expect(response.headers['x-ratelimit-remaining']).toBe('4');
    });

    it('should include X-RateLimit-Reset header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
      });

      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      const resetValue = parseInt(response.headers['x-ratelimit-reset'] as string, 10);
      expect(resetValue).toBeGreaterThan(0);
    });

    it('should decrement remaining count with each request', async () => {
      const response1 = await server.inject({ method: 'GET', url: '/api/test' });
      expect(response1.headers['x-ratelimit-remaining']).toBe('4');

      const response2 = await server.inject({ method: 'GET', url: '/api/test' });
      expect(response2.headers['x-ratelimit-remaining']).toBe('3');

      const response3 = await server.inject({ method: 'GET', url: '/api/test' });
      expect(response3.headers['x-ratelimit-remaining']).toBe('2');
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should allow requests under the limit', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await server.inject({ method: 'GET', url: '/api/test' });
        expect(response.statusCode).toBe(200);
      }
    });

    it('should block requests when limit is exceeded', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < 5; i++) {
        await server.inject({ method: 'GET', url: '/api/test' });
      }

      // This request should be blocked
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Too Many Requests');
      expect(body.retryAfter).toBeDefined();
    });

    it('should show remaining as 0 when limit is reached', async () => {
      for (let i = 0; i < 5; i++) {
        await server.inject({ method: 'GET', url: '/api/test' });
      }

      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
      });

      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should reset rate limit after window expires', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < 5; i++) {
        await server.inject({ method: 'GET', url: '/api/test' });
      }

      // Verify blocked
      let response = await server.inject({ method: 'GET', url: '/api/test' });
      expect(response.statusCode).toBe(429);

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      response = await server.inject({ method: 'GET', url: '/api/test' });
      expect(response.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// Request Logging Tests
// ============================================================================

describe('Request Logging', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });

    // Register correlation ID hook
    registerCorrelationIdHook(server);

    server.get('/api/test', (req) => ({
      correlationId: req.correlationId,
      data: 'test',
    }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Correlation ID', () => {
    it('should generate correlation ID when not provided', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-correlation-id']).toBeDefined();

      // Should be a valid UUID
      const correlationId = response.headers['x-correlation-id'] as string;
      expect(correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should return unique correlation IDs for each request', async () => {
      const response1 = await server.inject({ method: 'GET', url: '/api/test' });
      const response2 = await server.inject({ method: 'GET', url: '/api/test' });

      expect(response1.headers['x-correlation-id']).not.toBe(response2.headers['x-correlation-id']);
    });

    it('should include correlation ID in response body when accessed', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test',
      });

      const body = JSON.parse(response.body);
      expect(body.correlationId).toBe(response.headers['x-correlation-id']);
    });
  });
});

describe('Request Logging with Trust Proxy', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });

    // Register correlation ID hook with trust proxy enabled
    registerCorrelationIdHook(server, { trustProxy: true });

    server.get('/api/test', (req) => ({
      correlationId: req.correlationId,
    }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  it('should use provided correlation ID when trusting proxy', async () => {
    const providedId = 'custom-correlation-id-123';

    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-correlation-id': providedId,
      },
    });

    expect(response.headers['x-correlation-id']).toBe(providedId);
    const body = JSON.parse(response.body);
    expect(body.correlationId).toBe(providedId);
  });

  it('should reject malicious correlation IDs', async () => {
    const maliciousId = 'malicious\r\nX-Injected: true';

    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-correlation-id': maliciousId,
      },
    });

    // Should generate a new safe ID instead
    expect(response.headers['x-correlation-id']).not.toBe(maliciousId);
    expect(response.headers['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

// ============================================================================
// Cookie Handling Tests
// ============================================================================

describe('Cookie Handling', () => {
  let server: FastifyInstance;
  const cookieSecret = 'test-cookie-secret-32-chars-long!';

  beforeEach(async () => {
    server = Fastify({ logger: false });

    registerCookies(server, { secret: cookieSecret });

    // Route that sets a cookie
    server.get('/set-cookie', async (_req, reply) => {
      reply.setCookie('testCookie', 'testValue', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 3600,
      });
      return { message: 'Cookie set' };
    });

    // Route that sets a signed cookie
    server.get('/set-signed-cookie', async (_req, reply) => {
      reply.setCookie('signedCookie', 'secureValue', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        signed: true,
      });
      return { message: 'Signed cookie set' };
    });

    // Route that reads cookies
    server.get('/read-cookie', async (req) => {
      const testCookie = req.cookies['testCookie'];
      return { cookieValue: testCookie || null };
    });

    // Route that reads and verifies signed cookies
    server.get('/read-signed-cookie', async (req) => {
      const signedCookie = req.unsignCookie(req.cookies['signedCookie'] || '');
      return {
        valid: signedCookie.valid,
        value: signedCookie.value || null,
      };
    });

    // Route that clears a cookie
    server.get('/clear-cookie', async (_req, reply) => {
      reply.clearCookie('testCookie', {
        path: '/',
      });
      return { message: 'Cookie cleared' };
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Setting Cookies', () => {
    it('should set a cookie with correct attributes', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/set-cookie',
      });

      expect(response.statusCode).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const cookieString = Array.isArray(cookies) ? cookies[0] : cookies;
      expect(cookieString).toContain('testCookie=testValue');
      expect(cookieString).toContain('HttpOnly');
      expect(cookieString).toContain('SameSite=Lax');
    });

    it('should set a signed cookie', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/set-signed-cookie',
      });

      expect(response.statusCode).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const cookieString = Array.isArray(cookies) ? cookies[0] : cookies;
      expect(cookieString).toContain('signedCookie=');
      // Signed cookies have a signature appended
      expect(cookieString!.length).toBeGreaterThan('signedCookie=secureValue'.length);
    });
  });

  describe('Reading Cookies', () => {
    it('should read a cookie from request', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/read-cookie',
        headers: {
          cookie: 'testCookie=someValue',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.cookieValue).toBe('someValue');
    });

    it('should return null when cookie is not present', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/read-cookie',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.cookieValue).toBeNull();
    });

    it('should verify signed cookie with valid signature', async () => {
      // First, get a signed cookie
      const setResponse = await server.inject({
        method: 'GET',
        url: '/set-signed-cookie',
      });

      const cookies = setResponse.headers['set-cookie'];
      const cookieString = Array.isArray(cookies) ? cookies[0] : cookies;
      const cookieValue = cookieString?.split(';')[0];

      // Now read it back
      const response = await server.inject({
        method: 'GET',
        url: '/read-signed-cookie',
        headers: {
          cookie: cookieValue,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(true);
      expect(body.value).toBe('secureValue');
    });

    it('should reject signed cookie with invalid signature', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/read-signed-cookie',
        headers: {
          cookie: 'signedCookie=tampered.invalidsignature',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
    });
  });

  describe('Clearing Cookies', () => {
    it('should clear a cookie', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/clear-cookie',
      });

      expect(response.statusCode).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const cookieString = Array.isArray(cookies) ? cookies[0] : cookies;
      // Clear cookie sets expires in the past or max-age=0
      expect(cookieString).toContain('testCookie=');
    });
  });
});

// ============================================================================
// Request Info Hook Tests
// ============================================================================

describe('Request Info Hook', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });

    registerRequestInfoHook(server);

    server.get('/api/info', (req) => ({
      ipAddress: req.requestInfo?.ipAddress,
      userAgent: req.requestInfo?.userAgent,
    }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  it('should extract IP address from request', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/info',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ipAddress).toBeDefined();
  });

  it('should extract User-Agent from request', async () => {
    const userAgent = 'Mozilla/5.0 (Test Browser)';

    const response = await server.inject({
      method: 'GET',
      url: '/api/info',
      headers: {
        'user-agent': userAgent,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.userAgent).toBe(userAgent);
  });

  it('should handle missing User-Agent header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/info',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    // Should have a default or empty value, not throw an error
    expect(body).toHaveProperty('userAgent');
  });
});

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

    server.get('/api/test', () => ({ data: 'test' }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  it('should set X-Frame-Options header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
    });

    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  it('should set X-Content-Type-Options header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
    });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set X-XSS-Protection header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
    });

    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
  });

  it('should set Strict-Transport-Security header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
    });

    expect(response.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });

  it('should set Referrer-Policy header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
    });

    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('should set Permissions-Policy header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
    });

    expect(response.headers['permissions-policy']).toBeDefined();
  });

  it('should remove X-Powered-By header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/test',
    });

    // Header is either undefined or empty string (effectively removed)
    const poweredBy = response.headers['x-powered-by'];
    expect(poweredBy === undefined || poweredBy === '').toBe(true);
  });
});
