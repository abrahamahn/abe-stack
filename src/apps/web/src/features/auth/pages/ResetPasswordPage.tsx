// src/apps/web/src/features/auth/pages/ResetPasswordPage.tsx
import { toastStore } from '@abe-stack/react';
import { AuthLayout, useAuthModeNavigation, useFormState, useSearchParams } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';
import { useAuth } from '@auth/hooks/useAuth';

import type { AuthFormProps } from '@auth/components/AuthForms';
import type { ReactElement } from 'react';

export const ResetPasswordPage = (): ReactElement => {
  const searchParamsResult = useSearchParams();
  const searchParams: URLSearchParams = searchParamsResult[0];
  const { resetPassword } = useAuth();
  const { isLoading, error, wrapHandler } = useFormState();
  const { navigateToMode, navigateToLogin } = useAuthModeNavigation();

  const token = searchParams.get('token');

  const handleResetPassword = wrapHandler(
    async (data: { token: string; password: string }): Promise<void> => {
      await resetPassword(data);
      toastStore.getState().show({
        title: 'Password reset successfully',
        description: 'You can now sign in with your new password.',
      });
      navigateToLogin();
    },
  );

  const formProps: AuthFormProps = {
    mode: 'reset-password',
    onResetPassword: handleResetPassword,
    onModeChange: navigateToMode,
    ...(token !== null && { initialData: { token } }),
    isLoading,
    error,
  };

  return (
    <AuthLayout>
      <AuthForm {...formProps} />
    </AuthLayout>
  );
};
