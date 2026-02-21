// main/server/system/src/routing/api.versioning.test.ts
/**
 * Tests for API Versioning Middleware
 *
 * Covers version extraction from URL, Accept header, custom header,
 * and default fallback behaviour.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { API_VERSIONS, apiVersioningPlugin, extractApiVersion } from './api.versioning';
import { CURRENT_API_VERSION, SUPPORTED_API_VERSIONS } from './api.versioning.types';

import type { ApiVersionInfo } from './api.versioning.types';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// extractApiVersion — pure function tests
// ============================================================================

describe('extractApiVersion', () => {
  // ------------------------------------------------------------------
  // URL path extraction
  // ------------------------------------------------------------------

  describe('URL path extraction', () => {
    test('should extract version from /api/v1/ path', () => {
      const result = extractApiVersion({
        url: '/api/v1/auth/login',
        headers: {},
      });

      expect(result).toEqual<ApiVersionInfo>({ version: 1, source: 'url' });
    });

    test('should handle /api/v1 without trailing slash', () => {
      const result = extractApiVersion({
        url: '/api/v1',
        headers: {},
      });

      expect(result).toEqual<ApiVersionInfo>({ version: 1, source: 'url' });
    });

    test('should ignore unsupported versions in URL', () => {
      const result = extractApiVersion({
        url: '/api/v99/auth/login',
        headers: {},
      });

      // v99 is not in SUPPORTED_API_VERSIONS, so it falls through to default
      expect(result.source).toBe('default');
      expect(result.version).toBe(CURRENT_API_VERSION);
    });

    test('should not match version-like patterns outside /api/ prefix', () => {
      const result = extractApiVersion({
        url: '/other/v1/something',
        headers: {},
      });

      expect(result.source).toBe('default');
    });
  });

  // ------------------------------------------------------------------
  // Accept header extraction
  // ------------------------------------------------------------------

  describe('Accept header extraction', () => {
    test('should extract version from Accept header with version parameter', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: { accept: 'application/json; version=1' },
      });

      expect(result).toEqual<ApiVersionInfo>({ version: 1, source: 'accept-header' });
    });

    test('should handle Accept header with extra whitespace', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: { accept: 'application/json; version = 1' },
      });

      expect(result).toEqual<ApiVersionInfo>({ version: 1, source: 'accept-header' });
    });

    test('should ignore unsupported versions in Accept header', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: { accept: 'application/json; version=99' },
      });

      expect(result.source).toBe('default');
      expect(result.version).toBe(CURRENT_API_VERSION);
    });

    test('should handle Accept header without version parameter', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: { accept: 'application/json' },
      });

      expect(result.source).toBe('default');
    });

    test('should handle array Accept header', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: { accept: ['application/json; version=1', 'text/html'] },
      });

      expect(result).toEqual<ApiVersionInfo>({ version: 1, source: 'accept-header' });
    });
  });

  // ------------------------------------------------------------------
  // Custom header extraction
  // ------------------------------------------------------------------

  describe('X-API-Version header extraction', () => {
    test('should extract version from X-API-Version header', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: { 'x-api-version': '1' },
      });

      expect(result).toEqual<ApiVersionInfo>({ version: 1, source: 'custom-header' });
    });

    test('should ignore non-numeric X-API-Version header', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: { 'x-api-version': 'latest' },
      });

      expect(result.source).toBe('default');
    });

    test('should ignore unsupported versions in X-API-Version header', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: { 'x-api-version': '99' },
      });

      expect(result.source).toBe('default');
      expect(result.version).toBe(CURRENT_API_VERSION);
    });

    test('should handle array X-API-Version header', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: { 'x-api-version': ['1'] },
      });

      expect(result).toEqual<ApiVersionInfo>({ version: 1, source: 'custom-header' });
    });
  });

  // ------------------------------------------------------------------
  // Resolution priority
  // ------------------------------------------------------------------

  describe('resolution priority', () => {
    test('URL path takes priority over Accept header', () => {
      const result = extractApiVersion({
        url: '/api/v1/auth/login',
        headers: { accept: 'application/json; version=1' },
      });

      expect(result.source).toBe('url');
    });

    test('URL path takes priority over custom header', () => {
      const result = extractApiVersion({
        url: '/api/v1/auth/login',
        headers: { 'x-api-version': '1' },
      });

      expect(result.source).toBe('url');
    });

    test('Accept header takes priority over custom header', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: {
          accept: 'application/json; version=1',
          'x-api-version': '1',
        },
      });

      expect(result.source).toBe('accept-header');
    });
  });

  // ------------------------------------------------------------------
  // Default fallback
  // ------------------------------------------------------------------

  describe('default fallback', () => {
    test('should default to CURRENT_API_VERSION when no version specified', () => {
      const result = extractApiVersion({
        url: '/api/auth/login',
        headers: {},
      });

      expect(result).toEqual<ApiVersionInfo>({
        version: CURRENT_API_VERSION,
        source: 'default',
      });
    });

    test('should default when URL has no version and headers are empty', () => {
      const result = extractApiVersion({
        url: '/health',
        headers: {},
      });

      expect(result.version).toBe(CURRENT_API_VERSION);
      expect(result.source).toBe('default');
    });
  });
});

// ============================================================================
// API_VERSIONS constant
// ============================================================================

describe('API_VERSIONS', () => {
  test('should equal SUPPORTED_API_VERSIONS', () => {
    expect(API_VERSIONS).toEqual(SUPPORTED_API_VERSIONS);
  });

  test('should include the current API version', () => {
    expect(API_VERSIONS).toContain(CURRENT_API_VERSION);
  });
});

// ============================================================================
// apiVersioningPlugin — Fastify integration
// ============================================================================

describe('apiVersioningPlugin', () => {
  type HookHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

  let hooks: { onRequest: HookHandler[] };
  let decorators: Record<string, unknown>;
  let mockFastify: FastifyInstance;

  beforeEach(() => {
    hooks = { onRequest: [] };
    decorators = {};

    mockFastify = {
      decorateRequest: vi.fn((name: string, value: unknown) => {
        decorators[name] = value;
      }),
      hasRequestDecorator: vi.fn((name: string) => name in decorators),
      addHook: vi.fn((event: string, handler: HookHandler) => {
        if (event === 'onRequest') {
          hooks.onRequest.push(handler);
        }
      }),
    } as unknown as FastifyInstance;

    vi.clearAllMocks();
  });

  function createMockRequest(
    overrides: Partial<{
      url: string;
      headers: Record<string, string | string[] | undefined>;
    }> = {},
  ): FastifyRequest {
    return {
      url: '/api/test',
      headers: {},
      apiVersion: undefined,
      apiVersionInfo: undefined,
      ...overrides,
    } as unknown as FastifyRequest;
  }

  function createMockReply(): FastifyReply {
    const reply = {
      header: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;
    return reply;
  }

  test('should register onRequest hook', () => {
    apiVersioningPlugin(mockFastify, {}, () => {});

    expect(mockFastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
  });

  test('should decorate request with apiVersion and apiVersionInfo', () => {
    apiVersioningPlugin(mockFastify, {}, () => {});

    expect(mockFastify.decorateRequest).toHaveBeenCalledWith('apiVersion', CURRENT_API_VERSION);
    expect(mockFastify.decorateRequest).toHaveBeenCalledWith(
      'apiVersionInfo',
      expect.objectContaining({ version: CURRENT_API_VERSION, source: 'default' }),
    );
  });

  test('should not double-decorate when already present', () => {
    decorators['apiVersion'] = 1;
    decorators['apiVersionInfo'] = { version: 1, source: 'default' };

    apiVersioningPlugin(mockFastify, {}, () => {});

    expect(mockFastify.decorateRequest).not.toHaveBeenCalled();
  });

  test('onRequest hook should set apiVersion from URL', async () => {
    apiVersioningPlugin(mockFastify, {}, () => {});

    const request = createMockRequest({ url: '/api/v1/test' });
    const reply = createMockReply();

    await hooks.onRequest[0]!(request, reply);

    expect(request.apiVersion).toBe(1);
    expect(request.apiVersionInfo).toEqual({ version: 1, source: 'url' });
  });

  test('onRequest hook should set apiVersion from custom header', async () => {
    apiVersioningPlugin(mockFastify, {}, () => {});

    const request = createMockRequest({
      url: '/api/test',
      headers: { 'x-api-version': '1' },
    });
    const reply = createMockReply();

    await hooks.onRequest[0]!(request, reply);

    expect(request.apiVersion).toBe(1);
    expect(request.apiVersionInfo).toEqual({ version: 1, source: 'custom-header' });
  });

  test('onRequest hook should default when no version specified', async () => {
    apiVersioningPlugin(mockFastify, {}, () => {});

    const request = createMockRequest({ url: '/api/test' });
    const reply = createMockReply();

    await hooks.onRequest[0]!(request, reply);

    expect(request.apiVersion).toBe(CURRENT_API_VERSION);
    expect(request.apiVersionInfo.source).toBe('default');
  });

  test('onRequest hook should set X-API-Version response header', async () => {
    apiVersioningPlugin(mockFastify, {}, () => {});

    const request = createMockRequest({ url: '/api/v1/test' });
    const reply = createMockReply();

    await hooks.onRequest[0]!(request, reply);

    expect(reply.header).toHaveBeenCalledWith('x-api-version', '1');
  });

  test('should call done callback', () => {
    const done = vi.fn();
    apiVersioningPlugin(mockFastify, {}, done);

    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith();
  });
});
