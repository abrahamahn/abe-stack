// main/client/react/src/providers/OptimizedProvider.tsx
/**
 * Optimized React Providers
 *
 * Performance-optimized context providers with memoization and selective re-renders.
 */

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

import type { Context, DependencyList, Dispatch, FC, ReactElement, ReactNode } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

interface MemoizedContextResult<T> {
  Provider: FC<{ children: ReactNode; value: T }>;
  useContextValue: () => T;
  Context: Context<T | undefined>;
}

interface SelectiveContextResult<T extends Record<string, unknown>> {
  Provider: FC<{ children: ReactNode } & T>;
  useContextValue: () => T;
  Context: Context<T | undefined>;
}

interface ReducerContextResult<T, A> {
  Provider: FC<{
    children: ReactNode;
    reducer: (state: T, action: A) => T;
    initialState: T;
  }>;
  useContextValue: () => { state: T; dispatch: Dispatch<A> };
  useStateSelector: <R>(selector: (state: T) => R) => R;
  useDispatch: () => Dispatch<A>;
  Context: Context<{ state: T; dispatch: Dispatch<A> } | undefined>;
}

interface LazyContextResult<T> {
  Provider: FC<{
    children: ReactNode;
    initializer: () => T;
    deps?: DependencyList;
  }>;
  useContextValue: () => T;
  Context: Context<T | undefined>;
}

interface SubscriptionContextResult<T> {
  Provider: FC<{
    children: ReactNode;
    subscribe: (callback: (data: T) => void) => () => void;
    unsubscribe?: () => void;
  }>;
  useContextValue: () => {
    data: T | undefined;
    isLoading: boolean;
    error: Error | undefined;
    subscribe: (callback: (data: T) => void) => () => void;
  };
  Context: Context<
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

  const Provider = ({ children, value }: { children: ReactNode; value: T }): ReactElement => {
    // Memoize the context value
    const memoizedValue = useMemo(() => value, [value]);

    return <Context.Provider value={memoizedValue}>{children}</Context.Provider>;
  };

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

  const Provider = ({
    children,
    ...value
  }: {
    children: ReactNode;
  } & T): ReactElement => {
    const contextValue = value as unknown as T;
    // Track which keys changed using state (not refs) to avoid render-time ref access
    const [changedKeys, setChangedKeys] = useState<Set<keyof T>>(() => {
      const initial = new Set<keyof T>();
      for (const key in value) {
        initial.add(key as keyof T);
      }
      return initial;
    });
    const [prevValue, setPrevValue] = useState<T | undefined>(undefined);

    // Update changed keys and prev value after render via layout effect.
    // setTimeout defers the setState calls to avoid synchronous cascading re-renders.
    useLayoutEffect(() => {
      const id = setTimeout(() => {
        const nextChangedKeys = new Set<keyof T>();
        if (prevValue !== undefined) {
          for (const key in value) {
            if (prevValue[key as keyof T] !== contextValue[key as keyof T]) {
              nextChangedKeys.add(key as keyof T);
            }
          }
        } else {
          for (const key in value) {
            nextChangedKeys.add(key as keyof T);
          }
        }
        setChangedKeys(nextChangedKeys);
        setPrevValue(contextValue);
      }, 0);
      return (): void => {
        clearTimeout(id);
      };
    });

    // Memoize the context value with changed key tracking
    const memoizedValue = useMemo(
      () => ({
        ...contextValue,
        // Add a method to check if a specific key changed
        hasChanged: (key: keyof T): boolean => changedKeys.has(key),
      }),
      [contextValue, changedKeys],
    );

    return <Context.Provider value={memoizedValue as unknown as T}>{children}</Context.Provider>;
  };

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
        dispatch: Dispatch<Action>;
      }
    | undefined
  >(undefined);

  const Provider = ({
    children,
    reducer,
    initialState,
  }: {
    children: ReactNode;
    reducer: (state: State, action: Action) => State;
    initialState: State;
  }): ReactElement => {
    const [state, dispatch] = useReducer(reducer, initialState);

    const contextValue = useMemo(
      () => ({
        state,
        dispatch,
      }),
      [state],
    );

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  };

  function useContextValue(): { state: State; dispatch: Dispatch<Action> } {
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

  function useDispatch(): Dispatch<Action> {
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

  const Provider = ({
    children,
    initializer,
    deps = [],
  }: {
    children: ReactNode;
    initializer: () => T;
    deps?: DependencyList;
  }): ReactElement => {
    const value = useMemo(() => {
      void deps;
      return initializer();
    }, [initializer, deps]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

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

  const Provider = ({
    children,
    subscribe: subscribeFn,
    unsubscribe,
  }: {
    children: ReactNode;
    subscribe: (callback: (data: T) => void) => () => void;
    unsubscribe?: () => void;
  }): ReactElement => {
    const [data, setData] = useState<T | undefined>();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | undefined>();

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
    useEffect(() => {
      return (): void => {
        if (unsubscribe != null) {
          unsubscribe();
        }
      };
    }, [unsubscribe]);

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  };

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
  children: ReactNode;
}

/**
 * Memoized component wrapper with shallow comparison
 */
export const Memoized = memo(
  function MemoizedComponent({ children }: MemoizedProps): ReactElement {
    return <>{children}</>;
  },
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
  children: (props: T) => ReactNode;
  watchKeys: (keyof T)[];
}

/**
 * Component that only re-renders when specific props change
 */
export const SelectiveMemo = <T extends Record<string, unknown>>({
  children,
  watchKeys: _watchKeys,
  ...props
}: SelectiveMemoProps<T> & T): ReactElement => {
  const typedProps = props as unknown as T;
  const memoizedChildren = useMemo(() => children(typedProps), [children, typedProps]);
  return <>{memoizedChildren}</>;
};

// ============================================================================
// Performance Monitoring Hook
// ============================================================================

interface RenderPerformanceResult {
  renderCount: number;
  resetCounter: () => void;
}

/** Module-level map keyed by component instance ID (from useId). */
const renderCounts = new Map<string, number>();

/**
 * Hook to monitor component render performance (dev mode only).
 *
 * Uses a module-level Map keyed by the stable useId() identity to track render
 * count without refs (react-hooks/refs) or setState-in-effect violations.
 */
export function useRenderPerformance(_componentName: string): RenderPerformanceResult {
  const id = useId();
  const current = (renderCounts.get(id) ?? 0) + 1;
  renderCounts.set(id, current);

  const resetCounter = useCallback(() => {
    renderCounts.set(id, 0);
  }, [id]);

  return { renderCount: current, resetCounter };
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
