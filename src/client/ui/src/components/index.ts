// src/client/ui/src/components/index.ts
// Components - Composed multi-part components with complex state/behavior
export { Accordion } from './Accordion';
export { AuthFormLayout } from './AuthForm';
export { Card } from './Card';
export { DelayedFallback, type DelayedFallbackProps } from './DelayedFallback';
export { Dialog } from './Dialog';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { Dropdown } from './Dropdown';
export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary';
export { FocusTrap } from './FocusTrap';
export { LiveRegion, useAnnounce } from '@abe-stack/react';
export type { AnnouncePoliteness, LiveRegionProps, UseAnnounceResult } from '@abe-stack/react';
export { FormField } from './FormField';
export { Image } from './Image';
export { LoadingContainer } from './LoadingContainer';
export { Pagination } from './Pagination';
export { Popover } from './Popover';
export { Radio } from './Radio';
export { RadioGroup } from './RadioGroup';
export { Select } from './Select';
export { Slider } from './Slider';
export { Tabs, type TabsProps, type TabItem } from './Tabs';
export { Toast, ToastContainer } from './Toast';
export { PeekLink, type PeekLinkProps } from './PeekLink';

// Billing components
export {
  InvoiceList,
  InvoiceRow,
  PaymentMethodCard,
  PlanCard,
  PricingTable,
  SubscriptionStatus,
  type InvoiceListProps,
  type InvoiceRowProps,
  type PaymentMethodCardProps,
  type PlanCardProps,
  type PricingTableProps,
  type SubscriptionStatusProps,
} from './billing';

// Re-export providers for backwards compatibility
// Prefer importing directly from '@abe-stack/react/providers'
export {
  createMemoizedContext,
  createSelectiveContext,
  createReducerContext,
  createLazyContext,
  createSubscriptionContext,
  Memoized,
  SelectiveMemo,
  useRenderPerformance,
  type ThemeContextValue,
  type UserState,
  type UserAction,
} from '@abe-stack/react/providers';
