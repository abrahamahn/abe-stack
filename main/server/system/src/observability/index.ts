// main/server/system/src/observability/index.ts

export { ConsoleErrorTrackingProvider } from './console.provider';
export { createErrorTracker } from './factory';
export { NoopErrorTrackingProvider } from './noop.provider';
export { addBreadcrumb, captureError, initSentry, setUserContext } from './sentry';
export type {
  Breadcrumb,
  BreadcrumbLevel,
  ErrorContext,
  ErrorTrackingConfig,
  ErrorTrackingProvider,
} from './types';
