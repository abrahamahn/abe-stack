// main/client/react/src/utils/createFormHandler.ts

/**
 * Options for creating a form handler.
 */
export interface FormHandlerOptions {
  /** Called before the handler executes */
  onStart?: () => void;
  /** Called when handler completes successfully */
  onSuccess?: () => void;
  /** Called when handler encounters an error */
  onError?: (error: Error) => void;
  /** Called after handler completes (success or failure) */
  onFinally?: () => void;
}

/**
 * Creates a form handler that wraps an async function with loading/error state management.
 *
 * This utility extracts the common pattern used across forms:
 * - Set loading state before execution
 * - Clear error state before execution
 * - Catch and format errors
 * - Reset loading state after completion
 *
 * @param setIsLoading - State setter for loading state
 * @param setError - State setter for error state
 * @param defaultOptions - Optional default callbacks for lifecycle events
 * @returns A function that wraps handlers with loading/error management
 *
 * @example
 * ```ts
 * const { isLoading, error, setIsLoading, setError } = useFormState();
 * const wrapHandler = createFormHandler(setIsLoading, setError);
 *
 * const handleLogin = wrapHandler(login);
 * const handleRegister = wrapHandler(register, { onSuccess: () => navigate('/dashboard') });
 * ```
 */
export function createFormHandler(
  setIsLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  defaultOptions?: FormHandlerOptions,
) {
  return function wrapHandler<T, R>(
    handler: (data: T) => Promise<R>,
    options?: FormHandlerOptions,
  ): (data: T) => Promise<R> {
    const mergedOptions = { ...defaultOptions, ...options };

    return async (data: T): Promise<R> => {
      setIsLoading(true);
      setError(null);
      mergedOptions.onStart?.();

      try {
        const result = await handler(data);
        mergedOptions.onSuccess?.();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error.message);
        mergedOptions.onError?.(error);
        throw err;
      } finally {
        setIsLoading(false);
        mergedOptions.onFinally?.();
      }
    };
  };
}
