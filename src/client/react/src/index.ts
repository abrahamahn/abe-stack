// src/client/react/src/index.ts
// React interface logic, hooks, and context

// ============================================================================
// Hooks
// ============================================================================

export { useMediaQuery } from './hooks/useMediaQuery';
export { useDisclosure } from './hooks/useDisclosure';
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export {
  useKeyboardShortcut,
  useKeyBindings,
  parseKeyBinding,
  formatKeyBinding,
} from './hooks/useKeyboardShortcut';
export type {
  KeyModifiers,
  KeyboardShortcutOptions,
  ParsedKeyBinding,
} from './hooks/useKeyboardShortcut';
export {
  useUndoRedoShortcuts,
  getUndoShortcutText,
  getRedoShortcutText,
  getUndoRedoShortcutTexts,
} from './hooks/useUndoRedoShortcuts';
export type {
  UndoRedoKeyBindings,
  UndoRedoCallbacks,
  UseUndoRedoShortcutsOptions,
  UseUndoRedoShortcutsResult,
} from './hooks/useUndoRedoShortcuts';
export { useClickOutside } from './hooks/useClickOutside';
export { useControllableState } from './hooks/useControllableState';
export { useDebounce } from './hooks/useDebounce';
export { useFormState } from './hooks/useFormState';
export type { FormState } from './hooks/useFormState';
export { useLocalStorage } from './hooks/useLocalStorage';
export { useResendCooldown } from './hooks/useResendCooldown';
export type { UseResendCooldownReturn } from './hooks/useResendCooldown';
export { useWindowSize } from './hooks/useWindowSize';
export { useOnScreen } from './hooks/useOnScreen';
export { usePanelConfig } from './hooks/usePanelConfig';
export { useThemeMode } from './hooks/useThemeMode';
export { useDensity } from './hooks/useDensity';
export type { UseDensityReturn } from './hooks/useDensity';
export { useContrast } from './hooks/useContrast';
export type { UseContrastReturn } from './hooks/useContrast';
export { useCopyToClipboard } from './hooks/useCopyToClipboard';
export { useHistoryNav, HistoryProvider } from './hooks/useHistoryNav';
export type { HistoryContextValue } from './hooks/useHistoryNav';
export { useDelayedFlag } from './hooks/useDelayedFlag';
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
} from './hooks/useOptimizedMemo';
export { useVirtualScroll, VirtualScrollList } from './hooks/useVirtualScroll';
export type {
  VirtualScrollOptions,
  VirtualScrollItem,
  VirtualScrollResult,
  VirtualScrollListProps,
} from './hooks/useVirtualScroll';
export { usePaginatedQuery, useOffsetPaginatedQuery } from './hooks/usePaginatedQuery';
export type {
  UsePaginatedQueryOptions,
  UsePaginatedQueryResult,
  UseOffsetPaginatedQueryOptions,
  UseOffsetPaginatedQueryResult,
} from './hooks/usePaginatedQuery';
export { useAuthModeNavigation } from './hooks/useAuthModeNavigation';
export type {
  AuthMode,
  AuthModeNavigation,
  AuthModeNavigationOptions,
} from './hooks/useAuthModeNavigation';
export { useSidePeek } from './hooks/useSidePeek';
export type { UseSidePeekResult } from './hooks/useSidePeek';
export { useFocusReturn } from './hooks/useFocusReturn';
export type { UseFocusReturnOptions, UseFocusReturnResult } from './hooks/useFocusReturn';
export { useRouteFocusAnnounce } from './hooks/useRouteFocusAnnounce';
export type { UseRouteFocusAnnounceOptions } from './hooks/useRouteFocusAnnounce';
export { useUndoableMutation } from './hooks/useUndoableMutation';
export type { UseUndoableMutationOptions } from './hooks/useUndoableMutation';
export { useUndoRedoController } from './hooks/useUndoRedoController';
export type {
  UndoRedoHandler,
  UseUndoRedoControllerOptions,
  UseUndoRedoControllerResult,
} from './hooks/useUndoRedoController';

