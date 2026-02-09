// src/client/react/src/router/hooks.test.tsx
/**
 * Tests for custom router hooks.
 *
 * Tests useNavigate, useLocation, and useSearchParams hooks.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MemoryRouter } from './context';
import { useLocation, useNavigate, useSearchParams } from './hooks';

import type { ReactElement, ReactNode } from 'react';

function createWrapper(initialPath = '/'): (props: { children: ReactNode }) => ReactElement {
  return ({ children }: { children: ReactNode }): ReactElement => (
    <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
  );
}

describe('useNavigate', () => {
  it('should return navigate function', () => {
    const { result } = renderHook(() => useNavigate(), { wrapper: createWrapper('/') });

    expect(typeof result.current).toBe('function');
  });

  it('should navigate to new path', async () => {
    const { result } = renderHook(
      () => ({
        navigate: useNavigate(),
        location: useLocation(),
      }),
      { wrapper: createWrapper('/') },
    );

    result.current.navigate('/about');

    await waitFor(() => {
      expect(result.current.location.pathname).toBe('/about');
    });
  });

  it('should navigate with replace option', async () => {
    const { result } = renderHook(
      () => ({
        navigate: useNavigate(),
        location: useLocation(),
      }),
      { wrapper: createWrapper('/') },
    );

    result.current.navigate('/about', { replace: true });

    await waitFor(() => {
      expect(result.current.location.pathname).toBe('/about');
    });
  });

  it('should navigate with state', async () => {
    const { result } = renderHook(
      () => ({
        navigate: useNavigate(),
        location: useLocation(),
      }),
      { wrapper: createWrapper('/') },
    );

    result.current.navigate('/about', { state: { from: 'home' } });

    await waitFor(() => {
      expect(result.current.location.state).toEqual({ from: 'home' });
    });
  });

  it('should navigate with number (go back/forward)', async () => {
    const { result } = renderHook(
      () => ({
        navigate: useNavigate(),
        location: useLocation(),
      }),
      { wrapper: createWrapper('/') },
    );

    result.current.navigate('/page1');
    result.current.navigate('/page2');
    result.current.navigate(-1);

    await waitFor(() => {
      expect(result.current.location.pathname).toBe('/page1');
    });
  });

  it('should prepend slash if missing', async () => {
    const { result } = renderHook(
      () => ({
        navigate: useNavigate(),
        location: useLocation(),
      }),
      { wrapper: createWrapper('/') },
    );

    result.current.navigate('about');

    await waitFor(() => {
      expect(result.current.location.pathname).toBe('/about');
    });
  });
});

describe('useLocation', () => {
  it('should return current location', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: createWrapper('/about'),
    });

    expect(result.current.pathname).toBe('/about');
  });

  it('should return location with search params', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: createWrapper('/search?q=test'),
    });

    expect(result.current.pathname).toBe('/search');
    expect(result.current.search).toBe('?q=test');
  });

  it('should return location with hash', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: createWrapper('/docs#section'),
    });

    expect(result.current.pathname).toBe('/docs');
    expect(result.current.hash).toBe('#section');
  });

  it('should return location state', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: createWrapper('/about'),
    });

    expect(result.current.state).toBeDefined();
  });

  it('should have location key', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: createWrapper('/'),
    });

    expect(typeof result.current.key).toBe('string');
    expect(result.current.key.length).toBeGreaterThan(0);
  });
});

describe('useSearchParams', () => {
  describe('reading search params', () => {
    it('should return current search params', () => {
      const { result } = renderHook(() => useSearchParams(), {
        wrapper: createWrapper('/?tab=settings'),
      });

      const [searchParams] = result.current;
      expect(searchParams.get('tab')).toBe('settings');
    });

    it('should return empty params for root path', () => {
      const { result } = renderHook(() => useSearchParams(), {
        wrapper: createWrapper('/'),
      });

      const [searchParams] = result.current;
      expect(searchParams.toString()).toBe('');
    });

    it('should handle multiple params', () => {
      const { result } = renderHook(() => useSearchParams(), {
        wrapper: createWrapper('/?tab=settings&sort=date&filter=active'),
      });

      const [searchParams] = result.current;
      expect(searchParams.get('tab')).toBe('settings');
      expect(searchParams.get('sort')).toBe('date');
      expect(searchParams.get('filter')).toBe('active');
    });

    it('should return null for non-existent params', () => {
      const { result } = renderHook(() => useSearchParams(), {
        wrapper: createWrapper('/?tab=settings'),
      });

      const [searchParams] = result.current;
      expect(searchParams.get('nonexistent')).toBeNull();
    });
  });

  describe('updating search params', () => {
    it('should set search params from object', async () => {
      const { result } = renderHook(
        () => ({
          searchParams: useSearchParams(),
          location: useLocation(),
        }),
        { wrapper: createWrapper('/') },
      );

      const [, setSearchParams] = result.current.searchParams;
      setSearchParams({ tab: 'settings' });

      await waitFor(() => {
        expect(result.current.location.search).toBe('?tab=settings');
      });
    });

    it('should set search params from URLSearchParams', async () => {
      const { result } = renderHook(
        () => ({
          searchParams: useSearchParams(),
          location: useLocation(),
        }),
        { wrapper: createWrapper('/') },
      );

      const [, setSearchParams] = result.current.searchParams;
      const params = new URLSearchParams({ tab: 'profile' });
      setSearchParams(params);

      await waitFor(() => {
        expect(result.current.location.search).toBe('?tab=profile');
      });
    });

    it('should set search params from function', async () => {
      const { result } = renderHook(
        () => ({
          searchParams: useSearchParams(),
          location: useLocation(),
        }),
        { wrapper: createWrapper('/?tab=settings') },
      );

      const [, setSearchParams] = result.current.searchParams;
      setSearchParams((prev) => {
        prev.set('sort', 'date');
        return prev;
      });

      await waitFor(() => {
        expect(result.current.location.search).toContain('tab=settings');
        expect(result.current.location.search).toContain('sort=date');
      });
    });

    it('should use replace option', async () => {
      const { result } = renderHook(
        () => ({
          searchParams: useSearchParams(),
          location: useLocation(),
        }),
        { wrapper: createWrapper('/') },
      );

      const [, setSearchParams] = result.current.searchParams;
      setSearchParams({ tab: 'settings' }, { replace: true });

      await waitFor(() => {
        expect(result.current.location.search).toBe('?tab=settings');
      });
    });

    it('should preserve pathname when setting params', async () => {
      const { result } = renderHook(
        () => ({
          searchParams: useSearchParams(),
          location: useLocation(),
        }),
        { wrapper: createWrapper('/about') },
      );

      const [, setSearchParams] = result.current.searchParams;
      setSearchParams({ tab: 'info' });

      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/about');
        expect(result.current.location.search).toBe('?tab=info');
      });
    });

    it('should preserve hash when setting params', async () => {
      const { result } = renderHook(
        () => ({
          searchParams: useSearchParams(),
          location: useLocation(),
        }),
        { wrapper: createWrapper('/about#section') },
      );

      const [, setSearchParams] = result.current.searchParams;
      setSearchParams({ tab: 'info' });

      await waitFor(() => {
        expect(result.current.location.hash).toBe('#section');
        expect(result.current.location.search).toBe('?tab=info');
      });
    });

    it('should handle empty params', async () => {
      const { result } = renderHook(
        () => ({
          searchParams: useSearchParams(),
          location: useLocation(),
        }),
        { wrapper: createWrapper('/?tab=settings') },
      );

      const [, setSearchParams] = result.current.searchParams;
      setSearchParams({});

      await waitFor(() => {
        expect(result.current.location.search).toBe('');
      });
    });

    it('should clear params when setting empty URLSearchParams', async () => {
      const { result } = renderHook(
        () => ({
          searchParams: useSearchParams(),
          location: useLocation(),
        }),
        { wrapper: createWrapper('/?tab=settings') },
      );

      const [, setSearchParams] = result.current.searchParams;
      setSearchParams(new URLSearchParams());

      await waitFor(() => {
        expect(result.current.location.search).toBe('');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle URL-encoded params', () => {
      const { result } = renderHook(() => useSearchParams(), {
        wrapper: createWrapper('/?query=hello%20world'),
      });

      const [searchParams] = result.current;
      expect(searchParams.get('query')).toBe('hello world');
    });

    it('should handle special characters', async () => {
      const { result } = renderHook(
        () => ({
          searchParams: useSearchParams(),
          location: useLocation(),
        }),
        { wrapper: createWrapper('/') },
      );

      const [, setSearchParams] = result.current.searchParams;
      setSearchParams({ query: 'hello&world=test' });

      await waitFor(() => {
        expect(result.current.location.search).toBeTruthy();
      });
    });

    it('should handle array-like params', () => {
      const { result } = renderHook(() => useSearchParams(), {
        wrapper: createWrapper('/?tags=a&tags=b&tags=c'),
      });

      const [searchParams] = result.current;
      expect(searchParams.getAll('tags')).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty values', () => {
      const { result } = renderHook(() => useSearchParams(), {
        wrapper: createWrapper('/?tab=&sort=date'),
      });

      const [searchParams] = result.current;
      expect(searchParams.get('tab')).toBe('');
      expect(searchParams.get('sort')).toBe('date');
    });
  });

  describe('function stability', () => {
    it('should maintain setSearchParams reference', () => {
      const { result, rerender } = renderHook(() => useSearchParams(), {
        wrapper: createWrapper('/'),
      });

      const [, firstSet] = result.current;
      rerender();
      const [, secondSet] = result.current;

      expect(firstSet).toBe(secondSet);
    });
  });
});
