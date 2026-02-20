// main/apps/web/src/features/auth/pages/MagicLinkVerifyPage.tsx

import { useClientEnvironment } from '@app/ClientEnvironment';
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

export const MagicLinkVerifyPage = (): ReactElement => {
  const searchParamsResult = useSearchParams();
  const searchParams: URLSearchParams = searchParamsResult[0];
  const navigate = useNavigate();
  const { auth } = useClientEnvironment();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (token === null) {
      queueMicrotask(() => {
        setStatus('error');
        setMessage('Invalid or missing magic link token');
      });
      return;
    }

    if (verifyStarted.current) return;
    verifyStarted.current = true;

    const verify = async (): Promise<void> => {
      try {
        await auth.verifyMagicLink({ token });
        const state = auth.getState();
        const user = state.user as UserLocal | null;
        setStatus('success');
        setMessage('You have been signed in successfully.');
        const redirectPath = getPostLoginRedirect(user);
        setTimeout(() => {
          navigate(redirectPath);
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Magic link verification failed');
      }
    };

    void verify();
  }, [token, auth, navigate]);

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
                  Verifying magic link...
                </Heading>
              </div>
              <div className="flex-center">
                <Spinner size="lg" />
              </div>
              <Text tone="muted" className="text-center">
                Please wait while we verify your magic link.
              </Text>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="auth-form-header">
                <Heading as="h2" size="md" className="auth-form-title text-success">
                  Signed in!
                </Heading>
              </div>
              <Alert tone="success" title="Success">
                {message}
              </Alert>
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
                The magic link is invalid or has expired.
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
