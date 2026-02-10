// src/apps/web/src/features/auth/components/LoginForm.tsx
import { AuthFormLayout, Button, Input, Link, PasswordInput, Spinner, Text } from '@abe-stack/ui';
import { TotpChallengeError } from '@auth/services/AuthService';
import { useCallback, useState } from 'react';

import { OAuthButtons } from './OAuthButtons';
import { TurnstileWidget } from './TurnstileWidget';

import type { ForgotPasswordRequest, LoginRequest } from '@abe-stack/shared';
import type { AuthMode } from '@abe-stack/ui';
import type { ChangeEvent, ReactElement } from 'react';

export interface LoginFormProps {
  onLogin?: (data: LoginRequest) => Promise<void>;
  onForgotPassword?: (data: ForgotPasswordRequest) => Promise<void>;
  onTotpVerify?: (challengeToken: string, code: string) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const LoginForm = ({
  onLogin,
  onForgotPassword,
  onTotpVerify,
  onModeChange,
  isLoading,
  error,
  onSuccess,
}: LoginFormProps): ReactElement => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const [totpChallenge, setTotpChallenge] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (onLogin === undefined) return;

    try {
      await onLogin({
        identifier,
        password,
        ...(captchaToken !== undefined ? { captchaToken } : {}),
      });
      onSuccess?.();
    } catch (err) {
      if (err instanceof TotpChallengeError) {
        setTotpChallenge(err.challengeToken);
        setTotpError(null);
        return;
      }
      // Other errors handled by parent component via error prop
    }
  };

  const handleTotpSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (totpChallenge === null || onTotpVerify === undefined) return;

    setTotpLoading(true);
    setTotpError(null);

    try {
      await onTotpVerify(totpChallenge, totpCode);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid TOTP code';
      setTotpError(message);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleBackToLogin = (): void => {
    setTotpChallenge(null);
    setTotpCode('');
    setTotpError(null);
  };

  const handleForgotPassword = (): void => {
    const emailValue = identifier.includes('@') ? identifier : '';
    if (emailValue.length > 0) {
      void onForgotPassword?.({ email: emailValue });
    }
    if (onModeChange !== undefined) {
      onModeChange('forgot-password');
    }
  };

  // TOTP verification step
  if (totpChallenge !== null) {
    return (
      <AuthFormLayout>
        <AuthFormLayout.Content>
          <AuthFormLayout.Header>
            <AuthFormLayout.Title>Two-Factor Authentication</AuthFormLayout.Title>
            <AuthFormLayout.Subtitle>
              Enter the 6-digit code from your authenticator app, or a backup code
            </AuthFormLayout.Subtitle>
          </AuthFormLayout.Header>

          <form
            onSubmit={(e) => {
              void handleTotpSubmit(e);
            }}
            className="auth-form-fields"
          >
            <Input.Field
              label="Authentication Code"
              type="text"
              value={totpCode}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setTotpCode(e.target.value);
              }}
              required
              disabled={totpLoading}
              placeholder="000000"
              maxLength={8}
              autoComplete="one-time-code"
              autoFocus
            />

            <Text size="xs" tone="muted">
              Lost your authenticator? Enter one of your backup codes instead.
            </Text>

            {totpError !== null && <AuthFormLayout.Error>{totpError}</AuthFormLayout.Error>}

            <Button type="submit" className="w-full" disabled={totpLoading || totpCode.length < 6}>
              {totpLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>

          <div className="text-center">
            <Button variant="text" onClick={handleBackToLogin} disabled={totpLoading}>
              Back to login
            </Button>
          </div>
        </AuthFormLayout.Content>
      </AuthFormLayout>
    );
  }

  // Standard login form
  return (
    <AuthFormLayout>
      <AuthFormLayout.Content>
        <AuthFormLayout.Header>
          <AuthFormLayout.Title>Welcome back</AuthFormLayout.Title>
          <AuthFormLayout.Subtitle>Sign in to your account</AuthFormLayout.Subtitle>
        </AuthFormLayout.Header>

        <OAuthButtons mode="login" {...(isLoading !== undefined && { disabled: isLoading })} />

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="auth-form-fields"
        >
          <Input.Field
            label="Email or Username"
            type="text"
            value={identifier}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setIdentifier(e.target.value);
            }}
            required
            disabled={isLoading}
            placeholder="Enter your email or username"
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

          {error !== undefined && error !== null && (
            <AuthFormLayout.Error>{error}</AuthFormLayout.Error>
          )}

          <TurnstileWidget onToken={handleCaptchaToken} />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading === true ? (
              <Text as="span" className="flex items-center gap-2">
                <Spinner size="14px" /> Signing in...
              </Text>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button variant="text" onClick={handleForgotPassword} disabled={isLoading}>
            Forgot your password?
          </Button>
        </div>

        <AuthFormLayout.Footer>
          Don't have an account?{' '}
          {onModeChange !== undefined ? (
            <Button
              variant="text"
              onClick={() => {
                onModeChange('register');
              }}
              size="inline"
            >
              Sign up
            </Button>
          ) : (
            <Link to="/auth?mode=register">Sign up</Link>
          )}
        </AuthFormLayout.Footer>
      </AuthFormLayout.Content>
    </AuthFormLayout>
  );
};
