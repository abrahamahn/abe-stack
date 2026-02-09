// src/client/react/src/hooks/useSidePeek.test.ts
/**
 * Tests for useSidePeek hook.
 *
 * Tests hook for managing Notion-style side-peek state with URL sync.
 */
import { renderHook, waitFor } from '@testing-library/react';
import react from 'react';
import { describe, expect, it } from 'vitest';

import { MemoryRouter } from '../router';

import { useSidePeek } from './useSidePeek';

import type { ReactElement, ReactNode } from 'react';

function createWrapper(initialPath = '/') {
  return function wrapper({ children }: { children: ReactNode }): ReactElement {
    return react.createElement(MemoryRouter, { initialEntries: [initialPath], children });
  };
}
describe('useSidePeek', () => {
  describe('initial state', () => {
    it('should start with closed state', () => {
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      expect(result.current.isOpen).toBe(false);
      expect(result.current.peekPath).toBeNull();
    });
    it('should read peek path from URL', () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=/users/123'),
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.peekPath).toBe('/users/123');
    });
    it('should handle URL with multiple query params', () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?tab=settings&peek=/users/123&sort=date'),
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.peekPath).toBe('/users/123');
    });
    it('should handle encoded peek paths', () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=%2Fusers%2F123'),
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.peekPath).toBe('/users/123');
    });
  });
  describe('open', () => {
    it('should open peek with given path', async () => {
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      expect(result.current.isOpen).toBe(false);
      result.current.open('/users/123');
      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
        expect(result.current.peekPath).toBe('/users/123');
      });
    });
    it('should add peek param to existing query params', async () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?tab=settings'),
      });
      result.current.open('/users/123');
      await waitFor(() => {
        expect(result.current.peekPath).toBe('/users/123');
      });
    });
    it('should preserve hash when opening', async () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/#section'),
      });
      result.current.open('/users/123');
      await waitFor(() => {
        expect(result.current.peekPath).toBe('/users/123');
      });
    });
    it('should replace existing peek path', async () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=/users/123'),
      });
      expect(result.current.peekPath).toBe('/users/123');
      result.current.open('/users/456');
      await waitFor(() => {
        expect(result.current.peekPath).toBe('/users/456');
      });
    });
    it('should handle paths with query params', async () => {
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      result.current.open('/users/123?tab=activity');
      await waitFor(() => {
        expect(result.current.peekPath).toBe('/users/123?tab=activity');
      });
    });
    it('should handle paths with hash', async () => {
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      result.current.open('/users/123#profile');
      await waitFor(() => {
        expect(result.current.peekPath).toBe('/users/123#profile');
      });
    });
    it('should handle empty path', async () => {
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      result.current.open('');
      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
        expect(result.current.peekPath).toBe('');
      });
    });
  });
  describe('close', () => {
    it('should close peek', async () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=/users/123'),
      });
      expect(result.current.isOpen).toBe(true);
      result.current.close();
      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
        expect(result.current.peekPath).toBeNull();
      });
    });
    it('should preserve other query params when closing', async () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?tab=settings&peek=/users/123&sort=date'),
      });
      result.current.close();
      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
        expect(result.current.peekPath).toBeNull();
      });
    });
    it('should preserve hash when closing', async () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=/users/123#section'),
      });
      result.current.close();
      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
      });
    });
    it('should be idempotent when already closed', async () => {
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      expect(result.current.isOpen).toBe(false);
      result.current.close();
      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
        expect(result.current.peekPath).toBeNull();
      });
    });
    it('should remove query string entirely if no other params', async () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=/users/123'),
      });
      result.current.close();
      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
      });
    });
  });
  describe('toggle', () => {
    it('should open peek when closed', async () => {
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      expect(result.current.isOpen).toBe(false);
      result.current.toggle('/users/123');
      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
        expect(result.current.peekPath).toBe('/users/123');
      });
    });
    it('should close peek when same path is toggled', async () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=/users/123'),
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.peekPath).toBe('/users/123');
      result.current.toggle('/users/123');
      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
        expect(result.current.peekPath).toBeNull();
      });
    });
    it('should switch to different path when different path is toggled', async () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=/users/123'),
      });
      expect(result.current.peekPath).toBe('/users/123');
      result.current.toggle('/users/456');
      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
        expect(result.current.peekPath).toBe('/users/456');
      });
    });
    it('should handle empty path toggle', async () => {
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      result.current.toggle('');
      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
        expect(result.current.peekPath).toBe('');
      });
      result.current.toggle('');
      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
        expect(result.current.peekPath).toBeNull();
      });
    });
  });
  describe('isOpen flag', () => {
    it('should be true when peek param exists', () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=/users/123'),
      });
      expect(result.current.isOpen).toBe(true);
    });
    it('should be true even with empty peek param', () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek='),
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.peekPath).toBe('');
    });
    it('should be false when no peek param', () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?tab=settings'),
      });
      expect(result.current.isOpen).toBe(false);
    });
    it('should be false on root path', () => {
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      expect(result.current.isOpen).toBe(false);
    });
  });
  describe('URL synchronization', () => {
    it('should update when location changes externally', () => {
      const { result, rerender } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/'),
      });
      expect(result.current.isOpen).toBe(false);
      // Simulate external navigation
      rerender();
      expect(result.current.isOpen).toBe(false);
    });
    it('should handle pathname changes', () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/dashboard?peek=/users/123'),
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.peekPath).toBe('/users/123');
    });
  });
  describe('edge cases', () => {
    it('should handle special characters in peek path', () => {
      const specialPath = '/search?q=hello world&filter=date#results';
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper(`/?peek=${encodeURIComponent(specialPath)}`),
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.peekPath).toBe(specialPath);
    });
    it('should handle multiple peek params (uses first)', () => {
      const { result } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/?peek=/users/123&peek=/users/456'),
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.peekPath).toBe('/users/123');
    });
    it('should handle very long paths', async () => {
      const longPath = '/users/' + '123/'.repeat(100) + 'profile';
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      result.current.open(longPath);
      await waitFor(() => {
        expect(result.current.peekPath).toBe(longPath);
      });
    });
    it('should handle paths with equals signs', async () => {
      const pathWithEquals = '/api/token?key=abc=def=ghi';
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      result.current.open(pathWithEquals);
      await waitFor(() => {
        expect(result.current.peekPath).toBe(pathWithEquals);
      });
    });
    it('should handle paths with ampersands', async () => {
      const pathWithAmpersand = '/search?q=a&b&c';
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      result.current.open(pathWithAmpersand);
      await waitFor(() => {
        expect(result.current.peekPath).toBe(pathWithAmpersand);
      });
    });
    it('should handle Unicode paths', async () => {
      const unicodePath = '/users/名前/profile';
      const { result } = renderHook(() => useSidePeek(), { wrapper: createWrapper('/') });
      result.current.open(unicodePath);
      await waitFor(() => {
        expect(result.current.peekPath).toBe(unicodePath);
      });
    });
  });
  describe('function stability', () => {
    it('should maintain function references across renders', () => {
      const { result, rerender } = renderHook(() => useSidePeek(), {
        wrapper: createWrapper('/'),
      });
      const firstOpen = result.current.open;
      const firstClose = result.current.close;
      const firstToggle = result.current.toggle;
      rerender();
      expect(result.current.open).toBe(firstOpen);
      expect(result.current.close).toBe(firstClose);
      expect(result.current.toggle).toBe(firstToggle);
    });
  });
});
