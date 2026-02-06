// packages/shared/src/core/result.test.ts
import { describe, expect, it, vi } from 'vitest';

import {
  andThen,
  andThenAsync,
  err,
  fromPromise,
  isErr,
  isOk,
  map,
  mapErr,
  match,
  ok,
  tap,
  tapErr,
  toPromise,
  unwrap,
  unwrapErr,
  unwrapOr,
} from './result';

import type { Result } from './result';

describe('result', () => {
  // ==========================================================================
  // Constructors
  // ==========================================================================
  describe('ok', () => {
    it('creates a successful result', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result).toEqual({ ok: true, data: 42 });
    });

    it('works with any data type', () => {
      expect(ok('hello')).toEqual({ ok: true, data: 'hello' });
      expect(ok(null)).toEqual({ ok: true, data: null });
      expect(ok({ key: 'value' })).toEqual({ ok: true, data: { key: 'value' } });
    });
  });

  describe('err', () => {
    it('creates an error result', () => {
      const error = new Error('fail');
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result).toEqual({ ok: false, error });
    });

    it('works with string errors', () => {
      const result = err('something went wrong');
      expect(result).toEqual({ ok: false, error: 'something went wrong' });
    });
  });

  // ==========================================================================
  // Type Guards
  // ==========================================================================
  describe('isOk', () => {
    it('returns true for Ok results', () => {
      expect(isOk(ok(42))).toBe(true);
    });

    it('returns false for Err results', () => {
      expect(isOk(err('fail'))).toBe(false);
    });
  });

  describe('isErr', () => {
    it('returns true for Err results', () => {
      expect(isErr(err('fail'))).toBe(true);
    });

    it('returns false for Ok results', () => {
      expect(isErr(ok(42))).toBe(false);
    });
  });

  // ==========================================================================
  // Transformations
  // ==========================================================================
  describe('map', () => {
    it('transforms data in Ok result', () => {
      const result = map((n: number) => n * 2, ok(5));
      expect(result).toEqual({ ok: true, data: 10 });
    });

    it('passes through Err result unchanged', () => {
      const error = err('fail');
      const result = map((n: number) => n * 2, error);
      expect(result).toBe(error);
    });
  });

  describe('mapErr', () => {
    it('transforms error in Err result', () => {
      const result = mapErr((e: string) => new Error(e), err('fail'));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('fail');
      }
    });

    it('passes through Ok result unchanged', () => {
      const original = ok(42);
      const result = mapErr((e: string) => new Error(e), original);
      expect(result).toBe(original);
    });
  });

  describe('andThen', () => {
    it('chains successful computations', () => {
      const double = (n: number) => ok(n * 2);
      const result = andThen(double, ok(5));
      expect(result).toEqual({ ok: true, data: 10 });
    });

    it('short-circuits on error', () => {
      const double = (n: number) => ok(n * 2);
      const error = err<string>('fail');
      const result = andThen(double, error);
      expect(result).toBe(error);
    });

    it('propagates errors from chained function', () => {
      const failIfNegative = (n: number) => (n < 0 ? err('negative') : ok(n));
      const result = andThen(failIfNegative, ok(-1));
      expect(result).toEqual({ ok: false, error: 'negative' });
    });
  });

  describe('andThenAsync', () => {
    it('chains async computations', async () => {
      const asyncDouble = (n: number): Promise<Result<number, never>> => Promise.resolve(ok(n * 2));
      const result = await andThenAsync(asyncDouble, ok(5));
      expect(result).toEqual({ ok: true, data: 10 });
    });

    it('short-circuits on error', async () => {
      const asyncDouble = (n: number): Promise<Result<number, never>> => Promise.resolve(ok(n * 2));
      const error = err<string>('fail');
      const result = await andThenAsync(asyncDouble, error);
      expect(result).toBe(error);
    });
  });

  // ==========================================================================
  // Pattern Matching
  // ==========================================================================
  describe('match', () => {
    it('executes ok handler for successful result', () => {
      const input: Result<number, string> = ok(42);
      const result = match(input, {
        ok: (data) => `value: ${data}`,
        err: (e) => `error: ${e}`,
      });
      expect(result).toBe('value: 42');
    });

    it('executes err handler for error result', () => {
      const input: Result<number, string> = err('fail');
      const result = match(input, {
        ok: (data) => `value: ${data}`,
        err: (e) => `error: ${e}`,
      });
      expect(result).toBe('error: fail');
    });
  });

  // ==========================================================================
  // Side Effects
  // ==========================================================================
  describe('tap', () => {
    it('executes side effect for Ok and returns same result', () => {
      const sideEffect = vi.fn();
      const original = ok(42);
      const result = tap(sideEffect, original);
      expect(sideEffect).toHaveBeenCalledWith(42);
      expect(result).toBe(original);
    });

    it('does not execute side effect for Err', () => {
      const sideEffect = vi.fn();
      const original = err('fail');
      const result = tap(sideEffect, original);
      expect(sideEffect).not.toHaveBeenCalled();
      expect(result).toBe(original);
    });
  });

  describe('tapErr', () => {
    it('executes side effect for Err and returns same result', () => {
      const sideEffect = vi.fn();
      const original = err('fail');
      const result = tapErr(sideEffect, original);
      expect(sideEffect).toHaveBeenCalledWith('fail');
      expect(result).toBe(original);
    });

    it('does not execute side effect for Ok', () => {
      const sideEffect = vi.fn();
      const original = ok(42);
      const result = tapErr(sideEffect, original);
      expect(sideEffect).not.toHaveBeenCalled();
      expect(result).toBe(original);
    });
  });

  // ==========================================================================
  // Unwrapping
  // ==========================================================================
  describe('unwrapOr', () => {
    it('returns data for Ok result', () => {
      expect(unwrapOr(0, ok(42))).toBe(42);
    });

    it('returns default value for Err result', () => {
      expect(unwrapOr(0, err('fail'))).toBe(0);
    });
  });

  describe('unwrap', () => {
    it('returns data for Ok result', () => {
      expect(unwrap(ok(42))).toBe(42);
    });

    it('throws error for Err result with Error', () => {
      const error = new Error('fail');
      expect(() => unwrap(err(error))).toThrow('fail');
    });

    it('wraps non-Error in Error for Err result', () => {
      expect(() => unwrap(err('string error'))).toThrow('string error');
    });
  });

  describe('unwrapErr', () => {
    it('returns error for Err result', () => {
      expect(unwrapErr(err('fail'))).toBe('fail');
    });

    it('throws for Ok result', () => {
      expect(() => unwrapErr(ok(42))).toThrow('Called unwrapErr on an Ok result');
    });
  });

  // ==========================================================================
  // Promise Interop
  // ==========================================================================
  describe('toPromise', () => {
    it('resolves with data for Ok result', async () => {
      await expect(toPromise(ok(42))).resolves.toBe(42);
    });

    it('rejects with error for Err result', async () => {
      const error = new Error('fail');
      await expect(toPromise(err(error))).rejects.toThrow('fail');
    });

    it('wraps non-Error in Error for Err result', async () => {
      await expect(toPromise(err('string error'))).rejects.toThrow('string error');
    });
  });

  describe('fromPromise', () => {
    it('creates Ok from resolved promise', async () => {
      const result = await fromPromise(Promise.resolve(42));
      expect(result).toEqual({ ok: true, data: 42 });
    });

    it('creates Err from rejected promise', async () => {
      const error = new Error('fail');
      const result = await fromPromise(Promise.reject(error));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });

    it('uses error mapper when provided', async () => {
      const result = await fromPromise(
        Promise.reject(new Error('fail')),
        (e) => `mapped: ${(e as Error).message}`,
      );
      expect(result).toEqual({ ok: false, error: 'mapped: fail' });
    });
  });
});
