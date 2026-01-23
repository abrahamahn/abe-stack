// apps/web/src/features/auth/components/RegisterForm.tsx
import { Button, Input, Link, PasswordInput, Text } from '@abe-stack/ui';
import { useResendCooldown } from '@auth/hooks';
import { useState } from 'react';

import { OAuthButtons } from './OAuthButtons';

import type { AuthMode } from './AuthForms';
import type { RegisterRequest, RegisterResponse, ResendVerificationRequest } from '@abe-stack/core';
import type { ChangeEvent, ReactElement } from 'react';

export interface RegisterFormProps {
  onRegister?: (data: RegisterRequest) => Promise<RegisterResponse>;
  onResendVerification?: (data: ResendVerificationRequest) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  isLoading?: boolean;
  error?: string | null;
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
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const { cooldown, isOnCooldown, startCooldown } = useResendCooldown();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!onRegister) return;

    try {
      const result = await onRegister({ email, password, name: name || undefined });
      setRegistrationResult(result);
    } catch {
      // Error handled by parent component via onRegister callback
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!onResendVerification || !registrationResult?.email || isOnCooldown) return;

    setResendLoading(true);
    setResendMessage(null);
    try {
      await onResendVerification({ email: registrationResult.email });
      setResendMessage('Verification email resent! Check your inbox.');
      startCooldown();
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
                disabled={resendLoading || isOnCooldown}
              >
                {resendLoading
                  ? 'Resending...'
                  : isOnCooldown
                    ? `Resend in ${cooldown.toString()}s`
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

        <OAuthButtons mode="register" disabled={isLoading} />

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

          <Input.Field
            label="Name (optional)"
            type="text"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setName(e.target.value);
            }}
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
