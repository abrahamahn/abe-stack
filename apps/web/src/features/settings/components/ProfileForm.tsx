// apps/web/src/features/settings/components/ProfileForm.tsx
/**
 * Profile Form Component
 *
 * Form for updating user profile information.
 */

import { useState, type ReactElement } from 'react';

import { Alert, Button, FormField, Input } from '@abe-stack/ui';

import { useProfileUpdate } from '../hooks';

import type { User } from '../api';

// ============================================================================
// Types
// ============================================================================

export interface ProfileFormProps {
  user: User;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ProfileForm({ user, onSuccess }: ProfileFormProps): ReactElement {
  const [name, setName] = useState(user.name ?? '');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { updateProfile, isLoading, error, reset } = useProfileUpdate({
    onSuccess: () => {
      setSuccessMessage('Profile updated successfully');
      reset();
      onSuccess?.();
      // Clear success message after 3 seconds
      setTimeout(() => { setSuccessMessage(null); }, 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setSuccessMessage(null);
    updateProfile({ name: name.trim() || null });
  };

  const hasChanges = (name.trim() || null) !== user.name;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          value={user.email}
          disabled
          className="bg-gray-100 dark:bg-gray-800"
        />
        <p className="text-sm text-gray-500 mt-1">
          Email cannot be changed at this time.
        </p>
      </FormField>

      <FormField label="Display Name" htmlFor="name">
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder="Enter your display name"
          maxLength={100}
        />
      </FormField>

      {error && (
        <Alert tone="danger">
          {error.message}
        </Alert>
      )}

      {successMessage && (
        <Alert tone="success">
          {successMessage}
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!hasChanges || isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
