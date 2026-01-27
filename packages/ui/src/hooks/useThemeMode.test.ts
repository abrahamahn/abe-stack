// packages/ui/src/hooks/__tests__/useThemeMode.test.ts
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeMode, type ThemeMode } from '../useThemeMode';

describe('useThemeMode', () => {
  const storageKey = 'test-theme-mode';
  let matchMediaMock: ReturnType<typeof vi.fn>;

  const createMatchMediaMock = (matches: boolean): MediaQueryList =>
    ({
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    matchMediaMock = vi.fn().mockImplementation(() => createMatchMediaMock(false));
    window.matchMedia = matchMediaMock as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('defaults to system mode when no stored value exists', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.mode).toBe('system');
    });

    it('returns stored mode when it exists in localStorage', () => {
      localStorage.setItem(storageKey, JSON.stringify('dark'));

      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.mode).toBe('dark');
    });

    it('provides all expected properties and methods', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current).toHaveProperty('mode');
      expect(result.current).toHaveProperty('setMode');
      expect(result.current).toHaveProperty('cycleMode');
      expect(result.current).toHaveProperty('isDark');
      expect(result.current).toHaveProperty('isLight');
      expect(result.current).toHaveProperty('resolvedTheme');
    });

    it('uses default storage key when not provided', () => {
      localStorage.setItem('theme-mode', JSON.stringify('light'));

      const { result } = renderHook(() => useThemeMode());

      expect(result.current.mode).toBe('light');
    });
  });

  describe('setMode', () => {
    it('sets mode to light', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      act(() => {
        result.current.setMode('light');
      });

      expect(result.current.mode).toBe('light');
    });

    it('sets mode to dark', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      act(() => {
        result.current.setMode('dark');
      });

      expect(result.current.mode).toBe('dark');
    });

    it('sets mode to system', () => {
      localStorage.setItem(storageKey, JSON.stringify('dark'));
      const { result } = renderHook(() => useThemeMode(storageKey));

      act(() => {
        result.current.setMode('system');
      });

      expect(result.current.mode).toBe('system');
    });

    it('persists mode to localStorage', async () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      act(() => {
        result.current.setMode('dark');
      });

      // localStorage write is deferred via queueMicrotask, so we need to wait
      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? '""') as string;
        expect(stored).toBe('dark');
      });
    });
  });

  describe('cycleMode', () => {
    it('cycles from system to light', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.mode).toBe('system');

      act(() => {
        result.current.cycleMode();
      });

      expect(result.current.mode).toBe('light');
    });

    it('cycles from light to dark', () => {
      localStorage.setItem(storageKey, JSON.stringify('light'));
      const { result } = renderHook(() => useThemeMode(storageKey));

      act(() => {
        result.current.cycleMode();
      });

      expect(result.current.mode).toBe('dark');
    });

    it('cycles from dark to system', () => {
      localStorage.setItem(storageKey, JSON.stringify('dark'));
      const { result } = renderHook(() => useThemeMode(storageKey));

      act(() => {
        result.current.cycleMode();
      });

      expect(result.current.mode).toBe('system');
    });

    it('completes full cycle: system -> light -> dark -> system', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.mode).toBe('system');

      act(() => {
        result.current.cycleMode();
      });
      expect(result.current.mode).toBe('light');

      act(() => {
        result.current.cycleMode();
      });
      expect(result.current.mode).toBe('dark');

      act(() => {
        result.current.cycleMode();
      });
      expect(result.current.mode).toBe('system');
    });
  });

  describe('resolvedTheme', () => {
    it('resolves to light when mode is light', () => {
      localStorage.setItem(storageKey, JSON.stringify('light'));
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.resolvedTheme).toBe('light');
    });

    it('resolves to dark when mode is dark', () => {
      localStorage.setItem(storageKey, JSON.stringify('dark'));
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('resolves to light when mode is system and prefers-color-scheme is light', () => {
      matchMediaMock.mockImplementation(() => createMatchMediaMock(false));
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.mode).toBe('system');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('resolves to dark when mode is system and prefers-color-scheme is dark', () => {
      matchMediaMock.mockImplementation(() => createMatchMediaMock(true));
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.mode).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark');
    });
  });

  describe('isDark and isLight', () => {
    it('isDark is true and isLight is false when resolved theme is dark', () => {
      localStorage.setItem(storageKey, JSON.stringify('dark'));
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.isDark).toBe(true);
      expect(result.current.isLight).toBe(false);
    });

    it('isDark is false and isLight is true when resolved theme is light', () => {
      localStorage.setItem(storageKey, JSON.stringify('light'));
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.isDark).toBe(false);
      expect(result.current.isLight).toBe(true);
    });

    it('reflects system preference when mode is system', () => {
      matchMediaMock.mockImplementation(() => createMatchMediaMock(true));
      const { result } = renderHook(() => useThemeMode(storageKey));

      expect(result.current.mode).toBe('system');
      expect(result.current.isDark).toBe(true);
      expect(result.current.isLight).toBe(false);
    });
  });

  describe('DOM attribute management', () => {
    it('sets data-theme="light" when mode is light', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      act(() => {
        result.current.setMode('light');
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('sets data-theme="dark" when mode is dark', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      act(() => {
        result.current.setMode('dark');
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('removes data-theme attribute when mode is system', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      act(() => {
        result.current.setMode('light');
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      act(() => {
        result.current.setMode('system');
      });
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });

    it('updates DOM attribute when cycling modes', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      // system -> light
      act(() => {
        result.current.cycleMode();
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      // light -> dark
      act(() => {
        result.current.cycleMode();
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // dark -> system
      act(() => {
        result.current.cycleMode();
      });
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });

  describe('storage isolation', () => {
    it('uses different storage keys independently', () => {
      const { result: result1 } = renderHook(() => useThemeMode('key1'));
      const { result: result2 } = renderHook(() => useThemeMode('key2'));

      act(() => {
        result1.current.setMode('dark');
      });

      expect(result1.current.mode).toBe('dark');
      expect(result2.current.mode).toBe('system');
    });
  });

  describe('edge cases', () => {
    it('handles invalid stored value gracefully', () => {
      localStorage.setItem(storageKey, 'invalid-json');

      // Should not throw
      expect(() => {
        renderHook(() => useThemeMode(storageKey));
      }).not.toThrow();
    });

    it('provides working functions after rerender', () => {
      const { result, rerender } = renderHook(() => useThemeMode(storageKey));

      rerender();

      // Functions should still work after rerender
      act(() => {
        result.current.setMode('dark');
      });
      expect(result.current.mode).toBe('dark');

      act(() => {
        result.current.cycleMode();
      });
      expect(result.current.mode).toBe('system');
    });
  });

  describe('type safety', () => {
    it('mode is correctly typed as ThemeMode', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      const mode: ThemeMode = result.current.mode;
      expect(['system', 'light', 'dark']).toContain(mode);
    });

    it('resolvedTheme is correctly typed as light or dark', () => {
      const { result } = renderHook(() => useThemeMode(storageKey));

      const resolved: 'light' | 'dark' = result.current.resolvedTheme;
      expect(['light', 'dark']).toContain(resolved);
    });
  });
});
