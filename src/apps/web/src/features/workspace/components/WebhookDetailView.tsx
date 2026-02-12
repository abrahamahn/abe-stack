// src/apps/web/src/features/workspace/components/WebhookDetailView.tsx
/**
 * Webhook Detail View
 *
 * Dialog showing webhook details including delivery log, secret rotation,
 * and copy-once secret display.
 */

import { useRotateWebhookSecret, useWebhook } from '@abe-stack/api';
import {
  Alert,
  Badge,
  Button,
  Input,
  Modal,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@abe-stack/ui';
import { useCallback, useState, type ReactElement } from 'react';

import type { WebhookClientConfig, WebhookDeliveryItem } from '@abe-stack/api';

// ============================================================================
// Types
// ============================================================================

export interface WebhookDetailViewProps {
  webhookId: string;
  clientConfig: WebhookClientConfig;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const WebhookDetailView = ({
  webhookId,
  clientConfig,
  open,
  onClose,
  onUpdated,
}: WebhookDetailViewProps): ReactElement | null => {
  const { webhook, isLoading, error, refresh } = useWebhook(clientConfig, webhookId);
  const rotateSecret = useRotateWebhookSecret(clientConfig, {
    onSuccess: () => {
      void refresh();
      onUpdated?.();
    },
  });
  const [copied, setCopied] = useState(false);

  const handleCopySecret = useCallback((secret: string) => {
    void navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  }, []);

  const handleRotate = useCallback(() => {
    void rotateSecret.rotate(webhookId);
  }, [rotateSecret, webhookId]);

  if (!open) return null;

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Webhook Details</Modal.Title>
        <Modal.Close />
      </Modal.Header>

      <Modal.Body>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {error !== null && <Alert tone="danger">{error.message}</Alert>}

        {webhook !== null && (
          <div className="space-y-4">
            <div>
              <Text size="sm" tone="muted">
                URL
              </Text>
              <Text size="sm" className="font-mono break-all">
                {webhook.url}
              </Text>
            </div>

            <div>
              <Text size="sm" tone="muted">
                Status
              </Text>
              <Badge tone={webhook.isActive ? 'success' : 'warning'}>
                {webhook.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div>
              <Text size="sm" tone="muted">
                Events
              </Text>
              <div className="flex flex-wrap gap-1 mt-1">
                {webhook.events.map((event: string) => (
                  <Badge key={event} tone="info">
                    {event}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Text size="sm" tone="muted">
                Secret
              </Text>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={rotateSecret.newSecret ?? webhook.secret.slice(0, 8) + '...'}
                  readOnly
                  className="font-mono flex-1"
                />
                {rotateSecret.newSecret !== null && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      handleCopySecret(rotateSecret.newSecret ?? '');
                    }}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={handleRotate}
                  disabled={rotateSecret.isLoading}
                >
                  {rotateSecret.isLoading ? 'Rotating...' : 'Rotate'}
                </Button>
              </div>
              {rotateSecret.newSecret !== null && (
                <Text size="sm" tone="danger" className="mt-1">
                  Copy your new secret now. It will not be shown again.
                </Text>
              )}
              {rotateSecret.error !== null && (
                <Alert tone="danger" className="mt-1">
                  {rotateSecret.error.message}
                </Alert>
              )}
            </div>

            <div>
              <Text size="sm" tone="muted">
                Created
              </Text>
              <Text size="sm">{new Date(webhook.createdAt).toLocaleString()}</Text>
            </div>

            <div>
              <Text size="sm" tone="muted">
                ID
              </Text>
              <Text size="sm" className="font-mono">
                {webhook.id}
              </Text>
            </div>

            {webhook.recentDeliveries.length > 0 && (
              <div>
                <Text size="sm" tone="muted" className="mb-2">
                  Recent Deliveries
                </Text>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhook.recentDeliveries.map((delivery: WebhookDeliveryItem) => (
                      <TableRow key={delivery.id}>
                        <TableCell>
                          <Text size="sm">{delivery.eventType}</Text>
                        </TableCell>
                        <TableCell>
                          <Badge
                            tone={
                              delivery.status === 'delivered'
                                ? 'success'
                                : delivery.status === 'failed' || delivery.status === 'dead'
                                  ? 'danger'
                                  : 'info'
                            }
                          >
                            {delivery.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Text size="sm">{delivery.attempts}</Text>
                        </TableCell>
                        <TableCell>
                          <Text size="sm" tone="muted">
                            {new Date(delivery.createdAt).toLocaleString()}
                          </Text>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
};
