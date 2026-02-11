// src/apps/web/src/features/settings/components/SessionCard.tsx
/**
 * Session Card Component
 *
 * Displays information about a user session.
 */

import { Badge, Button, Card, Text } from '@abe-stack/ui';

import type { ReactElement } from 'react';

// ============================================================================
// Local Types (for ESLint type resolution)
// ============================================================================

interface SessionLocal {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  isCurrent: boolean;
}

// ============================================================================
// Types
// ============================================================================

export interface SessionCardProps {
  session: SessionLocal;
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
  if (userAgent === null || userAgent === '') {
    return { browser: 'Unknown browser', os: 'Unknown device' };
  }

  // Simple user agent parsing
  let browser = 'Unknown browser';
  let os = 'Unknown device';

  // Browser detection (order matters - more specific first)
  if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    browser = 'Opera';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  }

  // OS detection (order matters - more specific first)
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
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

export const SessionCard = ({
  session,
  onRevoke,
  isRevoking = false,
}: SessionCardProps): ReactElement => {
  const { browser, os } = parseUserAgent(session.userAgent);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Text as="span" className="font-medium">
              {browser} on {os}
            </Text>
            {session.isCurrent && <Badge tone="success">Current Session</Badge>}
          </div>

          <div className="text-sm text-muted space-y-0.5">
            {session.ipAddress !== null && session.ipAddress.length > 0 && (
              <Text>IP: {session.ipAddress}</Text>
            )}
            <Text>Started: {formatDate(session.createdAt)}</Text>
          </div>
        </div>

        {!session.isCurrent && (
          <Button
            variant="text"
            size="small"
            onClick={onRevoke}
            disabled={isRevoking}
            className="text-danger"
          >
            {isRevoking ? 'Revoking...' : 'Revoke'}
          </Button>
        )}
      </div>
    </Card>
  );
};
