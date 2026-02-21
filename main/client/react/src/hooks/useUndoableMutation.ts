// main/client/react/src/hooks/useUndoableMutation.ts
import { createSetOperation, createTransaction } from '@bslt/shared';
import { useRef } from 'react';

import { useMutation } from '../query/useMutation';
import { useUndoRedoStore } from '../stores/undoRedoStore';

import type { UseMutationOptions, UseMutationResult } from '../query/useMutation';

/**
 * Options for useUndoableMutation.
 *
 * Extends standard mutation options with snapshot/path/apply config
 * to automatically push undo transactions on success.
 */
export interface UseUndoableMutationOptions<TData, TError, TVariables> extends UseMutationOptions<
  TData,
  TError,
  TVariables
> {
  /** Capture current state before mutation (for computing undo operations) */
  getSnapshot: () => Record<string, unknown>;
  /** Path prefix for transaction operations (e.g., ['users', userId]) */
  path: string[];
  /** Apply a transaction (used for undo/redo reversal via the controller) */
  applyTransaction: (data: Record<string, unknown>) => void | Promise<void>;
}

/**
 * Wraps `useMutation` to automatically push undo transactions on success.
 *
 * On `onMutate`, captures a snapshot of current state via `getSnapshot`.
 * On `onSuccess`, compares old vs. new values and pushes a transaction
 * with `createSetOperation` entries for each changed key.
 *
 * The `applyTransaction` callback is stored for use by `useUndoRedoController`
 * to reverse mutations on undo/redo.
 *
 * @example
 * ```typescript
 * const mutation = useUndoableMutation({
 *   mutationFn: (data) => api.updateUser(userId, data),
 *   getSnapshot: () => ({ name: user.name, email: user.email }),
 *   path: ['users', userId],
 *   applyTransaction: (data) => api.updateUser(userId, data),
 * });
 * ```
 */
export function useUndoableMutation<TData, TError = Error, TVariables = void>(
  options: UseUndoableMutationOptions<TData, TError, TVariables>,
): UseMutationResult<TData, TError, TVariables> {
  const {
    getSnapshot,
    path,
    applyTransaction: _applyTransaction,
    onSuccess,
    ...mutationOptions
  } = options;
  const { push } = useUndoRedoStore();
  const snapshotRef = useRef<Record<string, unknown>>({});

  return useMutation({
    ...mutationOptions,
    onMutate: (variables) => {
      snapshotRef.current = getSnapshot();
      return mutationOptions.onMutate?.(variables);
    },
    onSuccess: (data, variables, context) => {
      const newValues =
        typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
      const oldValues = snapshotRef.current;

      const ops = Object.keys(newValues)
        .filter((key) => key in oldValues && oldValues[key] !== newValues[key])
        .map((key) => createSetOperation([...path, key], newValues[key], oldValues[key]));

      if (ops.length > 0) {
        push(createTransaction(ops));
      }

      void onSuccess?.(data, variables, context);
    },
  });
}
