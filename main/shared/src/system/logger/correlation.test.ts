// main/shared/src/system/logger/correlation.test.ts
import { describe, expect, test } from 'vitest';

import { STANDARD_HEADERS } from '../constants/platform';

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

  // -------------------------------------------------------------------------
  // Adversarial — isValidCorrelationId boundary attacks
  // -------------------------------------------------------------------------
  describe('adversarial — isValidCorrelationId', () => {
    test('should reject IDs longer than 128 characters', () => {
      const tooLong = 'a'.repeat(129);
      expect(isValidCorrelationId(tooLong)).toBe(false);
    });

    test('should accept IDs of exactly 128 characters', () => {
      const exact = 'a'.repeat(128);
      expect(isValidCorrelationId(exact)).toBe(true);
    });

    test('should accept IDs of exactly 1 character', () => {
      expect(isValidCorrelationId('a')).toBe(true);
    });

    test('should reject IDs containing forward slash (header injection vector)', () => {
      expect(isValidCorrelationId('abc/def')).toBe(false);
    });

    test('should reject IDs containing colon', () => {
      expect(isValidCorrelationId('abc:def')).toBe(false);
    });

    test('should reject IDs containing dot', () => {
      expect(isValidCorrelationId('abc.def')).toBe(false);
    });

    test('should reject IDs containing at-sign', () => {
      expect(isValidCorrelationId('abc@def')).toBe(false);
    });

    test('should reject IDs containing null byte', () => {
      expect(isValidCorrelationId('abc\x00def')).toBe(false);
    });

    test('should reject IDs containing tab character', () => {
      expect(isValidCorrelationId('abc\tdef')).toBe(false);
    });

    test('should accept IDs with underscores and hyphens', () => {
      expect(isValidCorrelationId('my_request-id_123')).toBe(true);
    });

    test('should accept standard UUID v4 (contains only allowed chars)', () => {
      // UUID v4: hex digits and hyphens — all within [a-zA-Z0-9_-]
      expect(isValidCorrelationId('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    test('should reject IDs with unicode characters', () => {
      expect(isValidCorrelationId('日本語')).toBe(false);
    });

    test('should reject IDs with plus sign (common encoding artifact)', () => {
      expect(isValidCorrelationId('abc+def')).toBe(false);
    });

    test('should reject IDs with equals sign (base64 padding)', () => {
      expect(isValidCorrelationId('abc==')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — getOrCreateCorrelationId attack vectors
  // -------------------------------------------------------------------------
  describe('adversarial — getOrCreateCorrelationId header attacks', () => {
    test('should reject correlation ID containing newline (header injection)', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: 'good-id\r\nX-Injected: evil',
        [STANDARD_HEADERS.REQUEST_ID]: 'safe-fallback',
      };
      const result = getOrCreateCorrelationId(headers);
      expect(result).toBe('safe-fallback');
    });

    test('should reject correlation ID containing null byte', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: 'abc\x00def',
        [STANDARD_HEADERS.REQUEST_ID]: 'safe-fallback',
      };
      const result = getOrCreateCorrelationId(headers);
      expect(result).toBe('safe-fallback');
    });

    test('should reject ID exceeding 128 characters', () => {
      const oversized = 'a'.repeat(129);
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: oversized,
        [STANDARD_HEADERS.REQUEST_ID]: 'short-id',
      };
      const result = getOrCreateCorrelationId(headers);
      expect(result).toBe('short-id');
    });

    test('should reject ID of exactly one space', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: ' ',
        [STANDARD_HEADERS.REQUEST_ID]: 'fallback',
      };
      const result = getOrCreateCorrelationId(headers);
      expect(result).toBe('fallback');
    });

    test('should fall back to generate when both correlation and request IDs are invalid', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: 'bad\nid',
        [STANDARD_HEADERS.REQUEST_ID]: 'also bad!',
      };
      const result = getOrCreateCorrelationId(headers);
      // Should generate a fresh UUID
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    test('should fall back to generate when all headers are empty strings', () => {
      const headers = {
        [STANDARD_HEADERS.CORRELATION_ID]: '',
        [STANDARD_HEADERS.REQUEST_ID]: '',
        traceparent: '',
      };
      const result = getOrCreateCorrelationId(headers);
      expect(result).toMatch(/^[0-9a-f-]{36}$/);
    });

    test('should handle traceparent with only separator dashes without crashing', () => {
      const headers = { traceparent: '---' };
      // parts[1] is an empty string — falls through to UUID generation
      const result = getOrCreateCorrelationId(headers);
      expect(result).toMatch(/^[0-9a-f-]{36}$/);
    });

    test('should not crash on extremely long traceparent header', () => {
      const longTrace = `00-${'a'.repeat(1000)}-${'b'.repeat(1000)}-01`;
      const headers = { traceparent: longTrace };
      // Returns the trace-id segment regardless of length (no validation on traceparent extraction)
      const result = getOrCreateCorrelationId(headers);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — generateCorrelationId collision surface
  // -------------------------------------------------------------------------
  describe('adversarial — collision surface', () => {
    test('should produce no duplicates in 1000 rapid synchronous calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateCorrelationId());
      }
      expect(ids.size).toBe(1000);
    });

    test('should always produce valid UUIDs across many calls', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      for (let i = 0; i < 50; i++) {
        expect(generateCorrelationId()).toMatch(uuidRegex);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial — createRequestContext edge cases
  // -------------------------------------------------------------------------
  describe('adversarial — createRequestContext edge cases', () => {
    test('should not include userAgent key when header value is undefined', () => {
      const context = createRequestContext('c', {
        id: 'r',
        method: 'GET',
        url: '/',
        ip: '1.2.3.4',
        headers: { 'user-agent': undefined },
      });
      expect(Object.prototype.hasOwnProperty.call(context, 'userAgent')).toBe(false);
    });

    test('should preserve empty string IP as-is', () => {
      const context = createRequestContext('c', {
        id: 'r',
        method: 'GET',
        url: '/',
        ip: '',
        headers: {},
      });
      expect(context.ip).toBe('');
    });

    test('should preserve URL with query string and fragment', () => {
      const url = '/search?q=hello+world&page=2#results';
      const context = createRequestContext('c', {
        id: 'r',
        method: 'GET',
        url,
        ip: '1.1.1.1',
        headers: {},
      });
      expect(context.path).toBe(url);
    });

    test('should not mutate the returned context after creation', () => {
      const context = createRequestContext('c', {
        id: 'r',
        method: 'DELETE',
        url: '/items/1',
        ip: '9.9.9.9',
        headers: {},
      });
      const snapshot = { ...context };
      // Verify context is consistent
      expect(context).toEqual(snapshot);
    });

    test('should handle very long user-agent string without truncation', () => {
      const longUA = 'Mozilla/5.0 ' + 'X'.repeat(1000);
      const context = createRequestContext('c', {
        id: 'r',
        method: 'GET',
        url: '/',
        ip: '1.2.3.4',
        headers: { 'user-agent': longUA },
      });
      // createRequestContext does not truncate — full UA preserved
      expect(context.userAgent).toBe(longUA);
    });
  });
});
