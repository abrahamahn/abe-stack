// apps/web/src/features/auth/components/ResetPasswordForm.tsx
import { Button, Link, PasswordInput } from '@abe-stack/ui';
import { useState } from 'react';

import type { AuthMode } from './AuthForms';
import type { ResetPasswordRequest } from '@abe-stack/shared';
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
      <div className="auth-form">
        <div className="auth-form-content text-center">
          <h2 className="auth-form-title text-danger">Invalid reset link</h2>
          <p className="auth-form-subtitle">This password reset link is invalid or has expired.</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="auth-form-content">
        <div className="auth-form-header">
          <h2 className="auth-form-title">Set new password</h2>
          <p className="auth-form-subtitle">Enter your new password</p>
        </div>

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
            <div className="auth-form-error">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading === true ? 'Updating...' : 'Update password'}
          </Button>
        </form>

        <div className="auth-form-footer">
          {onModeChange !== undefined ? (
            <Button
              variant="text"
              onClick={() => {
                onModeChange('login');
              }}
              style={{ padding: 0, minHeight: 'auto' }}
            >
              Back to sign in
            </Button>
          ) : (
            <Link to="/auth?mode=login">Back to sign in</Link>
          )}
        </div>
      </div>
    </div>
  );
};
