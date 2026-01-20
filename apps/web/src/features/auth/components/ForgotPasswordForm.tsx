// apps/web/src/features/auth/components/ForgotPasswordForm.tsx
import { Button, Input } from '@abe-stack/ui';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { AuthMode } from './AuthForms';
import type { ForgotPasswordRequest } from '@abe-stack/core';
import type { ChangeEvent, ReactElement } from 'react';

export interface ForgotPasswordFormProps {
  onForgotPassword?: (data: ForgotPasswordRequest) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ForgotPasswordForm({
  onForgotPassword,
  onModeChange,
  isLoading,
  error,
  onSuccess,
}: ForgotPasswordFormProps): ReactElement {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!onForgotPassword) return;

    try {
      await onForgotPassword({ email });
      onSuccess?.();
    } catch {
      // Error handled by parent component via onForgotPassword callback
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form-content">
        <div className="auth-form-header">
          <h2 className="auth-form-title">Reset password</h2>
          <p className="auth-form-subtitle">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

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

          {error && <div className="auth-form-error">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <div className="auth-form-footer">
          Remember your password?{' '}
          {onModeChange ? (
            <Button
              variant="text"
              onClick={() => {
                onModeChange('login');
              }}
              style={{ padding: 0, minHeight: 'auto' }}
            >
              Sign in
            </Button>
          ) : (
            <Link to="/auth?mode=login">Sign in</Link>
          )}
        </div>
      </div>
    </div>
  );
}
