// main/apps/web/src/features/admin/components/HardBanDialog.tsx
/**
 * HardBanDialog Component
 *
 * Confirmation dialog for permanently banning a user account.
 * Requires admin to type the user's email to confirm the destructive action.
 * Requires sudo re-auth token.
 *
 * Sprint 3.15: Hard Ban confirmation dialog with grace period display.
 */

import { RETENTION_PERIODS } from '@bslt/shared';
import { Button, Input, Modal, Text, TextArea } from '@bslt/ui';
import { useCallback, useState } from 'react';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface HardBanDialogProps {
  /** Whether the dialog is currently open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Hard ban handler - called with reason and sudo token */
  onConfirm: (reason: string, sudoToken: string) => Promise<void>;
  /** User email for confirmation typing */
  userEmail: string;
  /** User display name for messages */
  userName: string;
  /** Whether a hard ban operation is in progress */
  isLoading: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const HardBanDialog = ({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  userName,
  isLoading,
}: HardBanDialogProps): JSX.Element => {
  const [reason, setReason] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [sudoToken, setSudoToken] = useState('');

  const graceDays = RETENTION_PERIODS.HARD_BAN_GRACE_DAYS;

  const resetForm = useCallback(() => {
    setReason('');
    setConfirmEmail('');
    setSudoToken('');
  }, []);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  }, [isLoading, resetForm, onClose]);

  const handleConfirm = useCallback(async () => {
    if (reason.trim().length === 0) return;
    if (confirmEmail !== userEmail) return;
    if (sudoToken.trim().length === 0) return;

    await onConfirm(reason.trim(), sudoToken.trim());
    resetForm();
  }, [reason, confirmEmail, userEmail, sudoToken, onConfirm, resetForm]);

  const isEmailMatch = confirmEmail === userEmail;
  const canSubmit =
    reason.trim().length > 0 && isEmailMatch && sudoToken.trim().length > 0 && !isLoading;

  return (
    <Modal.Root open={isOpen} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title>Permanently Ban User</Modal.Title>
        <Modal.Description>
          This action will permanently ban <strong>{userName}</strong> and cannot be easily
          reversed.
        </Modal.Description>
      </Modal.Header>

      <Modal.Body>
        <div className="py-4 space-y-4">
          {/* Warning Banner */}
          <div className="bg-danger-muted border border-danger rounded-lg p-4">
            <Text size="sm" tone="danger" className="font-semibold mb-2">
              This is a destructive action. The following will happen immediately:
            </Text>
            <ul className="list-disc list-inside text-sm text-danger space-y-1">
              <li>All active sessions and tokens will be revoked</li>
              <li>Active subscriptions will be cancelled</li>
              <li>User will be removed from all team memberships</li>
              <li>Account will be permanently locked</li>
              <li>Personal data will be anonymized after a {graceDays}-day grace period</li>
            </ul>
          </div>

          {/* Reason Input */}
          <div>
            <label htmlFor="hardban-reason" className="block text-sm font-medium text-muted mb-1">
              Reason for ban <span className="text-danger">*</span>
            </label>
            <TextArea
              id="hardban-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
              }}
              placeholder="Describe why this account is being permanently banned"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Sudo Re-auth */}
          <div>
            <label htmlFor="hardban-sudo" className="block text-sm font-medium text-muted mb-1">
              Admin password / 2FA code <span className="text-danger">*</span>
            </label>
            <Input
              id="hardban-sudo"
              type="password"
              value={sudoToken}
              onChange={(e) => {
                setSudoToken(e.target.value);
              }}
              placeholder="Enter your password or 2FA code to confirm"
              disabled={isLoading}
            />
            <Text size="xs" tone="muted" className="mt-1">
              Re-authentication required for destructive admin actions.
            </Text>
          </div>

          {/* Confirmation Input */}
          <div>
            <label htmlFor="hardban-confirm" className="block text-sm font-medium text-muted mb-1">
              Type <code className="bg-surface px-1 rounded">{userEmail}</code> to confirm{' '}
              <span className="text-danger">*</span>
            </label>
            <Input
              id="hardban-confirm"
              type="text"
              value={confirmEmail}
              onChange={(e) => {
                setConfirmEmail(e.target.value);
              }}
              placeholder={userEmail}
              disabled={isLoading}
            />
          </div>

          {/* Grace Period Info */}
          <div className="bg-surface rounded-lg p-3">
            <Text size="sm" tone="muted">
              <strong>Grace period:</strong> The user&apos;s personal data will be preserved for{' '}
              {graceDays} days before being anonymized. During this period, the ban can be reviewed
              by a senior administrator.
            </Text>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="bg-danger hover:bg-danger-hover text-white"
          onClick={() => {
            void handleConfirm();
          }}
          disabled={!canSubmit}
        >
          {isLoading ? 'Banning...' : 'Permanently Ban User'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
};
