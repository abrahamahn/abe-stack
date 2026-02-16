// main/apps/web/src/features/notifications/components/NotificationBell.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationBell } from './NotificationBell';

import type { ReactNode } from 'react';

vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');

  return {
    ...actual,
    Badge: ({ children, tone }: { children: ReactNode; tone: string }) => (
      <span data-testid="badge" data-tone={tone}>
        {children}
      </span>
    ),
    Button: ({
      children,
      onClick,
      'aria-label': ariaLabel,
      'aria-expanded': ariaExpanded,
    }: {
      children: ReactNode;
      onClick?: () => void;
      'aria-label'?: string;
      'aria-expanded'?: boolean;
    }) => (
      <button onClick={onClick} aria-label={ariaLabel} aria-expanded={ariaExpanded}>
        {children}
      </button>
    ),
  };
});

describe('NotificationBell', () => {
  it('should render bell button', () => {
    render(<NotificationBell unreadCount={0} isOpen={false} onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('should not show badge when unread count is 0', () => {
    render(<NotificationBell unreadCount={0} isOpen={false} onToggle={vi.fn()} />);

    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
  });

  it('should show badge with unread count', () => {
    render(<NotificationBell unreadCount={5} isOpen={false} onToggle={vi.fn()} />);

    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('5');
  });

  it('should show 99+ for large unread counts', () => {
    render(<NotificationBell unreadCount={150} isOpen={false} onToggle={vi.fn()} />);

    expect(screen.getByTestId('badge')).toHaveTextContent('99+');
  });

  it('should call onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<NotificationBell unreadCount={0} isOpen={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should include unread count in aria-label', () => {
    render(<NotificationBell unreadCount={3} isOpen={false} onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Notifications (3 unread)' })).toBeInTheDocument();
  });

  it('should set aria-expanded when open', () => {
    render(<NotificationBell unreadCount={0} isOpen={true} onToggle={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });
});
