// main/apps/web/src/features/auth/pages/LoginPage.tsx

import { useAuthModeNavigation, useFormState } from '@abe-stack/react/hooks';
import { useNavigate, useSearchParams } from '@abe-stack/react/router';
import { AuthLayout } from '@abe-stack/ui';
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
  const { login, forgotPassword, verifyTotpLogin, sendSmsCode, verifySmsLogin, isAuthenticated } =
    authResult;
  const user = authResult.user as UserLocal | null;
  const { isLoading, error, wrapHandler } = useFormState();
  const { navigateToMode } = useAuthModeNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getPostLoginRedirect(user, returnTo));
    }
  }, [isAuthenticated, navigate, user, returnTo]);

  const formProps: AuthFormProps = {
    mode: 'login',
    onLogin: wrapHandler(login),
    onTotpVerify: verifyTotpLogin,
    onSmsVerify: verifySmsLogin,
    onSmsSendCode: sendSmsCode,
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
