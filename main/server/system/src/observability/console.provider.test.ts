// main/server/system/src/observability/console.provider.test.ts
import { describe, expect, it, vi } from 'vitest';

import { ConsoleErrorTrackingProvider } from './console.provider';

import type { ErrorTrackingConfig } from './types';

describe('ConsoleErrorTrackingProvider', () => {
  const mockConfig: ErrorTrackingConfig = {
    dsn: 'https://example.com/sentry',
    environment: 'test',
    release: '1.0.0',
    sampleRate: 1.0,
  };

  it('should initialize and log configuration', () => {
    const mockLog = vi.fn();
    const provider = new ConsoleErrorTrackingProvider(mockLog);

    provider.init(mockConfig);

    expect(mockLog).toHaveBeenCalledWith('[ErrorTracking] Initialized (console mode)', {
      environment: 'test',
      release: '1.0.0',
      sampleRate: 1.0,
    });
  });

  it('should capture errors with context', () => {
    const mockLog = vi.fn();
    const provider = new ConsoleErrorTrackingProvider(mockLog);
    provider.init(mockConfig);

    const error = new Error('Test error');
    const context = {
      user: { id: 'user123', email: 'test@example.com' },
      request: { url: '/api/test', method: 'POST' },
      tags: { feature: 'auth' },
      extra: { additionalData: 'value' },
    };

    provider.captureError(error, context);

    // Verify error capture logged
    expect(mockLog).toHaveBeenCalledWith('\n--- Error Captured (Development Mode) ---');
    expect(mockLog).toHaveBeenCalledWith('Environment:', 'test');
    expect(mockLog).toHaveBeenCalledWith('Release:', '1.0.0');
    expect(mockLog).toHaveBeenCalledWith('Context User:', context.user);
    expect(mockLog).toHaveBeenCalledWith('Context Request:', context.request);
    expect(mockLog).toHaveBeenCalledWith('Tags:', context.tags);
    expect(mockLog).toHaveBeenCalledWith('Extra:', context.extra);
    expect(mockLog).toHaveBeenCalledWith('Error:', error);
  });

  it('should capture errors without context', () => {
    const mockLog = vi.fn();
    const provider = new ConsoleErrorTrackingProvider(mockLog);
    provider.init(mockConfig);

    const error = new Error('Simple error');
    provider.captureError(error);

    expect(mockLog).toHaveBeenCalledWith('\n--- Error Captured (Development Mode) ---');
    expect(mockLog).toHaveBeenCalledWith('Error:', error);
  });

  it('should set user context and log it', () => {
    const mockLog = vi.fn();
    const provider = new ConsoleErrorTrackingProvider(mockLog);

    provider.setUserContext('user123', 'test@example.com');

    expect(mockLog).toHaveBeenCalledWith('[ErrorTracking] User context set', {
      userId: 'user123',
      email: 'test@example.com',
    });
  });

  it('should include user context in error captures', () => {
    const mockLog = vi.fn();
    const provider = new ConsoleErrorTrackingProvider(mockLog);
    provider.init(mockConfig);
    provider.setUserContext('user123', 'test@example.com');

    const error = new Error('Test error');
    provider.captureError(error);

    expect(mockLog).toHaveBeenCalledWith('User:', {
      userId: 'user123',
      email: 'test@example.com',
    });
  });

  it('should add breadcrumbs and include them in error captures', () => {
    const mockLog = vi.fn();
    const provider = new ConsoleErrorTrackingProvider(mockLog);
    provider.init(mockConfig);

    provider.addBreadcrumb('User logged in', 'auth', { userId: '123' });
    provider.addBreadcrumb('Navigated to dashboard', 'navigation');

    const error = new Error('Test error');
    provider.captureError(error);

    // Find the breadcrumbs call
    const breadcrumbsCall = mockLog.mock.calls.find((call) => call[0] === 'Breadcrumbs:');
    expect(breadcrumbsCall).toBeDefined();

    const breadcrumbs = breadcrumbsCall?.[1] as Array<{
      message: string;
      category: string;
      data?: Record<string, unknown>;
      timestamp: string;
    }>;

    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0]).toMatchObject({
      message: 'User logged in',
      category: 'auth',
      data: { userId: '123' },
    });
    expect(breadcrumbs[0]?.timestamp).toBeDefined();
    expect(breadcrumbs[1]).toMatchObject({
      message: 'Navigated to dashboard',
      category: 'navigation',
    });
  });

  it('should limit breadcrumbs to 20 most recent', () => {
    const mockLog = vi.fn();
    const provider = new ConsoleErrorTrackingProvider(mockLog);
    provider.init(mockConfig);

    // Add 25 breadcrumbs
    for (let i = 0; i < 25; i++) {
      provider.addBreadcrumb(`Breadcrumb ${String(i)}`, 'test');
    }

    const error = new Error('Test error');
    provider.captureError(error);

    // Find the breadcrumbs call
    const breadcrumbsCall = mockLog.mock.calls.find((call) => call[0] === 'Breadcrumbs:');
    expect(breadcrumbsCall).toBeDefined();

    const breadcrumbs = breadcrumbsCall?.[1] as Array<{
      message: string;
      category: string;
    }>;

    expect(breadcrumbs).toHaveLength(20);
    // Should have the last 20 breadcrumbs (5-24)
    expect(breadcrumbs[0]?.message).toBe('Breadcrumb 5');
    expect(breadcrumbs[19]?.message).toBe('Breadcrumb 24');
  });

  it('should handle errors before initialization', () => {
    const mockLog = vi.fn();
    const provider = new ConsoleErrorTrackingProvider(mockLog);

    // Capture error before init
    const error = new Error('Test error');
    provider.captureError(error);

    // Should still log the error, just without environment/release info
    expect(mockLog).toHaveBeenCalledWith('\n--- Error Captured (Development Mode) ---');
    expect(mockLog).toHaveBeenCalledWith('Error:', error);
  });

  it('should use default console.error when no log function provided', () => {
    // This test verifies the provider can be created without a log function
    const provider = new ConsoleErrorTrackingProvider();
    expect(() => {
      provider.init(mockConfig);
    }).not.toThrow();
  });
});
