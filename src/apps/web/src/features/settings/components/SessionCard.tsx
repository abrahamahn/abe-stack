// src/apps/web/src/features/settings/components/SessionCard.tsx
/**
 * Session Card Component
 *
 * Displays information about a user session.
 */

import { formatDate, parseUserAgent } from '@abe-stack/shared';
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
