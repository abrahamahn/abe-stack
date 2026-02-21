// main/apps/web/src/lib/sentry.ts
/**
 * Sentry Browser SDK Integration
 *
 * Initializes Sentry error monitoring for the web application.
 * Captures unhandled exceptions, breadcrumbs for route changes,
 * and provides helpers for manual error reporting.
 *
 * When @sentry/react is not installed, all exports are safe no-ops
 * so the rest of the app can import this module unconditionally.
 *
 * Usage:
 *   import { initSentry } from '@/lib/sentry';
 *   initSentry();  // call once at app startup, before React renders
 *
 * Environment variables:
 *   VITE_SENTRY_DSN          - Sentry DSN (required for Sentry to send events)
 *   VITE_SENTRY_ENVIRONMENT  - Environment name (defaults to MODE)
 *   VITE_SENTRY_RELEASE      - Release version (defaults to uiVersion from config)
 *
 * @module lib/sentry
 */

import { createElement, type ComponentType, type ReactNode } from 'react';

import { clientConfig } from '@/config';

// ============================================================================
// Lazy Sentry reference — resolved at init-time, stays null when missing
// ============================================================================

type Breadcrumb = {
  category: string;
  message: string;
  data?: Record<string, unknown>;
  level: 'info';
};

type SentryEvent = {
  breadcrumbs?: Array<{ data?: Record<string, unknown> }>;
};

type SentryBrowserModule = {
  init: (options: {
    dsn: string;
    environment: string;
    release: string;
    sampleRate: number;
    tracesSampleRate: number;
    integrations: unknown[];
    replaysSessionSampleRate: number;
    replaysOnErrorSampleRate: number;
    beforeSend: (event: SentryEvent) => SentryEvent;
    ignoreErrors: string[];
    denyUrls: RegExp[];
  }) => void;
  browserTracingIntegration: () => unknown;
  replayIntegration: (options: { maskAllText: boolean; blockAllMedia: boolean }) => unknown;
  addBreadcrumb: (breadcrumb: Breadcrumb) => void;
  captureException: (
    error: unknown,
    options?: {
      extra?: Record<string, unknown>;
    },
  ) => void;
  setUser: (user: { id: string; email?: string; role?: string } | null) => void;
  ErrorBoundary?: ComponentType<{ children?: ReactNode; fallback?: ReactNode }>;
  withProfiler?: <P extends Record<string, unknown>>(
    component: ComponentType<P>,
  ) => ComponentType<P>;
};

let Sentry: SentryBrowserModule | null = null;

// ============================================================================
// Types
// ============================================================================

type EnvVars = {
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  [key: string]: string | boolean | undefined;
};

const env: EnvVars = import.meta.env as EnvVars;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSentryBrowserModule(value: unknown): value is SentryBrowserModule {
  if (!isRecord(value)) return false;

  return (
    typeof value['init'] === 'function' &&
    typeof value['browserTracingIntegration'] === 'function' &&
    typeof value['replayIntegration'] === 'function' &&
    typeof value['addBreadcrumb'] === 'function' &&
    typeof value['captureException'] === 'function' &&
    typeof value['setUser'] === 'function'
  );
}

// ============================================================================
// Configuration
// ============================================================================

/** Sentry DSN from environment (empty string disables Sentry) */
const SENTRY_DSN = (env['VITE_SENTRY_DSN'] as string | undefined) ?? '';

/** Environment name for Sentry events */
const SENTRY_ENVIRONMENT = (env['VITE_SENTRY_ENVIRONMENT'] as string | undefined) ?? env.MODE;

/** Release version for Sentry source map association */
const SENTRY_RELEASE = (env['VITE_SENTRY_RELEASE'] as string | undefined) ?? clientConfig.uiVersion;

/** Sample rate for error events (1.0 = 100%) */
const ERROR_SAMPLE_RATE = clientConfig.isProd ? 1.0 : 1.0;

/** Sample rate for performance traces (lower in production) */
const TRACES_SAMPLE_RATE = clientConfig.isProd ? 0.2 : 1.0;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize Sentry browser SDK.
 *
 * Safe to call even when VITE_SENTRY_DSN is not set -- in that case Sentry
 * is effectively a no-op and all calls are silently ignored.
 *
 * Also safe to call when @sentry/react is not installed -- the dynamic import
 * will fail silently and all exported helpers become no-ops.
 *
 * Must be called **before** React renders so the global error handlers
 * are installed as early as possible.
 *
 * @complexity O(1)
 */
