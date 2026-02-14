// main/shared/src/core/observability.ts
/**
 * Shared Observability Contracts
 *
 * Defines the minimal interfaces for error tracking and distributed tracing
 * that all packages can use without direct dependency on Sentry or other providers.
 *
 * @module observability
 */

/**
 * Metadata for error tracking breadcrumbs.
 */
export interface BreadcrumbData {
  [key: string]: unknown;
  category?: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  type?: string;
}

/**
 * Error tracking service interface.
 * Decouples packages from specific SDKs like Sentry.
 */
export interface ErrorTracker {
  /**
   * Capture an error with optional context.
   * @param error - The error to capture
   * @param context - Additional context (tags, extra data)
   */
  captureError(error: unknown, context?: Record<string, unknown>): void;

  /**
   * Add a breadcrumb to the current request lifecycle.
   * @param message - Breadcrumb message
   * @param data - Optional metadata
   */
  addBreadcrumb(message: string, data?: BreadcrumbData): void;

  /**
   * Set the current user context for error reports.
   * @param userId - Unique user identifier
   * @param email - User email address
   */
  setUserContext(userId: string, email?: string): void;
}

/**
 * Minimal interface for a service that provides error tracking.
 */
export interface HasErrorTracker {
  readonly errorTracker: ErrorTracker;
}
