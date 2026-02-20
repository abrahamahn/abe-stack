// main/apps/web/src/features/shared/hooks/useUndoRedoIntegration.ts
/**
 * useUndoRedoIntegration
 *
 * A hook that wires the UndoRedoStore to actual data operations, integrating
 * with the realtime write API. Provides `executeWithUndo` for pushing operations
 * onto the undo stack while applying them, and handles undo/redo by inverting
 * and re-applying operations through the server.
 *
 * @packageDocumentation
 */

import { useUndoRedoStore } from '@bslt/react';
import {
  createTransaction,
  invertTransaction,
  type Operation,
  type Transaction,
} from '@bslt/shared';
import { useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for configuring the undo/redo integration.
 */
export interface UseUndoRedoIntegrationOptions {
  /**
   * Base URL for the realtime write API.
   * @default '/api/realtime/write'
   */
  apiUrl?: string;

  /**
   * Function to retrieve the current auth token for API requests.
   * If not provided, requests are made without authorization headers.
   */
  getAuthToken?: () => string | null;

  /**
   * Callback invoked after an operation is successfully applied to the server.
   * Useful for triggering UI updates or invalidating queries.
   */
  onApply?: (transaction: Transaction) => void;

  /**
   * Callback invoked when an API request fails.
   */
  onError?: (error: Error, transaction: Transaction) => void;
}

/**
 * Result returned by the useUndoRedoIntegration hook.
 */
export interface UseUndoRedoIntegrationResult {
  /**
   * Execute an operation and push it onto the undo stack.
   * The operation is sent to the realtime write API.
   */
  executeWithUndo: (operations: Operation[]) => Promise<void>;

  /**
   * Undo the last operation: inverts it and sends the inverse to the server.
   */
  undo: () => Promise<void>;

  /**
   * Redo the last undone operation: re-applies it via the server.
   */
  redo: () => Promise<void>;

  /** Whether undo is available */
  canUndo: boolean;

  /** Whether redo is available */
  canRedo: boolean;

  /** Number of undoable transactions */
  undoCount: number;

  /** Number of redoable transactions */
  redoCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_API_URL = '/api/realtime/write';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Send a transaction to the realtime write API.
 */
async function sendToServer(
  transaction: Transaction,
  apiUrl: string,
  authToken: string | null,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken !== null) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ transaction }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'Unknown error');
    throw new Error(`Realtime write failed (${String(response.status)}): ${body}`);
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that integrates undo/redo with actual data operations via the
 * realtime write API.
 *
 * @example
 * ```typescript
 * function Editor() {
 *   const { executeWithUndo, undo, redo, canUndo, canRedo } = useUndoRedoIntegration({
 *     getAuthToken: () => session.accessToken,
 *     onApply: () => queryClient.invalidateQueries(['records']),
 *     onError: (err) => toast.error(err.message),
 *   });
 *
 *   const handleChange = async (path: string[], newValue: unknown, oldValue: unknown) => {
 *     await executeWithUndo([
 *       { type: 'set', path, value: newValue, previousValue: oldValue },
 *     ]);
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={undo} disabled={!canUndo}>Undo</button>
 *       <button onClick={redo} disabled={!canRedo}>Redo</button>
 *     </>
 *   );
 * }
 * ```
 */
export function useUndoRedoIntegration(
  options: UseUndoRedoIntegrationOptions = {},
): UseUndoRedoIntegrationResult {
  const {
    apiUrl = DEFAULT_API_URL,
    getAuthToken,
    onApply,
    onError,
  } = options;

  const store = useUndoRedoStore();
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  const undoCount = store.undoStackSize();
  const redoCount = store.redoStackSize();

  // Use refs for callbacks to avoid stale closures
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const getAuthTokenRef = useRef(getAuthToken);
  getAuthTokenRef.current = getAuthToken;

  /**
   * Execute operations and push a transaction onto the undo stack.
   */
  const executeWithUndo = useCallback(
    async (operations: Operation[]): Promise<void> => {
      const transaction = createTransaction(operations);
      const authToken = getAuthTokenRef.current?.() ?? null;

      try {
        await sendToServer(transaction, apiUrl, authToken);
        store.push(transaction);
        onApplyRef.current?.(transaction);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onErrorRef.current?.(error, transaction);
        throw error;
      }
    },
    [apiUrl, store],
  );

  /**
   * Undo the last transaction by inverting it and sending to the server.
   */
  const undo = useCallback(async (): Promise<void> => {
    const inverseTx = store.undo();
    if (inverseTx === undefined) return;

    const authToken = getAuthTokenRef.current?.() ?? null;

    try {
      await sendToServer(inverseTx, apiUrl, authToken);
      onApplyRef.current?.(inverseTx);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onErrorRef.current?.(error, inverseTx);
      throw error;
    }
  }, [apiUrl, store]);

  /**
   * Redo the last undone transaction by re-applying it to the server.
   */
  const redo = useCallback(async (): Promise<void> => {
    const tx = store.redo();
    if (tx === undefined) return;

    const authToken = getAuthTokenRef.current?.() ?? null;

    try {
      await sendToServer(tx, apiUrl, authToken);
      onApplyRef.current?.(tx);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onErrorRef.current?.(error, tx);
      throw error;
    }
  }, [apiUrl, store]);

  return {
    executeWithUndo,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
  };
}
