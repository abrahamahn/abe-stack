// apps/web/src/features/auth/components/AuthForms.tsx
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';

import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
} from '@abe-stack/core';
import type { AuthMode } from '@abe-stack/ui';
import type { ReactElement } from 'react';

// Re-export AuthMode for backwards compatibility
export type { AuthMode } from '@abe-stack/ui';

export interface AuthFormProps {
  mode: AuthMode;
  onLogin?: (data: LoginRequest) => Promise<void>;
  onRegister?: (data: RegisterRequest) => Promise<RegisterResponse>;
  onForgotPassword?: (data: ForgotPasswordRequest) => Promise<void>;
  onResetPassword?: (data: ResetPasswordRequest) => Promise<void>;
  onResendVerification?: (data: ResendVerificationRequest) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  initialData?: Record<string, unknown>;
  isLoading?: boolean;
  error?: string | null;
}

export function AuthForm(props: AuthFormProps): ReactElement {
  const {
    mode,
    onLogin,
    onRegister,
    onForgotPassword,
    onResetPassword,
    onResendVerification,
    onSuccess,
    onModeChange,
    initialData,
    isLoading,
    error,
  } = props;

  switch (mode) {
    case 'login':
      return (
        <LoginForm
          onLogin={onLogin}
          onForgotPassword={onForgotPassword}
          onSuccess={onSuccess}
          onModeChange={onModeChange}
          isLoading={isLoading}
          error={error}
        />
      );
    case 'register':
      return (
        <RegisterForm
          onRegister={onRegister}
          onResendVerification={onResendVerification}
          onSuccess={onSuccess}
          onModeChange={onModeChange}
          isLoading={isLoading}
          error={error}
        />
      );
    case 'forgot-password':
      return (
        <ForgotPasswordForm
          onForgotPassword={onForgotPassword}
          onSuccess={onSuccess}
          onModeChange={onModeChange}
          isLoading={isLoading}
          error={error}
        />
      );
    case 'reset-password':
      return (
        <ResetPasswordForm
          onResetPassword={onResetPassword}
          onSuccess={onSuccess}
          onModeChange={onModeChange}
          initialData={initialData as { token?: string }}
          isLoading={isLoading}
          error={error}
        />
      );
    default:
      return (
        <LoginForm
          onLogin={onLogin}
          onForgotPassword={onForgotPassword}
          onSuccess={onSuccess}
          onModeChange={onModeChange}
          isLoading={isLoading}
          error={error}
        />
      );
  }
}
