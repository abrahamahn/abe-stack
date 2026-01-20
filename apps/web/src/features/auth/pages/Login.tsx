// apps/web/src/features/auth/pages/Login.tsx
import { AuthLayout } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';
import { useAuth } from '@auth/hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AuthFormProps, AuthMode } from '@auth/components/AuthForms';
import type { JSX } from 'react';

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { login, forgotPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModeChange = (mode: AuthMode): void => {
    if (mode === 'register') {
      void navigate('/register');
    } else if (mode === 'forgot-password') {
      void navigate('/auth?mode=forgot-password');
    }
  };

  const createFormHandler =
    <T extends Record<string, unknown>, R>(handler: (data: T) => Promise<R>) =>
    async (data: T): Promise<R> => {
      setIsLoading(true);
      setError(null);
      try {
        return await handler(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      } finally {
        setIsLoading(false);
      }
    };

  const formProps: AuthFormProps = {
    mode: 'login',
    onLogin: createFormHandler(login),
    onForgotPassword: createFormHandler(forgotPassword),
    onModeChange: handleModeChange,
    isLoading,
    error,
  };

  return (
    <AuthLayout>
      <AuthForm {...formProps} />
    </AuthLayout>
  );
}
