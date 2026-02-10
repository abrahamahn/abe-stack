// src/apps/web/src/features/settings/components/SudoModal.tsx
/**
 * Sudo Re-authentication Modal
 *
 * Prompts the user to re-authenticate with password (and optional TOTP)
 * before performing sensitive operations like account deactivation or deletion.
 */

import { Alert, Button, FormField, Input, Modal, Text } from '@abe-stack/ui';
import { useState, type ReactElement } from 'react';

import { useSudo } from '../hooks/useSudo';

// ============================================================================
// Types
// ============================================================================

export interface SudoModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called with the sudo token when re-authentication succeeds */
  onSuccess: (sudoToken: string) => void;
  /** Called when the modal is dismissed */
  onDismiss: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const SudoModal = ({ open, onSuccess, onDismiss }: SudoModalProps): ReactElement | null => {
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const { sudo, isLoading, error, reset } = useSudo({
    onSuccess: (response) => {
      setPassword('');
      setTotpCode('');
      reset();
      onSuccess(response.sudoToken);
    },
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const data: { password?: string; totpCode?: string } = {};
    if (password.length > 0) {
      data.password = password;
    }
    if (totpCode.length > 0) {
      data.totpCode = totpCode;
    }
    sudo(data);
  };

  const handleClose = (): void => {
    setPassword('');
    setTotpCode('');
    reset();
    onDismiss();
  };

  if (!open) return null;

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title>Confirm Your Identity</Modal.Title>
        <Modal.Description>
          Please re-enter your password to continue with this sensitive action.
        </Modal.Description>
        <Modal.Close />
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="space-y-4">
            <FormField label="Password" htmlFor="sudo-password">
              <Input
                id="sudo-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </FormField>

            <FormField label="Two-Factor Code (optional)" htmlFor="sudo-totp">
              <Input
                id="sudo-totp"
                type="text"
                value={totpCode}
                onChange={(e) => {
                  setTotpCode(e.target.value);
                }}
                placeholder="6-digit code"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <Text size="sm" tone="muted" className="mt-1">
                Required if you have two-factor authentication enabled.
              </Text>
            </FormField>

            {error !== null && <Alert tone="danger">{error.message}</Alert>}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={password.length === 0 || isLoading}>
            {isLoading ? 'Verifying...' : 'Confirm'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal.Root>
  );
};
