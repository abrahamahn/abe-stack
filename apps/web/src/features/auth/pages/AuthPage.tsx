// apps/web/src/features/auth/pages/AuthPage.tsx
import { toastStore } from '@abe-stack/core';
import { AuthLayout, useFormState } from '@abe-stack/ui';
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
  const { isLoading, error, setError, wrapHandler } = useFormState();

  const [mode, setMode] = useState<AuthMode>('login');

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

  // Get token from URL for reset password flow
  const token = searchParams.get('token');

  const formProps: AuthFormProps = {
    mode,
    onLogin: wrapHandler(login),
    onRegister: wrapHandler(register),
    onForgotPassword: wrapHandler(async (data: { email: string }) => {
      await forgotPassword(data);
      // Show success message instead of navigating
      toastStore.getState().show({ title: 'Password reset link sent to your email' });
      handleModeChange('login');
    }),
    onResetPassword: wrapHandler(async (data: { token: string; password: string }) => {
      await resetPassword(data);
      toastStore.getState().show({ title: 'Password reset successfully' });
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
