// main/server/system/src/observability/sentry.provider.ts
/**
 * Sentry Node.js Error Tracking Provider
 *
 * Implements ErrorTrackingProvider using the @sentry/node SDK.
 * Loaded lazily at init-time; gracefully degrades to a no-op if
 * @sentry/node is not installed or the DSN is not configured.
 *
 * Usage:
 *   const provider = new SentryNodeProvider();
 *   provider.init({ dsn: process.env.SENTRY_DSN, environment: 'production' });
 *
 * @module Observability
 */

import { createRequire } from 'node:module';

import type { ErrorContext, ErrorTrackingConfig, ErrorTrackingProvider } from './types';

// Lazy reference to @sentry/node — resolved at init time
type ScopeLike = {
  setUser: (user: { id?: string; email?: string; username?: string }) => void;
  setTag: (key: string, value: string) => void;
  setExtra: (key: string, value: unknown) => void;
  setContext: (name: string, context: unknown) => void;
};

type SentryNodeModule = {
  init: (options: {
    dsn: string;
    environment: string;
    release?: string;
    sampleRate: number;
    sendDefaultPii: boolean;
    ignoreErrors: string[];
  }) => void;
  withScope: (callback: (scope: ScopeLike) => void) => void;
  captureException: (error: unknown) => void;
  setUser: (user: { id: string; email?: string } | null) => void;
  addBreadcrumb: (breadcrumb: {
    message: string;
    category: string;
    level: 'info';
    data?: Record<string, unknown>;
  }) => void;
};

const require = createRequire(import.meta.url);

let Sentry: SentryNodeModule | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSentryNodeModule(value: unknown): value is SentryNodeModule {
  if (!isRecord(value)) return false;

  return (
    typeof value['init'] === 'function' &&
    typeof value['withScope'] === 'function' &&
    typeof value['captureException'] === 'function' &&
    typeof value['setUser'] === 'function' &&
    typeof value['addBreadcrumb'] === 'function'
  );
}

/**
 * Sentry Node.js implementation of ErrorTrackingProvider.
 *
 * - When @sentry/node is not installed: all methods are no-ops
 * - When DSN is empty/null: all methods are no-ops (zero overhead)
 * - When properly configured: captures errors, user context, and breadcrumbs
 *
 * @complexity O(1) per call — delegates to Sentry SDK internals
 */
export class SentryNodeProvider implements ErrorTrackingProvider {
  private initialized = false;

  /**
   * Initialize Sentry SDK.
   * Safe to call when @sentry/node is not installed — silently skips.
   *
   * @param config - Error tracking configuration
   */
  init(config: ErrorTrackingConfig): void {
    if (config.dsn === null || config.dsn === '') {
      return;
    }

    try {
      const loadedModule: unknown = require('@sentry/node');
      if (!isSentryNodeModule(loadedModule)) {
        return;
      }
      Sentry = loadedModule;
    } catch {
      // @sentry/node not installed — gracefully degrade to no-op
      return;
    }

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      ...(config.release !== undefined ? { release: config.release } : {}),
      sampleRate: config.sampleRate ?? 1.0,

      // Do not include full request bodies in error reports (PII protection)
      sendDefaultPii: false,

      // Ignore common transient errors that shouldn't be alerted on
      ignoreErrors: [
        // Client closed connection
        'ECONNRESET',
        'EPIPE',
        // Invalid request bodies (client errors, not server bugs)
        'FastifyError',
      ],
    });

    this.initialized = true;
  }

  /**
   * Capture an error with optional context.
   *
   * @param error - Error to capture
   * @param context - Optional user/request/tag context
   */
  captureError(error: unknown, context?: ErrorContext): void {
    if (!this.initialized || Sentry === null) return;
    const sentry = Sentry;

    sentry.withScope((scope) => {
      if (context?.user !== undefined) {
        const user: { id?: string; email?: string; username?: string } = {};
        if (context.user.id !== undefined) user.id = context.user.id;
        if (context.user.email !== undefined) user.email = context.user.email;
        if (context.user.username !== undefined) user.username = context.user.username;
        scope.setUser(user);
      }

      if (context?.tags !== undefined) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value);
        }
      }

      if (context?.extra !== undefined) {
        for (const [key, value] of Object.entries(context.extra)) {
          scope.setExtra(key, value);
        }
      }

      if (context?.request !== undefined) {
        scope.setContext('request', context.request);
      }

      sentry.captureException(error);
    });
  }

  /**
   * Set persistent user context for subsequent error reports.
   *
   * @param userId - User identifier
   * @param email - Optional email address
   */
  setUserContext(userId: string, email?: string): void {
    if (!this.initialized || Sentry === null) return;
    const sentry = Sentry;

    sentry.setUser(email !== undefined ? { id: userId, email } : { id: userId });
  }

  /**
   * Add a navigation/operation breadcrumb.
   *
   * @param message - Breadcrumb message
   * @param category - Category for grouping (e.g., 'http', 'auth', 'db')
   * @param data - Optional structured data
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    if (!this.initialized || Sentry === null) return;
    const sentry = Sentry;

    sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      ...(data !== undefined ? { data } : {}),
    });
  }
}
