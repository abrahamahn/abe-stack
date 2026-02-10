// src/apps/web/src/features/home/components/HomeNavList.test.tsx
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders app menu links', () => {
    render(<HomeNavList />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders Pricing link with correct href', () => {
    render(<HomeNavList />);
    expect(screen.getByRole('link', { name: /pricing/i })).toHaveAttribute('href', '/pricing');
  });

  it('renders Settings link with correct href', () => {
    render(<HomeNavList />);
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });

  it('renders Dashboard link with correct href', () => {
    render(<HomeNavList />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
  });

  it('renders Admin link with correct href', () => {
    render(<HomeNavList />);
    expect(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin');
  });

  it('menu links are clickable anchors', () => {
    render(<HomeNavList />);
    fireEvent.click(screen.getByRole('link', { name: /dashboard/i }));
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
  });
});
