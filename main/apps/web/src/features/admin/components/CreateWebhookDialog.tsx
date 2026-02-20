// main/apps/web/src/features/admin/components/CreateWebhookDialog.tsx
/**
 * CreateWebhookDialog
 *
 * Modal dialog for creating a new webhook subscription.
 * Collects URL, event types, and optional secret override.
 */

import { SUBSCRIBABLE_EVENT_TYPES } from '@bslt/shared';
import { Alert, Button, Checkbox, Input, Modal, Text } from '@bslt/ui';
import { useCallback, useState } from 'react';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface CreateWebhookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { url: string; events: string[] }) => void;
  isCreating: boolean;
  error: Error | null;
}

// ============================================================================
// Component
// ============================================================================

export const CreateWebhookDialog = ({
  isOpen,
  onClose,
  onCreate,
  isCreating,
  error,
}: CreateWebhookDialogProps): JSX.Element => {
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const handleToggleEvent = useCallback((event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedEvents((prev) =>
      prev.length === SUBSCRIBABLE_EVENT_TYPES.length ? [] : [...SUBSCRIBABLE_EVENT_TYPES],
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (url.trim() === '' || selectedEvents.length === 0) return;
    onCreate({ url: url.trim(), events: selectedEvents });
  }, [url, selectedEvents, onCreate]);

  const handleClose = useCallback(() => {
    setUrl('');
    setSelectedEvents([]);
    onClose();
  }, [onClose]);

  return (
    <Modal.Root open={isOpen} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title>Create Webhook</Modal.Title>
        <Modal.Description>
          Configure a new webhook endpoint to receive event notifications.
        </Modal.Description>
      </Modal.Header>

      <Modal.Body>
        <div className="py-4 space-y-4">
          {/* URL Field */}
          <div className="flex flex-col gap-1">
            <Text as="label" size="sm" tone="muted">
              Endpoint URL
            </Text>
            <Input
              placeholder="https://example.com/webhooks"
              value={url}
              onChange={(e: { target: { value: string } }) => {
                setUrl(e.target.value);
              }}
            />
            <Text size="sm" tone="muted">
              Must be a valid HTTPS URL.
            </Text>
          </div>

          {/* Event Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Text as="label" size="sm" tone="muted">
                Events to subscribe
              </Text>
              <Button type="button" variant="text" size="small" onClick={handleSelectAll}>
                {selectedEvents.length === SUBSCRIBABLE_EVENT_TYPES.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto border border-border rounded p-2 space-y-1">
              {SUBSCRIBABLE_EVENT_TYPES.map((event) => (
                <Checkbox
                  key={event}
                  checked={selectedEvents.includes(event)}
                  onChange={() => {
                    handleToggleEvent(event);
                  }}
                  label={event}
                />
              ))}
            </div>
            <Text size="sm" tone="muted">
              {String(selectedEvents.length)} event(s) selected
            </Text>
          </div>

          {/* Error */}
          {error !== null && <Alert tone="danger">{error.message}</Alert>}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isCreating || url.trim() === '' || selectedEvents.length === 0}
        >
          {isCreating ? 'Creating...' : 'Create Webhook'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
};
