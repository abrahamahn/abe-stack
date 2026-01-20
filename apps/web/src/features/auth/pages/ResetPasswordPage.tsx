// apps/web/src/features/auth/pages/ResetPasswordPage.tsx
import { AuthLayout } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';
import { useAuth } from '@auth/hooks';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { AuthFormProps, AuthMode } from '@auth/components/AuthForms';
import type { ReactElement } from 'react';

export function ResetPasswordPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  const handleModeChange = (mode: AuthMode): void => {
    if (mode === 'login') {
      void navigate('/login');
    } else if (mode === 'forgot-password') {
      void navigate('/auth?mode=forgot-password');
    }
  };

  const handleResetPassword = async (data: { token: string; password: string }): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(data);
      alert('Password reset successfully! You can now sign in with your new password.');
      void navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const formProps: AuthFormProps = {
    mode: 'reset-password',
    onResetPassword: handleResetPassword,
    onModeChange: handleModeChange,
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
