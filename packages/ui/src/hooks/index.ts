// packages/ui/src/hooks/index.ts
export { useMediaQuery } from './useMediaQuery';
export { useDisclosure } from './useDisclosure';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useClickOutside } from './useClickOutside';
export { useControllableState } from './useControllableState';
export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';
export { useWindowSize } from './useWindowSize';
export { useOnScreen } from './useOnScreen';
export { usePanelConfig } from './usePanelConfig';
export { useThemeMode } from './useThemeMode';
export { useCopyToClipboard } from './useCopyToClipboard';
export { useHistoryNav, HistoryProvider, type HistoryContextValue } from './useHistoryNav';
export {
  deepEqual,
  shallowEqual,
  useDeepMemo,
  useShallowMemo,
  useDeepCallback,
  useShallowCallback,
  useDeepEffect,
  useShallowEffect,
  TTLCache,
  LRUCache,
  useTTLCache,
  useLRUCache,
  useExpensiveComputation,
  useDebouncedState,
  useThrottle,
  useDebounce as useOptimizedDebounce,
} from './useOptimizedMemo';
export {
  useVirtualScroll,
  VirtualScrollList,
  type VirtualScrollOptions,
  type VirtualScrollItem,
  type VirtualScrollResult,
  type VirtualScrollListProps,
} from './useVirtualScroll';
export {
  usePaginatedQuery,
  useOffsetPaginatedQuery,
  type UsePaginatedQueryOptions,
  type UsePaginatedQueryResult,
  type UseOffsetPaginatedQueryOptions,
  type UseOffsetPaginatedQueryResult,
} from './usePaginatedQuery';
