// packages/core/src/async/__tests__/DeferredPromise.test.ts
import { describe, expect, it } from 'vitest';

import { DeferredPromise } from '../DeferredPromise';

describe('DeferredPromise', () => {
  describe('resolve', () => {
    it('should resolve with the provided value', async () => {
      const deferred = new DeferredPromise<string>();

      deferred.resolve('test-value');

      const result = await deferred.promise;
      expect(result).toBe('test-value');
    });

    it('should resolve with complex objects', async () => {
      const deferred = new DeferredPromise<{ name: string; value: number }>();
      const testObj = { name: 'test', value: 42 };

      deferred.resolve(testObj);

      const result = await deferred.promise;
      expect(result).toEqual(testObj);
    });

    it('should resolve with undefined', async () => {
      const deferred = new DeferredPromise<undefined>();

      deferred.resolve(undefined);

      const result = await deferred.promise;
      expect(result).toBeUndefined();
    });

    it('should resolve with another promise', async () => {
      const deferred = new DeferredPromise<string>();
      const innerPromise = Promise.resolve('inner-value');

      deferred.resolve(innerPromise);

      const result = await deferred.promise;
      expect(result).toBe('inner-value');
    });
  });

  describe('reject', () => {
    it('should reject with the provided error', async () => {
      const deferred = new DeferredPromise<string>();
      const error = new Error('test-error');

      deferred.reject(error);

      await expect(deferred.promise).rejects.toThrow('test-error');
    });

    it('should reject with string error', async () => {
      const deferred = new DeferredPromise<string>();

      deferred.reject('string-error');

      await expect(deferred.promise).rejects.toBe('string-error');
    });

    it('should reject with custom error object', async () => {
      const deferred = new DeferredPromise<string>();
      const customError = { code: 'CUSTOM_ERROR', message: 'Custom error' };

      deferred.reject(customError);

      await expect(deferred.promise).rejects.toEqual(customError);
    });
  });

  describe('promise property', () => {
    it('should be a Promise instance', () => {
      const deferred = new DeferredPromise<string>();

      expect(deferred.promise).toBeInstanceOf(Promise);
    });

    it('should be thenable', async () => {
      const deferred = new DeferredPromise<number>();
      let chainedValue: number | undefined;

      const chainedPromise = deferred.promise.then((value) => {
        chainedValue = value;
        return value * 2;
      });

      deferred.resolve(21);

      const result = await chainedPromise;
      expect(chainedValue).toBe(21);
      expect(result).toBe(42);
    });

    it('should be catchable', async () => {
      const deferred = new DeferredPromise<string>();
      let caughtError: unknown;

      const catchPromise = deferred.promise.catch((error: unknown) => {
        caughtError = error;
        return 'caught';
      });

      const testError = new Error('test');
      deferred.reject(testError);

      const result = await catchPromise;
      expect(caughtError).toBe(testError);
      expect(result).toBe('caught');
    });
  });

  describe('async/await compatibility', () => {
    it('should work with async/await pattern', async () => {
      const deferred = new DeferredPromise<string>();

      // Simulate async operation
      setTimeout(() => {
        deferred.resolve('delayed-value');
      }, 10);

      const result = await deferred.promise;
      expect(result).toBe('delayed-value');
    });

    it('should work with Promise.all', async () => {
      const deferred1 = new DeferredPromise<number>();
      const deferred2 = new DeferredPromise<number>();
      const deferred3 = new DeferredPromise<number>();

      deferred1.resolve(1);
      deferred2.resolve(2);
      deferred3.resolve(3);

      const results = await Promise.all([deferred1.promise, deferred2.promise, deferred3.promise]);

      expect(results).toEqual([1, 2, 3]);
    });

    it('should work with Promise.race', async () => {
      const deferred1 = new DeferredPromise<string>();
      const deferred2 = new DeferredPromise<string>();

      deferred1.resolve('first');
      // deferred2 never resolved

      const result = await Promise.race([deferred1.promise, deferred2.promise]);
      expect(result).toBe('first');
    });
  });

  describe('type safety', () => {
    it('should preserve type through resolution', async () => {
      interface User {
        id: string;
        name: string;
      }

      const deferred = new DeferredPromise<User>();
      const user: User = { id: '1', name: 'Test User' };

      deferred.resolve(user);

      const result = await deferred.promise;
      // TypeScript should infer result as User
      expect(result.id).toBe('1');
      expect(result.name).toBe('Test User');
    });
  });
});
