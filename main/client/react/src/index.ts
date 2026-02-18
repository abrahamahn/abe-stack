// main/client/react/src/index.ts
// React interface logic, hooks, and context

// ============================================================================
// Hooks
// ============================================================================

export {
  useMediaQuery,
  useDisclosure,
  useKeyboardShortcuts,
  useKeyboardShortcut,
  useKeyBindings,
  parseKeyBinding,
  formatKeyBinding,
  useUndoRedoShortcuts,
  getUndoShortcutText,
  getRedoShortcutText,
  getUndoRedoShortcutTexts,
  useClickOutside,
  useControllableState,
  useDebounce,
  useFormState,
  useLocalStorage,
  useLocalStorageValue,
  useResendCooldown,
  useWindowSize,
  useOnScreen,
  usePanelConfig,
  useThemeMode,
  useDensity,
  useContrast,
  useCopyToClipboard,
  useHistoryNav,
  HistoryProvider,
  useDelayedFlag,
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
  useVirtualScroll,
  VirtualScrollList,
  usePaginatedQuery,
  useOffsetPaginatedQuery,
  useAuthModeNavigation,
  useSidePeek,
  useFocusReturn,
  useRouteFocusAnnounce,
  useUndoableMutation,
  useUndoRedoController,
} from './hooks';
export type {
  KeyModifiers,
  KeyboardShortcutOptions,
  ParsedKeyBinding,
  UndoRedoKeyBindings,
  UndoRedoCallbacks,
  UseUndoRedoShortcutsOptions,
  UseUndoRedoShortcutsResult,
  FormState,
  UseResendCooldownReturn,
  UseDensityReturn,
  UseContrastReturn,
  HistoryContextValue,
  VirtualScrollOptions,
  VirtualScrollItem,
  VirtualScrollResult,
  VirtualScrollListProps,
  UsePaginatedQueryOptions,
  UsePaginatedQueryResult,
  UseOffsetPaginatedQueryOptions,
  UseOffsetPaginatedQueryResult,
  AuthMode,
  AuthModeNavigation,
  AuthModeNavigationOptions,
  UseSidePeekResult,
  UseFocusReturnOptions,
  UseFocusReturnResult,
  UseRouteFocusAnnounceOptions,
  UseUndoableMutationOptions,
  UndoRedoHandler,
  UseUndoRedoControllerOptions,
  UseUndoRedoControllerResult,
} from './hooks';

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
} from './providers';
export type { ThemeContextValue, UserState, UserAction } from './providers';

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
  useLocation,
  useNavigate,
  useSearchParams,
  Link,
  Navigate,
  Outlet,
  OutletProvider,
  Route,
  Routes,
  useParams,
} from './router';
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
  LinkProps,
  NavigateProps,
  OutletProviderProps,
  RouteProps,
  RoutesProps,
} from './router';

// ============================================================================
// Stores
// ============================================================================

export { createStore, toastStore, createUndoRedoStore, useUndoRedoStore } from './stores';
export type { StoreApi, UseBoundStore, ToastMessage, ToastTone, UndoRedoState } from './stores';

// ============================================================================
// Components
// ============================================================================

export { LiveRegion, useAnnounce } from './components';
export type { AnnouncePoliteness, LiveRegionProps, UseAnnounceResult } from './components';

// ============================================================================
// Utils
// ============================================================================

export { createFormHandler } from './utils';
export type { FormHandlerOptions } from './utils';

// ============================================================================
// Query
// ============================================================================

export { QueryCacheProvider, useQueryCache, useQuery, useMutation, useInfiniteQuery } from './query';
export type {
  QueryCacheProviderProps,
  UseQueryOptions,
  UseQueryResult,
  MutationStatus,
  UseMutationOptions,
  UseMutationResult,
  InfiniteData,
  InfinitePageParam,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from './query';

// ============================================================================
// Realtime
// ============================================================================

export {
  RealtimeProvider,
  useRealtime,
  usePubsubConnectionState,
  useConnectionState,
  useIsOnline,
  useIsPendingWrite,
  useRecord,
  useRecords,
  useUndoRedo,
  useWrite,
} from './realtime';
export type {
  RealtimeContextValue,
  RealtimeProviderConfig,
  RealtimeProviderProps,
  UndoableWrite,
  WriteOperation,
  WriteOptions,
  UseRecordOptions,
  UseRecordResult,
  UseRecordsResult,
  UseUndoRedoResult,
  UseWriteResult,
  WriteFn,
} from './realtime';

// ============================================================================
// Search
// ============================================================================

export {
  useDebounceSearch,
  useInfiniteSearch,
  useSearch,
  useSearchParams as useSearchQueryParams,
} from './search';
export type {
  CursorSearchFn,
  SearchFn,
  UseInfiniteSearchOptions,
  UseInfiniteSearchResult,
  UseSearchOptions,
  UseSearchResult,
} from './search';

// ============================================================================
// Billing
// ============================================================================

export {
  adminBillingQueryKeys,
  billingQueryKeys,
  useAdminPlans,
  useInvoices,
  usePaymentMethods,
  usePlans,
  useSubscription,
} from './billing';
export type {
  AdminPlansState,
  InvoicesState,
  PaymentMethodsState,
  PlansState,
  SubscriptionState,
} from './billing';

// ============================================================================
// Devices
// ============================================================================

export { devicesQueryKeys, useDevices } from './devices';
export type { DevicesState, UseDevicesOptions } from './devices';

// ============================================================================
// Phone
// ============================================================================

export { usePhone } from './phone';
export type { PhoneState, UsePhoneOptions } from './phone';

// ============================================================================
// API Keys
// ============================================================================

export {
  apiKeysQueryKeys,
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useRevokeApiKey,
} from './api-keys';
export type {
  ApiKeysState,
  UseApiKeysOptions,
  UseCreateApiKeyState,
  UseDeleteApiKeyState,
  UseRevokeApiKeyState,
} from './api-keys';

// ============================================================================
// Notifications
// ============================================================================

export {
  useNotificationPreferences,
  usePushPermission,
  usePushSubscription,
  useTestNotification,
} from './notifications';
export type {
  NotificationPreferencesState,
  PushPermissionState,
  PushSubscriptionState,
  TestNotificationState,
  UseNotificationPreferencesOptions,
  UsePushSubscriptionOptions,
} from './notifications';

// ============================================================================
// OAuth
// ============================================================================

export {
  getOAuthLoginUrl,
  oauthQueryKeys,
  useEnabledOAuthProviders,
  useOAuthConnections,
} from './oauth';
export type { EnabledOAuthProvidersState, OAuthConnectionsState } from './oauth';

// ============================================================================
// Webhooks
// ============================================================================

export {
  useCreateWebhook,
  useDeleteWebhook,
  useRotateWebhookSecret,
  useUpdateWebhook,
  useWebhook,
  useWebhooks,
  webhookQueryKeys,
} from './webhooks';
export type {
  CreateWebhookState,
  DeleteWebhookState,
  RotateWebhookSecretState,
  UpdateWebhookState,
  WebhookDetailState,
  WebhooksState,
} from './webhooks';

// ============================================================================
// Version
// ============================================================================

export const REACT_LAYER_VERSION = '1.0.0';
