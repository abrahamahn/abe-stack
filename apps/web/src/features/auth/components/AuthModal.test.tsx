// apps/web/src/features/auth/components/AuthModal.test.tsx
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './../../../__tests__/utils';
import { AuthModal } from './AuthModal';

// Mock SDK hooks
vi.mock('@abe-stack/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/engine')>();
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
vi.mock('@auth/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@auth/hooks')>();
  return {
    ...actual,
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
  };
});

// Mock the useResendCooldown hook
vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
  return {
    ...actual,
    useResendCooldown: () => ({
      cooldown: 0,
      isOnCooldown: false,
      startCooldown: vi.fn(),
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
