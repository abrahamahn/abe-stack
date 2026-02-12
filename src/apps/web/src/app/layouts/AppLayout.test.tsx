// src/apps/web/src/app/layouts/AppLayout.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppLayout } from './AppLayout';

import type { ReactNode } from 'react';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockTogglePane = vi.hoisted(() => vi.fn());
const mockHandlePaneResize = vi.hoisted(() => vi.fn());
const mockResetLayout = vi.hoisted(() => vi.fn());
const mockCycleTheme = vi.hoisted(() => vi.fn());
const mockCycleDensity = vi.hoisted(() => vi.fn());
const mockCycleContrastMode = vi.hoisted(() => vi.fn());
const mockSidePeekClose = vi.hoisted(() => vi.fn());

vi.mock('@auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@auth/components', () => ({
  AuthModal: ({
    open,
    initialMode,
  }: {
    open: boolean;
    initialMode: string;
    onOpenChange: (open: boolean) => void;
  }) => <div data-testid="auth-modal">{`${String(open)}:${initialMode}`}</div>,
  NewDeviceBanner: () => null,
}));

vi.mock('@ui-library/hooks', () => ({
  useUILibraryTheme: () => ({
    cycleTheme: mockCycleTheme,
    getThemeIcon: () => '☀️',
    getThemeLabel: () => 'Light',
    resolvedTheme: 'light',
  }),
  useUILibraryPanes: () => ({
    paneConfig: {
      top: { visible: true, size: 6 },
      left: { visible: true, size: 18 },
      right: { visible: true, size: 24 },
      bottom: { visible: true, size: 8 },
    },
    togglePane: mockTogglePane,
    handlePaneResize: mockHandlePaneResize,
    resetLayout: mockResetLayout,
  }),
}));

vi.mock('@abe-stack/react/router', () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
}));

vi.mock('@abe-stack/react/hooks', () => ({
  useDensity: () => ({
    density: 'normal',
    cycleDensity: mockCycleDensity,
  }),
  useContrast: () => ({
    contrastMode: 'system',
    cycleContrastMode: mockCycleContrastMode,
  }),
  useSidePeek: () => ({
    isOpen: true,
    close: mockSidePeekClose,
  }),
}));

vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
  return {
    ...actual,
    ResizablePanelGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});

vi.mock('./AppTopLayout', () => ({
  AppTopLayout: ({
    onOpenAuthModal,
  }: {
    onOpenAuthModal: (mode: 'login' | 'register') => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onOpenAuthModal('login');
      }}
    >
      Open Login
    </button>
  ),
}));

vi.mock('./AppBottomLayout', () => ({
  AppBottomLayout: () => <div>Bottom Layout</div>,
}));

vi.mock('./AppMainLayout', () => ({
  AppMainLayout: ({
    children,
    leftSidebar,
    rightSidebar,
  }: {
    children: ReactNode;
    leftSidebar: ReactNode;
    rightSidebar: ReactNode;
  }) => (
    <div>
      <div data-testid="left">{leftSidebar}</div>
      <div data-testid="main">{children}</div>
      <div data-testid="right">{rightSidebar}</div>
    </div>
  ),
}));

vi.mock('./AppSidePeekLayout', () => ({
  AppSidePeekLayout: ({ open }: { open: boolean; onClose: () => void }) => (
    <div data-testid="side-peek">{String(open)}</div>
  ),
}));

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders outlet and default sidebars', () => {
    render(<AppLayout leftSidebar={<div>Test Left</div>} rightSidebar={<div>Test Right</div>} />);

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.getByText('Test Left')).toBeInTheDocument();
    expect(screen.getByText('Test Right')).toBeInTheDocument();
    expect(screen.getByTestId('side-peek')).toHaveTextContent('true');
  });

  it('opens auth modal when top layout triggers login mode', () => {
    render(<AppLayout leftSidebar={<div>Test Left</div>} rightSidebar={<div>Test Right</div>} />);

    expect(screen.getByTestId('auth-modal')).toHaveTextContent('false:login');
    fireEvent.click(screen.getByRole('button', { name: 'Open Login' }));
    expect(screen.getByTestId('auth-modal')).toHaveTextContent('true:login');
  });

  it('handles keyboard shortcuts for visual toggles', () => {
    render(<AppLayout leftSidebar={<div>Test Left</div>} rightSidebar={<div>Test Right</div>} />);

    fireEvent.keyDown(window, { key: 't' });
    fireEvent.keyDown(window, { key: 'd' });
    fireEvent.keyDown(window, { key: 'c' });

    expect(mockCycleTheme).toHaveBeenCalledTimes(1);
    expect(mockCycleDensity).toHaveBeenCalledTimes(1);
    expect(mockCycleContrastMode).toHaveBeenCalledTimes(1);
  });
});
