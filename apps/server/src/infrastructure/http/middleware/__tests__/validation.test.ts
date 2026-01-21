// apps/server/src/infrastructure/http/middleware/__tests__/validation.test.ts
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  sanitizeString,
  sanitizeObject,
  detectSQLInjection,
  detectNoSQLInjection,
  registerInputValidation,
} from '../validation';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Unit Tests - sanitizeString
// ============================================================================

describe('sanitizeString', () => {
  test('should return empty string for non-string input', () => {
    expect(sanitizeString(123 as unknown as string)).toBe('');
    expect(sanitizeString(null as unknown as string)).toBe('');
    expect(sanitizeString(undefined as unknown as string)).toBe('');
  });

  test('should remove null bytes', () => {
    expect(sanitizeString('hello\0world')).toBe('helloworld');
    expect(sanitizeString('\0test\0')).toBe('test');
  });

  test('should remove script tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('');
    expect(sanitizeString('hello<script>evil()</script>world')).toBe('helloworld');
    expect(sanitizeString('<SCRIPT>ALERT(1)</SCRIPT>')).toBe('');
  });

  test('should remove event handlers', () => {
    // The regex removes 'on{event}=' pattern, leaving the value
    expect(sanitizeString('<img onerror=alert(1)>')).toBe('<img alert(1)>');
    expect(sanitizeString('<div onclick=hack()>')).toBe('<div hack()>');
    expect(sanitizeString('text onmouseover=evil()')).toBe('text evil()');
  });

  test('should remove javascript: URLs', () => {
    expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
    expect(sanitizeString('<a href="javascript:evil()">')).toBe('<a href="evil()">');
  });

  test('should remove dangerous data: URLs but allow images', () => {
    // Dangerous data URLs have their prefix removed (leaving just the encoded data)
    // The regex removes 'data:{type};{encoding},' but leaves what comes after
    expect(sanitizeString('data:text/html;base64,abc')).toBe('abc');

    // Image data URLs should be preserved completely
    expect(sanitizeString('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(sanitizeString('data:image/jpeg;base64,xyz')).toBe('data:image/jpeg;base64,xyz');
  });

  test('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('\n\ttest\n\t')).toBe('test');
  });

  test('should handle normal strings unchanged', () => {
    expect(sanitizeString('Hello, World!')).toBe('Hello, World!');
    expect(sanitizeString('user@example.com')).toBe('user@example.com');
    expect(sanitizeString('This is a normal comment.')).toBe('This is a normal comment.');
  });
});

// ============================================================================
// Unit Tests - sanitizeObject
// ============================================================================

describe('sanitizeObject', () => {
  test('should sanitize nested objects', () => {
    const input = {
      name: '<script>alert(1)</script>',
      nested: {
        value: 'javascript:evil()',
      },
    };

    const result = sanitizeObject(input);

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      name: '',
      nested: {
        value: 'evil()',
      },
    });
  });

  test('should sanitize arrays', () => {
    const input = ['<script>1</script>', 'normal', 'javascript:2'];

    const result = sanitizeObject(input);

    expect(result.valid).toBe(true);
    expect(result.data).toEqual(['', 'normal', '2']);
  });

  test('should handle null and undefined values', () => {
    const input = {
      nullVal: null,
      undefinedVal: undefined,
      normalVal: 'test',
    };

    const result = sanitizeObject(input, { removeEmpty: true });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      normalVal: 'test',
    });
  });

  test('should preserve null/undefined when removeEmpty is false', () => {
    const input = {
      nullVal: null,
      normalVal: 'test',
    };

    const result = sanitizeObject(input, { removeEmpty: false });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      nullVal: null,
      normalVal: 'test',
    });
  });

  test('should handle booleans', () => {
    const input = { flag: true, other: false };

    const result = sanitizeObject(input);

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ flag: true, other: false });
  });

  test('should handle numbers', () => {
    const input = { count: 42, price: 19.99 };

    const result = sanitizeObject(input);

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ count: 42, price: 19.99 });
  });

  test('should handle NaN and Infinity with warnings', () => {
    const input = {
      nan: NaN,
      inf: Infinity,
      negInf: -Infinity,
    };

    const result = sanitizeObject(input);

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      nan: 0,
      inf: 0,
      negInf: 0,
    });
    expect(result.warnings.length).toBe(3);
    expect(result.warnings[0]).toContain('Invalid number');
  });

  test('should reject strings exceeding maxStringLength', () => {
    const input = { text: 'a'.repeat(20000) };

    const result = sanitizeObject(input, { maxStringLength: 10000 });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('String too long');
  });

  test('should reject arrays exceeding maxArrayLength', () => {
    const input = { items: new Array(2000).fill('item') };

    const result = sanitizeObject(input, { maxArrayLength: 1000 });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Array too long');
  });

  test('should reject objects exceeding maxDepth', () => {
    // Create deeply nested object
    let obj: Record<string, unknown> = { value: 'deep' };
    for (let i = 0; i < 15; i++) {
      obj = { nested: obj };
    }

    const result = sanitizeObject(obj, { maxDepth: 10 });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Maximum object depth exceeded');
  });

  test('should reject invalid key names (prototype pollution)', () => {
    // Note: In modern JavaScript, assigning to __proto__ as a property doesn't
    // actually create an enumerable property with that name - it modifies the prototype.
    // So Object.entries won't see it. This test verifies that sanitizeObject
    // handles the case where the key shows up via Object.entries.
    // We use Object.defineProperty to create an actual enumerable __proto__ key
    const input: Record<string, unknown> = { normal: 'value' };
    Object.defineProperty(input, '__proto__', {
      value: { admin: true },
      enumerable: true,
      writable: true,
      configurable: true,
    });

    const result = sanitizeObject(input);

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Invalid key name');
    // __proto__ should be filtered out
    expect(result.data).toEqual({ normal: 'value' });
  });

  test('should reject constructor key', () => {
    const input = {
      constructor: 'malicious',
      normal: 'value',
    };

    const result = sanitizeObject(input);

    expect(result.warnings.some((w) => w.includes('Invalid key name'))).toBe(true);
    expect(result.data).toEqual({ normal: 'value' });
  });

  test('should handle empty objects and arrays', () => {
    expect(sanitizeObject({}).data).toEqual({});
    expect(sanitizeObject([]).data).toEqual([]);
  });

  test('should skip sanitization when sanitize option is false', () => {
    const input = { text: '<script>alert(1)</script>' };

    const result = sanitizeObject(input, { sanitize: false });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ text: '<script>alert(1)</script>' });
  });
});

