// src/server/engine/src/observability/types.ts
/**
 * Error Tracking Service Types
 *
 * Core type definitions for error tracking and observability.
 * Designed for pluggable providers (Sentry, Datadog, etc.)
 *
 * @module Observability
 */

// ============================================================================
// Types
// ============================================================================

/** Configuration for error tracking service */
export interface ErrorTrackingConfig {
  /** Data Source Name (DSN) for the error tracking service. If null or empty, tracking is disabled */
  dsn: string | null;
  /** Environment name (development, staging, production) */
  environment: string;
  /** Release version identifier (e.g., git commit SHA or semantic version) */
  release?: string | undefined;
  /** Sample rate for error tracking (0.0 to 1.0). Default: 1.0 (capture all errors) */
  sampleRate?: number | undefined;
}

/** Additional context to attach to error reports */
export interface ErrorContext {
  /** User-related context */
  user?: {
    id?: string | undefined;
    email?: string | undefined;
    username?: string | undefined;
  } | undefined;
  /** Request-related context */
  request?: {
    url?: string | undefined;
    method?: string | undefined;
    headers?: Record<string, string> | undefined;
  } | undefined;
  /** Custom tags for categorization */
  tags?: Record<string, string> | undefined;
  /** Additional arbitrary data */
  extra?: Record<string, unknown> | undefined;
}

/** Breadcrumb severity level */
export type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';

/** Breadcrumb for tracking events leading up to an error */
export interface Breadcrumb {
  /** Breadcrumb message */
  message: string;
  /** Category for grouping related breadcrumbs */
  category: string;
  /** Severity level */
  level?: BreadcrumbLevel | undefined;
  /** Additional structured data */
  data?: Record<string, unknown> | undefined;
  /** Timestamp (ISO 8601 format) */
  timestamp?: string | undefined;
}

/** Error tracking provider interface — implement for each vendor */
export interface ErrorTrackingProvider {
  /**
   * Initialize the error tracking provider.
   * @param config - Error tracking configuration
   */
  init(config: ErrorTrackingConfig): void;

  /**
   * Capture an error with optional context.
   * @param error - Error object or message to capture
   * @param context - Additional context for the error
   */
  captureError(error: unknown, context?: ErrorContext): void;

  /**
   * Set user context for subsequent error reports.
   * @param userId - User identifier
   * @param email - User email address (optional)
   */
  setUserContext(userId: string, email?: string): void;

  /**
   * Add a breadcrumb to track events leading up to errors.
   * @param message - Breadcrumb message
   * @param category - Category for grouping
   * @param data - Additional structured data
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void;
}
