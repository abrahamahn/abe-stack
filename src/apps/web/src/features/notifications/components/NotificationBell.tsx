// src/apps/web/src/features/notifications/components/NotificationBell.tsx
/**
 * NotificationBell
 *
 * Bell icon button that displays an unread notification count badge.
 * Clicking toggles the notification dropdown.
 */

import { Badge, Button } from '@abe-stack/ui';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface NotificationBellProps {
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function NotificationBell({
  unreadCount,
  isOpen,
  onToggle,
  className,
}: NotificationBellProps): ReactElement {
  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
      <Button
        variant="text"
        size="small"
        onClick={onToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${String(unreadCount)} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <Badge
            tone="danger"
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              fontSize: 'var(--ui-font-size-xs)',
              minWidth: '1.25rem',
              height: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--ui-radius-full)',
              transform: 'translate(25%, -25%)',
            }}
          >
            {unreadCount > 99 ? '99+' : String(unreadCount)}
          </Badge>
        )}
      </Button>
    </div>
  );
}
