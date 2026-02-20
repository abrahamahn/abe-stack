// main/apps/web/src/features/admin/pages/WebhookListPage.tsx
/**
 * WebhookListPage
 *
 * Admin page for listing, creating, and managing webhook subscriptions.
 * Displays all webhooks with status badges, event counts, and action buttons.
 */

import { formatDate } from '@bslt/shared';
import {
  Alert,
  Button,
  Heading,
  PageContainer,
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

import { CreateWebhookDialog, WebhookStatusBadge } from '../components';
import {
  useAdminCreateWebhook,
  useAdminDeleteWebhook,
  useAdminWebhooks,
} from '../hooks/useWebhookAdmin';

import type { WebhookStatus } from '../components/WebhookStatusBadge';
import type { ReactElement } from 'react';

// ============================================================================
// Helpers
// ============================================================================

function deriveWebhookStatus(webhook: {
  isActive: boolean;
  recentDeliveries?: Array<{ status: string }>;
}): WebhookStatus {
  if (!webhook.isActive) return 'inactive';
  // If webhook has no delivery info from the list endpoint, assume active
  return 'active';
}

// ============================================================================
// Component
// ============================================================================

export function WebhookListPage(): ReactElement {
  const { webhooks, isLoading, error, refresh } = useAdminWebhooks();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const createWebhook = useAdminCreateWebhook({
    onSuccess: () => {
      setShowCreateDialog(false);
      void refresh();
    },
  });

  const deleteWebhook = useAdminDeleteWebhook({
    onSuccess: () => {
      void refresh();
    },
  });

  const handleCreate = useCallback(
    (data: { url: string; events: string[] }) => {
      void createWebhook.create(data);
    },
    [createWebhook],
  );

  const handleDelete = useCallback(
    (id: string) => {
      void deleteWebhook.remove(id);
    },
    [deleteWebhook],
  );

  // Loading State
  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton width="12rem" height="1.75rem" />
          <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Heading as="h1" size="xl">
              Webhooks
            </Heading>
            <Text tone="muted">Manage webhook endpoints that receive event notifications.</Text>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void refresh();
              }}
            >
              Refresh
            </Button>
            <Button
              onClick={() => {
                setShowCreateDialog(true);
              }}
            >
              Create Webhook
            </Button>
          </div>
        </div>

        {/* Error */}
        {error !== null && <Alert tone="danger">{error.message}</Alert>}

        {/* Table */}
        {webhooks.length === 0 ? (
          <Text tone="muted">No webhooks configured. Create one to get started.</Text>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <Text size="sm" className="font-mono truncate max-w-xs">
                      {webhook.url}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm">{String(webhook.events.length)} event(s)</Text>
                  </TableCell>
                  <TableCell>
                    <WebhookStatusBadge status={deriveWebhookStatus(webhook)} />
                  </TableCell>
                  <TableCell>
                    <Text size="sm">{formatDate(webhook.createdAt)}</Text>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          // Navigate to detail -- use simple window.location for now
                          window.location.hash = `#/admin/webhooks/${webhook.id}`;
                        }}
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="text"
                        size="small"
                        className="text-danger"
                        onClick={() => {
                          handleDelete(webhook.id);
                        }}
                        disabled={deleteWebhook.isLoading}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create Dialog */}
        <CreateWebhookDialog
          isOpen={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
          }}
          onCreate={handleCreate}
          isCreating={createWebhook.isLoading}
          error={createWebhook.error}
        />
      </div>
    </PageContainer>
  );
}
