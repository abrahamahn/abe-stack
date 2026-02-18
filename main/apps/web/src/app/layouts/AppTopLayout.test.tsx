// main/apps/web/src/app/layouts/AppTopLayout.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppTopLayout } from './AppTopLayout';

const mockToggle = vi.fn();
const mockSidePeekOpen = vi.hoisted(() => ({ current: false }));
const mockTokenStoreGet = vi.hoisted(() => vi.fn<() => string | null>(() => null));

vi.mock('@bslt/react/hooks', () => ({
  useSidePeek: () => ({ toggle: mockToggle, isOpen: mockSidePeekOpen.current }),
}));

vi.mock('@bslt/shared', async () => {
  const actual = await vi.importActual<typeof import('@bslt/shared')>('@bslt/shared');
  return {
    ...actual,
    tokenStore: {
      get: mockTokenStoreGet,
      set: vi.fn(),
      clear: vi.fn(),
    },
  };
});

vi.mock('@features/workspace/components', () => ({
  TenantSwitcher: ({ className }: { className?: string }) => (
    <div className={className} data-testid="tenant-switcher" />
  ),
}));

describe('AppTopLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidePeekOpen.current = false;
    mockTokenStoreGet.mockReturnValue(null);
  });

  it('renders static app title', () => {
    render(
      <AppTopLayout
        size={6}
        visible
        onResize={vi.fn()}
        isAuthLoading={false}
        isAuthenticated={false}
        user={null}
        onLogout={vi.fn()}
        onOpenAuthModal={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'BSLT' })).toBeInTheDocument();
  });

  it('opens auth modal with login/register modes', () => {
    const onOpenAuthModal = vi.fn();
    render(
      <AppTopLayout
        size={6}
        visible
        onResize={vi.fn()}
        isAuthLoading={false}
        isAuthenticated={false}
        user={null}
        onLogout={vi.fn()}
        onOpenAuthModal={onOpenAuthModal}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(onOpenAuthModal).toHaveBeenCalledWith('login');
    expect(onOpenAuthModal).toHaveBeenCalledWith('register');
  });

  it('shows skeleton and hides auth buttons while auth is loading', () => {
    render(
      <AppTopLayout
        size={6}
        visible
        onResize={vi.fn()}
        isAuthLoading
        isAuthenticated={false}
        user={null}
        onLogout={vi.fn()}
        onOpenAuthModal={vi.fn()}
      />,
    );

    expect(document.querySelector('.skeleton')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });

  it('shows authenticated controls and handles side peek toggle', () => {
    const onLogout = vi.fn().mockResolvedValue(undefined);

    render(
      <AppTopLayout
        size={6}
        visible
        onResize={vi.fn()}
        isAuthLoading={false}
        isAuthenticated
        user={{ email: 'user@example.com' }}
        onLogout={onLogout}
        onOpenAuthModal={vi.fn()}
      />,
    );

    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Toggle side peek UI library/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(mockToggle).toHaveBeenCalledWith('/side-peek-ui-library');
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('falls back to username when email is missing', () => {
    render(
      <AppTopLayout
        size={6}
        visible
        onResize={vi.fn()}
        isAuthLoading={false}
        isAuthenticated
        user={{ username: 'admin-user' }}
        onLogout={vi.fn()}
        onOpenAuthModal={vi.fn()}
      />,
    );

    expect(screen.getByText('admin-user')).toBeInTheDocument();
  });

  it('does not crash when tokenStore returns undefined', () => {
    mockTokenStoreGet.mockReturnValue(undefined as unknown as string | null);

    expect(() =>
      render(
        <AppTopLayout
          size={6}
          visible
          onResize={vi.fn()}
          isAuthLoading={false}
          isAuthenticated
          user={{ username: 'admin-user' }}
          onLogout={vi.fn()}
          onOpenAuthModal={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });
});