// ============================================================================
// Providers
// ============================================================================

export {
  createMemoizedContext,
  createSelectiveContext,
  createReducerContext,
  createLazyContext,
  createSubscriptionContext,
  Memoized,
  SelectiveMemo,
  useRenderPerformance,
} from './providers/OptimizedProvider';
export type { ThemeContextValue, UserState, UserAction } from './providers/OptimizedProvider';

// ============================================================================
// Router
// ============================================================================

export {
  MemoryRouter,
  Router,
  Router as BrowserRouter,
  RouterContext,
  useHistory,
  useNavigationType,
} from './router/context';
export type {
  History,
  MemoryRouterProps,
  NavigateFunction,
  NavigateOptions,
  NavigationType,
  RouterContextValue,
  RouterLocation,
  RouterProps,
  RouterState,
} from './router/context';
export { useLocation, useNavigate, useSearchParams } from './router/hooks';
export {
  Link,
  Navigate,
  Outlet,
  OutletProvider,
  Route,
  Routes,
  useParams,
} from './router/components';
export type {
  LinkProps,
  NavigateProps,
  OutletProviderProps,
  RouteProps,
  RoutesProps,
} from './router/components';

// ============================================================================
// Stores
// ============================================================================

export { createStore } from './stores/createStore';
export type { StoreApi, UseBoundStore } from './stores/createStore';
export { toastStore } from './stores/toastStore';
export type { ToastMessage, ToastTone } from './stores/toastStore';
export { createUndoRedoStore, useUndoRedoStore } from './stores/undoRedoStore';
export type { UndoRedoState } from './stores/undoRedoStore';

// ============================================================================
// Components
// ============================================================================

export { LiveRegion, useAnnounce } from './components/LiveRegion';
export type {
  AnnouncePoliteness,
  LiveRegionProps,
  UseAnnounceResult,
} from './components/LiveRegion';

// ============================================================================
// Utils
// ============================================================================

export { createFormHandler } from './utils/createFormHandler';
export type { FormHandlerOptions } from './utils/createFormHandler';

// ============================================================================
// Query
// ============================================================================

export { QueryCacheProvider, useQueryCache } from './query/QueryCacheProvider';
export type { QueryCacheProviderProps } from './query/QueryCacheProvider';
export { useQuery } from './query/useQuery';
export type { UseQueryOptions, UseQueryResult } from './query/useQuery';
export { useMutation } from './query/useMutation';
export type { MutationStatus, UseMutationOptions, UseMutationResult } from './query/useMutation';
export { useInfiniteQuery } from './query/useInfiniteQuery';
export type {
  InfiniteData,
  InfinitePageParam,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from './query/useInfiniteQuery';

// ============================================================================
// Realtime
// ============================================================================

export {
  RealtimeProvider,
  useRealtime,
  type RealtimeContextValue,
  type RealtimeProviderConfig,
  type RealtimeProviderProps,
  type UndoableWrite,
  type WriteOperation,
  type WriteOptions,
} from './realtime/RealtimeContext';

export {
  useConnectionState,
  useIsOnline,
  useIsPendingWrite,
  useRecord,
  useRecords,
  useUndoRedo,
  useWrite,
  type UseRecordOptions,
  type UseRecordResult,
  type UseRecordsResult,
  type UseUndoRedoResult,
  type UseWriteResult,
  type WriteFn,
} from './realtime/hooks';

// ============================================================================
// Search
// ============================================================================

export {
  useDebounceSearch,
  useInfiniteSearch,
  useSearch,
  useSearchParams as useSearchQueryParams,
} from './search/hooks';
export type {
  CursorSearchFn,
  SearchFn,
  UseInfiniteSearchOptions,
  UseInfiniteSearchResult,
  UseSearchOptions,
  UseSearchResult,
} from './search/hooks';

// ============================================================================
// Version
// ============================================================================

export const REACT_LAYER_VERSION = '1.0.0';
