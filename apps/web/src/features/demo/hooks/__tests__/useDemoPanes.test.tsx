// apps/web/src/features/demo/hooks/__tests__/useDemoPanes.test.tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDemoPanes } from '../useDemoPanes';

import type { DemoPaneConfig } from '@demo/types';

// Mock state
let mockPaneConfig: DemoPaneConfig;
let mockIsMobile = false;
const mockSetPaneConfig = vi.fn();

vi.mock('@abe-stack/ui', () => ({
  useLocalStorage: (
    _key: string,
    defaultValue: DemoPaneConfig,
  ): [DemoPaneConfig, typeof mockSetPaneConfig] => {
    if (!mockPaneConfig) mockPaneConfig = defaultValue;
    return [mockPaneConfig, mockSetPaneConfig];
  },
  useMediaQuery: (): boolean => mockIsMobile,
}));

describe('useDemoPanes', () => {
  const defaultPaneConfig: DemoPaneConfig = {
    top: { visible: true, size: 6 },
    left: { visible: true, size: 18 },
    right: { visible: true, size: 25 },
    bottom: { visible: true, size: 8 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPaneConfig = { ...defaultPaneConfig };
    mockIsMobile = false;
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

    expect(mockSetPaneConfig).toHaveBeenCalled();
    const callback = mockSetPaneConfig.mock.calls[0]?.[0] as (
      prev: DemoPaneConfig,
    ) => DemoPaneConfig;
    const newConfig = callback(defaultPaneConfig);
    expect(newConfig.left.visible).toBe(false);
  });

  it('toggles pane back to visible', () => {
    mockPaneConfig = {
      ...defaultPaneConfig,
      left: { visible: false, size: 18 },
    };

    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.togglePane('left');
    });

    const callback = mockSetPaneConfig.mock.calls[0]?.[0] as (
      prev: DemoPaneConfig,
    ) => DemoPaneConfig;
    const newConfig = callback(mockPaneConfig);
    expect(newConfig.left.visible).toBe(true);
  });

  it('handles pane resize', () => {
    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.handlePaneResize('left', 25);
    });

    expect(mockSetPaneConfig).toHaveBeenCalled();
    const callback = mockSetPaneConfig.mock.calls[0]?.[0] as (
      prev: DemoPaneConfig,
    ) => DemoPaneConfig;
    const newConfig = callback(defaultPaneConfig);
    expect(newConfig.left.size).toBe(25);
  });

  it('resets layout to defaults on desktop', () => {
    mockIsMobile = false;
    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.resetLayout();
    });

    expect(mockSetPaneConfig).toHaveBeenCalledWith(defaultPaneConfig);
  });

  it('resets layout to mobile defaults on mobile', () => {
    mockIsMobile = true;
    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.resetLayout();
    });

    // Mobile config has left and right hidden
    expect(mockSetPaneConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        left: expect.objectContaining({ visible: false }) as Record<string, unknown>,
        right: expect.objectContaining({ visible: false }) as Record<string, unknown>,
      }),
    );
  });

  it('toggles different panes independently', () => {
    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.togglePane('top');
    });

    const callback = mockSetPaneConfig.mock.calls[0]?.[0] as (
      prev: DemoPaneConfig,
    ) => DemoPaneConfig;
    const newConfig = callback(defaultPaneConfig);
    expect(newConfig.top.visible).toBe(false);
    expect(newConfig.left.visible).toBe(true);
    expect(newConfig.right.visible).toBe(true);
    expect(newConfig.bottom.visible).toBe(true);
  });

  it('preserves size when toggling visibility', () => {
    const { result } = renderHook(() => useDemoPanes());

    act(() => {
      result.current.togglePane('left');
    });

    const callback = mockSetPaneConfig.mock.calls[0]?.[0] as (
      prev: DemoPaneConfig,
    ) => DemoPaneConfig;
    const newConfig = callback(defaultPaneConfig);
    expect(newConfig.left.size).toBe(18);
  });
});
