// infra/src/http/middleware/requestInfo.test.ts
import fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { registerRequestInfoHook } from './requestInfo';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Request Info Middleware Tests
// ============================================================================

describe('Request Info Middleware', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = fastify();
    registerRequestInfoHook(server);

    // Test route that returns requestInfo
    server.get('/test', (request) => {
      return {
        ipAddress: request.requestInfo.ipAddress,
        userAgent: request.requestInfo.userAgent,
      };
    });

    // Add routes for different methods
    server.post('/test-post', (request) => ({
      ipAddress: request.requestInfo.ipAddress,
      userAgent: request.requestInfo.userAgent,
    }));

    server.put('/test-put', (request) => ({
      ipAddress: request.requestInfo.ipAddress,
      userAgent: request.requestInfo.userAgent,
    }));

    // Route for handler test
    server.get('/handler-test', (request, reply) => {
      const info = (request as unknown as Record<string, unknown>).requestInfo;
      if (info === null || info === undefined) {
        return reply.status(500).send({ error: 'requestInfo not available' });
      }
      return {
        hasIpAddress: typeof (info as { ipAddress?: unknown }).ipAddress === 'string',
        hasUserAgent: 'userAgent' in (info as object),
      };
    });

    // Route for type test
    server.get('/type-test', (request) => {
      const info = request.requestInfo;
      return {
        ipAddressType: typeof info.ipAddress,
        userAgentType: typeof info.userAgent,
        keys: Object.keys(info).sort(),
      };
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  // ============================================================================
  // IP Address Extraction Tests
  // ============================================================================

  describe('IP address extraction', () => {
    test('should extract IP address from request', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        ipAddress: string;
        userAgent: string | undefined;
      };
      expect(body.ipAddress).toBeDefined();
      // Fastify inject defaults to 127.0.0.1
      expect(body.ipAddress).toBe('127.0.0.1');
    });

    test('should return "unknown" when IP cannot be determined', async () => {
      // Create a new server with custom behavior
      const customServer = Fastify();

      // Override request.ip to return empty string
      customServer.addHook('onRequest', (req, _reply, done) => {
        Object.defineProperty(req, 'ip', { value: '', writable: true });
        done();
      });

      registerRequestInfoHook(customServer);

      customServer.get('/test', (request) => {
        return {
          ipAddress: request.requestInfo.ipAddress,
        };
      });

      await customServer.ready();

      const response = await customServer.inject({
        method: 'GET',
        url: '/test',
      });

      const body = JSON.parse(response.body) as { ipAddress: string };
      expect(body.ipAddress).toBe('unknown');

      await customServer.close();
    });
  });

  // ============================================================================
  // User Agent Extraction Tests
  // ============================================================================

  describe('User agent extraction', () => {
    test('should extract user agent from headers', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Test Browser';

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'user-agent': userAgent,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        ipAddress: string;
        userAgent: string | undefined;
      };
      expect(body.userAgent).toBe(userAgent);
    });

    test('should return the default inject user agent when no header provided', async () => {
      // Note: Fastify's inject method sets 'lightMyRequest' as default user agent
      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        ipAddress: string;
        userAgent: string | undefined;
      };
      // Fastify inject sets default user agent to 'lightMyRequest'
      expect(body.userAgent).toBe('lightMyRequest');
    });

    test('should truncate long user agents to prevent log bloat', async () => {
      const maxLength = 500;
      const longUserAgent = 'A'.repeat(1000);

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'user-agent': longUserAgent,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        ipAddress: string;
        userAgent: string | undefined;
      };
      expect(body.userAgent).toBeDefined();
      expect(body.userAgent!.length).toBe(maxLength);
      expect(body.userAgent).toBe('A'.repeat(maxLength));
    });

    test('should handle user agent exactly at max length', async () => {
      const maxLength = 500;
      const exactLengthUserAgent = 'B'.repeat(maxLength);

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'user-agent': exactLengthUserAgent,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        ipAddress: string;
        userAgent: string | undefined;
      };
      expect(body.userAgent).toBe(exactLengthUserAgent);
      expect(body.userAgent!.length).toBe(maxLength);
    });

    test('should handle user agent just under max length', async () => {
      const maxLength = 500;
      const underLengthUserAgent = 'C'.repeat(maxLength - 1);

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'user-agent': underLengthUserAgent,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        ipAddress: string;
        userAgent: string | undefined;
      };
      expect(body.userAgent).toBe(underLengthUserAgent);
      expect(body.userAgent!.length).toBe(maxLength - 1);
    });

    test('should handle empty user agent string as undefined', async () => {
      // Create a server that explicitly tests empty string handling
      const customServer = Fastify();
      registerRequestInfoHook(customServer);

      customServer.get('/test', (request) => {
        return {
          userAgent: request.requestInfo.userAgent,
        };
      });

      await customServer.ready();

      // Use raw header manipulation to set empty user-agent
      const response = await customServer.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'user-agent': '',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { userAgent: string | undefined };
      // Empty string should be treated as undefined
      expect(body.userAgent).toBeUndefined();

      await customServer.close();
    });
  });

  // ============================================================================
  // Hook Behavior Tests
  // ============================================================================

  describe('hook behavior', () => {
    test('should attach requestInfo on every request', async () => {
      // Make multiple requests
      for (let i = 0; i < 3; i++) {
        const response = await server.inject({
          method: 'GET',
          url: '/test',
          headers: {
            'user-agent': `Test Agent ${String(i)}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as {
          ipAddress: string;
          userAgent: string | undefined;
        };
        expect(body.ipAddress).toBe('127.0.0.1');
        expect(body.userAgent).toBe(`Test Agent ${String(i)}`);
      }
    });

    test('should work with different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT'] as const;
      const urls = ['/test', '/test-post', '/test-put'];

      for (let i = 0; i < methods.length; i++) {
        const response = await server.inject({
          method: methods[i],
          url: urls[i],
          headers: {
            'user-agent': 'Test Agent',
          },
          ...(methods[i] !== 'GET' ? { payload: {} } : {}),
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as {
          ipAddress: string;
          userAgent: string | undefined;
        };
        expect(body.ipAddress).toBeDefined();
        expect(body.userAgent).toBe('Test Agent');
      }
    });

    test('should be available in route handlers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/handler-test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { hasIpAddress: boolean; hasUserAgent: boolean };
      expect(body.hasIpAddress).toBe(true);
      expect(body.hasUserAgent).toBe(true);
    });
  });

  // ============================================================================
  // Real-World User Agent Tests
  // ============================================================================

  describe('real-world user agents', () => {
    const realUserAgents = [
      {
        name: 'Chrome on Windows',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      {
        name: 'Firefox on macOS',
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      },
      {
        name: 'Safari on iOS',
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      },
      {
        name: 'Edge on Windows',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      },
      {
        name: 'curl',
        ua: 'curl/8.4.0',
      },
      {
        name: 'Bot',
        ua: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      },
    ];

    for (const { name, ua } of realUserAgents) {
      test(`should handle ${name} user agent`, async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/test',
          headers: {
            'user-agent': ua,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as {
          ipAddress: string;
          userAgent: string | undefined;
        };
        expect(body.userAgent).toBe(ua);
      });
    }
  });

  // ============================================================================
  // Type Safety Tests
  // ============================================================================

  describe('type safety', () => {
    test('requestInfo should have correct shape', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/type-test',
        headers: {
          'user-agent': 'Test',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        ipAddressType: string;
        userAgentType: string;
        keys: string[];
      };
      expect(body.ipAddressType).toBe('string');
      expect(body.userAgentType).toBe('string');
      expect(body.keys).toEqual(['ipAddress', 'userAgent']);
    });
  });
});
