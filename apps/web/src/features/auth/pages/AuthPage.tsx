// apps/web/src/features/auth/pages/AuthPage.tsx
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
  const { login, register, forgotPassword, resetPassword, isAuthenticated } = useAuth();

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
    <T extends Record<string, unknown>>(handler?: (data: T) => Promise<void>) =>
    async (data: T): Promise<void> => {
      if (!handler) return;

      setIsLoading(true);
      setError(null);

      try {
        await handler(data);
        // Success is handled by individual handlers
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

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
    onModeChange: handleModeChange,
    isLoading,
    error,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AuthForm {...formProps} />
    </div>
  );
}
