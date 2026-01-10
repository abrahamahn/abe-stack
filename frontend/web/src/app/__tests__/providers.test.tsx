// apps/web/src/app/__tests__/providers.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Mock @ui's HistoryProvider
vi.mock('@ui', async () => {
  const actual = await vi.importActual('@ui');
  return {
    ...actual,
    HistoryProvider: ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <div data-testid="history-provider">{children}</div>
    ),
  };
});

// Mock AuthProvider
vi.mock('../../features/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

// Mock ApiProvider
vi.mock('../../api', () => ({
  ApiProvider: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div data-testid="api-provider">{children}</div>
  ),
}));

// Import after mocks
import { AppProviders } from '../providers';

describe('AppProviders', () => {
  it('should render children', () => {
    render(
      <AppProviders>
        <div data-testid="child">Child Content</div>
      </AppProviders>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('should wrap children with AuthProvider', () => {
    render(
      <AppProviders>
        <div>Content</div>
      </AppProviders>,
    );

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
  });

  it('should wrap children with ApiProvider', () => {
    render(
      <AppProviders>
        <div>Content</div>
      </AppProviders>,
    );

    expect(screen.getByTestId('api-provider')).toBeInTheDocument();
  });

  it('should wrap children with HistoryProvider', () => {
    render(
      <AppProviders>
        <div>Content</div>
      </AppProviders>,
    );

    expect(screen.getByTestId('history-provider')).toBeInTheDocument();
  });

  it('should maintain correct provider nesting order', () => {
    render(
      <AppProviders>
        <div data-testid="innermost">Innermost</div>
      </AppProviders>,
    );

    // AuthProvider should wrap ApiProvider which wraps HistoryProvider
    const authProvider = screen.getByTestId('auth-provider');
    const apiProvider = screen.getByTestId('api-provider');
    const historyProvider = screen.getByTestId('history-provider');
    const innermost = screen.getByTestId('innermost');

    expect(authProvider).toContainElement(apiProvider);
    expect(apiProvider).toContainElement(historyProvider);
    expect(historyProvider).toContainElement(innermost);
  });
});
