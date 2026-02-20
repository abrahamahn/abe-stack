// main/server/system/src/security/ip-blocklist.test.ts
/**
 * IP Blocklist Middleware Tests
 */

import { describe, expect, it, vi } from 'vitest';

import {
  createIpBlocklist,
  createIpBlocklistMiddleware,
  ipv4ToInt,
  isInCidrRange,
  parseCidr,
  type IpReputationProvider,
} from './ip-blocklist';

import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// IP Parsing Tests
// ============================================================================

describe('ipv4ToInt', () => {
  it('should parse valid IPv4 addresses', () => {
    expect(ipv4ToInt('0.0.0.0')).toBe(0);
    expect(ipv4ToInt('0.0.0.1')).toBe(1);
    expect(ipv4ToInt('192.168.1.1')).toBe(3232235777);
    expect(ipv4ToInt('10.0.0.1')).toBe(167772161);
    expect(ipv4ToInt('255.255.255.255')).toBe(4294967295);
  });

  it('should return undefined for invalid addresses', () => {
    expect(ipv4ToInt('')).toBeUndefined();
    expect(ipv4ToInt('1.2.3')).toBeUndefined();
    expect(ipv4ToInt('1.2.3.4.5')).toBeUndefined();
    expect(ipv4ToInt('256.1.1.1')).toBeUndefined();
    expect(ipv4ToInt('-1.1.1.1')).toBeUndefined();
    expect(ipv4ToInt('abc.def.ghi.jkl')).toBeUndefined();
  });
});

describe('parseCidr', () => {
  it('should parse valid CIDR ranges', () => {
    const result = parseCidr('192.168.0.0/16');
    expect(result).toBeDefined();
    expect(result?.original).toBe('192.168.0.0/16');
  });

  it('should return undefined for invalid CIDR', () => {
    expect(parseCidr('192.168.0.0')).toBeUndefined(); // No prefix
    expect(parseCidr('192.168.0.0/33')).toBeUndefined(); // Prefix too large
    expect(parseCidr('192.168.0.0/-1')).toBeUndefined(); // Negative prefix
    expect(parseCidr('invalid/16')).toBeUndefined(); // Invalid IP
  });

  it('should handle /0 and /32 edge cases', () => {
    const zero = parseCidr('0.0.0.0/0');
    expect(zero).toBeDefined();

    const thirtyTwo = parseCidr('192.168.1.1/32');
    expect(thirtyTwo).toBeDefined();
  });
});

describe('isInCidrRange', () => {
  it('should match IPs within CIDR range', () => {
    const range = parseCidr('192.168.0.0/16')!;
    const ip1 = ipv4ToInt('192.168.0.1')!;
    const ip2 = ipv4ToInt('192.168.255.255')!;
    const ip3 = ipv4ToInt('192.169.0.1')!;

    expect(isInCidrRange(ip1, range)).toBe(true);
    expect(isInCidrRange(ip2, range)).toBe(true);
    expect(isInCidrRange(ip3, range)).toBe(false);
  });

  it('should match /32 as exact IP', () => {
    const range = parseCidr('10.0.0.1/32')!;
    const match = ipv4ToInt('10.0.0.1')!;
    const noMatch = ipv4ToInt('10.0.0.2')!;

    expect(isInCidrRange(match, range)).toBe(true);
    expect(isInCidrRange(noMatch, range)).toBe(false);
  });

  it('should match /0 as all IPs', () => {
    const range = parseCidr('0.0.0.0/0')!;
    const ip = ipv4ToInt('123.45.67.89')!;

    expect(isInCidrRange(ip, range)).toBe(true);
  });
});

// ============================================================================
// IpBlocklist Tests
// ============================================================================

