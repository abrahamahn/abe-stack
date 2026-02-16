// main/apps/web/src/features/auth/components/RegisterForm.tsx

import { useResendCooldown } from '@abe-stack/react/hooks';
import { Link } from '@abe-stack/react/router';
import { AuthFormLayout, Button, Input, PasswordInput, Spinner, Text } from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import { OAuthButtons } from './OAuthButtons';
import { TurnstileWidget } from './TurnstileWidget';

import type { AuthMode } from '@abe-stack/react/hooks';
import type {
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
} from '@abe-stack/shared';
import type { ChangeEvent, ReactElement } from 'react';

// ============================================================================
// Local Types (for ESLint type resolution)
// ============================================================================

type RegisterRequestLocal = RegisterRequest;
type RegisterResponseLocal = RegisterResponse;
type ResendVerificationRequestLocal = ResendVerificationRequest;

// ============================================================================
// Types
// ============================================================================

export interface RegisterFormProps {
  onRegister?: (data: RegisterRequestLocal) => Promise<RegisterResponseLocal>;
  onResendVerification?: (data: ResendVerificationRequestLocal) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const RegisterForm = ({
  onRegister,
  onResendVerification,
  onModeChange,
  isLoading,
  error,
}: RegisterFormProps): ReactElement => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [tosAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const [registrationResult, setRegistrationResult] = useState<RegisterResponseLocal | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const { cooldown, isOnCooldown, startCooldown } = useResendCooldown();

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (onRegister === undefined) return;

    try {
      const result: RegisterResponseLocal = await onRegister({
        email,
        username,
        firstName,
        lastName,
        password,
        tosAccepted,
        ...(captchaToken !== undefined ? { captchaToken } : {}),
      });
      setRegistrationResult(result);
    } catch {
      // Error handled by parent component via onRegister callback
    }
  };

  const handleResend = async (): Promise<void> => {
    if (
      onResendVerification === undefined ||
      registrationResult === null ||
      registrationResult.email.length === 0 ||
      isOnCooldown
    )
      return;

    setResendLoading(true);
    setResendMessage(null);
    try {
      const resultEmail: string = registrationResult.email;
      await onResendVerification({ email: resultEmail });
      setResendMessage('Verification email resent! Check your inbox.');
      startCooldown();
    } catch {
      setResendMessage('Failed to resend. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  // Show success message after registration
  if (registrationResult !== null) {
    return (
      <AuthFormLayout>
        <AuthFormLayout.Content>
          <AuthFormLayout.Header>
            <AuthFormLayout.Title>Check your email</AuthFormLayout.Title>
          </AuthFormLayout.Header>

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
            {registrationResult.message.length > 0
              ? registrationResult.message
              : 'Please check your email to verify your account.'}
          </Text>

          <Text tone="muted" className="text-xs text-center">
            Sent to:{' '}
            <Text as="strong">
              {registrationResult.email.length > 0 ? registrationResult.email : email}
            </Text>
          </Text>

          {resendMessage !== null && resendMessage.length > 0 && (
            <Text
              tone={resendMessage.includes('Failed') ? 'danger' : 'success'}
              className="text-sm text-center"
            >
              {resendMessage}
            </Text>
          )}

          {onResendVerification !== undefined && (
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

          <AuthFormLayout.Footer>
            Already verified?{' '}
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
  }

  return (
    <AuthFormLayout>
      <AuthFormLayout.Content>
        <AuthFormLayout.Header>
          <AuthFormLayout.Title>Create account</AuthFormLayout.Title>
          <AuthFormLayout.Subtitle>Sign up for a new account</AuthFormLayout.Subtitle>
        </AuthFormLayout.Header>

        <OAuthButtons mode="register" {...(isLoading === true && { disabled: true })} />

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
            label="Username"
            type="text"
            value={username}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setUsername(e.target.value);
            }}
            required
            disabled={isLoading}
            placeholder="Choose a unique username"
          />

          <Input.Field
            label="First Name"
            type="text"
            value={firstName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setFirstName(e.target.value);
            }}
            required
            disabled={isLoading}
          />

          <Input.Field
            label="Last Name"
            type="text"
            value={lastName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setLastName(e.target.value);
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

          {error !== undefined && error !== null && (
            <AuthFormLayout.Error>{error}</AuthFormLayout.Error>
          )}

          <TurnstileWidget onToken={handleCaptchaToken} />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading === true ? (
              <Text as="span" className="flex items-center gap-2">
                <Spinner size="14px" /> Creating account...
              </Text>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <AuthFormLayout.Footer>
          Already have an account?{' '}
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
