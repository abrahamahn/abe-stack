// main/apps/web/src/features/admin/components/LockUserDialog.tsx
/**
 * LockUserDialog Component
 *
 * Admin dialog for locking a user account with reason input
 * and duration selector (permanent / 1h / 24h / 7d / 30d / custom).
 *
 * Sprint 3.15: Soft Ban lock dialog.
 */

import { Button, Input, Modal, Select, Text, TextArea } from '@bslt/ui';
import { useCallback, useState } from 'react';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface LockUserDialogProps {
  /** Whether the dialog is currently open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Lock handler - called with reason and optional durationMinutes */
  onConfirm: (reason: string, durationMinutes?: number) => Promise<void>;
  /** User display name for confirmation message */
  userName: string;
  /** Whether a lock operation is in progress */
  isLoading: boolean;
}

/** Lock duration preset */
interface DurationOption {
  value: string;
  label: string;
  minutes: number | undefined;
}

// ============================================================================
// Constants
// ============================================================================

const DURATION_OPTIONS: DurationOption[] = [
  { value: 'permanent', label: 'Permanent (indefinite)', minutes: undefined },
  { value: '60', label: '1 hour', minutes: 60 },
  { value: '1440', label: '24 hours', minutes: 1440 },
  { value: '10080', label: '7 days', minutes: 10080 },
  { value: '43200', label: '30 days', minutes: 43200 },
  { value: 'custom', label: 'Custom duration...', minutes: undefined },
];

// ============================================================================
// Component
// ============================================================================

export const LockUserDialog = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  isLoading,
}: LockUserDialogProps): JSX.Element => {
  const [reason, setReason] = useState('');
  const [durationPreset, setDurationPreset] = useState('permanent');
  const [customDays, setCustomDays] = useState('');
  const [customHours, setCustomHours] = useState('');

  const resetForm = useCallback(() => {
    setReason('');
    setDurationPreset('permanent');
    setCustomDays('');
    setCustomHours('');
  }, []);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  }, [isLoading, resetForm, onClose]);

  const handleConfirm = useCallback(async () => {
    if (reason.trim().length === 0) return;

    let durationMinutes: number | undefined;

    if (durationPreset === 'custom') {
      const days = customDays.length > 0 ? Number(customDays) : 0;
      const hours = customHours.length > 0 ? Number(customHours) : 0;
      if (days === 0 && hours === 0) return;
      durationMinutes = days * 24 * 60 + hours * 60;
    } else if (durationPreset !== 'permanent') {
      durationMinutes = Number(durationPreset);
    }

    await onConfirm(reason.trim(), durationMinutes);
    resetForm();
  }, [reason, durationPreset, customDays, customHours, onConfirm, resetForm]);

  const isCustom = durationPreset === 'custom';
  const customValid =
    !isCustom ||
    (customDays.length > 0 && Number(customDays) > 0) ||
    (customHours.length > 0 && Number(customHours) > 0);
  const canSubmit = reason.trim().length > 0 && customValid && !isLoading;

  return (
    <Modal.Root open={isOpen} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title>Lock User Account</Modal.Title>
        <Modal.Description>
          Lock the account for <strong>{userName}</strong>. The user will be unable to log in while
          the lock is active.
        </Modal.Description>
      </Modal.Header>

      <Modal.Body>
        <div className="py-4 space-y-4">
          {/* Reason Input */}
          <div>
            <label
              htmlFor="lock-dialog-reason"
              className="block text-sm font-medium text-muted mb-1"
            >
              Reason <span className="text-danger">*</span>
            </label>
            <TextArea
              id="lock-dialog-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
              }}
              placeholder="Describe why this account is being locked (visible to user on login)"
              rows={3}
              disabled={isLoading}
            />
            <Text size="xs" tone="muted" className="mt-1">
              This reason will be shown to the user when they attempt to log in.
            </Text>
          </div>

          {/* Duration Selector */}
          <div>
            <label
              htmlFor="lock-dialog-duration"
              className="block text-sm font-medium text-muted mb-1"
            >
              Lock Duration
            </label>
            <Select
              id="lock-dialog-duration"
              value={durationPreset}
              onChange={(value) => {
                setDurationPreset(value);
              }}
              disabled={isLoading}
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Custom Duration Inputs */}
          {isCustom && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label
                  htmlFor="lock-dialog-custom-days"
                  className="block text-sm font-medium text-muted mb-1"
                >
                  Days
                </label>
                <Input
                  id="lock-dialog-custom-days"
                  type="number"
                  value={customDays}
                  onChange={(e) => {
                    setCustomDays(e.target.value);
                  }}
                  placeholder="0"
                  min={0}
                  disabled={isLoading}
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="lock-dialog-custom-hours"
                  className="block text-sm font-medium text-muted mb-1"
                >
                  Hours
                </label>
                <Input
                  id="lock-dialog-custom-hours"
                  type="number"
                  value={customHours}
                  onChange={(e) => {
                    setCustomHours(e.target.value);
                  }}
                  placeholder="0"
                  min={0}
                  max={23}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-warning-muted rounded-lg p-3">
            <Text size="sm" tone="default">
              The user will be notified by email that their account has been locked.
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
          onClick={() => {
            void handleConfirm();
          }}
          disabled={!canSubmit}
        >
          {isLoading ? 'Locking...' : 'Lock Account'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
};
