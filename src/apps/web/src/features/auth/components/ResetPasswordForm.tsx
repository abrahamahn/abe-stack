// src/apps/web/src/features/auth/components/ResetPasswordForm.tsx
import { useState } from 'react';

import { Link } from '@abe-stack/react/router';
import { AuthFormLayout, Button, PasswordInput } from '@abe-stack/ui';

import type { ResetPasswordRequest } from '@abe-stack/shared';
import type { AuthMode } from '@abe-stack/react/hooks';
import type { ChangeEvent, ReactElement } from 'react';

export interface ResetPasswordFormProps {
  onResetPassword?: (data: ResetPasswordRequest) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  initialData?: { token?: string };
  isLoading?: boolean;
  error?: string | null;
}

export const ResetPasswordForm = ({
  onResetPassword,
  onModeChange,
  isLoading,
  error,
  onSuccess,
  initialData,
}: ResetPasswordFormProps): ReactElement => {
  const [password, setPassword] = useState('');
  const token = initialData?.token ?? '';

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (onResetPassword === undefined || token.length === 0) return;

    try {
      await onResetPassword({ token, password });
      onSuccess?.();
    } catch {
      // Error handled by parent component via onResetPassword callback
    }
  };

  if (token === '' || token.length === 0) {
    return (
      <AuthFormLayout>
        <AuthFormLayout.Content className="text-center">
          <AuthFormLayout.Title className="text-danger">Invalid reset link</AuthFormLayout.Title>
          <AuthFormLayout.Subtitle>
            This password reset link is invalid or has expired.
          </AuthFormLayout.Subtitle>
          {onModeChange !== undefined ? (
            <Button
              variant="secondary"
              onClick={() => {
                onModeChange('forgot-password');
              }}
            >
              Request a new reset link
            </Button>
          ) : (
            <Link to="/auth?mode=forgot-password">
              <Button variant="secondary">Request a new reset link</Button>
            </Link>
          )}
        </AuthFormLayout.Content>
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout>
      <AuthFormLayout.Content>
        <AuthFormLayout.Header>
          <AuthFormLayout.Title>Set new password</AuthFormLayout.Title>
          <AuthFormLayout.Subtitle>Enter your new password</AuthFormLayout.Subtitle>
        </AuthFormLayout.Header>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="auth-form-fields"
        >
          <PasswordInput
            label="New password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setPassword(e.target.value);
            }}
            required
            disabled={isLoading}
          />

          {error !== undefined && error !== null && error.length > 0 && (
            <AuthFormLayout.Error>{error}</AuthFormLayout.Error>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading === true ? 'Updating...' : 'Update password'}
          </Button>
        </form>

        <AuthFormLayout.Footer>
          {onModeChange !== undefined ? (
            <Button
              variant="text"
              onClick={() => {
                onModeChange('login');
              }}
              size="inline"
            >
              Back to sign in
            </Button>
          ) : (
            <Link to="/auth?mode=login">Back to sign in</Link>
          )}
        </AuthFormLayout.Footer>
      </AuthFormLayout.Content>
    </AuthFormLayout>
  );
};
