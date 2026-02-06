// apps/server/src/http/middleware/correlationId.test.ts
/**
 * Correlation ID Middleware Tests
 */

import { describe, it, expect, vi } from 'vitest';

import { registerCorrelationIdHook, generateCorrelationId } from './correlationId';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

describe('generateCorrelationId', () => {
  it('should generate a valid UUID', () => {
    const id = generateCorrelationId();

    // UUID v4 format
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      ids.add(generateCorrelationId());
    }

    expect(ids.size).toBe(100);
  });
});

describe('registerCorrelationIdHook', () => {
  it('should register an onRequest hook', () => {
    const addHookMock = vi.fn();
    const mockApp = {
      addHook: addHookMock,
    } as unknown as FastifyInstance;

    registerCorrelationIdHook(mockApp);

    expect(addHookMock).toHaveBeenCalledWith('onRequest', expect.any(Function));
  });

  it('should set correlation ID on request and response', async () => {
    let hookFn: ((req: FastifyRequest, reply: FastifyReply) => Promise<void>) | undefined;

    const mockApp = {
      addHook: vi.fn((event: string, fn: typeof hookFn) => {
        if (event === 'onRequest') {
          hookFn = fn;
        }
      }),
    } as unknown as FastifyInstance;

    registerCorrelationIdHook(mockApp);

    expect(hookFn).toBeDefined();

    const mockReq = {
      headers: {},
    } as unknown as FastifyRequest;

    const headerMock = vi.fn();
    const mockReply = {
      header: headerMock,
    } as unknown as FastifyReply;

    await hookFn!(mockReq, mockReply);

    // Should have set correlationId on request
    expect((mockReq as FastifyRequest & { correlationId: string }).correlationId).toBeDefined();
    expect((mockReq as FastifyRequest & { correlationId: string }).correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    // Should have set header on response
    expect(headerMock).toHaveBeenCalledWith(
      'x-correlation-id',
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );
  });

  it('should use existing correlation ID from headers when trustProxy is true', async () => {
    let hookFn: ((req: FastifyRequest, reply: FastifyReply) => Promise<void>) | undefined;

    const mockApp = {
      addHook: vi.fn((event: string, fn: typeof hookFn) => {
        if (event === 'onRequest') {
          hookFn = fn;
        }
      }),
    } as unknown as FastifyInstance;

    registerCorrelationIdHook(mockApp, { trustProxy: true });

    const existingId = 'my-existing-correlation-id-123';
    const mockReq = {
      headers: {
        'x-correlation-id': existingId,
      },
    } as unknown as FastifyRequest;

    const headerMock = vi.fn();
    const mockReply = {
      header: headerMock,
    } as unknown as FastifyReply;

    await hookFn!(mockReq, mockReply);

    // Should preserve the existing ID
    expect((mockReq as FastifyRequest & { correlationId: string }).correlationId).toBe(existingId);
    expect(headerMock).toHaveBeenCalledWith('x-correlation-id', existingId);
  });

  it('should generate new ID when trustProxy is false', async () => {
    let hookFn: ((req: FastifyRequest, reply: FastifyReply) => Promise<void>) | undefined;

    const mockApp = {
      addHook: vi.fn((event: string, fn: typeof hookFn) => {
        if (event === 'onRequest') {
          hookFn = fn;
        }
      }),
    } as unknown as FastifyInstance;

    registerCorrelationIdHook(mockApp, { trustProxy: false });

    const existingId = 'my-existing-correlation-id-123';
    const mockReq = {
      headers: {
        'x-correlation-id': existingId,
      },
    } as unknown as FastifyRequest;

    const headerMock = vi.fn();
    const mockReply = {
      header: headerMock,
    } as unknown as FastifyReply;

    await hookFn!(mockReq, mockReply);

    // Should generate new ID, not use existing
    expect((mockReq as FastifyRequest & { correlationId: string }).correlationId).not.toBe(
      existingId,
    );
    expect((mockReq as FastifyRequest & { correlationId: string }).correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should reject invalid correlation IDs', async () => {
    let hookFn: ((req: FastifyRequest, reply: FastifyReply) => Promise<void>) | undefined;

    const mockApp = {
      addHook: vi.fn((event: string, fn: typeof hookFn) => {
        if (event === 'onRequest') {
          hookFn = fn;
        }
      }),
    } as unknown as FastifyInstance;

    registerCorrelationIdHook(mockApp);

    // Test with invalid characters (potential header injection)
    const mockReq = {
      headers: {
        'x-correlation-id': 'invalid\r\nheader-injection',
      },
    } as unknown as FastifyRequest;

    const headerMock = vi.fn();
    const mockReply = {
      header: headerMock,
    } as unknown as FastifyReply;

    await hookFn!(mockReq, mockReply);

    // Should generate new ID instead of using invalid one
    const correlationId = (mockReq as FastifyRequest & { correlationId: string }).correlationId;
    expect(correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should use custom header name when specified', async () => {
    let hookFn: ((req: FastifyRequest, reply: FastifyReply) => Promise<void>) | undefined;

    const mockApp = {
      addHook: vi.fn((event: string, fn: typeof hookFn) => {
        if (event === 'onRequest') {
          hookFn = fn;
        }
      }),
    } as unknown as FastifyInstance;

    registerCorrelationIdHook(mockApp, { headerName: 'x-request-id' });

    const existingId = 'custom-header-id-456';
    const mockReq = {
      headers: {
        'x-request-id': existingId,
      },
    } as unknown as FastifyRequest;

    const headerMock = vi.fn();
    const mockReply = {
      header: headerMock,
    } as unknown as FastifyReply;

    await hookFn!(mockReq, mockReply);

    expect((mockReq as FastifyRequest & { correlationId: string }).correlationId).toBe(existingId);
    expect(headerMock).toHaveBeenCalledWith('x-request-id', existingId);
  });
});
