// packages/core/src/infrastructure/async/DeferredPromise.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { DeferredPromise } from './DeferredPromise';

describe('DeferredPromise', () => {
  let deferred: DeferredPromise<string>;

  beforeEach(() => {
    deferred = new DeferredPromise<string>();
  });

  describe('constructor', () => {
    test('should create a promise in pending state', () => {
      expect(deferred.promise).toBeInstanceOf(Promise);

      // The promise should be pending initially
      // We can't directly check the state, but we can verify it hasn't resolved yet
      const spy = vi.fn();
      void deferred.promise.then(spy);

      // Callback should not have been called yet
      expect(spy).not.toHaveBeenCalled();
    });

    test('should have resolve and reject methods', () => {
      expect(deferred.resolve).toBeTypeOf('function');
      expect(deferred.reject).toBeTypeOf('function');
    });
  });

  describe('resolve', () => {
    test('should resolve the promise with the provided value', async () => {
      const testValue = 'resolved value';

      deferred.resolve(testValue);

      const result = await deferred.promise;
      expect(result).toBe(testValue);
    });

    test('should only resolve once', async () => {
      const firstValue = 'first';
      const secondValue = 'second';

      deferred.resolve(firstValue);
      deferred.resolve(secondValue); // Should be ignored

      const result = await deferred.promise;
      expect(result).toBe(firstValue);
    });

    test('should allow resolving with undefined', async () => {
      const localDeferred = new DeferredPromise<string | undefined>();
      localDeferred.resolve(undefined);

      const result = await localDeferred.promise;
      expect(result).toBeUndefined();
    });

    test('should allow resolving with null', async () => {
      const localDeferred = new DeferredPromise<string | null>();
      localDeferred.resolve(null);

      const result = await localDeferred.promise;
      expect(result).toBeNull();
    });

    test('should allow resolving with complex objects', async () => {
      const complexValue = {
        nested: {
          array: [1, 'two', true],
          func: () => 'test',
        },
        date: new Date(),
      };
      const localDeferred = new DeferredPromise<typeof complexValue>();
      localDeferred.resolve(complexValue);

      const result = await localDeferred.promise;
      expect(result).toEqual(complexValue);
    });

    test('should notify all then callbacks', async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      const spy3 = vi.fn();

      void deferred.promise.then(spy1);
      void deferred.promise.then(spy2);
      void deferred.promise.then(spy3);

      const testValue = 'multi-callback';
      deferred.resolve(testValue);

      await deferred.promise;

      expect(spy1).toHaveBeenCalledWith(testValue);
      expect(spy2).toHaveBeenCalledWith(testValue);
      expect(spy3).toHaveBeenCalledWith(testValue);
    });

    test('should work with chained promises', async () => {
      const chainedValue = 'chained';

      const chainedPromise = deferred.promise.then((value) => `${value}-${chainedValue}`);

      deferred.resolve('initial');

      const result = await chainedPromise;
      expect(result).toBe('initial-chained');
    });
  });

  describe('reject', () => {
    test('should reject the promise with the provided reason', async () => {
      const testError = new Error('test error');

      deferred.reject(testError);

      await expect(deferred.promise).rejects.toThrow('test error');
    });

    test('should only reject once', async () => {
      const firstError = new Error('first error');
      const secondError = new Error('second error');

      deferred.reject(firstError);
      deferred.reject(secondError); // Should be ignored

      await expect(deferred.promise).rejects.toThrow('first error');
    });

    test('should allow rejecting with string', async () => {
      const errorMessage = 'string error';

      deferred.reject(errorMessage);

      await expect(deferred.promise).rejects.toBe(errorMessage);
    });

    test('should allow rejecting with non-error objects', async () => {
      const errorObject = { code: 500, message: 'server error' };

      deferred.reject(errorObject);

      await expect(deferred.promise).rejects.toEqual(errorObject);
    });

    test('should notify all catch callbacks', async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      void deferred.promise.catch(spy1);
      void deferred.promise.catch(spy2);

      const testError = new Error('multi-catch');
      deferred.reject(testError);

      await expect(deferred.promise).rejects.toThrow('multi-catch');

      expect(spy1).toHaveBeenCalledWith(testError);
      expect(spy2).toHaveBeenCalledWith(testError);
    });

    test('should work with chained promises that handle rejections', async () => {
      const handledValue = 'handled';

      const chainedPromise = deferred.promise.catch(() => handledValue);

      deferred.reject(new Error('original error'));

      const result = await chainedPromise;
      expect(result).toBe(handledValue);
    });
  });

  describe('race conditions', () => {
    test('should ignore resolve after reject', async () => {
      const error = new Error('was rejected');
      const value = 'was resolved';

      deferred.reject(error);
      deferred.resolve(value); // Should be ignored

      await expect(deferred.promise).rejects.toThrow('was rejected');
    });

    test('should ignore reject after resolve', async () => {
      const value = 'was resolved';
      const error = new Error('was rejected');

      deferred.resolve(value);
      deferred.reject(error); // Should be ignored

      const result = await deferred.promise;
      expect(result).toBe(value);
    });

    test('should handle rapid resolve/reject calls', async () => {
      const value = 'final value';

      // Call resolve and reject rapidly
      deferred.resolve(value);
      deferred.reject(new Error('should be ignored'));
      deferred.resolve('should also be ignored');

      const result = await deferred.promise;
      expect(result).toBe(value);
    });
  });

  describe('promise behavior', () => {
    test('should behave like a regular promise after resolution', async () => {
      deferred.resolve('initial value');

      // Should be able to chain multiple times
      const result1 = await deferred.promise;
      const result2 = await deferred.promise.then((val) => val.toUpperCase());
      const result3 = await deferred.promise.then((val) => `prefix-${val}`);

      expect(result1).toBe('initial value');
      expect(result2).toBe('INITIAL VALUE');
      expect(result3).toBe('prefix-initial value');
    });

    test('should behave like a regular promise after rejection', async () => {
      const error = new Error('initial error');
      deferred.reject(error);

      // Should be able to chain multiple times
      await expect(deferred.promise).rejects.toThrow('initial error');
      await expect(
        deferred.promise.catch((error: unknown) => {
          if (error instanceof Error) {
            return `handled: ${error.message}`;
          }
          return 'handled: unknown error';
        }),
      ).resolves.toBe('handled: initial error');
    });

    test('should work with Promise.race', async () => {
      const fastDeferred = new DeferredPromise<string>();
      const slowDeferred = new DeferredPromise<string>();

      setTimeout(() => slowDeferred.resolve('slow'), 10);
      setTimeout(() => fastDeferred.resolve('fast'), 5);

      const result = await Promise.race([fastDeferred.promise, slowDeferred.promise]);
      expect(result).toBe('fast');
    });

    test('should work with Promise.all', async () => {
      const deferred1 = new DeferredPromise<string>();
      const deferred2 = new DeferredPromise<number>();
      const deferred3 = new DeferredPromise<boolean>();

      setTimeout(() => deferred1.resolve('first'), 5);
      setTimeout(() => deferred2.resolve(42), 10);
      setTimeout(() => deferred3.resolve(true), 15);

      const results = await Promise.all([deferred1.promise, deferred2.promise, deferred3.promise]);

      expect(results).toEqual(['first', 42, true]);
    });
  });

  describe('callbacks timing', () => {
    test('should call callbacks asynchronously after resolution', async () => {
      const spy = vi.fn();
      void deferred.promise.then(spy);

      // Callback should not be called immediately
      expect(spy).not.toHaveBeenCalled();

      deferred.resolve('value');

      // Callback should be called asynchronously
      expect(spy).not.toHaveBeenCalled();

      // Wait for the next tick
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(spy).toHaveBeenCalledWith('value');
    });

    test('should call callbacks asynchronously after rejection', async () => {
      const spy = vi.fn();
      void deferred.promise.catch(spy);

      // Callback should not be called immediately
      expect(spy).not.toHaveBeenCalled();

      deferred.reject(new Error('error'));

      // Callback should be called asynchronously
      expect(spy).not.toHaveBeenCalled();

      // Wait for the next tick
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(spy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('multiple resolutions', () => {
    test('should maintain state after resolution', async () => {
      const deferred = new DeferredPromise<number>();

      deferred.resolve(42);
      deferred.resolve(99); // Should be ignored
      deferred.reject(new Error('ignored')); // Should be ignored

      const result = await deferred.promise;
      expect(result).toBe(42);
    });

    test('should maintain state after rejection', async () => {
      const deferred = new DeferredPromise<number>();
      const error = new Error('original');

      deferred.reject(error);
      deferred.reject(new Error('ignored')); // Should be ignored
      deferred.resolve(99); // Should be ignored

      await expect(deferred.promise).rejects.toThrow('original');
    });
  });

  describe('edge cases', () => {
    test('should handle self-resolution', async () => {
      // This is a complex case, but DeferredPromise should handle it gracefully
      const deferred = new DeferredPromise<DeferredPromise<string>>();

      deferred.resolve(deferred as any); // Self-resolution

      const result = await deferred.promise;
      expect(result).toBe(deferred);
    });

    test('should handle resolution with another promise', async () => {
      const innerDeferred = new DeferredPromise<string>();
      setTimeout(() => innerDeferred.resolve('inner value'), 5);
      const localDeferred = new DeferredPromise<string | Promise<string>>();
      localDeferred.resolve(innerDeferred.promise);

      const result = await localDeferred.promise;
      expect(result).toBe('inner value');
    });

    test('should handle rejection with another promise', async () => {
      const innerDeferred = new DeferredPromise<string>();
      const error = new Error('inner error');
      setTimeout(() => innerDeferred.reject(error), 5);
      const localDeferred = new DeferredPromise<string | Promise<string>>();
      localDeferred.resolve(innerDeferred.promise);

      await expect(localDeferred.promise).rejects.toThrow('inner error');
    });

    test('should handle very large values', async () => {
      const largeValue = {
        data: 'x'.repeat(100000), // 100KB string
        nested: {
          array: Array.from({ length: 10000 }, (_, i) => i),
        },
      };
      const localDeferred = new DeferredPromise<typeof largeValue>();
      localDeferred.resolve(largeValue);

      const result = await localDeferred.promise;
      expect(result).toEqual(largeValue);
    });

    test('should handle recursive structures (with caution)', async () => {
      type RecursiveNode = { name: string; self?: RecursiveNode };
      const recursive: RecursiveNode = { name: 'recursive' };
      recursive.self = recursive; // Create cycle

      const localDeferred = new DeferredPromise<RecursiveNode>();
      localDeferred.resolve(recursive);

      const result = await localDeferred.promise;
      expect(result.name).toBe('recursive');
      expect(result.self).toBe(result); // Should maintain reference
    });
  });

  test('should work with Promise.allSettled', async () => {
    const deferred1 = new DeferredPromise<string>();
    const deferred2 = new DeferredPromise<string>();

    setTimeout(() => deferred1.resolve('success'), 5);
    setTimeout(() => deferred2.reject(new Error('failure')), 10);

    const results = await Promise.allSettled([deferred1.promise, deferred2.promise]);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'success' });
    expect(results[1]).toEqual({ status: 'rejected', reason: expect.any(Error) });
  });
});
