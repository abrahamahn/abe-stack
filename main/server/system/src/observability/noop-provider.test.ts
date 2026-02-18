// main/server/system/src/observability/noop-provider.test.ts
import { describe, expect, it } from 'vitest';

import { NoopErrorTrackingProvider } from './noop-provider';

import type { ErrorTrackingConfig } from './types';

describe('NoopErrorTrackingProvider', () => {
  const mockConfig: ErrorTrackingConfig = {
    dsn: null,
    environment: 'test',
    release: '1.0.0',
    sampleRate: 1.0,
  };

  it('should initialize without error', () => {
    const provider = new NoopErrorTrackingProvider();
    expect(() => {
      provider.init(mockConfig);
    }).not.toThrow();
  });

  it('should capture errors without error', () => {
    const provider = new NoopErrorTrackingProvider();
    const error = new Error('Test error');
    const context = {
      user: { id: 'user123', email: 'test@example.com' },
      tags: { feature: 'auth' },
    };

    expect(() => {
      provider.captureError(error, context);
    }).not.toThrow();
  });

  it('should set user context without error', () => {
    const provider = new NoopErrorTrackingProvider();
    expect(() => {
      provider.setUserContext('user123', 'test@example.com');
    }).not.toThrow();
  });

  it('should add breadcrumbs without error', () => {
    const provider = new NoopErrorTrackingProvider();
    expect(() => {
      provider.addBreadcrumb('User logged in', 'auth', { userId: '123' });
    }).not.toThrow();
  });

  it('should handle all methods being called in sequence', () => {
    const provider = new NoopErrorTrackingProvider();

    expect(() => {
      provider.init(mockConfig);
      provider.setUserContext('user123', 'test@example.com');
      provider.addBreadcrumb('Action 1', 'navigation');
      provider.addBreadcrumb('Action 2', 'form', { field: 'email' });
      provider.captureError(new Error('Test error'));
    }).not.toThrow();
  });

  it('should accept captureError with no context', () => {
    const provider = new NoopErrorTrackingProvider();
    expect(() => {
      provider.captureError('Simple error string');
    }).not.toThrow();
  });

  it('should accept setUserContext with no email', () => {
    const provider = new NoopErrorTrackingProvider();
    expect(() => {
      provider.setUserContext('user123');
    }).not.toThrow();
  });

  it('should accept addBreadcrumb with no data', () => {
    const provider = new NoopErrorTrackingProvider();
    expect(() => {
      provider.addBreadcrumb('Simple breadcrumb', 'system');
    }).not.toThrow();
  });
});
