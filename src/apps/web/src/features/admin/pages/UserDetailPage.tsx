// src/apps/web/src/features/admin/pages/UserDetailPage.tsx
/**
 * UserDetailPage Component
 *
 * Admin page for viewing and managing a single user.
 */

import { useNavigate, useParams } from '@abe-stack/react/router';
import { Alert, Button, Heading, PageContainer } from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import { UserActionsMenu, UserDetailCard } from '../components';
import { useAdminUser, useImpersonation, useUserActions } from '../hooks';

import type { JSX } from 'react';

type UserRoleLocal = 'user' | 'moderator' | 'admin';

interface AdminUserLocal {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRoleLocal;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lockedUntil: string | null;
  lockReason: string | null;
  failedLoginAttempts: number;
  phone: string | null;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ActionResultLocal {
  message: string;
  user: AdminUserLocal;
}

export const UserDetailPage = (): JSX.Element => {
  const { id } = useParams();
  const navigate = useNavigate();

  const adminUserResult = useAdminUser(id ?? null);
  const user = adminUserResult.user as AdminUserLocal | null;
  const { isLoading, error: loadError, refresh, setUser } = adminUserResult;
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
  const { startImpersonation } = useImpersonation();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  const canImpersonate = user !== null && user.role !== 'admin';

  const handleImpersonate = useCallback(async () => {
    if (id === undefined || id.length === 0 || !canImpersonate) return;

    setImpersonateError(null);
    setIsImpersonating(true);
    try {
      await startImpersonation(id);
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start impersonation';
      setImpersonateError(message);
    } finally {
      setIsImpersonating(false);
    }
  }, [id, canImpersonate, startImpersonation, navigate]);

  const handleUpdate = useCallback(
    async (data: { name?: string | null; role?: UserRoleLocal }) => {
      if (id === undefined || id.length === 0 || user === null) return;

      clearError();
      const result = (await updateUserAction(id, data)) as ActionResultLocal | null;
      if (result?.user !== undefined) {
        setUser(result.user);
      }
    },
    [id, user, clearError, updateUserAction, setUser],
  );

  const handleLock = useCallback(
    async (reason: string, durationMinutes?: number) => {
      if (id === undefined || id.length === 0 || user === null) return;

      clearError();
      const result = (await lockUserAction(id, {
        reason,
        ...(durationMinutes !== undefined && { durationMinutes }),
      })) as ActionResultLocal | null;
      if (result?.user !== undefined) {
        setUser(result.user);
      }
    },
    [id, user, clearError, lockUserAction, setUser],
  );

  const handleUnlock = useCallback(
    async (reason: string) => {
      if (id === undefined || id.length === 0 || user === null) return;

      clearError();
      const result = (await unlockUserAction(id, reason)) as ActionResultLocal | null;
      if (result?.user !== undefined) {
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
              {user !== null ? user.email : 'User Details'}
            </Heading>
          </div>
          {canImpersonate && (
            <Button
              variant="secondary"
              onClick={() => {
                void handleImpersonate();
              }}
              disabled={isImpersonating || isLoading}
            >
              {isImpersonating ? 'Impersonating...' : 'Impersonate'}
            </Button>
          )}
          <Button
            onClick={() => {
              void refresh();
            }}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>

        {/* Error Alerts */}
        {loadError !== null && loadError.length > 0 && <Alert tone="danger">{loadError}</Alert>}
        {impersonateError !== null && <Alert tone="danger">{impersonateError}</Alert>}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Details */}
          <UserDetailCard user={user} isLoading={isLoading} />

          {/* Actions */}
          {user !== null && (
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
};
