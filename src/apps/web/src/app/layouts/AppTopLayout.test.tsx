// src/apps/web/src/app/layouts/AppTopLayout.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppTopLayout } from './AppTopLayout';

const mockToggle = vi.fn();
const mockPathname = vi.hoisted(() => ({ current: '/' }));
const mockSidePeekOpen = vi.hoisted(() => ({ current: false }));

vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: mockPathname.current }),
    useSidePeek: () => ({ toggle: mockToggle, isOpen: mockSidePeekOpen.current }),
  };
});

describe('AppTopLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.current = '/';
    mockSidePeekOpen.current = false;
  });

  it('renders mapped page title from route', () => {
    mockPathname.current = '/ui-library';
    render(
      <AppTopLayout
        size={6}
        visible
        onResize={vi.fn()}
        isAuthenticated={false}
        user={null}
        onLogout={vi.fn()}
        onOpenAuthModal={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'ABE Stack UI Library' })).toBeInTheDocument();
  });

  it('opens auth modal with login/register modes', () => {
    const onOpenAuthModal = vi.fn();
    render(
      <AppTopLayout
        size={6}
        visible
        onResize={vi.fn()}
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

  it('shows authenticated controls and handles side peek toggle', () => {
    const onLogout = vi.fn().mockResolvedValue(undefined);

    render(
      <AppTopLayout
        size={6}
        visible
        onResize={vi.fn()}
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
});
