// apps/web/src/app/__tests__/App.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App';

import type { ClientEnvironment } from '../ClientEnvironment';

// Mock all page components - use alias paths to match App.tsx imports
vi.mock('@pages/HomePage', () => ({
  HomePage: (): React.ReactElement => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('@features/dashboard', () => ({
  DashboardPage: (): React.ReactElement => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

vi.mock('@demo', () => ({
  DemoPage: (): React.ReactElement => <div data-testid="demo-page">Demo Page</div>,
  SidePeekDemoPage: (): React.ReactElement => (
    <div data-testid="side-peek-demo-page">Side Peek Demo Page</div>
  ),
}));

// Mock auth feature (LoginPage, RegisterPage + ProtectedRoute)
vi.mock('@features/auth', () => ({
  LoginPage: (): React.ReactElement => <div data-testid="login-page">Login Page</div>,
  RegisterPage: (): React.ReactElement => <div data-testid="register-page">Register Page</div>,
  AuthPage: (): React.ReactElement => <div data-testid="auth-page">Auth Page</div>,
  ResetPasswordPage: (): React.ReactElement => (
    <div data-testid="reset-password-page">Reset Password</div>
  ),
  ConfirmEmailPage: (): React.ReactElement => (
    <div data-testid="confirm-email-page">Confirm Email</div>
  ),
  ConnectedAccountsPage: (): React.ReactElement => (
    <div data-testid="connected-accounts-page">Connected Accounts</div>
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

// Mock @abe-stack/sdk
vi.mock('@abe-stack/sdk', () => ({
  createQueryPersister: vi.fn(() => ({
    persistClient: vi.fn(),
    restoreClient: vi.fn().mockResolvedValue(undefined),
    removeClient: vi.fn(),
  })),
  QueryCacheProvider: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div data-testid="query-cache-provider">{children}</div>
  ),
}));

// Mock @abe-stack/ui - replace BrowserRouter with MemoryRouter for tests
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    // Use MemoryRouter instead of BrowserRouter in tests
    BrowserRouter: actual.MemoryRouter,
    ScrollArea: ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <div>{children}</div>
    ),
    Toaster: (): React.ReactElement => <div data-testid="toaster">Toaster</div>,
    HistoryProvider: ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <div data-testid="history-provider">{children}</div>
    ),
  };
});

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
    queryCache: {
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      getQueryState: vi.fn(),
      invalidateQueries: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      subscribeAll: vi.fn(() => vi.fn()),
      getAll: vi.fn(() => []),
    } as unknown as ClientEnvironment['queryCache'],
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
    it('should render without crashing', async () => {
      expect(() => {
        render(<App environment={mockEnvironment} />);
      }).not.toThrow();

      // Wait for async restoration to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('should render the theme container', async () => {
      const { container } = render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        const themeContainer = container.querySelector('.theme');
        expect(themeContainer).toBeInTheDocument();
      });
    });

    it('should have full viewport height', async () => {
      const { container } = render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        const themeContainer = container.querySelector('.theme');
        expect(themeContainer).toHaveClass('h-screen');
      });
    });

    it('should render the Toaster component', async () => {
      render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        expect(screen.getByTestId('toaster')).toBeInTheDocument();
      });
    });

    it('should render with manual query persistence', async () => {
      render(<App environment={mockEnvironment} />);

      // Wait for async restoration to complete, then verify app renders
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('should render with HistoryProvider', async () => {
      render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        expect(screen.getByTestId('history-provider')).toBeInTheDocument();
      });
    });
  });

  describe('Route Rendering', () => {
    it('should render HomePage on root route', async () => {
      render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });
  });

  describe('Query Persistence', () => {
    it('should render immediately without blocking (non-blocking cache restoration)', async () => {
      render(<App environment={mockEnvironment} />);

      // App renders immediately without waiting for cache restoration
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('should subscribe to query cache changes after restoration', async () => {
      render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      // Verify queryCache.subscribeAll was called for persistence
      expect(mockEnvironment.queryCache.subscribeAll).toHaveBeenCalled();
    });

    it('should handle empty persisted state gracefully', async () => {
      // Default mock returns undefined, simulating no cached data
      render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      // App renders without crashing when no cached data exists
      expect(screen.getByTestId('history-provider')).toBeInTheDocument();
    });
  });
});
