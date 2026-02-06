// apps/web/src/features/home/pages/HomePage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';

import type { ReactElement, ReactNode } from 'react';

// Hoist mock references so they are available when vi.mock factories execute
const {
  mockResizablePanelGroup,
  mockSidePeekRoot,
  mockSidePeekHeader,
  mockSidePeekTitle,
  mockSidePeekExpand,
  mockSidePeekClose,
  mockSidePeekContent,
  mockText,
  mockAuthModal,
  mockHomeTopBar,
  mockHomeBottomBar,
  mockHomeMainLayout,
} = vi.hoisted(() => ({
  mockResizablePanelGroup: vi.fn(),
  mockSidePeekRoot: vi.fn(),
  mockSidePeekHeader: vi.fn(),
  mockSidePeekTitle: vi.fn(),
  mockSidePeekExpand: vi.fn(),
  mockSidePeekClose: vi.fn(),
  mockSidePeekContent: vi.fn(),
  mockText: vi.fn(),
  mockAuthModal: vi.fn(),
  mockHomeTopBar: vi.fn(),
  mockHomeBottomBar: vi.fn(),
  mockHomeMainLayout: vi.fn(),
}));

// Mock all external dependencies
vi.mock('@abe-stack/ui', () => ({
  ['ResizablePanelGroup']: (props: { children?: ReactNode }): ReactElement | null =>
    mockResizablePanelGroup(props) ?? props.children ?? null,
  SidePeek: {
    ['Root']: (props: { children?: ReactNode }): ReactElement | null => {
      mockSidePeekRoot(props);
      return (<div data-testid="side-peek">{props.children}</div>) as ReactElement;
    },
    ['Header']: (props: { children?: ReactNode }): ReactElement | null => {
      mockSidePeekHeader(props);
      return (<div>{props.children}</div>) as ReactElement;
    },
    ['Title']: (props: { children?: ReactNode }): ReactElement | null => {
      mockSidePeekTitle(props);
      return (<div>{props.children}</div>) as ReactElement;
    },
    ['Expand']: (props: Record<string, unknown>): ReactElement => {
      mockSidePeekExpand(props);
      return (<button>Expand</button>) as ReactElement;
    },
    ['Close']: (props: Record<string, unknown>): ReactElement => {
      mockSidePeekClose(props);
      return (<button>Close</button>) as ReactElement;
    },
    ['Content']: (props: { children?: ReactNode }): ReactElement | null => {
      mockSidePeekContent(props);
      return (<div>{props.children}</div>) as ReactElement;
    },
  },
  ['Text']: (props: { children?: ReactNode }): ReactElement => {
    mockText(props);
    return (<span>{props.children}</span>) as ReactElement;
  },
  useContrast: () => ({ contrastMode: 'system', cycleContrastMode: vi.fn() }),
  useDensity: () => ({ density: 'normal', cycleDensity: vi.fn() }),
  useSidePeek: () => ({ isOpen: false, peekPath: null, close: vi.fn() }),
}));

vi.mock('@auth/components', () => ({
  ['AuthModal']: (props: Record<string, unknown>): ReactElement => {
    mockAuthModal(props);
    return (<div data-testid="auth-modal" />) as ReactElement;
  },
}));

vi.mock('@auth/hooks', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('@ui-library/hooks', () => ({
  useUILibraryPanes: () => ({
    paneConfig: {
      top: { visible: true, size: 6 },
      left: { visible: true, size: 18 },
      right: { visible: true, size: 25 },
      bottom: { visible: true, size: 8 },
    },
    togglePane: vi.fn(),
    handlePaneResize: vi.fn(),
    resetLayout: vi.fn(),
  }),
  useUILibraryTheme: () => ({
    cycleTheme: vi.fn(),
    getThemeIcon: () => '💻',
    getThemeLabel: () => 'System',
    resolvedTheme: 'light',
  }),
}));

vi.mock('../components', () => ({
  ['HomeTopBar']: (props: Record<string, unknown>): ReactElement => {
    mockHomeTopBar(props);
    return (<div data-testid="home-top-bar">TopBar</div>) as ReactElement;
  },
  ['HomeBottomBar']: (props: Record<string, unknown>): ReactElement => {
    mockHomeBottomBar(props);
    return (<div data-testid="home-bottom-bar">BottomBar</div>) as ReactElement;
  },
  ['HomeMainLayout']: (props: Record<string, unknown>): ReactElement => {
    mockHomeMainLayout(props);
    return (<div data-testid="home-main-layout">MainLayout</div>) as ReactElement;
  },
}));

vi.mock('../hooks', () => ({
  useDocContent: () => ({ content: '# README', isLoading: false }),
  useHomeKeyboard: vi.fn(),
}));

describe('HomePage', () => {
  it('renders without crashing', () => {
    expect(() => {
      render(<HomePage />);
    }).not.toThrow();
  });

  it('renders the top bar', () => {
    render(<HomePage />);
    expect(screen.getByTestId('home-top-bar')).toBeInTheDocument();
  });

  it('renders the bottom bar', () => {
    render(<HomePage />);
    expect(screen.getByTestId('home-bottom-bar')).toBeInTheDocument();
  });

  it('renders the main layout', () => {
    render(<HomePage />);
    expect(screen.getByTestId('home-main-layout')).toBeInTheDocument();
  });

  it('renders the auth modal', () => {
    render(<HomePage />);
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
  });

  it('renders the side peek', () => {
    render(<HomePage />);
    expect(screen.getByTestId('side-peek')).toBeInTheDocument();
  });
});
