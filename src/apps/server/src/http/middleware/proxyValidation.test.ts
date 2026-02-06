// apps/server/src/http/middleware/proxyValidation.test.ts
import { describe, expect, test } from 'vitest';

import {
  getValidatedClientIp,
  ipMatchesCidr,
  isFromTrustedProxy,
  isValidIp,
  isValidIpv4,
  isValidIpv6,
  parseCidr,
  parseXForwardedFor,
  validateCidrList,
} from './proxyValidation';

// ============================================================================
// Tests
// ============================================================================

describe('proxyValidation', () => {
  describe('isValidIpv4', () => {
    test('should accept valid IPv4 addresses', () => {
      expect(isValidIpv4('192.168.1.1')).toBe(true);
      expect(isValidIpv4('10.0.0.0')).toBe(true);
      expect(isValidIpv4('255.255.255.255')).toBe(true);
      expect(isValidIpv4('0.0.0.0')).toBe(true);
      expect(isValidIpv4('127.0.0.1')).toBe(true);
    });

    test('should reject invalid IPv4 addresses', () => {
      expect(isValidIpv4('256.1.1.1')).toBe(false);
      expect(isValidIpv4('192.168.1')).toBe(false);
      expect(isValidIpv4('192.168.1.1.1')).toBe(false);
      expect(isValidIpv4('192.168.1.-1')).toBe(false);
      expect(isValidIpv4('192.168.1.abc')).toBe(false);
      expect(isValidIpv4('')).toBe(false);
      expect(isValidIpv4('192.168.01.1')).toBe(false); // Leading zeros
    });
  });

  describe('isValidIpv6', () => {
    test('should accept valid IPv6 addresses', () => {
      expect(isValidIpv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isValidIpv6('2001:db8:85a3::8a2e:370:7334')).toBe(true);
      expect(isValidIpv6('::1')).toBe(true);
      expect(isValidIpv6('::')).toBe(true);
      expect(isValidIpv6('fe80::1')).toBe(true);
    });

    test('should accept IPv4-mapped IPv6 addresses', () => {
      expect(isValidIpv6('::ffff:192.168.1.1')).toBe(true);
      expect(isValidIpv6('::ffff:10.0.0.1')).toBe(true);
    });

    test('should reject invalid IPv6 addresses', () => {
      expect(isValidIpv6('2001:db8::85a3::7334')).toBe(false); // Multiple ::
      expect(isValidIpv6('2001:db8:85a3:0000:0000:8a2e:0370:7334:extra')).toBe(false);
      expect(isValidIpv6('gggg::1')).toBe(false);
      expect(isValidIpv6('')).toBe(false);
    });
  });

  describe('isValidIp', () => {
    test('should accept both IPv4 and IPv6', () => {
      expect(isValidIp('192.168.1.1')).toBe(true);
      expect(isValidIp('2001:db8::1')).toBe(true);
      expect(isValidIp('::ffff:192.168.1.1')).toBe(true);
    });

    test('should reject invalid IPs', () => {
      expect(isValidIp('invalid')).toBe(false);
      expect(isValidIp('')).toBe(false);
      expect(isValidIp('300.300.300.300')).toBe(false);
    });
  });

  describe('parseCidr', () => {
    test('should parse valid IPv4 CIDR', () => {
      expect(parseCidr('192.168.1.0/24')).toEqual({ ip: '192.168.1.0', prefixLength: 24 });
      expect(parseCidr('10.0.0.0/8')).toEqual({ ip: '10.0.0.0', prefixLength: 8 });
      expect(parseCidr('0.0.0.0/0')).toEqual({ ip: '0.0.0.0', prefixLength: 0 });
    });

    test('should parse valid IPv6 CIDR', () => {
      expect(parseCidr('2001:db8::/32')).toEqual({ ip: '2001:db8::', prefixLength: 32 });
      expect(parseCidr('::1/128')).toEqual({ ip: '::1', prefixLength: 128 });
    });

    test('should treat single IP as /32 (IPv4) or /128 (IPv6)', () => {
      expect(parseCidr('192.168.1.1')).toEqual({ ip: '192.168.1.1', prefixLength: 32 });
      expect(parseCidr('::1')).toEqual({ ip: '::1', prefixLength: 128 });
    });

    test('should return null for invalid CIDR', () => {
      expect(parseCidr('192.168.1.0/33')).toBeNull(); // Invalid prefix for IPv4
      expect(parseCidr('invalid/24')).toBeNull();
      expect(parseCidr('192.168.1.0/-1')).toBeNull();
      expect(parseCidr('192.168.1.0/abc')).toBeNull();
    });
  });

  describe('ipMatchesCidr', () => {
    test('should match IPv4 addresses within CIDR range', () => {
      expect(ipMatchesCidr('192.168.1.50', '192.168.1.0/24')).toBe(true);
      expect(ipMatchesCidr('192.168.1.0', '192.168.1.0/24')).toBe(true);
      expect(ipMatchesCidr('192.168.1.255', '192.168.1.0/24')).toBe(true);
      expect(ipMatchesCidr('10.0.0.1', '10.0.0.0/8')).toBe(true);
      expect(ipMatchesCidr('10.255.255.255', '10.0.0.0/8')).toBe(true);
    });

    test('should not match IPv4 addresses outside CIDR range', () => {
      expect(ipMatchesCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);
      expect(ipMatchesCidr('11.0.0.1', '10.0.0.0/8')).toBe(false);
    });

    test('should match IPv6 addresses within CIDR range', () => {
      expect(ipMatchesCidr('2001:db8::1', '2001:db8::/32')).toBe(true);
      expect(ipMatchesCidr('2001:db8:ffff::1', '2001:db8::/32')).toBe(true);
    });

    test('should not match IPv6 addresses outside CIDR range', () => {
      expect(ipMatchesCidr('2001:db9::1', '2001:db8::/32')).toBe(false);
    });

    test('should not match different IP versions', () => {
      expect(ipMatchesCidr('192.168.1.1', '2001:db8::/32')).toBe(false);
      expect(ipMatchesCidr('2001:db8::1', '192.168.1.0/24')).toBe(false);
    });

    test('should handle /0 prefix (matches all)', () => {
      expect(ipMatchesCidr('192.168.1.1', '0.0.0.0/0')).toBe(true);
      expect(ipMatchesCidr('10.0.0.1', '0.0.0.0/0')).toBe(true);
    });

    test('should handle /32 prefix (exact match)', () => {
      expect(ipMatchesCidr('192.168.1.1', '192.168.1.1/32')).toBe(true);
      expect(ipMatchesCidr('192.168.1.2', '192.168.1.1/32')).toBe(false);
    });

    test('should return false for invalid input', () => {
      expect(ipMatchesCidr('invalid', '192.168.1.0/24')).toBe(false);
      expect(ipMatchesCidr('192.168.1.1', 'invalid')).toBe(false);
    });
  });

  describe('isFromTrustedProxy', () => {
    const trustedProxies = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.1', '::1'];

    test('should match IP in CIDR range', () => {
      expect(isFromTrustedProxy('10.0.0.5', trustedProxies)).toBe(true);
      expect(isFromTrustedProxy('10.255.255.255', trustedProxies)).toBe(true);
      expect(isFromTrustedProxy('172.16.0.1', trustedProxies)).toBe(true);
      expect(isFromTrustedProxy('172.31.255.255', trustedProxies)).toBe(true);
    });

    test('should match exact IP', () => {
      expect(isFromTrustedProxy('192.168.0.1', trustedProxies)).toBe(true);
      expect(isFromTrustedProxy('::1', trustedProxies)).toBe(true);
    });

    test('should not match untrusted IPs', () => {
      expect(isFromTrustedProxy('8.8.8.8', trustedProxies)).toBe(false);
      expect(isFromTrustedProxy('192.168.0.2', trustedProxies)).toBe(false);
      expect(isFromTrustedProxy('11.0.0.1', trustedProxies)).toBe(false);
    });

    test('should return false for empty inputs', () => {
      expect(isFromTrustedProxy('', trustedProxies)).toBe(false);
      expect(isFromTrustedProxy('10.0.0.1', [])).toBe(false);
      expect(isFromTrustedProxy('invalid', trustedProxies)).toBe(false);
    });
  });

  describe('parseXForwardedFor', () => {
    test('should parse single IP', () => {
      expect(parseXForwardedFor('192.168.1.1')).toEqual(['192.168.1.1']);
    });

    test('should parse multiple IPs', () => {
      expect(parseXForwardedFor('192.168.1.1, 10.0.0.1, 172.16.0.1')).toEqual([
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
      ]);
    });

    test('should handle array input', () => {
      expect(parseXForwardedFor(['192.168.1.1', '10.0.0.1'])).toEqual(['192.168.1.1', '10.0.0.1']);
    });

    test('should filter out invalid IPs', () => {
      expect(parseXForwardedFor('192.168.1.1, invalid, 10.0.0.1')).toEqual([
        '192.168.1.1',
        '10.0.0.1',
      ]);
    });

    test('should handle whitespace', () => {
      expect(parseXForwardedFor('  192.168.1.1  ,  10.0.0.1  ')).toEqual([
        '192.168.1.1',
        '10.0.0.1',
      ]);
    });

    test('should return empty array for undefined/empty', () => {
      expect(parseXForwardedFor(undefined)).toEqual([]);
      expect(parseXForwardedFor('')).toEqual([]);
    });
  });

  describe('getValidatedClientIp', () => {
    const config = {
      trustedProxies: ['10.0.0.0/8', '172.16.0.0/12'],
      maxProxyDepth: 2,
    };

    test('should trust X-Forwarded-For from trusted proxy', () => {
      const result = getValidatedClientIp('203.0.113.50', '10.0.0.5', config);

      expect(result.clientIp).toBe('203.0.113.50');
      expect(result.trusted).toBe(true);
    });

    test('should not trust X-Forwarded-For from untrusted source', () => {
      const result = getValidatedClientIp('spoofed.ip', '1.2.3.4', config);

      expect(result.clientIp).toBe('1.2.3.4');
      expect(result.trusted).toBe(false);
    });

    test('should handle multi-hop proxy chain', () => {
      const result = getValidatedClientIp('203.0.113.50, 10.0.0.5', '10.0.0.10', config);

      expect(result.clientIp).toBe('203.0.113.50');
      expect(result.trusted).toBe(true);
      expect(result.proxyChain).toContain('10.0.0.10');
    });

    test('should respect maxProxyDepth', () => {
      const limitedConfig = { ...config, maxProxyDepth: 1 };

      const result = getValidatedClientIp(
        '203.0.113.50, 10.0.0.5, 10.0.0.6',
        '10.0.0.10',
        limitedConfig,
      );

      // With depth 1, we only trust one hop back from socket IP
      // Chain: [203.0.113.50, 10.0.0.5, 10.0.0.6, 10.0.0.10]
      // Walk back from socket (index 3) to index 2 (10.0.0.6), then stop
      // Client IP is the one before that: 10.0.0.5
      expect(result.clientIp).toBe('10.0.0.5');
    });

    test('should use socket IP when no X-Forwarded-For', () => {
      const result = getValidatedClientIp(undefined, '10.0.0.5', config);

      expect(result.clientIp).toBe('10.0.0.5');
      expect(result.trusted).toBe(true);
    });

    test('should stop at first non-proxy IP in chain', () => {
      const result = getValidatedClientIp(
        '203.0.113.50, 8.8.8.8, 10.0.0.5', // 8.8.8.8 is not trusted
        '10.0.0.10',
        config,
      );

      // Should stop at 8.8.8.8 since it's not a trusted proxy
      expect(result.clientIp).toBe('8.8.8.8');
    });
  });

  describe('validateCidrList', () => {
    test('should separate valid and invalid CIDRs', () => {
      const cidrs = ['10.0.0.0/8', 'invalid', '192.168.1.0/24', 'also-invalid/99'];

      const result = validateCidrList(cidrs);

      expect(result.valid).toEqual(['10.0.0.0/8', '192.168.1.0/24']);
      expect(result.invalid).toEqual(['invalid', 'also-invalid/99']);
    });

    test('should handle empty list', () => {
      const result = validateCidrList([]);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    test('should handle all valid CIDRs', () => {
      const cidrs = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];

      const result = validateCidrList(cidrs);

      expect(result.valid).toEqual(cidrs);
      expect(result.invalid).toEqual([]);
    });

    test('should handle all invalid CIDRs', () => {
      const cidrs = ['invalid', 'also-invalid'];

      const result = validateCidrList(cidrs);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual(cidrs);
    });
  });

  describe('common proxy scenarios', () => {
    test('AWS ALB scenario', () => {
      // ALB adds client IP to X-Forwarded-For
      const config = {
        trustedProxies: ['10.0.0.0/8'], // VPC range
        maxProxyDepth: 1,
      };

      const result = getValidatedClientIp(
        '203.0.113.195', // Client IP
        '10.0.1.50', // ALB IP
        config,
      );

      expect(result.clientIp).toBe('203.0.113.195');
      expect(result.trusted).toBe(true);
    });

    test('Cloudflare + nginx scenario', () => {
      const config = {
        trustedProxies: [
          '173.245.48.0/20', // Cloudflare
          '10.0.0.0/8', // Internal
        ],
        maxProxyDepth: 2,
      };

      const result = getValidatedClientIp(
        '203.0.113.50, 173.245.48.10', // Client -> Cloudflare
        '10.0.0.5', // nginx
        config,
      );

      expect(result.clientIp).toBe('203.0.113.50');
    });

    test('direct connection (no proxy)', () => {
      const config = {
        trustedProxies: ['10.0.0.0/8'],
        maxProxyDepth: 1,
      };

      // Direct connection from public IP (no proxy)
      const result = getValidatedClientIp(undefined, '203.0.113.50', config);

      expect(result.clientIp).toBe('203.0.113.50');
      expect(result.trusted).toBe(false);
    });

    test('spoofed header from untrusted client', () => {
      const config = {
        trustedProxies: ['10.0.0.0/8'],
        maxProxyDepth: 1,
      };

      // Malicious client trying to spoof X-Forwarded-For
      const result = getValidatedClientIp(
        '127.0.0.1', // Spoofed header claiming to be localhost
        '203.0.113.50', // Actual client IP (not trusted proxy)
        config,
      );

      // Should ignore the spoofed header
      expect(result.clientIp).toBe('203.0.113.50');
      expect(result.trusted).toBe(false);
    });
  });
});
