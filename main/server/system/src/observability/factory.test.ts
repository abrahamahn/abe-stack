// main/server/system/src/observability/factory.test.ts
import { describe, expect, it } from 'vitest';

import { createErrorTracker } from './factory';
import { NoopErrorTrackingProvider } from './noop.provider';
import { SentryNodeProvider } from './sentry.provider';

import type { ErrorTrackingConfig } from './types';

describe('createErrorTracker', () => {
  it('should return NoopErrorTrackingProvider when DSN is null', () => {
    const config: ErrorTrackingConfig = {
      dsn: null,
      environment: 'test',
    };

    const tracker = createErrorTracker(config);
    expect(tracker).toBeInstanceOf(NoopErrorTrackingProvider);
  });

  it('should return NoopErrorTrackingProvider when DSN is empty string', () => {
    const config: ErrorTrackingConfig = {
      dsn: '',
      environment: 'test',
    };

    const tracker = createErrorTracker(config);
    expect(tracker).toBeInstanceOf(NoopErrorTrackingProvider);
  });

  it('should return SentryNodeProvider when DSN is provided', () => {
    const config: ErrorTrackingConfig = {
      dsn: 'https://example.com/sentry',
      environment: 'test',
    };

    const tracker = createErrorTracker(config);
    expect(tracker).toBeInstanceOf(SentryNodeProvider);
  });

  it('should return SentryNodeProvider with full config', () => {
    const config: ErrorTrackingConfig = {
      dsn: 'https://public@sentry.io/123',
      environment: 'production',
      release: 'v1.2.3',
      sampleRate: 0.5,
    };

    const tracker = createErrorTracker(config);
    expect(tracker).toBeInstanceOf(SentryNodeProvider);
  });

  it('should return a working provider that implements the interface', () => {
    const config: ErrorTrackingConfig = {
      dsn: 'https://example.com/sentry',
      environment: 'test',
    };

    const tracker = createErrorTracker(config);

    // Verify all required methods exist
    expect(tracker.init).toBeDefined();
    expect(tracker.captureError).toBeDefined();
    expect(tracker.setUserContext).toBeDefined();
    expect(tracker.addBreadcrumb).toBeDefined();

    // Verify methods are callable
    expect(() => {
      tracker.init(config);
    }).not.toThrow();
    expect(() => {
      tracker.captureError(new Error('Test'));
    }).not.toThrow();
    expect(() => {
      tracker.setUserContext('user123');
    }).not.toThrow();
    expect(() => {
      tracker.addBreadcrumb('test', 'category');
    }).not.toThrow();
  });

  it('should return a noop provider that is callable with zero overhead', () => {
    const config: ErrorTrackingConfig = {
      dsn: null,
      environment: 'test',
    };

    const tracker = createErrorTracker(config);

    // Verify all methods exist and are callable
    expect(() => {
      tracker.init(config);
    }).not.toThrow();
    expect(() => {
      tracker.captureError(new Error('Test'));
    }).not.toThrow();
    expect(() => {
      tracker.setUserContext('user123', 'test@example.com');
    }).not.toThrow();
    expect(() => {
      tracker.addBreadcrumb('test', 'category', { data: 'value' });
    }).not.toThrow();
  });
});
