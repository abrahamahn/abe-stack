// main/apps/web/src/features/settings/components/ApiKeyCreateDialog.tsx
/**
 * API Key Creation Dialog
 *
 * A modal dialog for creating new API keys. Features:
 * - Name input field
 * - Scope checkboxes (read, write, admin)
 * - After creation, shows a copy-once modal with the plaintext key
 * - Key is only displayed once and must be copied before dismissing
 */

import { Alert, Button, FormField, Input, Modal, Text } from '@bslt/ui';
import { useCallback, useState, type ReactElement } from 'react';

import { useCreateApiKey } from '../hooks/useApiKeys';

import { ApiKeyScopeSelector } from './ApiKeyScopeSelector';

// ============================================================================
// Types
// ============================================================================

export interface ApiKeyCreateDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog is closed (cancel or after key copy) */
  onClose: () => void;
  /** Called after a key is successfully created and dismissed */
  onKeyCreated?: () => void;
}

type DialogState = 'input' | 'copy-key';

// ============================================================================
// Component
// ============================================================================

export const ApiKeyCreateDialog = ({
  open,
  onClose,
  onKeyCreated,
}: ApiKeyCreateDialogProps): ReactElement | null => {
  const [state, setState] = useState<DialogState>('input');
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read']);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createApiKey = useCreateApiKey({
    onSuccess: (response) => {
      setPlaintextKey(response.plaintext);
      setState('copy-key');
    },
  });

  const handleCreate = useCallback((): void => {
    if (name.trim() === '' || scopes.length === 0) return;
    createApiKey.createKey({ name: name.trim(), scopes });
  }, [name, scopes, createApiKey]);

  const handleScopeToggle = useCallback((scope: string): void => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }, []);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (plaintextKey === null) return;
    try {
      await navigator.clipboard.writeText(plaintextKey);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [plaintextKey]);

  const handleDismiss = useCallback((): void => {
    // Reset state
    setState('input');
    setName('');
    setScopes(['read']);
    setPlaintextKey(null);
    setCopied(false);
    createApiKey.reset();
    onKeyCreated?.();
    onClose();
  }, [onClose, onKeyCreated, createApiKey]);

  const handleCancel = useCallback((): void => {
    setState('input');
    setName('');
    setScopes(['read']);
    setPlaintextKey(null);
    setCopied(false);
    createApiKey.reset();
    onClose();
  }, [onClose, createApiKey]);

  if (!open) return null;

  // State: Copy-once modal showing the newly created key
  if (state === 'copy-key' && plaintextKey !== null) {
    return (
      <Modal.Root open={open} onClose={() => {}}>
        <Modal.Header>
          <Modal.Title>API Key Created</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="space-y-4">
            <Alert tone="warning">
              <Text size="sm" className="font-medium">
                Copy your API key now. You will not be able to see it again.
              </Text>
            </Alert>

            <div className="space-y-2">
              <Text as="label" size="sm" tone="muted">
                Your new API key
              </Text>
              <div className="flex items-center gap-2">
                <Input
                  value={plaintextKey}
                  readOnly
                  className="font-mono flex-1"
                  data-testid="plaintext-key-input"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void handleCopy();
                  }}
                  data-testid="copy-key-button"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <Text size="sm" tone="muted">
              Store this key in a secure location such as a password manager or secrets vault. If
              you lose this key, you will need to create a new one.
            </Text>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button type="button" onClick={handleDismiss} data-testid="dismiss-key-button">
            I&apos;ve Copied My Key
          </Button>
        </Modal.Footer>
      </Modal.Root>
    );
  }

  // State: Input form for creating a new key
  return (
    <Modal.Root open={open} onClose={handleCancel}>
      <Modal.Header>
        <Modal.Title>Create API Key</Modal.Title>
        <Modal.Description>
          Create a new API key for programmatic access. Choose a descriptive name and select the
          appropriate permissions.
        </Modal.Description>
        <Modal.Close />
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-4">
          <FormField label="Key Name" htmlFor="api-key-name">
            <Input
              id="api-key-name"
              type="text"
              value={name}
              onChange={(e: { target: { value: string } }) => {
                setName(e.target.value);
              }}
              placeholder="e.g. CI/CD Pipeline, Mobile App"
              maxLength={100}
              required
              disabled={createApiKey.isLoading}
              data-testid="api-key-name-input"
            />
          </FormField>

          <div className="space-y-2">
            <Text as="label" size="sm" className="font-medium">
              Permissions
            </Text>
            <Text size="sm" tone="muted" className="mb-2">
              Select which operations this key can perform.
            </Text>
            <ApiKeyScopeSelector
              selectedScopes={scopes}
              onToggleScope={handleScopeToggle}
              disabled={createApiKey.isLoading}
            />
          </div>

          {createApiKey.isError && (
            <Alert tone="danger">{createApiKey.error?.message ?? 'Failed to create API key'}</Alert>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={createApiKey.isLoading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleCreate}
          disabled={createApiKey.isLoading || name.trim() === '' || scopes.length === 0}
          data-testid="create-key-button"
        >
          {createApiKey.isLoading ? 'Creating...' : 'Create Key'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
};
