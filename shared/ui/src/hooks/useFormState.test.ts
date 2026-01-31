// shared/ui/src/hooks/useFormState.test.ts
/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFormState } from './useFormState';

describe('useFormState', () => {
  describe('initial state', () => {
    it('should initialize with isLoading false', () => {
      const { result } = renderHook(() => useFormState());
      expect(result.current.isLoading).toBe(false);
    });

    it('should initialize with error null', () => {
      const { result } = renderHook(() => useFormState());
      expect(result.current.error).toBeNull();
    });
  });

  describe('setIsLoading', () => {
    it('should set loading state to true', () => {
      const { result } = renderHook(() => useFormState());

      act(() => {
        result.current.setIsLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      const { result } = renderHook(() => useFormState());

      act(() => {
        result.current.setIsLoading(true);
      });

      act(() => {
        result.current.setIsLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useFormState());

      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.error).toBe('Test error message');
    });

    it('should set error to null', () => {
      const { result } = renderHook(() => useFormState());

      act(() => {
        result.current.setError('Test error');
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear the error', () => {
      const { result } = renderHook(() => useFormState());

      act(() => {
        result.current.setError('Test error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useFormState());
      const clearError1 = result.current.clearError;

      rerender();
      const clearError2 = result.current.clearError;

      expect(clearError1).toBe(clearError2);
    });
  });

  describe('wrapHandler', () => {
    it('should set loading state during handler execution', async () => {
      const { result } = renderHook(() => useFormState());
      let resolveHandler: (value: string) => void;
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolveHandler = resolve;
          }),
      );

      const wrappedHandler = result.current.wrapHandler(handler);

      // Start the handler execution (don't await)
      let executionPromise: Promise<unknown>;
      act(() => {
        executionPromise = wrappedHandler({ test: 'data' });
      });

      // Loading state should be true while handler is pending
      expect(result.current.isLoading).toBe(true);

      // Complete the handler
      await act(async () => {
        resolveHandler('success');
        await executionPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should clear error before execution', async () => {
      const { result } = renderHook(() => useFormState());
      const handler = vi.fn().mockResolvedValue('success');

      // Set initial error
      act(() => {
        result.current.setError('Previous error');
      });

      const wrappedHandler = result.current.wrapHandler(handler);

      await act(async () => {
        await wrappedHandler({ test: 'data' });
      });

      expect(result.current.error).toBeNull();
    });

    it('should set error on handler failure', async () => {
      const { result } = renderHook(() => useFormState());
      const error = new Error('Test error');
      const handler = vi.fn().mockRejectedValue(error);

      const wrappedHandler = result.current.wrapHandler(handler);

      await act(async () => {
        await expect(wrappedHandler({ test: 'data' })).rejects.toThrow('Test error');
      });

      expect(result.current.error).toBe('Test error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should convert non-Error rejections to Error', async () => {
      const { result } = renderHook(() => useFormState());
      const handler = vi.fn().mockRejectedValue('string error');

      const wrappedHandler = result.current.wrapHandler(handler);

      await act(async () => {
        await expect(wrappedHandler({ test: 'data' })).rejects.toBe('string error');
      });

      expect(result.current.error).toBe('An error occurred');
    });

    it('should return handler result on success', async () => {
      const { result } = renderHook(() => useFormState());
      const handler = vi.fn().mockResolvedValue({ id: 123 });

      const wrappedHandler = result.current.wrapHandler(handler);

      let handlerResult;
      await act(async () => {
        handlerResult = await wrappedHandler({ test: 'data' });
      });

      expect(handlerResult).toEqual({ id: 123 });
    });

    it('should pass data to the handler', async () => {
      const { result } = renderHook(() => useFormState());
      const handler = vi.fn().mockResolvedValue('success');

      const wrappedHandler = result.current.wrapHandler(handler);

      await act(async () => {
        await wrappedHandler({ email: 'test@example.com', password: 'secret' });
      });

      expect(handler).toHaveBeenCalledWith({ email: 'test@example.com', password: 'secret' });
    });

    describe('with options', () => {
      it('should call onStart before execution', async () => {
        const { result } = renderHook(() => useFormState());
        const handler = vi.fn().mockResolvedValue('success');
        const onStart = vi.fn();

        const wrappedHandler = result.current.wrapHandler(handler, { onStart });

        await act(async () => {
          await wrappedHandler({ test: 'data' });
        });

        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onStart).toHaveBeenCalledBefore(handler);
      });

      it('should call onSuccess on successful execution', async () => {
        const { result } = renderHook(() => useFormState());
        const handler = vi.fn().mockResolvedValue('success');
        const onSuccess = vi.fn();

        const wrappedHandler = result.current.wrapHandler(handler, { onSuccess });

        await act(async () => {
          await wrappedHandler({ test: 'data' });
        });

        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      it('should not call onSuccess on failure', async () => {
        const { result } = renderHook(() => useFormState());
        const handler = vi.fn().mockRejectedValue(new Error('Test error'));
        const onSuccess = vi.fn();

        const wrappedHandler = result.current.wrapHandler(handler, { onSuccess });

        await act(async () => {
          await expect(wrappedHandler({ test: 'data' })).rejects.toThrow();
        });

        expect(onSuccess).not.toHaveBeenCalled();
      });

      it('should call onError with error on failure', async () => {
        const { result } = renderHook(() => useFormState());
        const error = new Error('Test error');
        const handler = vi.fn().mockRejectedValue(error);
        const onError = vi.fn();

        const wrappedHandler = result.current.wrapHandler(handler, { onError });

        await act(async () => {
          await expect(wrappedHandler({ test: 'data' })).rejects.toThrow();
        });

        expect(onError).toHaveBeenCalledWith(error);
      });

      it('should call onFinally after success', async () => {
        const { result } = renderHook(() => useFormState());
        const handler = vi.fn().mockResolvedValue('success');
        const onFinally = vi.fn();

        const wrappedHandler = result.current.wrapHandler(handler, { onFinally });

        await act(async () => {
          await wrappedHandler({ test: 'data' });
        });

        expect(onFinally).toHaveBeenCalledTimes(1);
      });

      it('should call onFinally after failure', async () => {
        const { result } = renderHook(() => useFormState());
        const handler = vi.fn().mockRejectedValue(new Error('Test error'));
        const onFinally = vi.fn();

        const wrappedHandler = result.current.wrapHandler(handler, { onFinally });

        await act(async () => {
          await expect(wrappedHandler({ test: 'data' })).rejects.toThrow();
        });

        expect(onFinally).toHaveBeenCalledTimes(1);
      });
    });

    it('should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useFormState());
      const wrapHandler1 = result.current.wrapHandler;

      rerender();
      const wrapHandler2 = result.current.wrapHandler;

      expect(wrapHandler1).toBe(wrapHandler2);
    });
  });
});
