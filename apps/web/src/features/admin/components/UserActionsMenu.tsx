// apps/web/src/features/admin/components/UserActionsMenu.tsx
/**
 * UserActionsMenu Component
 *
 * Actions menu for admin user management (edit, lock, unlock).
 */

import { Alert, Button, Card, Heading, Input, Select, Text, TextArea } from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import { getUserStatus } from './StatusBadge';

import type { AdminUser, UserRole } from '@abe-stack/core';
import type { JSX, FormEvent } from 'react';

export interface UserActionsMenuProps {
  user: AdminUser;
  onUpdate: (data: { name?: string | null; role?: UserRole }) => Promise<void>;
  onLock: (reason: string, durationMinutes?: number) => Promise<void>;
  onUnlock: (reason: string) => Promise<void>;
  isUpdating: boolean;
  isLocking: boolean;
  isUnlocking: boolean;
  error: string | null;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
];

const LOCK_DURATION_OPTIONS = [
  { value: '', label: 'Indefinitely' },
  { value: '60', label: '1 Hour' },
  { value: '1440', label: '1 Day' },
  { value: '10080', label: '1 Week' },
  { value: '43200', label: '30 Days' },
];

export const UserActionsMenu = ({
  user,
  onUpdate,
  onLock,
  onUnlock,
  isUpdating,
  isLocking,
  isUnlocking,
  error,
}: UserActionsMenuProps): JSX.Element => {
  // Edit form state
  const [editName, setEditName] = useState(user.name ?? '');
  const [editRole, setEditRole] = useState<UserRole>(user.role);

  // Lock form state
  const [lockReason, setLockReason] = useState('');
  const [lockDuration, setLockDuration] = useState('');

  // Unlock form state
  const [unlockReason, setUnlockReason] = useState('');

  const status = getUserStatus(user);
  const isLocked = status === 'locked';
  const isAnyLoading = isUpdating || isLocking || isUnlocking;

  const handleUpdateSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const updates: { name?: string | null; role?: UserRole } = {};

      if (editName !== (user.name ?? '')) {
        updates.name = editName.length > 0 ? editName : null;
      }
      if (editRole !== user.role) {
        updates.role = editRole;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdate(updates);
      }
    },
    [editName, editRole, user.name, user.role, onUpdate],
  );

  const handleLockSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (lockReason.trim().length === 0) return;

      const duration = lockDuration.length > 0 ? Number(lockDuration) : undefined;
      await onLock(lockReason.trim(), duration);
      setLockReason('');
      setLockDuration('');
    },
    [lockReason, lockDuration, onLock],
  );

  const handleUnlockSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (unlockReason.trim().length === 0) return;

      await onUnlock(unlockReason.trim());
      setUnlockReason('');
    },
    [unlockReason, onUnlock],
  );

  return (
    <div className="space-y-6">
      {error !== null && error.length > 0 && <Alert tone="danger">{error}</Alert>}

      {/* Edit User Section */}
      <Card>
        <div className="p-6">
          <Heading as="h3" size="md" className="mb-4">
            Edit User
          </Heading>
          <form
            onSubmit={(e) => {
              void handleUpdateSubmit(e);
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="edit-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name
              </label>
              <Input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                }}
                placeholder="Enter name"
                disabled={isAnyLoading}
              />
            </div>

            <div>
              <label
                htmlFor="edit-role"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Role
              </label>
              <Select
                id="edit-role"
                value={editRole}
                onChange={(value) => {
                  setEditRole(value as UserRole);
                }}
                disabled={isAnyLoading}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="submit"
              disabled={isAnyLoading || (editName === (user.name ?? '') && editRole === user.role)}
            >
              {isUpdating ? 'Updating...' : 'Update User'}
            </Button>
          </form>
        </div>
      </Card>

      {/* Lock/Unlock Section */}
      {isLocked ? (
        <Card>
          <div className="p-6">
            <Heading as="h3" size="md" className="mb-4">
              Unlock User
            </Heading>
            <Text tone="muted" className="mb-4">
              This user is currently locked. Provide a reason to unlock their account.
            </Text>
            <form
              onSubmit={(event) => {
                void handleUnlockSubmit(event);
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="unlock-reason"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Reason for unlocking
                </label>
                <TextArea
                  id="unlock-reason"
                  value={unlockReason}
                  onChange={(e) => {
                    setUnlockReason(e.target.value);
                  }}
                  placeholder="Enter reason for unlocking this account"
                  rows={3}
                  disabled={isAnyLoading}
                />
              </div>

              <Button type="submit" disabled={isAnyLoading || unlockReason.trim().length === 0}>
                {isUnlocking ? 'Unlocking...' : 'Unlock User'}
              </Button>
            </form>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-6">
            <Heading as="h3" size="md" className="mb-4">
              Lock User
            </Heading>
            <Text tone="muted" className="mb-4">
              Locking a user will prevent them from logging in.
            </Text>
            <form
              onSubmit={(event) => {
                void handleLockSubmit(event);
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="lock-reason"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Reason for locking
                </label>
                <TextArea
                  id="lock-reason"
                  value={lockReason}
                  onChange={(e) => {
                    setLockReason(e.target.value);
                  }}
                  placeholder="Enter reason for locking this account"
                  rows={3}
                  disabled={isAnyLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="lock-duration"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Lock Duration
                </label>
                <Select
                  id="lock-duration"
                  value={lockDuration}
                  onChange={(value) => {
                    setLockDuration(value);
                  }}
                  disabled={isAnyLoading}
                >
                  {LOCK_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <Button
                type="submit"
                variant="secondary"
                disabled={isAnyLoading || lockReason.trim().length === 0}
              >
                {isLocking ? 'Locking...' : 'Lock User'}
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
};
