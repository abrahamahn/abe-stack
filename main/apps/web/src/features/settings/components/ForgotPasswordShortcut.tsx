// main/apps/web/src/features/settings/components/ForgotPasswordShortcut.tsx
/**
 * Forgot Password Shortcut
 *
 * Allows a logged-in user to request a password reset email without logging out.
 */

import { getApiClient } from '@bslt/api';
import { Alert, Button, Text } from '@bslt/ui';
import { clientConfig } from '@config';
import { useCallback, useState, type ReactElement } from 'react';

export interface ForgotPasswordShortcutProps {
  email: string;
  onSuccess?: () => void;
}

export const ForgotPasswordShortcut = ({
  email,
  onSuccess,
}: ForgotPasswordShortcutProps): ReactElement => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestReset = useCallback(async (): Promise<void> => {
    if (email.trim().length === 0) return;

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const api = getApiClient({
        baseUrl: clientConfig.apiUrl,
      });

      const result = await api.forgotPassword({ email: email.trim() });
      setSuccessMessage(result.message);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [email, onSuccess]);

  const isValid = email.trim().length > 0 && email.includes('@');

  return (
    <div className="space-y-3">
      <Text size="sm" tone="muted">
        Forgot your current password? We can email a reset link to{' '}
        <Text as="span" className="font-medium">
          {email}
        </Text>
        . You can stay logged in while you reset it.
      </Text>

      {error !== null && <Alert tone="danger">{error}</Alert>}
      {successMessage !== null && successMessage.length > 0 && (
        <Alert tone="success">{successMessage}</Alert>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!isValid || isLoading}
          onClick={() => {
            void handleRequestReset();
          }}
        >
          {isLoading ? 'Sending...' : 'Send Reset Email'}
        </Button>
      </div>
    </div>
  );
};
