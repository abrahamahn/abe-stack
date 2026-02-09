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
// Theme
// ============================================================================

export {
  DEFAULT_CONTRAST_MODE,
  getContrastCssVariables,
  highContrastDarkOverrides,
  highContrastLightOverrides,
} from './theme/contrast';
export type { ContrastMode } from './theme/contrast';

// ============================================================================
// Utils
// ============================================================================

export { createFormHandler } from './utils/createFormHandler';
export type { FormHandlerOptions } from './utils/createFormHandler';

// ============================================================================
// Version
// ============================================================================

export const REACT_LAYER_VERSION = '1.0.0';
