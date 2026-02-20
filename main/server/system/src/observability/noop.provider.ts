// main/server/system/src/observability/noop.provider.ts
/**
 * No-Op Error Tracking Provider
 *
 * Provider that performs no operations. Used when error tracking is disabled.
 * Zero overhead implementation for development or when DSN is not configured.
 *
 * @module Observability
 */

import type { ErrorContext, ErrorTrackingConfig, ErrorTrackingProvider } from './types';

/**
 * No-op implementation of ErrorTrackingProvider.
 * All methods are no-ops with zero overhead.
 */
export class NoopErrorTrackingProvider implements ErrorTrackingProvider {
  init(_config: ErrorTrackingConfig): void {
    // No-op
  }

  captureError(_error: unknown, _context?: ErrorContext): void {
    // No-op
  }

  setUserContext(_userId: string, _email?: string): void {
    // No-op
  }

  addBreadcrumb(_message: string, _category: string, _data?: Record<string, unknown>): void {
    // No-op
  }
}
