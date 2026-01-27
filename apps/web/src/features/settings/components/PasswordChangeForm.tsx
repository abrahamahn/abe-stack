// apps/web/src/features/settings/components/PasswordChangeForm.tsx
/**
 * Password Change Form Component
 *
 * Form for changing user password with validation.
 */

import { Alert, Button, FormField, PasswordInput } from '@abe-stack/ui';
import { useState, type ReactElement } from 'react';

import { usePasswordChange } from '../hooks';

// ============================================================================
// Types
// ============================================================================

export interface PasswordChangeFormProps {
  onSuccess?: () => void;
}

// ============================================================================
// Password Strength Indicator
// ============================================================================

const PasswordStrengthIndicator = ({ password }: { password: string }): ReactElement => {
  const getStrength = (): { score: number; label: string; color: string } => {
    if (password.length === 0) return { score: 0, label: 'Enter a password', color: 'bg-gray-300' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
    if (score >= 4) return { score: 4, label: 'Strong', color: 'bg-green-500' };

    return { score: 0, label: '', color: 'bg-gray-300' };
  };

  const strength = getStrength();

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      {password.length > 0 && <p className="text-xs text-gray-500">{strength.label}</p>}
    </div>
  );
};

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

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setValidationError('New passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters');
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
    newPassword.length >= 8 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Current Password" htmlFor="currentPassword" required>
        <PasswordInput
          id="currentPassword"
          value={currentPassword}
          onChange={(e) => {
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
          onChange={(e) => {
            setNewPassword(e.target.value);
          }}
          placeholder="Enter new password"
          autoComplete="new-password"
        />
        <PasswordStrengthIndicator password={newPassword} />
      </FormField>

      <FormField label="Confirm New Password" htmlFor="confirmPassword" required>
        <PasswordInput
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
          }}
          placeholder="Confirm new password"
          autoComplete="new-password"
        />
        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
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
