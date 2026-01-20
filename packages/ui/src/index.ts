// packages/ui/src/index.ts
// Shared UI components for all platforms (web, desktop, mobile)

// Elements - Atomic UI building blocks
export {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Divider,
  EnvironmentBadge,
  Heading,
  Input,
  Kbd,
  MenuItem,
  PasswordInput,
  Progress,
  Skeleton,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  TextArea,
  Toaster,
  Tooltip,
  VersionBadge,
  VisuallyHidden,
} from './elements';

// Components - Composed multi-part components
export {
  Accordion,
  Card,
  Dialog,
  Dropdown,
  FocusTrap,
  FormField,
  Image,
  LoadingContainer,
  Pagination,
  Popover,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Tabs,
  Toast,
  ToastContainer,
} from './components';
export type { TabItem, TabsProps, UserState, UserAction } from './components';

// Layouts - Page and section layouts
export {
  AppShell,
  AuthLayout,
  BottombarLayout,
  Container,
  LeftSidebarLayout,
  Modal,
  Overlay,
  PageContainer,
  ProtectedRoute,
  ResizablePanel,
  ResizablePanelGroup,
  ResizableSeparator,
  RightSidebarLayout,
  ScrollArea,
  StackedLayout,
  TopbarLayout,
} from './layouts';
export type {
  AppShellProps,
  BottombarLayoutProps,
  LeftSidebarLayoutProps,
  RightSidebarLayoutProps,
  TopbarLayoutProps,
} from './layouts';

// Hooks
export {
  HistoryProvider,
  useClickOutside,
  useControllableState,
  useCopyToClipboard,
  useDebounce,
  useDisclosure,
  useHistoryNav,
  useKeyboardShortcuts,
  useLocalStorage,
  useMediaQuery,
  useOnScreen,
  useOffsetPaginatedQuery,
  usePaginatedQuery,
  usePanelConfig,
  useThemeMode,
  useVirtualScroll,
  useWindowSize,
} from './hooks';
export type {
  HistoryContextValue,
  UseOffsetPaginatedQueryOptions,
  UseOffsetPaginatedQueryResult,
  UsePaginatedQueryOptions,
  UsePaginatedQueryResult,
  VirtualScrollOptions,
  VirtualScrollItem,
  VirtualScrollResult,
  VirtualScrollListProps,
} from './hooks';

// Theme
export {
  colors,
  darkColors,
  lightColors,
  motion,
  radius,
  spacing,
  ThemeProvider,
  typography,
  useTheme,
} from './theme';
export type {
  DarkColors,
  LightColors,
  Radius,
  ThemeColors,
  ThemeContextValue,
  ThemeProviderProps,
} from './theme';

// Utilities
export { cn, Markdown, SyntaxHighlighter } from './utils';
