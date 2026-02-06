// apps/web/src/features/home/components/HomeMainLayout.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeMainLayout } from './HomeMainLayout';

import type { HomeMainLayoutProps } from './HomeMainLayout';
import type { HomePaneConfig } from '../types';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

vi.mock('@abe-stack/ui', () => {
  const mockButton = ({
    children,
    onClick,
    variant,
    ...rest
  }: ComponentProps<'button'> & { variant?: string }): ReactElement => (
    <button onClick={onClick} data-variant={variant} {...rest}>
      {children}
    </button>
  );

  const mockCloseButton = ({ onClick, ...rest }: ComponentProps<'button'>): ReactElement => (
    <button onClick={onClick} {...rest}>
      X
    </button>
  );

  const mockHeading = ({ children }: { children: ReactNode }): ReactElement => <h2>{children}</h2>;

  const mockResizablePanel = ({ children }: { children: ReactNode }): ReactElement => (
    <div>{children}</div>
  );

  const mockResizablePanelGroup = ({ children }: { children: ReactNode }): ReactElement => (
    <div>{children}</div>
  );

  const mockScrollArea = ({ children }: { children: ReactNode }): ReactElement => (
    <div>{children}</div>
  );

  const mockText = ({ children }: { children: ReactNode }): ReactElement => <span>{children}</span>;

  return {
    Button: mockButton,
    CloseButton: mockCloseButton,
    Heading: mockHeading,
    ResizablePanel: mockResizablePanel,
    ResizablePanelGroup: mockResizablePanelGroup,
    ScrollArea: mockScrollArea,
    Text: mockText,
  };
});

vi.mock('./HomeDocViewer', () => {
  const mockHomeDocViewer = (): ReactElement => <div data-testid="home-doc-viewer">DocViewer</div>;

  return {
    HomeDocViewer: mockHomeDocViewer,
  };
});

vi.mock('./HomeNavList', () => {
  const mockHomeNavList = (): ReactElement => <div data-testid="home-nav-list">NavList</div>;

  return {
    HomeNavList: mockHomeNavList,
  };
});

describe('HomeMainLayout', () => {
  const mockPaneConfig: HomePaneConfig = {
    top: { visible: true, size: 6 },
    left: { visible: true, size: 18 },
    right: { visible: true, size: 25 },
    bottom: { visible: true, size: 8 },
  };

  const defaultProps: HomeMainLayoutProps = {
    paneConfig: mockPaneConfig,
    togglePane: vi.fn(),
    handlePaneResize: vi.fn(),
    resetLayout: vi.fn(),
    selectedDoc: 'readme',
    onSelectDoc: vi.fn(),
    content: '# README',
    isLoading: false,
  };

  it('renders layout toggle buttons', () => {
    render(<HomeMainLayout {...defaultProps} />);
    expect(screen.getByRole('button', { name: /toggle top bar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle left panel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle right panel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle bottom bar/i })).toBeInTheDocument();
  });

  it('renders reset layout button', () => {
    render(<HomeMainLayout {...defaultProps} />);
    expect(screen.getByRole('button', { name: /reset layout/i })).toBeInTheDocument();
  });

  it('calls resetLayout when reset button is clicked', () => {
    render(<HomeMainLayout {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /reset layout/i }));
    expect(defaultProps.resetLayout).toHaveBeenCalled();
  });

  it('calls togglePane when toggle button is clicked', () => {
    render(<HomeMainLayout {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /toggle left panel/i }));
    expect(defaultProps.togglePane).toHaveBeenCalledWith('left');
  });

  it('renders Navigation heading', () => {
    render(<HomeMainLayout {...defaultProps} />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('renders Details heading for right panel', () => {
    render(<HomeMainLayout {...defaultProps} />);
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('renders right panel placeholder text', () => {
    render(<HomeMainLayout {...defaultProps} />);
    expect(screen.getByText('Right panel placeholder')).toBeInTheDocument();
  });

  it('renders the nav list component', () => {
    render(<HomeMainLayout {...defaultProps} />);
    expect(screen.getByTestId('home-nav-list')).toBeInTheDocument();
  });

  it('renders the doc viewer component', () => {
    render(<HomeMainLayout {...defaultProps} />);
    expect(screen.getByTestId('home-doc-viewer')).toBeInTheDocument();
  });
});
