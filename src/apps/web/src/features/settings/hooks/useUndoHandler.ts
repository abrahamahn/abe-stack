// src/apps/web/src/features/settings/hooks/useUndoHandler.ts
/**
 * Centralized undo/redo transaction handler.
 *
 * Maps transaction operations back to API calls based on the operation path.
 * This is the handler that AppUndoRedo passes to useUndoRedoController.
 */

import { tokenStore } from '@abe-stack/shared';
import { useRef } from 'react';

import { createSettingsApi } from '../api';

import type { UndoRedoHandler } from '@abe-stack/react';
import type { SetOperation, Transaction } from '@abe-stack/shared';

// ============================================================================
// API Instance (lazy singleton)
// ============================================================================

let settingsApi: ReturnType<typeof createSettingsApi> | null = null;
const apiBaseUrl =
  typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

function getSettingsApi(): ReturnType<typeof createSettingsApi> {
  settingsApi ??= createSettingsApi({
    baseUrl: apiBaseUrl,
    getToken: (): string | null => tokenStore.get(),
  });
  return settingsApi;
}

// ============================================================================
// Operation Applier
// ============================================================================

/**
 * Apply a set operation by dispatching to the appropriate API endpoint.
 * Routes based on the first segment of the operation path.
 */
async function applySetOperation(op: SetOperation): Promise<void> {
  const [domain, , field] = op.path;

  if (domain === 'users' && field !== undefined) {
    const api = getSettingsApi();
    await api.updateProfile({ [field]: op.value });
  }
  // Future: workspace, preferences, etc.
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Creates a stable UndoRedoHandler that applies transactions via API calls.
 * Pass the returned handler to `useUndoRedoController`.
 */
export function useUndoHandler(): UndoRedoHandler {
  const handlerRef = useRef<UndoRedoHandler>({
    apply: async (tx: Transaction): Promise<void> => {
      for (const op of tx.operations) {
        if (op.type === 'set') {
          await applySetOperation(op);
        }
      }
    },
  });

  return handlerRef.current;
}
