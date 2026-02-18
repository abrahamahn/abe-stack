// main/server/system/src/observability/sentry.ts
/**
 * Sentry Integration Facade
 *
 * Provides a simplified interface for error tracking that can be backed
 * by Sentry or other providers. The implementation is pluggable via the
 * ErrorTrackingProvider interface.
 *
 * @module Observability
 */

import { createErrorTracker } from './factory';

import type { ErrorContext, ErrorTrackingConfig, ErrorTrackingProvider } from './types';

let errorTracker: ErrorTrackingProvider | null = null;

/**
 * Initialize the error tracking system.
 *
 * Config-gated: if DSN is null or empty, tracking is disabled (zero overhead noop).
 *
 * @param config - Error tracking configuration
 */
export function initSentry(config: ErrorTrackingConfig): void {
  errorTracker = createErrorTracker(config);
  errorTracker.init(config);
}

/**
 * Capture an error with optional context.
 *
 * If not initialized, this is a no-op.
 *
 * @param error - Error object or message to capture
 * @param context - Additional context for the error (user, request, tags, etc.)
 */
export function captureError(error: unknown, context?: ErrorContext): void {
  if (errorTracker === null) {
    return;
  }
  errorTracker.captureError(error, context);
}

/**
 * Set user context for subsequent error reports.
 *
 * If not initialized, this is a no-op.
 *
 * @param userId - User identifier
 * @param email - User email address (optional)
 */
export function setUserContext(userId: string, email?: string): void {
  if (errorTracker === null) {
    return;
  }
  errorTracker.setUserContext(userId, email);
}

/**
 * Add a breadcrumb to track events leading up to errors.
 *
 * If not initialized, this is a no-op.
 *
 * @param message - Breadcrumb message
 * @param category - Category for grouping related breadcrumbs
 * @param data - Additional structured data
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
): void {
  if (errorTracker === null) {
    return;
  }
  errorTracker.addBreadcrumb(message, category, data);
}
