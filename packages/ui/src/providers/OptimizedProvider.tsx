// packages/ui/src/providers/OptimizedProvider.tsx
/**
 * Optimized React Providers
 *
 * Performance-optimized context providers with memoization and selective re-renders.
 */

import React, { createContext, useContext, useMemo, useReducer, useRef, useCallback } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

interface MemoizedContextResult<T> {
  Provider: React.FC<{ children: React.ReactNode; value: T }>;
  useContextValue: () => T;
  Context: React.Context<T | undefined>;
}

interface SelectiveContextResult<T extends Record<string, unknown>> {
  Provider: React.FC<{ children: React.ReactNode } & T>;
  useContextValue: () => T;
  Context: React.Context<T | undefined>;
}

interface ReducerContextResult<T, A> {
  Provider: React.FC<{
    children: React.ReactNode;
    reducer: (state: T, action: A) => T;
    initialState: T;
  }>;
  useContextValue: () => { state: T; dispatch: React.Dispatch<A> };
  useStateSelector: <R>(selector: (state: T) => R) => R;
  useDispatch: () => React.Dispatch<A>;
  Context: React.Context<{ state: T; dispatch: React.Dispatch<A> } | undefined>;
}

interface LazyContextResult<T> {
  Provider: React.FC<{
    children: React.ReactNode;
    initializer: () => T;
    deps?: React.DependencyList;
  }>;
  useContextValue: () => T;
  Context: React.Context<T | undefined>;
}

interface SubscriptionContextResult<T> {
  Provider: React.FC<{
    children: React.ReactNode;
    subscribe: (callback: (data: T) => void) => () => void;
    unsubscribe?: () => void;
  }>;
  useContextValue: () => {
    data: T | undefined;
    isLoading: boolean;
    error: Error | undefined;
    subscribe: (callback: (data: T) => void) => () => void;
  };
  Context: React.Context<
    | {
        data: T | undefined;
        isLoading: boolean;
        error: Error | undefined;
        subscribe: (callback: (data: T) => void) => () => void;
      }
    | undefined
  >;
}

// ============================================================================
// Memoized Context Provider
// ============================================================================

/**
 * Base context provider with memoization
 */
export function createMemoizedContext<T>(): MemoizedContextResult<T> {
  const Context = createContext<T | undefined>(undefined);

  function Provider({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: T;
  }): React.ReactElement {
    // Memoize the context value
    const memoizedValue = useMemo(() => value, [value]);

    return <Context.Provider value={memoizedValue}>{children}</Context.Provider>;
  }

  function useContextValue(): T {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error('useContextValue must be used within a Provider');
    }
    return context;
  }

  return {
    Provider,
    useContextValue,
    Context,
  };
}

// ============================================================================
// Selective Context Provider
// ============================================================================

/**
 * Context provider that only re-renders when specific properties change
 */
export function createSelectiveContext<
  T extends Record<string, unknown>,
>(): SelectiveContextResult<T> {
  const Context = createContext<T | undefined>(undefined);

  function Provider({
    children,
    ...value
  }: {
    children: React.ReactNode;
  } & T): React.ReactElement {
    // Create refs for previous values to detect changes
    const prevValueRef = useRef<T | undefined>(undefined);
    const changedKeysRef = useRef<Set<keyof T>>(new Set());

    // Detect which keys changed
    const changedKeys = new Set<keyof T>();
    const contextValue = value as unknown as T;
    const prevValue = prevValueRef.current;
    if (prevValue !== undefined) {
      for (const key in value) {
        if (prevValue[key as keyof T] !== contextValue[key as keyof T]) {
          changedKeys.add(key as keyof T);
        }
      }
    } else {
      // First render, all keys are "changed"
      for (const key in value) {
        changedKeys.add(key as keyof T);
      }
    }

    // Update refs
    prevValueRef.current = contextValue;
    changedKeysRef.current = changedKeys;

    // Memoize the context value - use ref for changedKeys to avoid triggering on every render
    const memoizedValue = useMemo(
      () => ({
        ...contextValue,
        // Add a method to check if a specific key changed
        hasChanged: (key: keyof T): boolean => changedKeysRef.current.has(key),
      }),
      [contextValue],
    );

    return <Context.Provider value={memoizedValue as unknown as T}>{children}</Context.Provider>;
  }

  function useContextValue(): T {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error('useContextValue must be used within a Provider');
    }
    return context;
  }

  return {
    Provider,
    useContextValue,
    Context,
  };
}

// ============================================================================
// Reducer-based Context Provider
// ============================================================================

/**
 * Context provider with reducer pattern for complex state management
 */
export function createReducerContext<T, A>(): ReducerContextResult<T, A> {
  type State = T;
  type Action = A;

  const Context = createContext<
    | {
        state: State;
        dispatch: React.Dispatch<Action>;
      }
    | undefined
  >(undefined);

  function Provider({
    children,
    reducer,
    initialState,
  }: {
    children: React.ReactNode;
    reducer: (state: State, action: Action) => State;
    initialState: State;
  }): React.ReactElement {
    const [state, dispatch] = useReducer(reducer, initialState);

    const contextValue = useMemo(
      () => ({
        state,
        dispatch,
      }),
      [state],
    );

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  }

  function useContextValue(): { state: State; dispatch: React.Dispatch<Action> } {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error('useContextValue must be used within a Provider');
    }
    return context;
  }

  function useStateSelector<R>(selector: (state: State) => R): R {
    const { state } = useContextValue();
    return useMemo(() => selector(state), [state, selector]);
  }

  function useDispatch(): React.Dispatch<Action> {
    const { dispatch } = useContextValue();
    return dispatch;
  }

  return {
    Provider,
    useContextValue,
    useStateSelector,
    useDispatch,
    Context,
  };
}

