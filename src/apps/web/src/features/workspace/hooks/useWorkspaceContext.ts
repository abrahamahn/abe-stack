// src/apps/web/src/features/workspace/hooks/useWorkspaceContext.ts
/**
 * Workspace Context Hook
 *
 * Manages the current workspace selection in localStorage.
 */

import { useCallback, useSyncExternalStore } from 'react';

// ============================================================================
// Constants
// ============================================================================

const WORKSPACE_KEY = 'currentWorkspaceId';

// ============================================================================
// Store (module-level singleton)
// ============================================================================

const listeners = new Set<() => void>();

function getSnapshot(): string | null {
  return localStorage.getItem(WORKSPACE_KEY);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

// ============================================================================
// Types
// ============================================================================

export interface UseWorkspaceContextResult {
  currentWorkspaceId: string | null;
  setCurrentWorkspace: (id: string | null) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useWorkspaceContext(): UseWorkspaceContextResult {
  const currentWorkspaceId = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const setCurrentWorkspace = useCallback((id: string | null) => {
    if (id === null) {
      localStorage.removeItem(WORKSPACE_KEY);
    } else {
      localStorage.setItem(WORKSPACE_KEY, id);
    }
    notifyListeners();
  }, []);

  return {
    currentWorkspaceId,
    setCurrentWorkspace,
  };
}
