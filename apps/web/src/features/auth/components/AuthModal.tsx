// apps/web/src/features/auth/components/AuthModal.tsx
import { Modal } from '@abe-stack/ui';
import { useAuth } from '@auth/hooks/useAuth';
import { useEffect, useState } from 'react';

import { AuthForm, type AuthMode } from './AuthForms';

import type { AuthFormProps } from './AuthForms';
import type { ReactElement } from 'react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

export function AuthModal({
  open,
  onOpenChange,
  initialMode = 'login',
  onSuccess,
}: AuthModalProps): ReactElement | null {
  const { login, register, forgotPassword, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync mode when modal opens with a different initialMode
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  const handleModeChange = (newMode: AuthMode): void => {
    setMode(newMode);
    setError(null);
  };

  const handleClose = (): void => {
    onOpenChange(false);
  };

  const createFormHandler =
    <T extends Record<string, unknown>>(handler: (data: T) => Promise<void>) =>
    async (data: T): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await handler(data);
        onSuccess?.();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

  const formProps: AuthFormProps = {
    mode,
    onLogin: createFormHandler(login),
    onRegister: createFormHandler(register),
    onForgotPassword: createFormHandler(forgotPassword),
    onResetPassword: createFormHandler(resetPassword),
    onModeChange: handleModeChange,
    isLoading,
    error,
  };

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <AuthForm {...formProps} />
    </Modal.Root>
  );
}
