// main/apps/web/src/features/workspace/components/AuditEventDetailModal.tsx
/**
 * Audit Event Detail Modal
 *
 * Displays full details for a single audit event in a modal dialog.
 */

import { getAuditActionTone } from '@bslt/shared';
import { Badge, Button, Modal, Text } from '@bslt/ui';

import type { AuditEvent } from '../hooks/useAuditLog';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface AuditEventDetailModalProps {
  event: AuditEvent | null;
  open: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const AuditEventDetailModal = ({
  event,
  open,
  onClose,
}: AuditEventDetailModalProps): ReactElement | null => {
  if (!open || event === null) return null;

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Audit Event Details</Modal.Title>
        <Modal.Close />
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Text size="sm" tone="muted">
              Action:
            </Text>
            <Badge tone={getAuditActionTone(event.action)}>{event.action}</Badge>
          </div>

          <div>
            <Text size="sm" tone="muted">
              Actor
            </Text>
            <Text size="sm">{event.actorId}</Text>
          </div>

          <div>
            <Text size="sm" tone="muted">
              Timestamp
            </Text>
            <Text size="sm">{new Date(event.createdAt).toLocaleString()}</Text>
          </div>

          {event.details.trim() !== '' && (
            <div>
              <Text size="sm" tone="muted">
                Details
              </Text>
              <Text size="sm">{event.details}</Text>
            </div>
          )}

          <div>
            <Text size="sm" tone="muted">
              Event ID
            </Text>
            <Text size="sm" className="font-mono">
              {event.id}
            </Text>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
};
