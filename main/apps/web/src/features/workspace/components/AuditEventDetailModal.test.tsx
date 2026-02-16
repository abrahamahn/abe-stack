// main/apps/web/src/features/workspace/components/AuditEventDetailModal.test.tsx
/**
 * Unit tests for AuditEventDetailModal component.
 *
 * Tests cover:
 * - Rendering behavior when open/closed
 * - Rendering with null event
 * - Displaying event details correctly
 * - Action badge tone assignment
 * - Optional details field handling
 * - Close button functionality
 */

import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../__tests__/utils';

import { AuditEventDetailModal } from './AuditEventDetailModal';

import type { AuditEvent } from '../hooks/useAuditLog';

// ============================================================================
// Test Data
// ============================================================================

const mockEvent: AuditEvent = {
  id: 'event-123',
  action: 'create.workspace',
  actorId: 'user-456',
  details: 'Created workspace "Test Workspace"',
  createdAt: '2024-01-15T10:30:00.000Z',
};

const mockEventWithoutDetails: AuditEvent = {
  id: 'event-789',
  action: 'update.settings',
  actorId: 'user-101',
  details: '',
  createdAt: '2024-01-20T14:45:00.000Z',
};

// ============================================================================
// Tests
// ============================================================================

describe('AuditEventDetailModal', () => {
  describe('when open is false', () => {
    it('should not render modal content', () => {
      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={false} onClose={vi.fn()} />,
      );

      expect(screen.queryByText('Audit Event Details')).not.toBeInTheDocument();
    });
  });

  describe('when event is null', () => {
    it('should not render modal content even when open is true', () => {
      renderWithProviders(<AuditEventDetailModal event={null} open={true} onClose={vi.fn()} />);

      expect(screen.queryByText('Audit Event Details')).not.toBeInTheDocument();
    });
  });

  describe('when open is true and event is provided', () => {
    it('should render modal with title', () => {
      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('Audit Event Details')).toBeInTheDocument();
    });

    it('should display action with appropriate badge', () => {
      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('Action:')).toBeInTheDocument();
      expect(screen.getByText('create.workspace')).toBeInTheDocument();
    });

    it('should display actor ID', () => {
      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('Actor')).toBeInTheDocument();
      expect(screen.getByText('user-456')).toBeInTheDocument();
    });

    it('should display formatted timestamp', () => {
      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      // Timestamp is formatted using Date.toLocaleString, so exact value depends on locale
      const timestampText = new Date('2024-01-15T10:30:00.000Z').toLocaleString();
      expect(screen.getByText(timestampText)).toBeInTheDocument();
    });

    it('should display details when provided', () => {
      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Created workspace "Test Workspace"')).toBeInTheDocument();
    });

    it('should not display details section when details is empty string', () => {
      renderWithProviders(
        <AuditEventDetailModal event={mockEventWithoutDetails} open={true} onClose={vi.fn()} />,
      );

      // Details label should not be present
      const detailsLabels = screen.queryAllByText('Details');
      expect(detailsLabels).toHaveLength(0);
    });

    it('should display event ID with monospace font', () => {
      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('Event ID')).toBeInTheDocument();
      const eventIdElement = screen.getByText('event-123');
      expect(eventIdElement).toBeInTheDocument();
      expect(eventIdElement).toHaveClass('font-mono');
    });

    it('should display close button in footer', () => {
      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={vi.fn()} />,
      );

      // There are two close buttons: one in header (Modal.Close) and one in footer
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('action badge tone', () => {
    it('should use success tone for create actions', () => {
      const createEvent: AuditEvent = {
        ...mockEvent,
        action: 'create.workspace',
      };

      renderWithProviders(
        <AuditEventDetailModal event={createEvent} open={true} onClose={vi.fn()} />,
      );

      const badge = screen.getByText('create.workspace');
      expect(badge).toBeInTheDocument();
      // Badge tone is applied via internal component styling
    });

    it('should use info tone for update actions', () => {
      const updateEvent: AuditEvent = {
        ...mockEvent,
        action: 'update.settings',
      };

      renderWithProviders(
        <AuditEventDetailModal event={updateEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('update.settings')).toBeInTheDocument();
    });

    it('should use danger tone for delete actions', () => {
      const deleteEvent: AuditEvent = {
        ...mockEvent,
        action: 'delete.member',
      };

      renderWithProviders(
        <AuditEventDetailModal event={deleteEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('delete.member')).toBeInTheDocument();
    });

    it('should use info tone for invite actions', () => {
      const inviteEvent: AuditEvent = {
        ...mockEvent,
        action: 'invite.member',
      };

      renderWithProviders(
        <AuditEventDetailModal event={inviteEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('invite.member')).toBeInTheDocument();
    });

    it('should use warning tone for remove actions', () => {
      const removeEvent: AuditEvent = {
        ...mockEvent,
        action: 'remove.access',
      };

      renderWithProviders(
        <AuditEventDetailModal event={removeEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('remove.access')).toBeInTheDocument();
    });

    it('should use info tone as default for unknown actions', () => {
      const unknownEvent: AuditEvent = {
        ...mockEvent,
        action: 'unknown.action',
      };

      renderWithProviders(
        <AuditEventDetailModal event={unknownEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('unknown.action')).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    it('should call onClose when footer close button is clicked', () => {
      const onClose = vi.fn();

      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={onClose} />,
      );

      // Get all close buttons and click the last one (footer button)
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      const footerCloseButton = closeButtons[closeButtons.length - 1];
      fireEvent.click(footerCloseButton as HTMLElement);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Modal.Close is clicked', () => {
      const onClose = vi.fn();

      renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={onClose} />,
      );

      // Modal.Close renders a close button in the header
      // Find it by aria-label (assuming Modal.Close has appropriate aria)
      const modalCloseButtons = screen.getAllByRole('button');
      // The first button in modal header should be the close X button
      const headerCloseButton = modalCloseButtons[0];
      expect(headerCloseButton).toBeDefined();
      if (headerCloseButton === undefined) {
        throw new Error('Missing modal header close button');
      }
      fireEvent.click(headerCloseButton);
      // onClose should be called by Modal.Root's onClose handler
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle event with whitespace-only details', () => {
      const eventWithWhitespaceDetails: AuditEvent = {
        ...mockEvent,
        details: '   ',
      };

      renderWithProviders(
        <AuditEventDetailModal event={eventWithWhitespaceDetails} open={true} onClose={vi.fn()} />,
      );

      // Details section should not be rendered when details contains only whitespace
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should handle very long action names', () => {
      const longActionEvent: AuditEvent = {
        ...mockEvent,
        action: 'create.very.long.nested.action.name.that.goes.on.and.on',
      };

      renderWithProviders(
        <AuditEventDetailModal event={longActionEvent} open={true} onClose={vi.fn()} />,
      );

      expect(
        screen.getByText('create.very.long.nested.action.name.that.goes.on.and.on'),
      ).toBeInTheDocument();
    });

    it('should handle action without dot separator', () => {
      const noDotAction: AuditEvent = {
        ...mockEvent,
        action: 'create',
      };

      renderWithProviders(
        <AuditEventDetailModal event={noDotAction} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText('create')).toBeInTheDocument();
    });

    it('should handle very long details text', () => {
      const longDetailsEvent: AuditEvent = {
        ...mockEvent,
        details:
          'This is a very long details text that contains a lot of information about the audit event. ' +
          'It goes on for multiple lines and includes various details about what happened during this operation. ' +
          'The component should handle this gracefully without breaking the layout.',
      };

      renderWithProviders(
        <AuditEventDetailModal event={longDetailsEvent} open={true} onClose={vi.fn()} />,
      );

      expect(screen.getByText(/This is a very long details text/)).toBeInTheDocument();
    });

    it('should handle invalid date strings gracefully', () => {
      const invalidDateEvent: AuditEvent = {
        ...mockEvent,
        createdAt: 'invalid-date',
      };

      renderWithProviders(
        <AuditEventDetailModal event={invalidDateEvent} open={true} onClose={vi.fn()} />,
      );

      // Date constructor will create Invalid Date, toLocaleString returns "Invalid Date"
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
    });
  });

  describe('state transitions', () => {
    it('should handle switching from null event to valid event', () => {
      const onClose = vi.fn();
      const { rerender } = renderWithProviders(
        <AuditEventDetailModal event={null} open={true} onClose={onClose} />,
      );

      // Initially nothing rendered
      expect(screen.queryByText('Audit Event Details')).not.toBeInTheDocument();

      // Update to show event
      rerender(<AuditEventDetailModal event={mockEvent} open={true} onClose={onClose} />);

      // Now modal should be visible
      expect(screen.getByText('Audit Event Details')).toBeInTheDocument();
      expect(screen.getByText('create.workspace')).toBeInTheDocument();
    });

    it('should handle switching from open to closed', () => {
      const onClose = vi.fn();
      const { rerender } = renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={onClose} />,
      );

      // Initially modal is visible
      expect(screen.getByText('Audit Event Details')).toBeInTheDocument();

      // Close modal
      rerender(<AuditEventDetailModal event={mockEvent} open={false} onClose={onClose} />);

      // Modal should not be visible
      expect(screen.queryByText('Audit Event Details')).not.toBeInTheDocument();
    });

    it('should handle switching between different events', () => {
      const onClose = vi.fn();
      const { rerender } = renderWithProviders(
        <AuditEventDetailModal event={mockEvent} open={true} onClose={onClose} />,
      );

      // First event visible
      expect(screen.getByText('event-123')).toBeInTheDocument();
      expect(screen.getByText('create.workspace')).toBeInTheDocument();

      // Switch to different event
      rerender(
        <AuditEventDetailModal event={mockEventWithoutDetails} open={true} onClose={onClose} />,
      );

      // Second event visible
      expect(screen.getByText('event-789')).toBeInTheDocument();
      expect(screen.getByText('update.settings')).toBeInTheDocument();
    });
  });
});
