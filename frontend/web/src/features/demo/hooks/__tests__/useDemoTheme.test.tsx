// apps/web/src/features/demo/hooks/__tests__/useDemoTheme.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDemoTheme } from '../useDemoTheme';

// Mock useLocalStorage
const mockSetThemeMode = vi.fn();
let mockThemeMode = 'system';

vi.mock('@ui', () => ({
  useLocalStorage: (_key: string, defaultValue: string): [string, typeof mockSetThemeMode] => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (mockThemeMode === undefined) mockThemeMode = defaultValue;
    return [mockThemeMode, mockSetThemeMode];
  },
}));

describe('useDemoTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThemeMode = 'system';
    document.documentElement.removeAttribute('data-theme');
  });

  it('returns the current theme mode', () => {
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.themeMode).toBe('system');
  });

  it('cycles from system to light', () => {
    mockThemeMode = 'system';
    const { result } = renderHook(() => useDemoTheme());

    act(() => {
      result.current.cycleTheme();
    });

    expect(mockSetThemeMode).toHaveBeenCalled();
    // Get the callback and verify it works correctly
    const callback = mockSetThemeMode.mock.calls[0]?.[0] as (prev: string) => string;
    expect(callback('system')).toBe('light');
  });

  it('cycles from light to dark', () => {
    mockThemeMode = 'light';
    const { result } = renderHook(() => useDemoTheme());

    act(() => {
      result.current.cycleTheme();
    });

    const callback = mockSetThemeMode.mock.calls[0]?.[0] as (prev: string) => string;
    expect(callback('light')).toBe('dark');
  });

  it('cycles from dark to system', () => {
    mockThemeMode = 'dark';
    const { result } = renderHook(() => useDemoTheme());

    act(() => {
      result.current.cycleTheme();
    });

    const callback = mockSetThemeMode.mock.calls[0]?.[0] as (prev: string) => string;
    expect(callback('dark')).toBe('system');
  });

  it('returns correct icon for system mode', () => {
    mockThemeMode = 'system';
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.getThemeIcon()).toBe('💻');
  });

  it('returns correct icon for light mode', () => {
    mockThemeMode = 'light';
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.getThemeIcon()).toBe('☀️');
  });

  it('returns correct icon for dark mode', () => {
    mockThemeMode = 'dark';
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.getThemeIcon()).toBe('🌙');
  });

  it('returns correct label for system mode', () => {
    mockThemeMode = 'system';
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.getThemeLabel()).toBe('System');
  });

  it('returns correct label for light mode', () => {
    mockThemeMode = 'light';
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.getThemeLabel()).toBe('Light');
  });

  it('returns correct label for dark mode', () => {
    mockThemeMode = 'dark';
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.getThemeLabel()).toBe('Dark');
  });

  it('sets data-theme attribute for light mode', () => {
    mockThemeMode = 'light';
    renderHook(() => useDemoTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('sets data-theme attribute for dark mode', () => {
    mockThemeMode = 'dark';
    renderHook(() => useDemoTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('removes data-theme attribute for system mode', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    mockThemeMode = 'system';
    renderHook(() => useDemoTheme());
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
