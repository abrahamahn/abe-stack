// main/apps/web/src/features/workspace/components/WebhookManagement.tsx
/**
 * Webhook Management
 *
 * Lists webhooks for a workspace with a create form.
 * Follows the same CRUD management pattern as ApiKeysManagement.
 */

import { getAccessToken } from '@app/authToken';
import { useCreateWebhook, useDeleteWebhook, useWebhooks } from '@bslt/react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Heading,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@bslt/ui';
import { useCallback, useMemo, useState, type ReactElement } from 'react';

import { WebhookDetailView } from './WebhookDetailView';

import type { WebhookClientConfig, WebhookItem } from '@bslt/api';

// ============================================================================
// Types
// ============================================================================

export interface WebhookManagementProps {
  tenantId: string;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const AVAILABLE_EVENTS = [
  'user.created',
  'user.updated',
  'user.deleted',
  'auth.login',
  'tenant.created',
  'tenant.updated',
  'member.added',
  'member.removed',
  'billing.subscription.created',
  'billing.payment.succeeded',
] as const;

// ============================================================================
// Helpers
// ============================================================================

function getClientConfig(): WebhookClientConfig {
  const apiBaseUrl =
    typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';
  return {
    baseUrl: apiBaseUrl,
    getToken: getAccessToken,
  };
}

// ============================================================================
// Component
// ============================================================================

export const WebhookManagement = ({ className }: WebhookManagementProps): ReactElement => {
  const clientConfig = useMemo(getClientConfig, []);
  const { webhooks, isLoading, error, refresh } = useWebhooks(clientConfig);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);

  const createWebhook = useCreateWebhook(clientConfig, {
    onSuccess: () => {
      setNewUrl('');
      setSelectedEvents([]);
      setShowCreate(false);
      void refresh();
    },
  });

  const deleteWebhook = useDeleteWebhook(clientConfig, {
    onSuccess: () => {
      void refresh();
    },
  });

  const handleCreate = useCallback(() => {
    if (newUrl.trim() === '' || selectedEvents.length === 0) return;
    void createWebhook.create({ url: newUrl.trim(), events: selectedEvents });
  }, [newUrl, selectedEvents, createWebhook]);

  const handleEventToggle = useCallback((event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }, []);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={className}>
        <Alert tone="danger">{error.message}</Alert>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <Heading as="h3">Webhooks</Heading>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => {
            setShowCreate(!showCreate);
          }}
        >
          {showCreate ? 'Cancel' : 'Add Webhook'}
        </Button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-surface rounded border border-border">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Text as="label" size="sm" tone="muted">
                Endpoint URL
              </Text>
              <Input
                placeholder="https://example.com/webhook"
                value={newUrl}
                onChange={(e: { target: { value: string } }) => {
                  setNewUrl(e.target.value);
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Text as="label" size="sm" tone="muted">
                Events
              </Text>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <Checkbox
                    key={event}
                    checked={selectedEvents.includes(event)}
                    onChange={() => {
                      handleEventToggle(event);
                    }}
                    label={<Text size="sm">{event}</Text>}
                  />
                ))}
              </div>
            </div>
          </div>

          {createWebhook.error !== null && (
            <Alert tone="danger" className="mt-2">
              {createWebhook.error.message}
            </Alert>
          )}

          <Button
            type="button"
            variant="primary"
            size="small"
            className="mt-3"
            onClick={handleCreate}
            disabled={
              createWebhook.isLoading || newUrl.trim() === '' || selectedEvents.length === 0
            }
          >
            {createWebhook.isLoading ? 'Creating...' : 'Create Webhook'}
          </Button>
        </div>
      )}

      {webhooks.length === 0 ? (
        <EmptyState
          title="No webhooks configured"
          description="Add a webhook to receive event notifications"
          action={{
            label: 'Add Webhook',
            onClick: () => {
              setShowCreate(true);
            },
          }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((webhook: WebhookItem) => (
              <TableRow key={webhook.id} className="hover-row">
                <TableCell>
                  <Text
                    size="sm"
                    className="font-mono cursor-pointer"
                    onClick={() => {
                      setSelectedWebhookId(webhook.id);
                    }}
                  >
                    {webhook.url}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" tone="muted">
                    {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''}
                  </Text>
                </TableCell>
                <TableCell>
                  <Badge tone={webhook.isActive ? 'success' : 'warning'}>
                    {webhook.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      onClick={() => {
                        setSelectedWebhookId(webhook.id);
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
                        void deleteWebhook.remove(webhook.id);
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

      {selectedWebhookId !== null && (
        <WebhookDetailView
          webhookId={selectedWebhookId}
          clientConfig={clientConfig}
          open
          onClose={() => {
            setSelectedWebhookId(null);
          }}
          onUpdated={() => {
            void refresh();
          }}
        />
      )}
    </div>
  );
};
