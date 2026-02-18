// main/server/system/src/observability/console-provider.ts
/**
 * Console Error Tracking Provider (Development)
 *
 * Logs errors to console.error instead of sending to external service.
 * Use this in development to see error output without a real provider.
 *
 * @module Observability
 */

import type { ErrorContext, ErrorTrackingConfig, ErrorTrackingProvider } from './types';

type LogFn = (message: string, ...args: unknown[]) => void;

const defaultLog: LogFn = (message: string, ...args: unknown[]) => {
  process.stderr.write(`${message} ${args.map((a) => String(a)).join(' ')}\n`);
};

/**
 * Console-based implementation for development.
 * Logs errors and context to console.error.
 */
export class ConsoleErrorTrackingProvider implements ErrorTrackingProvider {
  private readonly log: LogFn;
  private config: ErrorTrackingConfig | null = null;
  private userContext: { userId: string; email?: string } | null = null;
  private readonly breadcrumbs: Array<{
    message: string;
    category: string;
    data?: Record<string, unknown>;
    timestamp: string;
  }> = [];

  constructor(log?: LogFn) {
    this.log = log ?? defaultLog;
  }

  init(config: ErrorTrackingConfig): void {
    this.config = config;
    this.log('[ErrorTracking] Initialized (console mode)', {
      environment: config.environment,
      release: config.release,
      sampleRate: config.sampleRate,
    });
  }

  captureError(error: unknown, context?: ErrorContext): void {
    const timestamp = new Date().toISOString();

    this.log('\n--- Error Captured (Development Mode) ---');
    this.log('Timestamp:', timestamp);

    if (this.config !== null) {
      this.log('Environment:', this.config.environment);
      if (this.config.release !== undefined) {
        this.log('Release:', this.config.release);
      }
    }

    if (this.userContext !== null) {
      this.log('User:', this.userContext);
    }

    if (context !== undefined) {
      if (context.user !== undefined) {
        this.log('Context User:', context.user);
      }
      if (context.request !== undefined) {
        this.log('Context Request:', context.request);
      }
      if (context.tags !== undefined) {
        this.log('Tags:', context.tags);
      }
      if (context.extra !== undefined) {
        this.log('Extra:', context.extra);
      }
    }

    if (this.breadcrumbs.length > 0) {
      this.log('Breadcrumbs:', this.breadcrumbs);
    }

    this.log('Error:', error);
    this.log('------------------------------------------\n');
  }

  setUserContext(userId: string, email?: string): void {
    this.userContext = email !== undefined ? { userId, email } : { userId };
    this.log(
      '[ErrorTracking] User context set',
      email !== undefined ? { userId, email } : { userId },
    );
  }

  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    const breadcrumb =
      data !== undefined
        ? {
            message,
            category,
            data,
            timestamp: new Date().toISOString(),
          }
        : {
            message,
            category,
            timestamp: new Date().toISOString(),
          };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the last 20 breadcrumbs
    if (this.breadcrumbs.length > 20) {
      this.breadcrumbs.shift();
    }
  }
}
