// main/apps/web/src/features/settings/components/DataControlsSection.tsx
/**
 * Data Controls Section
 *
 * Account status display and data management options.
 * Includes account lifecycle actions (deactivate/delete), consent preferences, and data export.
 */

import { MS_PER_DAY } from '@bslt/shared';
import { Alert, Badge, Button, Card, Heading, Text } from '@bslt/ui';
import { useCallback, useState, type ReactElement } from 'react';

import {
  useDeactivateAccount,
  useDeleteAccount,
  useReactivateAccount,
} from '../hooks/useAccountLifecycle';

import { ConsentPreferences } from './ConsentPreferences';
import { DataExportSection } from './DataExportSection';
import { SudoModal } from './SudoModal';

// ============================================================================
// Types
// ============================================================================

export interface DataControlsSectionProps {
  /** Current account status */
  accountStatus?: 'active' | 'deactivated' | 'pending_deletion';
  /** ISO date when permanent deletion is scheduled (only relevant when pending_deletion) */
  deletionScheduledAt?: string;
  /** Called after a successful action (to reload user state) */
  onActionComplete?: () => void;
  className?: string;
}

type PendingAction = 'deactivate' | 'delete' | null;

// ============================================================================
// Helpers
// ============================================================================

function getStatusTone(status: string): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'active':
      return 'success';
    case 'deactivated':
      return 'warning';
    case 'pending_deletion':
      return 'danger';
    default:
      return 'success';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'deactivated':
      return 'Deactivated';
    case 'pending_deletion':
      return 'Pending Deletion';
    default:
      return 'Unknown';
  }
}

// ============================================================================
// Component
// ============================================================================

export const DataControlsSection = ({
  accountStatus = 'active',
  deletionScheduledAt,
  onActionComplete,
  className,
}: DataControlsSectionProps): ReactElement => {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [sudoOpen, setSudoOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    deactivate,
    isLoading: isDeactivating,
    error: deactivateError,
    reset: resetDeactivate,
  } = useDeactivateAccount({
    onSuccess: (response) => {
      setSuccessMessage(response.message);
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
      setShowDeleteConfirm(false);
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

  const handleStartAction = useCallback(
    (action: PendingAction): void => {
      setPendingAction(action);
      setSudoOpen(true);
      setSuccessMessage(null);
      resetDeactivate();
      resetDelete();
      resetReactivate();
    },
    [resetDeactivate, resetDelete, resetReactivate],
  );

  const handleSudoSuccess = useCallback(
    (sudoToken: string): void => {
      setSudoOpen(false);
      if (pendingAction === 'deactivate') {
        deactivate({}, sudoToken);
      } else if (pendingAction === 'delete') {
        requestDeletion({}, sudoToken);
      }
      setPendingAction(null);
    },
    [pendingAction, deactivate, requestDeletion],
  );

  const handleSudoDismiss = useCallback((): void => {
    setSudoOpen(false);
    setPendingAction(null);
    setShowDeleteConfirm(false);
  }, []);

  const handleDeleteClick = useCallback((): void => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    handleStartAction('delete');
  }, [showDeleteConfirm, handleStartAction]);

  const currentError = deactivateError ?? deleteError ?? reactivateError;
  const isAnyLoading = isDeactivating || isDeleting || isReactivating;
  const deletionDaysLeft =
    deletionScheduledAt !== undefined
      ? Math.max(0, Math.ceil((new Date(deletionScheduledAt).getTime() - Date.now()) / MS_PER_DAY))
      : null;

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Account Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="font-medium">Account Status</Text>
              <Text size="sm" tone="muted">
                Your account is currently{' '}
                {accountStatus === 'active'
                  ? 'active and in good standing.'
                  : accountStatus === 'deactivated'
                    ? 'deactivated. You can reactivate at any time.'
                    : 'scheduled for deletion.'}
              </Text>
            </div>
            <Badge tone={getStatusTone(accountStatus)} data-testid="account-status-badge">
              {getStatusLabel(accountStatus)}
            </Badge>
          </div>
          {accountStatus === 'pending_deletion' && deletionDaysLeft !== null && (
            <Text size="sm" tone="danger" data-testid="deletion-countdown" className="mt-2">
              Permanent deletion in {deletionDaysLeft} {deletionDaysLeft === 1 ? 'day' : 'days'}
            </Text>
          )}
        </Card>

        {/* Success / Error Messages */}
        {successMessage !== null && <Alert tone="success">{successMessage}</Alert>}
        {currentError !== null && <Alert tone="danger">{currentError.message}</Alert>}

        {/* Reactivate - shown when deactivated or pending deletion */}
        {(accountStatus === 'deactivated' || accountStatus === 'pending_deletion') && (
          <Card className="p-4">
            <Heading as="h4" size="sm" className="mb-2">
              Reactivate Account
            </Heading>
            <Text size="sm" tone="muted" className="mb-3">
              {accountStatus === 'pending_deletion'
                ? 'Cancel the pending deletion and restore your account.'
                : 'Restore your account to active status.'}
            </Text>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setSuccessMessage(null);
                reactivate();
              }}
              disabled={isAnyLoading}
              data-testid="reactivate-button"
            >
              {isReactivating ? 'Reactivating...' : 'Reactivate Account'}
            </Button>
          </Card>
        )}

        {/* Deactivate Account - shown when active */}
        {accountStatus === 'active' && (
          <Card className="p-4 border-warning">
            <Heading as="h4" size="sm" className="mb-2">
              Deactivate Account
            </Heading>
            <Text size="sm" tone="muted" className="mb-3">
              Temporarily disable your account. Your data will be preserved and you can reactivate
              at any time.
            </Text>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                handleStartAction('deactivate');
              }}
              disabled={isAnyLoading}
              data-testid="deactivate-button"
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
            </Button>
          </Card>
        )}

        {/* Delete Account - shown when active or deactivated */}
        {accountStatus !== 'pending_deletion' && (
          <Card className="p-4 border-danger">
            <Heading as="h4" size="sm" className="text-danger mb-2">
              Delete Account
            </Heading>
            <Text size="sm" tone="muted" className="mb-3">
              Permanently delete your account and all associated data. You will have a 30-day grace
              period to cancel.
            </Text>
            {showDeleteConfirm && (
              <Alert tone="danger" className="mb-3" data-testid="delete-confirm-alert">
                Are you sure? This action will schedule your account for permanent deletion. Click
                the button again to confirm.
              </Alert>
            )}
            <Button
              type="button"
              variant="secondary"
              className="text-danger border-danger"
              onClick={handleDeleteClick}
              disabled={isAnyLoading}
              data-testid="delete-button"
            >
              {isDeleting
                ? 'Requesting deletion...'
                : showDeleteConfirm
                  ? 'Confirm Delete Account'
                  : 'Delete Account'}
            </Button>
          </Card>
        )}

        {/* Consent Preferences */}
        <ConsentPreferences />

        {/* Data Export */}
        <DataExportSection />
      </div>

      <SudoModal open={sudoOpen} onSuccess={handleSudoSuccess} onDismiss={handleSudoDismiss} />
    </div>
  );
};
