// main/apps/web/src/features/admin/components/ExportDialog.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useExportEvents } from '../hooks/useExportEvents';

import { ExportDialog } from './ExportDialog';

import type { SecurityEventsFilter } from '@bslt/shared';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../hooks/useExportEvents', () => ({
  useExportEvents: vi.fn(),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockDownloadExport = vi.fn();
const mockFilter: SecurityEventsFilter = {
  eventType: 'login_failed',
  severity: 'high',
};

const createMockHookReturn = (overrides = {}) => ({
  downloadExport: mockDownloadExport,
  exportEvents: vi.fn(),
  isExporting: false,
  isError: false,
  error: null,
  data: null,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('ExportDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExportEvents).mockReturnValue(createMockHookReturn());
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<ExportDialog isOpen={false} onClose={mockOnClose} filter={{}} />);

      expect(screen.queryByText('Export Security Events')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.getByText('Export Security Events')).toBeInTheDocument();
    });

    it('should render modal description', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(
        screen.getByText('Export security events matching the current filters.'),
      ).toBeInTheDocument();
    });

    it('should render CSV radio option', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.getByLabelText('CSV')).toBeInTheDocument();
    });

    it('should render JSON radio option', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.getByLabelText('JSON')).toBeInTheDocument();
    });

    it('should have CSV selected by default', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const csvRadio = screen.getByLabelText('CSV');
      expect(csvRadio).toHaveProperty('checked', true);
    });

    it('should render cancel button', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should render export button', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    });

    it('should render note about export limit', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.getByText(/Exports are limited to 10,000 events maximum/i)).toBeInTheDocument();
    });
  });

  describe('format selection', () => {
    it('should allow selecting JSON format', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const jsonRadio = screen.getByLabelText('JSON');
      fireEvent.click(jsonRadio);

      expect(jsonRadio).toHaveProperty('checked', true);
    });

    it('should allow switching between formats', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const csvRadio = screen.getByLabelText('CSV');
      const jsonRadio = screen.getByLabelText('JSON');

      fireEvent.click(jsonRadio);
      expect(jsonRadio).toHaveProperty('checked', true);
      expect(csvRadio).toHaveProperty('checked', false);

      fireEvent.click(csvRadio);
      expect((csvRadio as HTMLInputElement).checked).toBe(true);
      expect((jsonRadio as HTMLInputElement).checked).toBe(false);
    });
  });

  describe('filter notification', () => {
    it('should show active filters notice when filters are present', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={mockFilter} />);

      expect(screen.getByText('Active filters will be applied to the export.')).toBeInTheDocument();
    });

    it('should not show active filters notice when no filters', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(
        screen.queryByText('Active filters will be applied to the export.'),
      ).not.toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    it('should call downloadExport with CSV format when export button is clicked', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const exportButton = screen.getByRole('button', { name: 'Export' });
      fireEvent.click(exportButton);

      expect(mockDownloadExport).toHaveBeenCalledWith('csv', {});
    });

    it('should call downloadExport with JSON format when selected', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const jsonRadio = screen.getByLabelText('JSON');
      fireEvent.click(jsonRadio);

      const exportButton = screen.getByRole('button', { name: 'Export' });
      fireEvent.click(exportButton);

      expect(mockDownloadExport).toHaveBeenCalledWith('json', {});
    });

    it('should pass filters to downloadExport', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={mockFilter} />);

      const exportButton = screen.getByRole('button', { name: 'Export' });
      fireEvent.click(exportButton);

      expect(mockDownloadExport).toHaveBeenCalledWith('csv', mockFilter);
    });

    it('should close dialog after export', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const exportButton = screen.getByRole('button', { name: 'Export' });
      fireEvent.click(exportButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel functionality', () => {
    it('should close dialog when cancel button is clicked', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call downloadExport when canceled', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockDownloadExport).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should disable export button when isExporting is true', () => {
      vi.mocked(useExportEvents).mockReturnValue(createMockHookReturn({ isExporting: true }));

      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const exportButton = screen.getByRole('button', { name: /Exporting/i });
      expect(exportButton).toBeDisabled();
    });

    it('should show "Exporting..." text when exporting', () => {
      vi.mocked(useExportEvents).mockReturnValue(createMockHookReturn({ isExporting: true }));

      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.getByText('Exporting...')).toBeInTheDocument();
    });

    it('should not disable cancel button when exporting', () => {
      vi.mocked(useExportEvents).mockReturnValue(createMockHookReturn({ isExporting: true }));

      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('error state', () => {
    it('should display error message when isError is true', () => {
      vi.mocked(useExportEvents).mockReturnValue(
        createMockHookReturn({
          isError: true,
          error: new Error('Export failed'),
        }),
      );

      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.getByText(/Export failed: Export failed/i)).toBeInTheDocument();
    });

    it('should display unknown error message when error is null', () => {
      vi.mocked(useExportEvents).mockReturnValue(
        createMockHookReturn({
          isError: true,
          error: null,
        }),
      );

      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.getByText(/Export failed: Unknown error/i)).toBeInTheDocument();
    });

    it('should not display error message when isError is false', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      expect(screen.queryByText(/Export failed/i)).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty filter object', () => {
      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={{}} />);

      const exportButton = screen.getByRole('button', { name: 'Export' });
      fireEvent.click(exportButton);

      expect(mockDownloadExport).toHaveBeenCalledWith('csv', {});
    });

    it('should handle multiple filter properties', () => {
      const complexFilter: SecurityEventsFilter = {
        eventType: 'login_failed',
        severity: 'critical',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      };

      render(<ExportDialog isOpen={true} onClose={mockOnClose} filter={complexFilter} />);

      const exportButton = screen.getByRole('button', { name: 'Export' });
      fireEvent.click(exportButton);

      expect(mockDownloadExport).toHaveBeenCalledWith('csv', complexFilter);
    });
  });
});
