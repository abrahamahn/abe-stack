// main/apps/web/src/features/settings/components/DataExportSection.test.tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { DataExportSection } from './DataExportSection';

import type { UseDataExportResult } from '../hooks/useDataExport';

// ============================================================================
// Mocks
// ============================================================================

const mockRequestExport = vi.fn();
const mockRefetch = vi.fn();

const defaultMockReturn: UseDataExportResult = {
  exportInfo: {
    status: 'none',
    requestedAt: null,
    estimatedReadyAt: null,
    downloadUrl: null,
    expiresAt: null,
  },
  isLoading: false,
  error: null,
  requestExport: mockRequestExport,
  isRequesting: false,
  requestError: null,
  refetch: mockRefetch,
};

vi.mock('../hooks/useDataExport', () => ({
  useDataExport: vi.fn(() => defaultMockReturn),
}));

const { useDataExport } = await import('../hooks/useDataExport');

// ============================================================================
// Tests
// ============================================================================

describe('DataExportSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDataExport).mockReturnValue(defaultMockReturn);
  });

  it('should render loading state', () => {
    vi.mocked(useDataExport).mockReturnValue({
      ...defaultMockReturn,
      isLoading: true,
      exportInfo: null,
    });

    render(<DataExportSection />);

    expect(screen.getByText(/Loading export status.../i)).toBeInTheDocument();
  });

  it('should render default state with request button', () => {
    render(<DataExportSection />);

    expect(screen.getByText('Export Your Data')).toBeInTheDocument();
    expect(screen.getByText(/Download a copy of all your personal data/i)).toBeInTheDocument();
    expect(screen.getByTestId('request-export-button')).toBeInTheDocument();
    expect(screen.getByTestId('request-export-button')).not.toBeDisabled();
    expect(screen.getByTestId('request-export-button')).toHaveTextContent('Request Export');
  });

  it('should show pending status with badge and alert', () => {
    vi.mocked(useDataExport).mockReturnValue({
      ...defaultMockReturn,
      exportInfo: {
        status: 'pending',
        requestedAt: '2026-02-12T10:00:00Z',
        estimatedReadyAt: '2026-02-12T11:00:00Z',
        downloadUrl: null,
        expiresAt: null,
      },
    });

    render(<DataExportSection />);

    expect(screen.getByTestId('export-status-badge')).toHaveTextContent('Processing');
    expect(screen.getByTestId('export-pending-alert')).toBeInTheDocument();
    expect(screen.getByTestId('request-export-button')).toBeDisabled();
    expect(screen.getByTestId('request-export-button')).toHaveTextContent('Export in Progress');
  });

  it('should show ready status with download button', () => {
    vi.mocked(useDataExport).mockReturnValue({
      ...defaultMockReturn,
      exportInfo: {
        status: 'ready',
        requestedAt: '2026-02-12T10:00:00Z',
        estimatedReadyAt: null,
        downloadUrl: 'https://example.com/export.zip',
        expiresAt: '2026-02-19T10:00:00Z',
      },
    });

    render(<DataExportSection />);

    expect(screen.getByTestId('export-status-badge')).toHaveTextContent('Ready');
    expect(screen.getByTestId('export-ready-alert')).toBeInTheDocument();
    expect(screen.getByTestId('download-export-button')).toBeInTheDocument();
    expect(screen.getByTestId('request-export-button')).not.toBeDisabled();
  });

  it('should show expired status with warning', () => {
    vi.mocked(useDataExport).mockReturnValue({
      ...defaultMockReturn,
      exportInfo: {
        status: 'expired',
        requestedAt: '2026-02-05T10:00:00Z',
        estimatedReadyAt: null,
        downloadUrl: null,
        expiresAt: '2026-02-12T10:00:00Z',
      },
    });

    render(<DataExportSection />);

    expect(screen.getByTestId('export-expired-alert')).toBeInTheDocument();
    expect(screen.getByTestId('request-export-button')).not.toBeDisabled();
  });

  it('should call requestExport when button is clicked', async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);

    await user.click(screen.getByTestId('request-export-button'));

    expect(mockRequestExport).toHaveBeenCalledTimes(1);
  });

  it('should show requesting state on button', () => {
    vi.mocked(useDataExport).mockReturnValue({
      ...defaultMockReturn,
      isRequesting: true,
    });

    render(<DataExportSection />);

    expect(screen.getByTestId('request-export-button')).toBeDisabled();
    expect(screen.getByTestId('request-export-button')).toHaveTextContent('Requesting...');
  });

  it('should display error message when fetch fails', () => {
    vi.mocked(useDataExport).mockReturnValue({
      ...defaultMockReturn,
      error: new Error('Failed to fetch export status'),
    });

    render(<DataExportSection />);

    expect(screen.getByTestId('export-error')).toHaveTextContent('Failed to fetch export status');
  });

  it('should display error message when request fails', () => {
    vi.mocked(useDataExport).mockReturnValue({
      ...defaultMockReturn,
      requestError: new Error('Export already in progress'),
    });

    render(<DataExportSection />);

    expect(screen.getByTestId('export-error')).toHaveTextContent('Export already in progress');
  });

  it('should open download URL in new tab when download button is clicked', async () => {
    const mockOpen = vi.fn();
    const originalOpen = window.open;
    window.open = mockOpen;

    vi.mocked(useDataExport).mockReturnValue({
      ...defaultMockReturn,
      exportInfo: {
        status: 'ready',
        requestedAt: '2026-02-12T10:00:00Z',
        estimatedReadyAt: null,
        downloadUrl: 'https://example.com/export.zip',
        expiresAt: '2026-02-19T10:00:00Z',
      },
    });

    const user = userEvent.setup();
    render(<DataExportSection />);

    await user.click(screen.getByTestId('download-export-button'));

    expect(mockOpen).toHaveBeenCalledWith(
      'https://example.com/export.zip',
      '_blank',
      'noopener,noreferrer',
    );

    window.open = originalOpen;
  });

  it('should not show status badge when status is none', () => {
    render(<DataExportSection />);

    expect(screen.queryByTestId('export-status-badge')).not.toBeInTheDocument();
  });
});
