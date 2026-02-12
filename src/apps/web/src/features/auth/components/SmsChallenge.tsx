// src/apps/web/src/features/auth/components/SmsChallenge.tsx
/**
 * SmsChallenge — SMS 2FA verification during login.
 *
 * Displayed when login returns a 202 with requiresSms.
 * Sends an SMS code and accepts 6-digit verification input.
 */

import { MS_PER_SECOND } from '@abe-stack/shared';
import { Alert, Button, Input, Text } from '@abe-stack/ui';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

interface SmsChallengeProps {
  challengeToken: string;
  onVerify: (challengeToken: string, code: string) => Promise<void>;
  onSendCode: (challengeToken: string) => Promise<void>;
  onCancel: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const SmsChallenge = ({
  challengeToken,
  onVerify,
  onSendCode,
  onCancel,
}: SmsChallengeProps): ReactElement => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-send code on mount
  useEffect(() => {
    const sendInitial = async (): Promise<void> => {
      try {
        await onSendCode(challengeToken);
        setCodeSent(true);
        setResendCooldown(60);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send code');
      }
    };
    void sendInitial();
    return undefined;
  }, [challengeToken, onSendCode]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, MS_PER_SECOND);
    return (): void => {
      clearInterval(timer);
    };
  }, [resendCooldown]);

  const handleVerify = useCallback(async () => {
    if (code.trim().length < 6) return;
    setIsLoading(true);
    setError(null);
    try {
      await onVerify(challengeToken, code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  }, [challengeToken, code, onVerify]);

  const handleResend = useCallback(async () => {
    setError(null);
    try {
      await onSendCode(challengeToken);
      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    }
  }, [challengeToken, onSendCode]);

  return (
    <div className="space-y-4">
      <Text size="lg">SMS Verification</Text>
      <Text tone="muted" size="sm">
        {codeSent
          ? 'Enter the 6-digit code sent to your phone.'
          : 'Sending verification code to your phone...'}
      </Text>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="000000"
          value={code}
          onChange={(e): void => {
            setCode(e.target.value.replace(/\D/g, ''));
          }}
          maxLength={6}
          autoFocus
          disabled={!codeSent}
        />
        <Button
          type="button"
          onClick={(): void => {
            void handleVerify();
          }}
          disabled={isLoading || code.trim().length < 6}
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>
      </div>

      {error !== null && <Alert tone="danger">{error}</Alert>}

      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="text"
          size="small"
          onClick={(): void => {
            void handleResend();
          }}
          disabled={resendCooldown > 0}
        >
          {resendCooldown > 0 ? `Resend in ${String(resendCooldown)}s` : 'Resend code'}
        </Button>
        <Button type="button" variant="text" size="small" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
