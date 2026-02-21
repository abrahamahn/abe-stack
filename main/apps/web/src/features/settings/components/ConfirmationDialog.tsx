// main/apps/web/src/features/settings/components/ConfirmationDialog.tsx
/**
 * Confirmation Dialog with Countdown
 *
 * A reusable modal dialog for confirming destructive actions.
 * Features a countdown timer that must complete before the confirm
 * button becomes active, preventing accidental confirmations.
 */

import { Button, Modal, Text } from '@bslt/ui';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Dialog title */
  title: string;
  /** Dialog description/warning message */
  description: string;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Countdown duration in seconds before confirm is enabled (default: 5) */
  countdownSeconds?: number;
  /** Visual tone: "danger" for destructive actions (default: "danger") */
  tone?: 'danger' | 'warning' | 'info';
  /** Whether the confirmation action is in progress */
  isLoading?: boolean;
  /** Called when the user confirms the action */
  onConfirm: () => void;
  /** Called when the user cancels */
  onCancel: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ConfirmationDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  countdownSeconds = 5,
  tone = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps): ReactElement | null => {
  if (!open) return null;

  return (
    <ConfirmationDialogOpen
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      countdownSeconds={countdownSeconds}
      tone={tone}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

type ConfirmationDialogOpenProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  countdownSeconds: number;
  tone: 'danger' | 'warning' | 'info';
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmationDialogOpen = ({
  title,
  description,
  confirmLabel,
  cancelLabel,
  countdownSeconds,
  tone,
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmationDialogOpenProps): ReactElement => {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Run countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [countdown]);

  const handleClose = useCallback((): void => {
    if (!isLoading) {
      onCancel();
    }
  }, [isLoading, onCancel]);

  const handleConfirm = useCallback((): void => {
    if (countdown <= 0 && !isLoading) {
      onConfirm();
    }
  }, [countdown, isLoading, onConfirm]);

  const isConfirmEnabled = countdown <= 0 && !isLoading;

  const toneClasses: Record<ConfirmationDialogOpenProps['tone'], string> = {
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-info',
  };

  const buttonLabel =
    countdown > 0
      ? `${confirmLabel} (${String(countdown)}s)`
      : isLoading
        ? 'Processing...'
        : confirmLabel;

  return (
    <Modal.Root open={true} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title className={toneClasses[tone]}>{title}</Modal.Title>
        <Modal.Close />
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-4">
          <Text size="sm">{description}</Text>

          {countdown > 0 && (
            <div className="flex items-center gap-2" data-testid="countdown-indicator">
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-border"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${String(Math.round((countdown / countdownSeconds) * 88))} 88`}
                    className={toneClasses[tone]}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-mono">
                  {countdown}
                </span>
              </div>
              <Text size="sm" tone="muted">
                Please wait before confirming...
              </Text>
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={tone === 'danger' ? 'secondary' : 'primary'}
          className={tone === 'danger' ? 'text-danger border-danger' : ''}
          onClick={handleConfirm}
          disabled={!isConfirmEnabled}
          data-testid="confirm-button"
        >
          {buttonLabel}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
};
