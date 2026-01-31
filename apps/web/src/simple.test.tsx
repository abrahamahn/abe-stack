// apps/web/src/simple.test.tsx
/**
 * Test infrastructure verification tests.
 *
 * These tests verify that the test infrastructure (providers, mocks, etc.)
 * is working correctly before running more complex integration tests.
 */
import { QueryCache, QueryCacheProvider, useQuery } from '@abe-stack/client';
import { MemoryRouter, useAuthModeNavigation, useNavigate } from '@abe-stack/ui';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './__tests__/utils';
import { useAuth } from './features/auth/hooks/useAuth';
import { LoginPage } from './features/auth/pages/Login';

import type { ReactNode } from 'react';

describe('QueryCacheProvider infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide cache to useQuery hook', async () => {
    const cache = new QueryCache();

    const wrapper = ({ children }: { children: ReactNode }): React.ReactElement => {
      return React.createElement(QueryCacheProvider, { cache, children });
    };

    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['test'],
          queryFn,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual({ data: 'test' });
    expect(queryFn).toHaveBeenCalled();
  });
});

describe('MemoryRouter infrastructure', () => {
  it('should provide router context to components', () => {
    function TestComponent(): React.ReactElement {
      const navigate = useNavigate();
      return <div data-testid="test">Router works! {typeof navigate}</div>;
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <TestComponent />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('test')).toHaveTextContent('Router works! function');
  });
});

describe('renderWithProviders utility', () => {
  it('should provide all contexts correctly', () => {
    function TestComponent(): React.ReactElement {
      const navigate = useNavigate();
      return <div data-testid="rwp-test">renderWithProviders works! {typeof navigate}</div>;
    }

    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('rwp-test')).toHaveTextContent('renderWithProviders works! function');
  });

  it('should support hooks from @abe-stack/ui', () => {
    function TestComponent(): React.ReactElement {
      const { navigateToMode } = useAuthModeNavigation();
      return <div data-testid="auth-nav-test">Auth nav works! {typeof navigateToMode}</div>;
    }

    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('auth-nav-test')).toHaveTextContent('Auth nav works! function');
  });

  it('should support useAuth from web app', () => {
    function TestComponent(): React.ReactElement {
      const { isAuthenticated } = useAuth();
      const { navigateToMode } = useAuthModeNavigation();
      return (
        <div data-testid="combined-test">
          Combined works! Auth: {String(isAuthenticated)}, Nav: {typeof navigateToMode}
        </div>
      );
    }

    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('combined-test')).toHaveTextContent('Combined works!');
  });

  it('should render LoginPage with all providers', () => {
    // Mock fetch to prevent OAuth provider fetching error
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ providers: [] }),
      }),
    );

    renderWithProviders(<LoginPage />);

    // Verify the form renders
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
