// infra/stores/src/react.d.ts
/**
 * Minimal React type declarations for stores package.
 * This avoids needing @types/react as a dependency.
 */

declare module 'react' {
  export function useSyncExternalStore<T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ): T;
}
