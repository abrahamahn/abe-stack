declare module 'react' {
  export type ReactElement = unknown;
  export type ReactNode = unknown;

  export interface MutableRefObject<T> {
    current: T;
  }

  export function createContext<T>(defaultValue: T): {
    Provider: (props: { value: T; children?: ReactNode }) => ReactElement;
    Consumer: unknown;
  };

  export function useContext<T>(_context: unknown): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function useState<T>(
    initialState: T | (() => T),
  ): [T, (value: T | ((prev: T) => T)) => void];
  export function useSyncExternalStore<T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ): T;
}

declare module 'react/jsx-runtime' {
  export const Fragment: unique symbol;
  export function jsx(type: unknown, props: unknown, key?: unknown): unknown;
  export function jsxs(type: unknown, props: unknown, key?: unknown): unknown;
}
