// main/apps/web/src/features/shared/hooks/useUndoRedoIntegration.test.ts
/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUndoRedoIntegration } from './useUndoRedoIntegration';

import type { Operation, Transaction } from '@bslt/shared';

// ============================================================================
// Mock store
// ============================================================================

const mockPush = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockCanUndo = vi.fn().mockReturnValue(false);
const mockCanRedo = vi.fn().mockReturnValue(false);
const mockUndoStackSize = vi.fn().mockReturnValue(0);
const mockRedoStackSize = vi.fn().mockReturnValue(0);

vi.mock('@bslt/react', () => ({
  useUndoRedoStore: () => ({
    push: mockPush,
    undo: mockUndo,
    redo: mockRedo,
    canUndo: mockCanUndo,
    canRedo: mockCanRedo,
    undoStackSize: mockUndoStackSize,
    redoStackSize: mockRedoStackSize,
    clear: vi.fn(),
    undoStack: [],
    redoStack: [],
    lastTimestamp: 0,
  }),
}));

// ============================================================================
// Mock fetch
// ============================================================================

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = mockFetch;
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(''),
  });
});

// ============================================================================
// Tests
// ============================================================================

describe('useUndoRedoIntegration', () => {
  describe('executeWithUndo', () => {
    it('should send operations to the realtime write API', async () => {
      const { result } = renderHook(() => useUndoRedoIntegration());

      const operations: Operation[] = [
        { type: 'set', path: ['users', 'u1', 'name'], value: 'Alice', previousValue: 'Bob' },
      ];

      await act(async () => {
        await result.current.executeWithUndo(operations);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/realtime/write',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should push the transaction onto the undo stack on success', async () => {
      const { result } = renderHook(() => useUndoRedoIntegration());

      const operations: Operation[] = [
        { type: 'set', path: ['a'], value: 1, previousValue: 0 },
      ];

      await act(async () => {
        await result.current.executeWithUndo(operations);
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
      const pushedTx = mockPush.mock.calls[0]?.[0] as Transaction;
      expect(pushedTx.operations).toEqual(operations);
      expect(typeof pushedTx.id).toBe('string');
      expect(typeof pushedTx.timestamp).toBe('number');
    });

    it('should call onApply callback after successful execution', async () => {
      const onApply = vi.fn();
      const { result } = renderHook(() => useUndoRedoIntegration({ onApply }));

      await act(async () => {
        await result.current.executeWithUndo([
          { type: 'set', path: ['a'], value: 1 },
        ]);
      });

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: [{ type: 'set', path: ['a'], value: 1 }],
        }),
      );
    });

    it('should include auth token when getAuthToken is provided', async () => {
      const getAuthToken = vi.fn().mockReturnValue('my-token');
      const { result } = renderHook(() => useUndoRedoIntegration({ getAuthToken }));

      await act(async () => {
        await result.current.executeWithUndo([
          { type: 'set', path: ['a'], value: 1 },
        ]);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/realtime/write',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        }),
      );
    });

    it('should use custom apiUrl when provided', async () => {
      const { result } = renderHook(() =>
        useUndoRedoIntegration({ apiUrl: '/custom/api/write' }),
      );

      await act(async () => {
        await result.current.executeWithUndo([
          { type: 'set', path: ['a'], value: 1 },
        ]);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/custom/api/write',
        expect.anything(),
      );
    });

    it('should call onError and throw when the API request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useUndoRedoIntegration({ onError }));

      await expect(
        act(async () => {
          await result.current.executeWithUndo([
            { type: 'set', path: ['a'], value: 1 },
          ]);
        }),
      ).rejects.toThrow('Realtime write failed (500)');

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operations: [{ type: 'set', path: ['a'], value: 1 }],
        }),
      );
    });

    it('should not push to undo stack when API request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad Request'),
      });

      const { result } = renderHook(() => useUndoRedoIntegration());

      try {
        await act(async () => {
          await result.current.executeWithUndo([
            { type: 'set', path: ['a'], value: 1 },
          ]);
        });
      } catch {
        // Expected to throw
      }

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('undo', () => {
    it('should call store.undo and send the inverse transaction to the server', async () => {
      const inverseTx: Transaction = {
        id: 'inv-1',
        timestamp: Date.now(),
        operations: [{ type: 'set', path: ['a'], value: 0, previousValue: 1 }],
      };
      mockUndo.mockReturnValue(inverseTx);

      const { result } = renderHook(() => useUndoRedoIntegration());

      await act(async () => {
        await result.current.undo();
      });

      expect(mockUndo).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/realtime/write',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ transaction: inverseTx }),
        }),
      );
    });

    it('should do nothing when there is nothing to undo', async () => {
      mockUndo.mockReturnValue(undefined);

      const { result } = renderHook(() => useUndoRedoIntegration());

      await act(async () => {
        await result.current.undo();
      });

      expect(mockUndo).toHaveBeenCalledTimes(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call onApply after successful undo', async () => {
      const inverseTx: Transaction = {
        id: 'inv-2',
        timestamp: Date.now(),
        operations: [{ type: 'set', path: ['b'], value: 'old', previousValue: 'new' }],
      };
      mockUndo.mockReturnValue(inverseTx);
      const onApply = vi.fn();

      const { result } = renderHook(() => useUndoRedoIntegration({ onApply }));

      await act(async () => {
        await result.current.undo();
      });

      expect(onApply).toHaveBeenCalledWith(inverseTx);
    });

    it('should call onError when undo API request fails', async () => {
      const inverseTx: Transaction = {
        id: 'inv-3',
        timestamp: Date.now(),
        operations: [{ type: 'set', path: ['c'], value: 0 }],
      };
      mockUndo.mockReturnValue(inverseTx);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: vi.fn().mockResolvedValue('Service Unavailable'),
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useUndoRedoIntegration({ onError }));

      await expect(
        act(async () => {
          await result.current.undo();
        }),
      ).rejects.toThrow('Realtime write failed (503)');

      expect(onError).toHaveBeenCalledWith(expect.any(Error), inverseTx);
    });
  });

  describe('redo', () => {
    it('should call store.redo and send the transaction to the server', async () => {
      const tx: Transaction = {
        id: 'tx-1',
        timestamp: Date.now(),
        operations: [{ type: 'set', path: ['a'], value: 1, previousValue: 0 }],
      };
      mockRedo.mockReturnValue(tx);

      const { result } = renderHook(() => useUndoRedoIntegration());

      await act(async () => {
        await result.current.redo();
      });

      expect(mockRedo).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/realtime/write',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ transaction: tx }),
        }),
      );
    });

    it('should do nothing when there is nothing to redo', async () => {
      mockRedo.mockReturnValue(undefined);

      const { result } = renderHook(() => useUndoRedoIntegration());

      await act(async () => {
        await result.current.redo();
      });

      expect(mockRedo).toHaveBeenCalledTimes(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call onApply after successful redo', async () => {
      const tx: Transaction = {
        id: 'tx-2',
        timestamp: Date.now(),
        operations: [{ type: 'listInsert', path: ['items'], value: 'new-item', position: 'append' }],
      };
      mockRedo.mockReturnValue(tx);
      const onApply = vi.fn();

      const { result } = renderHook(() => useUndoRedoIntegration({ onApply }));

      await act(async () => {
        await result.current.redo();
      });

      expect(onApply).toHaveBeenCalledWith(tx);
    });

    it('should call onError when redo API request fails', async () => {
      const tx: Transaction = {
        id: 'tx-3',
        timestamp: Date.now(),
        operations: [{ type: 'set', path: ['d'], value: 42 }],
      };
      mockRedo.mockReturnValue(tx);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: vi.fn().mockResolvedValue('Unprocessable Entity'),
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useUndoRedoIntegration({ onError }));

      await expect(
        act(async () => {
          await result.current.redo();
        }),
      ).rejects.toThrow('Realtime write failed (422)');

      expect(onError).toHaveBeenCalledWith(expect.any(Error), tx);
    });
  });

  describe('state accessors', () => {
    it('should expose canUndo from store', () => {
      mockCanUndo.mockReturnValue(true);

      const { result } = renderHook(() => useUndoRedoIntegration());

      expect(result.current.canUndo).toBe(true);
    });

    it('should expose canRedo from store', () => {
      mockCanRedo.mockReturnValue(true);

      const { result } = renderHook(() => useUndoRedoIntegration());

      expect(result.current.canRedo).toBe(true);
    });

    it('should expose undoCount from store', () => {
      mockUndoStackSize.mockReturnValue(7);

      const { result } = renderHook(() => useUndoRedoIntegration());

      expect(result.current.undoCount).toBe(7);
    });

    it('should expose redoCount from store', () => {
      mockRedoStackSize.mockReturnValue(3);

      const { result } = renderHook(() => useUndoRedoIntegration());

      expect(result.current.redoCount).toBe(3);
    });
  });
});
