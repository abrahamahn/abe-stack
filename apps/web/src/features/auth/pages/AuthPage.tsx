// apps/web/src/features/auth/pages/AuthPage.tsx
import { AuthLayout } from '@abe-stack/ui';
import { AuthForm, type AuthMode } from '@auth/components/AuthForms';
import { useAuth } from '@auth/hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { AuthFormProps } from '@auth/components/AuthForms';
import type { ReactElement } from 'react';

const VALID_MODES = ['login', 'register', 'forgot-password', 'reset-password'] as const;

export function AuthPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register, forgotPassword, resetPassword, resendVerification, isAuthenticated } =
    useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      void navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam && VALID_MODES.includes(modeParam as AuthMode)) {
      setMode(modeParam as AuthMode);
    }
  }, [searchParams]);

  const handleModeChange = (newMode: AuthMode): void => {
    setMode(newMode);
    setError(null);
    void navigate(`/auth?mode=${newMode}`, { replace: true });
  };

  const createFormHandler =
    <T extends Record<string, unknown>, R>(handler: (data: T) => Promise<R>) =>
    async (data: T): Promise<R> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await handler(data);
        // Success is handled by individual handlers
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err; // Re-throw so caller can handle if needed
      } finally {
        setIsLoading(false);
      }
    };

  // Get token from URL for reset password flow
  const token = searchParams.get('token');

  const formProps: AuthFormProps = {
    mode,
    onLogin: createFormHandler(login),
    onRegister: createFormHandler(register),
    onForgotPassword: createFormHandler(async (data: { email: string }) => {
      await forgotPassword(data);
      // Show success message instead of navigating
      alert('Password reset link sent to your email');
      handleModeChange('login');
    }),
    onResetPassword: createFormHandler(async (data: { token: string; password: string }) => {
      await resetPassword(data);
      alert('Password reset successfully');
      handleModeChange('login');
    }),
    onResendVerification: resendVerification,
    onModeChange: handleModeChange,
    isLoading,
    error,
    initialData: token ? { token } : undefined,
  };

  return (
    <AuthLayout>
      <AuthForm {...formProps} />
    </AuthLayout>
  );
}
