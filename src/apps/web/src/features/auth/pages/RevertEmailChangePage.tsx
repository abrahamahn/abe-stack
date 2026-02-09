// src/apps/web/src/features/auth/pages/RevertEmailChangePage.tsx
/**
 * RevertEmailChangePage - Handles email change reversion via token from URL.
 *
 * When a user clicks the "This wasn't me" link from the old email address,
 * they're sent here with a `?token=` param. This page calls the API to
 * revert the email change and lock the account.
 */

import { getApiClient } from '@abe-stack/api';
import {
  Alert,
  AuthLayout,
  Button,
  Heading,
  Spinner,
  Text,
  useNavigate,
  useSearchParams,
} from '@abe-stack/ui';
import { useEffect, useState } from 'react';

import type { ReactElement } from 'react';

const DEFAULT_API_URL = 'http://localhost:3000';

export const RevertEmailChangePage = (): ReactElement => {
  const searchParamsResult = useSearchParams();
  const searchParams: URLSearchParams = searchParamsResult[0];
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token === null) {
      setStatus('error');
      setMessage('Invalid email reversion link. No token was provided.');
      return;
    }

    const revert = async (): Promise<void> => {
      try {
        const api = getApiClient({
          baseUrl:
            typeof import.meta.env['VITE_API_URL'] === 'string'
              ? import.meta.env['VITE_API_URL']
              : DEFAULT_API_URL,
        });
        const result = await api.revertEmailChange({ token });
        setStatus('success');
        setMessage(result.message);
        setEmail(result.email);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Email change reversion failed');
      }
    };

    void revert();
  }, [token]);

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
                  Reverting email change...
                </Heading>
              </div>
              <div className="flex-center">
                <Spinner size="lg" />
              </div>
              <Text tone="muted" className="text-center">
                Please wait while we secure your account.
              </Text>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="auth-form-header">
                <Heading as="h2" size="md" className="auth-form-title text-success">
                  Email reverted
                </Heading>
              </div>
              <Alert tone="success" title="Email reverted">
                Your account has been secured.
              </Alert>
              <Text tone="muted" className="text-center">
                {message}
              </Text>
              {email !== '' && (
                <Text tone="muted" className="text-center text-sm">
                  Your email is now <strong>{email}</strong>
                </Text>
              )}
              <Text tone="muted" className="text-center text-sm">
                Your account has been locked for safety. Please log in to reset your password or
                contact support.
              </Text>
              <Button onClick={handleNavigateToLogin} className="w-full">
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="auth-form-header">
                <Heading as="h2" size="md" className="auth-form-title text-danger">
                  Reversion failed
                </Heading>
              </div>
              <Alert tone="danger" title="Reversion failed">
                We could not revert this email change.
              </Alert>
              <Text tone="muted" className="text-center">
                {message}
              </Text>
              <Button onClick={handleNavigateToLogin} className="w-full">
                Go to Login
              </Button>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  );
};
