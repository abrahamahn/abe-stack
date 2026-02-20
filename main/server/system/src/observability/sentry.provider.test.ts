// main/server/system/src/observability/sentry.provider.test.ts
/**
 * SentryNodeProvider Unit Tests
 *
 * Verifies graceful degradation when @sentry/node is absent,
 * and that the provider implements the ErrorTrackingProvider interface.
 *
 * Note: actual Sentry SDK calls are not tested (require real DSN + network).
 * These tests focus on the initialization guard, no-op behavior, and interface compliance.
 */

import { describe, expect, it, vi } from 'vitest';

import { SentryNodeProvider } from './sentry.provider';

import type { ErrorTrackingConfig } from './types';

describe('SentryNodeProvider', () => {
  it('implements the ErrorTrackingProvider interface', () => {
    const provider = new SentryNodeProvider();

    expect(typeof provider.init).toBe('function');
    expect(typeof provider.captureError).toBe('function');
    expect(typeof provider.setUserContext).toBe('function');
    expect(typeof provider.addBreadcrumb).toBe('function');
  });

  it('is a no-op when DSN is null', () => {
    const provider = new SentryNodeProvider();
    const config: ErrorTrackingConfig = { dsn: null, environment: 'test' };

    expect(() => provider.init(config)).not.toThrow();
    expect(() => provider.captureError(new Error('test'))).not.toThrow();
    expect(() => provider.setUserContext('user-1')).not.toThrow();
    expect(() => provider.addBreadcrumb('msg', 'cat')).not.toThrow();
  });

  it('is a no-op when DSN is empty string', () => {
    const provider = new SentryNodeProvider();
    const config: ErrorTrackingConfig = { dsn: '', environment: 'test' };

    expect(() => provider.init(config)).not.toThrow();
    expect(() => provider.captureError(new Error('test'))).not.toThrow();
    expect(() => provider.setUserContext('user-1', 'test@example.com')).not.toThrow();
    expect(() => provider.addBreadcrumb('msg', 'cat', { key: 'value' })).not.toThrow();
  });

  it('calling methods before init is safe (no crash)', () => {
    const provider = new SentryNodeProvider();

    expect(() => provider.captureError(new Error('premature'))).not.toThrow();
    expect(() => provider.setUserContext('user-1')).not.toThrow();
    expect(() => provider.addBreadcrumb('nav', 'ui')).not.toThrow();
  });

  it('init with a DSN does not throw even if @sentry/node is unavailable', () => {
    const provider = new SentryNodeProvider();
    const config: ErrorTrackingConfig = {
      dsn: 'https://public@sentry.io/123',
      environment: 'production',
      release: 'v1.2.3',
      sampleRate: 0.5,
    };

    // @sentry/node may or may not be installed in the test environment.
    // Either way, init() must not throw.
    expect(() => provider.init(config)).not.toThrow();
  });

  it('captureError with full context does not throw', () => {
    const provider = new SentryNodeProvider();
    const config: ErrorTrackingConfig = { dsn: null, environment: 'test' };
    provider.init(config);

    expect(() =>
      provider.captureError(new Error('ctx error'), {
        user: { id: 'u-1', email: 'user@test.com' },
        request: { url: '/api/test', method: 'POST' },
        tags: { feature: 'billing' },
        extra: { planId: 'plan-pro' },
      }),
    ).not.toThrow();
  });

  it('captureError with non-Error value does not throw', () => {
    const provider = new SentryNodeProvider();
    provider.init({ dsn: null, environment: 'test' });

    expect(() => provider.captureError('string error')).not.toThrow();
    expect(() => provider.captureError({ code: 'ERR_UNKNOWN' })).not.toThrow();
    expect(() => provider.captureError(null)).not.toThrow();
  });

  it('addBreadcrumb with and without data does not throw', () => {
    const provider = new SentryNodeProvider();
    provider.init({ dsn: null, environment: 'test' });

    expect(() => provider.addBreadcrumb('clicked login', 'ui')).not.toThrow();
    expect(() =>
      provider.addBreadcrumb('API call', 'http', { method: 'POST', url: '/api/auth/login' }),
    ).not.toThrow();
  });

  it('multiple init calls do not accumulate side effects', () => {
    const provider = new SentryNodeProvider();
    const config: ErrorTrackingConfig = { dsn: null, environment: 'test' };

    // Calling init multiple times should not throw
    expect(() => {
      provider.init(config);
      provider.init(config);
    }).not.toThrow();
  });

  it('spy on console: init with null DSN logs nothing', () => {
    const consoleSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const provider = new SentryNodeProvider();

    provider.init({ dsn: null, environment: 'test' });

    // null DSN → provider skips initialization → no stderr output
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
