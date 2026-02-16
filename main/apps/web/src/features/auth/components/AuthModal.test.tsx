// main/apps/web/src/features/auth/components/AuthModal.test.tsx
/**
 * Unit tests for AuthModal component.
 *
 * Tests cover:
 * - Modal rendering when open/closed
 * - Integration with AuthForm component
 *
 * @complexity O(1) - All tests are unit tests with mocked dependencies
 */
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './../../../__tests__/utils';
import { AuthModal } from './AuthModal';

// Mock API hooks - useEnabledOAuthProviders and getOAuthLoginUrl are in @abe-stack/api
vi.mock('@abe-stack/api', async () => {
  const actual = await vi.importActual('@abe-stack/api');
  return {
    ...actual,
    useEnabledOAuthProviders: () => ({
      providers: [],
      isLoading: false,
      error: null,
    }),
    getOAuthLoginUrl: (baseUrl: string, provider: string) => `${baseUrl}/auth/${provider}`,
  };
});

// Mock the useAuth hook
vi.mock('@auth/hooks', () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    resendVerification: vi.fn(),
    isLoading: false,
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
  }),
}));

// Mock UI hooks - preserve real UI components via importActual
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useResendCooldown: () => ({
      cooldown: 0,
      isOnCooldown: false,
      startCooldown: vi.fn(),
      resetCooldown: vi.fn(),
    }),
  };
});

describe('AuthModal', () => {
  it('should render', () => {
    renderWithProviders(<AuthModal open={true} onOpenChange={vi.fn()} />);
    // When modal is open, the login form should be visible (default mode)
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('should not render content when closed', () => {
    renderWithProviders(<AuthModal open={false} onOpenChange={vi.fn()} />);
    // When modal is closed, the login form should not be visible
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument();
  });
});
