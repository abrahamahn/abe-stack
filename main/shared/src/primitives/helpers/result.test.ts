// main/shared/src/primitives/helpers/result.test.ts
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
        ok: (data) => `value: ${String(data)}`,
        err: (e) => `error: ${e}`,
      });
      expect(result).toBe('value: 42');
    });

    it('executes err handler for error result', () => {
      const input: Result<number, string> = err('fail');
      const result = match(input, {
        ok: (data) => `value: ${String(data)}`,
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

  // ==========================================================================
  // ADVERSARIAL: ok with edge-case data
  // ==========================================================================
  describe('adversarial — ok with edge-case data', () => {
    it('wraps undefined as valid Ok data', () => {
      const result = ok(undefined);
      expect(result.ok).toBe(true);
      expect(result).toEqual({ ok: true, data: undefined });
      expect(isOk(result)).toBe(true);
    });

    it('wraps 0 (falsy) as valid Ok data — not confused with error', () => {
      const result = ok(0);
      expect(result.ok).toBe(true);
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(0);
    });

    it('wraps false (falsy) as valid Ok data', () => {
      const result = ok(false);
      expect(result.ok).toBe(true);
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(false);
    });

    it('wraps empty string as valid Ok data', () => {
      const result = ok('');
      expect(result.ok).toBe(true);
      expect(unwrap(result)).toBe('');
    });

    it('wraps empty array as valid Ok data', () => {
      const result = ok([]);
      expect(result.ok).toBe(true);
      expect(unwrap(result)).toEqual([]);
    });

    it('wraps null as valid Ok data', () => {
      const result = ok(null);
      expect(result.ok).toBe(true);
      // isOk should be true even for null data
      expect(isOk(result)).toBe(true);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: chaining ok → err → ok
  // ==========================================================================
  describe('adversarial — andThen chain ok→err→ok', () => {
    it('once Err is introduced in a chain, remaining steps are skipped', () => {
      const step1 = vi.fn((n: number) => ok(n + 1));
      const step2 = vi.fn((_n: number): Result<number, string> => err('step2 failed'));
      const step3 = vi.fn((n: number) => ok(n * 10));

      const result = andThen(step3, andThen(step2, andThen(step1, ok(1))));

      expect(step1).toHaveBeenCalledWith(1);
      expect(step2).toHaveBeenCalledWith(2);
      expect(step3).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, error: 'step2 failed' });
    });

    it('three successful andThen calls produce the final transformation', () => {
      const result = andThen(
        (n: number) => ok(n * 3),
        andThen(
          (n: number) => ok(n + 10),
          andThen((n: number) => ok(n * 2), ok(5)),
        ),
      );
      // 5 * 2 = 10 → 10 + 10 = 20 → 20 * 3 = 60
      expect(result).toEqual({ ok: true, data: 60 });
    });
  });

  // ==========================================================================
  // ADVERSARIAL: andThenAsync with rejected promise
  // ==========================================================================
  describe('adversarial — andThenAsync with rejected promise', () => {
    it('does NOT catch rejections from the fn — they propagate as unhandled', async () => {
      // andThenAsync itself does not wrap in try/catch; rejection propagates
      const rejectingFn = (_n: number): Promise<Result<number, string>> =>
        Promise.reject(new Error('async explosion'));

      await expect(andThenAsync(rejectingFn, ok(5))).rejects.toThrow('async explosion');
    });

    it('short-circuits before calling fn when result is Err', async () => {
      const rejectingFn = vi.fn(
        (_n: number): Promise<Result<number, string>> =>
          Promise.reject(new Error('should not be called')),
      );

      const result = await andThenAsync(rejectingFn, err<string>('pre-existing error'));
      expect(rejectingFn).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, error: 'pre-existing error' });
    });

    it('propagates async Ok result correctly', async () => {
      const asyncFn = (n: number): Promise<Result<string, never>> =>
        Promise.resolve(ok(`processed: ${String(n)}`));
      const result = await andThenAsync(asyncFn, ok(42));
      expect(result).toEqual({ ok: true, data: 'processed: 42' });
    });

    it('propagates async Err result correctly', async () => {
      const asyncFn = (_n: number): Promise<Result<string, string>> =>
        Promise.resolve(err('async failure'));
      const result = await andThenAsync(asyncFn, ok(42));
      expect(result).toEqual({ ok: false, error: 'async failure' });
    });
  });

  // ==========================================================================
  // ADVERSARIAL: fromPromise with non-Error rejections
  // ==========================================================================
  describe('adversarial — fromPromise with non-Error rejections', () => {
    // Simulate a promise that rejects with a non-Error value (as third-party libs may do)
    // Using .then() throw avoids the prefer-promise-reject-errors lint rule while
    // still testing the same runtime behavior.
    const rejectWith = (value: unknown): Promise<never> =>
      Promise.resolve().then((): never => {
        throw value;
      });

    it('wraps string rejection in an Error', async () => {
      const result = await fromPromise(rejectWith('plain string error'));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('plain string error');
      }
    });

    it('wraps number rejection in an Error', async () => {
      const result = await fromPromise(rejectWith(404));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('404');
      }
    });

    it('wraps null rejection in an Error', async () => {
      const result = await fromPromise(rejectWith(null));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('wraps undefined rejection in an Error', async () => {
      const result = await fromPromise(rejectWith(undefined));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('passes Error instances through without re-wrapping', async () => {
      const original = new TypeError('type mismatch');
      const result = await fromPromise(Promise.reject(original));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(original);
        expect(result.error).toBeInstanceOf(TypeError);
      }
    });

    it('uses errorMapper for non-Error rejections', async () => {
      const result = await fromPromise(rejectWith('raw string'), (e) => ({
        code: 'MAPPED',
        original: e,
      }));
      expect(result).toEqual({ ok: false, error: { code: 'MAPPED', original: 'raw string' } });
    });

    it('wraps resolved undefined as Ok', async () => {
      const result = await fromPromise(Promise.resolve(undefined));
      expect(result).toEqual({ ok: true, data: undefined });
    });

    it('wraps resolved null as Ok', async () => {
      const result = await fromPromise(Promise.resolve(null));
      expect(result).toEqual({ ok: true, data: null });
    });
  });

  // ==========================================================================
  // ADVERSARIAL: map and mapErr type narrowing
  // ==========================================================================
  describe('adversarial — map type narrowing and transformations', () => {
    it('map returns a new object, not the same reference', () => {
      const original = ok(10);
      const mapped = map((n: number) => n + 1, original);
      expect(mapped).not.toBe(original);
    });

    it('map with identity function preserves data value', () => {
      const result = map((x: number) => x, ok(42));
      expect(result).toEqual({ ok: true, data: 42 });
    });

    it('map can change the type of data', () => {
      const result: Result<string, never> = map((n: number) => String(n), ok(99));
      expect(result).toEqual({ ok: true, data: '99' });
    });

    it('mapErr returns a new object for Err, not the same reference', () => {
      const original = err('raw');
      const mapped = mapErr((e: string) => new Error(e), original);
      expect(mapped).not.toBe(original);
    });

    it('mapErr on Ok returns the exact same Ok reference (passthrough)', () => {
      const original = ok(42);
      const result = mapErr((e: string) => new Error(e), original);
      expect(result).toBe(original);
    });

    it('chained map calls compose correctly', () => {
      const result = map(
        (s: string) => s.toUpperCase(),
        map((n: number) => `value:${String(n)}`, ok(5)),
      );
      expect(result).toEqual({ ok: true, data: 'VALUE:5' });
    });
  });

  // ==========================================================================
  // ADVERSARIAL: unwrap and unwrapErr
  // ==========================================================================
  describe('adversarial — unwrap edge cases', () => {
    it('unwrap throws the exact Error instance from Err (not a copy)', () => {
      const original = new RangeError('out of bounds');
      let caught: unknown;
      try {
        unwrap(err(original));
      } catch (e) {
        caught = e;
      }
      expect(caught).toBe(original);
    });

    it('unwrap with object error (non-Error) wraps it via String()', () => {
      expect(() => unwrap(err({ code: 'E' }))).toThrow('[object Object]');
    });

    it('unwrapErr on Ok result includes the serialized data in the error message', () => {
      expect(() => unwrapErr(ok(42))).toThrow('42');
    });

    it('unwrapErr on Ok result with object data stringifies it', () => {
      expect(() => unwrapErr(ok({ id: 1 }))).toThrow(/"id":1/);
    });

    it('unwrapErr returns the exact error value reference for Err', () => {
      const original = new Error('test');
      const result = unwrapErr(err(original));
      expect(result).toBe(original);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: unwrapOr
  // ==========================================================================
  describe('adversarial — unwrapOr edge cases', () => {
    it('returns Ok data even when it is falsy (0)', () => {
      expect(unwrapOr(99, ok(0))).toBe(0);
    });

    it('returns Ok data even when it is null', () => {
      expect(unwrapOr('fallback', ok(null))).toBeNull();
    });

    it('returns Ok data even when it is false', () => {
      expect(unwrapOr(true, ok(false))).toBe(false);
    });

    it('returns default when Err has a non-Error error value', () => {
      expect(unwrapOr('default', err(42))).toBe('default');
    });

    it('the default value itself is falsy — returns it for Err', () => {
      expect(unwrapOr(0, err('any'))).toBe(0);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: tap and tapErr that throw
  // ==========================================================================
  describe('adversarial — tap/tapErr that throw', () => {
    it('tap does not suppress exceptions thrown by the side-effect function', () => {
      const throwingFn = (_data: number): void => {
        throw new Error('side effect exploded');
      };
      expect(() => tap(throwingFn, ok(42))).toThrow('side effect exploded');
    });

    it('tapErr does not suppress exceptions thrown by the side-effect function', () => {
      const throwingFn = (_error: string): void => {
        throw new Error('tapErr exploded');
      };
      expect(() => tapErr(throwingFn, err('fail'))).toThrow('tapErr exploded');
    });

    it('tap still returns the original reference when the fn does not throw', () => {
      const original = ok({ id: 1 });
      const result = tap((_data) => {
        // mutate attempt — but tap should return the same reference regardless
      }, original);
      expect(result).toBe(original);
    });

    it('tapErr still returns the original Err reference when fn does not throw', () => {
      const original = err('something');
      const result = tapErr((_e) => {
        // side effect only
      }, original);
      expect(result).toBe(original);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: toPromise
  // ==========================================================================
  describe('adversarial — toPromise edge cases', () => {
    it('toPromise with Ok(null) resolves with null', async () => {
      await expect(toPromise(ok(null))).resolves.toBeNull();
    });

    it('toPromise with Ok(undefined) resolves with undefined', async () => {
      await expect(toPromise(ok(undefined))).resolves.toBeUndefined();
    });

    it('toPromise with Ok(0) resolves with 0 (falsy value)', async () => {
      await expect(toPromise(ok(0))).resolves.toBe(0);
    });

    it('toPromise with Err(non-Error object) rejects with Error wrapping it', async () => {
      await expect(toPromise(err({ code: 'E' }))).rejects.toThrow('[object Object]');
    });

    it('toPromise with Err(TypeError) rejects with the exact TypeError instance', async () => {
      const original = new TypeError('type error');
      const rejection = toPromise(err(original));
      await expect(rejection).rejects.toBe(original);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: match exhaustiveness
  // ==========================================================================
  describe('adversarial — match edge cases', () => {
    it('both handlers are called at most once per invocation', () => {
      const okHandler = vi.fn(() => 'ok');
      const errHandler = vi.fn(() => 'err');

      match(ok(1), { ok: okHandler, err: errHandler });
      expect(okHandler).toHaveBeenCalledTimes(1);
      expect(errHandler).toHaveBeenCalledTimes(0);

      match(err('x'), { ok: okHandler, err: errHandler });
      expect(okHandler).toHaveBeenCalledTimes(1);
      expect(errHandler).toHaveBeenCalledTimes(1);
    });

    it('match passes the exact data value to the ok handler', () => {
      const captured: unknown[] = [];
      match(ok({ nested: { value: 42 } }), {
        ok: (data) => {
          captured.push(data);
          return 'done';
        },
        err: () => 'never',
      });
      expect(captured[0]).toEqual({ nested: { value: 42 } });
    });

    it('match passes the exact error value to the err handler', () => {
      const originalError = new Error('original');
      let captured: unknown;
      match(err(originalError), {
        ok: () => 'never',
        err: (e) => {
          captured = e;
          return 'done';
        },
      });
      expect(captured).toBe(originalError);
    });

    it('match can return any type from handlers (number)', () => {
      const result = match(ok('hello'), {
        ok: (s) => s.length,
        err: () => -1,
      });
      expect(result).toBe(5);
    });
  });
});
