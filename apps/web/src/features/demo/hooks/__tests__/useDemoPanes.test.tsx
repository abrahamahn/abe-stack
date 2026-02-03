import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDemoPanes } from '../useDemoPanes';

import type { DemoPaneConfig } from '@demo/types';

const defaultPaneConfig: DemoPaneConfig = {
  top: { visible: true, size: 6 },
  left: { visible: true, size: 18 },
  right: { visible: true, size: 25 },
  bottom: { visible: true, size: 8 },
};

// Create a mock function for useMediaQuery
const mockUseMediaQuery = vi.fn();

// Mock @abe-stack/ui
vi.mock('@abe-stack/ui', () => ({
  useLocalStorage: vi.fn((_key: string, defaultValue: unknown) => {
    // Use actual React.useState from the runtime
    const React = require('react');
    const [value, setValue] = React.useState(defaultValue);
    return [value, setValue];
  }),
  useMediaQuery: (query: string) => mockUseMediaQuery(query),
}));

describe('useDemoPanes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset useMediaQuery mock to return false (desktop) by default
    mockUseMediaQuery.mockReturnValue(false);
  });

  it('returns the current pane config', () => {
    const { result } = renderHook(() => useDemoPanes());
    expect(result.current.paneConfig).toEqual(defaultPaneConfig);
  });

  it('toggles pane visibility', () => {
    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.togglePane('left');
    });

    expect(result.current.paneConfig.left.visible).toBe(false);
    expect(result.current.paneConfig.left.size).toBe(18);
  });

  it('toggles pane back to visible', () => {
    const { result } = renderHook(() => useDemoPanes());

    // Toggle twice to get back to visible
    act(() => {
      result.current.togglePane('left');
      result.current.togglePane('left');
    });

    // Should be back to visible after toggling twice
    expect(result.current.paneConfig.left.visible).toBe(true);
  });

  it('handles pane resize', () => {
    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.handlePaneResize('left', 25);
    });

    expect(result.current.paneConfig.left.size).toBe(25);
    expect(result.current.paneConfig.left.visible).toBe(true);
  });

  it('resets layout to defaults on desktop', () => {
    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.togglePane('left');
      result.current.handlePaneResize('top', 10);
      result.current.resetLayout();
    });

    // After reset, should be back to defaults
    expect(result.current.paneConfig).toEqual(defaultPaneConfig);
  });

  it('provides resetLayout function', () => {
    const { result } = renderHook(() => useDemoPanes());

    // Verify resetLayout exists and can be called
    expect(result.current.resetLayout).toBeDefined();
    expect(typeof result.current.resetLayout).toBe('function');

    // Should not throw when called
    act(() => {
      result.current.resetLayout();
    });

    // Config should be valid after reset
    expect(result.current.paneConfig).toBeDefined();
    expect(result.current.paneConfig.top).toBeDefined();
    expect(result.current.paneConfig.left).toBeDefined();
    expect(result.current.paneConfig.right).toBeDefined();
    expect(result.current.paneConfig.bottom).toBeDefined();
  });

  it('toggles different panes independently', () => {
    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.togglePane('top');
    });

    expect(result.current.paneConfig.top.visible).toBe(false);
    expect(result.current.paneConfig.left.visible).toBe(true);
    expect(result.current.paneConfig.right.visible).toBe(true);
    expect(result.current.paneConfig.bottom.visible).toBe(true);
  });

  it('preserves size when toggling visibility', () => {
    const { result } = renderHook(() => useDemoPanes());

    const originalSize = result.current.paneConfig.left.size;

    act(() => {
      result.current.togglePane('left');
    });

    expect(result.current.paneConfig.left.size).toBe(originalSize);
    expect(result.current.paneConfig.left.visible).toBe(false);

    act(() => {
      result.current.togglePane('left');
    });

    expect(result.current.paneConfig.left.size).toBe(originalSize);
    expect(result.current.paneConfig.left.visible).toBe(true);
  });
});
