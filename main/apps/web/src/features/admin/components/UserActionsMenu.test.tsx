// main/apps/web/src/features/admin/components/UserActionsMenu.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, beforeEach } from 'vitest';

import { UserActionsMenu } from './UserActionsMenu';

import type { AdminUser, UserRole } from '@abe-stack/shared';

// ============================================================================
// Test Data
// ============================================================================

const mockUser: AdminUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  emailVerified: true,
  emailVerifiedAt: '2024-01-01T00:00:00Z',
  failedLoginAttempts: 0,
  lockedUntil: null,
  lockReason: null,
  phone: null,
  phoneVerified: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockOnUpdate = vi.fn();
const mockOnLock = vi.fn();
const mockOnUnlock = vi.fn();

// ============================================================================
// Tests
// ============================================================================

describe('UserActionsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnUpdate.mockResolvedValue(undefined);
    mockOnLock.mockResolvedValue(undefined);
    mockOnUnlock.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render edit user section', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    it('should render lock user section for unlocked user', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      // Both heading and button have "Lock User" text
      const lockElements = screen.getAllByText('Lock User');
      expect(lockElements.length).toBeGreaterThan(0);
    });

    it('should render unlock user section for locked user', () => {
      const lockedUser: AdminUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 3600000).toISOString(),
      };

      render(
        <UserActionsMenu
          user={lockedUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      // Both heading and button have "Unlock User" text
      const unlockElements = screen.getAllByText('Unlock User');
      expect(unlockElements.length).toBeGreaterThan(0);
    });
  });

  describe('error display', () => {
    it('should show error message when error is present', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error="Update failed"
        />,
      );

      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });

    it('should not show error message when error is null', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not show error message when error is empty string', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error=""
        />,
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('edit user form', () => {
    it('should display current first name value', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const firstNameInput = screen.getByLabelText('First Name');
      expect((firstNameInput as HTMLInputElement).value).toBe('Test');
    });

    it('should display current last name value', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const lastNameInput = screen.getByLabelText('Last Name');
      expect((lastNameInput as HTMLInputElement).value).toBe('User');
    });

    it('should display current role value', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      // Custom Select displays the current value in a span
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should allow changing first name', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const firstNameInput = screen.getByLabelText('First Name');
      fireEvent.change(firstNameInput, { target: { value: 'New' } });

      expect((firstNameInput as HTMLInputElement).value).toBe('New');
    });

    it('should allow changing last name', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const lastNameInput = screen.getByLabelText('Last Name');
      fireEvent.change(lastNameInput, { target: { value: 'Name' } });

      expect((lastNameInput as HTMLInputElement).value).toBe('Name');
    });

    it('should allow changing role', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const roleSelect = screen.getByLabelText('Role');
      fireEvent.change(roleSelect, { target: { value: 'admin' } });

      expect((roleSelect as HTMLSelectElement).value).toBe('admin');
    });

    it('should disable update button when no changes', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const updateButton = screen.getByRole('button', { name: 'Update User' });
      expect(updateButton).toBeDisabled();
    });

    it('should enable update button when first name is changed', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const firstNameInput = screen.getByLabelText('First Name');
      fireEvent.change(firstNameInput, { target: { value: 'New' } });

      const updateButton = screen.getByRole('button', { name: 'Update User' });
      expect(updateButton).not.toBeDisabled();
    });

    it('should enable update button when role is changed', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      // Custom Select: click trigger to open, then click option
      const roleSelectTrigger = screen.getByLabelText('Role');
      fireEvent.click(roleSelectTrigger);
      const moderatorOption = screen.getByRole('option', { name: 'Moderator' });
      fireEvent.click(moderatorOption);

      const updateButton = screen.getByRole('button', { name: 'Update User' });
      expect(updateButton).not.toBeDisabled();
    });

    it('should call onUpdate with first name change', async () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const firstNameInput = screen.getByLabelText('First Name');
      fireEvent.change(firstNameInput, { target: { value: 'New' } });

      const updateButton = screen.getByRole('button', { name: 'Update User' });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({ firstName: 'New' });
      });
    });

    it('should call onUpdate with role change', async () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      // Custom Select: click trigger to open, then click option
      const roleSelectTrigger = screen.getByLabelText('Role');
      fireEvent.click(roleSelectTrigger);
      const adminOption = screen.getByRole('option', { name: 'Admin' });
      fireEvent.click(adminOption);

      const updateButton = screen.getByRole('button', { name: 'Update User' });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({ role: 'admin' as UserRole });
      });
    });

    it('should call onUpdate with both name and role changes', async () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const firstNameInput = screen.getByLabelText('First Name');
      fireEvent.change(firstNameInput, { target: { value: 'Admin' } });

      const lastNameInput = screen.getByLabelText('Last Name');
      fireEvent.change(lastNameInput, { target: { value: 'NewLastName' } });

      // Custom Select: click trigger to open, then click option
      const roleSelectTrigger = screen.getByLabelText('Role');
      fireEvent.click(roleSelectTrigger);
      const adminOption = screen.getByRole('option', { name: 'Admin' });
      fireEvent.click(adminOption);

      const updateButton = screen.getByRole('button', { name: 'Update User' });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({
          firstName: 'Admin',
          lastName: 'NewLastName',
          role: 'admin' as UserRole,
        });
      });
    });

    it('should call onUpdate when last name is changed', async () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const lastNameInput = screen.getByLabelText('Last Name');
      fireEvent.change(lastNameInput, { target: { value: 'NewLastName' } });

      const updateButton = screen.getByRole('button', { name: 'Update User' });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({ lastName: 'NewLastName' });
      });
    });
  });

  describe('lock user form', () => {
    it('should render lock reason textarea', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      expect(screen.getByLabelText('Reason for locking')).toBeInTheDocument();
    });

    it('should render lock duration select', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      expect(screen.getByLabelText('Lock Duration')).toBeInTheDocument();
    });

    it('should disable lock button when reason is empty', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const lockButton = screen.getByRole('button', { name: 'Lock User' });
      expect(lockButton).toBeDisabled();
    });

    it('should enable lock button when reason is provided', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const reasonTextarea = screen.getByLabelText('Reason for locking');
      fireEvent.change(reasonTextarea, { target: { value: 'Suspicious activity' } });

      const lockButton = screen.getByRole('button', { name: 'Lock User' });
      expect(lockButton).not.toBeDisabled();
    });

    it('should call onLock with reason and no duration', async () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const reasonTextarea = screen.getByLabelText('Reason for locking');
      fireEvent.change(reasonTextarea, { target: { value: 'Suspicious activity' } });

      const lockButton = screen.getByRole('button', { name: 'Lock User' });
      fireEvent.click(lockButton);

      await waitFor(() => {
        expect(mockOnLock).toHaveBeenCalledWith('Suspicious activity', undefined);
      });
    });

    it('should call onLock with reason and duration', async () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const reasonTextarea = screen.getByLabelText('Reason for locking');
      fireEvent.change(reasonTextarea, { target: { value: 'Abuse' } });

      // Custom Select: click trigger to open, then click option
      const durationSelectTrigger = screen.getByLabelText('Lock Duration');
      fireEvent.click(durationSelectTrigger);
      const dayOption = screen.getByRole('option', { name: '1 Day' });
      fireEvent.click(dayOption);

      const lockButton = screen.getByRole('button', { name: 'Lock User' });
      fireEvent.click(lockButton);

      await waitFor(() => {
        expect(mockOnLock).toHaveBeenCalledWith('Abuse', 1440);
      });
    });

    it('should clear form after successful lock', async () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const reasonTextarea = screen.getByLabelText('Reason for locking');
      fireEvent.change(reasonTextarea, { target: { value: 'Test' } });

      const lockButton = screen.getByRole('button', { name: 'Lock User' });
      fireEvent.click(lockButton);

      await waitFor(() => {
        expect((reasonTextarea as HTMLTextAreaElement).value).toBe('');
      });
    });
  });

  describe('unlock user form', () => {
    const lockedUser: AdminUser = {
      ...mockUser,
      lockedUntil: new Date(Date.now() + 3600000).toISOString(),
    };

    it('should render unlock reason textarea', () => {
      render(
        <UserActionsMenu
          user={lockedUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      expect(screen.getByLabelText('Reason for unlocking')).toBeInTheDocument();
    });

    it('should disable unlock button when reason is empty', () => {
      render(
        <UserActionsMenu
          user={lockedUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const unlockButton = screen.getByRole('button', { name: 'Unlock User' });
      expect(unlockButton).toBeDisabled();
    });

    it('should enable unlock button when reason is provided', () => {
      render(
        <UserActionsMenu
          user={lockedUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const reasonTextarea = screen.getByLabelText('Reason for unlocking');
      fireEvent.change(reasonTextarea, { target: { value: 'False positive' } });

      const unlockButton = screen.getByRole('button', { name: 'Unlock User' });
      expect(unlockButton).not.toBeDisabled();
    });

    it('should call onUnlock with reason', async () => {
      render(
        <UserActionsMenu
          user={lockedUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const reasonTextarea = screen.getByLabelText('Reason for unlocking');
      fireEvent.change(reasonTextarea, { target: { value: 'Resolved' } });

      const unlockButton = screen.getByRole('button', { name: 'Unlock User' });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect(mockOnUnlock).toHaveBeenCalledWith('Resolved');
      });
    });

    it('should clear form after successful unlock', async () => {
      render(
        <UserActionsMenu
          user={lockedUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const reasonTextarea = screen.getByLabelText('Reason for unlocking');
      fireEvent.change(reasonTextarea, { target: { value: 'Test' } });

      const unlockButton = screen.getByRole('button', { name: 'Unlock User' });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect((reasonTextarea as HTMLTextAreaElement).value).toBe('');
      });
    });
  });

  describe('loading states', () => {
    it('should disable all inputs when isUpdating is true', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={true}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      const roleSelect = screen.getByLabelText('Role');

      expect(firstNameInput).toBeDisabled();
      expect(lastNameInput).toBeDisabled();
      expect(roleSelect).toBeDisabled();
    });

    it('should show "Updating..." text when isUpdating is true', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={true}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });

    it('should show "Locking..." text when isLocking is true', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={true}
          isUnlocking={false}
          error={null}
        />,
      );

      expect(screen.getByText('Locking...')).toBeInTheDocument();
    });

    it('should show "Unlocking..." text when isUnlocking is true', () => {
      const lockedUser: AdminUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 3600000).toISOString(),
      };

      render(
        <UserActionsMenu
          user={lockedUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={true}
          error={null}
        />,
      );

      expect(screen.getByText('Unlocking...')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should trim whitespace from lock reason', async () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const reasonTextarea = screen.getByLabelText('Reason for locking');
      fireEvent.change(reasonTextarea, { target: { value: '  Test reason  ' } });

      const lockButton = screen.getByRole('button', { name: 'Lock User' });
      fireEvent.click(lockButton);

      await waitFor(() => {
        expect(mockOnLock).toHaveBeenCalledWith('Test reason', undefined);
      });
    });

    it('should not submit lock form when reason is only whitespace', () => {
      render(
        <UserActionsMenu
          user={mockUser}
          onUpdate={mockOnUpdate}
          onLock={mockOnLock}
          onUnlock={mockOnUnlock}
          isUpdating={false}
          isLocking={false}
          isUnlocking={false}
          error={null}
        />,
      );

      const reasonTextarea = screen.getByLabelText('Reason for locking');
      fireEvent.change(reasonTextarea, { target: { value: '   ' } });

      const lockButton = screen.getByRole('button', { name: 'Lock User' });
      expect(lockButton).toBeDisabled();
    });
  });
});
