// main/apps/web/src/features/auth/components/TosAcceptanceModal.tsx
/**
 * Terms of Service Acceptance Modal
 *
 * Displayed when the API returns a 403 TOS_ACCEPTANCE_REQUIRED response.
 * Prompts the user to accept the latest ToS before continuing.
 *
 * @module auth/components
 */

import { Button, Modal, Text } from '@bslt/ui';
import { useCallback, useState, type ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface TosAcceptanceModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Document ID of the ToS to accept */
  documentId: string | null;
  /** Required ToS version number */
  requiredVersion: number | null;
  /** Called when the user accepts the ToS */
  onAccept: (documentId: string) => Promise<void>;
  /** Called when the modal is dismissed (user can't proceed without accepting) */
  onDismiss?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Modal that gates user access behind Terms of Service acceptance.
 *
 * Shown in response to a 403 TOS_ACCEPTANCE_REQUIRED API error.
 * User must click "Accept" to proceed; the modal calls the
 * POST /api/auth/tos/accept endpoint via the onAccept callback.
 */
export function TosAcceptanceModal({
  open,
  documentId,
  requiredVersion,
  onAccept,
  onDismiss,
}: TosAcceptanceModalProps): ReactElement | null {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = useCallback(async () => {
    if (documentId === null) return;

    setIsAccepting(true);
    setError(null);

    try {
      await onAccept(documentId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept Terms of Service';
      setError(message);
    } finally {
      setIsAccepting(false);
    }
  }, [documentId, onAccept]);

  if (!open || documentId === null) return null;

  return (
    <Modal.Root open={open} {...(onDismiss !== undefined ? { onClose: onDismiss } : {})}>
      <Modal.Header>
        <Modal.Title>Terms of Service Updated</Modal.Title>
        <Modal.Description>
          {requiredVersion !== null
            ? `Please review and accept Version ${String(requiredVersion)} of our Terms of Service to continue.`
            : 'Please review and accept the updated Terms of Service to continue.'}
        </Modal.Description>
      </Modal.Header>

      <Modal.Body>
        <Text size="sm" tone="muted">
          By clicking &quot;Accept&quot;, you agree to our updated Terms of Service. You must accept
          to continue using the application.
        </Text>

        {error !== null && (
          <Text size="sm" tone="danger">
            {error}
          </Text>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button
          type="button"
          onClick={() => {
            void handleAccept();
          }}
          disabled={isAccepting}
        >
          {isAccepting ? 'Accepting...' : 'Accept Terms of Service'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
}
