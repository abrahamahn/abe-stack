// apps/web/src/app/__tests__/root.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { App } from '@app/root';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ClientEnvironment } from '@app/ClientEnvironment';

// Mock all page components
vi.mock('../../pages/HomePage', () => ({
  HomePage: (): React.ReactElement => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('../../features/dashboard', () => ({
  DashboardPage: (): React.ReactElement => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

vi.mock('../../features/demo', () => ({
  DemoPage: (): React.ReactElement => <div data-testid="demo-page">Demo Page</div>,
}));

// Mock auth feature (LoginPage, RegisterPage + ProtectedRoute)
vi.mock('../../features/auth', () => ({
  LoginPage: (): React.ReactElement => <div data-testid="login-page">Login Page</div>,
  RegisterPage: (): React.ReactElement => <div data-testid="register-page">Register Page</div>,
  AuthPage: (): React.ReactElement => <div data-testid="auth-page">Auth Page</div>,
  ResetPasswordPage: (): React.ReactElement => (
    <div data-testid="reset-password-page">Reset Password</div>
  ),
  ConfirmEmailPage: (): React.ReactElement => (
    <div data-testid="confirm-email-page">Confirm Email</div>
  ),
  ProtectedRoute: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div data-testid="protected-route">{children}</div>
  ),
}));

// Mock @abe-stack/core toastStore
vi.mock('@abe-stack/core', () => ({
  toastStore: (): { messages: never[]; dismiss: () => void } => ({
    messages: [],
    dismiss: vi.fn(),
  }),
}));

// Mock AppProvider to pass through children with a MemoryRouter (for Routes to work)
vi.mock('../AppProvider', () => ({
  AppProvider: ({ children }: { children?: React.ReactNode }): React.ReactElement => (
    <MemoryRouter>
      <div data-testid="app-provider">{children}</div>
    </MemoryRouter>
  ),
}));

// Mock @abe-stack/ui ScrollArea and Toaster
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    ScrollArea: ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <div>{children}</div>
    ),
    Toaster: (): React.ReactElement => <div data-testid="toaster">Toaster</div>,
  };
});

// Import App after mocks are set up

// Create a mock environment for testing
function createMockEnvironment(): ClientEnvironment {
  return {
    config: {
      mode: 'test',
      isDev: true,
      isProd: false,
      apiUrl: 'http://localhost:3000/api',
      tokenRefreshInterval: 5 * 60 * 1000,
      uiVersion: '1.0.0',
    },
    queryClient: {
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      getQueryState: vi.fn(),
      removeQueries: vi.fn(),
    } as unknown as ClientEnvironment['queryClient'],
    auth: {
      getState: vi.fn(() => ({ user: null, isLoading: false, isAuthenticated: false })),
      subscribe: vi.fn(() => () => {}),
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshToken: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      verifyEmail: vi.fn(),
      fetchCurrentUser: vi.fn(),
      initialize: vi.fn(),
      destroy: vi.fn(),
    } as unknown as ClientEnvironment['auth'],
  };
}

describe('App', () => {
  let mockEnvironment: ClientEnvironment;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironment = createMockEnvironment();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<App environment={mockEnvironment} />);
      }).not.toThrow();
    });

    it('should render the theme container', () => {
      const { container } = render(<App environment={mockEnvironment} />);

      const themeContainer = container.querySelector('.theme');
      expect(themeContainer).toBeInTheDocument();
    });

    it('should have full viewport height', () => {
      const { container } = render(<App environment={mockEnvironment} />);

      const themeContainer = container.querySelector('.theme');
      // Check for h-screen class which applies full viewport height
      expect(themeContainer).toHaveClass('h-screen');
    });

    it('should render the Toaster component', () => {
      const { getByTestId } = render(<App environment={mockEnvironment} />);

      expect(getByTestId('toaster')).toBeInTheDocument();
    });

    it('should render within AppProvider', () => {
      const { getByTestId } = render(<App environment={mockEnvironment} />);

      expect(getByTestId('app-provider')).toBeInTheDocument();
      expect(getByTestId('toaster')).toBeInTheDocument();
    });
  });

  describe('Route Rendering', () => {
    it('should render HomePage on root route', () => {
      render(<App environment={mockEnvironment} />);

      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });
});
