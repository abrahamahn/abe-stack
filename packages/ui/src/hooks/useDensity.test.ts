// packages/ui/src/hooks/useDensity.test.ts
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useDensity } from './useDensity';

import type { Density } from '@theme/density';

describe('useDensity', () => {
  const storageKey = 'test-ui-density';

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-density');
    // Clear any inline styles
    document.documentElement.style.cssText = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-density');
    document.documentElement.style.cssText = '';
  });

  describe('initialization', () => {
    it('defaults to normal density when no stored value exists', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      expect(result.current.density).toBe('normal');
    });

    it('returns stored density when it exists in localStorage', () => {
      localStorage.setItem(storageKey, JSON.stringify('compact'));

      const { result } = renderHook(() => useDensity(storageKey));

      expect(result.current.density).toBe('compact');
    });

    it('provides all expected properties and methods', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      expect(result.current).toHaveProperty('density');
      expect(result.current).toHaveProperty('setDensity');
      expect(result.current).toHaveProperty('cycleDensity');
      expect(result.current).toHaveProperty('isCompact');
      expect(result.current).toHaveProperty('isNormal');
      expect(result.current).toHaveProperty('isComfortable');
    });

    it('uses default storage key when not provided', () => {
      localStorage.setItem('ui-density', JSON.stringify('comfortable'));

      const { result } = renderHook(() => useDensity());

      expect(result.current.density).toBe('comfortable');
    });
  });

  describe('setDensity', () => {
    it('sets density to compact', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.setDensity('compact');
      });

      expect(result.current.density).toBe('compact');
    });

    it('sets density to normal', () => {
      localStorage.setItem(storageKey, JSON.stringify('compact'));
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.setDensity('normal');
      });

      expect(result.current.density).toBe('normal');
    });

    it('sets density to comfortable', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.setDensity('comfortable');
      });

      expect(result.current.density).toBe('comfortable');
    });

    it('persists density to localStorage', async () => {
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.setDensity('compact');
      });

      // localStorage write is deferred via queueMicrotask, so we need to wait
      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? '""') as string;
        expect(stored).toBe('compact');
      });
    });
  });

  describe('cycleDensity', () => {
    it('cycles from compact to normal', () => {
      localStorage.setItem(storageKey, JSON.stringify('compact'));
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.cycleDensity();
      });

      expect(result.current.density).toBe('normal');
    });

    it('cycles from normal to comfortable', () => {
      localStorage.setItem(storageKey, JSON.stringify('normal'));
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.cycleDensity();
      });

      expect(result.current.density).toBe('comfortable');
    });

    it('cycles from comfortable to compact', () => {
      localStorage.setItem(storageKey, JSON.stringify('comfortable'));
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.cycleDensity();
      });

      expect(result.current.density).toBe('compact');
    });

    it('completes full cycle: compact -> normal -> comfortable -> compact', () => {
      localStorage.setItem(storageKey, JSON.stringify('compact'));
      const { result } = renderHook(() => useDensity(storageKey));

      expect(result.current.density).toBe('compact');

      act(() => {
        result.current.cycleDensity();
      });
      expect(result.current.density).toBe('normal');

      act(() => {
        result.current.cycleDensity();
      });
      expect(result.current.density).toBe('comfortable');

      act(() => {
        result.current.cycleDensity();
      });
      expect(result.current.density).toBe('compact');
    });
  });

  describe('boolean flags', () => {
    it('isCompact is true only when density is compact', () => {
      localStorage.setItem(storageKey, JSON.stringify('compact'));
      const { result } = renderHook(() => useDensity(storageKey));

      expect(result.current.isCompact).toBe(true);
      expect(result.current.isNormal).toBe(false);
      expect(result.current.isComfortable).toBe(false);
    });

    it('isNormal is true only when density is normal', () => {
      localStorage.setItem(storageKey, JSON.stringify('normal'));
      const { result } = renderHook(() => useDensity(storageKey));

      expect(result.current.isCompact).toBe(false);
      expect(result.current.isNormal).toBe(true);
      expect(result.current.isComfortable).toBe(false);
    });

    it('isComfortable is true only when density is comfortable', () => {
      localStorage.setItem(storageKey, JSON.stringify('comfortable'));
      const { result } = renderHook(() => useDensity(storageKey));

      expect(result.current.isCompact).toBe(false);
      expect(result.current.isNormal).toBe(false);
      expect(result.current.isComfortable).toBe(true);
    });
  });

  describe('DOM attribute management', () => {
    it('sets data-density attribute when density changes', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.setDensity('compact');
      });

      expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    });

    it('updates data-density attribute when cycling', () => {
      localStorage.setItem(storageKey, JSON.stringify('compact'));
      const { result } = renderHook(() => useDensity(storageKey));

      expect(document.documentElement.getAttribute('data-density')).toBe('compact');

      act(() => {
        result.current.cycleDensity();
      });
      expect(document.documentElement.getAttribute('data-density')).toBe('normal');

      act(() => {
        result.current.cycleDensity();
      });
      expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');
    });
  });

  describe('CSS variable application', () => {
    it('applies CSS variables for compact density', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.setDensity('compact');
      });

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--ui-gap-lg')).toBe('0.75rem');
    });

    it('applies CSS variables for normal density', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.setDensity('normal');
      });

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--ui-gap-lg')).toBe('1rem');
    });

    it('applies CSS variables for comfortable density', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.setDensity('comfortable');
      });

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--ui-gap-lg')).toBe('1.25rem');
    });

    it('applies all spacing CSS variables', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      act(() => {
        result.current.setDensity('normal');
      });

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--ui-gap-xs')).toBe('0.25rem');
      expect(style.getPropertyValue('--ui-gap-sm')).toBe('0.5rem');
      expect(style.getPropertyValue('--ui-gap-md')).toBe('0.75rem');
      expect(style.getPropertyValue('--ui-gap-lg')).toBe('1rem');
      expect(style.getPropertyValue('--ui-gap-xl')).toBe('1.5rem');
      expect(style.getPropertyValue('--ui-gap-2xl')).toBe('2rem');
      expect(style.getPropertyValue('--ui-gap-3xl')).toBe('3rem');
    });
  });

  describe('storage isolation', () => {
    it('uses different storage keys independently', () => {
      const { result: result1 } = renderHook(() => useDensity('key1'));
      const { result: result2 } = renderHook(() => useDensity('key2'));

      act(() => {
        result1.current.setDensity('compact');
      });

      expect(result1.current.density).toBe('compact');
      expect(result2.current.density).toBe('normal');
    });
  });

  describe('edge cases', () => {
    it('handles invalid stored value gracefully', () => {
      localStorage.setItem(storageKey, 'invalid-json');

      // Should not throw
      expect(() => {
        renderHook(() => useDensity(storageKey));
      }).not.toThrow();
    });

    it('provides working functions after rerender', () => {
      const { result, rerender } = renderHook(() => useDensity(storageKey));

      rerender();

      // Functions should still work after rerender
      act(() => {
        result.current.setDensity('comfortable');
      });
      expect(result.current.density).toBe('comfortable');

      act(() => {
        result.current.cycleDensity();
      });
      expect(result.current.density).toBe('compact');
    });
  });

  describe('type safety', () => {
    it('density is correctly typed as Density', () => {
      const { result } = renderHook(() => useDensity(storageKey));

      const density: Density = result.current.density;
      expect(['compact', 'normal', 'comfortable']).toContain(density);
    });
  });
});
