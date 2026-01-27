// apps/web/src/app/__tests__/App.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

import type { ClientEnvironment } from './ClientEnvironment';

// Mock all page components - use alias paths to match App.tsx imports
const HomePage = (): ReactElement => <div data-testid="home-page">Home Page</div>;
vi.mock('@pages/HomePage', () => ({ HomePage }));

const DashboardPage = (): ReactElement => <div data-testid="dashboard-page">Dashboard Page</div>;
vi.mock('@features/dashboard', () => ({ DashboardPage }));

const DemoPage = (): ReactElement => <div data-testid="demo-page">Demo Page</div>;
const SidePeekDemoPage = (): ReactElement => (
  <div data-testid="side-peek-demo-page">Side Peek Demo Page</div>
);
vi.mock('@demo', () => ({ DemoPage, SidePeekDemoPage }));

// Mock auth feature (LoginPage, RegisterPage + ProtectedRoute)
const LoginPage = (): ReactElement => <div data-testid="login-page">Login Page</div>;
const RegisterPage = (): ReactElement => <div data-testid="register-page">Register Page</div>;
const AuthPage = (): ReactElement => <div data-testid="auth-page">Auth Page</div>;
const ResetPasswordPage = (): ReactElement => (
  <div data-testid="reset-password-page">Reset Password</div>
);
const ConfirmEmailPage = (): ReactElement => (
  <div data-testid="confirm-email-page">Confirm Email</div>
);
const ConnectedAccountsPage = (): ReactElement => (
  <div data-testid="connected-accounts-page">Connected Accounts</div>
);
const ProtectedRoute = ({ children }: { children: ReactNode }): ReactElement => (
  <div data-testid="protected-route">{children}</div>
);
vi.mock('@features/auth', () => ({
  LoginPage,
  RegisterPage,
  AuthPage,
  ResetPasswordPage,
  ConfirmEmailPage,
  ConnectedAccountsPage,
  ProtectedRoute,
}));

// Mock @abe-stack/core toastStore
vi.mock('@abe-stack/core', () => ({
  toastStore: (): { messages: never[]; dismiss: () => void } => ({
    messages: [],
    dismiss: vi.fn(),
  }),
}));

// Mock @abe-stack/sdk
const QueryCacheProvider = ({ children }: { children: ReactNode }): ReactElement => (
  <div data-testid="query-cache-provider">{children}</div>
);
vi.mock('@abe-stack/sdk', () => ({
  createQueryPersister: vi.fn(() => ({
    persistClient: vi.fn(),
    restoreClient: vi.fn().mockResolvedValue(undefined),
    removeClient: vi.fn(),
  })),
  QueryCacheProvider,
}));

// Mock @abe-stack/ui - replace BrowserRouter with MemoryRouter for tests
const ScrollArea = ({ children }: { children: ReactNode }): ReactElement => <div>{children}</div>;
const Toaster = (): ReactElement => <div data-testid="toaster">Toaster</div>;
const HistoryProvider = ({ children }: { children: ReactNode }): ReactElement => (
  <div data-testid="history-provider">{children}</div>
);

vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    // Use MemoryRouter instead of BrowserRouter in tests
    BrowserRouter: (actual as Record<string, unknown>)['MemoryRouter'],
    ScrollArea,
    Toaster,
    HistoryProvider,
  };
});

// Store mock spies outside the object to avoid unbound-method errors
let subscribeAllSpy: ReturnType<typeof vi.fn>;

// Create a mock environment for testing
const createMockEnvironment = (): ClientEnvironment => {
  subscribeAllSpy = vi.fn(() => vi.fn());
  const getQueryDataMock = vi.fn();
  const setQueryDataMock = vi.fn();
  const getQueryStateMock = vi.fn();
  const invalidateQueriesMock = vi.fn();
  const subscribeMock = vi.fn(() => vi.fn());
  const getAllMock = vi.fn(() => []);

  const getStateMock = vi.fn(() => ({ user: null, isLoading: false, isAuthenticated: false }));
  const authSubscribeMock = vi.fn(() => () => {});
  const loginMock = vi.fn();
  const logoutMock = vi.fn();
  const registerMock = vi.fn();
  const refreshTokenMock = vi.fn();
  const forgotPasswordMock = vi.fn();
  const resetPasswordMock = vi.fn();
  const verifyEmailMock = vi.fn();
  const fetchCurrentUserMock = vi.fn();
  const initializeMock = vi.fn();
  const destroyMock = vi.fn();

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
      getQueryData: getQueryDataMock,
      setQueryData: setQueryDataMock,
      getQueryState: getQueryStateMock,
      invalidateQueries: invalidateQueriesMock,
      subscribe: subscribeMock,
      subscribeAll: subscribeAllSpy,
      getAll: getAllMock,
    } as unknown as ClientEnvironment['queryCache'],
    auth: {
      getState: getStateMock,
      subscribe: authSubscribeMock,
      login: loginMock,
      logout: logoutMock,
      register: registerMock,
      refreshToken: refreshTokenMock,
      forgotPassword: forgotPasswordMock,
      resetPassword: resetPasswordMock,
      verifyEmail: verifyEmailMock,
      fetchCurrentUser: fetchCurrentUserMock,
      initialize: initializeMock,
      destroy: destroyMock,
    } as unknown as ClientEnvironment['auth'],
  };
};

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
      expect(subscribeAllSpy).toHaveBeenCalled();
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
