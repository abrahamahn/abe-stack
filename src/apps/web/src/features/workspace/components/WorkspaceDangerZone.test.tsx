// src/apps/web/src/features/workspace/components/WorkspaceDangerZone.test.tsx
/**
 * Tests for WorkspaceDangerZone component.
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../hooks', () => ({
  useDeleteWorkspace: vi.fn(),
}));

type SudoModalMockProps = {
  open: boolean;
  onSuccess: (token: string) => void;
  onDismiss: () => void;
};

vi.mock('../../settings/components/SudoModal', () => ({
  SudoModal: vi.fn(({ open, onSuccess, onDismiss }: SudoModalMockProps) => {
    if (!open) return null;
    return (
      <div data-testid="sudo-modal">
        <button
          data-testid="sudo-success"
          onClick={() => {
            onSuccess('mock-sudo-token');
          }}
        >
          Sudo Success
        </button>
        <button data-testid="sudo-dismiss" onClick={onDismiss}>
          Sudo Dismiss
        </button>
      </div>
    );
  }),
}));

import { useDeleteWorkspace } from '../hooks';

import { WorkspaceDangerZone } from './WorkspaceDangerZone';

// ============================================================================
// Test Setup
// ============================================================================

const mockWorkspace = {
  id: 'workspace-1',
  name: 'Test Workspace',
};

const defaultHookReturn = {
  remove: vi.fn(),
  isLoading: false,
  error: null,
  reset: vi.fn(),
};

// ============================================================================
// Tests
// ============================================================================

describe('WorkspaceDangerZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDeleteWorkspace).mockReturnValue(defaultHookReturn);
  });

  describe('initial render', () => {
    it('should render danger zone card with workspace name', () => {
      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      expect(screen.getByRole('heading', { name: 'Delete Workspace' })).toBeInTheDocument();
      expect(screen.getByText(/Test Workspace/)).toBeInTheDocument();
      expect(screen.getByText(/Permanently delete/)).toBeInTheDocument();
      expect(screen.getByText(/and all its data/)).toBeInTheDocument();
      expect(screen.getByTestId('delete-workspace-button')).toHaveTextContent('Delete Workspace');
    });

    it('should not show confirmation alert initially', () => {
      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      expect(screen.queryByTestId('delete-workspace-confirm')).not.toBeInTheDocument();
    });

    it('should not show sudo modal initially', () => {
      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      expect(screen.queryByTestId('sudo-modal')).not.toBeInTheDocument();
    });
  });

  describe('two-step deletion flow', () => {
    it('should show confirmation alert after first click on delete button', async () => {
      const user = userEvent.setup();

      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      const deleteButton = screen.getByTestId('delete-workspace-button');
      await user.click(deleteButton);

      expect(screen.getByTestId('delete-workspace-confirm')).toBeInTheDocument();
      expect(screen.getByTestId('delete-workspace-confirm')).toHaveTextContent(
        /Are you sure\?.*permanently delete.*workspace.*members/i,
      );
      expect(deleteButton).toHaveTextContent('Confirm Delete Workspace');
    });

    it('should open sudo modal after second click on delete button', async () => {
      const user = userEvent.setup();

      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      const deleteButton = screen.getByTestId('delete-workspace-button');

      // First click shows confirmation
      await user.click(deleteButton);
      expect(screen.getByTestId('delete-workspace-confirm')).toBeInTheDocument();

      // Second click opens sudo modal
      await user.click(deleteButton);
      expect(screen.getByTestId('sudo-modal')).toBeInTheDocument();
    });

    it('should call remove function and onDeleted callback after sudo success', async () => {
      const user = userEvent.setup();
      const mockRemove = vi.fn();
      const mockOnDeleted = vi.fn();

      // Mock the hook to call onSuccess when remove is triggered
      vi.mocked(useDeleteWorkspace).mockImplementation((options) => {
        return {
          ...defaultHookReturn,
          remove: (id: string) => {
            mockRemove(id);
            options?.onSuccess?.();
          },
        };
      });

      render(
        <WorkspaceDangerZone
          workspaceId={mockWorkspace.id}
          workspaceName={mockWorkspace.name}
          onDeleted={mockOnDeleted}
        />,
      );

      // First click shows confirmation
      await user.click(screen.getByTestId('delete-workspace-button'));

      // Second click opens sudo modal
      await user.click(screen.getByTestId('delete-workspace-button'));

      // Sudo success triggers deletion
      await user.click(screen.getByTestId('sudo-success'));

      expect(mockRemove).toHaveBeenCalledWith(mockWorkspace.id);
      expect(mockOnDeleted).toHaveBeenCalledTimes(1);
    });

    it('should reset state when sudo modal is dismissed', async () => {
      const user = userEvent.setup();

      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      // First click shows confirmation
      await user.click(screen.getByTestId('delete-workspace-button'));
      expect(screen.getByTestId('delete-workspace-confirm')).toBeInTheDocument();

      // Second click opens sudo modal
      await user.click(screen.getByTestId('delete-workspace-button'));
      expect(screen.getByTestId('sudo-modal')).toBeInTheDocument();

      // Dismiss sudo modal
      await user.click(screen.getByTestId('sudo-dismiss'));

      // State should be reset - no confirmation, no sudo modal
      expect(screen.queryByTestId('delete-workspace-confirm')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sudo-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('delete-workspace-button')).toHaveTextContent('Delete Workspace');
    });
  });

  describe('loading state', () => {
    it('should show loading text when deletion is in progress', () => {
      vi.mocked(useDeleteWorkspace).mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
      });

      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      const deleteButton = screen.getByTestId('delete-workspace-button');
      expect(deleteButton).toHaveTextContent('Deleting...');
      expect(deleteButton).toBeDisabled();
    });

    it('should disable delete button while loading', () => {
      vi.mocked(useDeleteWorkspace).mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
      });

      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      expect(screen.getByTestId('delete-workspace-button')).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should display error message when deletion fails', () => {
      const mockError = new Error('Failed to delete workspace: Permission denied');

      vi.mocked(useDeleteWorkspace).mockReturnValue({
        ...defaultHookReturn,
        error: mockError,
      });

      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      expect(screen.getByText('Failed to delete workspace: Permission denied')).toBeInTheDocument();
    });

    it('should not display error alert when error is null', () => {
      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      const alerts = screen.queryAllByRole('alert');
      expect(alerts).toHaveLength(0);
    });
  });

  describe('onDeleted callback', () => {
    it('should call onDeleted when deletion succeeds', () => {
      const mockOnDeleted = vi.fn();
      const mockOnSuccess = vi.fn();

      vi.mocked(useDeleteWorkspace).mockImplementation((options) => {
        mockOnSuccess.mockImplementation(() => {
          options?.onSuccess?.();
        });
        return {
          ...defaultHookReturn,
          remove: mockOnSuccess,
        };
      });

      render(
        <WorkspaceDangerZone
          workspaceId={mockWorkspace.id}
          workspaceName={mockWorkspace.name}
          onDeleted={mockOnDeleted}
        />,
      );

      // Trigger the onSuccess callback
      const hookOptions = vi.mocked(useDeleteWorkspace).mock.calls[0]?.[0];
      hookOptions?.onSuccess?.();

      expect(mockOnDeleted).toHaveBeenCalledTimes(1);
    });

    it('should not throw when onDeleted is not provided', () => {
      const mockOnSuccess = vi.fn();

      vi.mocked(useDeleteWorkspace).mockImplementation((options) => {
        mockOnSuccess.mockImplementation(() => {
          options?.onSuccess?.();
        });
        return {
          ...defaultHookReturn,
          remove: mockOnSuccess,
        };
      });

      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      // Trigger the onSuccess callback without onDeleted prop
      const hookOptions = vi.mocked(useDeleteWorkspace).mock.calls[0]?.[0];
      expect(() => hookOptions?.onSuccess?.()).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have proper button type', () => {
      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      const deleteButton = screen.getByTestId('delete-workspace-button');
      expect(deleteButton).toHaveAttribute('type', 'button');
    });

    it('should use strong tag to highlight workspace name', () => {
      render(
        <WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={mockWorkspace.name} />,
      );

      const strongElement = screen.getByText(mockWorkspace.name);
      expect(strongElement.tagName).toBe('STRONG');
    });
  });

  describe('edge cases', () => {
    it('should handle empty workspace name', () => {
      render(<WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName="" />);

      expect(screen.getByText(/Permanently delete/)).toBeInTheDocument();
    });

    it('should handle special characters in workspace name', () => {
      const specialName = 'Test <Workspace> & "Quotes"';
      render(<WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={specialName} />);

      expect(screen.getByText(specialName)).toBeInTheDocument();
    });

    it('should handle very long workspace names', () => {
      const longName = 'A'.repeat(200);
      render(<WorkspaceDangerZone workspaceId={mockWorkspace.id} workspaceName={longName} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });
  });
});
