// src/client/engine/src/query/useMutation.ts
/**
 * useMutation - React hook for data mutations.
 *
 * Provides a React Query-compatible API for mutations with
 * optimistic updates and cache invalidation support.
 */

import { useCallback, useRef, useState } from 'react';

import { useQueryCache } from './QueryCacheProvider';

import type { QueryKey } from './QueryCache';

// ============================================================================
// Types
// ============================================================================

/**
 * Mutation status values.
 */
export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Options for useMutation hook.
 */
export interface UseMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> {
  /** Function that performs the mutation */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Callback before mutation starts - can return context for rollback */
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
  /** Callback when mutation succeeds */
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined,
  ) => void | Promise<void>;
  /** Callback when mutation fails */
  onError?: (
    error: TError,
    variables: TVariables,
    context: TContext | undefined,
  ) => void | Promise<void>;
  /** Callback when mutation settles (success or error) */
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined,
  ) => void | Promise<void>;
  /** Number of retries on failure */
  retry?: number | boolean;
  /** Delay between retries in ms */
  retryDelay?: number;
  /** Query keys to invalidate on success */
  invalidateOnSuccess?: QueryKey[];
}

/**
 * Result of useMutation hook.
 */
export interface UseMutationResult<TData = unknown, TError = Error, TVariables = void> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => void;
  /** Execute the mutation and return a promise */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Whether the mutation is in progress */
  isLoading: boolean;
  /** Alias for isLoading (React Query v5 compatibility) */
  isPending: boolean;
  /** Whether the mutation succeeded */
  isSuccess: boolean;
  /** Whether the mutation failed */
  isError: boolean;
  /** Whether the mutation is idle */
  isIdle: boolean;
  /** The mutation error if any */
  error: TError | null;
  /** The mutation result data */
  data: TData | undefined;
  /** Reset the mutation state */
  reset: () => void;
  /** Current mutation status */
  status: MutationStatus;
  /** The variables passed to the last mutation */
  variables: TVariables | undefined;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_RETRY = 0;
const DEFAULT_RETRY_DELAY = 1000;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for performing mutations with optimistic updates.
 *
 * @example
 * ```tsx
 * function UpdateUserForm({ user }: { user: User }) {
 *   const mutation = useMutation({
 *     mutationFn: (data: UpdateUserInput) => updateUser(user.id, data),
 *     onSuccess: () => {
 *       toast.success('User updated');
 *     },
 *     invalidateOnSuccess: [['user', user.id]],
 *   });
 *
 *   const handleSubmit = (data: UpdateUserInput) => {
 *     mutation.mutate(data);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <button disabled={mutation.isLoading}>
 *         {mutation.isLoading ? 'Saving...' : 'Save'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables> {
  const {
    mutationFn,
    onMutate,
    onSuccess,
    onError,
    onSettled,
    retry = DEFAULT_RETRY,
    retryDelay = DEFAULT_RETRY_DELAY,
    invalidateOnSuccess,
  } = options;

  const cache = useQueryCache();

  const [status, setStatus] = useState<MutationStatus>('idle');
  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<TError | null>(null);
  const [variables, setVariables] = useState<TVariables | undefined>(undefined);

  // Track current mutation to handle race conditions
  const mutationId = useRef(0);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(undefined);
    setError(null);
    setVariables(undefined);
  }, []);

  const mutateAsync = useCallback(
    async (vars: TVariables): Promise<TData> => {
      const currentMutationId = ++mutationId.current;

      setStatus('pending');
      setVariables(vars);
      setError(null);

      let context: TContext | undefined;

      try {
        // Call onMutate for optimistic updates
        if (onMutate !== undefined) {
          context = await onMutate(vars);
        }

        const maxRetries = typeof retry === 'boolean' ? (retry ? 3 : 0) : retry;
        let lastError: TError | null = null;
        let result: TData | undefined;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            result = await mutationFn(vars);
            break;
          } catch (err) {
            lastError = err as TError;

            // Wait before retry (except on last attempt)
            if (attempt < maxRetries) {
              await new Promise((resolve) =>
                setTimeout(resolve, retryDelay * Math.pow(2, attempt)),
              );
            }
          }
        }

        // Check if this mutation is still current
        if (currentMutationId !== mutationId.current) {
          throw new Error('Mutation superseded');
        }

        if (lastError !== null && result === undefined) {
          throw lastError instanceof Error ? lastError : new Error(String(lastError));
        }

        // Success path
        setStatus('success');
        setData(result);

        // Invalidate queries
        if (invalidateOnSuccess !== undefined) {
          for (const queryKey of invalidateOnSuccess) {
            cache.invalidateQuery(queryKey);
          }
        }

        // Call callbacks
        await onSuccess?.(result as TData, vars, context);
        await onSettled?.(result, null, vars, context);

        return result as TData;
      } catch (err) {
        // Check if this mutation is still current
        if (currentMutationId !== mutationId.current) {
          throw err;
        }

        const mutationError = err as TError;
        setStatus('error');
        setError(mutationError);

        // Call error callbacks
        await onError?.(mutationError, vars, context);
        await onSettled?.(undefined, mutationError, vars, context);

        throw mutationError instanceof Error ? mutationError : new Error(String(mutationError));
      }
    },
    [
      mutationFn,
      onMutate,
      onSuccess,
      onError,
      onSettled,
      retry,
      retryDelay,
      invalidateOnSuccess,
      cache,
    ],
  );

  const mutate = useCallback(
    (vars: TVariables): void => {
      void mutateAsync(vars).catch(() => {
        // Error is already handled in mutateAsync
      });
    },
    [mutateAsync],
  );

  return {
    mutate,
    mutateAsync,
    isLoading: status === 'pending',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    isIdle: status === 'idle',
    error,
    data,
    reset,
    status,
    variables,
  };
}
