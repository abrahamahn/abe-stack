// main/apps/web/src/features/settings/components/TotpManagement.tsx
/**
 * TOTP (2FA) Management Component
 *
 * Allows users to enable, disable, and manage two-factor authentication.
 * Shows setup flow with secret + backup codes, or disable flow with code verification.
 *
 * @module settings/components
 */

import { Alert, Button, Input, Text } from '@abe-stack/ui';
import { useState, type ChangeEvent, type ReactElement } from 'react';

import { useTotpManagement } from '../hooks/useTotpManagement';

import { TotpQrCode } from './TotpQrCode';

// ============================================================================
// Types
// ============================================================================

export interface TotpManagementProps {
  /** Called when TOTP status changes */
  onStatusChange?: (enabled: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * TOTP management UI for the Security settings tab.
 *
 * States:
 * - loading: Fetching current status
 * - disabled: 2FA is off, show "Enable" button
 * - setup-in-progress: Show secret, backup codes, and verification input
 * - enabled: 2FA is on, show "Disable" button
 *
 * @param props - Component props
 * @returns TOTP management UI
 * @complexity O(1) render
 */
export const TotpManagement = ({ onStatusChange }: TotpManagementProps): ReactElement => {
  const { state, error, isLoading, setupData, beginSetup, enable, disable, cancelSetup } =
    useTotpManagement();
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const handleEnable = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await enable(verifyCode);
    setVerifyCode('');
    onStatusChange?.(true);
  };

  const handleDisable = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await disable(disableCode);
    setDisableCode('');
    setShowDisableForm(false);
    onStatusChange?.(false);
  };

  const copyToClipboard = async (text: string, type: 'secret' | 'backup'): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => {
          setCopiedSecret(false);
        }, 2000);
      } else {
        setCopiedBackupCodes(true);
        setTimeout(() => {
          setCopiedBackupCodes(false);
        }, 2000);
      }
    } catch {
      // Clipboard API may not be available in all contexts
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-48 bg-surface rounded" />
        <div className="h-10 w-32 bg-surface rounded" />
      </div>
    );
  }

  // Setup in progress — show QR code, secret, backup codes, and verify form
  if (state === 'setup-in-progress' && setupData !== null) {
    return (
      <div className="space-y-4">
        <Text size="sm" tone="muted">
          Add this account to your authenticator app by scanning the QR code, or enter the secret
          key manually.
        </Text>

        {/* QR Code */}
        {'otpauthUrl' in setupData && setupData.otpauthUrl !== '' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">QR Code</label>
            <div className="inline-block p-4 bg-primary rounded-lg border">
              <TotpQrCode url={setupData.otpauthUrl} size={200} />
            </div>
          </div>
        )}

        {/* Secret */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted">Secret Key</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-surface rounded text-sm font-mono break-all select-all">
              {setupData.secret}
            </code>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void copyToClipboard(setupData.secret, 'secret');
              }}
            >
              {copiedSecret ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Backup Codes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted">Backup Codes</label>
          <Text size="xs" tone="muted">
            Save these codes in a safe place. Each code can only be used once.
          </Text>
          <div className="grid grid-cols-2 gap-1 px-3 py-2 bg-surface rounded">
            {setupData.backupCodes.map((code) => (
              <code key={code} className="text-sm font-mono py-0.5">
                {code}
              </code>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void copyToClipboard(setupData.backupCodes.join('\n'), 'backup');
            }}
          >
            {copiedBackupCodes ? 'Copied' : 'Copy all codes'}
          </Button>
        </div>

        {/* Verify */}
        <form
          onSubmit={(e) => {
            void handleEnable(e);
          }}
          className="space-y-3 border-t pt-4"
        >
          <Input.Field
            label="Verification Code"
            type="text"
            value={verifyCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setVerifyCode(e.target.value);
            }}
            placeholder="Enter 6-digit code"
            maxLength={8}
            autoComplete="one-time-code"
            disabled={isLoading}
            required
          />

          {error !== null && <Alert tone="danger">{error}</Alert>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading || verifyCode.length < 6}>
              {isLoading ? 'Verifying...' : 'Enable 2FA'}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelSetup} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // 2FA is enabled — show status + disable option
  if (state === 'enabled') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-success" />
          <Text size="sm" className="font-medium text-success">
            Two-factor authentication is enabled
          </Text>
        </div>

        {showDisableForm ? (
          <form
            onSubmit={(e) => {
              void handleDisable(e);
            }}
            className="space-y-3"
          >
            <Input.Field
              label="Enter your TOTP code to disable 2FA"
              type="text"
              value={disableCode}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setDisableCode(e.target.value);
              }}
              placeholder="Enter 6-digit code"
              maxLength={8}
              autoComplete="one-time-code"
              disabled={isLoading}
              required
            />

            {error !== null && <Alert tone="danger">{error}</Alert>}

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="secondary"
                disabled={isLoading || disableCode.length < 6}
              >
                {isLoading ? 'Disabling...' : 'Disable 2FA'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowDisableForm(false);
                  setDisableCode('');
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowDisableForm(true);
            }}
          >
            Disable 2FA
          </Button>
        )}
      </div>
    );
  }

  // 2FA is disabled — show enable button
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full text-muted"
          style={{ background: 'currentColor' }}
        />
        <Text size="sm" tone="muted">
          Two-factor authentication is not enabled
        </Text>
      </div>

      <Text size="sm" tone="muted">
        Add an extra layer of security to your account by requiring a verification code from your
        authenticator app when signing in.
      </Text>

      {error !== null && <Alert tone="danger">{error}</Alert>}

      <Button
        type="button"
        onClick={() => {
          void beginSetup();
        }}
        disabled={isLoading}
      >
        {isLoading ? 'Setting up...' : 'Enable 2FA'}
      </Button>
    </div>
  );
};
