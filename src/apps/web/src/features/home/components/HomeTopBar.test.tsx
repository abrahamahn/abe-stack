// apps/web/src/features/home/components/HomeTopBar.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeTopBar } from './HomeTopBar';

import type { HomeTopBarProps } from './HomeTopBar';
import type { ComponentProps, ElementType, ReactElement, ReactNode } from 'react';

const mockToggle = vi.fn();
const mockUseSidePeek = vi.fn().mockReturnValue({
  isOpen: false,
  peekPath: null,
  open: vi.fn(),
  close: vi.fn(),
  toggle: mockToggle,
});

vi.mock('@abe-stack/react', () => ({
  toastStore: {
    getState: (): { show: typeof vi.fn } => ({
      show: vi.fn(),
    }),
  },
}));

vi.mock('@abe-stack/ui', () => {
  const mockUseSidePeekHook = (): ReturnType<typeof mockUseSidePeek> => mockUseSidePeek();

  const mockButton = ({
    children,
    onClick,
    variant,
    ...props
  }: ComponentProps<'button'> & { variant?: string }): ReactElement => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  );

  const mockHeading = ({
    children,
    as: tag = 'h1',
  }: {
    children: ReactNode;
    as?: ElementType;
    size?: string;
    className?: string;
  }): ReactElement => {
    const Tag = tag;
    return <Tag>{children}</Tag>;
  };

  const mockResizablePanel = ({
    children,
    collapsed,
    ...props
  }: {
    children: ReactNode;
    collapsed?: boolean;
    'data-testid'?: string;
  }): ReactElement => (
    <div data-testid={props['data-testid']} data-collapsed={collapsed}>
      {children}
    </div>
  );

  const mockText = ({ children, ...props }: ComponentProps<'span'>): ReactElement => (
    <span {...props}>{children}</span>
  );

  return {
    useSidePeek: mockUseSidePeekHook,
    Button: mockButton,
    Heading: mockHeading,
    ResizablePanel: mockResizablePanel,
    Text: mockText,
  };
});

describe('HomeTopBar', () => {
  const defaultProps: HomeTopBarProps = {
    size: 6,
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
    render(<HomeTopBar {...defaultProps} />);
    expect(screen.getByTestId('home-top-panel')).toBeInTheDocument();
  });

  it('renders the ABE Stack heading', () => {
    render(<HomeTopBar {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'ABE Stack' })).toBeInTheDocument();
  });

  it('renders Side Peek toggle button', () => {
    render(<HomeTopBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /toggle side peek/i })).toBeInTheDocument();
  });

  it('passes collapsed prop based on visible state', () => {
    const { rerender } = render(<HomeTopBar {...defaultProps} visible={true} />);
    expect(screen.getByTestId('home-top-panel')).toHaveAttribute('data-collapsed', 'false');

    rerender(<HomeTopBar {...defaultProps} visible={false} />);
    expect(screen.getByTestId('home-top-panel')).toHaveAttribute('data-collapsed', 'true');
  });

  describe('when not authenticated', () => {
    it('renders Login button', () => {
      render(<HomeTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('renders Register button', () => {
      render(<HomeTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    });

    it('calls onOpenAuthModal with login mode when Login is clicked', () => {
      const onOpenAuthModal = vi.fn();
      render(<HomeTopBar {...defaultProps} onOpenAuthModal={onOpenAuthModal} />);
      fireEvent.click(screen.getByRole('button', { name: 'Login' }));
      expect(onOpenAuthModal).toHaveBeenCalledWith('login');
    });

    it('calls onOpenAuthModal with register mode when Register is clicked', () => {
      const onOpenAuthModal = vi.fn();
      render(<HomeTopBar {...defaultProps} onOpenAuthModal={onOpenAuthModal} />);
      fireEvent.click(screen.getByRole('button', { name: 'Register' }));
      expect(onOpenAuthModal).toHaveBeenCalledWith('register');
    });

    it('does not show Logout button', () => {
      render(<HomeTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
    });
  });

  describe('when authenticated', () => {
    const authenticatedProps: HomeTopBarProps = {
      ...defaultProps,
      isAuthenticated: true,
      user: { email: 'test@example.com' },
    };

    it('shows user email', () => {
      render(<HomeTopBar {...authenticatedProps} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('renders Logout button', () => {
      render(<HomeTopBar {...authenticatedProps} />);
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('calls onLogout when Logout is clicked', () => {
      const onLogout = vi.fn().mockResolvedValue(undefined);
      render(<HomeTopBar {...authenticatedProps} onLogout={onLogout} />);
      fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('does not show Login or Register buttons', () => {
      render(<HomeTopBar {...authenticatedProps} />);
      expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
    });
  });
});
