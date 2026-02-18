// main/client/ui/src/components/SessionCard.tsx
import { formatDate } from '@bslt/shared/primitives/helpers';
import { parseUserAgent } from '@bslt/shared/system/http';

import { Badge } from '../elements/Badge';
import { Button } from '../elements/Button';
import { Text } from '../elements/Text';

import { Card } from './Card';

import type { ReactElement } from 'react';

export interface SessionCardSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  isCurrent: boolean;
}

export interface SessionCardProps {
  session: SessionCardSession;
  onRevoke: () => void;
  isRevoking?: boolean;
}

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
