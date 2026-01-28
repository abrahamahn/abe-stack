// packages/ui/src/hooks/usePanelConfig.test.ts
/** @vitest-environment jsdom */
import { usePanelConfig, type PanelConfig } from '@hooks/usePanelConfig';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TestPanelKeys = 'left' | 'right' | 'bottom';

const defaultConfig: PanelConfig<TestPanelKeys> = {
  left: { visible: true, size: 20 },
  right: { visible: true, size: 25 },
  bottom: { visible: false, size: 30 },
};

describe('usePanelConfig', () => {
  const storageKey = 'test-panel-config';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('returns default config when no stored value exists', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      expect(result.current.config).toEqual(defaultConfig);
    });

    it('returns stored config when it exists in localStorage', () => {
      const storedConfig: PanelConfig<TestPanelKeys> = {
        left: { visible: false, size: 15 },
        right: { visible: true, size: 30 },
        bottom: { visible: true, size: 40 },
      };
      localStorage.setItem(storageKey, JSON.stringify(storedConfig));

      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      expect(result.current.config).toEqual(storedConfig);
    });

    it('provides all expected methods', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      expect(typeof result.current.togglePane).toBe('function');
      expect(typeof result.current.resizePane).toBe('function');
      expect(typeof result.current.resetConfig).toBe('function');
      expect(typeof result.current.setConfig).toBe('function');
    });
  });

  describe('togglePane', () => {
    it('toggles panel visibility from visible to hidden', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      expect(result.current.config.left.visible).toBe(true);

      act(() => {
        result.current.togglePane('left');
      });

      expect(result.current.config.left.visible).toBe(false);
    });

    it('toggles panel visibility from hidden to visible', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      expect(result.current.config.bottom.visible).toBe(false);

      act(() => {
        result.current.togglePane('bottom');
      });

      expect(result.current.config.bottom.visible).toBe(true);
    });

    it('preserves size when toggling visibility', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      const originalSize = result.current.config.left.size;

      act(() => {
        result.current.togglePane('left');
      });

      expect(result.current.config.left.size).toBe(originalSize);
    });

    it('does not affect other panels', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.togglePane('left');
      });

      expect(result.current.config.right).toEqual(defaultConfig.right);
      expect(result.current.config.bottom).toEqual(defaultConfig.bottom);
    });

    it('persists toggle to localStorage', async () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.togglePane('left');
      });

      // localStorage write is deferred via queueMicrotask, so we need to wait
      await waitFor(() => {
        const stored = JSON.parse(
          localStorage.getItem(storageKey) ?? '{}',
        ) as PanelConfig<TestPanelKeys>;
        expect(stored.left.visible).toBe(false);
      });
    });

    it('can toggle multiple panels independently', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.togglePane('left');
      });
      act(() => {
        result.current.togglePane('right');
      });
      act(() => {
        result.current.togglePane('bottom');
      });

      expect(result.current.config.left.visible).toBe(false);
      expect(result.current.config.right.visible).toBe(false);
      expect(result.current.config.bottom.visible).toBe(true);
    });
  });

  describe('resizePane', () => {
    it('updates panel size', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.resizePane('left', 35);
      });

      expect(result.current.config.left.size).toBe(35);
    });

    it('preserves visibility when resizing', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      const originalVisibility = result.current.config.left.visible;

      act(() => {
        result.current.resizePane('left', 50);
      });

      expect(result.current.config.left.visible).toBe(originalVisibility);
    });

    it('does not affect other panels', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.resizePane('left', 50);
      });

      expect(result.current.config.right).toEqual(defaultConfig.right);
      expect(result.current.config.bottom).toEqual(defaultConfig.bottom);
    });

    it('persists resize to localStorage', async () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.resizePane('right', 45);
      });

      // localStorage write is deferred via queueMicrotask, so we need to wait
      await waitFor(() => {
        const stored = JSON.parse(
          localStorage.getItem(storageKey) ?? '{}',
        ) as PanelConfig<TestPanelKeys>;
        expect(stored.right.size).toBe(45);
      });
    });

    it('handles edge case sizes', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.resizePane('left', 0);
      });
      expect(result.current.config.left.size).toBe(0);

      act(() => {
        result.current.resizePane('left', 100);
      });
      expect(result.current.config.left.size).toBe(100);
    });

    it('handles decimal sizes', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.resizePane('left', 33.33);
      });

      expect(result.current.config.left.size).toBe(33.33);
    });
  });

  describe('resetConfig', () => {
    it('resets all panels to default config', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.togglePane('left');
        result.current.resizePane('right', 50);
        result.current.togglePane('bottom');
      });

      expect(result.current.config).not.toEqual(defaultConfig);

      act(() => {
        result.current.resetConfig();
      });

      expect(result.current.config).toEqual(defaultConfig);
    });

    it('persists reset to localStorage', async () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      act(() => {
        result.current.resizePane('left', 99);
        result.current.resetConfig();
      });

      // localStorage write is deferred via queueMicrotask, so we need to wait
      await waitFor(() => {
        const stored = JSON.parse(
          localStorage.getItem(storageKey) ?? '{}',
        ) as PanelConfig<TestPanelKeys>;
        expect(stored).toEqual(defaultConfig);
      });
    });
  });

  describe('setConfig', () => {
    it('replaces entire configuration', () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      const newConfig: PanelConfig<TestPanelKeys> = {
        left: { visible: false, size: 10 },
        right: { visible: false, size: 10 },
        bottom: { visible: true, size: 80 },
      };

      act(() => {
        result.current.setConfig(newConfig);
      });

      expect(result.current.config).toEqual(newConfig);
    });

    it('persists setConfig to localStorage', async () => {
      const { result } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      const newConfig: PanelConfig<TestPanelKeys> = {
        left: { visible: true, size: 55 },
        right: { visible: false, size: 15 },
        bottom: { visible: true, size: 30 },
      };

      act(() => {
        result.current.setConfig(newConfig);
      });

      // localStorage write is deferred via queueMicrotask, so we need to wait
      await waitFor(() => {
        const stored = JSON.parse(
          localStorage.getItem(storageKey) ?? '{}',
        ) as PanelConfig<TestPanelKeys>;
        expect(stored).toEqual(newConfig);
      });
    });
  });

  describe('storage isolation', () => {
    it('uses different storage keys independently', () => {
      const { result: result1 } = renderHook(() => usePanelConfig('key1', defaultConfig));
      const { result: result2 } = renderHook(() => usePanelConfig('key2', defaultConfig));

      act(() => {
        result1.current.togglePane('left');
      });

      expect(result1.current.config.left.visible).toBe(false);
      expect(result2.current.config.left.visible).toBe(true);
    });
  });

  describe('stability', () => {
    it('provides working functions after rerender', () => {
      const { result, rerender } = renderHook(() => usePanelConfig(storageKey, defaultConfig));

      rerender();

      // Functions should still work after rerender
      act(() => {
        result.current.togglePane('left');
      });
      expect(result.current.config.left.visible).toBe(false);

      act(() => {
        result.current.resizePane('right', 50);
      });
      expect(result.current.config.right.size).toBe(50);
    });
  });
});
