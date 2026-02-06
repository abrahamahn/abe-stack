// apps/web/src/features/auth/components/LoginForm.tsx
import { Button, Input, Link, PasswordInput } from '@abe-stack/ui';
import { useState } from 'react';

import { OAuthButtons } from './OAuthButtons';

import type { ForgotPasswordRequest, LoginRequest } from '@abe-stack/shared';
import type { AuthMode } from '@abe-stack/ui';
import type { ChangeEvent, ReactElement } from 'react';

export interface LoginFormProps {
  onLogin?: (data: LoginRequest) => Promise<void>;
  onForgotPassword?: (data: ForgotPasswordRequest) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const LoginForm = ({
  onLogin,
  onForgotPassword,
  onModeChange,
  isLoading,
  error,
  onSuccess,
}: LoginFormProps): ReactElement => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (onLogin === undefined) return;

    try {
      await onLogin({ email, password });
      onSuccess?.();
    } catch {
      // Error handled by parent component via onLogin callback
    }
  };

  const handleForgotPassword = (): void => {
    void onForgotPassword?.({ email });
    if (onModeChange !== undefined) {
      onModeChange('forgot-password');
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form-content">
        <div className="auth-form-header">
          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-subtitle">Sign in to your account</p>
        </div>

        <OAuthButtons mode="login" {...(isLoading !== undefined && { disabled: isLoading })} />

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

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setPassword(e.target.value);
            }}
            required
            disabled={isLoading}
          />

          {error !== undefined && error !== null && <div className="auth-form-error">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading === true ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="text-center">
          <Button variant="text" onClick={handleForgotPassword} disabled={isLoading}>
            Forgot your password?
          </Button>
        </div>

        <div className="auth-form-footer">
          Don't have an account?{' '}
          {onModeChange !== undefined ? (
            <Button
              variant="text"
              onClick={() => {
                onModeChange('register');
              }}
              style={{ padding: 0, minHeight: 'auto' }}
            >
              Sign up
            </Button>
          ) : (
            <Link to="/auth?mode=register">Sign up</Link>
          )}
        </div>
      </div>
    </div>
  );
};
