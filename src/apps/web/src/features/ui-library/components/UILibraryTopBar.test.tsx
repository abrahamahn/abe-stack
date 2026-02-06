// apps/web/src/features/ui-library/components/UILibraryTopBar.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mock fn references so they are available when vi.mock factories execute
const {
  mockNavigate,
  mockToggle,
  mockUseSidePeek,
  mockButton,
  mockHeading,
  mockResizablePanel,
  mockText,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToggle: vi.fn(),
  mockUseSidePeek: vi.fn(),
  mockButton: vi.fn(),
  mockHeading: vi.fn(),
  mockResizablePanel: vi.fn(),
  mockText: vi.fn(),
}));

// Set default return value for mockUseSidePeek (must be after hoisted declaration)
mockUseSidePeek.mockReturnValue({
  isOpen: false,
  peekPath: null,
  open: vi.fn(),
  close: vi.fn(),
  toggle: mockToggle,
});

// Mock @abe-stack/shared
vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    toastStore: {
      getState: (): { show: typeof vi.fn } => ({
        show: vi.fn(),
      }),
    },
  };
});

// Mock @abe-stack/ui components and router
vi.mock('@abe-stack/ui', () => ({
  useNavigate: (): typeof mockNavigate => mockNavigate,
  useSidePeek: (): ReturnType<typeof mockUseSidePeek> => mockUseSidePeek(),
  ['Button']: (props: ComponentProps<'button'> & { variant?: string }): ReactElement => {
    mockButton(props);
    const { children, onClick, variant, ...rest } = props;
    return (
      <button onClick={onClick} data-variant={variant} {...rest}>
        {children}
      </button>
    ) as ReactElement;
  },
  ['Heading']: (props: { children: ReactNode; as?: ElementType; size?: string }): ReactElement => {
    mockHeading(props);
    const { children, as: tag = 'h1' } = props;
    return createElement(tag, null, children) as ReactElement;
  },
  ['ResizablePanel']: (props: {
    children: ReactNode;
    collapsed?: boolean;
    onResize?: (size: number) => void;
    'data-testid'?: string;
  }): ReactElement => {
    mockResizablePanel(props);
    const { children, collapsed, ...rest } = props;
    return (
      <div data-testid={rest['data-testid']} data-collapsed={collapsed}>
        {children}
      </div>
    ) as ReactElement;
  },
  ['Text']: (props: ComponentProps<'span'>): ReactElement => {
    mockText(props);
    const { children, ...rest } = props;
    return (<span {...rest}>{children}</span>) as ReactElement;
  },
}));

import { UILibraryTopBar } from './UILibraryTopBar';

import type { UILibraryTopBarProps } from './UILibraryTopBar';
import type { ComponentProps, ElementType, ReactElement, ReactNode } from 'react';

describe('UILibraryTopBar', () => {
  const defaultProps: UILibraryTopBarProps = {
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
    render(<UILibraryTopBar {...defaultProps} />);
    expect(screen.getByTestId('demo-top-panel')).toBeInTheDocument();
  });

  it('renders the title heading', () => {
    render(<UILibraryTopBar {...defaultProps} />);
    expect(
      screen.getByRole('heading', { name: 'ABE Stack UI Component Gallery' }),
    ).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<UILibraryTopBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
  });

  it('navigates to home when back button is clicked', () => {
    render(<UILibraryTopBar {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('passes collapsed prop based on visible state', () => {
    const { rerender } = render(<UILibraryTopBar {...defaultProps} visible={true} />);
    expect(screen.getByTestId('demo-top-panel')).toHaveAttribute('data-collapsed', 'false');

    rerender(<UILibraryTopBar {...defaultProps} visible={false} />);
    expect(screen.getByTestId('demo-top-panel')).toHaveAttribute('data-collapsed', 'true');
  });

  it('has layout label', () => {
    render(<UILibraryTopBar {...defaultProps} />);
    expect(screen.getByText('TopbarLayout')).toBeInTheDocument();
  });

  describe('when not authenticated', () => {
    it('renders Login button', () => {
      render(<UILibraryTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('renders Register button', () => {
      render(<UILibraryTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    });

    it('calls onOpenAuthModal with login mode when Login is clicked', () => {
      const onOpenAuthModal = vi.fn();
      render(
        <UILibraryTopBar
          {...defaultProps}
          isAuthenticated={false}
          onOpenAuthModal={onOpenAuthModal}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Login' }));
      expect(onOpenAuthModal).toHaveBeenCalledWith('login');
    });

    it('calls onOpenAuthModal with register mode when Register is clicked', () => {
      const onOpenAuthModal = vi.fn();
      render(
        <UILibraryTopBar
          {...defaultProps}
          isAuthenticated={false}
          onOpenAuthModal={onOpenAuthModal}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Register' }));
      expect(onOpenAuthModal).toHaveBeenCalledWith('register');
    });

    it('does not show user email', () => {
      render(<UILibraryTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    });

    it('does not show Logout button', () => {
      render(<UILibraryTopBar {...defaultProps} isAuthenticated={false} />);
      expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
    });
  });

  describe('when authenticated', () => {
    const authenticatedProps: UILibraryTopBarProps = {
      ...defaultProps,
      isAuthenticated: true,
      user: { email: 'test@example.com' },
    };

    it('shows user email', () => {
      render(<UILibraryTopBar {...authenticatedProps} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('renders Logout button', () => {
      render(<UILibraryTopBar {...authenticatedProps} />);
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('calls onLogout when Logout is clicked', () => {
      const onLogout = vi.fn().mockResolvedValue(undefined);
      render(<UILibraryTopBar {...authenticatedProps} onLogout={onLogout} />);

      fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('does not show Login button', () => {
      render(<UILibraryTopBar {...authenticatedProps} />);
      expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
    });

    it('does not show Register button', () => {
      render(<UILibraryTopBar {...authenticatedProps} />);
      expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
    });

    it('handles user without email gracefully', () => {
      render(<UILibraryTopBar {...authenticatedProps} user={{ email: undefined } as any} />);
      // Should not throw and should render Logout
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
  });

  it('uses primary variant for Register button', () => {
    render(<UILibraryTopBar {...defaultProps} isAuthenticated={false} />);
    const registerBtn = screen.getByRole('button', { name: 'Register' });
    expect(registerBtn).toHaveAttribute('data-variant', 'primary');
  });

  it('uses text variant for back button', () => {
    render(<UILibraryTopBar {...defaultProps} />);
    const backBtn = screen.getByRole('button', { name: /back to home/i });
    expect(backBtn).toHaveAttribute('data-variant', 'text');
  });
});
