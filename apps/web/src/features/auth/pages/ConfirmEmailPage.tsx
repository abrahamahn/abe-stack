// apps/web/src/features/auth/pages/ConfirmEmailPage.tsx
import { Button, Spinner } from '@abe-stack/ui';
import { useAuth } from '@auth/hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ReactElement } from 'react';

export function ConfirmEmailPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

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
        setTimeout(() => {
          void navigate('/dashboard');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed');
      }
    };

    void verify();
  }, [token, verifyEmail, navigate]);

  const handleNavigateToLogin = (): void => {
    void navigate('/auth?mode=login');
  };

  return (
    <div className="min-h-screen flex-center bg-surface p-4">
      <div className="max-w-md w-full space-y-6">
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <div className="mx-auto">
              <Spinner size="lg" />
            </div>
            <h2 className="text-xl font-bold">Verifying your email...</h2>
            <p className="text-muted">Please wait while we verify your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
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
            <h2 className="text-xl font-bold text-success">Email verified!</h2>
            <p className="text-muted">{message}</p>
            <p className="text-sm text-muted">Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
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
            <h2 className="text-xl font-bold text-danger">Verification failed</h2>
            <p className="text-muted">{message}</p>
            <Button onClick={handleNavigateToLogin}>Go to sign in</Button>
          </div>
        )}
      </div>
    </div>
  );
}
