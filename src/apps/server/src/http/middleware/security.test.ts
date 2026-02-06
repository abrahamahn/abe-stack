// apps/server/src/http/middleware/security.test.ts
import fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  applyCors,
  applySecurityHeaders,
  getProductionSecurityDefaults,
  handlePreflight,
  hasDangerousKeys,
  registerPrototypePollutionProtection,
  sanitizeObject,
} from './security';

import type { FastifyInstance } from 'fastify';

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

  describe('applySecurityHeaders - all options', () => {
    test('should not set headers when options are disabled', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never, {
        enableHSTS: false,
        enableFrameOptions: false,
        enableContentTypeOptions: false,
        enableXSSProtection: false,
        enableReferrerPolicy: false,
        enablePermissionsPolicy: false,
        enableCSP: false,
        enableCrossOriginEmbedderPolicy: false,
        enableCrossOriginOpenerPolicy: false,
        enableCrossOriginResourcePolicy: false,
      });

      // Should only be called twice for X-Powered-By and Server removal
      expect(mockReply.header).toHaveBeenCalledWith('X-Powered-By', undefined);
      expect(mockReply.header).toHaveBeenCalledWith('Server', undefined);
      expect(mockReply.header).toHaveBeenCalledTimes(2);
    });

    test('should set CSP header when enabled', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never, { enableCSP: true });

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'"),
      );
    });

    test('should set CSP with nonce when provided', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never, { enableCSP: true, cspNonce: 'abc123' });

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("'nonce-abc123'"),
      );
    });

    test('should set Cross-Origin-Embedder-Policy when enabled', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never, { enableCrossOriginEmbedderPolicy: true });

      expect(mockReply.header).toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', 'require-corp');
    });

    test('should set Cross-Origin-Opener-Policy when enabled', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never, { enableCrossOriginOpenerPolicy: true });

      expect(mockReply.header).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin');
    });

    test('should set Cross-Origin-Resource-Policy when enabled', () => {
      const mockReply = { header: vi.fn() };

      applySecurityHeaders(mockReply as never, { enableCrossOriginResourcePolicy: true });

      expect(mockReply.header).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'same-origin');
    });
  });

  describe('getProductionSecurityDefaults', () => {
    test('should return production defaults with CSP enabled', () => {
      const defaults = getProductionSecurityDefaults();

      expect(defaults.enableCSP).toBe(true);
      expect(defaults.enableHSTS).toBe(true);
      expect(defaults.enableFrameOptions).toBe(true);
      expect(defaults.enableContentTypeOptions).toBe(true);
      expect(defaults.enableXSSProtection).toBe(true);
      expect(defaults.enableReferrerPolicy).toBe(true);
      expect(defaults.enablePermissionsPolicy).toBe(true);
      expect(defaults.enableCrossOriginEmbedderPolicy).toBe(false);
      expect(defaults.enableCrossOriginOpenerPolicy).toBe(false);
      expect(defaults.enableCrossOriginResourcePolicy).toBe(false);
    });
  });

  describe('applyCors - additional cases', () => {
    test('should use fallback * when no origin header and wildcard allowed', () => {
      const mockRequest = { headers: {} };
      const mockReply = { header: vi.fn() };

      applyCors(mockRequest as never, mockReply as never, { origin: '*' });

      expect(mockReply.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });

    test('should not set credentials header when disabled', () => {
      const mockRequest = { headers: { origin: 'https://example.com' } };
      const mockReply = { header: vi.fn() };

      applyCors(mockRequest as never, mockReply as never, {
        origin: 'https://example.com',
        credentials: false,
      });

      expect(mockReply.header).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        expect.anything(),
      );
    });
  });

  describe('sanitizeObject', () => {
    test('should pass through primitives unchanged', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(42)).toBe(42);
      expect(sanitizeObject('string')).toBe('string');
      expect(sanitizeObject(true)).toBe(true);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    test('should pass through safe objects', () => {
      const obj = { name: 'test', value: 123 };
      expect(sanitizeObject(obj)).toEqual(obj);
    });

    test('should remove __proto__ key', () => {
      const malicious = { normal: 'value', __proto__: { isAdmin: true } };
      const result = sanitizeObject(malicious);
      expect(result).toEqual({ normal: 'value' });
      expect(result).not.toHaveProperty('__proto__');
    });

    test('should remove constructor key', () => {
      const malicious = { normal: 'value', constructor: { dangerous: true } };
      const result = sanitizeObject(malicious);
      expect(result).toEqual({ normal: 'value' });
    });

    test('should remove prototype key', () => {
      const malicious = { normal: 'value', prototype: { polluted: true } };
      const result = sanitizeObject(malicious);
      expect(result).toEqual({ normal: 'value' });
    });

    test('should sanitize nested objects', () => {
      const malicious = {
        outer: {
          inner: {
            __proto__: { isAdmin: true },
            safe: 'value',
          },
        },
      };
      const result = sanitizeObject(malicious);
      expect(result).toEqual({ outer: { inner: { safe: 'value' } } });
    });

    test('should sanitize arrays', () => {
      const malicious = [{ __proto__: { bad: true }, good: 'value' }, { safe: 'data' }];
      const result = sanitizeObject(malicious);
      expect(result).toEqual([{ good: 'value' }, { safe: 'data' }]);
    });

    test('should handle deeply nested dangerous keys', () => {
      const malicious = {
        level1: {
          level2: {
            level3: {
              constructor: { polluted: true },
              safe: 'value',
            },
          },
        },
      };
      const result = sanitizeObject(malicious);
      expect(result).toEqual({
        level1: { level2: { level3: { safe: 'value' } } },
      });
    });
  });

  describe('hasDangerousKeys', () => {
    test('should return false for primitives', () => {
      expect(hasDangerousKeys(null)).toBe(false);
      expect(hasDangerousKeys(42)).toBe(false);
      expect(hasDangerousKeys('string')).toBe(false);
      expect(hasDangerousKeys(undefined)).toBe(false);
    });

    test('should return false for safe objects', () => {
      expect(hasDangerousKeys({ name: 'test', value: 123 })).toBe(false);
    });

    test('should return true for object with __proto__ key created via Object.defineProperty', () => {
      // __proto__ as a literal key doesn't become enumerable, so we test with an object
      // that explicitly has it as a real key using Object.defineProperty
      const obj = {};
      Object.defineProperty(obj, '__proto__', {
        value: { bad: true },
        enumerable: true,
        configurable: true,
        writable: true,
      });
      expect(hasDangerousKeys(obj)).toBe(true);
    });

    test('should return true for object with constructor key', () => {
      // constructor is a normal property name that gets enumerated
      const obj = Object.create(null); // Create object without prototype
      obj.constructor = { bad: true };
      expect(hasDangerousKeys(obj)).toBe(true);
    });

    test('should return true for object with prototype key', () => {
      // prototype is a normal property name
      const obj = { prototype: { bad: true } };
      expect(hasDangerousKeys(obj)).toBe(true);
    });

    test('should detect nested dangerous keys', () => {
      const obj = { outer: { inner: { prototype: {} } } };
      expect(hasDangerousKeys(obj)).toBe(true);
    });

    test('should detect dangerous keys in arrays', () => {
      expect(hasDangerousKeys([{ prototype: {} }])).toBe(true);
      const obj = Object.create(null);
      obj.constructor = {};
      expect(hasDangerousKeys([{ safe: 'value' }, obj])).toBe(true);
    });

    test('should return false for safe arrays', () => {
      expect(hasDangerousKeys([{ safe: 'value' }, { also: 'safe' }])).toBe(false);
    });
  });

  describe('registerPrototypePollutionProtection', () => {
    let server: FastifyInstance;

    beforeEach(async () => {
      server = fastify();
      registerPrototypePollutionProtection(server);

      server.post('/test', (req) => {
        return { received: req.body };
      });

      await server.ready();
    });

    afterEach(async () => {
      await server.close();
    });

    test('should sanitize JSON body with __proto__', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ safe: 'value', __proto__: { isAdmin: true } }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { received: Record<string, unknown> };
      expect(body.received).toEqual({ safe: 'value' });
      expect(body.received).not.toHaveProperty('__proto__');
    });

    test('should handle empty body', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        headers: { 'content-type': 'application/json' },
        payload: '',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { received: unknown };
      expect(body.received).toBeUndefined();
    });

    test('should handle whitespace-only body', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        headers: { 'content-type': 'application/json' },
        payload: '   ',
      });

      expect(response.statusCode).toBe(200);
    });

    test('should reject invalid JSON with 400', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        headers: { 'content-type': 'application/json' },
        payload: '{invalid json}',
      });

      expect(response.statusCode).toBe(400);
    });

    test('should pass through safe JSON unchanged', async () => {
      const safePayload = { name: 'test', nested: { value: 123 } };
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify(safePayload),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { received: Record<string, unknown> };
      expect(body.received).toEqual(safePayload);
    });
  });
});
