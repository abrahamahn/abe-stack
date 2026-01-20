// packages/ui/src/hooks/useFormState.ts
import { useCallback, useState } from 'react';

import { createFormHandler } from '../utils/createFormHandler';

import type { FormHandlerOptions } from '../utils/createFormHandler';

/**
 * Return type for useFormState hook.
 */
export interface FormState {
  /** Whether a form operation is in progress */
  isLoading: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Set loading state */
  setIsLoading: (loading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Clear the current error */
  clearError: () => void;
  /**
   * Wrap an async handler with loading/error state management.
   *
   * @example
   * ```ts
   * const { wrapHandler } = useFormState();
   * const handleLogin = wrapHandler(login);
   * ```
   */
  wrapHandler: <T extends Record<string, unknown>, R>(
    handler: (data: T) => Promise<R>,
    options?: FormHandlerOptions,
  ) => (data: T) => Promise<R>;
}

/**
 * Hook that encapsulates common form state management.
 *
 * Provides:
 * - `isLoading` / `setIsLoading` - Loading state for form submission
 * - `error` / `setError` - Error state for form errors
 * - `clearError()` - Helper to clear error state
 * - `wrapHandler()` - Wraps async handlers with loading/error management
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { isLoading, error, wrapHandler, clearError } = useFormState();
 *   const { login } = useAuth();
 *
 *   const handleLogin = wrapHandler(login);
 *
 *   return <Form isLoading={isLoading} error={error} onSubmit={handleLogin} />;
 * }
 * ```
 */
export function useFormState(): FormState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const wrapHandler = useCallback(
    <T extends Record<string, unknown>, R>(
      handler: (data: T) => Promise<R>,
      options?: FormHandlerOptions,
    ): ((data: T) => Promise<R>) => {
      return createFormHandler(setIsLoading, setError)(handler, options);
    },
    [],
  );

  return {
    isLoading,
    error,
    setIsLoading,
    setError,
    clearError,
    wrapHandler,
  };
}
