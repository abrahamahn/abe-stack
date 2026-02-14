// main/apps/web/src/features/settings/components/EmailChangeForm.tsx
/**
 * Email Change Form Component
 *
 * Allows users to request an email address change by providing a new email
 * and their current password for verification. Sends a confirmation link
 * to the new email address.
 *
 * @module settings/components
 */

import { getApiClient } from '@abe-stack/api';
import { Alert, Button, FormField, Input, PasswordInput, Text } from '@abe-stack/ui';
import { getAccessToken } from '@app/authToken';
import { useCallback, useState, type ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface EmailChangeFormProps {
  /** Called after a successful email change request */
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Form for initiating an email address change.
 *
 * The user provides a new email and their current password. On success,
 * a confirmation link is sent to the new email address.
 *
 * @param props - Component props
 * @returns Email change form UI
 * @complexity O(1) render
 */
export const EmailChangeForm = ({ onSuccess }: EmailChangeFormProps): ReactElement => {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      setError(null);
      setSuccessMessage(null);
      setIsLoading(true);

      try {
        const api = getApiClient({
          baseUrl:
            typeof import.meta.env['VITE_API_URL'] === 'string'
              ? import.meta.env['VITE_API_URL']
              : '',
          getToken: getAccessToken,
        });

        const result = await api.changeEmail({
          newEmail: newEmail.trim(),
          password,
        });

        setSuccessMessage(result.message);
        setNewEmail('');
        setPassword('');
        onSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to request email change';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [newEmail, password, onSuccess],
  );

  const isValid = newEmail.trim().length > 0 && newEmail.includes('@') && password.length > 0;

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-5"
    >
      <Text size="sm" tone="muted">
        A confirmation link will be sent to your new email address. Your email will not change until
        you click the link.
      </Text>

      <FormField label="New Email Address" htmlFor="newEmail" required>
        <Input
          id="newEmail"
          type="email"
          value={newEmail}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setNewEmail(e.target.value);
          }}
          placeholder="Enter new email address"
          autoComplete="email"
          disabled={isLoading}
          required
        />
      </FormField>

      <FormField label="Current Password" htmlFor="emailChangePassword" required>
        <PasswordInput
          id="emailChangePassword"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setPassword(e.target.value);
          }}
          placeholder="Enter your password to confirm"
          autoComplete="current-password"
          disabled={isLoading}
        />
      </FormField>

      {error !== null && <Alert tone="danger">{error}</Alert>}

      {successMessage !== null && successMessage.length > 0 && (
        <Alert tone="success">{successMessage}</Alert>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!isValid || isLoading}>
          {isLoading ? 'Requesting...' : 'Change Email'}
        </Button>
      </div>
    </form>
  );
};
