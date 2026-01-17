// apps/web/src/features/demo/hooks/__tests__/useLazyCatalog.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentCategory, ComponentDemo } from '@demo/types';

// Mock data
const mockElementComponents: ComponentDemo[] = [
  {
    id: 'button',
    name: 'Button',
    category: 'elements',
    description: 'A button component',
    variants: [],
  },
  {
    id: 'input',
    name: 'Input',
    category: 'elements',
    description: 'An input component',
    variants: [],
  },
];

const mockComponentComponents: ComponentDemo[] = [
  {
    id: 'card',
    name: 'Card',
    category: 'components',
    description: 'A card component',
    variants: [],
  },
];

const mockLayoutComponents: ComponentDemo[] = [
  {
    id: 'container',
    name: 'Container',
    category: 'layouts',
    description: 'A container layout',
    variants: [],
  },
];

// Mock state
let mockCache: Map<ComponentCategory, ComponentDemo[] | null>;
let mockLoadedCount: number;

const mockLoadCategory = vi.fn<[ComponentCategory], Promise<ComponentDemo[]>>();
const mockGetCachedCategory = vi.fn<[ComponentCategory], ComponentDemo[] | null>();
const mockGetLoadedComponentCount = vi.fn<[], number>();
const mockGetAvailableCategories = vi.fn<[], ComponentCategory[]>();

vi.mock('@catalog/lazyRegistry', () => ({
  loadCategory: (category: ComponentCategory): Promise<ComponentDemo[]> =>
    mockLoadCategory(category),
  getCachedCategory: (category: ComponentCategory): ComponentDemo[] | null =>
    mockGetCachedCategory(category),
  getLoadedComponentCount: (): number => mockGetLoadedComponentCount(),
  getAvailableCategories: (): ComponentCategory[] => mockGetAvailableCategories(),
}));

// Import after mock setup
const { useLazyCatalog } = await import('@demo/hooks/useLazyCatalog');

describe('useLazyCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock state
    mockCache = new Map();
    mockLoadedCount = 0;

    // Default mock implementations
    mockGetAvailableCategories.mockReturnValue(['elements', 'components', 'layouts']);

    mockGetCachedCategory.mockImplementation((category) => mockCache.get(category) ?? null);

    mockGetLoadedComponentCount.mockImplementation(() => mockLoadedCount);

    mockLoadCategory.mockImplementation(async (category) => {
      let components: ComponentDemo[] = [];
      if (category === 'elements') {
        components = mockElementComponents;
        mockLoadedCount += mockElementComponents.length;
      } else if (category === 'components') {
        components = mockComponentComponents;
        mockLoadedCount += mockComponentComponents.length;
      } else if (category === 'layouts') {
        components = mockLayoutComponents;
        mockLoadedCount += mockLayoutComponents.length;
      }
      mockCache.set(category, components);
      return components;
    });
  });

  afterEach(() => {
    mockCache.clear();
    mockLoadedCount = 0;
  });

  describe('initial state', () => {
    it('uses cached data if available on initial render', () => {
      // Pre-populate cache
      mockCache.set('elements', mockElementComponents);

      const { result } = renderHook(() => useLazyCatalog('elements'));

      expect(result.current.components).toEqual(mockElementComponents);
      expect(result.current.isLoading).toBe(false);
    });

    it('starts loading if no cached data', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for load to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.components).toEqual(mockElementComponents);
    });

    it('defaults to elements category when no initial category provided', async () => {
      const { result } = renderHook(() => useLazyCatalog());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeCategory).toBe('elements');
      expect(mockLoadCategory).toHaveBeenCalledWith('elements');
    });

    it('uses provided initial category', async () => {
      const { result } = renderHook(() => useLazyCatalog('components'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeCategory).toBe('components');
      expect(mockLoadCategory).toHaveBeenCalledWith('components');
    });
  });

  describe('categories', () => {
    it('returns available categories', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toEqual(['elements', 'components', 'layouts']);
    });
  });

  describe('setActiveCategory', () => {
    it('changes the active category', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setActiveCategory('components');
      });

      expect(result.current.activeCategory).toBe('components');
    });

    it('loads data for new category', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setActiveCategory('components');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.components).toEqual(mockComponentComponents);
    });

    it('does not reload if category is already active', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = mockLoadCategory.mock.calls.length;

      act(() => {
        result.current.setActiveCategory('elements');
      });

      // Should not trigger another load
      expect(mockLoadCategory).toHaveBeenCalledTimes(callCount);
    });

    it('uses cached data when switching back to previously loaded category', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Switch to components
      act(() => {
        result.current.setActiveCategory('components');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loadCallCount = mockLoadCategory.mock.calls.length;

      // Switch back to elements (should use cache)
      act(() => {
        result.current.setActiveCategory('elements');
      });

      // Cache is used, so components update immediately without new loadCategory call
      await waitFor(() => {
        expect(result.current.components).toEqual(mockElementComponents);
      });

      // loadCategory should not be called again for cached category
      expect(mockLoadCategory).toHaveBeenCalledTimes(loadCallCount);
    });
  });

  describe('error handling', () => {
    it('sets error when loading fails', async () => {
      const testError = new Error('Load failed');
      mockLoadCategory.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.components).toEqual([]);
    });

    it('converts non-Error exceptions to Error objects', async () => {
      mockLoadCategory.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('String error');
    });

    it('clears error when loading new category succeeds', async () => {
      const testError = new Error('Load failed');
      mockLoadCategory.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Reset mock to succeed
      mockLoadCategory.mockImplementation(async (category) => {
        const components =
          category === 'components' ? mockComponentComponents : mockElementComponents;
        mockCache.set(category, components);
        return components;
      });

      act(() => {
        result.current.setActiveCategory('components');
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('totalLoaded', () => {
    it('returns total loaded component count', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalLoaded).toBe(mockElementComponents.length);
    });

    it('updates count when new category is loaded', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.totalLoaded;

      act(() => {
        result.current.setActiveCategory('components');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalLoaded).toBe(initialCount + mockComponentComponents.length);
    });
  });

  describe('preload', () => {
    it('preloads category in background', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.preload('components');
      });

      // Wait for preload to complete
      await waitFor(() => {
        expect(mockLoadCategory).toHaveBeenCalledWith('components');
      });
    });

    it('does not preload already cached category', async () => {
      // Pre-populate cache
      mockCache.set('components', mockComponentComponents);

      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loadCallCount = mockLoadCategory.mock.calls.length;

      act(() => {
        result.current.preload('components');
      });

      // Should not trigger load for cached category
      expect(mockLoadCategory).toHaveBeenCalledTimes(loadCallCount);
    });

    it('updates totalLoaded after preload completes', async () => {
      const { result } = renderHook(() => useLazyCatalog('elements'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.totalLoaded;

      act(() => {
        result.current.preload('layouts');
      });

      await waitFor(() => {
        expect(result.current.totalLoaded).toBe(initialCount + mockLayoutComponents.length);
      });
    });
  });
});
