// src/apps/web/src/features/settings/components/PhoneManagement.tsx
/**
 * PhoneManagement — Add, verify, and remove a phone number for SMS 2FA.
 */


import { usePhone } from '@abe-stack/api';
import { Alert, Button, Card, Input, Text } from '@abe-stack/ui';
import { useCallback, useMemo, useState, type ReactElement } from 'react';

import type { User } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

interface PhoneManagementProps {
  user: User;
  baseUrl: string;
  getToken?: () => string | null;
  onStatusChange?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const PhoneManagement = ({
  user,
  baseUrl,
  getToken,
  onStatusChange,
}: PhoneManagementProps): ReactElement => {
  const clientConfig = useMemo(() => {
    const config: { baseUrl: string; getToken?: () => string | null } = { baseUrl };
    if (getToken !== undefined) {
      config.getToken = getToken;
    }
    return config;
  }, [baseUrl, getToken]);
  const { isLoading, error, setPhone, verifyPhone, removePhone } = usePhone({ clientConfig });

  const [phone, setPhoneInput] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'idle' | 'verify' | 'success'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);

  const hasPhone = user.phone !== null && user.phone !== '';
  const isVerified = user.phoneVerified === true;

  // Mask phone: show last 4 digits
  const maskedPhone = hasPhone && user.phone !== null ? `***${user.phone.slice(-4)}` : null;

  const handleSetPhone = useCallback(async () => {
    if (phone.trim() === '') return;
    setLocalError(null);
    try {
      await setPhone(phone.trim());
      setStep('verify');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to set phone');
    }
  }, [phone, setPhone]);

  const handleVerify = useCallback(async () => {
    if (code.trim().length < 6) return;
    setLocalError(null);
    try {
      await verifyPhone(code.trim());
      setStep('success');
      onStatusChange?.();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Verification failed');
    }
  }, [code, verifyPhone, onStatusChange]);

  const handleRemove = useCallback(async () => {
    setLocalError(null);
    try {
      await removePhone();
      setStep('idle');
      setPhoneInput('');
      setCode('');
      onStatusChange?.();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to remove phone');
    }
  }, [removePhone, onStatusChange]);

  const displayError = localError ?? (error !== null ? error.message : null);

  // Phone verified — show status + remove option
  if (isVerified) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Text>Phone Number</Text>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--ui-badge-success-bg)',
                  color: 'var(--ui-color-success)',
                }}
              >
                Verified
              </span>
            </div>
            <Text tone="muted" size="sm">
              {maskedPhone}
            </Text>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              void handleRemove();
            }}
            disabled={isLoading}
          >
            Remove
          </Button>
        </div>
        {displayError !== null && (
          <Alert tone="danger" className="mt-3">
            {displayError}
          </Alert>
        )}
      </Card>
    );
  }

  // Verify step — code entry
  if (step === 'verify') {
    return (
      <Card className="p-4 space-y-3">
        <Text>Enter verification code</Text>
        <Text tone="muted" size="sm">
          A code was sent to the phone number you provided.
        </Text>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => { setCode(e.target.value); }}
            maxLength={6}
          />
          <Button
            type="button"
            onClick={() => {
              void handleVerify();
            }}
            disabled={isLoading || code.trim().length < 6}
          >
            Verify
          </Button>
        </div>
        {displayError !== null && <Alert tone="danger">{displayError}</Alert>}
      </Card>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <Card className="p-4">
        <Alert tone="success">Phone number verified! SMS 2FA is now active.</Alert>
      </Card>
    );
  }

  // Idle — add phone number
  return (
    <Card className="p-4 space-y-3">
      <Text>SMS Two-Factor Authentication</Text>
      <Text tone="muted" size="sm">
        Add a phone number to receive SMS verification codes during login. When enabled, you will
        need to enter a code sent to your phone after entering your password.
      </Text>
      <div className="flex gap-2">
        <Input
          type="tel"
          placeholder="+1 555 123 4567"
          value={phone}
          onChange={(e) => { setPhoneInput(e.target.value); }}
        />
        <Button
          type="button"
          onClick={() => {
            void handleSetPhone();
          }}
          disabled={isLoading || phone.trim() === ''}
        >
          Send Code
        </Button>
      </div>
      {displayError !== null && <Alert tone="danger">{displayError}</Alert>}
    </Card>
  );
};
