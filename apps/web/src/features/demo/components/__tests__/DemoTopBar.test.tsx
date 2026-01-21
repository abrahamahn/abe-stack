// apps/web/src/features/demo/components/__tests__/DemoTopBar.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DemoTopBar } from '../DemoTopBar';

import type { DemoTopBarProps } from '../DemoTopBar';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: (): typeof mockNavigate => mockNavigate,
}));

// Mock @abe-stack/core
vi.mock('@abe-stack/core', () => ({
  toastStore: {
    getState: (): { show: typeof vi.fn } => ({
      show: vi.fn(),
    }),
  },
}));

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  Button: ({
    children,
    onClick,
    variant,
    ...props
  }: React.ComponentProps<'button'> & { variant?: string }): React.ReactElement => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
  Heading: ({
    children,
    as: Tag = 'h1',
  }: {
    children: React.ReactNode;
    as?: React.ElementType;
    size?: string;
  }): React.ReactElement => React.createElement(Tag, null, children),
  ResizablePanel: ({
    children,
    collapsed,
    onResize: _onResize,
    ...props
  }: {
    children: React.ReactNode;
    collapsed?: boolean;
    onResize?: (size: number) => void;
    'data-testid'?: string;
  }): React.ReactElement => (
    <div data-testid={props['data-testid']} data-collapsed={collapsed}>
      {children}
    </div>
  ),
  Text: ({ children, ...props }: React.ComponentProps<'span'>): React.ReactElement => (
    <span {...props}>{children}</span>
  ),
}));

describe('DemoTopBar', () => {
  const defaultProps: DemoTopBarProps = {
    size: 10,
    visible: true,
    onResize: vi.fn(),
    isAuthenticated: false,
    user: null,
    onLogout: vi.fn().mockResolvedValue(undefined),
    onOpenAuthModal: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the resizable panel with correct data-testid', () => {
    render(<DemoTopBar {...defaultProps} />);
    expect(screen.getByTestId('demo-top-panel')).toBeInTheDocument();
  });

  it('renders the title heading', () => {
    render(<DemoTopBar {...defaultProps} />);
    expect(
      screen.getByRole('heading', { name: 'ABE Stack UI Component Gallery' }),
    ).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<DemoTopBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
  });

  it('navigates to home when back button is clicked', () => {
    render(<DemoTopBar {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('passes collapsed prop based on visible state', () => {
    const { rerender } = render(<DemoTopBar {...defaultProps} visible={true} />);
    expect(screen.getByTestId('demo-top-panel')).toHaveAttribute('data-collapsed', 'false');

    rerender(<DemoTopBar {...defaultProps} visible={false} />);
    expect(screen.getByTestId('demo-top-panel')).toHaveAttribute('data-collapsed', 'true');
  });

  it('has layout label', () => {
    render(<DemoTopBar {...defaultProps} />);
    expect(screen.getByText('TopbarLayout')).toBeInTheDocument();
  });

  describe('when not authenticated', () => {
    it('renders Login button', () => {
      render(<DemoTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('renders Register button', () => {
      render(<DemoTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    });

    it('calls onOpenAuthModal with login mode when Login is clicked', () => {
      const onOpenAuthModal = vi.fn();
      render(
        <DemoTopBar {...defaultProps} isAuthenticated={false} onOpenAuthModal={onOpenAuthModal} />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Login' }));
      expect(onOpenAuthModal).toHaveBeenCalledWith('login');
    });

    it('calls onOpenAuthModal with register mode when Register is clicked', () => {
      const onOpenAuthModal = vi.fn();
      render(
        <DemoTopBar {...defaultProps} isAuthenticated={false} onOpenAuthModal={onOpenAuthModal} />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Register' }));
      expect(onOpenAuthModal).toHaveBeenCalledWith('register');
    });

    it('does not show user email', () => {
      render(<DemoTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    });

    it('does not show Logout button', () => {
      render(<DemoTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
    });
  });

  describe('when authenticated', () => {
    const authenticatedProps: DemoTopBarProps = {
      ...defaultProps,
      isAuthenticated: true,
      user: { email: 'test@example.com' },
    };

    it('shows user email', () => {
      render(<DemoTopBar {...authenticatedProps} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('renders Logout button', () => {
      render(<DemoTopBar {...authenticatedProps} />);
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('calls onLogout when Logout is clicked', () => {
      const onLogout = vi.fn().mockResolvedValue(undefined);
      render(<DemoTopBar {...authenticatedProps} onLogout={onLogout} />);

      fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('does not show Login button', () => {
      render(<DemoTopBar {...authenticatedProps} />);
      expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
    });

    it('does not show Register button', () => {
      render(<DemoTopBar {...authenticatedProps} />);
      expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
    });

    it('handles user without email gracefully', () => {
      render(<DemoTopBar {...authenticatedProps} user={{ email: undefined }} />);
      // Should not throw and should render Logout
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
  });

  it('uses primary variant for Register button', () => {
    render(<DemoTopBar {...defaultProps} isAuthenticated={false} />);
    const registerBtn = screen.getByRole('button', { name: 'Register' });
    expect(registerBtn).toHaveAttribute('data-variant', 'primary');
  });

  it('uses text variant for back button', () => {
    render(<DemoTopBar {...defaultProps} />);
    const backBtn = screen.getByRole('button', { name: /back to home/i });
    expect(backBtn).toHaveAttribute('data-variant', 'text');
  });
});
