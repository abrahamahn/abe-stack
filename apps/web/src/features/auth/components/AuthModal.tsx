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
  const { login, register, forgotPassword, resetPassword, resendVerification } = useAuth();
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
    <T extends Record<string, unknown>, R>(
      handler: (data: T) => Promise<R>,
      closeOnSuccess = true,
    ) =>
    async (data: T): Promise<R> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await handler(data);
        if (closeOnSuccess) {
          onSuccess?.();
          onOpenChange(false);
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err; // Re-throw so caller can handle if needed
      } finally {
        setIsLoading(false);
      }
    };

  const formProps: AuthFormProps = {
    mode,
    onLogin: createFormHandler(login),
    // Don't close modal after registration - user needs to see "check your email" message
    onRegister: createFormHandler(register, false),
    onForgotPassword: createFormHandler(forgotPassword),
    onResetPassword: createFormHandler(resetPassword),
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
}
