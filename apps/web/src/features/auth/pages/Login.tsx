// apps/web/src/features/auth/pages/Login.tsx
import { AuthLayout, useFormState } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';
import { useAuth, useAuthModeNavigation } from '@auth/hooks';

import type { AuthFormProps } from '@auth/components/AuthForms';
import type { JSX } from 'react';

export function LoginPage(): JSX.Element {
  const { login, forgotPassword } = useAuth();
  const { isLoading, error, wrapHandler } = useFormState();
  const { navigateToMode } = useAuthModeNavigation();

  const formProps: AuthFormProps = {
    mode: 'login',
    onLogin: wrapHandler(login),
    onForgotPassword: wrapHandler(forgotPassword),
    onModeChange: navigateToMode,
    isLoading,
    error,
  };

  return (
    <AuthLayout>
      <AuthForm {...formProps} />
    </AuthLayout>
  );
}
