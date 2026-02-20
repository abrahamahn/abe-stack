// main/apps/web/src/features/admin/pages/WebhookMonitorPage.tsx
/**
 * WebhookMonitorPage
 *
 * Admin page for monitoring all webhook endpoints across tenants.
 * Shows webhook list with status indicators and links to delivery logs.
 */

import { formatDateTime } from '@bslt/shared';
import {
  Alert,
  Badge,
  Button,
  Heading,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@bslt/ui';
import { useCallback, useState } from 'react';

import { useWebhookMonitor } from '../hooks/useWebhookMonitor';
import { useWebhookMonitorDeliveries } from '../hooks/useWebhookMonitorDeliveries';

import type { AdminWebhookDeliveryLocal, AdminWebhookLocal } from '../services/adminApi';
import type { ReactElement } from 'react';

// ============================================================================
// Delivery Status Badge
// ============================================================================

function DeliveryStatusBadge({ status }: { status: string }): ReactElement {
  const toneMap: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
    delivered: 'success',
    success: 'success',
    pending: 'info',
    failed: 'danger',
    dead: 'danger',
    retrying: 'warning',
  };
  const tone = toneMap[status] ?? 'info';
  return <Badge tone={tone}>{status}</Badge>;
}

// ============================================================================
// Delivery Log Panel
// ============================================================================

interface DeliveryLogPanelProps {
  webhookId: string;
  onClose: () => void;
}

function DeliveryLogPanel({ webhookId, onClose }: DeliveryLogPanelProps): ReactElement {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error, refetch, replayDelivery, isReplaying } =
    useWebhookMonitorDeliveries({
      webhookId,
      statusFilter,
    });

  const deliveries = data?.deliveries ?? [];

  const handleReplay = useCallback(
    (deliveryId: string) => {
      replayDelivery(deliveryId);
    },
    [replayDelivery],
  );

  return (
    <div className="mt-4 border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <Heading as="h3" size="sm">
          Delivery Log
        </Heading>
        <div className="flex items-center gap-2">
          <select
            className="text-sm border border-border rounded px-2 py-1 bg-surface"
            value={statusFilter ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(value === '' ? undefined : value);
            }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="dead">Dead</option>
          </select>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              void refetch();
            }}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button variant="text" size="small" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {isError && (
        <Alert tone="danger" className="mb-4">
          {error?.message ?? 'Failed to load deliveries'}
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton width="100%" height="2.5rem" />
          <Skeleton width="100%" height="2.5rem" />
          <Skeleton width="100%" height="2.5rem" />
        </div>
      ) : deliveries.length === 0 ? (
        <Text tone="muted" size="sm">
          No deliveries found for this webhook.
        </Text>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>HTTP Status</TableHead>
              <TableHead>Delivered At</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery: AdminWebhookDeliveryLocal) => (
              <TableRow key={delivery.id}>
                <TableCell>
                  <Text size="sm" className="font-mono">
                    {delivery.eventType}
                  </Text>
                </TableCell>
                <TableCell>
                  <DeliveryStatusBadge status={delivery.status} />
                </TableCell>
                <TableCell>
                  <Text size="sm">{delivery.attempts}</Text>
                </TableCell>
                <TableCell>
                  <Text size="sm">
                    {delivery.responseStatus !== null ? (
                      <Badge
                        tone={
                          delivery.responseStatus >= 200 && delivery.responseStatus < 300
                            ? 'success'
                            : 'danger'
                        }
                      >
                        {delivery.responseStatus}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm">
                    {delivery.deliveredAt !== null ? formatDateTime(delivery.deliveredAt) : '-'}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm">{formatDateTime(delivery.createdAt)}</Text>
                </TableCell>
                <TableCell>
                  {(delivery.status === 'failed' || delivery.status === 'dead') && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        handleReplay(delivery.id);
                      }}
                      disabled={isReplaying}
                    >
                      {isReplaying ? 'Replaying...' : 'Replay'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WebhookMonitorPage(): ReactElement {
  const { data, isLoading, isError, error, refetch } = useWebhookMonitor();
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(null);

  const webhooks = data?.webhooks ?? [];

  const handleToggleDeliveries = useCallback((webhookId: string) => {
    setExpandedWebhookId((prev) => (prev === webhookId ? null : webhookId));
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <Skeleton width="16rem" height="1.75rem" />
        <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
        <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
        <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
      </div>
    );
  }

  if (isError) {
    return <Alert tone="danger">{error?.message ?? 'Failed to load webhooks'}</Alert>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading as="h2">Webhook Monitor</Heading>
          <Text tone="muted" size="sm">
            System-wide view of all registered webhook endpoints and their delivery status.
          </Text>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => {
            void refetch();
          }}
        >
          Refresh
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <Text tone="muted">No webhook endpoints registered.</Text>
      ) : (
        <div className="space-y-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook: AdminWebhookLocal) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <Text size="sm" className="font-mono truncate max-w-xs">
                      {webhook.url}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">{webhook.tenantId ?? 'System'}</Text>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 3).map((event: string) => (
                        <Badge key={event} tone="info">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > 3 && (
                        <Badge tone="info">+{webhook.events.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge tone={webhook.isActive ? 'success' : 'danger'}>
                      {webhook.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">{formatDateTime(webhook.createdAt)}</Text>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => {
                        handleToggleDeliveries(webhook.id);
                      }}
                    >
                      {expandedWebhookId === webhook.id ? 'Hide Deliveries' : 'View Deliveries'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {expandedWebhookId !== null && (
            <DeliveryLogPanel
              webhookId={expandedWebhookId}
              onClose={() => {
                setExpandedWebhookId(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
