// main/apps/web/src/features/settings/components/PasswordChangeForm.tsx
/**
 * Password Change Form Component
 *
 * Form for changing user password with validation.
 */

import { validatePasswordBasic } from '@bslt/shared';
import { Alert, Button, FormField, PasswordInput, Text } from '@bslt/ui';
import { useState, type ReactElement } from 'react';

import { usePasswordChange } from '../hooks';

// ============================================================================
// Types
// ============================================================================

export interface PasswordChangeFormProps {
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const PasswordChangeForm = ({ onSuccess }: PasswordChangeFormProps): ReactElement => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { changePassword, isLoading, error, reset } = usePasswordChange({
    onSuccess: () => {
      setSuccessMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      reset();
      onSuccess?.();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    },
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setValidationError('New passwords do not match');
      return;
    }

    // Validate password
    const passwordValidation = validatePasswordBasic(newPassword);
    if (!passwordValidation.isValid) {
      setValidationError(passwordValidation.errors[0] ?? 'Invalid password');
      return;
    }

    // Validate not same as current
    if (newPassword === currentPassword) {
      setValidationError('New password must be different from current password');
      return;
    }

    changePassword({
      currentPassword,
      newPassword,
    });
  };

  const isValid =
    currentPassword.length > 0 &&
    validatePasswordBasic(newPassword).isValid &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Current Password" htmlFor="currentPassword" required>
        <PasswordInput
          id="currentPassword"
          value={currentPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setCurrentPassword(e.target.value);
          }}
          placeholder="Enter current password"
          autoComplete="current-password"
        />
      </FormField>

      <FormField label="New Password" htmlFor="newPassword" required>
        <PasswordInput
          id="newPassword"
          value={newPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setNewPassword(e.target.value);
          }}
          placeholder="Enter new password"
          autoComplete="new-password"
          showStrength
        />
      </FormField>

      <FormField label="Confirm New Password" htmlFor="confirmPassword" required>
        <PasswordInput
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setConfirmPassword(e.target.value);
          }}
          placeholder="Confirm new password"
          autoComplete="new-password"
        />
        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <Text size="sm" tone="danger">
            Passwords do not match
          </Text>
        )}
      </FormField>

      {(validationError !== null || error !== null) && (
        <Alert tone="danger">{validationError ?? error?.message}</Alert>
      )}

      {successMessage !== null && successMessage.length > 0 && (
        <Alert tone="success">{successMessage}</Alert>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!isValid || isLoading}>
          {isLoading ? 'Changing...' : 'Change Password'}
        </Button>
      </div>
    </form>
  );
};
