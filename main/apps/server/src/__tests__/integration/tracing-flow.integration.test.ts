// main/apps/server/src/__tests__/integration/tracing-flow.integration.test.ts
/**
 * Request Tracing Flow Integration Tests
 *
 * Flow: Debug via correlated logs → trace request through middleware → handler → response
 *
 * Verifies correlation ID middleware behavior:
 * - Server generates UUID when no header provided
 * - Server echoes client-provided correlation ID
 * - Correlation ID included in error responses
 * - Concurrent requests get unique IDs
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

// ============================================================================
// Constants
// ============================================================================

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CORRELATION_HEADER = 'x-correlation-id';

// ============================================================================
// Test Suite
// ============================================================================

describe('Request Tracing Flow', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    // Add a test route that returns request context
    testServer.server.get('/api/test/echo', async (request, reply) => {
      return reply.send({
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
      });
    });

    // Add a route that throws an error
    testServer.server.get('/api/test/error', () => {
      throw Object.assign(new Error('Test error'), { statusCode: 400, code: 'TEST_ERROR' });
    });

    // Set up error handler that includes correlationId
    testServer.server.setErrorHandler((error, request, reply) => {
      const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
      const code = (error as { code?: string }).code ?? 'INTERNAL_ERROR';
      void reply.status(statusCode).send({
        ok: false,
        error: {
          code,
          message: (error as Error).message,
          correlationId: request.correlationId,
        },
      });
    });

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
  });

  // ==========================================================================
  // Auto-generated Correlation ID
  // ==========================================================================

  describe('auto-generated correlation ID', () => {
    it('generates a UUID v4 when no header is provided', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/echo',
      });

      expect(response.statusCode).toBe(200);

      const correlationId = response.headers[CORRELATION_HEADER] as string;
      expect(correlationId).toBeDefined();
      expect(correlationId).toMatch(UUID_V4_REGEX);
    });

    it('makes correlation ID available in request handler', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/echo',
      });

      const body = parseJsonResponse(response) as { correlationId: string };
      const headerValue = response.headers[CORRELATION_HEADER] as string;

      expect(body.correlationId).toBe(headerValue);
    });
  });

  // ==========================================================================
  // Client-provided Correlation ID
  // ==========================================================================

  describe('client-provided correlation ID', () => {
    it('echoes a valid client-provided correlation ID', async () => {
      const clientId = 'custom-trace-123';
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/echo',
        headers: { [CORRELATION_HEADER]: clientId },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers[CORRELATION_HEADER]).toBe(clientId);

      const body = parseJsonResponse(response) as { correlationId: string };
      expect(body.correlationId).toBe(clientId);
    });

    it('rejects invalid correlation IDs and generates a new one', async () => {
      // Correlation ID with invalid characters should be rejected
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/echo',
        headers: { [CORRELATION_HEADER]: 'invalid id with spaces!' },
      });

      expect(response.statusCode).toBe(200);

      const correlationId = response.headers[CORRELATION_HEADER] as string;
      // Should have generated a new UUID instead
      expect(correlationId).toMatch(UUID_V4_REGEX);
    });
  });

  // ==========================================================================
  // Error Responses
  // ==========================================================================

  describe('error response correlation', () => {
    it('includes correlation ID in error response body', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/error',
      });

      expect(response.statusCode).toBe(400);

      const body = parseJsonResponse(response) as {
        ok: false;
        error: { correlationId: string; code: string };
      };
      expect(body.ok).toBe(false);
      expect(body.error.correlationId).toBeDefined();
      expect(body.error.correlationId).toMatch(UUID_V4_REGEX);
    });

    it('includes client correlation ID in error response', async () => {
      const clientId = 'error-trace-456';
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/error',
        headers: { [CORRELATION_HEADER]: clientId },
      });

      const body = parseJsonResponse(response) as {
        ok: false;
        error: { correlationId: string };
      };
      expect(body.error.correlationId).toBe(clientId);
    });
  });

  // ==========================================================================
  // Concurrent Request Isolation
  // ==========================================================================

  describe('concurrent request isolation', () => {
    it('assigns unique correlation IDs to concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        testServer.inject({ method: 'GET', url: '/api/test/echo' }),
      );

      const responses = await Promise.all(requests);
      const ids = responses.map((r) => r.headers[CORRELATION_HEADER] as string);

      // All IDs should be valid UUIDs
      for (const id of ids) {
        expect(id).toMatch(UUID_V4_REGEX);
      }

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  // ==========================================================================
  // Correlation ID Format
  // ==========================================================================

  describe('correlation ID format validation', () => {
    it('accepts UUID format', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/echo',
        headers: { [CORRELATION_HEADER]: uuid },
      });

      expect(response.headers[CORRELATION_HEADER]).toBe(uuid);
    });

    it('accepts alphanumeric with hyphens and underscores', async () => {
      const customId = 'req_abc-123_def';
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/echo',
        headers: { [CORRELATION_HEADER]: customId },
      });

      expect(response.headers[CORRELATION_HEADER]).toBe(customId);
    });

    it('rejects empty correlation ID', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/echo',
        headers: { [CORRELATION_HEADER]: '' },
      });

      // Should generate a new UUID
      const correlationId = response.headers[CORRELATION_HEADER] as string;
      expect(correlationId).toMatch(UUID_V4_REGEX);
    });
  });

  // ==========================================================================
  // Correlation ID Propagated to Downstream Calls
  // ==========================================================================

  describe('correlation ID propagation to downstream service calls and queue jobs', () => {
    it('correlation ID is available on request object for downstream propagation', async () => {
      const clientId = 'downstream-trace-789';
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/echo',
        headers: { [CORRELATION_HEADER]: clientId },
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { correlationId: string };
      // The correlationId is available in request context, meaning any
      // downstream service call or queue job enqueued in a handler can read it
      expect(body.correlationId).toBe(clientId);
    });

    it('auto-generated correlation ID is available for downstream propagation', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/echo',
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { correlationId: string };
      // Even without a client-provided ID, the server generates one
      // that handlers can propagate to queued jobs
      expect(body.correlationId).toBeDefined();
      expect(body.correlationId).toMatch(UUID_V4_REGEX);
      // Verify the response header matches what the handler received
      expect(response.headers[CORRELATION_HEADER]).toBe(body.correlationId);
    });

    it('correlation ID remains consistent between response header and handler context', async () => {
      // This verifies the ID set by middleware is the same one the handler sees
      // and the same one returned in the response header — critical for
      // correlation across HTTP responses and downstream queue jobs
      const requests = Array.from({ length: 5 }, () =>
        testServer.inject({ method: 'GET', url: '/api/test/echo' }),
      );

      const responses = await Promise.all(requests);

      for (const response of responses) {
        const body = parseJsonResponse(response) as { correlationId: string };
        const headerValue = response.headers[CORRELATION_HEADER] as string;
        // Header and body correlationId must be identical
        expect(body.correlationId).toBe(headerValue);
        // Must be a valid UUID
        expect(headerValue).toMatch(UUID_V4_REGEX);
      }
    });
  });
});
