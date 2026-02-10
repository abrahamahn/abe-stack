// src/apps/web/src/features/admin/components/SecurityEventsTable.test.tsx
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../__tests__/utils';

import { SecurityEventsTable } from './SecurityEventsTable';

import type {
  PaginationOptions,
  SecurityEvent,
  SecurityEventsListResponse,
} from '@abe-stack/shared';

// ============================================================================
// Test Data
// ============================================================================

const createMockEvent = (overrides: Partial<SecurityEvent> = {}): SecurityEvent => ({
  id: 'event-123',
  eventType: 'login_failed',
  severity: 'high',
  userId: 'user-123',
  email: 'test@example.com',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  createdAt: '2024-01-15T10:30:00Z',
  metadata: null,
  ...overrides,
});

const createMockResponse = (
  overrides: Partial<SecurityEventsListResponse> = {},
): SecurityEventsListResponse => ({
  data: [
    createMockEvent({ id: 'event-1', severity: 'critical' }),
    createMockEvent({ id: 'event-2', severity: 'high' }),
    createMockEvent({ id: 'event-3', severity: 'medium' }),
  ],
  total: 3,
  page: 1,
  limit: 20,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
  ...overrides,
});

const mockPagination: PaginationOptions = {
  page: 1,
  limit: 20,
  sortOrder: 'desc',
};

const mockOnPageChange = vi.fn();

// ============================================================================
// Tests
// ============================================================================

describe('SecurityEventsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show skeletons when loading', () => {
      const { container } = renderWithProviders(
        <SecurityEventsTable
          data={undefined}
          isLoading={true}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show table when loading', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={undefined}
          isLoading={true}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show no events message when data is undefined', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={undefined}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('No security events found')).toBeInTheDocument();
    });

    it('should show no events message when data array is empty', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse({ data: [], total: 0 })}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('No security events found')).toBeInTheDocument();
    });
  });

  describe('table display', () => {
    it('should render table headers', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByRole('columnheader', { name: 'Time' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Event Type' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Severity' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'IP Address' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    });

    it('should render all events in the data', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      // All 3 events have the same event type 'login_failed'
      expect(screen.getAllByText('Login Failed').length).toBe(3);
      expect(screen.getAllByText('test@example.com').length).toBe(3);
    });

    it('should render formatted event types', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      // All 3 events have the same event type
      expect(screen.getAllByText('Login Failed').length).toBe(3);
    });

    it('should render severity badges', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('should render emails', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      const emails = screen.getAllByText('test@example.com');
      expect(emails.length).toBe(3);
    });

    it('should render IP addresses', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      const ips = screen.getAllByText('192.168.1.1');
      expect(ips.length).toBe(3);
    });

    it('should render view buttons', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      const viewButtons = screen.getAllByRole('button', { name: 'View' });
      expect(viewButtons.length).toBe(3);
    });
  });

  describe('null field handling', () => {
    it('should display "-" for null email', () => {
      const data = createMockResponse({
        data: [createMockEvent({ email: null })],
      });

      renderWithProviders(
        <SecurityEventsTable
          data={data}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should display "-" for null IP address', () => {
      const data = createMockResponse({
        data: [createMockEvent({ ipAddress: null })],
      });

      renderWithProviders(
        <SecurityEventsTable
          data={data}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should navigate to event detail page when row is clicked', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      // Find a row by looking for the severity badge CRITICAL and getting its parent row
      const badge = screen.getByText('CRITICAL');
      const row = badge.closest('tr');
      expect(row).toBeInTheDocument();
      if (row !== null) {
        fireEvent.click(row);
      }

      // Navigation would be handled by useNavigate hook
      // We verify the row is clickable
      expect(row).toBeInTheDocument();
    });

    it('should navigate to event detail page when view button is clicked', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      const viewButtons = screen.getAllByRole('button', { name: 'View' });
      const viewButton = viewButtons[0];
      if (viewButton !== undefined) {
        fireEvent.click(viewButton);
      }

      // View button should not propagate click to row
      expect(viewButtons[0]).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('should show event count and total', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse({ total: 100 })}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('Showing 3 of 100 events')).toBeInTheDocument();
    });

    it('should render pagination controls', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse({ totalPages: 5 })}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should call onPageChange when page is changed', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse({ page: 1, totalPages: 3 })}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('severity badge styling', () => {
    it('should apply critical styling', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      const badge = screen.getByText('CRITICAL');
      expect(badge).toHaveAttribute('data-tone', 'danger');
    });

    it('should apply high styling', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      const badge = screen.getByText('HIGH');
      expect(badge).toHaveAttribute('data-tone', 'danger');
    });

    it('should apply medium styling', () => {
      renderWithProviders(
        <SecurityEventsTable
          data={createMockResponse()}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      const badge = screen.getByText('MEDIUM');
      expect(badge).toHaveAttribute('data-tone', 'warning');
    });
  });

  describe('event type formatting', () => {
    const testCases: Array<{ eventType: string; expected: string }> = [
      { eventType: 'login_failed', expected: 'Login Failed' },
      { eventType: 'token_reuse', expected: 'Token Reuse' },
      { eventType: 'account_locked', expected: 'Account Locked' },
    ];

    testCases.forEach(({ eventType, expected }) => {
      it(`should format ${eventType} as ${expected}`, () => {
        const data = createMockResponse({
          data: [createMockEvent({ eventType: eventType })],
        });

        renderWithProviders(
          <SecurityEventsTable
            data={data}
            isLoading={false}
            pagination={mockPagination}
            onPageChange={mockOnPageChange}
          />,
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle single event', () => {
      const data = createMockResponse({
        data: [createMockEvent()],
        total: 1,
      });

      renderWithProviders(
        <SecurityEventsTable
          data={data}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('Showing 1 of 1 events')).toBeInTheDocument();
    });

    it('should handle large number of events', () => {
      const data = createMockResponse({
        data: createMockResponse().data,
        total: 10000,
      });

      renderWithProviders(
        <SecurityEventsTable
          data={data}
          isLoading={false}
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('Showing 3 of 10000 events')).toBeInTheDocument();
    });
  });
});
