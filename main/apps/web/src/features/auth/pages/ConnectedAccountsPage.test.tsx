// main/apps/web/src/features/auth/pages/ConnectedAccountsPage.test.tsx
import { screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { renderWithProviders } from '../../../__tests__/utils';

import { ConnectedAccountsPage } from './ConnectedAccountsPage';

// Mock the react hooks consumed by the page
vi.mock('@abe-stack/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/react')>();
  return {
    ...actual,
    useEnabledOAuthProviders: () => ({
      providers: [],
      isLoading: false,
      error: null,
    }),
    useOAuthConnections: () => ({
      connections: [],
      isLoading: false,
      isActing: false,
      unlink: vi.fn(),
      refresh: vi.fn(),
      error: null,
    }),
    getOAuthLoginUrl: () => 'http://example.com/oauth',
  };
});

describe('ConnectedAccountsPage', () => {
  it('should render', () => {
    renderWithProviders(<ConnectedAccountsPage />);

    expect(screen.getByRole('heading', { name: /connected accounts/i })).toBeInTheDocument();
  });

  it('should show no providers message when none are enabled', () => {
    renderWithProviders(<ConnectedAccountsPage />);

    expect(screen.getByText(/no oauth providers are currently enabled/i)).toBeInTheDocument();
  });
});