// ============================================================================
// Lazy Context Provider
// ============================================================================

/**
 * Context provider that lazily initializes expensive values
 */
export function createLazyContext<T>(): LazyContextResult<T> {
  const Context = createContext<T | undefined>(undefined);

  function Provider({
    children,
    initializer,
    deps = [],
  }: {
    children: React.ReactNode;
    initializer: () => T;
    deps?: React.DependencyList;
  }): React.ReactElement {
    const value = useMemo(() => {
      void deps;
      return initializer();
    }, [initializer, deps]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useContextValue(): T {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error('useContextValue must be used within a Provider');
    }
    return context;
  }

  return {
    Provider,
    useContextValue,
    Context,
  };
}

// ============================================================================
// Subscription-based Context Provider
// ============================================================================

/**
 * Context provider with subscription pattern for external data sources
 */
export function createSubscriptionContext<T>(): SubscriptionContextResult<T> {
  const Context = createContext<
    | {
        data: T | undefined;
        isLoading: boolean;
        error: Error | undefined;
        subscribe: (callback: (data: T) => void) => () => void;
      }
    | undefined
  >(undefined);

  function Provider({
    children,
    subscribe: subscribeFn,
    unsubscribe,
  }: {
    children: React.ReactNode;
    subscribe: (callback: (data: T) => void) => () => void;
    unsubscribe?: () => void;
  }): React.ReactElement {
    const [data, setData] = React.useState<T | undefined>();
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | undefined>();

    const subscribe = useCallback(
      (callback: (data: T) => void): (() => void) => {
        setIsLoading(true);
        setError(undefined);

        try {
          return subscribeFn((newData) => {
            setData(newData);
            setIsLoading(false);
            callback(newData);
          });
        } catch (err) {
          setError(err as Error);
          setIsLoading(false);
          return (): void => {
            // No-op cleanup
          };
        }
      },
      [subscribeFn],
    );

    const contextValue = useMemo(
      () => ({
        data,
        isLoading,
        error,
        subscribe,
      }),
      [data, isLoading, error, subscribe],
    );

    // Cleanup on unmount
    React.useEffect(() => {
      return (): void => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [unsubscribe]);

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  }

  function useContextValue(): {
    data: T | undefined;
    isLoading: boolean;
    error: Error | undefined;
    subscribe: (callback: (data: T) => void) => () => void;
  } {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error('useContextValue must be used within a Provider');
    }
    return context;
  }

  return {
    Provider,
    useContextValue,
    Context,
  };
}

// ============================================================================
// Memoized Component Wrappers
// ============================================================================

interface MemoizedProps {
  children: React.ReactNode;
}

/**
 * Memoized component wrapper with shallow comparison
 */
export const Memoized = React.memo(
  ({ children }: MemoizedProps): React.ReactElement => <>{children}</>,
  (prevProps: MemoizedProps, nextProps: MemoizedProps): boolean => {
    // Shallow comparison
    const prevKeys = Object.keys(prevProps) as (keyof MemoizedProps)[];
    const nextKeys = Object.keys(nextProps) as (keyof MemoizedProps)[];

    if (prevKeys.length !== nextKeys.length) return false;

    for (const key of prevKeys) {
      if (!(key in nextProps) || prevProps[key] !== nextProps[key]) {
        return false;
      }
    }

    return true;
  },
);

interface SelectiveMemoProps<T extends Record<string, unknown>> {
  children: (props: T) => React.ReactNode;
  watchKeys: (keyof T)[];
}

/**
 * Component that only re-renders when specific props change
 */
export function SelectiveMemo<T extends Record<string, unknown>>({
  children,
  watchKeys,
  ...props
}: SelectiveMemoProps<T> & T): React.ReactElement {
  const typedProps = props as unknown as T;
  const propsRef = useRef(typedProps);
  propsRef.current = typedProps;
  const watchedValuesKey = JSON.stringify(watchKeys.map((key) => typedProps[key]));
  const memoizedChildren = useMemo(() => {
    void watchedValuesKey;
    return children(propsRef.current);
  }, [children, watchedValuesKey]);

  return <>{memoizedChildren}</>;
}

// ============================================================================
// Performance Monitoring Hook
// ============================================================================

interface RenderPerformanceResult {
  renderCount: number;
  resetCounter: () => void;
}

/**
 * Hook to monitor component render performance (dev mode only)
 */
export function useRenderPerformance(_componentName: string): RenderPerformanceResult {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  renderCountRef.current++;

  React.useEffect(() => {
    const now = Date.now();
    lastRenderTimeRef.current = now;

    // Only log in development - use globalThis for safe access
    const isDev =
      typeof globalThis !== 'undefined' &&
      'process' in globalThis &&
      (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV ===
        'development';

    if (isDev) {
      // Development-only logging for performance monitoring
    }
  });

  return {
    renderCount: renderCountRef.current,
    resetCounter: (): void => {
      renderCountRef.current = 0;
    },
  };
}

// ============================================================================
// Example Usage Types
// ============================================================================

// Example: Theme context with selective updates
export interface ThemeContextValue {
  theme: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  setTheme: (theme: 'light' | 'dark') => void;
}

// Example: User context with reducer
export interface UserState {
  user: { id: string; name: string } | null;
  isLoading: boolean;
  error: string | null;
}

export type UserAction =
  | { type: 'SET_USER'; payload: { id: string; name: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'LOGOUT' };
