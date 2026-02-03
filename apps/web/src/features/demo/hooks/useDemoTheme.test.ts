// apps/web/src/features/demo/hooks/useDemoTheme.test.ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDemoTheme } from './useDemoTheme';

vi.mock('@abe-stack/ui', () => ({
  useThemeMode: vi.fn(() => ({
    mode: 'light',
    cycleMode: vi.fn(),
    resolvedTheme: 'light',
  })),
}));

import { useThemeMode } from '@abe-stack/ui';

describe('useDemoTheme', () => {
  it('should return light theme icon', () => {
    vi.mocked(useThemeMode).mockReturnValue({
      mode: 'light',
      cycleMode: vi.fn(),
      resolvedTheme: 'light',
    } as any);
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.getThemeIcon()).toBe('☀️');
    expect(result.current.getThemeLabel()).toBe('Light');
  });

  it('should return dark theme icon', () => {
    vi.mocked(useThemeMode).mockReturnValue({
      mode: 'dark',
      cycleMode: vi.fn(),
      resolvedTheme: 'dark',
    } as any);
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.getThemeIcon()).toBe('🌙');
    expect(result.current.getThemeLabel()).toBe('Dark');
  });

  it('should return system theme icon', () => {
    vi.mocked(useThemeMode).mockReturnValue({
      mode: 'system',
      cycleMode: vi.fn(),
      resolvedTheme: 'light',
    } as any);
    const { result } = renderHook(() => useDemoTheme());
    expect(result.current.getThemeIcon()).toBe('💻');
    expect(result.current.getThemeLabel()).toBe('System');
  });
});
