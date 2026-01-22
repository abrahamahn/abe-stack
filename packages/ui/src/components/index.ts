// packages/ui/src/components/index.ts
// Components - Composed multi-part components with complex state/behavior
export { Accordion } from './Accordion';
export { Card } from './Card';
export { Dialog } from './Dialog';
export { Dropdown } from './Dropdown';
export { FocusTrap } from './FocusTrap';
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

// Re-export providers for backwards compatibility
// Prefer importing directly from '@abe-stack/ui/providers' or '@abe-stack/ui'
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
} from '../providers';
