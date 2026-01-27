// packages/ui/src/utils/__tests__/createFormHandler.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFormHandler } from '../createFormHandler';

import type { FormHandlerOptions } from '../createFormHandler';

import type { Mock } from 'vitest';


describe('createFormHandler', () => {
  let setIsLoading: Mock<(loading: boolean) => void>;
  let setError: Mock<(error: string | null) => void>;

  beforeEach(() => {
    setIsLoading = vi.fn();
    setError = vi.fn();
  });

  describe('basic functionality', () => {
    it('creates a handler wrapper function', () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      expect(typeof wrapHandler).toBe('function');
    });

    it('wraps a handler function', () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockResolvedValue('result');
      const wrappedHandler = wrapHandler(handler);

      expect(typeof wrappedHandler).toBe('function');
    });
  });

  describe('loading state management', () => {
    it('sets loading to true before handler execution', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockResolvedValue('result');
      const wrappedHandler = wrapHandler(handler);

      const promise = wrappedHandler({ data: 'test' });

      // Loading should be set to true before handler resolves
      expect(setIsLoading).toHaveBeenCalledWith(true);

      await promise;
    });

    it('sets loading to false after successful execution', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockResolvedValue('result');
      const wrappedHandler = wrapHandler(handler);

      await wrappedHandler({ data: 'test' });

      expect(setIsLoading).toHaveBeenLastCalledWith(false);
    });

    it('sets loading to false after failed execution', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockRejectedValue(new Error('Test error'));
      const wrappedHandler = wrapHandler(handler);

      await expect(wrappedHandler({ data: 'test' })).rejects.toThrow('Test error');

      expect(setIsLoading).toHaveBeenLastCalledWith(false);
    });
  });

  describe('error state management', () => {
    it('clears error before handler execution', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockResolvedValue('result');
      const wrappedHandler = wrapHandler(handler);

      await wrappedHandler({ data: 'test' });

      expect(setError).toHaveBeenCalledWith(null);
    });

    it('sets error message on Error instance', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockRejectedValue(new Error('Specific error message'));
      const wrappedHandler = wrapHandler(handler);

      await expect(wrappedHandler({ data: 'test' })).rejects.toThrow();

      expect(setError).toHaveBeenCalledWith('Specific error message');
    });

    it('sets generic error message for non-Error rejections', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockRejectedValue('string error');
      const wrappedHandler = wrapHandler(handler);

      await expect(wrappedHandler({ data: 'test' })).rejects.toBe('string error');

      expect(setError).toHaveBeenCalledWith('An error occurred');
    });

    it('does not set error on successful execution', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockResolvedValue('result');
      const wrappedHandler = wrapHandler(handler);

      await wrappedHandler({ data: 'test' });

      // setError should only have been called once to clear it
      expect(setError).toHaveBeenCalledTimes(1);
      expect(setError).toHaveBeenCalledWith(null);
    });
  });

  describe('handler execution', () => {
    it('passes data to the handler', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockResolvedValue('result');
      const wrappedHandler = wrapHandler(handler);

      const data = { email: 'test@example.com', password: 'secret' };
      await wrappedHandler(data);

      expect(handler).toHaveBeenCalledWith(data);
    });

    it('returns handler result on success', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockResolvedValue({ id: 123, name: 'Test' });
      const wrappedHandler = wrapHandler(handler);

      const result = await wrappedHandler({ data: 'test' });

      expect(result).toEqual({ id: 123, name: 'Test' });
    });

    it('re-throws the original error', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const originalError = new Error('Original error');
      const handler = vi.fn().mockRejectedValue(originalError);
      const wrappedHandler = wrapHandler(handler);

      await expect(wrappedHandler({ data: 'test' })).rejects.toThrow(originalError);
    });
  });

  describe('lifecycle callbacks', () => {
    describe('onStart', () => {
      it('calls onStart before handler execution', async () => {
        const onStart = vi.fn();
        const wrapHandler = createFormHandler(setIsLoading, setError);
        const handler = vi.fn().mockResolvedValue('result');
        const wrappedHandler = wrapHandler(handler, { onStart });

        await wrappedHandler({ data: 'test' });

        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onStart.mock.invocationCallOrder[0]!).toBeLessThan(
          handler.mock.invocationCallOrder[0]!,
        );
      });
    });

    describe('onSuccess', () => {
      it('calls onSuccess on successful execution', async () => {
        const onSuccess = vi.fn();
        const wrapHandler = createFormHandler(setIsLoading, setError);
        const handler = vi.fn().mockResolvedValue('result');
        const wrappedHandler = wrapHandler(handler, { onSuccess });

        await wrappedHandler({ data: 'test' });

        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      it('does not call onSuccess on failure', async () => {
        const onSuccess = vi.fn();
        const wrapHandler = createFormHandler(setIsLoading, setError);
        const handler = vi.fn().mockRejectedValue(new Error('Test error'));
        const wrappedHandler = wrapHandler(handler, { onSuccess });

        await expect(wrappedHandler({ data: 'test' })).rejects.toThrow();

        expect(onSuccess).not.toHaveBeenCalled();
      });
    });

    describe('onError', () => {
      it('calls onError with Error on failure', async () => {
        const onError = vi.fn();
        const wrapHandler = createFormHandler(setIsLoading, setError);
        const error = new Error('Test error');
        const handler = vi.fn().mockRejectedValue(error);
        const wrappedHandler = wrapHandler(handler, { onError });

        await expect(wrappedHandler({ data: 'test' })).rejects.toThrow();

        expect(onError).toHaveBeenCalledWith(error);
      });

      it('creates Error for non-Error rejections when calling onError', async () => {
        const onError = vi.fn();
        const wrapHandler = createFormHandler(setIsLoading, setError);
        const handler = vi.fn().mockRejectedValue('string rejection');
        const wrappedHandler = wrapHandler(handler, { onError });

        await expect(wrappedHandler({ data: 'test' })).rejects.toBe('string rejection');

        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect((onError.mock.calls[0]?.[0] as Error).message).toBe('An error occurred');
      });

      it('does not call onError on success', async () => {
        const onError = vi.fn();
        const wrapHandler = createFormHandler(setIsLoading, setError);
        const handler = vi.fn().mockResolvedValue('result');
        const wrappedHandler = wrapHandler(handler, { onError });

        await wrappedHandler({ data: 'test' });

        expect(onError).not.toHaveBeenCalled();
      });
    });

    describe('onFinally', () => {
      it('calls onFinally after successful execution', async () => {
        const onFinally = vi.fn();
        const wrapHandler = createFormHandler(setIsLoading, setError);
        const handler = vi.fn().mockResolvedValue('result');
        const wrappedHandler = wrapHandler(handler, { onFinally });

        await wrappedHandler({ data: 'test' });

        expect(onFinally).toHaveBeenCalledTimes(1);
      });

      it('calls onFinally after failed execution', async () => {
        const onFinally = vi.fn();
        const wrapHandler = createFormHandler(setIsLoading, setError);
        const handler = vi.fn().mockRejectedValue(new Error('Test error'));
        const wrappedHandler = wrapHandler(handler, { onFinally });

        await expect(wrappedHandler({ data: 'test' })).rejects.toThrow();

        expect(onFinally).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('default options', () => {
    it('uses default options when provided', async () => {
      const defaultOnStart = vi.fn();
      const defaultOnSuccess = vi.fn();
      const wrapHandler = createFormHandler(setIsLoading, setError, {
        onStart: defaultOnStart,
        onSuccess: defaultOnSuccess,
      });
      const handler = vi.fn().mockResolvedValue('result');
      const wrappedHandler = wrapHandler(handler);

      await wrappedHandler({ data: 'test' });

      expect(defaultOnStart).toHaveBeenCalled();
      expect(defaultOnSuccess).toHaveBeenCalled();
    });

    it('allows per-handler options to override defaults', async () => {
      const defaultOnSuccess = vi.fn();
      const overrideOnSuccess = vi.fn();
      const wrapHandler = createFormHandler(setIsLoading, setError, {
        onSuccess: defaultOnSuccess,
      });
      const handler = vi.fn().mockResolvedValue('result');
      const wrappedHandler = wrapHandler(handler, { onSuccess: overrideOnSuccess });

      await wrappedHandler({ data: 'test' });

      expect(defaultOnSuccess).not.toHaveBeenCalled();
      expect(overrideOnSuccess).toHaveBeenCalled();
    });

    it('merges default and per-handler options', async () => {
      const defaultOnStart = vi.fn();
      const perHandlerOnSuccess = vi.fn();
      const wrapHandler = createFormHandler(setIsLoading, setError, {
        onStart: defaultOnStart,
      });
      const handler = vi.fn().mockResolvedValue('result');
      const wrappedHandler = wrapHandler(handler, { onSuccess: perHandlerOnSuccess });

      await wrappedHandler({ data: 'test' });

      expect(defaultOnStart).toHaveBeenCalled();
      expect(perHandlerOnSuccess).toHaveBeenCalled();
    });
  });

  describe('execution order', () => {
    it('executes in correct order: setLoading(true) -> setError(null) -> onStart -> handler -> onSuccess -> setLoading(false) -> onFinally', async () => {
      const callOrder: string[] = [];

      const trackingSetIsLoading = vi.fn((loading: boolean) => {
        callOrder.push(`setIsLoading(${String(loading)})`);
      });
      const trackingSetError = vi.fn((error: string | null) => {
        callOrder.push(`setError(${String(error)})`);
      });

      const wrapHandler = createFormHandler(trackingSetIsLoading, trackingSetError);
      const handler = vi.fn().mockImplementation(() => {
        callOrder.push('handler');
        return Promise.resolve('result');
      });

      const options: FormHandlerOptions = {
        onStart: () => callOrder.push('onStart'),
        onSuccess: () => callOrder.push('onSuccess'),
        onFinally: () => callOrder.push('onFinally'),
      };

      const wrappedHandler = wrapHandler(handler, options);
      await wrappedHandler({ data: 'test' });

      expect(callOrder).toEqual([
        'setIsLoading(true)',
        'setError(null)',
        'onStart',
        'handler',
        'onSuccess',
        'setIsLoading(false)',
        'onFinally',
      ]);
    });

    it('executes in correct order on error: setLoading(true) -> setError(null) -> onStart -> handler -> setError(message) -> onError -> setLoading(false) -> onFinally', async () => {
      const callOrder: string[] = [];

      const trackingSetIsLoading = vi.fn((loading: boolean) => {
        callOrder.push(`setIsLoading(${String(loading)})`);
      });
      const trackingSetError = vi.fn((error: string | null) => {
        callOrder.push(`setError(${String(error)})`);
      });

      const wrapHandler = createFormHandler(trackingSetIsLoading, trackingSetError);
      const handler = vi.fn().mockImplementation(() => {
        callOrder.push('handler');
        throw new Error('Test error');
      });

      const options: FormHandlerOptions = {
        onStart: () => callOrder.push('onStart'),
        onError: () => callOrder.push('onError'),
        onFinally: () => callOrder.push('onFinally'),
      };

      const wrappedHandler = wrapHandler(handler, options);
      await expect(wrappedHandler({ data: 'test' })).rejects.toThrow();

      expect(callOrder).toEqual([
        'setIsLoading(true)',
        'setError(null)',
        'onStart',
        'handler',
        'setError(Test error)',
        'onError',
        'setIsLoading(false)',
        'onFinally',
      ]);
    });
  });

  describe('type safety', () => {
    it('preserves handler return type', async () => {
      const wrapHandler = createFormHandler(setIsLoading, setError);
      const handler = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });
      const wrappedHandler = wrapHandler<{ input: string }, { id: number; name: string }>(handler);

      const result = await wrappedHandler({ input: 'test' });

      expect(result).toEqual({ id: 1, name: 'Test' });
    });
  });
});
