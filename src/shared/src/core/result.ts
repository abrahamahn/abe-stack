// packages/shared/src/core/result.ts
/**
 * Functional Result Type
 *
 * A type-safe way to handle operations that can fail without using exceptions.
 * Provides a functional programming approach to error handling that prevents
 * try/catch nesting and makes service logic more readable.
 */

/**
 * Represents a successful computation result
 */
export interface Ok<T> {
  readonly ok: true;
  readonly data: T;
}

/**
 * Represents a failed computation result
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * A union type representing either a success or failure
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Creates a successful result containing a value.
 *
 * @param data - The data to wrap
 * @returns An Ok result
 */
export function ok<T, E = never>(data: T): Result<T, E> {
  return { ok: true, data };
}

/**
 * Creates a failure result containing an error.
 *
 * @param error - The error to wrap
 * @returns An Err result
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Type guard that checks if a result is successful.
 *
 * @param result - The result to check
 * @returns True if the result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/**
 * Type guard that checks if a result is a failure.
 *
 * @param result - The result to check
 * @returns True if the result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Maps a function over the successful data of a Result.
 * If the result is an error, the error is returned unchanged.
 *
 * @param fn - Function to apply to the data
 * @param result - The Result to map over
 * @returns A new Result with the transformed data or the original error
 */
export function map<T, U, E>(fn: (data: T) => U, result: Result<T, E>): Result<U, E> {
  if (result.ok) {
    return ok<U, E>(fn(result.data));
  }
  return result;
}

/**
 * Maps a function over the error value of a Result.
 * If the result is success, the data is returned unchanged.
 *
 * @param fn - Function to apply to the error value
 * @param result - The Result to map over
 * @returns A new Result with the original data or the transformed error
 */
export function mapErr<T, E, F>(fn: (error: E) => F, result: Result<T, E>): Result<T, F> {
  if (!result.ok) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chains sequential computations that return Results.
 * Useful for composing multiple fallible operations.
 *
 * @param fn - Function that returns a Result
 * @param result - The Result to chain
 * @returns The result of the chained computation
 */
export function andThen<T, U, E>(
  fn: (data: T) => Result<U, E>,
  result: Result<T, E>,
): Result<U, E> {
  if (result.ok) {
    return fn(result.data);
  }
  return result;
}

/**
 * Async version of andThen.
 * Allows chaining a Promise-returning function onto a Result.
 */
export async function andThenAsync<T, U, E>(
  fn: (data: T) => Promise<Result<U, E>>,
  result: Result<T, E>,
): Promise<Result<U, E>> {
  if (result.ok) {
    return fn(result.data);
  }
  return result;
}

/**
 * Pattern matching for Result.
 * Executes ok function if success, err function if failure.
 *
 * @param result - The Result to match
 * @param arms - Object containing success and failure handlers
 * @returns The return value of the executed handler
 */
export function match<T, E, R>(
  result: Result<T, E>,
  arms: { ok: (data: T) => R; err: (error: E) => R },
): R {
  return result.ok ? arms.ok(result.data) : arms.err(result.error);
}

/**
 * Executes a side effect function if the result is Ok.
 *
 * @param fn - Function to execute
 * @param result - The Result
 * @returns The same result unchanged
 */
export function tap<T, E>(fn: (data: T) => void, result: Result<T, E>): Result<T, E> {
  if (result.ok) {
    fn(result.data);
  }
  return result;
}

/**
 * Executes a side effect function if the result is Err.
 *
 * @param fn - Function to execute
 * @param result - The Result
 * @returns The same result unchanged
 */
export function tapErr<T, E>(fn: (error: E) => void, result: Result<T, E>): Result<T, E> {
  if (!result.ok) {
    fn(result.error);
  }
  return result;
}

/**
 * Returns the success data or a provided default if it's an error.
 *
 * @param defaultValue - The value to return if the Result is Err
 * @param result - The Result to unwrap
 * @returns The success data or default
 */
export function unwrapOr<T, E>(defaultValue: T, result: Result<T, E>): T {
  if (result.ok) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Unwraps the success data or throws the inner error.
 * If the error is not an Error instance, it's wrapped in one.
 *
 * @param result - The Result to unwrap
 * @returns The success data
 * @throws The error contained in Err
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.data;
  }
  throw result.error instanceof Error ? result.error : new Error(String(result.error));
}

/**
 * Unwraps the error value or throws if it was a success.
 *
 * @param result - The Result to unwrap error from
 * @returns The error value
 * @throws Error if the result was Ok
 */
export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (!result.ok) {
    return result.error;
  }
  throw new Error(`Called unwrapErr on an Ok result with data: ${JSON.stringify(result.data)}`);
}

/**
 * Converts a Result into a Promise of the data.
 * Resolves with data if Ok, rejects with error if Err.
 */
export function toPromise<T, E>(result: Result<T, E>): Promise<T> {
  if (result.ok) {
    return Promise.resolve(result.data);
  }
  return Promise.reject(
    result.error instanceof Error ? result.error : new Error(String(result.error)),
  );
}

/**
 * Creates a Result from a Promise, catching any errors.
 * When no errorMapper is provided, caught errors are wrapped as Error instances.
 *
 * @param promise - The promise to convert
 * @returns A Result wrapping the resolved value or an Error
 */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T>>;
/**
 * Creates a Result from a Promise, catching any errors.
 * Uses the provided errorMapper to transform caught errors into the desired error type.
 *
 * @param promise - The promise to convert
 * @param errorMapper - Function to transform unknown errors into type E
 * @returns A Result wrapping the resolved value or a mapped error
 */
export async function fromPromise<T, E>(
  promise: Promise<T>,
  errorMapper: (error: unknown) => E,
): Promise<Result<T, E>>;
export async function fromPromise(
  promise: Promise<unknown>,
  errorMapper?: (error: unknown) => unknown,
): Promise<Result<unknown, unknown>> {
  try {
    const data = await promise;
    return ok(data);
  } catch (error) {
    if (errorMapper !== undefined) {
      return err(errorMapper(error));
    }
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
