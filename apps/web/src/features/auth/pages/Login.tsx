// apps/web/src/features/auth/pages/Login.tsx
import { AuthLayout, useAuthModeNavigation, useFormState, useNavigate } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';
import { useAuth } from '@auth/hooks';
import { getPostLoginRedirect } from '@auth/utils';
import { useEffect } from 'react';

import type { AuthFormProps } from '@auth/components/AuthForms';
import type { JSX } from 'react';

// ============================================================================
// Local Types (for ESLint type resolution)
// ============================================================================

interface UserLocal {
  role?: string;
}

export const LoginPage = (): JSX.Element => {
  const authResult = useAuth();
  const { login, forgotPassword, isAuthenticated } = authResult;
  const user = authResult.user as UserLocal | null;
  const { isLoading, error, wrapHandler } = useFormState();
  const { navigateToMode } = useAuthModeNavigation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getPostLoginRedirect(user));
    }
  }, [isAuthenticated, navigate, user]);

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
};
