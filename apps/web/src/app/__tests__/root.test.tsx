// apps/web/src/app/__tests__/root.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

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
vi.mock('../ClientEnvironment', () => ({
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
import { App } from '../root';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<App />);
      }).not.toThrow();
    });

    it('should render the theme container', () => {
      const { container } = render(<App />);

      const themeContainer = container.querySelector('.theme');
      expect(themeContainer).toBeInTheDocument();
    });

    it('should have full viewport height', () => {
      const { container } = render(<App />);

      const themeContainer = container.querySelector('.theme');
      expect(themeContainer).toHaveStyle({ height: '100vh' });
    });

    it('should render the Toaster component', () => {
      const { getByTestId } = render(<App />);

      expect(getByTestId('toaster')).toBeInTheDocument();
    });

    it('should render within AppProvider', () => {
      const { getByTestId } = render(<App />);

      expect(getByTestId('app-provider')).toBeInTheDocument();
      expect(getByTestId('toaster')).toBeInTheDocument();
    });
  });

  describe('Route Rendering', () => {
    it('should render HomePage on root route', () => {
      render(<App />);

      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });
});
