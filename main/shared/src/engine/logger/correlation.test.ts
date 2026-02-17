// main/shared/src/engine/logger/correlation.test.ts
import { describe, expect, test } from 'vitest';

import { STANDARD_HEADERS } from '../primitives/constants';

import {
  createRequestContext,
  generateCorrelationId,
  getOrCreateCorrelationId,
  isValidCorrelationId,
} from './correlation';

describe('Correlation ID Utilities', () => {
  describe('generateCorrelationId', () => {
    test('should generate a valid UUID v4 string', () => {
      const id = generateCorrelationId();

      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });

    test('should generate unique IDs on successive calls', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toMatch(/^[0-9a-f-]{36}$/);
      expect(id2).toMatch(/^[0-9a-f-]{36}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getOrCreateCorrelationId', () => {
    test('should use x-correlation-id header if present', () => {
      const headers = { [STANDARD_HEADERS.CORRELATION_ID]: 'existing-id' };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('existing-id');
    });

    test('should use x-request-id header if present', () => {
      const headers = { [STANDARD_HEADERS.REQUEST_ID]: 'request-id' };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('request-id');
    });

    test('should extract trace-id from traceparent header', () => {
      const headers = { traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('0af7651916cd43dd8448eb211c80319c');
    });

    test('should generate new ID if no header present', () => {
      const headers = {};
      const result = getOrCreateCorrelationId(headers);

      expect(result).toMatch(/^[0-9a-f-]{36}$/);
    });

    test('should prioritize x-correlation-id over x-request-id', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: 'correlation-id',
        [STANDARD_HEADERS.REQUEST_ID]: 'request-id',
      };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('correlation-id');
    });

    test('should prioritize x-correlation-id over traceparent', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: 'correlation-id',
        traceparent: '00-traceid123-parentid456-01',
      };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('correlation-id');
    });

    test('should prioritize x-request-id over traceparent', () => {
      const headers = {
        [STANDARD_HEADERS.REQUEST_ID]: 'request-id',
        traceparent: '00-traceid123-parentid456-01',
      };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('request-id');
    });

    test('should skip empty x-correlation-id header', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: '',
        [STANDARD_HEADERS.REQUEST_ID]: 'fallback-id',
      };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('fallback-id');
    });

    test('should skip undefined x-correlation-id header', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: undefined,
        [STANDARD_HEADERS.REQUEST_ID]: 'fallback-id',
      };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('fallback-id');
    });

    test('should skip invalid x-correlation-id header values', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: 'bad\r\nheader',
        [STANDARD_HEADERS.REQUEST_ID]: 'fallback-id',
      };
      const result = getOrCreateCorrelationId(headers);

      expect(result).toBe('fallback-id');
    });

    test('should handle traceparent with insufficient segments', () => {
      const headers = { traceparent: '00' };
      const result = getOrCreateCorrelationId(headers);

      // Should fall back to generated UUID since there's only 1 segment
      expect(result).toMatch(/^[0-9a-f-]{36}$/);
    });

    test('should handle traceparent with empty trace-id segment', () => {
      const headers = { traceparent: '00--parentid-01' };
      const result = getOrCreateCorrelationId(headers);

      // Empty trace-id segment, should fall back to generated UUID
      expect(result).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('isValidCorrelationId', () => {
    test('should accept UUID-like values', () => {
      expect(isValidCorrelationId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    test('should reject empty values', () => {
      expect(isValidCorrelationId('')).toBe(false);
    });

    test('should reject unsafe characters', () => {
      expect(isValidCorrelationId('bad\r\nid')).toBe(false);
      expect(isValidCorrelationId('bad space')).toBe(false);
    });
  });

  describe('createRequestContext', () => {
    test('should create context with all fields', () => {
      const context = createRequestContext(
        'correlation-123',
        {
          id: 'req-456',
          method: 'POST',
          url: '/api/users',
          ip: '192.168.1.1',
          headers: { 'user-agent': 'TestAgent/1.0' },
        },
        'user-789',
      );

      expect(context).toEqual({
        correlationId: 'correlation-123',
        requestId: 'req-456',
        method: 'POST',
        path: '/api/users',
        ip: '192.168.1.1',
        userAgent: 'TestAgent/1.0',
        userId: 'user-789',
      });
    });

    test('should handle missing user agent', () => {
      const context = createRequestContext('correlation-123', {
        id: 'req-456',
        method: 'GET',
        url: '/health',
        ip: '127.0.0.1',
        headers: {},
      });

      expect(context.userAgent).toBeUndefined();
    });

    test('should handle missing userId', () => {
      const context = createRequestContext('correlation-123', {
        id: 'req-456',
        method: 'GET',
        url: '/api/public',
        ip: '10.0.0.1',
        headers: { 'user-agent': 'curl/7.68.0' },
      });

      expect(context.userId).toBeUndefined();
      expect(context.userAgent).toBe('curl/7.68.0');
    });

    test('should handle both optional fields missing', () => {
      const context = createRequestContext('corr-1', {
        id: 'req-1',
        method: 'DELETE',
        url: '/api/resource/42',
        ip: '::1',
        headers: {},
      });

      expect(context).toEqual({
        correlationId: 'corr-1',
        requestId: 'req-1',
        method: 'DELETE',
        path: '/api/resource/42',
        ip: '::1',
      });
      expect(context.userAgent).toBeUndefined();
      expect(context.userId).toBeUndefined();
    });

    test('should preserve all request metadata', () => {
      const context = createRequestContext(
        'abc-def-ghi',
        {
          id: 'fastify-req-001',
          method: 'PATCH',
          url: '/api/settings?theme=dark',
          ip: '203.0.113.50',
          headers: { 'user-agent': 'Mozilla/5.0' },
        },
        'usr_12345',
      );

      expect(context.correlationId).toBe('abc-def-ghi');
      expect(context.requestId).toBe('fastify-req-001');
      expect(context.method).toBe('PATCH');
      expect(context.path).toBe('/api/settings?theme=dark');
      expect(context.ip).toBe('203.0.113.50');
      expect(context.userAgent).toBe('Mozilla/5.0');
      expect(context.userId).toBe('usr_12345');
    });
  });
});
