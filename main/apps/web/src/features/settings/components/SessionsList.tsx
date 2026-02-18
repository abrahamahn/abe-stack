// main/apps/web/src/features/settings/components/SessionsList.tsx
/**
 * Sessions List Component
 *
 * Displays list of user sessions with revoke functionality.
 */

import { Alert, Button, Heading, Skeleton, Text } from '@bslt/ui';
import { useState, type ReactElement } from 'react';

import { useRevokeAllSessions, useRevokeSession, useSessions } from '../hooks';

import { SessionCard } from './SessionCard';

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

export interface SessionsListProps {
  onRevokeSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const SessionsList = ({ onRevokeSuccess }: SessionsListProps): ReactElement => {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { sessions, isLoading, isError, error, refetch } = useSessions();

  const {
    revokeSession,
    isLoading: isRevokingSingle,
    error: revokeError,
  } = useRevokeSession({
    onSuccess: () => {
      setRevokingId(null);
      refetch();
      onRevokeSuccess?.();
    },
    onError: () => {
      setRevokingId(null);
    },
  });

  const {
    revokeAllSessions,
    isLoading: isRevokingAll,
    error: revokeAllError,
    revokedCount,
  } = useRevokeAllSessions({
    onSuccess: () => {
      refetch();
      onRevokeSuccess?.();
    },
  });

  const handleRevoke = (sessionId: string): void => {
    if (confirm('Are you sure you want to revoke this session?')) {
      setRevokingId(sessionId);
      revokeSession(sessionId);
    }
  };

  const handleRevokeAll = (): void => {
    const typedSessions = sessions as SessionLocal[];
    const otherSessions = typedSessions.filter((s: SessionLocal) => !s.isCurrent);
    if (otherSessions.length === 0) {
      return;
    }

    if (
      confirm(
        `Are you sure you want to log out from ${String(otherSessions.length)} other device${otherSessions.length === 1 ? '' : 's'}?`,
      )
    ) {
      revokeAllSessions();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert tone="danger">Failed to load sessions: {error?.message ?? 'Unknown error'}</Alert>
    );
  }

  const allSessions = sessions as SessionLocal[];
  const otherSessions: SessionLocal[] = allSessions.filter((s: SessionLocal) => !s.isCurrent);
  const currentSession: SessionLocal | undefined = allSessions.find(
    (s: SessionLocal) => s.isCurrent,
  );

  return (
    <div className="space-y-4">
      {revokedCount !== null && revokedCount > 0 && (
        <Alert tone="success">
          Successfully logged out from {revokedCount} device{revokedCount === 1 ? '' : 's'}.
        </Alert>
      )}

      {(revokeError !== null || revokeAllError !== null) && (
        <Alert tone="danger">{revokeError?.message ?? revokeAllError?.message}</Alert>
      )}

      {/* Current Session */}
      {currentSession !== undefined && <SessionCard session={currentSession} onRevoke={() => {}} />}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Heading as="h3" className="font-medium">
                Other Devices ({otherSessions.length})
              </Heading>
              <Button
                variant="text"
                size="small"
                onClick={handleRevokeAll}
                disabled={isRevokingAll || isRevokingSingle}
                className="text-danger"
              >
                {isRevokingAll ? 'Logging out...' : 'Log out from all'}
              </Button>
            </div>

            <div className="space-y-3">
              {otherSessions.map((session: SessionLocal) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onRevoke={() => {
                    handleRevoke(session.id);
                  }}
                  isRevoking={revokingId === session.id}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {sessions.length === 1 && (
        <Text size="sm" tone="muted" className="text-center py-4">
          This is your only active session.
        </Text>
      )}
    </div>
  );
};
