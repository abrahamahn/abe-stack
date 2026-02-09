// src/server/realtime/src/handlers/subscribe.test.ts
/**
 * Realtime Subscribe Handler Unit Tests
 *
 * Tests for get records handler including:
 * - Authentication checks
 * - Table validation
 * - Success paths
 * - Error handling
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('../service', () => ({
  isTableAllowed: vi.fn((table: string) => table === 'users' || table === 'posts'),
  loadRecords: vi.fn(),
}));

import { handleGetRecords } from './subscribe';

import type { RealtimeModuleDeps, RealtimeRequest } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides: Partial<RealtimeModuleDeps> = {}): RealtimeModuleDeps {
  return {
    db: {} as never,
    pubsub: {
      publish: vi.fn(),
    },
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: {
      env: 'test',
      auth: {
        cookie: { secret: 'test-secret' },
        jwt: { secret: 'test-jwt-secret' },
      },
    },
    ...overrides,
  } as unknown as RealtimeModuleDeps;
}

const mockUser = { userId: 'user-123', email: 'test@example.com', role: 'user' };

function createMockRequest(user?: {
  userId: string;
  email: string;
  role: string;
}): RealtimeRequest {
  return {
    ...(user !== undefined ? { user } : {}),
    cookies: {},
    headers: {},
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
  } as RealtimeRequest;
}

// ============================================================================
// Tests
// ============================================================================

describe('Realtime Subscribe Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleGetRecords', () => {
    describe('Authentication', () => {
      test('should reject unauthenticated requests', async () => {
        const ctx = createMockContext();
        const req = createMockRequest(); // No user
        const body = { pointers: [{ table: 'users', id: 'user-1' }] };

        const result = await handleGetRecords(ctx, body, req);

        expect(result.status).toBe(403);
        expect(result.body).toEqual({ message: 'Authentication required' });
      });
    });

    describe('Table Validation', () => {
      test('should reject requests for disallowed tables', async () => {
        const ctx = createMockContext();
        const req = createMockRequest(mockUser);
        const body = { pointers: [{ table: 'secret_table', id: 'id-1' }] };

        const result = await handleGetRecords(ctx, body, req);

        expect(result.status).toBe(400);
        expect(result.body).toEqual({
          message: "Table 'secret_table' is not allowed for realtime operations",
        });
      });
    });

    describe('Success Path', () => {
      test('should return loaded records', async () => {
        const { loadRecords } = await import('../service');

        const mockRecords = {
          users: {
            'user-1': { id: 'user-1', version: 1, name: 'User 1' },
            'user-2': { id: 'user-2', version: 2, name: 'User 2' },
          },
        };
        vi.mocked(loadRecords).mockResolvedValue(mockRecords);

        const ctx = createMockContext();
        const req = createMockRequest(mockUser);
        const body = {
          pointers: [
            { table: 'users', id: 'user-1' },
            { table: 'users', id: 'user-2' },
          ],
        };

        const result = await handleGetRecords(ctx, body, req);

        expect(result.status).toBe(200);
        expect((result.body as { recordMap: unknown }).recordMap).toEqual(mockRecords);
      });

      test('should log request details', async () => {
        const { loadRecords } = await import('../service');
        vi.mocked(loadRecords).mockResolvedValue({});

        const ctx = createMockContext();
        const req = createMockRequest(mockUser);
        const body = { pointers: [{ table: 'users', id: 'user-1' }] };

        await handleGetRecords(ctx, body, req);

        expect(ctx.log.debug).toHaveBeenCalledWith(
          'GetRecords request',
          expect.objectContaining({ userId: 'user-123', pointerCount: 1 }),
        );
      });
    });

    describe('Error Handling', () => {
      test('should return 500 for unexpected errors', async () => {
        const { loadRecords } = await import('../service');
        vi.mocked(loadRecords).mockRejectedValue(new Error('Database error'));

        const ctx = createMockContext();
        const req = createMockRequest(mockUser);
        const body = { pointers: [{ table: 'users', id: 'user-1' }] };

        const result = await handleGetRecords(ctx, body, req);

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Internal server error' });
        expect(ctx.log.error).toHaveBeenCalled();
      });
    });
  });
});
