// main/server/system/src/observability/factory.ts
/**
 * Error Tracking Provider Factory
 *
 * Creates the appropriate error tracking provider based on configuration.
 *
 * @module Observability
 */

import { NoopErrorTrackingProvider } from './noop.provider';
import { SentryNodeProvider } from './sentry.provider';

import type { ErrorTrackingConfig, ErrorTrackingProvider } from './types';

/**
 * Create an error tracking provider based on the given configuration.
 *
 * - If DSN is null or empty: returns NoopErrorTrackingProvider (zero overhead)
 * - If DSN is provided: returns SentryNodeProvider (uses @sentry/node when installed,
 *   gracefully degrades to no-op when the package is absent)
 *
 * @param config - Error tracking configuration
 * @returns An ErrorTrackingProvider instance
 */
export function createErrorTracker(config: ErrorTrackingConfig): ErrorTrackingProvider {
  // If no DSN is provided, return noop provider (zero overhead)
  if (config.dsn === null || config.dsn === '') {
    return new NoopErrorTrackingProvider();
  }

  // Use the Sentry Node.js provider — gracefully degrades if @sentry/node
  // is not installed (optional dependency).
  return new SentryNodeProvider();
}
