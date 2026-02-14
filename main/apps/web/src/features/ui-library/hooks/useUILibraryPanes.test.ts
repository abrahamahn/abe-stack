// main/apps/web/src/features/ui-library/hooks/useUILibraryPanes.test.ts
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useUILibraryPanes } from './useUILibraryPanes';

vi.mock('@abe-stack/ui', () => ({
  useLocalStorage: vi.fn((_key, defaultValue) => {
    const [value, setValue] = useState(defaultValue);
    return [value, setValue];
  }),
  useMediaQuery: vi.fn(() => false),
}));

describe('useUILibraryPanes', () => {
  it('should initialize with default pane config', () => {
    const { result } = renderHook(() => useUILibraryPanes());
    expect(result.current.paneConfig.top.visible).toBe(true);
    expect(result.current.paneConfig.left.visible).toBe(true);
  });

  it('should toggle pane visibility', () => {
    const { result } = renderHook(() => useUILibraryPanes());
    act(() => {
      result.current.togglePane('left');
    });
    expect(result.current.paneConfig.left.visible).toBe(false);
  });

  it('should resize pane', () => {
    const { result } = renderHook(() => useUILibraryPanes());
    act(() => {
      result.current.handlePaneResize('left', 30);
    });
    expect(result.current.paneConfig.left.size).toBe(30);
  });

  it('should reset layout', () => {
    const { result } = renderHook(() => useUILibraryPanes());
    act(() => {
      result.current.togglePane('left');
      result.current.resetLayout();
    });
    expect(result.current.paneConfig.left.visible).toBe(true);
  });
});
