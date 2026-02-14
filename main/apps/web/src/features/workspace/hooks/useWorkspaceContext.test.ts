// main/apps/web/src/features/workspace/hooks/useWorkspaceContext.test.ts
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, beforeEach, afterEach } from 'vitest';

import { useWorkspaceContext } from './useWorkspaceContext';

describe('useWorkspaceContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads workspace id from localStorage', () => {
    localStorage.setItem('currentWorkspaceId', 'workspace-a');
    const { result } = renderHook(() => useWorkspaceContext());
    expect(result.current.currentWorkspaceId).toBe('workspace-a');
  });

  it('updates and removes workspace id', () => {
    const { result } = renderHook(() => useWorkspaceContext());

    act(() => {
      result.current.setCurrentWorkspace('workspace-b');
    });
    expect(result.current.currentWorkspaceId).toBe('workspace-b');
    expect(localStorage.getItem('currentWorkspaceId')).toBe('workspace-b');

    act(() => {
      result.current.setCurrentWorkspace(null);
    });
    expect(result.current.currentWorkspaceId).toBeNull();
    expect(localStorage.getItem('currentWorkspaceId')).toBeNull();
  });
});
