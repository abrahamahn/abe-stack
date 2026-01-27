// apps/web/src/features/demo/hooks/useDemoPanes.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDemoPanes } from './useDemoPanes';

vi.mock('@abe-stack/ui', () => ({
  useLocalStorage: vi.fn((key, defaultValue) => {
    const [value, setValue] = require('react').useState(defaultValue);
    return [value, setValue];
  }),
  useMediaQuery: vi.fn(() => false),
}));

describe('useDemoPanes', () => {
  it('should initialize with default pane config', () => {
    const { result } = renderHook(() => useDemoPanes());
    expect(result.current.paneConfig.top.visible).toBe(true);
    expect(result.current.paneConfig.left.visible).toBe(true);
  });

  it('should toggle pane visibility', () => {
    const { result } = renderHook(() => useDemoPanes());
    act(() => {
      result.current.togglePane('left');
    });
    expect(result.current.paneConfig.left.visible).toBe(false);
  });

  it('should resize pane', () => {
    const { result } = renderHook(() => useDemoPanes());
    act(() => {
      result.current.handlePaneResize('left', 30);
    });
    expect(result.current.paneConfig.left.size).toBe(30);
  });

  it('should reset layout', () => {
    const { result } = renderHook(() => useDemoPanes());
    act(() => {
      result.current.togglePane('left');
      result.current.resetLayout();
    });
    expect(result.current.paneConfig.left.visible).toBe(true);
  });
});
