// main/apps/web/src/features/settings/components/DangerZone.tsx
/**
 * Danger Zone Component
 *
 * Red card with account deactivation, deletion, and reactivation actions.
 * Integrates with SudoModal for re-authentication before destructive actions.
 */

import { Alert, Button, Card, FormField, Heading, Input, Text } from '@bslt/ui';
import { useState, type ChangeEvent, type ReactElement } from 'react';

import {
  useDeactivateAccount,
  useDeleteAccount,
  useReactivateAccount,
} from '../hooks/useAccountLifecycle';

import { SudoModal } from './SudoModal';

// ============================================================================
// Types
// ============================================================================

type PendingAction = 'deactivate' | 'delete' | null;

export interface DangerZoneProps {
  /** Current account status */
  accountStatus?: 'active' | 'deactivated' | 'pending_deletion';
  /** Called after a successful action (to reload user state) */
  onActionComplete?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const DangerZone = ({
  accountStatus = 'active',
  onActionComplete,
}: DangerZoneProps): ReactElement => {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [sudoOpen, setSudoOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    deactivate,
    isLoading: isDeactivating,
    error: deactivateError,
    reset: resetDeactivate,
  } = useDeactivateAccount({
    onSuccess: (response) => {
      setSuccessMessage(response.message);
      setReason('');
      onActionComplete?.();
    },
  });

  const {
    requestDeletion,
    isLoading: isDeleting,
    error: deleteError,
    reset: resetDelete,
  } = useDeleteAccount({
    onSuccess: (response) => {
      setSuccessMessage(response.message);
      setReason('');
      onActionComplete?.();
    },
  });

  const {
    reactivate,
    isLoading: isReactivating,
    error: reactivateError,
    reset: resetReactivate,
  } = useReactivateAccount({
    onSuccess: (response) => {
      setSuccessMessage(response.message);
      onActionComplete?.();
    },
  });

  const handleStartAction = (action: PendingAction): void => {
    setPendingAction(action);
    setSudoOpen(true);
    setSuccessMessage(null);
    resetDeactivate();
    resetDelete();
    resetReactivate();
  };

  const handleSudoSuccess = (sudoToken: string): void => {
    setSudoOpen(false);
    const trimmedReason = reason.trim();
    const normalizedReason = trimmedReason !== '' ? trimmedReason : undefined;
    if (pendingAction === 'deactivate') {
      deactivate({ reason: normalizedReason }, sudoToken);
    } else if (pendingAction === 'delete') {
      requestDeletion({ reason: normalizedReason }, sudoToken);
    }
    setPendingAction(null);
  };

  const handleSudoDismiss = (): void => {
    setSudoOpen(false);
    setPendingAction(null);
  };

  const currentError = deactivateError ?? deleteError ?? reactivateError;
  const isAnyLoading = isDeactivating || isDeleting || isReactivating;

  return (
    <>
      <Card className="border-2 border-danger p-6 space-y-6">
        <div>
          <Heading as="h3" size="md" className="text-danger mb-2">
            Danger Zone
          </Heading>
          <Text tone="muted" size="sm">
            These actions are destructive and may not be reversible. Proceed with caution.
          </Text>
        </div>

        {successMessage !== null && <Alert tone="success">{successMessage}</Alert>}
        {currentError !== null && <Alert tone="danger">{currentError.message}</Alert>}

        {/* Reactivate - shown when deactivated or pending deletion */}
        {(accountStatus === 'deactivated' || accountStatus === 'pending_deletion') && (
          <div className="space-y-2">
            <Text className="font-medium">Reactivate Account</Text>
            <Text size="sm" tone="muted">
              {accountStatus === 'pending_deletion'
                ? 'Your account is scheduled for deletion. Reactivating will cancel the deletion.'
                : 'Your account is currently deactivated. Reactivate to restore access.'}
            </Text>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setSuccessMessage(null);
                reactivate();
              }}
              disabled={isAnyLoading}
            >
              {isReactivating ? 'Reactivating...' : 'Reactivate Account'}
            </Button>
          </div>
        )}

        {/* Deactivate - shown when active */}
        {accountStatus === 'active' && (
          <div className="space-y-3 border-t pt-4">
            <Text className="font-medium">Deactivate Account</Text>
            <Text size="sm" tone="muted">
              Temporarily disable your account. You can reactivate it later. Your data will be
              preserved.
            </Text>
            <FormField label="Reason (optional)" htmlFor="deactivate-reason">
              <Input
                id="deactivate-reason"
                type="text"
                value={reason}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setReason(e.target.value);
                }}
                placeholder="Why are you deactivating?"
                maxLength={500}
              />
            </FormField>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                handleStartAction('deactivate');
              }}
              disabled={isAnyLoading}
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
            </Button>
          </div>
        )}

        {/* Delete - shown when active or deactivated */}
        {accountStatus !== 'pending_deletion' && (
          <div className="space-y-3 border-t pt-4">
            <Text className="font-medium text-danger">Delete Account</Text>
            <Text size="sm" tone="muted">
              Permanently delete your account and all associated data. You will have a 30-day grace
              period to cancel this action.
            </Text>
            {accountStatus === 'active' && (
              <FormField label="Reason (optional)" htmlFor="delete-reason">
                <Input
                  id="delete-reason"
                  type="text"
                  value={reason}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setReason(e.target.value);
                  }}
                  placeholder="Why are you deleting your account?"
                  maxLength={500}
                />
              </FormField>
            )}
            <Button
              type="button"
              variant="secondary"
              className="text-danger border-danger"
              onClick={() => {
                handleStartAction('delete');
              }}
              disabled={isAnyLoading}
            >
              {isDeleting ? 'Requesting deletion...' : 'Delete Account'}
            </Button>
          </div>
        )}
      </Card>

      <SudoModal open={sudoOpen} onSuccess={handleSudoSuccess} onDismiss={handleSudoDismiss} />
    </>
  );
};
