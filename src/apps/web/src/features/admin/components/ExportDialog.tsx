// apps/web/src/features/admin/components/ExportDialog.tsx
/**
 * ExportDialog Component
 *
 * Dialog for exporting security events as CSV or JSON.
 */

import { Button, Modal, Radio, RadioGroup, Text } from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import { useExportEvents } from '../hooks/useExportEvents';

import type { SecurityEventsFilter } from '@abe-stack/shared';
import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filter: SecurityEventsFilter;
}

// ============================================================================
// Component
// ============================================================================

export const ExportDialog = ({ isOpen, onClose, filter }: ExportDialogProps): JSX.Element => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const { downloadExport, isExporting, isError, error } = useExportEvents();

  const handleExport = useCallback(() => {
    downloadExport(selectedFormat, filter);
    onClose();
  }, [selectedFormat, filter, downloadExport, onClose]);

  return (
    <Modal.Root open={isOpen} onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Export Security Events</Modal.Title>
        <Modal.Description>Export security events matching the current filters.</Modal.Description>
      </Modal.Header>

      <Modal.Body>
        <div className="py-4 space-y-4">
          <div>
            <Text className="mb-2 font-medium">Select Format</Text>
            <RadioGroup
              name="format"
              value={selectedFormat}
              onValueChange={(value) => {
                setSelectedFormat(value as 'csv' | 'json');
              }}
              aria-label="Export format"
              className="flex gap-4"
            >
              <Radio value="csv" label="CSV" />
              <Radio value="json" label="JSON" />
            </RadioGroup>
          </div>

          {Object.keys(filter as Record<string, unknown>).length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <Text size="sm" tone="muted">
                Active filters will be applied to the export.
              </Text>
            </div>
          )}

          {isError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-3">
              <Text size="sm">Export failed: {error?.message ?? 'Unknown error'}</Text>
            </div>
          )}

          <Text size="sm" tone="muted">
            Note: Exports are limited to 10,000 events maximum.
          </Text>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  );
};
