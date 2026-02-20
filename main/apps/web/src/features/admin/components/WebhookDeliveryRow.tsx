// main/apps/web/src/features/admin/components/WebhookDeliveryRow.tsx
/**
 * WebhookDeliveryRow
 *
 * Table row component for displaying a single webhook delivery attempt.
 * Shows event type, status, attempt count, timestamps, and a replay action.
 */

import { formatDate } from '@bslt/shared';
import { Badge, Button, TableCell, TableRow, Text } from '@bslt/ui';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface DeliveryRowData {
  id: string;
  eventType: string;
  status: string;
  attempts: number;
  createdAt: string;
  deliveredAt: string | null;
}

export interface WebhookDeliveryRowProps {
  delivery: DeliveryRowData;
  onReplay: (deliveryId: string) => void;
  isReplaying: boolean;
}

// ============================================================================
// Status Tone Map
// ============================================================================

const DELIVERY_STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  delivered: 'success',
  pending: 'info',
  failed: 'danger',
  dead: 'danger',
};

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  delivered: 'Delivered',
  pending: 'Pending',
  failed: 'Failed',
  dead: 'Dead Letter',
};

// ============================================================================
// Component
// ============================================================================

export function WebhookDeliveryRow({
  delivery,
  onReplay,
  isReplaying,
}: WebhookDeliveryRowProps): ReactElement {
  const tone = DELIVERY_STATUS_TONE[delivery.status] ?? 'warning';
  const label = DELIVERY_STATUS_LABEL[delivery.status] ?? delivery.status;
  const canReplay = delivery.status === 'failed' || delivery.status === 'dead';

  return (
    <TableRow>
      <TableCell>
        <Text size="sm" className="font-mono">
          {delivery.eventType}
        </Text>
      </TableCell>
      <TableCell>
        <Badge tone={tone}>{label}</Badge>
      </TableCell>
      <TableCell>
        <Text size="sm">{String(delivery.attempts)}</Text>
      </TableCell>
      <TableCell>
        <Text size="sm">{formatDate(delivery.createdAt)}</Text>
      </TableCell>
      <TableCell>
        <Text size="sm">
          {delivery.deliveredAt !== null ? formatDate(delivery.deliveredAt) : '-'}
        </Text>
      </TableCell>
      <TableCell>
        {canReplay && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              onReplay(delivery.id);
            }}
            disabled={isReplaying}
          >
            {isReplaying ? 'Replaying...' : 'Replay'}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
