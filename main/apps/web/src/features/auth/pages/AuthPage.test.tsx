// main/apps/web/src/features/auth/pages/AuthPage.test.tsx
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach } from 'vitest';

// Mock API hooks - useEnabledOAuthProviders and getOAuthLoginUrl are in @abe-stack/api
vi.mock('@abe-stack/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/api')>();
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

import { renderWithProviders } from './../../../__tests__/utils';
import { AuthPage } from './AuthPage';

// Mock the auth hook
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockResendVerification = vi.fn();
const mockUseAuth = vi.fn(() => ({
  login: mockLogin,
  register: mockRegister,
  forgotPassword: mockForgotPassword,
  resetPassword: mockResetPassword,
  resendVerification: mockResendVerification,
  isLoading: false,
  user: null,
  isAuthenticated: false,
  logout: vi.fn(),
}));

vi.mock('@auth/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@auth/hooks')>();
  return {
    ...actual,
    useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
  };
});

describe('AuthPage', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      forgotPassword: mockForgotPassword,
      resetPassword: mockResetPassword,
      resendVerification: mockResendVerification,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
    });
  });

  const renderAuthPage = (route = '/auth?mode=login') =>
    renderWithProviders(<AuthPage />, { route });

  it('should render', () => {
    const { container } = renderAuthPage();
    expect(container).toBeInTheDocument();
  });

  it('should render login form by default', () => {
    renderAuthPage('/auth');
    // The form should render with login mode as default
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('should render register form when mode is register', () => {
    renderAuthPage('/auth?mode=register');
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  it('should render forgot password form when mode is forgot-password', () => {
    renderAuthPage('/auth?mode=forgot-password');
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
  });
});
