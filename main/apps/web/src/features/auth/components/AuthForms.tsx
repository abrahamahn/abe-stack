// main/apps/web/src/features/auth/components/AuthForms.tsx
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';

import type { AuthMode } from '@bslt/react/hooks';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
} from '@bslt/shared';
import type { ReactElement } from 'react';

export interface AuthFormProps {
  mode: AuthMode;
  onLogin?: (data: LoginRequest) => Promise<void>;
  onRegister?: (data: RegisterRequest) => Promise<RegisterResponse>;
  onForgotPassword?: (data: ForgotPasswordRequest) => Promise<void>;
  onResetPassword?: (data: ResetPasswordRequest) => Promise<void>;
  onResendVerification?: (data: ResendVerificationRequest) => Promise<void>;
  onTotpVerify?: (challengeToken: string, code: string) => Promise<void>;
  onSmsVerify?: (challengeToken: string, code: string) => Promise<void>;
  onSmsSendCode?: (challengeToken: string) => Promise<void>;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  initialData?: Record<string, unknown>;
  isLoading?: boolean;
  error?: string | null;
}

export const AuthForm = (props: AuthFormProps): ReactElement => {
  const {
    mode,
    onLogin,
    onRegister,
    onForgotPassword,
    onResetPassword,
    onResendVerification,
    onTotpVerify,
    onSmsVerify,
    onSmsSendCode,
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
          {...(onLogin !== undefined && { onLogin })}
          {...(onForgotPassword !== undefined && { onForgotPassword })}
          {...(onTotpVerify !== undefined && { onTotpVerify })}
          {...(onSmsVerify !== undefined && { onSmsVerify })}
          {...(onSmsSendCode !== undefined && { onSmsSendCode })}
          {...(onSuccess !== undefined && { onSuccess })}
          {...(onModeChange !== undefined && { onModeChange })}
          {...(isLoading !== undefined && { isLoading })}
          {...(error !== undefined && { error })}
        />
      );
    case 'register':
      return (
        <RegisterForm
          {...(onRegister !== undefined && { onRegister })}
          {...(onResendVerification !== undefined && { onResendVerification })}
          {...(onSuccess !== undefined && { onSuccess })}
          {...(onModeChange !== undefined && { onModeChange })}
          {...(isLoading !== undefined && { isLoading })}
          {...(error !== undefined && { error })}
        />
      );
    case 'forgot-password':
      return (
        <ForgotPasswordForm
          {...(onForgotPassword !== undefined && { onForgotPassword })}
          {...(onSuccess !== undefined && { onSuccess })}
          {...(onModeChange !== undefined && { onModeChange })}
          {...(isLoading !== undefined && { isLoading })}
          {...(error !== undefined && { error })}
        />
      );
    case 'reset-password':
      return (
        <ResetPasswordForm
          {...(onResetPassword !== undefined && { onResetPassword })}
          {...(onSuccess !== undefined && { onSuccess })}
          {...(onModeChange !== undefined && { onModeChange })}
          initialData={initialData as { token?: string }}
          {...(isLoading !== undefined && { isLoading })}
          {...(error !== undefined && { error })}
        />
      );
    default:
      return (
        <LoginForm
          {...(onLogin !== undefined && { onLogin })}
          {...(onForgotPassword !== undefined && { onForgotPassword })}
          {...(onTotpVerify !== undefined && { onTotpVerify })}
          {...(onSmsVerify !== undefined && { onSmsVerify })}
          {...(onSmsSendCode !== undefined && { onSmsSendCode })}
          {...(onSuccess !== undefined && { onSuccess })}
          {...(onModeChange !== undefined && { onModeChange })}
          {...(isLoading !== undefined && { isLoading })}
          {...(error !== undefined && { error })}
        />
      );
  }
};
