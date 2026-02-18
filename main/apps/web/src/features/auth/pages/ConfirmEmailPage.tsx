// main/apps/web/src/features/auth/pages/ConfirmEmailPage.tsx

import { useAuth, useVerifyEmail } from '@auth/hooks';
import { getPostLoginRedirect } from '@auth/utils';
import { useNavigate, useSearchParams } from '@bslt/react/router';
import { Alert, AuthLayout, Button, Heading, Spinner, Text } from '@bslt/ui';
import { useEffect, useRef, useState } from 'react';

import type { ReactElement } from 'react';

// ============================================================================
// Local Types (for ESLint type resolution)
// ============================================================================

interface UserLocal {
  role?: string;
}

export const ConfirmEmailPage = (): ReactElement => {
  const searchParamsResult = useSearchParams();
  const searchParams: URLSearchParams = searchParamsResult[0];
  const navigate = useNavigate();
  const authResult = useAuth();
  const { mutate: verifyEmail } = useVerifyEmail();
  const user = authResult.user as UserLocal | null;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (token === null) {
      queueMicrotask(() => {
        setStatus('error');
        setMessage('Invalid verification link');
      });
      return;
    }

    if (verifyStarted.current) return;
    verifyStarted.current = true;

    const verify = async (): Promise<void> => {
      try {
        await verifyEmail({ token });
        setStatus('success');
        setMessage('Your email has been verified and you are now signed in.');
        // Auto-login happens in verifyEmail, redirect to dashboard
        const redirectPath = getPostLoginRedirect(user);
        setTimeout(() => {
          navigate(redirectPath);
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed');
      }
    };

    void verify();
  }, [token, verifyEmail, navigate, user]);

  const handleNavigateToLogin = (): void => {
    navigate('/login');
  };

  return (
    <AuthLayout>
      <div className="auth-form">
        <div className="auth-form-content">
          {status === 'loading' && (
            <>
              <div className="auth-form-header">
                <Heading as="h2" size="md" className="auth-form-title">
                  Verifying your email...
                </Heading>
              </div>
              <div className="flex-center">
                <Spinner size="lg" />
              </div>
              <Text tone="muted" className="text-center">
                Please wait while we verify your email address.
              </Text>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="auth-form-header">
                <Heading as="h2" size="md" className="auth-form-title text-success">
                  Email verified!
                </Heading>
              </div>
              <Alert tone="success" title="Verified">
                Your email verification was successful.
              </Alert>
              <Text tone="muted" className="text-center">
                {message}
              </Text>
              <Text tone="muted" className="text-center text-sm">
                Redirecting to your account...
              </Text>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="auth-form-header">
                <Heading as="h2" size="md" className="auth-form-title text-danger">
                  Verification failed
                </Heading>
              </div>
              <Alert tone="danger" title="Verification failed">
                We could not verify this token.
              </Alert>
              <Text tone="muted" className="text-center">
                {message}
              </Text>
              <Button onClick={handleNavigateToLogin} className="w-full">
                Go to sign in
              </Button>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  );
};
