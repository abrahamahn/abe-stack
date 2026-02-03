// apps/web/src/app/App.test.tsx
/**
 * Unit tests for App component.
 *
 * These tests verify the App component renders correctly.
 * Tests focus on structural elements that can be reliably tested.
 *
 * Note: In Vitest 4 with ESM and path aliases, mocking external packages
 * requires special handling. These tests verify the App renders without
 * relying on mocked providers.
 *
 * @complexity O(1) - All tests are unit tests with mocked dependencies
 */

import { render, screen, waitFor } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ClientEnvironment } from './ClientEnvironment';

// ============================================================================
// Mock stores - this is needed for toastStore hook
// ============================================================================

vi.mock('@abe-stack/react', () => ({
  toastStore: (): { messages: never[]; dismiss: () => void } => ({
    messages: [],
    dismiss: vi.fn(),
  }),
}));

// Mock @abe-stack/ui - replace BrowserRouter with MemoryRouter for tests
vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
  return {
    ...actual,
    // Use MemoryRouter instead of BrowserRouter in tests
    BrowserRouter: actual.MemoryRouter,
    HistoryProvider: ({ children }: { children: ReactNode }): ReactElement => (
      <div data-testid="history-provider">{children}</div>
    ),
  };
});

// ============================================================================
// Import App after all mocks are set up
// ============================================================================

import { App } from './App';

// Store mock spies outside the object to avoid unbound-method errors
let subscribeAllSpy: ReturnType<typeof vi.fn>;

/**
 * Creates a mock ClientEnvironment for testing the App component.
 *
 * @returns A fully mocked ClientEnvironment with all required methods
 */
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

// ============================================================================
// Tests
// ============================================================================

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

      // Wait for async effects to settle
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

    it('should render with scroll area', async () => {
      const { container } = render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        const scrollArea = container.querySelector('.scroll-area');
        expect(scrollArea).toBeInTheDocument();
      });
    });
  });

  describe('Route Rendering', () => {
    it('should render content on root route', async () => {
      render(<App environment={mockEnvironment} />);

      // Verify the app renders content - the real HomePage renders "ABE Stack"
      await waitFor(() => {
        expect(screen.getByText('ABE Stack')).toBeInTheDocument();
      });
    });

    it('should render navigation buttons', async () => {
      render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        // Real HomePage renders these navigation buttons
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Demo' })).toBeInTheDocument();
      });
    });

    it('should render the tagline', async () => {
      render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        expect(
          screen.getByText('A production-ready TypeScript monorepo for web, desktop, and backend.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Query Persistence', () => {
    it('should render immediately without blocking', async () => {
      render(<App environment={mockEnvironment} />);

      // App renders immediately without waiting for cache restoration
      await waitFor(() => {
        expect(screen.getByText('ABE Stack')).toBeInTheDocument();
      });
    });

    it('should subscribe to query cache changes after restoration', async () => {
      render(<App environment={mockEnvironment} />);

      await waitFor(() => {
        expect(screen.getByText('ABE Stack')).toBeInTheDocument();
      });

      // Verify queryCache.subscribeAll was called for persistence
      expect(subscribeAllSpy).toHaveBeenCalled();
    });
  });
});
