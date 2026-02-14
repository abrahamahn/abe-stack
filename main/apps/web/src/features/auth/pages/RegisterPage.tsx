// main/apps/web/src/features/auth/pages/RegisterPage.tsx
import { useAuthModeNavigation, useFormState } from '@abe-stack/react/hooks';
import { AuthLayout } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';
import { useAuth } from '@auth/hooks';

import type { AuthFormProps } from '@auth/components/AuthForms';
import type { JSX } from 'react';

export const RegisterPage = (): JSX.Element => {
  const { register, resendVerification } = useAuth();
  const { isLoading, error, wrapHandler } = useFormState();
  const { navigateToMode } = useAuthModeNavigation();

  const formProps: AuthFormProps = {
    mode: 'register',
    onRegister: wrapHandler(register),
    onResendVerification: resendVerification,
    onModeChange: navigateToMode,
    isLoading,
    error,
  };

  return (
    <AuthLayout>
      <AuthForm {...formProps} />
    </AuthLayout>
  );
};
