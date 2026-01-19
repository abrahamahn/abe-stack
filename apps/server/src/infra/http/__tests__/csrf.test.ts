// apps/server/src/infra/http/__tests__/csrf.test.ts
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { registerCookies } from '../cookie';
import { registerCsrf } from '../csrf';

import type { FastifyInstance } from 'fastify';

describe('CSRF Protection', () => {
  let server: FastifyInstance;
  const secret = 'test-csrf-secret-key-32-chars-long';

  beforeEach(async () => {
    server = Fastify();

    // Register cookies first (required for CSRF)
    registerCookies(server, { secret });

    // Register CSRF
    registerCsrf(server, {
      secret,
      cookieOpts: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      },
    });

    // Test routes
    server.get('/csrf-token', async (_req, reply) => {
      const token = reply.generateCsrf();
      return { token };
    });

    server.post('/protected', () => {
      return { success: true };
    });

    server.get('/safe', () => {
      return { message: 'safe route' };
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Safe methods', () => {
    test('GET requests should not require CSRF token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/safe',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ message: 'safe route' });
    });

    test('HEAD requests should not require CSRF token', async () => {
      const response = await server.inject({
        method: 'HEAD',
        url: '/safe',
      });

      expect(response.statusCode).toBe(200);
    });

    test('OPTIONS requests should not require CSRF token', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/safe',
      });

      // May return 404 if no OPTIONS handler, but not 403
      expect(response.statusCode).not.toBe(403);
    });
  });

  describe('Unsafe methods', () => {
    test('POST without CSRF token should be rejected', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/protected',
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body)).toHaveProperty('error', 'Forbidden');
    });

    test('POST with valid CSRF token should succeed', async () => {
      // First, get a CSRF token
      const tokenResponse = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });

      expect(tokenResponse.statusCode).toBe(200);
      const { token } = JSON.parse(tokenResponse.body) as { token: string };
      expect(token).toBeDefined();

      // Extract the CSRF cookie
      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookie = Array.isArray(cookies)
        ? cookies.find((c) => c.startsWith('_csrf='))
        : cookies?.startsWith('_csrf=')
          ? cookies
          : undefined;

      expect(csrfCookie).toBeDefined();
      if (!csrfCookie) {
        throw new Error('Expected CSRF cookie to be set');
      }

      // Make POST with token in header and cookie
      const response = await server.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          'x-csrf-token': token,
          cookie: csrfCookie.split(';')[0],
        },
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ success: true });
    });

    test('POST with invalid CSRF token should be rejected', async () => {
      // Get a valid cookie first
      const tokenResponse = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });

      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookie = Array.isArray(cookies)
        ? cookies.find((c) => c.startsWith('_csrf='))
        : cookies;

      // Use wrong token
      if (!csrfCookie) {
        throw new Error('Expected CSRF cookie to be set');
      }

      const response = await server.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          'x-csrf-token': 'invalid-token',
          cookie: csrfCookie.split(';')[0],
        },
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(403);
    });

    test('POST with missing CSRF cookie should be rejected', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          'x-csrf-token': 'some-token',
        },
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(403);
      const parsed = JSON.parse(response.body) as { message?: string };
      expect(parsed.message ?? '').toContain('Missing CSRF token');
    });

    test('POST with CSRF token in body should succeed', async () => {
      // Get a CSRF token
      const tokenResponse = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });

      const { token } = JSON.parse(tokenResponse.body) as { token: string };
      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookie = Array.isArray(cookies)
        ? cookies.find((c) => c.startsWith('_csrf='))
        : cookies;

      // Make POST with token in body
      if (!csrfCookie) {
        throw new Error('Expected CSRF cookie to be set');
      }

      const response = await server.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          cookie: csrfCookie.split(';')[0],
          'content-type': 'application/json',
        },
        payload: { _csrf: token, data: 'test' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Token generation', () => {
    test('generateCsrf should return different tokens each time', async () => {
      const response1 = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });

      const response2 = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });

      const { token: token1 } = JSON.parse(response1.body) as { token: string };
      const { token: token2 } = JSON.parse(response2.body) as { token: string };

      expect(token1).not.toBe(token2);
    });

    test('generateCsrf should set CSRF cookie', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const csrfCookie = Array.isArray(cookies)
        ? cookies.find((c) => c.startsWith('_csrf='))
        : cookies?.startsWith('_csrf=')
          ? cookies
          : undefined;

      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).toContain('HttpOnly');
      expect(csrfCookie).toContain('SameSite=Lax');
    });
  });

  describe('Token validation edge cases', () => {
    test('POST with tampered token should be rejected', async () => {
      // Get a valid token
      const tokenResponse = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });

      const { token } = JSON.parse(tokenResponse.body) as { token: string };
      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookie = Array.isArray(cookies)
        ? cookies.find((c) => c.startsWith('_csrf='))
        : cookies;

      if (!csrfCookie) {
        throw new Error('Expected CSRF cookie to be set');
      }

      // Tamper with the token by changing a character
      const tamperedToken = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');

      const response = await server.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          'x-csrf-token': tamperedToken,
          cookie: csrfCookie.split(';')[0],
        },
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(403);
    });

    test('POST with empty token should be rejected', async () => {
      // Get a valid cookie
      const tokenResponse = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });

      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookie = Array.isArray(cookies)
        ? cookies.find((c) => c.startsWith('_csrf='))
        : cookies;

      if (!csrfCookie) {
        throw new Error('Expected CSRF cookie to be set');
      }

      const response = await server.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          'x-csrf-token': '',
          cookie: csrfCookie.split(';')[0],
        },
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(403);
    });

    test('POST with token from different session should be rejected', async () => {
      // Get token from first "session"
      const tokenResponse1 = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });
      const { token } = JSON.parse(tokenResponse1.body) as { token: string };

      // Get cookie from different "session"
      const tokenResponse2 = await server.inject({
        method: 'GET',
        url: '/csrf-token',
      });
      const cookies = tokenResponse2.headers['set-cookie'];
      const csrfCookie = Array.isArray(cookies)
        ? cookies.find((c) => c.startsWith('_csrf='))
        : cookies;

      if (!csrfCookie) {
        throw new Error('Expected CSRF cookie to be set');
      }

      // Try to use token from session 1 with cookie from session 2
      const response = await server.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          'x-csrf-token': token,
          cookie: csrfCookie.split(';')[0],
        },
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(403);
    });

    test('DELETE request should require CSRF token', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/protected',
      });

      expect(response.statusCode).toBe(403);
    });

    test('PUT request should require CSRF token', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/protected',
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(403);
    });

    test('PATCH request should require CSRF token', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: '/protected',
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
