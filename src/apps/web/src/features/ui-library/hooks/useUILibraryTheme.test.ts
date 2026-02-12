// src/apps/web/src/features/ui-library/hooks/useUILibraryTheme.test.ts
import { useThemeMode } from '@abe-stack/react/hooks';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useUILibraryTheme } from './useUILibraryTheme';

vi.mock('@abe-stack/react/hooks', () => ({
  useThemeMode: vi.fn(() => ({
    mode: 'light',
    cycleMode: vi.fn(),
    resolvedTheme: 'light',
  })),
}));

describe('useUILibraryTheme', () => {
  it('should return light theme icon', () => {
    vi.mocked(useThemeMode).mockReturnValue({
      mode: 'light',
      cycleMode: vi.fn(),
      resolvedTheme: 'light',
    } as any);
    const { result } = renderHook(() => useUILibraryTheme());
    expect(result.current.getThemeIcon()).toBe('☀️');
    expect(result.current.getThemeLabel()).toBe('Light');
  });

  it('should return dark theme icon', () => {
    vi.mocked(useThemeMode).mockReturnValue({
      mode: 'dark',
      cycleMode: vi.fn(),
      resolvedTheme: 'dark',
    } as any);
    const { result } = renderHook(() => useUILibraryTheme());
    expect(result.current.getThemeIcon()).toBe('🌙');
    expect(result.current.getThemeLabel()).toBe('Dark');
  });

  it('should return system theme icon', () => {
    vi.mocked(useThemeMode).mockReturnValue({
      mode: 'system',
      cycleMode: vi.fn(),
      resolvedTheme: 'light',
    } as any);
    const { result } = renderHook(() => useUILibraryTheme());
    expect(result.current.getThemeIcon()).toBe('💻');
    expect(result.current.getThemeLabel()).toBe('System');
  });
});
