// src/apps/web/src/features/auth/components/AuthModal.tsx
import { Modal, useFormState } from '@abe-stack/ui';
import { useAuth } from '@auth/hooks/useAuth';
import { useEffect, useState } from 'react';

import { AuthForm, type AuthFormProps } from './AuthForms';

import type { AuthMode } from '@abe-stack/ui';
import type { ReactElement } from 'react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

export const AuthModal = ({
  open,
  onOpenChange,
  initialMode = 'login',
  onSuccess,
}: AuthModalProps): ReactElement | null => {
  const { login, register, forgotPassword, resetPassword, resendVerification } = useAuth();
  const { isLoading, error, setError, wrapHandler } = useFormState();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Sync mode when modal opens with a different initialMode
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode, setError]);

  const handleModeChange = (newMode: AuthMode): void => {
    setMode(newMode);
    setError(null);
  };

  const handleClose = (): void => {
    onOpenChange(false);
  };

  const closeModalOnSuccess = (): void => {
    onSuccess?.();
    onOpenChange(false);
  };

  const formProps: AuthFormProps = {
    mode,
    onLogin: wrapHandler(login, { onSuccess: closeModalOnSuccess }),
    // Don't close modal after registration - user needs to see "check your email" message
    onRegister: wrapHandler(register),
    onForgotPassword: wrapHandler(forgotPassword, { onSuccess: closeModalOnSuccess }),
    onResetPassword: wrapHandler(resetPassword, { onSuccess: closeModalOnSuccess }),
    onResendVerification: resendVerification,
    onModeChange: handleModeChange,
    isLoading,
    error,
  };

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <AuthForm {...formProps} />
    </Modal.Root>
  );
};
