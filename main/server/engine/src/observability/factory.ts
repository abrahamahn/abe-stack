// main/server/engine/src/observability/factory.ts
/**
 * Error Tracking Provider Factory
 *
 * Creates the appropriate error tracking provider based on configuration.
 *
 * @module Observability
 */

import { ConsoleErrorTrackingProvider } from './console-provider';
import { NoopErrorTrackingProvider } from './noop-provider';

import type { ErrorTrackingConfig, ErrorTrackingProvider } from './types';

/**
 * Create an error tracking provider based on the given configuration.
 *
 * - If DSN is null or empty: returns NoopErrorTrackingProvider (zero overhead)
 * - Otherwise: returns ConsoleErrorTrackingProvider (logs to console for development)
 *
 * Future: When Sentry SDK is installed, this factory can return a SentryProvider
 * when a valid DSN is provided.
 *
 * @param config - Error tracking configuration
 * @returns An ErrorTrackingProvider instance
 */
export function createErrorTracker(config: ErrorTrackingConfig): ErrorTrackingProvider {
  // If no DSN is provided, return noop provider (zero overhead)
  if (config.dsn === null || config.dsn === '') {
    return new NoopErrorTrackingProvider();
  }

  // For now, return console provider when DSN is present
  // In the future, this can be replaced with a real Sentry provider
  return new ConsoleErrorTrackingProvider();
}
