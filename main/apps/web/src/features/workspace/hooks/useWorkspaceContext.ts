// main/apps/web/src/features/workspace/hooks/useWorkspaceContext.ts
/**
 * Workspace Context Hook
 *
 * Manages the current workspace selection in localStorage.
 */

import { useLocalStorageValue } from '@abe-stack/react/hooks';

// ============================================================================
// Constants
// ============================================================================

const WORKSPACE_KEY = 'currentWorkspaceId';

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
  const [currentWorkspaceId, setCurrentWorkspace] = useLocalStorageValue(WORKSPACE_KEY);

  return {
    currentWorkspaceId,
    setCurrentWorkspace,
  };
}
