// src/apps/web/src/features/notifications/components/NotificationDropdown.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationDropdown } from './NotificationDropdown';

import type { Notification } from '@abe-stack/shared';
import type { ReactNode } from 'react';

vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');

  return {
    ...actual,
    Button: ({
      children,
      onClick,
      'aria-label': ariaLabel,
    }: {
      children: ReactNode;
      onClick?: (e: React.MouseEvent) => void;
      'aria-label'?: string;
    }) => (
      <button onClick={onClick} aria-label={ariaLabel}>
        {children}
      </button>
    ),
    Heading: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
    Skeleton: (props: Record<string, unknown>) => <div data-testid="skeleton" style={props as React.CSSProperties} />,
    Text: ({ children, tone }: { children: ReactNode; tone?: string }) => (
      <span data-tone={tone}>{children}</span>
    ),
  };
});

// ============================================================================
// Test Data
// ============================================================================

const unreadNotification = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'info',
  title: 'New message',
  message: 'You have a new message from admin',
  isRead: false,
  createdAt: new Date().toISOString(),
} as unknown as Notification;

const readNotification = {
  id: 'notif-2',
  userId: 'user-1',
  type: 'success',
  title: 'Account verified',
  message: 'Your email has been verified',
  isRead: true,
  readAt: new Date().toISOString(),
  createdAt: new Date(Date.now() - 3600000).toISOString(),
} as unknown as Notification;

describe('NotificationDropdown', () => {
  const defaultProps = {
    notifications: [] as Notification[],
    isLoading: false,
    onMarkAsRead: vi.fn(),
    onMarkAllAsRead: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  };

  it('should render Notifications heading', () => {
    render(<NotificationDropdown {...defaultProps} />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('should show skeleton loaders when loading', () => {
    render(<NotificationDropdown {...defaultProps} isLoading={true} />);

    expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
  });

  it('should show empty state when no notifications', () => {
    render(<NotificationDropdown {...defaultProps} />);

    expect(screen.getByText('All caught up')).toBeInTheDocument();
    expect(screen.getByText('No new notifications')).toBeInTheDocument();
  });

  it('should render notification titles', () => {
    render(
      <NotificationDropdown
        {...defaultProps}
        notifications={[unreadNotification, readNotification]}
      />,
    );

    expect(screen.getByText('New message')).toBeInTheDocument();
    expect(screen.getByText('Account verified')).toBeInTheDocument();
  });

  it('should render notification messages', () => {
    render(<NotificationDropdown {...defaultProps} notifications={[unreadNotification]} />);

    expect(screen.getByText('You have a new message from admin')).toBeInTheDocument();
  });

  it('should show Mark all read button when there are unread notifications', () => {
    render(<NotificationDropdown {...defaultProps} notifications={[unreadNotification]} />);

    expect(screen.getByText('Mark all read')).toBeInTheDocument();
  });

  it('should not show Mark all read button when all are read', () => {
    render(<NotificationDropdown {...defaultProps} notifications={[readNotification]} />);

    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
  });

  it('should call onMarkAllAsRead when Mark all read is clicked', () => {
    const onMarkAllAsRead = vi.fn();
    render(
      <NotificationDropdown
        {...defaultProps}
        notifications={[unreadNotification]}
        onMarkAllAsRead={onMarkAllAsRead}
      />,
    );

    fireEvent.click(screen.getByText('Mark all read'));
    expect(onMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('should call onMarkAsRead when clicking an unread notification', () => {
    const onMarkAsRead = vi.fn();
    render(
      <NotificationDropdown
        {...defaultProps}
        notifications={[unreadNotification]}
        onMarkAsRead={onMarkAsRead}
      />,
    );

    fireEvent.click(screen.getByText('New message'));
    expect(onMarkAsRead).toHaveBeenCalledWith(['notif-1']);
  });

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <NotificationDropdown
        {...defaultProps}
        notifications={[unreadNotification]}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete notification: New message' }));
    expect(onDelete).toHaveBeenCalledWith('notif-1');
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<NotificationDropdown {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close notifications' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should show unread indicator for unread notifications', () => {
    render(<NotificationDropdown {...defaultProps} notifications={[unreadNotification]} />);

    expect(screen.getByLabelText('Unread')).toBeInTheDocument();
  });

  it('should call onNotificationClick when clicking a notification', () => {
    const onNotificationClick = vi.fn();
    render(
      <NotificationDropdown
        {...defaultProps}
        notifications={[unreadNotification]}
        onNotificationClick={onNotificationClick}
      />,
    );

    fireEvent.click(screen.getByText('New message'));
    expect(onNotificationClick).toHaveBeenCalledWith(unreadNotification);
  });

  it('should call onNotificationClick for read notifications too', () => {
    const onNotificationClick = vi.fn();
    render(
      <NotificationDropdown
        {...defaultProps}
        notifications={[readNotification]}
        onNotificationClick={onNotificationClick}
      />,
    );

    fireEvent.click(screen.getByText('Account verified'));
    expect(onNotificationClick).toHaveBeenCalledWith(readNotification);
  });

  it('should call onNotificationClick on Enter key press', () => {
    const onNotificationClick = vi.fn();
    render(
      <NotificationDropdown
        {...defaultProps}
        notifications={[unreadNotification]}
        onNotificationClick={onNotificationClick}
      />,
    );

    fireEvent.keyDown(screen.getByText('New message').closest('[role="button"]')!, {
      key: 'Enter',
    });
    expect(onNotificationClick).toHaveBeenCalledWith(unreadNotification);
  });
});
