// apps/server/src/infra/http/__tests__/security.test.ts
import { applyCors, applySecurityHeaders, handlePreflight } from '@http/security';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('HTTP Security', () => {
  describe('applySecurityHeaders', () => {
    test('should set X-Frame-Options header', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never);

      expect(mockReply.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    test('should set X-Content-Type-Options header', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never);

      expect(mockReply.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    test('should set X-XSS-Protection header', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never);

      expect(mockReply.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    test('should set HSTS header', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    });

    test('should set Referrer-Policy header', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin',
      );
    });

    test('should set Permissions-Policy header', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()',
      );
    });
  });

  describe('applyCors', () => {
    let mockReply: { header: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockReply = { header: vi.fn() };
    });

    test('should allow wildcard origin', () => {
      const mockRequest = { headers: { origin: 'https://example.com' } };

      applyCors(mockRequest as never, mockReply as never, { origin: '*' });

      expect(mockReply.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://example.com',
      );
    });

    test('should allow exact origin match', () => {
      const mockRequest = { headers: { origin: 'https://example.com' } };

      applyCors(mockRequest as never, mockReply as never, { origin: 'https://example.com' });

      expect(mockReply.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://example.com',
      );
    });

    test('should not set origin header when no match', () => {
      const mockRequest = { headers: { origin: 'https://evil.com' } };

      applyCors(mockRequest as never, mockReply as never, { origin: 'https://example.com' });

      expect(mockReply.header).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything(),
      );
    });

    test('should allow comma-separated origins', () => {
      const mockRequest = { headers: { origin: 'https://app.example.com' } };

      applyCors(mockRequest as never, mockReply as never, {
        origin: 'https://example.com, https://app.example.com',
      });

      expect(mockReply.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://app.example.com',
      );
    });

    test('should set credentials header when enabled', () => {
      const mockRequest = { headers: { origin: 'https://example.com' } };

      applyCors(mockRequest as never, mockReply as never, {
        origin: 'https://example.com',
        credentials: true,
      });

      expect(mockReply.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    test('should set allowed headers', () => {
      const mockRequest = { headers: { origin: 'https://example.com' } };

      applyCors(mockRequest as never, mockReply as never, {
        origin: 'https://example.com',
        allowedHeaders: ['Content-Type', 'Authorization'],
      });

      expect(mockReply.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
    });

    test('should set allowed methods', () => {
      const mockRequest = { headers: { origin: 'https://example.com' } };

      applyCors(mockRequest as never, mockReply as never, {
        origin: 'https://example.com',
        allowedMethods: ['GET', 'POST'],
      });

      expect(mockReply.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST');
    });

    test('should set max age', () => {
      const mockRequest = { headers: { origin: 'https://example.com' } };

      applyCors(mockRequest as never, mockReply as never, {
        origin: 'https://example.com',
        maxAge: 7200,
      });

      expect(mockReply.header).toHaveBeenCalledWith('Access-Control-Max-Age', '7200');
    });
  });

  describe('handlePreflight', () => {
    test('should return true and send 204 for OPTIONS requests', () => {
      const mockRequest = { method: 'OPTIONS' };
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const result = handlePreflight(mockRequest as never, mockReply as never);

      expect(result).toBe(true);
      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });

    test('should return false for non-OPTIONS requests', () => {
      const mockRequest = { method: 'GET' };
      const mockReply = { status: vi.fn(), send: vi.fn() };

      const result = handlePreflight(mockRequest as never, mockReply as never);

      expect(result).toBe(false);
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    test('should return false for POST requests', () => {
      const mockRequest = { method: 'POST' };
      const mockReply = { status: vi.fn(), send: vi.fn() };

      const result = handlePreflight(mockRequest as never, mockReply as never);

      expect(result).toBe(false);
    });
  });
});
