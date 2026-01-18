// apps/web/src/features/auth/pages/ResetPasswordPage.tsx
import { Button } from '@abe-stack/ui';
import { ResetPasswordForm } from '@auth/components/AuthForms';
import { useAuth } from '@auth/hooks';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ReactElement } from 'react';

export function ResetPasswordPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  const handleResetPassword = async (data: { token: string; password: string }): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(data);
      alert('Password reset successfully! You can now sign in with your new password.');
      void navigate('/auth?mode=login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToForgotPassword = (): void => {
    void navigate('/auth?mode=forgot-password');
  };

  const handleNavigateToLogin = (): void => {
    void navigate('/auth?mode=login');
  };

  if (!token) {
    return (
      <div className="min-h-screen flex-center bg-surface p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-danger">Invalid reset link</h2>
          <p className="text-muted">This password reset link is invalid or has expired.</p>
          <Button onClick={handleNavigateToForgotPassword}>Request a new reset link</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex-center bg-surface p-4">
      <ResetPasswordForm
        onResetPassword={handleResetPassword}
        initialData={{ token }}
        isLoading={isLoading}
        error={error}
        onSuccess={handleNavigateToLogin}
      />
    </div>
  );
}
