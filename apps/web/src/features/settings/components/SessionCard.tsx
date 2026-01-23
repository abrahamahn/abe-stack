// apps/web/src/features/settings/components/SessionCard.tsx
/**
 * Session Card Component
 *
 * Displays information about a user session.
 */

import type { ReactElement } from 'react';

import { Badge, Button, Card } from '@abe-stack/ui';

import type { Session } from '../api';

// ============================================================================
// Types
// ============================================================================

export interface SessionCardProps {
  session: Session;
  onRevoke: () => void;
  isRevoking?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse user agent string to get device info
 */
function parseUserAgent(userAgent: string | null): { browser: string; os: string } {
  if (!userAgent) {
    return { browser: 'Unknown browser', os: 'Unknown device' };
  }

  // Simple user agent parsing
  let browser = 'Unknown browser';
  let os = 'Unknown device';

  // Browser detection
  if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  } else if (userAgent.includes('Opera')) {
    browser = 'Opera';
  }

  // OS detection
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  return { browser, os };
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins === 0) {
        return 'Just now';
      }
      return `${String(diffMins)} minute${diffMins === 1 ? '' : 's'} ago`;
    }
    return `${String(diffHours)} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${String(diffDays)} days ago`;
  }

  return date.toLocaleDateString();
}

// ============================================================================
// Component
// ============================================================================

export function SessionCard({
  session,
  onRevoke,
  isRevoking = false,
}: SessionCardProps): ReactElement {
  const { browser, os } = parseUserAgent(session.userAgent);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{browser} on {os}</span>
            {session.isCurrent && (
              <Badge tone="success">Current Session</Badge>
            )}
          </div>

          <div className="text-sm text-gray-500 space-y-0.5">
            {session.ipAddress && (
              <p>IP: {session.ipAddress}</p>
            )}
            <p>Started: {formatDate(session.createdAt)}</p>
          </div>
        </div>

        {!session.isCurrent && (
          <Button
            variant="text"
            size="small"
            onClick={onRevoke}
            disabled={isRevoking}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {isRevoking ? 'Revoking...' : 'Revoke'}
          </Button>
        )}
      </div>
    </Card>
  );
}
