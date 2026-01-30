// packages/realtime/src/handlers/sync.test.ts
/**
 * Realtime Sync Handler Unit Tests
 *
 * Tests for write handler including:
 * - Authentication checks
 * - Authorization (author ID matching)
 * - Table validation
 * - Error handling (RecordNotFound, VersionConflict)
 * - Success paths
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('../service', () => ({
  isTableAllowed: vi.fn((table: string) => table === 'users' || table === 'posts'),
  loadRecords: vi.fn(),
  getOperationPointers: vi.fn((ops) =>
    ops.map((op: { table: string; id: string }) => ({ table: op.table, id: op.id })),
  ),
  applyOperations: vi.fn(),
  checkVersionConflicts: vi.fn(),
  saveRecords: vi.fn(),
}));

vi.mock('@abe-stack/db', () => ({
  withTransaction: vi.fn((_db, callback) => callback(_db)),
}));

vi.mock('@abe-stack/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/core')>();
  return {
    ...actual,
    SubKeys: {
      record: (table: string, id: string) => `record:${table}:${id}`,
    },
  };
});

import { handleWrite, RecordNotFoundError, VersionConflictError } from './sync';

import type { RealtimeModuleDeps, RealtimeRequest } from '../types';
import type { RealtimeTransaction, RecordPointer } from '@abe-stack/core';

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

function createMockRequest(user?: { userId: string }): RealtimeRequest {
  return {
    user: user as RealtimeRequest['user'],
    cookies: {},
    headers: {},
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
  };
}

function createWriteTransaction(
  authorId: string,
  operations: RealtimeTransaction['operations'],
): RealtimeTransaction {
  return {
    txId: `tx-${Date.now()}`,
    authorId,
    clientTimestamp: Date.now(),
    operations,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Realtime Sync Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleWrite', () => {
    describe('Authentication', () => {
      test('should reject unauthenticated requests', async () => {
        const ctx = createMockContext();
        const req = createMockRequest(); // No user
        const body = createWriteTransaction('user-123', []);

        const result = await handleWrite(ctx, body, req);

        expect(result.status).toBe(403);
        expect(result.body).toEqual({ message: 'Authentication required' });
      });

      test('should reject mismatched authorId', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({ userId: 'user-123' });
        const body = createWriteTransaction('different-user', []);

        const result = await handleWrite(ctx, body, req);

        expect(result.status).toBe(403);
        expect(result.body).toEqual({ message: 'Author ID must match authenticated user' });
        expect(ctx.log.warn).toHaveBeenCalled();
      });
    });

    describe('Table Validation', () => {
      test('should reject operations on disallowed tables', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({ userId: 'user-123' });
        const body = createWriteTransaction('user-123', [
          { type: 'set', table: 'secret_table', id: 'id-1', key: 'name', value: 'test' },
        ]);

        const result = await handleWrite(ctx, body, req);

        expect(result.status).toBe(400);
        expect(result.body).toEqual({
          message: "Table 'secret_table' is not allowed for realtime operations",
        });
      });

      test('should accept operations on allowed tables', async () => {
        const service = await import('../service');
        const { loadRecords, applyOperations, checkVersionConflicts, saveRecords } = service;

        vi.mocked(loadRecords).mockResolvedValue({
          users: { 'user-1': { id: 'user-1', version: 1 } },
        });
        vi.mocked(applyOperations).mockReturnValue({
          recordMap: { users: { 'user-1': { id: 'user-1', version: 2, name: 'Updated' } } },
          modifiedRecords: [{ table: 'users', id: 'user-1' }],
        });
        vi.mocked(checkVersionConflicts).mockReturnValue([]);
        vi.mocked(saveRecords).mockResolvedValue(undefined);

        const ctx = createMockContext();
        const req = createMockRequest({ userId: 'user-123' });
        const body = createWriteTransaction('user-123', [
          { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'Updated' },
        ]);

        const result = await handleWrite(ctx, body, req);

        expect(result.status).toBe(200);
      });
    });

    describe('Record Not Found', () => {
      test('should return 400 when record does not exist', async () => {
        const { loadRecords } = await import('../service');
        vi.mocked(loadRecords).mockResolvedValue({ users: {} }); // Empty - no records

        const ctx = createMockContext();
        const req = createMockRequest({ userId: 'user-123' });
        const body = createWriteTransaction('user-123', [
          { type: 'set', table: 'users', id: 'nonexistent', key: 'name', value: 'Test' },
        ]);

        const result = await handleWrite(ctx, body, req);

        expect(result.status).toBe(400);
        expect((result.body as { message: string }).message).toContain('Record not found');
      });
    });

    describe('Version Conflicts', () => {
      test('should return 409 when version conflict detected', async () => {
        const { loadRecords, applyOperations, checkVersionConflicts } = await import('../service');

        vi.mocked(loadRecords).mockResolvedValue({
          users: { 'user-1': { id: 'user-1', version: 1 } },
        });
        vi.mocked(applyOperations).mockReturnValue({
          recordMap: { users: { 'user-1': { id: 'user-1', version: 2 } } },
          modifiedRecords: [{ table: 'users', id: 'user-1' }],
        });
        vi.mocked(checkVersionConflicts).mockReturnValue([
          { table: 'users', id: 'user-1', expectedVersion: 1, actualVersion: 5 },
        ]);

        const ctx = createMockContext();
        const req = createMockRequest({ userId: 'user-123' });
        const body = createWriteTransaction('user-123', [
          { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'Test' },
        ]);

        const result = await handleWrite(ctx, body, req);

        expect(result.status).toBe(409);
        expect((result.body as { message: string }).message).toContain('Version conflict');
        expect(
          (result.body as { conflictingRecords?: RecordPointer[] }).conflictingRecords,
        ).toEqual([{ table: 'users', id: 'user-1' }]);
      });
    });

    describe('Success Path', () => {
      test('should apply operations and return updated records', async () => {
        const { loadRecords, applyOperations, checkVersionConflicts, saveRecords } =
          await import('../service');

        const originalRecord = { id: 'user-1', version: 1, name: 'Original' };
        const updatedRecord = { id: 'user-1', version: 2, name: 'Updated' };

        vi.mocked(loadRecords).mockResolvedValue({ users: { 'user-1': originalRecord } });
        vi.mocked(applyOperations).mockReturnValue({
          recordMap: { users: { 'user-1': updatedRecord } },
          modifiedRecords: [{ table: 'users', id: 'user-1' }],
        });
        vi.mocked(checkVersionConflicts).mockReturnValue([]);
        vi.mocked(saveRecords).mockResolvedValue(undefined);

        const ctx = createMockContext();
        const req = createMockRequest({ userId: 'user-123' });
        const body = createWriteTransaction('user-123', [
          { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'Updated' },
        ]);

        const result = await handleWrite(ctx, body, req);

        expect(result.status).toBe(200);
        expect((result.body as { recordMap: unknown }).recordMap).toEqual({
          users: { 'user-1': updatedRecord },
        });
      });

      test('should log transaction details', async () => {
        const { loadRecords, applyOperations, checkVersionConflicts, saveRecords } =
          await import('../service');

        vi.mocked(loadRecords).mockResolvedValue({
          users: { 'user-1': { id: 'user-1', version: 1 } },
        });
        vi.mocked(applyOperations).mockReturnValue({
          recordMap: { users: { 'user-1': { id: 'user-1', version: 2 } } },
          modifiedRecords: [{ table: 'users', id: 'user-1' }],
        });
        vi.mocked(checkVersionConflicts).mockReturnValue([]);
        vi.mocked(saveRecords).mockResolvedValue(undefined);

        const ctx = createMockContext();
        const req = createMockRequest({ userId: 'user-123' });
        const body = createWriteTransaction('user-123', [
          { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'Test' },
        ]);

        await handleWrite(ctx, body, req);

        expect(ctx.log.debug).toHaveBeenCalledWith(
          expect.objectContaining({ txId: body.txId }),
          'Write transaction started',
        );
        expect(ctx.log.debug).toHaveBeenCalledWith(
          expect.objectContaining({ txId: body.txId, modifiedCount: 1 }),
          'Write transaction completed',
        );
      });
    });

    describe('Error Handling', () => {
      test('should return 500 for unexpected errors', async () => {
        const { loadRecords } = await import('../service');
        vi.mocked(loadRecords).mockRejectedValue(new Error('Database connection failed'));

        const ctx = createMockContext();
        const req = createMockRequest({ userId: 'user-123' });
        const body = createWriteTransaction('user-123', [
          { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'Test' },
        ]);

        const result = await handleWrite(ctx, body, req);

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Internal server error' });
        expect(ctx.log.error).toHaveBeenCalled();
      });
    });
  });

  describe('Error Classes', () => {
    describe('RecordNotFoundError', () => {
      test('should include table and id in message', () => {
        const error = new RecordNotFoundError('users', 'user-123');

        expect(error.message).toBe('Record not found: users:user-123');
        expect(error.name).toBe('RecordNotFoundError');
        expect(error.table).toBe('users');
        expect(error.id).toBe('user-123');
      });
    });

    describe('VersionConflictError', () => {
      test('should include conflicting records', () => {
        const conflicts = [
          { table: 'users', id: 'user-1' },
          { table: 'posts', id: 'post-1' },
        ];
        const error = new VersionConflictError(conflicts);

        expect(error.message).toBe('Version conflict detected');
        expect(error.name).toBe('VersionConflictError');
        expect(error.conflictingRecords).toEqual(conflicts);
      });
    });
  });
});
