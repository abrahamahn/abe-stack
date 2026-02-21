// main/apps/web/src/features/settings/components/BackupCodesDisplay.tsx
/**
 * Backup Codes Display & Regenerate
 *
 * Shows the current backup codes status (remaining/total) and allows
 * the user to regenerate new backup codes. After regeneration, codes
 * are displayed in a copy-once format.
 *
 * @module settings/components
 */

import { Alert, Button, Card, Heading, Input, Text } from '@bslt/ui';
import { useState, type ChangeEvent, type ReactElement } from 'react';

import { useBackupCodes } from '../hooks/useBackupCodes';

// ============================================================================
// Types
// ============================================================================

export interface BackupCodesDisplayProps {
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const BackupCodesDisplay = ({ className }: BackupCodesDisplayProps): ReactElement => {
  const { status, isLoading, isRegenerating, newCodes, error, regenerate, dismissCodes } =
    useBackupCodes();

  const [confirmCode, setConfirmCode] = useState('');
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleRegenerate = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await regenerate(confirmCode);
    setConfirmCode('');
    setShowRegenerateForm(false);
  };

  const handleCopyAll = async (): Promise<void> => {
    if (newCodes === null) return;
    try {
      await navigator.clipboard.writeText(newCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => {
        setCopiedCodes(false);
      }, 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  const handleDismissCodes = (): void => {
    setCopiedCodes(false);
    dismissCodes();
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <Card.Body>
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 bg-surface rounded" />
            <div className="h-4 w-32 bg-surface rounded" />
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Card.Body>
        <div className="space-y-4">
          <div>
            <Heading as="h4" size="sm" className="mb-2">
              Backup Codes
            </Heading>
            <Text size="sm" tone="muted">
              Backup codes can be used to access your account if you lose your two-factor
              authentication device. Each code can only be used once.
            </Text>
          </div>

          {/* Status Display */}
          {status !== null && (
            <div
              className="flex items-center gap-3 p-3 bg-surface rounded border"
              data-testid="backup-codes-status"
            >
              <div className="flex flex-col">
                <Text size="sm" className="font-medium">
                  {status.remaining} of {status.total} codes remaining
                </Text>
                <Text size="sm" tone="muted">
                  {status.remaining === 0
                    ? 'All codes have been used. Generate new codes immediately.'
                    : status.remaining <= 2
                      ? 'Running low on backup codes. Consider regenerating.'
                      : 'You have backup codes available for account recovery.'}
                </Text>
              </div>

              {/* Warning indicator for low codes */}
              {status.remaining <= 2 && (
                <span
                  className={`w-3 h-3 rounded-full ${
                    status.remaining === 0 ? 'bg-danger' : 'bg-warning'
                  }`}
                />
              )}
            </div>
          )}

          {/* Newly Generated Codes */}
          {newCodes !== null && (
            <div className="space-y-3" data-testid="new-codes-display">
              <Alert tone="warning">
                <Text size="sm" className="font-medium">
                  Save these backup codes now. They will not be shown again.
                </Text>
              </Alert>

              <div className="grid grid-cols-2 gap-1 px-3 py-2 bg-surface rounded border">
                {newCodes.map((code) => (
                  <code key={code} className="text-sm font-mono py-0.5">
                    {code}
                  </code>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void handleCopyAll();
                  }}
                  data-testid="copy-codes-button"
                >
                  {copiedCodes ? 'Copied!' : 'Copy All Codes'}
                </Button>
                <Button
                  type="button"
                  variant="text"
                  onClick={handleDismissCodes}
                  data-testid="dismiss-codes-button"
                >
                  I&apos;ve Saved My Codes
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error !== null && <Alert tone="danger">{error}</Alert>}

          {/* Regenerate Form */}
          {newCodes === null && !showRegenerateForm && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowRegenerateForm(true);
              }}
              disabled={isRegenerating}
              data-testid="regenerate-button"
            >
              Regenerate Backup Codes
            </Button>
          )}

          {showRegenerateForm && newCodes === null && (
            <div className="border-t pt-4">
              <Alert tone="warning" className="mb-3">
                <Text size="sm">
                  Regenerating backup codes will invalidate all existing codes. Make sure you have
                  access to your authenticator app.
                </Text>
              </Alert>

              <form
                onSubmit={(e) => {
                  void handleRegenerate(e);
                }}
                className="space-y-3"
              >
                <Input.Field
                  label="Enter your TOTP code to confirm"
                  type="text"
                  value={confirmCode}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setConfirmCode(e.target.value);
                  }}
                  placeholder="Enter 6-digit code"
                  maxLength={8}
                  autoComplete="one-time-code"
                  disabled={isRegenerating}
                  required
                  data-testid="confirm-code-input"
                />

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isRegenerating || confirmCode.length < 6}
                    data-testid="confirm-regenerate-button"
                  >
                    {isRegenerating ? 'Regenerating...' : 'Regenerate Codes'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowRegenerateForm(false);
                      setConfirmCode('');
                    }}
                    disabled={isRegenerating}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};
