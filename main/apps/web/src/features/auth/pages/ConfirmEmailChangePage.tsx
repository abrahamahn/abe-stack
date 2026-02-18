// main/apps/web/src/features/auth/pages/ConfirmEmailChangePage.tsx
/**
 * ConfirmEmailChangePage - Handles email change confirmation via token from URL.
 *
 * When a user requests an email change, a confirmation link is sent to the new
 * email address. Clicking that link navigates here with a `?token=` param.
 * This page calls the API to confirm the change and displays the result.
 *
 * @module ConfirmEmailChangePage
 */

import { getApiClient } from '@bslt/api';
import { useNavigate, useSearchParams } from '@bslt/react/router';
import { Alert, AuthLayout, Button, Heading, Spinner, Text } from '@bslt/ui';
import { useEffect, useState } from 'react';

import type { ReactElement } from 'react';

// ============================================================================
// Constants
// ============================================================================

/** Default API base URL when env var is not set */
const DEFAULT_API_URL = 'http://localhost:3000';

// ============================================================================
// Component
// ============================================================================

/**
 * Page that confirms an email change using a token from the URL query string.
 *
 * Flow:
 * 1. Reads `?token=` from URL
 * 2. Calls `confirmEmailChange({ token })` via API client
 * 3. Shows loading spinner, then success (with new email) or error
 *
 * @returns The confirmation page element
 */
export const ConfirmEmailChangePage = (): ReactElement => {
  const searchParamsResult = useSearchParams();
  const searchParams: URLSearchParams = searchParamsResult[0];
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token === null) {
      setStatus('error');
      setMessage('Invalid email change link. No token was provided.');
      return;
    }

    const confirm = async (): Promise<void> => {
      try {
        const api = getApiClient({
          baseUrl:
            typeof import.meta.env['VITE_API_URL'] === 'string'
              ? import.meta.env['VITE_API_URL']
              : DEFAULT_API_URL,
        });
        const result = await api.confirmEmailChange({ token });
        setStatus('success');
        setMessage(result.message);
        setNewEmail(result.email);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Email change confirmation failed');
      }
    };

    void confirm();
  }, [token]);

  const handleNavigateToSettings = (): void => {
    navigate('/settings');
  };

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
                  Confirming email change...
                </Heading>
              </div>
              <div className="flex-center">
                <Spinner size="lg" />
              </div>
              <Text tone="muted" className="text-center">
                Please wait while we confirm your new email address.
              </Text>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="auth-form-header">
                <Heading as="h2" size="md" className="auth-form-title text-success">
                  Email updated!
                </Heading>
              </div>
              <Alert tone="success" title="Email updated">
                Your new email address has been confirmed.
              </Alert>
              <Text tone="muted" className="text-center">
                {message}
              </Text>
              {newEmail !== '' && (
                <Text tone="muted" className="text-center text-sm">
                  Your email is now <strong>{newEmail}</strong>
                </Text>
              )}
              <Button onClick={handleNavigateToSettings} className="w-full">
                Go to Settings
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="auth-form-header">
                <Heading as="h2" size="md" className="auth-form-title text-danger">
                  Confirmation failed
                </Heading>
              </div>
              <Alert tone="danger" title="Confirmation failed">
                We could not confirm this email change request.
              </Alert>
              <Text tone="muted" className="text-center">
                {message}
              </Text>
              <div className="flex gap-2">
                <Button onClick={handleNavigateToSettings} className="flex-1">
                  Go to Settings
                </Button>
                <Button onClick={handleNavigateToLogin} variant="secondary" className="flex-1">
                  Go to sign in
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  );
};
