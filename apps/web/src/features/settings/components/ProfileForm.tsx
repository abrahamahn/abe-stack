// apps/web/src/features/settings/components/ProfileForm.tsx
/**
 * Profile Form Component
 *
 * Form for updating user profile information.
 */

import { Alert, Button, FormField, Input } from '@abe-stack/ui';
import { useState, type ReactElement } from 'react';

import { useProfileUpdate } from '../hooks';

// ============================================================================
// Local Types (for ESLint type resolution)
// ============================================================================

interface UserLocal {
  email: string;
  name: string | null;
}

// ============================================================================
// Types
// ============================================================================

export interface ProfileFormProps {
  user: UserLocal;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ProfileForm = ({ user, onSuccess }: ProfileFormProps): ReactElement => {
  const userName: string | null = user.name;
  const userEmail: string = user.email;
  const [name, setName] = useState(userName ?? '');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { updateProfile, isLoading, error, reset } = useProfileUpdate({
    onSuccess: () => {
      setSuccessMessage('Profile updated successfully');
      reset();
      onSuccess?.();
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    },
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setSuccessMessage(null);
    updateProfile({ name: name.trim().length > 0 ? name.trim() : null });
  };

  const hasChanges = (name.trim().length > 0 ? name.trim() : null) !== userName;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          value={userEmail}
          disabled
          className="bg-gray-100 dark:bg-gray-800"
        />
        <p className="text-sm text-gray-500 mt-1">Email cannot be changed at this time.</p>
      </FormField>

      <FormField label="Display Name" htmlFor="name">
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder="Enter your display name"
          maxLength={100}
        />
      </FormField>

      {error !== null && <Alert tone="danger">{error.message}</Alert>}

      {successMessage !== null && successMessage.length > 0 && (
        <Alert tone="success">{successMessage}</Alert>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!hasChanges || isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};
