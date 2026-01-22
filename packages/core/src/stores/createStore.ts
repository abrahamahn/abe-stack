// packages/core/src/stores/createStore.ts
/**
 * Custom Store Implementation
 *
 * A lightweight store implementation with React integration.
 * Provides both hook-based subscriptions and direct state access via getState().
 *
 * @packageDocumentation
 */

/**
 * Store API interface - the methods available on the store object
 */
export interface StoreApi<T> {
  /** Get current state snapshot */
  getState: () => T;
  /** Update state - accepts partial state or updater function */
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  /** Subscribe to state changes */
  subscribe: (listener: () => void) => () => void;
}

/**
 * A React hook that also has store methods attached
 */
export type UseBoundStore<T> = {
  (): T;
  getState: () => T;
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: () => void) => () => void;
};

/**
 * State creator function type - receives set and get functions
 */
type StateCreator<T> = (
  set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
  get: () => T,
) => T;

// Lazy import for React's useSyncExternalStore
// This allows the store to work in non-React environments for testing
let useSyncExternalStore:
  | (<T>(
      subscribe: (callback: () => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T,
    ) => T)
  | undefined;

function getUseSyncExternalStore(): NonNullable<typeof useSyncExternalStore> {
  if (useSyncExternalStore === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react') as {
      useSyncExternalStore: NonNullable<typeof useSyncExternalStore>;
    };
    useSyncExternalStore = React.useSyncExternalStore;
  }
  return useSyncExternalStore;
}

/**
 * Creates a store with React hook integration.
 *
 * This provides:
 * - React hook for subscribing to state changes
 * - getState() for accessing state outside React components
 * - setState() for updating state
 * - Automatic re-renders when state changes
 *
 * @param createState - Function that creates the initial state and actions
 * @returns A hook function with attached store methods
 *
 * @example Basic store
 * ```typescript
 * const useCounterStore = createStore<{ count: number; increment: () => void }>((set) => ({
 *   count: 0,
 *   increment: () => set((state) => ({ count: state.count + 1 })),
 * }));
 *
 * // Use as hook
 * function Counter() {
 *   const { count, increment } = useCounterStore();
 *   return <button onClick={increment}>{count}</button>;
 * }
 *
 * // Direct access outside React
 * useCounterStore.getState().increment();
 * ```
 */
export function createStore<T extends object>(createState: StateCreator<T>): UseBoundStore<T> {
  let state: T;
  const listeners = new Set<() => void>();

  const getState = (): T => state;

  const setState = (partial: Partial<T> | ((state: T) => Partial<T>)): void => {
    const nextPartial = typeof partial === 'function' ? partial(state) : partial;
    const nextState = { ...state, ...nextPartial };

    // Only notify if state actually changed
    if (!Object.is(state, nextState)) {
      state = nextState;
      listeners.forEach((listener) => {
        listener();
      });
    }
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // Initialize state
  state = createState(setState, getState);

  // Create the hook
  const useStore = (): T => {
    const useSyncExternalStoreFn = getUseSyncExternalStore();
    return useSyncExternalStoreFn(
      subscribe,
      getState,
      getState, // Server snapshot (same as client for this use case)
    );
  };

  // Attach store methods to the hook
  const boundStore = useStore as UseBoundStore<T>;
  boundStore.getState = getState;
  boundStore.setState = setState;
  boundStore.subscribe = subscribe;

  return boundStore;
}
