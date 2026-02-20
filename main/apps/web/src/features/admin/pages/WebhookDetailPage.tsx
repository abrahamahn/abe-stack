// main/apps/web/src/features/admin/pages/WebhookDetailPage.tsx
/**
 * WebhookDetailPage
 *
 * Admin page for viewing a single webhook's configuration and delivery log.
 * Shows webhook metadata, recent deliveries with status indicators, and
 * provides actions for editing, rotating secrets, and replaying deliveries.
 */

import { formatDate } from '@bslt/shared';
import {
  Alert,
  Badge,
  Button,
  Heading,
  PageContainer,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@bslt/ui';
import { useCallback, useState } from 'react';

import { WebhookDeliveryRow, WebhookStatusBadge } from '../components';
import {
  useAdminReplayDelivery,
  useAdminRotateWebhookSecret,
  useAdminUpdateWebhook,
  useAdminWebhook,
  useAdminWebhookDeliveries,
} from '../hooks/useWebhookAdmin';

import type { WebhookStatus } from '../components/WebhookStatusBadge';
import type { ReactElement } from 'react';

// ============================================================================
// Props
// ============================================================================

export interface WebhookDetailPageProps {
  webhookId: string;
}

// ============================================================================
// Helpers
// ============================================================================

function deriveWebhookStatus(webhook: {
  isActive: boolean;
  recentDeliveries?: Array<{ status: string }>;
}): WebhookStatus {
  if (!webhook.isActive) return 'inactive';
  const hasRecentFailures = webhook.recentDeliveries?.some(
    (d) => d.status === 'failed' || d.status === 'dead',
  );
  return hasRecentFailures === true ? 'failing' : 'active';
}

// ============================================================================
// Component
// ============================================================================

export function WebhookDetailPage({ webhookId }: WebhookDetailPageProps): ReactElement {
  const { webhook, isLoading, error, refresh } = useAdminWebhook(webhookId);
  const {
    deliveries,
    isLoading: deliveriesLoading,
    refresh: refreshDeliveries,
  } = useAdminWebhookDeliveries(webhookId);

  const [showSecret, setShowSecret] = useState(false);

  const updateWebhook = useAdminUpdateWebhook({
    onSuccess: () => {
      void refresh();
    },
  });

  const rotateSecret = useAdminRotateWebhookSecret({
    onSuccess: () => {
      void refresh();
    },
  });

  const replayDelivery = useAdminReplayDelivery({
    webhookId,
    onSuccess: () => {
      void refreshDeliveries();
    },
  });

  const handleToggleActive = useCallback(() => {
    if (webhook === null) return;
    void updateWebhook.update(webhookId, { isActive: !webhook.isActive });
  }, [webhook, webhookId, updateWebhook]);

  const handleRotateSecret = useCallback(() => {
    void rotateSecret.rotate(webhookId);
  }, [webhookId, rotateSecret]);

  const handleReplay = useCallback(
    (deliveryId: string) => {
      void replayDelivery.replay(deliveryId);
    },
    [replayDelivery],
  );

  // Loading State
  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton width="16rem" height="1.75rem" />
          <Skeleton width="100%" height="6rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="12rem" radius="var(--ui-radius-md)" />
        </div>
      </PageContainer>
    );
  }

  // Error State
  if (error !== null) {
    return (
      <PageContainer>
        <Alert tone="danger">{error.message}</Alert>
      </PageContainer>
    );
  }

  // Not Found
  if (webhook === null) {
    return (
      <PageContainer>
        <Alert tone="warning">Webhook not found.</Alert>
      </PageContainer>
    );
  }

  const status = deriveWebhookStatus(webhook);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Heading as="h1" size="xl">
                Webhook Detail
              </Heading>
              <WebhookStatusBadge status={status} />
            </div>
            <Text tone="muted" className="mt-1 font-mono text-sm">
              {webhook.url}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void refresh();
                void refreshDeliveries();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Webhook Info Card */}
        <div className="p-4 bg-surface rounded border border-border space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text size="sm" tone="muted">
                Webhook ID
              </Text>
              <Text size="sm" className="font-mono">
                {webhook.id}
              </Text>
            </div>
            <div>
              <Text size="sm" tone="muted">
                Created
              </Text>
              <Text size="sm">{formatDate(webhook.createdAt)}</Text>
            </div>
            <div>
              <Text size="sm" tone="muted">
                Updated
              </Text>
              <Text size="sm">{formatDate(webhook.updatedAt)}</Text>
            </div>
            <div>
              <Text size="sm" tone="muted">
                Active
              </Text>
              <div className="flex items-center gap-2">
                <Switch
                  checked={webhook.isActive}
                  onChange={handleToggleActive}
                  disabled={updateWebhook.isLoading}
                />
                <Text size="sm">{webhook.isActive ? 'Yes' : 'No'}</Text>
              </div>
            </div>
          </div>

          {/* Events */}
          <div>
            <Text size="sm" tone="muted" className="mb-1">
              Subscribed Events
            </Text>
            <div className="flex flex-wrap gap-1">
              {webhook.events.map((event) => (
                <Badge key={event} tone="info">
                  {event}
                </Badge>
              ))}
            </div>
          </div>

          {/* Secret */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Text size="sm" tone="muted">
                Signing Secret
              </Text>
              <Text size="sm" className="font-mono">
                {showSecret ? webhook.secret : '••••••••••••••••'}
              </Text>
            </div>
            <Button
              type="button"
              variant="text"
              size="small"
              onClick={() => {
                setShowSecret(!showSecret);
              }}
            >
              {showSecret ? 'Hide' : 'Show'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={handleRotateSecret}
              disabled={rotateSecret.isLoading}
            >
              {rotateSecret.isLoading ? 'Rotating...' : 'Rotate Secret'}
            </Button>
          </div>
          {rotateSecret.newSecret !== null && (
            <Alert tone="info">
              New secret generated. Make sure to update your endpoint configuration.
            </Alert>
          )}
        </div>

        {/* Delivery Log */}
        <div>
          <Heading as="h2" size="lg" className="mb-3">
            Delivery Log
          </Heading>

          {deliveriesLoading ? (
            <div className="space-y-2">
              <Skeleton width="100%" height="3rem" radius="var(--ui-radius-md)" />
              <Skeleton width="100%" height="3rem" radius="var(--ui-radius-md)" />
              <Skeleton width="100%" height="3rem" radius="var(--ui-radius-md)" />
            </div>
          ) : deliveries.length === 0 ? (
            <Text tone="muted">No deliveries recorded yet.</Text>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <WebhookDeliveryRow
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    key={delivery.id}
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    delivery={delivery}
                    onReplay={handleReplay}
                    isReplaying={replayDelivery.isLoading}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
