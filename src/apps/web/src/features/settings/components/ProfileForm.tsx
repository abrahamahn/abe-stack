// src/apps/web/src/features/settings/components/ProfileForm.tsx
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
  firstName: string;
  lastName: string;
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
  const userFirstName: string = user.firstName;
  const userLastName: string = user.lastName;
  const userEmail: string = user.email;
  const [firstName, setFirstName] = useState(userFirstName);
  const [lastName, setLastName] = useState(userLastName);
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
    updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  const hasChanges = firstName.trim() !== userFirstName || lastName.trim() !== userLastName;

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
        <p className="text-sm text-gray-500 mt-1">To change your email, go to the Security tab.</p>
      </FormField>

      <FormField label="First Name" htmlFor="firstName">
        <Input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
          }}
          placeholder="Enter your first name"
          maxLength={100}
          required
        />
      </FormField>

      <FormField label="Last Name" htmlFor="lastName">
        <Input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
          }}
          placeholder="Enter your last name"
          maxLength={100}
          required
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
