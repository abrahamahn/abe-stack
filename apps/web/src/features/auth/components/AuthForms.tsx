// apps/web/src/features/auth/components/AuthForms.tsx
import { Button, Input, PasswordInput, Text } from '@abe-stack/ui';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
} from '@abe-stack/core';
import type { ReactElement } from 'react';

export type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export interface AuthFormProps {
  mode: AuthMode;
  onLogin?: (data: LoginRequest) => Promise<void>;
  onRegister?: (data: RegisterRequest) => Promise<RegisterResponse>;
  onForgotPassword?: (data: ForgotPasswordRequest) => Promise<void>;
  onResetPassword?: (data: ResetPasswordRequest) => Promise<void>;
  onResendVerification?: (data: ResendVerificationRequest) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  initialData?: Record<string, unknown>;
  isLoading?: boolean;
  error?: string | null;
}

export function AuthForm(props: AuthFormProps): ReactElement {
  const { mode, onForgotPassword, ...formProps } = props;
  switch (mode) {
    case 'login':
      return <LoginForm {...formProps} onForgotPassword={onForgotPassword} />;
    case 'register':
      return <RegisterForm {...formProps} />;
    case 'forgot-password':
      return <ForgotPasswordForm {...formProps} />;
    case 'reset-password':
      return <ResetPasswordForm {...formProps} />;
    default:
      return <LoginForm {...formProps} onForgotPassword={onForgotPassword} />;
  }
}

interface LoginFormProps extends Omit<
  AuthFormProps,
  'mode' | 'onRegister' | 'onForgotPassword' | 'onResetPassword'
> {
  onLogin?: (data: LoginRequest) => Promise<void>;
  onForgotPassword?: (data: ForgotPasswordRequest) => Promise<void>;
}

export function LoginForm({
  onLogin,
  onForgotPassword,
  onModeChange,
  isLoading,
  error,
  onSuccess,
}: LoginFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!onLogin) return;

    try {
      await onLogin({ email, password });
      onSuccess?.();
    } catch {
      // Error is handled by parent component
    }
  };

  const handleForgotPassword = (): void => {
    void onForgotPassword?.({ email });
    if (onModeChange) {
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
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
            disabled={isLoading}
          />

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
            disabled={isLoading}
          />

          {error && <div className="auth-form-error">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="text-center">
          <Button variant="text" onClick={handleForgotPassword} disabled={isLoading}>
            Forgot your password?
          </Button>
        </div>

        <div className="auth-form-footer">
          Don't have an account?{' '}
          {onModeChange ? (
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
}

interface RegisterFormProps extends Omit<
  AuthFormProps,
  'mode' | 'onLogin' | 'onForgotPassword' | 'onResetPassword'
> {
  onRegister?: (data: RegisterRequest) => Promise<RegisterResponse>;
  onResendVerification?: (data: ResendVerificationRequest) => Promise<void>;
}

export function RegisterForm({
  onRegister,
  onResendVerification,
  onModeChange,
  isLoading,
  error,
}: RegisterFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [registrationResult, setRegistrationResult] = useState<RegisterResponse | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!onRegister) return;

    try {
      const result = await onRegister({ email, password, name: name || undefined });
      setRegistrationResult(result);
    } catch {
      // Error is handled by parent component
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!onResendVerification || !registrationResult?.email || resendCooldown > 0) return;

    setResendLoading(true);
    setResendMessage(null);
    try {
      await onResendVerification({ email: registrationResult.email });
      setResendMessage('Verification email resent! Check your inbox.');
      setResendCooldown(60);
      // Start countdown
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setResendMessage('Failed to resend. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  // Show success message after registration
  if (registrationResult) {
    return (
      <div className="auth-form">
        <div className="auth-form-content">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Check your email</h2>
          </div>

          <div className="status-icon bg-success-muted mx-auto">
            <svg
              className="icon-lg text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <Text tone="muted" className="text-center">
            {registrationResult.message}
          </Text>

          <Text tone="muted" className="text-xs text-center">
            Sent to: <strong>{registrationResult.email}</strong>
          </Text>

          {resendMessage && (
            <Text
              tone={resendMessage.includes('Failed') ? 'danger' : 'success'}
              className="text-sm text-center"
            >
              {resendMessage}
            </Text>
          )}

          {onResendVerification && (
            <div className="text-center">
              <Button
                variant="text"
                onClick={() => {
                  void handleResend();
                }}
                disabled={resendLoading || resendCooldown > 0}
              >
                {resendLoading
                  ? 'Resending...'
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown.toString()}s`
                    : "Didn't receive it? Resend email"}
              </Button>
            </div>
          )}

          <div className="auth-form-footer">
            Already verified?{' '}
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

  return (
    <div className="auth-form">
      <div className="auth-form-content">
        <div className="auth-form-header">
          <h2 className="auth-form-title">Create account</h2>
          <p className="auth-form-subtitle">Sign up for a new account</p>
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
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
            disabled={isLoading}
          />

          <Input.Field
            label="Name (optional)"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            disabled={isLoading}
          />

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
            disabled={isLoading}
          />

          {error && <div className="auth-form-error">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <div className="auth-form-footer">
          Already have an account?{' '}
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

interface ForgotPasswordFormProps extends Omit<
  AuthFormProps,
  'mode' | 'onLogin' | 'onRegister' | 'onResetPassword'
> {
  onForgotPassword?: (data: ForgotPasswordRequest) => Promise<void>;
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
      // Error is handled by parent component
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
            onChange={(e) => {
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

interface ResetPasswordFormProps extends Omit<
  AuthFormProps,
  'mode' | 'onLogin' | 'onRegister' | 'onForgotPassword'
> {
  onResetPassword?: (data: ResetPasswordRequest) => Promise<void>;
  initialData?: { token?: string };
}

export function ResetPasswordForm({
  onResetPassword,
  onModeChange,
  isLoading,
  error,
  onSuccess,
  initialData,
}: ResetPasswordFormProps): ReactElement {
  const [password, setPassword] = useState('');
  const token = initialData?.token as string;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!onResetPassword || !token) return;

    try {
      await onResetPassword({ token, password });
      onSuccess?.();
    } catch {
      // Error is handled by parent component
    }
  };

  if (!token) {
    return (
      <div className="auth-form">
        <div className="auth-form-content text-center">
          <h2 className="auth-form-title text-danger">Invalid reset link</h2>
          <p className="auth-form-subtitle">This password reset link is invalid or has expired.</p>
          {onModeChange ? (
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
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
            disabled={isLoading}
          />

          {error && <div className="auth-form-error">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update password'}
          </Button>
        </form>

        <div className="auth-form-footer">
          {onModeChange ? (
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
}
