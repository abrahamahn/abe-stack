// client/ui/src/hooks/useCopyToClipboard.test.ts
/**
 * Tests for useCopyToClipboard hook.
 *
 * Tests clipboard copying functionality with proper mocking
 * and error handling.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCopyToClipboard } from './useCopyToClipboard';

describe('useCopyToClipboard', () => {
  let mockClipboard: { writeText: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();

    mockClipboard = {
      writeText: vi.fn(),
    };

    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should return initial state with copied false', () => {
      const { result } = renderHook(() => useCopyToClipboard());

      expect(result.current.copied).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide copy function', () => {
      const { result } = renderHook(() => useCopyToClipboard());

      expect(typeof result.current.copy).toBe('function');
    });
  });

  describe('successful copy', () => {
    it('should copy text to clipboard', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('Hello, World!');
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('Hello, World!');
      expect(result.current.copied).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should reset copied state after 2 seconds', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      expect(result.current.copied).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.copied).toBe(false);
      });
    });

    it('should handle empty string', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('');
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
      expect(result.current.copied).toBe(true);
    });

    it('should handle very long text', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const longText = 'a'.repeat(10000);
      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy(longText);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(longText);
      expect(result.current.copied).toBe(true);
    });

    it('should handle special characters', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const specialText = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\n\t\r';
      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy(specialText);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(specialText);
      expect(result.current.copied).toBe(true);
    });

    it('should handle unicode characters', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const unicodeText = '你好世界 🌍 مرحبا بالعالم';
      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy(unicodeText);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(unicodeText);
      expect(result.current.copied).toBe(true);
    });
  });

  describe('multiple copies', () => {
    it('should handle multiple consecutive copies', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('first');
      });

      expect(result.current.copied).toBe(true);

      await act(async () => {
        await result.current.copy('second');
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('second');
      expect(result.current.copied).toBe(true);
    });

    it('should clear previous timeout when copying again', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('first');
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await act(async () => {
        await result.current.copy('second');
      });

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Should still be true since we reset the timeout
      expect(result.current.copied).toBe(true);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.copied).toBe(false);
      });
    });

    it('should update copied state for each copy', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('text1');
      });
      expect(result.current.copied).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      await waitFor(() => {
        expect(result.current.copied).toBe(false);
      });

      await act(async () => {
        await result.current.copy('text2');
      });
      expect(result.current.copied).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle clipboard API not available', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      expect(result.current.copied).toBe(false);
      expect(result.current.error).toEqual(new Error('Clipboard API not available'));
    });

    it('should handle writeText rejection', async () => {
      const mockError = new Error('Permission denied');
      mockClipboard.writeText.mockRejectedValue(mockError);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      expect(result.current.copied).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });

    it('should handle non-Error rejection', async () => {
      mockClipboard.writeText.mockRejectedValue('string error');

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      expect(result.current.copied).toBe(false);
      expect(result.current.error).toEqual(new Error('Failed to copy'));
    });

    it('should clear error on successful copy after error', async () => {
      const mockError = new Error('Permission denied');
      mockClipboard.writeText.mockRejectedValueOnce(mockError);
      mockClipboard.writeText.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      expect(result.current.error).toEqual(mockError);

      await act(async () => {
        await result.current.copy('test2');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.copied).toBe(true);
    });

    it('should handle security errors', async () => {
      const securityError = new Error('Document is not focused');
      mockClipboard.writeText.mockRejectedValue(securityError);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      expect(result.current.error).toEqual(securityError);
      expect(result.current.copied).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not reset copied state after unmount', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result, unmount } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      const copiedBeforeUnmount = result.current.copied;
      unmount();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(copiedBeforeUnmount).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle navigator not defined', async () => {
      const originalNavigator = global.navigator;

      // @ts-expect-error - Testing browser unavailable scenario
      delete global.navigator;

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      expect(result.current.copied).toBe(false);
      expect(result.current.error?.message).toBe('Clipboard API not available');

      global.navigator = originalNavigator;
    });

    it('should handle multiline text', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const multilineText = 'Line 1\nLine 2\nLine 3';
      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy(multilineText);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(multilineText);
      expect(result.current.copied).toBe(true);
    });

    it('should handle text with only whitespace', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const whitespaceText = '   \t\n  ';
      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy(whitespaceText);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(whitespaceText);
      expect(result.current.copied).toBe(true);
    });
  });

  describe('timing', () => {
    it('should not reset copied before 2 seconds', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      expect(result.current.copied).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1999);
      });

      expect(result.current.copied).toBe(true);
    });

    it('should reset copied exactly at 2 seconds', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.copied).toBe(false);
      });
    });

    it('should remain false after reset', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('test');
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.copied).toBe(false);
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.copied).toBe(false);
    });
  });
});
