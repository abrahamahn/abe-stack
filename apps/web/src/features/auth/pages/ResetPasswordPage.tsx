// apps/web/src/features/auth/pages/ResetPasswordPage.tsx
import { toastStore } from '@abe-stack/core';
import { AuthLayout, useFormState } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';
import { useAuth, useAuthModeNavigation } from '@auth/hooks';
import { useSearchParams } from 'react-router-dom';

import type { AuthFormProps } from '@auth/components/AuthForms';
import type { ReactElement } from 'react';

export function ResetPasswordPage(): ReactElement {
  const [searchParams] = useSearchParams();
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
    initialData: { token: token ?? undefined },
    isLoading,
    error,
  };

  return (
    <AuthLayout>
      <AuthForm {...formProps} />
    </AuthLayout>
  );
}
