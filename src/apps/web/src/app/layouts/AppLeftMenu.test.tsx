// src/apps/web/src/app/layouts/AppLeftMenu.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppLeftMenu } from './AppLeftMenu';

import type { ReactNode } from 'react';

vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
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
    ...actual,
    Link: link,
  };
});

describe('AppLeftMenu', () => {
  it('renders section label and expected menu links', () => {
    render(<AppLeftMenu />);

    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'UI Library' })).toHaveAttribute('href', '/ui-library');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/settings/accounts',
    );
    expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute(
      'href',
      '/settings/billing',
    );
    expect(screen.getByRole('link', { name: 'Auth' })).toHaveAttribute('href', '/auth');
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });
});
