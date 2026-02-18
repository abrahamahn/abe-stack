// main/apps/web/src/features/auth/components/MagicLinkForm.tsx

import { Link } from '@bslt/react/router';
import { Alert, AuthFormLayout, Button, Input, Text } from '@bslt/ui';
import { useState } from 'react';

import type { AuthMode } from '@bslt/react/hooks';
import type { MagicLinkRequest } from '@bslt/shared';
import type { ChangeEvent, ReactElement } from 'react';

export interface MagicLinkFormProps {
  onRequestMagicLink?: (data: MagicLinkRequest) => Promise<void>;
  onModeChange?: (mode: AuthMode) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const MagicLinkForm = ({
  onRequestMagicLink,
  onModeChange,
  isLoading,
  error,
}: MagicLinkFormProps): ReactElement => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (onRequestMagicLink === undefined) return;

    try {
      await onRequestMagicLink({ email });
      setSent(true);
    } catch {
      // Error handled by parent component via error prop
    }
  };

  return (
    <AuthFormLayout>
      <AuthFormLayout.Content>
        <AuthFormLayout.Header>
          <AuthFormLayout.Title>Sign in with email</AuthFormLayout.Title>
          <AuthFormLayout.Subtitle>
            We'll send you a magic link to sign in without a password
          </AuthFormLayout.Subtitle>
        </AuthFormLayout.Header>

        {sent ? (
          <div className="flex flex-col gap-4">
            <Alert tone="success" title="Check your email">
              We sent a login link to <strong>{email}</strong>. Click the link in the email to sign
              in.
            </Alert>
            <Text size="sm" tone="muted" className="text-center">
              Didn't receive the email? Check your spam folder or try again.
            </Text>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setSent(false);
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
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
              placeholder="Enter your email address"
            />

            {error !== undefined && error !== null && error.length > 0 && (
              <AuthFormLayout.Error>{error}</AuthFormLayout.Error>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading === true ? 'Sending...' : 'Send login link'}
            </Button>
          </form>
        )}

        <AuthFormLayout.Footer>
          Prefer to use a password?{' '}
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
