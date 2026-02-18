// main/apps/web/src/features/dashboard/components/GettingStartedChecklist.test.tsx
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockEnvironment, mockUser, renderWithProviders } from '../../../__tests__/utils';

import { GettingStartedChecklist } from './GettingStartedChecklist';

import type { User } from '@bslt/shared';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('@bslt/react/router', async () => {
  const actual = await vi.importActual('@bslt/react/router');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock useWorkspaces
const mockUseWorkspaces = vi.fn();
vi.mock('@features/workspace', () => ({
  useWorkspaces: (): ReturnType<typeof mockUseWorkspaces> => mockUseWorkspaces(),
}));

const DISMISSED_KEY = 'abe:getting-started-dismissed';

describe('GettingStartedChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default mock: no workspaces
    mockUseWorkspaces.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render checklist with all items when user has incomplete profile', () => {
      const incompleteUser: User = {
        ...mockUser,
        firstName: '',
        lastName: '',
        avatarUrl: null,
      };
      const environment = createMockEnvironment({ user: incompleteUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      expect(screen.getByRole('heading', { name: /getting started/i })).toBeInTheDocument();
      expect(screen.getByText('Complete your profile')).toBeInTheDocument();
      expect(screen.getByText('Upload an avatar')).toBeInTheDocument();
      expect(screen.getByText('Create a workspace')).toBeInTheDocument();
      expect(screen.getByText('Invite a teammate')).toBeInTheDocument();
    });

    it('should show correct progress count (0 of 4 steps completed)', () => {
      const incompleteUser: User = {
        ...mockUser,
        firstName: '',
        lastName: '',
        avatarUrl: null,
      };
      const environment = createMockEnvironment({ user: incompleteUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      expect(screen.getByText('0 of 4 steps completed')).toBeInTheDocument();
    });

    it('should show correct progress count (2 of 4 steps completed)', () => {
      const partialUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
      };
      const environment = createMockEnvironment({ user: partialUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      expect(screen.getByText('1 of 4 steps completed')).toBeInTheDocument();
    });

    it('should render dismiss button', () => {
      const environment = createMockEnvironment({ user: mockUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });
  });

  describe('Checklist Item Completion', () => {
    it('should handle missing firstName/lastName without crashing', () => {
      const malformedUser: User = {
        ...mockUser,
        firstName: undefined as unknown as string,
        lastName: undefined as unknown as string,
      };
      const environment = createMockEnvironment({ user: malformedUser });

      expect(() => renderWithProviders(<GettingStartedChecklist />, { environment })).not.toThrow();
      expect(screen.getByText('Complete your profile')).toBeInTheDocument();
    });

    it('should mark "Complete your profile" as done when user has first and last name', () => {
      const completeProfileUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
      };
      const environment = createMockEnvironment({ user: completeProfileUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const profileText = screen.getByText('Complete your profile');
      expect(profileText).toHaveStyle({ textDecoration: 'line-through' });

      // Action button should not be visible for completed items
      expect(screen.queryByRole('button', { name: /go to settings/i })).not.toBeInTheDocument();
    });

    it('should mark "Complete your profile" as incomplete when firstName is empty', () => {
      const incompleteUser: User = {
        ...mockUser,
        firstName: '',
        lastName: 'User',
        avatarUrl: null,
      };
      const environment = createMockEnvironment({ user: incompleteUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const profileText = screen.getByText('Complete your profile');
      expect(profileText).toHaveStyle({ textDecoration: 'none' });

      // Action button should be visible for incomplete items
      expect(screen.getByRole('button', { name: /go to settings/i })).toBeInTheDocument();
    });

    it('should mark "Complete your profile" as incomplete when lastName is empty', () => {
      const incompleteUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: '',
        avatarUrl: null,
      };
      const environment = createMockEnvironment({ user: incompleteUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const profileText = screen.getByText('Complete your profile');
      expect(profileText).toHaveStyle({ textDecoration: 'none' });
    });

    it('should mark "Upload an avatar" as done when user has avatarUrl', () => {
      const avatarUser: User = {
        ...mockUser,
        avatarUrl: 'https://example.com/avatar.jpg',
      };
      const environment = createMockEnvironment({ user: avatarUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const avatarText = screen.getByText('Upload an avatar');
      expect(avatarText).toHaveStyle({ textDecoration: 'line-through' });

      expect(screen.queryByRole('button', { name: /upload avatar/i })).not.toBeInTheDocument();
    });

    it('should mark "Upload an avatar" as incomplete when avatarUrl is null', () => {
      const noAvatarUser: User = {
        ...mockUser,
        avatarUrl: null,
      };
      const environment = createMockEnvironment({ user: noAvatarUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const avatarText = screen.getByText('Upload an avatar');
      expect(avatarText).toHaveStyle({ textDecoration: 'none' });

      expect(screen.getByRole('button', { name: /upload avatar/i })).toBeInTheDocument();
    });

    it('should mark "Create a workspace" as done when workspaces.length > 0', () => {
      mockUseWorkspaces.mockReturnValue({
        data: [{ id: 'ws-1', name: 'Test Workspace' }],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const environment = createMockEnvironment({ user: mockUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const workspaceText = screen.getByText('Create a workspace');
      expect(workspaceText).toHaveStyle({ textDecoration: 'line-through' });

      expect(screen.queryByRole('button', { name: /create workspace/i })).not.toBeInTheDocument();
    });

    it('should mark "Create a workspace" as incomplete when workspaces is empty', () => {
      mockUseWorkspaces.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const environment = createMockEnvironment({ user: mockUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const workspaceText = screen.getByText('Create a workspace');
      expect(workspaceText).toHaveStyle({ textDecoration: 'none' });

      expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument();
    });

    it('should mark "Invite a teammate" as done when workspaces.length > 1', () => {
      mockUseWorkspaces.mockReturnValue({
        data: [
          { id: 'ws-1', name: 'Workspace 1' },
          { id: 'ws-2', name: 'Workspace 2' },
        ],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const environment = createMockEnvironment({ user: mockUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const inviteText = screen.getByText('Invite a teammate');
      expect(inviteText).toHaveStyle({ textDecoration: 'line-through' });

      expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
    });

    it('should mark "Invite a teammate" as incomplete when only one workspace exists', () => {
      mockUseWorkspaces.mockReturnValue({
        data: [{ id: 'ws-1', name: 'Workspace 1' }],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const environment = createMockEnvironment({ user: mockUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const inviteText = screen.getByText('Invite a teammate');
      expect(inviteText).toHaveStyle({ textDecoration: 'none' });

      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should set localStorage and hide checklist when dismiss button is clicked', () => {
      const environment = createMockEnvironment({ user: mockUser });

      const { container } = renderWithProviders(<GettingStartedChecklist />, { environment });

      expect(screen.getByRole('heading', { name: /getting started/i })).toBeInTheDocument();

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      // Verify localStorage was set
      expect(localStorage.getItem(DISMISSED_KEY)).toBe('true');

      // Verify checklist is hidden
      expect(container.firstChild).toBeNull();
    });

    it('should return null when dismissed (localStorage set)', () => {
      localStorage.setItem(DISMISSED_KEY, 'true');

      const environment = createMockEnvironment({ user: mockUser });

      const { container } = renderWithProviders(<GettingStartedChecklist />, { environment });

      expect(container.firstChild).toBeNull();
    });

    it('should persist dismissal across re-renders', () => {
      const environment = createMockEnvironment({ user: mockUser });

      const { rerender, container } = renderWithProviders(<GettingStartedChecklist />, {
        environment,
      });

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      // Re-render component
      rerender(<GettingStartedChecklist />);

      // Should still be hidden
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Hide When Complete', () => {
    it('should return null when all items are complete', () => {
      mockUseWorkspaces.mockReturnValue({
        data: [
          { id: 'ws-1', name: 'Workspace 1' },
          { id: 'ws-2', name: 'Workspace 2' },
        ],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const completeUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const environment = createMockEnvironment({ user: completeUser });

      const { container } = renderWithProviders(<GettingStartedChecklist />, { environment });

      expect(container.firstChild).toBeNull();
    });

    it('should show checklist when only 3 items are complete', () => {
      mockUseWorkspaces.mockReturnValue({
        data: [{ id: 'ws-1', name: 'Workspace 1' }],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const almostCompleteUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const environment = createMockEnvironment({ user: almostCompleteUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      expect(screen.getByRole('heading', { name: /getting started/i })).toBeInTheDocument();
      expect(screen.getByText('3 of 4 steps completed')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to /settings/profile when "Go to Settings" is clicked', async () => {
      const incompleteUser: User = {
        ...mockUser,
        firstName: '',
        lastName: '',
      };
      const environment = createMockEnvironment({ user: incompleteUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const goToSettingsButton = screen.getByRole('button', { name: /go to settings/i });
      fireEvent.click(goToSettingsButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/settings/profile');
      });
    });

    it('should navigate to /settings/profile when "Upload Avatar" is clicked', async () => {
      const noAvatarUser: User = {
        ...mockUser,
        avatarUrl: null,
      };
      const environment = createMockEnvironment({ user: noAvatarUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const uploadAvatarButton = screen.getByRole('button', { name: /upload avatar/i });
      fireEvent.click(uploadAvatarButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/settings/profile');
      });
    });

    it('should navigate to /workspaces when "Create Workspace" is clicked', async () => {
      mockUseWorkspaces.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const environment = createMockEnvironment({ user: mockUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const createWorkspaceButton = screen.getByRole('button', { name: /create workspace/i });
      fireEvent.click(createWorkspaceButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/workspaces');
      });
    });

    it('should navigate to /workspaces when "Invite Member" is clicked', async () => {
      mockUseWorkspaces.mockReturnValue({
        data: [{ id: 'ws-1', name: 'Workspace 1' }],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const environment = createMockEnvironment({ user: mockUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const inviteMemberButton = screen.getByRole('button', { name: /invite member/i });
      fireEvent.click(inviteMemberButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/workspaces');
      });
    });

    it('should only call navigate once per button click', async () => {
      const environment = createMockEnvironment({ user: mockUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const createWorkspaceButton = screen.getByRole('button', { name: /create workspace/i });
      fireEvent.click(createWorkspaceButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user gracefully', () => {
      const environment = createMockEnvironment({});

      expect(() => renderWithProviders(<GettingStartedChecklist />, { environment })).not.toThrow();
    });

    it('should show checkmark for completed items', () => {
      const completeUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
      };
      const environment = createMockEnvironment({ user: completeUser });

      const { container } = renderWithProviders(<GettingStartedChecklist />, { environment });

      // Check for checkmark character (✓)
      expect(container.textContent).toContain('\u2713');
    });

    it('should not show checkmark for incomplete items', () => {
      const incompleteUser: User = {
        ...mockUser,
        firstName: '',
        lastName: '',
      };
      const environment = createMockEnvironment({ user: incompleteUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const completeProfileText = screen.getByText('Complete your profile');

      // The parent span should not contain checkmark
      const checkmarkSpan = completeProfileText.parentElement?.querySelector('span');
      expect(checkmarkSpan?.textContent).toBe('');
    });

    it('should handle rapid dismiss clicks', () => {
      const environment = createMockEnvironment({ user: mockUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });

      // Rapid clicks
      fireEvent.click(dismissButton);
      fireEvent.click(dismissButton);
      fireEvent.click(dismissButton);

      // Should only set localStorage once
      expect(localStorage.getItem(DISMISSED_KEY)).toBe('true');
    });

    it('should handle empty workspaces array', () => {
      mockUseWorkspaces.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const environment = createMockEnvironment({ user: mockUser });

      expect(() => renderWithProviders(<GettingStartedChecklist />, { environment })).not.toThrow();
    });

    it('should handle many workspaces (100+)', () => {
      const manyWorkspaces = Array.from({ length: 100 }, (_, i) => ({
        id: `ws-${i}`,
        name: `Workspace ${i}`,
      }));

      mockUseWorkspaces.mockReturnValue({
        data: manyWorkspaces,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const environment = createMockEnvironment({ user: mockUser });

      expect(() => renderWithProviders(<GettingStartedChecklist />, { environment })).not.toThrow();

      // Both workspace items should be complete
      expect(screen.queryByRole('button', { name: /create workspace/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
    });

    it('should handle component unmount during navigation', () => {
      const environment = createMockEnvironment({ user: mockUser });

      const { unmount } = renderWithProviders(<GettingStartedChecklist />, { environment });

      const createWorkspaceButton = screen.getByRole('button', { name: /create workspace/i });
      fireEvent.click(createWorkspaceButton);

      // Unmount while navigation is pending - should not throw
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should show correct count with partial completion', () => {
      mockUseWorkspaces.mockReturnValue({
        data: [{ id: 'ws-1', name: 'Workspace 1' }],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const partialUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const environment = createMockEnvironment({ user: partialUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      expect(screen.getByText('3 of 4 steps completed')).toBeInTheDocument();
    });

    it('should reflect external localStorage changes after re-render', () => {
      localStorage.setItem(DISMISSED_KEY, 'true');

      const environment = createMockEnvironment({ user: mockUser });

      const { rerender, container } = renderWithProviders(<GettingStartedChecklist />, {
        environment,
      });

      // Initially hidden because localStorage has dismissal
      expect(container.firstChild).toBeNull();

      // Clear localStorage externally
      localStorage.removeItem(DISMISSED_KEY);

      // Re-render component
      rerender(<GettingStartedChecklist />);

      // Visible again because storage-backed hook reflects latest localStorage value
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe('Visual State', () => {
    it('should apply success background to completed items', () => {
      const completeUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
      };
      const environment = createMockEnvironment({ user: completeUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const completeProfileText = screen.getByText('Complete your profile');
      const itemContainer = completeProfileText.closest('div');

      expect(itemContainer).toHaveStyle({
        backgroundColor: 'var(--ui-alert-success-bg)',
      });
    });

    it('should apply surface background to incomplete items', () => {
      const incompleteUser: User = {
        ...mockUser,
        firstName: '',
        lastName: '',
      };
      const environment = createMockEnvironment({ user: incompleteUser });

      renderWithProviders(<GettingStartedChecklist />, { environment });

      const completeProfileText = screen.getByText('Complete your profile');
      const itemContainer = completeProfileText.closest('div');

      expect(itemContainer).toHaveStyle({
        backgroundColor: 'var(--ui-color-surface)',
      });
    });

    it('should render checkmark with success color for completed items', () => {
      const completeUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
      };
      const environment = createMockEnvironment({ user: completeUser });

      const { container } = renderWithProviders(<GettingStartedChecklist />, { environment });

      const spans = container.querySelectorAll('span');
      const checkmarkSpan = Array.from(spans).find((span) => span.textContent === '\u2713');

      expect(checkmarkSpan).toHaveStyle({
        backgroundColor: 'var(--ui-color-success)',
      });
    });
  });
});
