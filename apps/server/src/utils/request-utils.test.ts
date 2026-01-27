// apps/server/src/utils/request-utils.test.ts
/**
 * Unit Tests for Request Utilities
 *
 * Tests request parameter extraction and validation functions for Fastify routes.
 * Covers path parameters, query parameters, and edge cases.
 *
 * @complexity O(1) for all utility functions
 */

import { describe, expect, test } from 'vitest';

import {
  getPathParam,
  getQueryParam,
  getQueryParams,
  getRequiredPathParam,
  getRequiredQueryParam,
  getValidatedPathParam,
} from './request-utils';

import type { RequestWithCookies } from '@shared/index';

/**
 * Helper to create a mock request object with specified properties
 * @param partial Partial request properties to merge
 * @returns Mock RequestWithCookies object
 */
function createMockRequest(
  partial: Partial<RequestWithCookies> & {
    params?: Record<string, string>;
    query?: Record<string, unknown>;
  } = {},
): RequestWithCookies {
  return {
    cookies: {},
    headers: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
    ...partial,
  } as RequestWithCookies;
}

// ============================================================================
// Unit Tests - getPathParam
// ============================================================================

describe('getPathParam', () => {
  describe('when parameter exists', () => {
    test('should return the parameter value', () => {
      const req = createMockRequest({
        params: { id: 'user123' },
      });

      const result = getPathParam(req, 'id');

      expect(result).toBe('user123');
    });

    test('should return empty string parameter', () => {
      const req = createMockRequest({
        params: { id: '' },
      });

      const result = getPathParam(req, 'id');

      expect(result).toBe('');
    });

    test('should return parameter with special characters', () => {
      const req = createMockRequest({
        params: { slug: 'hello-world_2024' },
      });

      const result = getPathParam(req, 'slug');

      expect(result).toBe('hello-world_2024');
    });

    test('should return numeric parameter as string', () => {
      const req = createMockRequest({
        params: { page: '42' },
      });

      const result = getPathParam(req, 'page');

      expect(result).toBe('42');
    });
  });

  describe('when parameter does not exist', () => {
    test('should return undefined for missing parameter', () => {
      const req = createMockRequest({
        params: { id: 'test' },
      });

      const result = getPathParam(req, 'nonexistent');

      expect(result).toBeUndefined();
    });

    test('should return undefined when params object is undefined', () => {
      const req = createMockRequest();

      const result = getPathParam(req, 'id');

      expect(result).toBeUndefined();
    });

    test('should return undefined when params object is empty', () => {
      const req = createMockRequest({
        params: {},
      });

      const result = getPathParam(req, 'id');

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('should handle multiple parameters', () => {
      const req = createMockRequest({
        params: {
          userId: 'user123',
          postId: 'post456',
        },
      });

      expect(getPathParam(req, 'userId')).toBe('user123');
      expect(getPathParam(req, 'postId')).toBe('post456');
    });

    test('should handle parameter names with different casing', () => {
      const req = createMockRequest({
        params: {
          UserId: 'test123',
          POSTID: 'post456',
        },
      });

      expect(getPathParam(req, 'UserId')).toBe('test123');
      expect(getPathParam(req, 'POSTID')).toBe('post456');
    });
  });
});

// ============================================================================
// Unit Tests - getRequiredPathParam
// ============================================================================

describe('getRequiredPathParam', () => {
  describe('when parameter exists', () => {
    test('should return the parameter value', () => {
      const req = createMockRequest({
        params: { id: 'user123' },
      });

      const result = getRequiredPathParam(req, 'id');

      expect(result).toBe('user123');
    });

    test('should return parameter with whitespace', () => {
      const req = createMockRequest({
        params: { name: 'John Doe' },
      });

      const result = getRequiredPathParam(req, 'name');

      expect(result).toBe('John Doe');
    });

    test('should return UUID parameter', () => {
      const req = createMockRequest({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });

      const result = getRequiredPathParam(req, 'id');

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('when parameter does not exist', () => {
    test('should throw error for missing parameter', () => {
      const req = createMockRequest({
        params: { other: 'value' },
      });

      expect(() => getRequiredPathParam(req, 'id')).toThrow(
        "Required path parameter 'id' is missing",
      );
    });

    test('should throw error for undefined params', () => {
      const req = createMockRequest();

      expect(() => getRequiredPathParam(req, 'id')).toThrow(
        "Required path parameter 'id' is missing",
      );
    });

    test('should throw error for empty string parameter', () => {
      const req = createMockRequest({
        params: { id: '' },
      });

      expect(() => getRequiredPathParam(req, 'id')).toThrow(
        "Required path parameter 'id' is missing",
      );
    });

    test('should include parameter name in error message', () => {
      const req = createMockRequest();

      expect(() => getRequiredPathParam(req, 'customParam')).toThrow('customParam');
    });
  });

  describe('edge cases', () => {
    test('should handle parameter with value "0"', () => {
      const req = createMockRequest({
        params: { index: '0' },
      });

      const result = getRequiredPathParam(req, 'index');

      expect(result).toBe('0');
    });

    test('should handle parameter with value "false"', () => {
      const req = createMockRequest({
        params: { flag: 'false' },
      });

      const result = getRequiredPathParam(req, 'flag');

      expect(result).toBe('false');
    });
  });
});

// ============================================================================
// Unit Tests - getValidatedPathParam
// ============================================================================

describe('getValidatedPathParam', () => {
  describe('when parameter exists and is valid', () => {
    test('should return parameter without validator', () => {
      const req = createMockRequest({
        params: { id: 'test123' },
      });

      const result = getValidatedPathParam(req, 'id');

      expect(result).toBe('test123');
    });

    test('should return parameter when validator passes', () => {
      const req = createMockRequest({
        params: { id: 'user123' },
      });
      const validator = (value: string) => value.startsWith('user');

      const result = getValidatedPathParam(req, 'id', validator);

      expect(result).toBe('user123');
    });

    test('should validate numeric strings', () => {
      const req = createMockRequest({
        params: { id: '42' },
      });
      const isNumeric = (value: string) => /^\d+$/.test(value);

      const result = getValidatedPathParam(req, 'id', isNumeric);

      expect(result).toBe('42');
    });

    test('should validate UUID format', () => {
      const req = createMockRequest({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const isUUID = (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

      const result = getValidatedPathParam(req, 'id', isUUID);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    test('should validate minimum length', () => {
      const req = createMockRequest({
        params: { username: 'johnsmith' },
      });
      const minLength = (value: string) => value.length >= 5;

      const result = getValidatedPathParam(req, 'username', minLength);

      expect(result).toBe('johnsmith');
    });
  });

  describe('when parameter exists but is invalid', () => {
    test('should return undefined when validator fails', () => {
      const req = createMockRequest({
        params: { id: 'invalid' },
      });
      const validator = (value: string) => value.startsWith('user');

      const result = getValidatedPathParam(req, 'id', validator);

      expect(result).toBeUndefined();
    });

    test('should return undefined for non-numeric when expecting numeric', () => {
      const req = createMockRequest({
        params: { id: 'abc123' },
      });
      const isNumeric = (value: string) => /^\d+$/.test(value);

      const result = getValidatedPathParam(req, 'id', isNumeric);

      expect(result).toBeUndefined();
    });

    test('should return undefined for invalid UUID', () => {
      const req = createMockRequest({
        params: { id: 'not-a-uuid' },
      });
      const isUUID = (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

      const result = getValidatedPathParam(req, 'id', isUUID);

      expect(result).toBeUndefined();
    });

    test('should return undefined when length validation fails', () => {
      const req = createMockRequest({
        params: { code: 'ab' },
      });
      const minLength = (value: string) => value.length >= 5;

      const result = getValidatedPathParam(req, 'code', minLength);

      expect(result).toBeUndefined();
    });
  });

  describe('when parameter does not exist', () => {
    test('should return undefined for missing parameter', () => {
      const req = createMockRequest({
        params: { other: 'value' },
      });
      const validator = (value: string) => value.length > 0;

      const result = getValidatedPathParam(req, 'id', validator);

      expect(result).toBeUndefined();
    });

    test('should return undefined when params object is undefined', () => {
      const req = createMockRequest();
      const validator = (value: string) => value.length > 0;

      const result = getValidatedPathParam(req, 'id', validator);

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('should return empty string for empty string parameter with validator', () => {
      const req = createMockRequest({
        params: { id: '' },
      });
      const validator = (value: string) => value.length > 0;

      const result = getValidatedPathParam(req, 'id', validator);

      expect(result).toBe('');
    });

    test('should return empty string without validator', () => {
      const req = createMockRequest({
        params: { id: '' },
      });

      const result = getValidatedPathParam(req, 'id');

      expect(result).toBe('');
    });

    test('should handle validator that always returns false', () => {
      const req = createMockRequest({
        params: { id: 'test' },
      });
      const alwaysFalse = () => false;

      const result = getValidatedPathParam(req, 'id', alwaysFalse);

      expect(result).toBeUndefined();
    });

    test('should handle validator that always returns true', () => {
      const req = createMockRequest({
        params: { id: 'test' },
      });
      const alwaysTrue = () => true;

      const result = getValidatedPathParam(req, 'id', alwaysTrue);

      expect(result).toBe('test');
    });
  });
});

// ============================================================================
// Unit Tests - getQueryParams
// ============================================================================

describe('getQueryParams', () => {
  describe('when query parameters exist', () => {
    test('should return all query parameters', () => {
      const req = createMockRequest({
        query: {
          page: '1',
          limit: '10',
          sort: 'name',
        },
      });

      const result = getQueryParams(req);

      expect(result).toEqual({
        page: '1',
        limit: '10',
        sort: 'name',
      });
    });

    test('should return query parameters with various types', () => {
      const req = createMockRequest({
        query: {
          string: 'value',
          number: 42,
          boolean: true,
          array: ['a', 'b', 'c'],
        },
      });

      const result = getQueryParams(req);

      expect(result).toEqual({
        string: 'value',
        number: 42,
        boolean: true,
        array: ['a', 'b', 'c'],
      });
    });

    test('should return query parameters with special characters', () => {
      const req = createMockRequest({
        query: {
          search: 'hello world',
          filter: 'name:John,age>30',
        },
      });

      const result = getQueryParams(req);

      expect(result['search']).toBe('hello world');
      expect(result['filter']).toBe('name:John,age>30');
    });
  });

  describe('when query parameters are empty', () => {
    test('should return empty object when query is undefined', () => {
      const req = createMockRequest();

      const result = getQueryParams(req);

      expect(result).toEqual({});
    });

    test('should return empty object when query is empty', () => {
      const req = createMockRequest({
        query: {},
      });

      const result = getQueryParams(req);

      expect(result).toEqual({});
    });
  });

  describe('edge cases', () => {
    test('should handle nested objects in query params', () => {
      const req = createMockRequest({
        query: {
          filter: { name: 'John', age: 30 },
        },
      });

      const result = getQueryParams(req);

      expect(result['filter']).toEqual({ name: 'John', age: 30 });
    });

    test('should handle null values in query params', () => {
      const req = createMockRequest({
        query: {
          optional: null,
          required: 'value',
        },
      });

      const result = getQueryParams(req);

      expect(result).toEqual({
        optional: null,
        required: 'value',
      });
    });

    test('should handle undefined values in query params', () => {
      const req = createMockRequest({
        query: {
          optional: undefined,
          required: 'value',
        },
      });

      const result = getQueryParams(req);

      expect(result['optional']).toBeUndefined();
      expect(result['required']).toBe('value');
    });
  });
});

// ============================================================================
// Unit Tests - getQueryParam
// ============================================================================

describe('getQueryParam', () => {
  describe('when parameter exists', () => {
    test('should return string query parameter', () => {
      const req = createMockRequest({
        query: { search: 'test' },
      });

      const result = getQueryParam(req, 'search');

      expect(result).toBe('test');
    });

    test('should return numeric query parameter', () => {
      const req = createMockRequest({
        query: { page: 42 },
      });

      const result = getQueryParam(req, 'page');

      expect(result).toBe(42);
    });

    test('should return boolean query parameter', () => {
      const req = createMockRequest({
        query: { active: true },
      });

      const result = getQueryParam(req, 'active');

      expect(result).toBe(true);
    });

    test('should return array query parameter', () => {
      const req = createMockRequest({
        query: { tags: ['javascript', 'typescript'] },
      });

      const result = getQueryParam(req, 'tags');

      expect(result).toEqual(['javascript', 'typescript']);
    });

    test('should return object query parameter', () => {
      const req = createMockRequest({
        query: { filter: { status: 'active', role: 'admin' } },
      });

      const result = getQueryParam(req, 'filter');

      expect(result).toEqual({ status: 'active', role: 'admin' });
    });

    test('should return empty string parameter', () => {
      const req = createMockRequest({
        query: { empty: '' },
      });

      const result = getQueryParam(req, 'empty');

      expect(result).toBe('');
    });

    test('should return zero value', () => {
      const req = createMockRequest({
        query: { count: 0 },
      });

      const result = getQueryParam(req, 'count');

      expect(result).toBe(0);
    });

    test('should return false value', () => {
      const req = createMockRequest({
        query: { enabled: false },
      });

      const result = getQueryParam(req, 'enabled');

      expect(result).toBe(false);
    });
  });

  describe('when parameter does not exist', () => {
    test('should return undefined for missing parameter', () => {
      const req = createMockRequest({
        query: { other: 'value' },
      });

      const result = getQueryParam(req, 'nonexistent');

      expect(result).toBeUndefined();
    });

    test('should return undefined when query is empty', () => {
      const req = createMockRequest({
        query: {},
      });

      const result = getQueryParam(req, 'missing');

      expect(result).toBeUndefined();
    });

    test('should return undefined when query is undefined', () => {
      const req = createMockRequest();

      const result = getQueryParam(req, 'missing');

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('should handle multiple parameters', () => {
      const req = createMockRequest({
        query: {
          page: '1',
          limit: '20',
          sort: 'name',
        },
      });

      expect(getQueryParam(req, 'page')).toBe('1');
      expect(getQueryParam(req, 'limit')).toBe('20');
      expect(getQueryParam(req, 'sort')).toBe('name');
    });

    test('should handle null value', () => {
      const req = createMockRequest({
        query: { value: null },
      });

      const result = getQueryParam(req, 'value');

      expect(result).toBeNull();
    });

    test('should handle undefined value', () => {
      const req = createMockRequest({
        query: { value: undefined },
      });

      const result = getQueryParam(req, 'value');

      expect(result).toBeUndefined();
    });
  });
});

// ============================================================================
// Unit Tests - getRequiredQueryParam
// ============================================================================

describe('getRequiredQueryParam', () => {
  describe('when parameter exists', () => {
    test('should return string query parameter', () => {
      const req = createMockRequest({
        query: { apiKey: 'secret123' },
      });

      const result = getRequiredQueryParam(req, 'apiKey');

      expect(result).toBe('secret123');
    });

    test('should return numeric query parameter', () => {
      const req = createMockRequest({
        query: { userId: 42 },
      });

      const result = getRequiredQueryParam(req, 'userId');

      expect(result).toBe(42);
    });

    test('should return boolean false', () => {
      const req = createMockRequest({
        query: { active: false },
      });

      const result = getRequiredQueryParam(req, 'active');

      expect(result).toBe(false);
    });

    test('should return zero value', () => {
      const req = createMockRequest({
        query: { count: 0 },
      });

      const result = getRequiredQueryParam(req, 'count');

      expect(result).toBe(0);
    });

    test('should return empty string', () => {
      const req = createMockRequest({
        query: { search: '' },
      });

      const result = getRequiredQueryParam(req, 'search');

      expect(result).toBe('');
    });

    test('should return array parameter', () => {
      const req = createMockRequest({
        query: { ids: ['1', '2', '3'] },
      });

      const result = getRequiredQueryParam(req, 'ids');

      expect(result).toEqual(['1', '2', '3']);
    });

    test('should return object parameter', () => {
      const req = createMockRequest({
        query: { filters: { status: 'active' } },
      });

      const result = getRequiredQueryParam(req, 'filters');

      expect(result).toEqual({ status: 'active' });
    });
  });

  describe('when parameter does not exist', () => {
    test('should throw error for missing parameter', () => {
      const req = createMockRequest({
        query: { other: 'value' },
      });

      expect(() => getRequiredQueryParam(req, 'apiKey')).toThrow(
        "Required query parameter 'apiKey' is missing",
      );
    });

    test('should throw error when query is empty', () => {
      const req = createMockRequest({
        query: {},
      });

      expect(() => getRequiredQueryParam(req, 'token')).toThrow(
        "Required query parameter 'token' is missing",
      );
    });

    test('should throw error when query is undefined', () => {
      const req = createMockRequest();

      expect(() => getRequiredQueryParam(req, 'token')).toThrow(
        "Required query parameter 'token' is missing",
      );
    });

    test('should include parameter name in error message', () => {
      const req = createMockRequest({
        query: {},
      });

      expect(() => getRequiredQueryParam(req, 'customParam')).toThrow('customParam');
    });
  });

  describe('edge cases', () => {
    test('should not throw for null value', () => {
      const req = createMockRequest({
        query: { value: null },
      });

      const result = getRequiredQueryParam(req, 'value');

      expect(result).toBeNull();
    });

    test('should throw for explicitly undefined value', () => {
      const req = createMockRequest({
        query: { value: undefined },
      });

      expect(() => getRequiredQueryParam(req, 'value')).toThrow(
        "Required query parameter 'value' is missing",
      );
    });

    test('should handle parameter with special characters in name', () => {
      const req = createMockRequest({
        query: { 'api-key': 'secret' },
      });

      const result = getRequiredQueryParam(req, 'api-key');

      expect(result).toBe('secret');
    });
  });
});

// ============================================================================
// Integration Tests - Mixed Parameter Access
// ============================================================================

describe('mixed parameter access patterns', () => {
  test('should handle request with both path and query params', () => {
    const req = createMockRequest({
      params: { userId: 'user123' },
      query: { include: 'profile' },
    });

    const pathParam = getPathParam(req, 'userId');
    const queryParam = getQueryParam(req, 'include');

    expect(pathParam).toBe('user123');
    expect(queryParam).toBe('profile');
  });

  test('should handle multiple required parameters', () => {
    const req = createMockRequest({
      params: { userId: 'user123', postId: 'post456' },
      query: { apiKey: 'secret', version: '2' },
    });

    expect(() => {
      getRequiredPathParam(req, 'userId');
      getRequiredPathParam(req, 'postId');
      getRequiredQueryParam(req, 'apiKey');
      getRequiredQueryParam(req, 'version');
    }).not.toThrow();
  });

  test('should validate path param and extract query params in same request', () => {
    const req = createMockRequest({
      params: { id: 'uuid-123' },
      query: { expand: 'true', fields: ['name', 'email'] },
    });

    const isUUID = (value: string) => value.startsWith('uuid-');
    const pathParam = getValidatedPathParam(req, 'id', isUUID);
    const queryParams = getQueryParams(req);

    expect(pathParam).toBe('uuid-123');
    expect(queryParams).toEqual({
      expand: 'true',
      fields: ['name', 'email'],
    });
  });

  test('should handle missing required params correctly in sequence', () => {
    const req = createMockRequest({
      params: { userId: 'user123' },
      query: {},
    });

    expect(() => getRequiredPathParam(req, 'userId')).not.toThrow();
    expect(() => getRequiredPathParam(req, 'postId')).toThrow(
      "Required path parameter 'postId' is missing",
    );
    expect(() => getRequiredQueryParam(req, 'apiKey')).toThrow(
      "Required query parameter 'apiKey' is missing",
    );
  });

  test('should handle realistic API request pattern', () => {
    const req = createMockRequest({
      params: {
        organizationId: 'org-abc123',
        projectId: 'proj-xyz789',
      },
      query: {
        page: '1',
        limit: '50',
        sort: 'createdAt',
        order: 'desc',
        status: 'active',
      },
    });

    const orgId = getRequiredPathParam(req, 'organizationId');
    const projectId = getRequiredPathParam(req, 'projectId');
    const page = getQueryParam(req, 'page');
    const limit = getQueryParam(req, 'limit');
    const sort = getQueryParam(req, 'sort');
    const order = getQueryParam(req, 'order');
    const status = getQueryParam(req, 'status');

    expect(orgId).toBe('org-abc123');
    expect(projectId).toBe('proj-xyz789');
    expect(page).toBe('1');
    expect(limit).toBe('50');
    expect(sort).toBe('createdAt');
    expect(order).toBe('desc');
    expect(status).toBe('active');
  });
});
