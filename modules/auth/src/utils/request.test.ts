// modules/auth/src/utils/request.test.ts
import { extractRequestInfo } from './request';
import { describe, expect, test } from 'vitest';

describe('Request Utilities', () => {
  describe('extractRequestInfo', () => {
    test('should extract IP address from request', () => {
      const mockRequest = {
        ip: '192.168.1.100',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };

      const info = extractRequestInfo(mockRequest as never);

      expect(info.ipAddress).toBe('192.168.1.100');
    });

    test('should extract user agent from headers', () => {
      const mockRequest = {
        ip: '192.168.1.100',
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      };

      const info = extractRequestInfo(mockRequest as never);

      expect(info.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    test('should return undefined for missing IP', () => {
      const mockRequest = {
        ip: undefined,
        headers: { 'user-agent': 'Mozilla/5.0' },
      };

      const info = extractRequestInfo(mockRequest as never);

      expect(info.ipAddress).toBeUndefined();
    });

    test('should return undefined for missing user agent', () => {
      const mockRequest = {
        ip: '192.168.1.100',
        headers: {},
      };

      const info = extractRequestInfo(mockRequest as never);

      expect(info.userAgent).toBeUndefined();
    });

    test('should truncate long user agent strings', () => {
      const longUserAgent = 'A'.repeat(600);
      const mockRequest = {
        ip: '192.168.1.100',
        headers: { 'user-agent': longUserAgent },
      };

      const info = extractRequestInfo(mockRequest as never);

      expect(info.userAgent).toHaveLength(500);
    });

    test('should handle non-string user agent', () => {
      const mockRequest = {
        ip: '192.168.1.100',
        headers: { 'user-agent': ['array', 'value'] },
      };

      const info = extractRequestInfo(mockRequest as never);

      expect(info.userAgent).toBeUndefined();
    });

    test('should return both IP and user agent when available', () => {
      const mockRequest = {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'TestAgent/1.0' },
      };

      const info = extractRequestInfo(mockRequest as never);

      expect(info).toEqual({
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent/1.0',
      });
    });
  });
});
