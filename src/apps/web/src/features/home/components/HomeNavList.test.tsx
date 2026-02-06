// apps/web/src/features/home/components/HomeNavList.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeNavList } from './HomeNavList';

import type { ReactElement, ReactNode } from 'react';

vi.mock('@abe-stack/ui', () => {
  const mockButton = ({
    children,
    onClick,
    variant,
  }: {
    children: ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }): ReactElement => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  );

  const mockLink = ({
    children,
    to,
  }: {
    children: ReactNode;
    to: string;
    className?: string;
  }): ReactElement => <a href={to}>{children}</a>;

  const mockMenuItem = ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }): ReactElement => <div onClick={onClick}>{children}</div>;

  const mockScrollArea = ({ children }: { children: ReactNode }): ReactElement => (
    <div>{children}</div>
  );

  const mockText = ({
    children,
  }: {
    children: ReactNode;
    className?: string;
    tone?: string;
  }): ReactElement => <span>{children}</span>;

  return {
    Button: mockButton,
    Link: mockLink,
    MenuItem: mockMenuItem,
    ScrollArea: mockScrollArea,
    Text: mockText,
  };
});

describe('HomeNavList', () => {
  const defaultProps = {
    activeDoc: 'readme' as const,
    onSelectDoc: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page links', () => {
    render(<HomeNavList {...defaultProps} />);
    expect(screen.getByText('UI Library')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders UI Library link with correct href', () => {
    render(<HomeNavList {...defaultProps} />);
    expect(screen.getByRole('link', { name: /ui library/i })).toHaveAttribute(
      'href',
      '/ui-library',
    );
  });

  it('renders Dashboard link with correct href', () => {
    render(<HomeNavList {...defaultProps} />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
  });

  it('renders category labels', () => {
    render(<HomeNavList {...defaultProps} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
    expect(screen.getByText('Packages')).toBeInTheDocument();
    expect(screen.getByText('Dev Docs')).toBeInTheDocument();
    expect(screen.getByText('Changelog')).toBeInTheDocument();
  });

  it('renders doc buttons', () => {
    render(<HomeNavList {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'README' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Web' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Architecture' })).toBeInTheDocument();
  });

  it('calls onSelectDoc when a doc button is clicked', () => {
    render(<HomeNavList {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Web' }));
    expect(defaultProps.onSelectDoc).toHaveBeenCalledWith('web');
  });

  it('highlights the active doc with primary variant', () => {
    render(<HomeNavList {...defaultProps} activeDoc="readme" />);
    const readmeBtn = screen.getByRole('button', { name: 'README' });
    expect(readmeBtn).toHaveAttribute('data-variant', 'primary');
  });

  it('uses text variant for inactive docs', () => {
    render(<HomeNavList {...defaultProps} activeDoc="readme" />);
    const webBtn = screen.getByRole('button', { name: 'Web' });
    expect(webBtn).toHaveAttribute('data-variant', 'text');
  });
});