describe('IpBlocklist', () => {
  describe('exact IP blocking', () => {
    it('should block IPs in the global blocklist', async () => {
      const blocklist = createIpBlocklist({
        globalBlocklist: ['1.2.3.4', '5.6.7.8'],
      });

      expect(await blocklist.check('1.2.3.4')).toBe('IP blocked by global blocklist');
      expect(await blocklist.check('5.6.7.8')).toBe('IP blocked by global blocklist');
      expect(await blocklist.check('9.10.11.12')).toBeNull();
    });

    it('should block IPs in strict blocklist only for strict policy', async () => {
      const blocklist = createIpBlocklist({
        strictBlocklist: ['1.2.3.4'],
      });

      // Standard policy should not check strict blocklist
      expect(await blocklist.check('1.2.3.4', 'standard')).toBeNull();
      // Strict policy should check strict blocklist
      expect(await blocklist.check('1.2.3.4', 'strict')).toBe('IP blocked by strict blocklist');
    });

    it('should skip all checks for permissive policy', async () => {
      const blocklist = createIpBlocklist({
        globalBlocklist: ['1.2.3.4'],
        strictBlocklist: ['1.2.3.4'],
      });

      expect(await blocklist.check('1.2.3.4', 'permissive')).toBeNull();
    });
  });

  describe('CIDR range blocking', () => {
    it('should block IPs in CIDR ranges', async () => {
      const blocklist = createIpBlocklist({
        globalBlocklist: ['10.0.0.0/8'],
      });

      expect(await blocklist.check('10.0.0.1')).toBe('IP blocked by global blocklist');
      expect(await blocklist.check('10.255.255.255')).toBe('IP blocked by global blocklist');
      expect(await blocklist.check('11.0.0.1')).toBeNull();
    });
  });

  describe('allowlist', () => {
    it('should allow IPs in the allowlist even if blocklisted', async () => {
      const blocklist = createIpBlocklist({
        globalBlocklist: ['10.0.0.0/8'],
        allowlist: ['10.0.0.1'],
      });

      expect(await blocklist.check('10.0.0.1')).toBeNull();
      expect(await blocklist.check('10.0.0.2')).toBe('IP blocked by global blocklist');
    });

    it('should support CIDR ranges in allowlist', async () => {
      const blocklist = createIpBlocklist({
        globalBlocklist: ['10.0.0.0/8'],
        allowlist: ['10.0.1.0/24'],
      });

      expect(await blocklist.check('10.0.1.1')).toBeNull();
      expect(await blocklist.check('10.0.2.1')).toBe('IP blocked by global blocklist');
    });
  });

  describe('reputation providers', () => {
    it('should consult reputation providers', async () => {
      const provider: IpReputationProvider = {
        name: 'TestProvider',
        check: vi.fn().mockResolvedValue({ blocked: true, reason: 'Known bad actor' }),
      };

      const blocklist = createIpBlocklist({
        reputationProviders: [provider],
      });

      const result = await blocklist.check('1.2.3.4');
      expect(result).toBe('IP blocked by TestProvider: Known bad actor');
      expect(provider.check).toHaveBeenCalledWith('1.2.3.4');
    });

    it('should continue if provider returns not blocked', async () => {
      const provider: IpReputationProvider = {
        name: 'TestProvider',
        check: vi.fn().mockResolvedValue({ blocked: false }),
      };

      const blocklist = createIpBlocklist({
        reputationProviders: [provider],
      });

      expect(await blocklist.check('1.2.3.4')).toBeNull();
    });

    it('should handle provider errors gracefully', async () => {
      const provider: IpReputationProvider = {
        name: 'BrokenProvider',
        check: vi.fn().mockRejectedValue(new Error('Service unavailable')),
      };

      const blocklist = createIpBlocklist({
        reputationProviders: [provider],
      });

      // Should not block on provider error
      expect(await blocklist.check('1.2.3.4')).toBeNull();
    });

    it('should handle provider returning null', async () => {
      const provider: IpReputationProvider = {
        name: 'SkipProvider',
        check: vi.fn().mockResolvedValue(null),
      };

      const blocklist = createIpBlocklist({
        reputationProviders: [provider],
      });

      expect(await blocklist.check('1.2.3.4')).toBeNull();
    });
  });

  describe('dynamic updates', () => {
    it('should support adding IPs at runtime', async () => {
      const blocklist = createIpBlocklist();

      expect(await blocklist.check('1.2.3.4')).toBeNull();

      blocklist.add('1.2.3.4', 'global');
      expect(await blocklist.check('1.2.3.4')).toBe('IP blocked by global blocklist');
    });

    it('should support removing IPs at runtime', async () => {
      const blocklist = createIpBlocklist({
        globalBlocklist: ['1.2.3.4'],
      });

      expect(await blocklist.check('1.2.3.4')).toBe('IP blocked by global blocklist');

      blocklist.remove('1.2.3.4', 'global');
      expect(await blocklist.check('1.2.3.4')).toBeNull();
    });

    it('should support adding CIDR ranges at runtime', async () => {
      const blocklist = createIpBlocklist();

      blocklist.add('10.0.0.0/8', 'global');
      expect(await blocklist.check('10.0.0.1')).toBe('IP blocked by global blocklist');
    });
  });

  describe('synchronous check', () => {
    it('should block IPs without reputation providers', async () => {
      const blocklist = createIpBlocklist({
        globalBlocklist: ['1.2.3.4'],
        strictBlocklist: ['5.6.7.8'],
        allowlist: ['9.10.11.12'],
      });

      expect(await blocklist.check('1.2.3.4')).toBe('IP blocked by global blocklist');
      expect(await blocklist.check('5.6.7.8', 'strict')).toBe('IP blocked by strict blocklist');
      expect(await blocklist.check('5.6.7.8', 'standard')).toBeNull();
      expect(await blocklist.check('9.10.11.12')).toBeNull();
      expect(await blocklist.check('99.99.99.99', 'permissive')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return list sizes', () => {
      const blocklist = createIpBlocklist({
        globalBlocklist: ['1.2.3.4', '10.0.0.0/8'],
        strictBlocklist: ['5.6.7.8'],
        allowlist: ['127.0.0.1'],
      });

      const stats = blocklist.getStats();
      expect(stats.globalExactCount).toBe(1);
      expect(stats.globalCidrCount).toBe(1);
      expect(stats.strictExactCount).toBe(1);
      expect(stats.strictCidrCount).toBe(0);
      expect(stats.allowlistExactCount).toBe(1);
      expect(stats.allowlistCidrCount).toBe(0);
    });
  });
});

// ============================================================================
// Middleware Factory Tests
// ============================================================================

describe('createIpBlocklistMiddleware', () => {
  function createMockRequest(
    ip: string,
    routeConfig: Record<string, unknown> = {},
  ): FastifyRequest {
    return {
      ip,
      routeOptions: { config: routeConfig },
    } as unknown as FastifyRequest;
  }

  function createMockReply(): FastifyReply {
    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    return reply as unknown as FastifyReply;
  }

  it('should block requests from blocklisted IPs', async () => {
    const middleware = createIpBlocklistMiddleware({
      globalBlocklist: ['1.2.3.4'],
    });

    const request = createMockRequest('1.2.3.4');
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Forbidden' });
  });

  it('should allow requests from non-blocklisted IPs', async () => {
    const middleware = createIpBlocklistMiddleware({
      globalBlocklist: ['1.2.3.4'],
    });

    const request = createMockRequest('5.6.7.8');
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it('should use per-route policy from route config', async () => {
    const middleware = createIpBlocklistMiddleware({
      strictBlocklist: ['1.2.3.4'],
    });

    // Standard policy (default) - should not block
    const req1 = createMockRequest('1.2.3.4');
    const reply1 = createMockReply();
    await middleware(req1, reply1);
    expect(reply1.status).not.toHaveBeenCalled();

    // Strict policy via route config - should block
    const req2 = createMockRequest('1.2.3.4', { ipPolicy: 'strict' });
    const reply2 = createMockReply();
    await middleware(req2, reply2);
    expect(reply2.status).toHaveBeenCalledWith(403);
  });

  it('should call onBlocked callback', async () => {
    const onBlocked = vi.fn();
    const middleware = createIpBlocklistMiddleware({
      globalBlocklist: ['1.2.3.4'],
      onBlocked,
    });

    const request = createMockRequest('1.2.3.4');
    const reply = createMockReply();

    await middleware(request, reply);

    expect(onBlocked).toHaveBeenCalledWith('1.2.3.4', 'IP blocked by global blocklist', request);
  });

  it('should support custom status code and response body', async () => {
    const middleware = createIpBlocklistMiddleware({
      globalBlocklist: ['1.2.3.4'],
      blockStatusCode: 429,
      blockResponseBody: { message: 'Too Many Requests' },
    });

    const request = createMockRequest('1.2.3.4');
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply.status).toHaveBeenCalledWith(429);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Too Many Requests' });
  });
});