// ============================================================================
// Unit Tests - detectSQLInjection
// ============================================================================

describe('detectSQLInjection', () => {
  describe('should detect SQL injection patterns', () => {
    const injectionPatterns = [
      "' OR 1=1--",
      '1; DROP TABLE users',
      'UNION SELECT * FROM users',
      'SELECT * FROM admin',
      'INSERT INTO users VALUES',
      'UPDATE users SET admin=true',
      'DELETE FROM users WHERE 1=1',
      "'; SELECT * FROM passwords--",
      "admin'--",
      "1' AND 1=1",
    ];

    for (const pattern of injectionPatterns) {
      test(`should detect: ${pattern.substring(0, 30)}...`, () => {
        expect(detectSQLInjection(pattern)).toBe(true);
      });
    }
  });

  describe('should not flag legitimate inputs', () => {
    const legitimateInputs = [
      'Hello World',
      'John Smith',
      'user@example.com',
      'This is a normal comment',
      'Product description with numbers 123',
      'SELECT is a word in English',
      'I want to update my profile',
      'Please delete my account request',
      "The user's name is John",
      'Price: $19.99',
      '2024-01-15',
      'https://example.com/path?query=value',
    ];

    for (const input of legitimateInputs) {
      test(`should allow: ${input.substring(0, 30)}...`, () => {
        expect(detectSQLInjection(input)).toBe(false);
      });
    }
  });

  test('should detect SQL comments', () => {
    expect(detectSQLInjection('value--comment')).toBe(true);
    expect(detectSQLInjection('value/*comment*/')).toBe(true);
  });

  test('should detect hex-encoded injection', () => {
    expect(detectSQLInjection('\\x27')).toBe(true);
    expect(detectSQLInjection('\\x2D\\x2D')).toBe(true);
  });

  test('should return false when detection is disabled', () => {
    expect(detectSQLInjection("' OR 1=1--", { enabled: false })).toBe(false);
    expect(detectSQLInjection('DROP TABLE users', { enabled: false })).toBe(false);
  });
});

// ============================================================================
// Unit Tests - detectNoSQLInjection
// ============================================================================

describe('detectNoSQLInjection', () => {
  describe('should detect NoSQL injection patterns in strings', () => {
    const injectionPatterns = ['$where', '$gt', '$ne', '{ $or: [] }', '[$in]', '$regex'];

    for (const pattern of injectionPatterns) {
      test(`should detect: ${pattern}`, () => {
        expect(detectNoSQLInjection(pattern)).toBe(true);
      });
    }
  });

  describe('should detect NoSQL injection patterns in objects', () => {
    test('should detect $gt operator in object', () => {
      expect(detectNoSQLInjection({ $gt: 0 })).toBe(true);
    });

    test('should detect $ne operator in object', () => {
      expect(detectNoSQLInjection({ $ne: null })).toBe(true);
    });

    test('should detect __proto__ key', () => {
      // Create an object with actual enumerable __proto__ property
      const obj: Record<string, unknown> = {};
      Object.defineProperty(obj, '__proto__', {
        value: {},
        enumerable: true,
        writable: true,
        configurable: true,
      });
      expect(detectNoSQLInjection(obj)).toBe(true);
    });

    test('should detect prototype key', () => {
      expect(detectNoSQLInjection({ prototype: {} })).toBe(true);
    });

    test('should detect constructor key', () => {
      expect(detectNoSQLInjection({ constructor: {} })).toBe(true);
    });
  });

  describe('should not flag legitimate inputs', () => {
    test('should allow normal string', () => {
      expect(detectNoSQLInjection('Hello World')).toBe(false);
    });

    test('should allow normal object', () => {
      expect(detectNoSQLInjection({ name: 'John', age: 30 })).toBe(false);
    });

    test('should allow null', () => {
      expect(detectNoSQLInjection(null)).toBe(false);
    });

    test('should allow number', () => {
      expect(detectNoSQLInjection(42)).toBe(false);
    });

    test('should allow boolean', () => {
      expect(detectNoSQLInjection(true)).toBe(false);
    });
  });
});

