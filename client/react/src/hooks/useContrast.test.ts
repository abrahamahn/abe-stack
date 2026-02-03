// client/ui/src/hooks/useContrast.test.ts
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useContrast } from './useContrast';

import type { ContrastMode } from '@theme/contrast';

describe('useContrast', () => {
  const storageKey = 'test-ui-contrast';
  let matchMediaMock: ReturnType<typeof vi.fn>;

  const createMatchMediaMock = (matches: boolean): MediaQueryList =>
    ({
      matches,
      media: '(prefers-contrast: more)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-contrast');
    document.documentElement.style.cssText = '';
    matchMediaMock = vi.fn().mockImplementation(() => createMatchMediaMock(false));
    window.matchMedia = matchMediaMock as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-contrast');
    document.documentElement.style.cssText = '';
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('defaults to system mode when no stored value exists', () => {
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.contrastMode).toBe('system');
    });

    it('returns stored mode when it exists in localStorage', () => {
      localStorage.setItem(storageKey, JSON.stringify('high'));

      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.contrastMode).toBe('high');
    });

    it('provides all expected properties and methods', () => {
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current).toHaveProperty('contrastMode');
      expect(result.current).toHaveProperty('setContrastMode');
      expect(result.current).toHaveProperty('cycleContrastMode');
      expect(result.current).toHaveProperty('isHighContrast');
      expect(result.current).toHaveProperty('prefersHighContrast');
    });

    it('uses default storage key when not provided', () => {
      localStorage.setItem('ui-contrast', JSON.stringify('high'));

      const { result } = renderHook(() => useContrast());

      expect(result.current.contrastMode).toBe('high');
    });
  });

  describe('setContrastMode', () => {
    it('sets mode to normal', () => {
      const { result } = renderHook(() => useContrast(storageKey));

      act(() => {
        result.current.setContrastMode('normal');
      });

      expect(result.current.contrastMode).toBe('normal');
    });

    it('sets mode to high', () => {
      const { result } = renderHook(() => useContrast(storageKey));

      act(() => {
        result.current.setContrastMode('high');
      });

      expect(result.current.contrastMode).toBe('high');
    });

    it('sets mode to system', () => {
      localStorage.setItem(storageKey, JSON.stringify('high'));
      const { result } = renderHook(() => useContrast(storageKey));

      act(() => {
        result.current.setContrastMode('system');
      });

      expect(result.current.contrastMode).toBe('system');
    });

    it('persists mode to localStorage', async () => {
      const { result } = renderHook(() => useContrast(storageKey));

      act(() => {
        result.current.setContrastMode('high');
      });

      // localStorage write is deferred via queueMicrotask, so we need to wait
      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? '""') as string;
        expect(stored).toBe('high');
      });
    });
  });

  describe('cycleContrastMode', () => {
    it('cycles from system to normal', () => {
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.contrastMode).toBe('system');

      act(() => {
        result.current.cycleContrastMode();
      });

      expect(result.current.contrastMode).toBe('normal');
    });

    it('cycles from normal to high', () => {
      localStorage.setItem(storageKey, JSON.stringify('normal'));
      const { result } = renderHook(() => useContrast(storageKey));

      act(() => {
        result.current.cycleContrastMode();
      });

      expect(result.current.contrastMode).toBe('high');
    });

    it('cycles from high to system', () => {
      localStorage.setItem(storageKey, JSON.stringify('high'));
      const { result } = renderHook(() => useContrast(storageKey));

      act(() => {
        result.current.cycleContrastMode();
      });

      expect(result.current.contrastMode).toBe('system');
    });

    it('completes full cycle: system -> normal -> high -> system', () => {
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.contrastMode).toBe('system');

      act(() => {
        result.current.cycleContrastMode();
      });
      expect(result.current.contrastMode).toBe('normal');

      act(() => {
        result.current.cycleContrastMode();
      });
      expect(result.current.contrastMode).toBe('high');

      act(() => {
        result.current.cycleContrastMode();
      });
      expect(result.current.contrastMode).toBe('system');
    });
  });

  describe('isHighContrast', () => {
    it('is true when mode is "high"', () => {
      localStorage.setItem(storageKey, JSON.stringify('high'));
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.isHighContrast).toBe(true);
    });

    it('is false when mode is "normal"', () => {
      localStorage.setItem(storageKey, JSON.stringify('normal'));
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.isHighContrast).toBe(false);
    });

    it('is true when mode is "system" and system prefers high contrast', () => {
      matchMediaMock.mockImplementation(() => createMatchMediaMock(true));
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.contrastMode).toBe('system');
      expect(result.current.isHighContrast).toBe(true);
    });

    it('is false when mode is "system" and system does not prefer high contrast', () => {
      matchMediaMock.mockImplementation(() => createMatchMediaMock(false));
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.contrastMode).toBe('system');
      expect(result.current.isHighContrast).toBe(false);
    });
  });

  describe('prefersHighContrast', () => {
    it('reflects system preference for high contrast', () => {
      matchMediaMock.mockImplementation(() => createMatchMediaMock(true));
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.prefersHighContrast).toBe(true);
    });

    it('reflects system preference for normal contrast', () => {
      matchMediaMock.mockImplementation(() => createMatchMediaMock(false));
      const { result } = renderHook(() => useContrast(storageKey));

      expect(result.current.prefersHighContrast).toBe(false);
    });
  });

  describe('DOM attribute management', () => {
    it('sets data-contrast attribute when mode changes', () => {
      const { result } = renderHook(() => useContrast(storageKey));

      act(() => {
        result.current.setContrastMode('high');
      });

      expect(document.documentElement.getAttribute('data-contrast')).toBe('high');
    });

    it('updates data-contrast attribute when cycling', () => {
      const { result } = renderHook(() => useContrast(storageKey));

      expect(document.documentElement.getAttribute('data-contrast')).toBe('system');

      act(() => {
        result.current.cycleContrastMode();
      });
      expect(document.documentElement.getAttribute('data-contrast')).toBe('normal');

      act(() => {
        result.current.cycleContrastMode();
      });
      expect(document.documentElement.getAttribute('data-contrast')).toBe('high');
    });
  });

  describe('CSS variable application', () => {
    it('applies CSS variables when high contrast is active (light theme)', () => {
      const { result } = renderHook(() => useContrast(storageKey, 'light'));

      act(() => {
        result.current.setContrastMode('high');
      });

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--ui-color-text')).toBe('#000000');
      expect(style.getPropertyValue('--ui-color-bg')).toBe('#ffffff');
    });

    it('applies CSS variables when high contrast is active (dark theme)', () => {
      const { result } = renderHook(() => useContrast(storageKey, 'dark'));

      act(() => {
        result.current.setContrastMode('high');
      });

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--ui-color-text')).toBe('#ffffff');
      expect(style.getPropertyValue('--ui-color-bg')).toBe('#000000');
    });

    it('does not apply CSS variables when mode is normal', () => {
      const { result } = renderHook(() => useContrast(storageKey, 'light'));

      act(() => {
        result.current.setContrastMode('normal');
      });

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--ui-color-text')).toBe('');
    });
  });

  describe('storage isolation', () => {
    it('uses different storage keys independently', () => {
      const { result: result1 } = renderHook(() => useContrast('key1'));
      const { result: result2 } = renderHook(() => useContrast('key2'));

      act(() => {
        result1.current.setContrastMode('high');
      });

      expect(result1.current.contrastMode).toBe('high');
      expect(result2.current.contrastMode).toBe('system');
    });
  });

  describe('edge cases', () => {
    it('handles invalid stored value gracefully', () => {
      localStorage.setItem(storageKey, 'invalid-json');

      expect(() => {
        renderHook(() => useContrast(storageKey));
      }).not.toThrow();
    });

    it('provides working functions after rerender', () => {
      const { result, rerender } = renderHook(() => useContrast(storageKey));

      rerender();

      act(() => {
        result.current.setContrastMode('high');
      });
      expect(result.current.contrastMode).toBe('high');

      act(() => {
        result.current.cycleContrastMode();
      });
      expect(result.current.contrastMode).toBe('system');
    });
  });

  describe('type safety', () => {
    it('contrastMode is correctly typed as ContrastMode', () => {
      const { result } = renderHook(() => useContrast(storageKey));

      const mode: ContrastMode = result.current.contrastMode;
      expect(['system', 'normal', 'high']).toContain(mode);
    });
  });
});
