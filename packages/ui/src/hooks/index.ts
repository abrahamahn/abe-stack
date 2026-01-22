// packages/ui/src/hooks/index.ts
export { useMediaQuery } from './useMediaQuery';
export { useDisclosure } from './useDisclosure';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export {
  useKeyboardShortcut,
  useKeyBindings,
  parseKeyBinding,
  formatKeyBinding,
  type KeyModifiers,
  type KeyboardShortcutOptions,
  type ParsedKeyBinding,
} from './useKeyboardShortcut';
export {
  useUndoRedoShortcuts,
  getUndoShortcutText,
  getRedoShortcutText,
  getUndoRedoShortcutTexts,
  type UndoRedoKeyBindings,
  type UndoRedoCallbacks,
  type UseUndoRedoShortcutsOptions,
  type UseUndoRedoShortcutsResult,
} from './useUndoRedoShortcuts';
export { useClickOutside } from './useClickOutside';
export { useControllableState } from './useControllableState';
export { useDebounce } from './useDebounce';
export { useFormState, type FormState } from './useFormState';
export { useLocalStorage } from './useLocalStorage';
export { useResendCooldown, type UseResendCooldownReturn } from './useResendCooldown';
export { useWindowSize } from './useWindowSize';
export { useOnScreen } from './useOnScreen';
export { usePanelConfig } from './usePanelConfig';
export { useThemeMode } from './useThemeMode';
export { useDensity, type UseDensityReturn } from './useDensity';
export { useContrast, type UseContrastReturn } from './useContrast';
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
export {
  useAuthModeNavigation,
  type AuthMode,
  type AuthModeNavigation,
  type AuthModeNavigationOptions,
} from './useAuthModeNavigation';
