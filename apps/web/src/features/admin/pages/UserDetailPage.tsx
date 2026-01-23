// apps/web/src/features/admin/pages/UserDetailPage.tsx
/**
 * UserDetailPage Component
 *
 * Admin page for viewing and managing a single user.
 */

import { Alert, Button, Heading, PageContainer, useNavigate, useParams } from '@abe-stack/ui';
import { useCallback } from 'react';

import { UserActionsMenu, UserDetailCard } from '../components';
import { useAdminUser, useUserActions } from '../hooks';

import type { UserRole } from '@abe-stack/core';
import type { JSX } from 'react';

export function UserDetailPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user, isLoading, error: loadError, refresh, setUser } = useAdminUser(id ?? null);
  const {
    updateUserAction,
    lockUserAction,
    unlockUserAction,
    isUpdating,
    isLocking,
    isUnlocking,
    error: actionError,
    clearError,
  } = useUserActions();

  const handleUpdate = useCallback(
    async (data: { name?: string | null; role?: UserRole }) => {
      if (!id || !user) return;

      clearError();
      const result = await updateUserAction(id, data);
      if (result) {
        setUser(result.user);
      }
    },
    [id, user, clearError, updateUserAction, setUser],
  );

  const handleLock = useCallback(
    async (reason: string, durationMinutes?: number) => {
      if (!id || !user) return;

      clearError();
      const result = await lockUserAction(id, { reason, durationMinutes });
      if (result) {
        setUser(result.user);
      }
    },
    [id, user, clearError, lockUserAction, setUser],
  );

  const handleUnlock = useCallback(
    async (reason: string) => {
      if (!id || !user) return;

      clearError();
      const result = await unlockUserAction(id, reason);
      if (result) {
        setUser(result.user);
      }
    },
    [id, user, clearError, unlockUserAction, setUser],
  );

  const handleBack = useCallback(() => {
    navigate('/admin/users');
  }, [navigate]);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={handleBack}>
            Back to Users
          </Button>
          <div className="flex-1">
            <Heading as="h1" size="xl">
              {user ? user.email : 'User Details'}
            </Heading>
          </div>
          <Button onClick={() => refresh()} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        {/* Error Alerts */}
        {loadError && (
          <Alert tone="danger">
            {loadError}
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Details */}
          <UserDetailCard user={user} isLoading={isLoading} />

          {/* Actions */}
          {user && (
            <UserActionsMenu
              user={user}
              onUpdate={handleUpdate}
              onLock={handleLock}
              onUnlock={handleUnlock}
              isUpdating={isUpdating}
              isLocking={isLocking}
              isUnlocking={isUnlocking}
              error={actionError}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