export async function initSentry(): Promise<void> {
  // Skip initialization if no DSN is configured
  if (SENTRY_DSN === '') {
    return;
  }

  // Try to dynamically import @sentry/react; silently skip if not installed.
  // The module name is constructed via a variable so that Vite's static
  // import analysis doesn't reject the import at build/transform time.
  try {
    const sentryModule = '@sentry' + '/react';
    const loadedModule: unknown = await import(/* @vite-ignore */ sentryModule);
    if (!isSentryBrowserModule(loadedModule)) {
      return;
    }
    Sentry = loadedModule;
  } catch {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    sampleRate: ERROR_SAMPLE_RATE,
    tracesSampleRate: TRACES_SAMPLE_RATE,

    // -----------------------------------------------------------------------
    // Integrations
    // -----------------------------------------------------------------------
    integrations: [
      // Capture breadcrumbs for browser navigation / History API changes
      Sentry.browserTracingIntegration(),
      // Replay integration for debugging production errors
      ...(clientConfig.isProd
        ? [
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ]
        : []),
    ],

    // Replay sampling -- only capture replays when an error occurs in production
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: clientConfig.isProd ? 1.0 : 0,

    // -----------------------------------------------------------------------
    // Filtering
    // -----------------------------------------------------------------------
    beforeSend(event: SentryEvent) {
      // Scrub access tokens from breadcrumb data
      if (event.breadcrumbs !== undefined) {
        for (const breadcrumb of event.breadcrumbs) {
          if (breadcrumb.data !== undefined) {
            const data = breadcrumb.data;
            if (typeof data['url'] === 'string' && data['url'].includes('token')) {
              data['url'] = '[REDACTED]';
            }
          }
        }
      }
      return event;
    },

    // Ignore common browser noise
    ignoreErrors: [
      // Browser extension errors
      'top.GLOBALS',
      'ResizeObserver loop',
      // Network errors that are typically transient
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // User-initiated navigation aborts
      'AbortError',
    ],

    // Deny URLs from third-party scripts
    denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
  });
}

// ============================================================================
// Route Change Breadcrumbs
// ============================================================================

/**
 * Add a navigation breadcrumb to Sentry when the route changes.
 *
 * Call this from the router's navigation listener (e.g., `useEffect`
 * that watches `location.pathname`).
 *
 * @param from - Previous pathname
 * @param to - New pathname
 * @complexity O(1)
 */
export function addRouteChangeBreadcrumb(from: string, to: string): void {
  if (Sentry === null) return;
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated from ${from} to ${to}`,
    data: { from, to },
    level: 'info',
  });
}

// ============================================================================
// Manual Error Reporting
// ============================================================================

/**
 * Capture an exception in Sentry with optional extra context.
 *
 * Use for errors caught in try/catch that should still be reported.
 *
 * @param error - The error to report
 * @param context - Optional extra context attached to the event
 * @complexity O(1)
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (Sentry === null) return;
  Sentry.captureException(error, context !== undefined ? { extra: context } : {});
}

/**
 * Set the current user on the Sentry scope.
 *
 * Call after login to tag future events with user identity.
 * Call with `null` after logout to clear.
 *
 * @param user - User identity or null to clear
 * @complexity O(1)
 */
export function setSentryUser(user: { id: string; email?: string; role?: string } | null): void {
  if (Sentry === null) return;

  if (user === null) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    ...(user.email !== undefined ? { email: user.email } : {}),
    // Store role as a custom field so we can filter in Sentry UI
    ...(user.role !== undefined ? { role: user.role } : {}),
  });
}

// ============================================================================
// Error Boundary Helper
// ============================================================================

/**
 * Sentry ErrorBoundary wrapper component.
 * Re-exported for convenience so consumers don't need to import @sentry/react directly.
 * Returns a passthrough component when Sentry is not loaded.
 *
 * Checks the Sentry reference lazily at render-time so that if the dynamic
 * import in `initSentry()` resolved after module evaluation, the real
 * ErrorBoundary will be used.
 */
export function SentryErrorBoundary({
  children,
  fallback,
}: {
  children?: ReactNode;
  fallback?: ReactNode;
}): ReactNode {
  if (Sentry !== null && Sentry.ErrorBoundary !== undefined) {
    const Boundary = Sentry.ErrorBoundary;
    return createElement(Boundary, { fallback }, children);
  }
  return children;
}

/**
 * HOC that wraps a component with Sentry profiling.
 * Re-exported for convenience. Returns the component unchanged when Sentry is not loaded.
 */
export const withSentryProfiler = <P extends Record<string, unknown>>(
  component: ComponentType<P>,
): ComponentType<P> => {
  if (Sentry !== null && typeof Sentry.withProfiler === 'function') {
    return Sentry.withProfiler(component);
  }
  return component;
};
