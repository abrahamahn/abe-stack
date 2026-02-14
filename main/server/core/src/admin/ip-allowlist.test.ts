// main/server/core/src/admin/ip-allowlist.test.ts
/**
 * IP Allowlist Middleware Tests
 *
 * @module admin/ip-allowlist.test
 */

import { ForbiddenError } from '@abe-stack/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createIpAllowlistMiddleware } from './ip-allowlist';

import type { IpAllowlistConfig } from './ip-allowlist';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a mock Fastify request with a specific IP */
function createMockRequest(ip: string): FastifyRequest {
  return {
    ip,
  } as FastifyRequest;
}

/** Create a mock Fastify reply */
function createMockReply(): FastifyReply {
  return {} as FastifyReply;
}

// ============================================================================
// Tests
// ============================================================================

describe('IP Allowlist Middleware', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env['NODE_ENV'];
    vi.clearAllMocks();
  });

  describe('when disabled', () => {
    it('should allow all requests to pass through', async () => {
      const config: IpAllowlistConfig = {
        enabled: false,
        allowedIps: [],
        allowedCidrs: [],
      };

      const middleware = createIpAllowlistMiddleware(config);
      const request = createMockRequest('1.2.3.4');
      const reply = createMockReply();

      await expect(middleware(request, reply)).resolves.toBeUndefined();
    });

    it('should allow requests even with empty allowlists', async () => {
      const config: IpAllowlistConfig = {
        enabled: false,
        allowedIps: [],
        allowedCidrs: [],
      };

      const middleware = createIpAllowlistMiddleware(config);
      const request = createMockRequest('203.0.113.99');
      const reply = createMockReply();

      await expect(middleware(request, reply)).resolves.toBeUndefined();
    });
  });

  describe('when enabled', () => {
    describe('exact IP matching', () => {
      it('should allow requests from allowed IPs', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: ['203.0.113.5', '198.51.100.10'],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('203.0.113.5');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
      });

      it('should block requests from non-allowed IPs', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: ['203.0.113.5'],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('203.0.113.99');
        const reply = createMockReply();

        await expect(middleware(request, reply)).rejects.toThrow(ForbiddenError);
        await expect(middleware(request, reply)).rejects.toThrow('Forbidden: IP not allowed');
      });

      it('should match the second IP in the allowlist', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: ['203.0.113.5', '198.51.100.10', '192.0.2.1'],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('198.51.100.10');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
      });
    });

    describe('CIDR range matching', () => {
      it('should allow IPs within CIDR range (/24)', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: ['192.168.1.0/24'],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('192.168.1.100');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
      });

      it('should allow IPs at the start of CIDR range', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: ['10.0.0.0/8'],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('10.0.0.1');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
      });

      it('should allow IPs at the end of CIDR range', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: ['10.0.0.0/8'],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('10.255.255.254');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
      });

      it('should block IPs outside CIDR range', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: ['192.168.1.0/24'],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('192.168.2.100');
        const reply = createMockReply();

        await expect(middleware(request, reply)).rejects.toThrow(ForbiddenError);
      });

      it('should handle /16 CIDR ranges', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: ['172.16.0.0/16'],
        };

        const middleware = createIpAllowlistMiddleware(config);

        // Within range
        const requestInRange = createMockRequest('172.16.5.100');
        await expect(middleware(requestInRange, createMockReply())).resolves.toBeUndefined();

        // Outside range
        const requestOutOfRange = createMockRequest('172.17.0.1');
        await expect(middleware(requestOutOfRange, createMockReply())).rejects.toThrow(
          ForbiddenError,
        );
      });

      it('should handle /8 CIDR ranges', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: ['10.0.0.0/8'],
        };

        const middleware = createIpAllowlistMiddleware(config);

        // Within range
        const requestInRange = createMockRequest('10.123.45.67');
        await expect(middleware(requestInRange, createMockReply())).resolves.toBeUndefined();

        // Outside range
        const requestOutOfRange = createMockRequest('11.0.0.1');
        await expect(middleware(requestOutOfRange, createMockReply())).rejects.toThrow(
          ForbiddenError,
        );
      });

      it('should match the first matching CIDR range', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: ['192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/16'],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('192.168.1.50');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
      });
    });

    describe('combined IP and CIDR matching', () => {
      it('should allow IPs that match exact allowlist', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: ['203.0.113.5'],
          allowedCidrs: ['10.0.0.0/8'],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('203.0.113.5');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
      });

      it('should allow IPs that match CIDR range', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: ['203.0.113.5'],
          allowedCidrs: ['10.0.0.0/8'],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('10.1.2.3');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
      });

      it('should block IPs that match neither', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: ['203.0.113.5'],
          allowedCidrs: ['10.0.0.0/8'],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('198.51.100.1');
        const reply = createMockReply();

        await expect(middleware(request, reply)).rejects.toThrow(ForbiddenError);
      });
    });

    describe('localhost handling in development', () => {
      it('should allow localhost (127.0.0.1) in development mode', async () => {
        process.env['NODE_ENV'] = 'development';

        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('127.0.0.1');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();

        process.env['NODE_ENV'] = originalEnv;
      });

      it('should allow IPv6 localhost (::1) in development mode', async () => {
        process.env['NODE_ENV'] = 'development';

        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('::1');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();

        process.env['NODE_ENV'] = originalEnv;
      });

      it('should allow IPv4-mapped IPv6 localhost (::ffff:127.0.0.1) in development', async () => {
        process.env['NODE_ENV'] = 'development';

        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('::ffff:127.0.0.1');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();

        process.env['NODE_ENV'] = originalEnv;
      });

      it('should block localhost in production mode when not in allowlist', async () => {
        process.env['NODE_ENV'] = 'production';

        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('127.0.0.1');
        const reply = createMockReply();

        await expect(middleware(request, reply)).rejects.toThrow(ForbiddenError);

        process.env['NODE_ENV'] = originalEnv;
      });

      it('should block non-localhost IPs in development when not in allowlist', async () => {
        process.env['NODE_ENV'] = 'development';

        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('203.0.113.5');
        const reply = createMockReply();

        await expect(middleware(request, reply)).rejects.toThrow(ForbiddenError);

        process.env['NODE_ENV'] = originalEnv;
      });
    });

    describe('empty allowlist behavior', () => {
      it('should block all non-localhost IPs when allowlists are empty', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('203.0.113.5');
        const reply = createMockReply();

        await expect(middleware(request, reply)).rejects.toThrow(ForbiddenError);
      });

      it('should block all IPs when only allowedCidrs is empty', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('10.0.0.1');
        const reply = createMockReply();

        await expect(middleware(request, reply)).rejects.toThrow(ForbiddenError);
      });
    });

    describe('error code verification', () => {
      it('should throw ForbiddenError with IP_NOT_ALLOWED code', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: ['203.0.113.5'],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('198.51.100.1');
        const reply = createMockReply();

        try {
          await middleware(request, reply);
          expect.fail('Should have thrown ForbiddenError');
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenError);
          expect((error as ForbiddenError).code).toBe('IP_NOT_ALLOWED');
          expect((error as ForbiddenError).message).toBe('Forbidden: IP not allowed');
        }
      });
    });

    describe('edge cases', () => {
      it('should handle 127.x.x.x as localhost', async () => {
        process.env['NODE_ENV'] = 'development';

        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: [],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('127.0.0.5');
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();

        process.env['NODE_ENV'] = originalEnv;
      });

      it('should handle invalid CIDR gracefully', async () => {
        const config: IpAllowlistConfig = {
          enabled: true,
          allowedIps: [],
          allowedCidrs: ['invalid-cidr'],
        };

        const middleware = createIpAllowlistMiddleware(config);
        const request = createMockRequest('10.0.0.1');
        const reply = createMockReply();

        // Invalid CIDR should not match, so request should be blocked
        await expect(middleware(request, reply)).rejects.toThrow(ForbiddenError);
      });
    });
  });
});
