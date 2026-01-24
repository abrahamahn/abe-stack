// apps/web/src/features/auth/pages/AuthPage.tsx
import { toastStore } from '@abe-stack/stores';
import { AuthLayout, useFormState, useNavigate, useSearchParams } from '@abe-stack/ui';
import { AuthForm, type AuthMode } from '@auth/components/AuthForms';
import { useAuth } from '@auth/hooks';
import { getPostLoginRedirect } from '@auth/utils';
import { useEffect, useState } from 'react';

import type { AuthFormProps } from '@auth/components/AuthForms';
import type { ReactElement } from 'react';

const VALID_MODES = ['login', 'register', 'forgot-password', 'reset-password'] as const;

export function AuthPage(): ReactElement {
  const searchParamsResult = useSearchParams();
  const searchParams: URLSearchParams = searchParamsResult[0];
  const navigate = useNavigate();
  const {
    login,
    register,
    forgotPassword,
    resetPassword,
    resendVerification,
    isAuthenticated,
    user,
  } = useAuth();
  const { isLoading, error, setError, wrapHandler } = useFormState();

  const [mode, setMode] = useState<AuthMode>('login');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getPostLoginRedirect(user));
    }
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    const modeParam: string | null = searchParams.get('mode');
    const isValidMode = (value: string | null): value is AuthMode => {
      if (value === null) return false;
      const validModes: readonly string[] = VALID_MODES;
      return validModes.includes(value);
    };
    if (isValidMode(modeParam)) {
      setMode(modeParam);
    }
  }, [searchParams]);

  const handleModeChange = (newMode: AuthMode): void => {
    setMode(newMode);
    setError(null);
    const modeStr: string = newMode;
    navigate(`/auth?mode=${modeStr}`, { replace: true });
  };

  // Get token from URL for reset password flow
  const token: string | null = searchParams.get('token');

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
