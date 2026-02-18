// main/apps/web/src/features/settings/components/UsernameForm.tsx
/**
 * Username Form Component
 *
 * Form for updating the user's username with client-side validation,
 * reserved word checking, and 30-day cooldown display.
 */

import { MS_PER_DAY, RESERVED_USERNAMES, USERNAME_CHANGE_COOLDOWN_DAYS } from '@bslt/shared';
import { Alert, Button, FormField, Input, Text } from '@bslt/ui';
import { useState, type ReactElement } from 'react';

import { useUsernameUpdate } from '../hooks/useUsername';

// ============================================================================
// Constants
// ============================================================================

const USERNAME_REGEX = /^[a-z][a-z0-9_]{1,29}$/;

// ============================================================================
// Types
// ============================================================================

export interface UsernameFormProps {
  currentUsername?: string | null;
  lastUsernameChangeAt?: string | null;
  onSuccess?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function validateUsername(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 2) return 'Username must be at least 2 characters';
  if (trimmed.length > 30) return 'Username must be at most 30 characters';
  if (!USERNAME_REGEX.test(trimmed)) {
    return 'Must start with a letter and contain only lowercase letters, numbers, and underscores';
  }
  if ((RESERVED_USERNAMES as readonly string[]).includes(trimmed)) {
    return 'This username is reserved';
  }
  return null;
}

function getCooldownInfo(lastChangeAt: string | null | undefined): {
  isActive: boolean;
  nextChangeDate: Date | null;
} {
  if (lastChangeAt === null || lastChangeAt === undefined) {
    return { isActive: false, nextChangeDate: null };
  }
  const lastChange = new Date(lastChangeAt);
  const nextChange = new Date(lastChange.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * MS_PER_DAY);
  return {
    isActive: new Date() < nextChange,
    nextChangeDate: nextChange,
  };
}

// ============================================================================
// Component
// ============================================================================

export const UsernameForm = ({
  currentUsername,
  lastUsernameChangeAt,
  onSuccess,
}: UsernameFormProps): ReactElement => {
  const [username, setUsername] = useState(currentUsername ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cooldown = getCooldownInfo(lastUsernameChangeAt);

  const { updateUsername, isLoading, error, reset } = useUsernameUpdate({
    onSuccess: () => {
      setSuccessMessage('Username updated successfully');
      reset();
      onSuccess?.();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    if (value.trim().length > 0) {
      setValidationError(validateUsername(value));
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setSuccessMessage(null);
    const trimmed = username.trim().toLowerCase();
    const error = validateUsername(trimmed);
    if (error !== null) {
      setValidationError(error);
      return;
    }
    updateUsername({ username: trimmed });
  };

  const hasChanges = username.trim().toLowerCase() !== (currentUsername ?? '');

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Username" htmlFor="username">
        <Input
          id="username"
          type="text"
          value={username}
          onChange={handleChange}
          placeholder="Enter a username"
          maxLength={30}
          disabled={cooldown.isActive}
          required
        />
        {validationError !== null && (
          <Text size="sm" tone="danger" className="mt-1">
            {validationError}
          </Text>
        )}
        {cooldown.isActive && cooldown.nextChangeDate !== null && (
          <Text size="sm" tone="muted" className="mt-1">
            Username can be changed again after {cooldown.nextChangeDate.toLocaleDateString()}.
          </Text>
        )}
        {!cooldown.isActive && (
          <Text size="sm" tone="muted" className="mt-1">
            2-30 characters, starts with a letter, only lowercase letters, numbers, and underscores.
            Can be changed once every {String(USERNAME_CHANGE_COOLDOWN_DAYS)} days.
          </Text>
        )}
      </FormField>

      {error !== null && <Alert tone="danger">{error.message}</Alert>}

      {successMessage !== null && successMessage.length > 0 && (
        <Alert tone="success">{successMessage}</Alert>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!hasChanges || isLoading || cooldown.isActive || validationError !== null}
        >
          {isLoading ? 'Saving...' : 'Update Username'}
        </Button>
      </div>
    </form>
  );
};