// ============================================================================
// Integration Tests - registerInputValidation
// ============================================================================

describe('registerInputValidation middleware', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify();
    registerInputValidation(server);

    server.post('/test', (request) => {
      return {
        body: request.body,
        query: request.query,
        params: request.params,
      };
    });

    server.post<{ Params: { id: string } }>('/test/:id', (request) => {
      return {
        body: request.body,
        query: request.query,
        params: request.params,
      };
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('body validation', () => {
    test('should sanitize request body', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        payload: {
          name: '<script>alert(1)</script>John',
          email: 'test@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body) as { body: { name: string; email: string } };
      expect(result.body.name).toBe('John');
      expect(result.body.email).toBe('test@example.com');
    });

    test('should reject SQL injection in body', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        payload: {
          query: "'; DROP TABLE users--",
        },
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.body) as { error: string; details: string[] };
      expect(result.error).toBe('Validation Error');
      expect(result.details.some((d) => d.includes('SQL injection'))).toBe(true);
    });

    test('should reject NoSQL injection in body', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        payload: {
          filter: { $gt: 0 },
        },
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.body) as { error: string; details: string[] };
      expect(result.error).toBe('Validation Error');
      expect(result.details.some((d) => d.includes('NoSQL injection'))).toBe(true);
    });
  });

  describe('query validation', () => {
    test('should sanitize query parameters', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test?search=<script>alert(1)</script>test',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body) as { query: { search: string } };
      expect(result.query.search).toBe('test');
    });

    test('should reject SQL injection in query', async () => {
      const response = await server.inject({
        method: 'POST',
        url: "/test?id=' OR 1=1--",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('params validation', () => {
    test('should sanitize route parameters', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test/abc123',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body) as { params: { id: string } };
      expect(result.params.id).toBe('abc123');
    });
  });

  describe('complex payloads', () => {
    test('should handle deeply nested objects', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        payload: {
          level1: {
            level2: {
              level3: {
                value: '<script>xss</script>safe',
              },
            },
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body) as {
        body: { level1: { level2: { level3: { value: string } } } };
      };
      expect(result.body.level1.level2.level3.value).toBe('safe');
    });

    test('should handle arrays in payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/test',
        payload: {
          items: ['<script>1</script>item1', 'item2', '<script>2</script>item3'],
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body) as { body: { items: string[] } };
      expect(result.body.items).toEqual(['item1', 'item2', 'item3']);
    });

    test('should preserve valid data structures', async () => {
      const payload = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          active: true,
          tags: ['developer', 'admin'],
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/test',
        payload,
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body) as { body: typeof payload };
      expect(result.body).toEqual(payload);
    });
  });
});

// ============================================================================
// Custom Validation Options Tests
// ============================================================================

describe('registerInputValidation with custom options', () => {
  test('should respect custom maxStringLength', async () => {
    const server = Fastify();
    registerInputValidation(server, { maxStringLength: 50 });

    server.post('/test', (request) => ({ body: request.body }));
    await server.ready();

    const response = await server.inject({
      method: 'POST',
      url: '/test',
      payload: {
        text: 'a'.repeat(100),
      },
    });

    expect(response.statusCode).toBe(400);

    await server.close();
  });

  test('should respect custom maxArrayLength', async () => {
    const server = Fastify();
    registerInputValidation(server, { maxArrayLength: 10 });

    server.post('/test', (request) => ({ body: request.body }));
    await server.ready();

    const response = await server.inject({
      method: 'POST',
      url: '/test',
      payload: {
        items: new Array(20).fill('item'),
      },
    });

    expect(response.statusCode).toBe(400);

    await server.close();
  });

  test('should respect custom maxDepth', async () => {
    const server = Fastify();
    registerInputValidation(server, { maxDepth: 3 });

    server.post('/test', (request) => ({ body: request.body }));
    await server.ready();

    const response = await server.inject({
      method: 'POST',
      url: '/test',
      payload: {
        l1: { l2: { l3: { l4: { l5: 'deep' } } } },
      },
    });

    expect(response.statusCode).toBe(400);

    await server.close();
  });
});
