// main/apps/web/src/app/layouts/AppLeftMenu.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach } from 'vitest';

import { AppLeftMenu } from './AppLeftMenu';

import type { ReactNode } from 'react';

const mockUseAuth = vi.fn();

vi.mock('@features/auth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

vi.mock('@abe-stack/react/router', () => {
  const link = ({
    children,
    to,
    className,
  }: {
    children: ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  );

  return {
    Link: link,
  };
});

describe('AppLeftMenu', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });
  });

  it('renders only public links when unauthenticated', () => {
    render(<AppLeftMenu />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing');
    expect(screen.getByRole('link', { name: 'UI Library' })).toHaveAttribute('href', '/ui-library');

    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Activities' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Workspaces' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
  });

  it('renders public and authenticated links when logged in', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'user' },
      isLoading: false,
    });

    render(<AppLeftMenu />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing');
    expect(screen.getByRole('link', { name: 'UI Library' })).toHaveAttribute('href', '/ui-library');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Activities' })).toHaveAttribute('href', '/activities');
    expect(screen.getByRole('link', { name: 'Workspaces' })).toHaveAttribute('href', '/workspaces');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');

    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
  });

  it('renders all links including admin when user is admin', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'admin' },
      isLoading: false,
    });

    render(<AppLeftMenu />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Activities' })).toHaveAttribute('href', '/activities');
    expect(screen.getByRole('link', { name: 'Workspaces' })).toHaveAttribute('href', '/workspaces');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });
});
