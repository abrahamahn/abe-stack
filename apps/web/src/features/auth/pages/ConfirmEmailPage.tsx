// apps/web/src/features/auth/pages/ConfirmEmailPage.tsx
import { AuthLayout, Button, Spinner, Text, useNavigate, useSearchParams } from '@abe-stack/ui';
import { useAuth } from '@auth/hooks';
import { getPostLoginRedirect } from '@auth/utils';
import { useEffect, useState } from 'react';

import type { ReactElement } from 'react';

export function ConfirmEmailPage(): ReactElement {
  const searchParamsResult = useSearchParams();
  const searchParams: URLSearchParams = searchParamsResult[0];
  const navigate = useNavigate();
  const { verifyEmail, user } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

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
                <h2 className="auth-form-title">Verifying your email...</h2>
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
                <h2 className="auth-form-title text-success">Email verified!</h2>
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
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
                <h2 className="auth-form-title text-danger">Verification failed</h2>
              </div>
              <div className="status-icon bg-danger-muted mx-auto">
                <svg
                  className="icon-lg text-danger"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
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
}
