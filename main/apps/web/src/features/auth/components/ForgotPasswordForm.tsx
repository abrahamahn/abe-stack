// main/apps/web/src/features/auth/components/ForgotPasswordForm.tsx

import { Link } from '@bslt/react/router';
import { AuthFormLayout, Button, Input } from '@bslt/ui';
import { useCallback, useState } from 'react';

import { TurnstileWidget } from './TurnstileWidget';

import type { AuthMode } from '@bslt/react/hooks';
import type { ForgotPasswordRequest } from '@bslt/shared';
import type { ChangeEvent, ReactElement } from 'react';

export interface ForgotPasswordFormProps {
  onForgotPassword?: (data: ForgotPasswordRequest) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const ForgotPasswordForm = ({
  onForgotPassword,
  onModeChange,
  isLoading,
  error,
  onSuccess,
}: ForgotPasswordFormProps): ReactElement => {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (onForgotPassword === undefined) return;

    try {
      await onForgotPassword({
        email,
        ...(captchaToken !== undefined ? { captchaToken } : {}),
      });
      onSuccess?.();
    } catch {
      // Error handled by parent component via onForgotPassword callback
    }
  };

  return (
    <AuthFormLayout>
      <AuthFormLayout.Content>
        <AuthFormLayout.Header>
          <AuthFormLayout.Title>Reset password</AuthFormLayout.Title>
          <AuthFormLayout.Subtitle>
            Enter your email address and we'll send you a link to reset your password
          </AuthFormLayout.Subtitle>
        </AuthFormLayout.Header>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="auth-form-fields"
        >
          <Input.Field
            label="Email"
            type="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
            }}
            required
            disabled={isLoading}
          />

          {error !== undefined && error !== null && error.length > 0 && (
            <AuthFormLayout.Error>{error}</AuthFormLayout.Error>
          )}

          <TurnstileWidget onToken={handleCaptchaToken} />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading === true ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <AuthFormLayout.Footer>
          Remember your password?{' '}
          {onModeChange !== undefined ? (
            <Button
              variant="text"
              onClick={() => {
                onModeChange('login');
              }}
              size="inline"
            >
              Sign in
            </Button>
          ) : (
            <Link to="/auth?mode=login">Sign in</Link>
          )}
        </AuthFormLayout.Footer>
      </AuthFormLayout.Content>
    </AuthFormLayout>
  );
};
