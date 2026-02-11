// src/apps/web/src/features/admin/components/ImpersonationBanner.tsx
/**
 * Impersonation Banner Component
 *
 * Displays a sticky warning banner when an admin is impersonating a user.
 * Shows the target user's email and provides a button to end the session.
 */

import { Alert, Button, Text } from '@abe-stack/ui';
import { useState, type ReactElement } from 'react';

import { useImpersonation } from '../hooks/useImpersonation';

// ============================================================================
// Component
// ============================================================================

export const ImpersonationBanner = (): ReactElement | null => {
  const { isImpersonating, targetEmail, endImpersonation } = useImpersonation();
  const [isEnding, setIsEnding] = useState(false);

  if (!isImpersonating) {
    return null;
  }

  const handleEndSession = async (): Promise<void> => {
    setIsEnding(true);
    try {
      await endImpersonation();
    } catch {
      // In production, show a toast notification
      // For now, fail silently - the user can retry
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: '1px solid var(--ui-alert-warning-border)',
      }}
    >
      <Alert
        tone="warning"
        className="border-0 rounded-none"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'var(--ui-gap-sm)',
          paddingBottom: 'var(--ui-gap-sm)',
          paddingLeft: 'var(--ui-gap-md)',
          paddingRight: 'var(--ui-gap-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-md)' }}>
          <Text
            as="span"
            style={{
              fontWeight: 'var(--ui-font-weight-semibold)',
              color: 'var(--ui-alert-warning-text)',
            }}
          >
            Viewing as {targetEmail ?? 'unknown user'}
          </Text>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => {
            void handleEndSession();
          }}
          disabled={isEnding}
        >
          {isEnding ? 'Ending...' : 'End Session'}
        </Button>
      </Alert>
    </div>
  );
};
